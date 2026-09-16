import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';

export interface ClienteCompanyAccess {
  companyCode: string;
  companyName: string;
}

/** Empresas permitidas vêm do registrationCode do cliente, como no projeto C#. */
@Injectable()
export class ClienteCompanyAccessService {
  async assertCanAccess(
    companyCode: string,
    registrationCode: string,
  ): Promise<ClienteCompanyAccess> {
    const normalizedCompanyCode = this.normalizeRequiredValue(
      companyCode,
      'companyCode',
    );
    const normalizedRegistrationCode = this.normalizeRequiredValue(
      registrationCode,
      'registrationCode',
    );
    const allowedCompanyCodes = normalizedRegistrationCode
      .split('-')
      .map((code) => code.trim())
      .filter(Boolean);

    if (!allowedCompanyCodes.includes(normalizedCompanyCode)) {
      throw new ForbiddenException('Usuário não possui acesso à empresa');
    }

    return {
      companyCode: normalizedCompanyCode,
      companyName: '',
    };
  }

  private normalizeRequiredValue(value: unknown, field: string): string {
    if (
      (typeof value !== 'string' && typeof value !== 'number') ||
      !String(value).trim()
    ) {
      throw new BadRequestException(`${field} é obrigatório`);
    }

    return String(value).trim();
  }
}
