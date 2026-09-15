import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ClienteCompanyAccessService } from './cliente-company-access.service';

type MembershipRow = {
  company_code: string;
  company_name: string | null;
};

type MembershipRecord = MembershipRow & {
  user_id: string;
  active: boolean;
};

function makeService(result: {
  data: MembershipRecord | null;
  error: { message: string } | null;
}) {
  const filters: Record<string, unknown> = {};
  const query = {
    select: jest.fn(),
    eq: jest.fn(),
    maybeSingle: jest.fn(),
  };
  query.select.mockReturnValue(query);
  query.eq.mockImplementation((column: string, value: unknown) => {
    filters[column] = value;
    return query;
  });
  query.maybeSingle.mockImplementation(async () => ({
    data:
      result.data &&
      result.data.user_id === filters.user_id &&
      result.data.company_code === filters.company_code &&
      result.data.active === filters.active
        ? {
            company_code: result.data.company_code,
            company_name: result.data.company_name,
          }
        : null,
    error: result.error,
  }));
  const client = {
    from: jest.fn().mockReturnValue(query),
  };
  const service = new ClienteCompanyAccessService({
    getClient: () => client,
  } as never);

  return { service, client, query };
}

describe('ClienteCompanyAccessService', () => {
  it('allows an active membership for the same user', async () => {
    const { service, query } = makeService({
      data: {
        user_id: 'user-1',
        company_code: '123',
        company_name: 'Empresa 123',
        active: true,
      },
      error: null,
    });

    await expect(service.assertCanAccess('user-1', '123')).resolves.toEqual({
      companyCode: '123',
      companyName: 'Empresa 123',
    });
    expect(query.select).toHaveBeenCalledWith('company_code, company_name');
    expect(query.eq).toHaveBeenNthCalledWith(1, 'user_id', 'user-1');
    expect(query.eq).toHaveBeenNthCalledWith(2, 'company_code', '123');
    expect(query.eq).toHaveBeenNthCalledWith(3, 'active', true);
  });

  it("rejects a membership that belongs to another user", async () => {
    const { service, query } = makeService({
      data: {
        user_id: 'user-2',
        company_code: '123',
        company_name: 'Empresa 123',
        active: true,
      },
      error: null,
    });

    await expect(service.assertCanAccess('user-1', '123')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(query.eq).toHaveBeenCalledWith('user_id', 'user-1');
  });

  it('rejects an inactive membership because the query requires active=true', async () => {
    const { service, query } = makeService({
      data: {
        user_id: 'user-1',
        company_code: '123',
        company_name: 'Empresa 123',
        active: false,
      },
      error: null,
    });

    await expect(service.assertCanAccess('user-1', '123')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(query.eq).toHaveBeenCalledWith('active', true);
  });

  it('trims and stringifies a numeric company code without trying alternate values', async () => {
    const { service, client, query } = makeService({
      data: {
        user_id: 'user-1',
        company_code: '123',
        company_name: 'Empresa 123',
        active: true,
      },
      error: null,
    });

    await expect(
      service.assertCanAccess('user-1', 123 as unknown as string),
    ).resolves.toEqual({ companyCode: '123', companyName: 'Empresa 123' });
    expect(query.eq).toHaveBeenCalledWith('company_code', '123');
    expect(query.eq).toHaveBeenCalledTimes(3);
    expect(client.from).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['', '123'],
    ['user-1', '   '],
  ])('rejects empty boundary values with BadRequestException', async (userId, companyCode) => {
    const { service, client } = makeService({ data: null, error: null });

    await expect(service.assertCanAccess(userId, companyCode)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(client.from).not.toHaveBeenCalled();
  });
});
