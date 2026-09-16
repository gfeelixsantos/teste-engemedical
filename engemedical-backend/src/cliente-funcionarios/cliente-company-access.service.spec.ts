import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ClienteCompanyAccessService } from './cliente-company-access.service';

describe('ClienteCompanyAccessService', () => {
  const service = new ClienteCompanyAccessService();

  it('allows a company listed in the client registration code', async () => {
    await expect(service.assertCanAccess('2106632', '1153506-2106632')).resolves.toEqual({
      companyCode: '2106632',
      companyName: '',
    });
  });

  it('rejects a company outside the client registration code', async () => {
    await expect(service.assertCanAccess('999999', '1153506-2106632')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects missing boundary values', async () => {
    await expect(service.assertCanAccess('', '2106632')).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.assertCanAccess('2106632', '')).rejects.toBeInstanceOf(BadRequestException);
  });
});
