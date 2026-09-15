import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { MODULE_METADATA } from '@nestjs/common/constants';
import { ForbiddenException } from '@nestjs/common';
import request from 'supertest';
import { createHmac } from 'crypto';
import { ClienteCompanyAccessService } from './cliente-company-access.service';
import { ClienteFuncionariosController } from './cliente-funcionarios.controller';
import { ClienteFuncionariosModule } from './cliente-funcionarios.module';
import { ClienteFuncionariosService } from './cliente-funcionarios.service';
import { ClienteFuncionariosStatusService } from './cliente-funcionarios-status.service';
import { MongoClienteFuncionariosSchedulingReader } from './cliente-funcionarios.service';
import { MongoModule } from '../mongo/mongo.module';
import { SocModule } from '../soc/soc.module';
import { SupabaseModule } from '../supabase/supabase.module';

describe('ClienteFuncionariosController', () => {
  const jwtSecret = 'task-3-test-secret';
  let app: INestApplication;
  let service: { list: jest.Mock };

  const encode = (value: Record<string, unknown>) =>
    Buffer.from(JSON.stringify(value)).toString('base64url');

  const tokenFor = (claims: Record<string, unknown>) => {
    const header = encode({ alg: 'HS256', typ: 'JWT' });
    const payload = encode(claims);
    const signature = createHmac('sha256', jwtSecret)
      .update(`${header}.${payload}`)
      .digest('base64url');
    return `${header}.${payload}.${signature}`;
  };

  beforeAll(async () => {
    process.env.JWT_SECRET = jwtSecret;
    service = { list: jest.fn().mockResolvedValue({ items: [] }) };
    const moduleRef = await Test.createTestingModule({
      controllers: [ClienteFuncionariosController],
      providers: [
        { provide: ClienteFuncionariosService, useValue: service },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    delete process.env.JWT_SECRET;
  });

  beforeEach(() => {
    service.list.mockReset();
    service.list.mockResolvedValue({ items: [] });
  });

  it('keeps a missing bearer token as 401 through JwtAuthGuard', async () => {
    await request(app.getHttpServer())
      .get('/cliente/funcionarios?empresa=123')
      .expect(401);

    expect(service.list).not.toHaveBeenCalled();
  });

  it.each(['', 'abc', '12.5'])('returns 400 for malformed empresa=%j', async (empresa) => {
    await request(app.getHttpServer())
      .get(`/cliente/funcionarios?empresa=${encodeURIComponent(empresa)}`)
      .set('Authorization', `Bearer ${tokenFor({ sub: 'user-1' })}`)
      .expect(400);

    expect(service.list).not.toHaveBeenCalled();
  });

  it.each([
    'page=0',
    'page=1.5',
    'page=abc',
    'limit=1.5',
    'limit=abc',
    'status=DESCONHECIDO',
  ])('returns 400 for invalid %s', async (query) => {
    await request(app.getHttpServer())
      .get(`/cliente/funcionarios?empresa=123&${query}`)
      .set('Authorization', `Bearer ${tokenFor({ sub: 'user-1' })}`)
      .expect(400);

    expect(service.list).not.toHaveBeenCalled();
  });

  it('returns 401 when the verified request has no usable user claim', async () => {
    await request(app.getHttpServer())
      .get('/cliente/funcionarios?empresa=123')
      .set('Authorization', `Bearer ${tokenFor({})}`)
      .expect(401);

    expect(service.list).not.toHaveBeenCalled();
  });

  it('passes normalized query values and the verified user id to the service', async () => {
    const response = {
      empresa: { codigo: '123', nome: 'Empresa teste' },
      items: [],
      page: 2,
      limit: 100,
      total: 0,
      hasNextPage: false,
    };
    service.list.mockResolvedValue(response);

    await request(app.getHttpServer())
      .get('/cliente/funcionarios?empresa=%2000123%20&page=2&limit=200&q=%20Ana%20&status=valido')
      .set('Authorization', `Bearer ${tokenFor({ userId: 'user-2' })}`)
      .expect(200, response);

    expect(service.list).toHaveBeenCalledWith(
      {
        companyCode: '00123',
        page: 2,
        limit: 100,
        q: 'Ana',
        status: 'VALIDO',
      },
      'user-2',
    );
  });

  it('keeps access denial as 403', async () => {
    service.list.mockRejectedValue(new ForbiddenException('sem acesso'));

    await request(app.getHttpServer())
      .get('/cliente/funcionarios?empresa=123')
      .set('Authorization', `Bearer ${tokenFor({ codigo: 'user-3' })}`)
      .expect(403);
  });

  it('translates upstream timeout and fetch failures to safe gateway responses', async () => {
    service.list.mockRejectedValueOnce(Object.assign(new Error('socket timeout at https://soc.example'), { code: 'ETIMEDOUT' }));

    const timeoutResponse = await request(app.getHttpServer())
      .get('/cliente/funcionarios?empresa=123')
      .set('Authorization', `Bearer ${tokenFor({ sub: 'user-4' })}`)
      .expect(504);

    expect(timeoutResponse.body.message).toContain('tempo');
    expect(timeoutResponse.text).not.toContain('soc.example');
    expect(timeoutResponse.text).not.toContain('socket timeout');

    service.list.mockRejectedValueOnce(new Error('fetch failed at https://soc.example'));

    const fetchResponse = await request(app.getHttpServer())
      .get('/cliente/funcionarios?empresa=123')
      .set('Authorization', `Bearer ${tokenFor({ sub: 'user-4' })}`)
      .expect(502);

    expect(fetchResponse.body.message).toContain('comunicação');
    expect(fetchResponse.text).not.toContain('soc.example');
    expect(fetchResponse.text).not.toContain('fetch failed');
  });
});

describe('ClienteFuncionariosModule', () => {
  it('registers the concrete Task 2 providers and dependency modules', () => {
    const imports = Reflect.getMetadata(MODULE_METADATA.IMPORTS, ClienteFuncionariosModule);
    const providers = Reflect.getMetadata(MODULE_METADATA.PROVIDERS, ClienteFuncionariosModule);
    const controllers = Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, ClienteFuncionariosModule);

    expect(imports).toEqual(expect.arrayContaining([MongoModule, SocModule, SupabaseModule]));
    expect(providers).toEqual(expect.arrayContaining([
      ClienteCompanyAccessService,
      ClienteFuncionariosStatusService,
      MongoClienteFuncionariosSchedulingReader,
      ClienteFuncionariosService,
    ]));
    expect(controllers).toEqual(expect.arrayContaining([ClienteFuncionariosController]));
  });
});
