import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { SocController } from './soc.controller';
import { SocService } from './soc.service';
import { MongoService } from 'src/mongo/mongo.service';
import { StructuredLogger } from 'src/utils/logger';

describe('SocController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [SocController],
      providers: [
        {
          provide: SocService,
          useValue: {
            handleCredenciadas: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: MongoService,
          useValue: {
            findOne: jest.fn().mockResolvedValue(null),
            findMany: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: StructuredLogger,
          useValue: {
            log: jest.fn(),
            debug: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            setContext: jest.fn(),
          },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /soc/pedidoexame/credenciadas deve aceitar CPF no body', async () => {
    const response = await request(app.getHttpServer())
      .post('/soc/pedidoexame/credenciadas')
      .send({ cpf: '12345678901' })
      .expect(201);

    expect(response.body).toBeDefined();
  });

  it('POST /soc/pedidoexame/credenciadas deve rejeitar body vazio', async () => {
    await request(app.getHttpServer())
      .post('/soc/pedidoexame/credenciadas')
      .send({})
      .expect(400);
  });

  it('POST /soc/pedidoexame/credenciadas deve rejeitar CPF vazio', async () => {
    await request(app.getHttpServer())
      .post('/soc/pedidoexame/credenciadas')
      .send({ cpf: '' })
      .expect(400);
  });

  it('GET /soc/pedidoexame/credenciadas deve retornar 404 (rota nao existe)', async () => {
    await request(app.getHttpServer())
      .get('/soc/pedidoexame/credenciadas?cpf=12345678901')
      .expect(404);
  });
});