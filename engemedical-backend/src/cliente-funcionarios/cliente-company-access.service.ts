import {
  BadGatewayException,
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

export interface ClienteCompanyAccess {
  companyCode: string;
  companyName: string;
}

@Injectable()
export class ClienteCompanyAccessService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async assertCanAccess(
    userId: string,
    companyCode: string,
  ): Promise<ClienteCompanyAccess> {
    const normalizedUserId = this.normalizeRequiredValue(userId, 'userId');
    const normalizedCompanyCode = this.normalizeRequiredValue(
      companyCode,
      'companyCode',
    );

    const { data, error } = await this.supabaseService
      .getClient()
      .from('user_company_memberships')
      .select('company_code, company_name')
      .eq('user_id', normalizedUserId)
      .eq('company_code', normalizedCompanyCode)
      .eq('active', true)
      .maybeSingle();

    if (error) {
      throw new BadGatewayException(
        'Não foi possível consultar os vínculos de empresa do usuário.',
      );
    }

    if (!data) {
      throw new ForbiddenException('Usuário não possui acesso à empresa');
    }

    return {
      companyCode: String(data.company_code).trim(),
      companyName: String(data.company_name ?? '').trim(),
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
