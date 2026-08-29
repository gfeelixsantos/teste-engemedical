import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { parseAuthUserHeader } from 'src/core/professional-identity.resolver';

@Injectable()
export class MasterGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    if (!request.headers?.authorization) {
      throw new UnauthorizedException('Token de autenticacao ausente');
    }

    const authUser = parseAuthUserHeader(request.headers['x-auth-user']);

    if (!authUser || authUser.perfil !== 'MASTER') {
      throw new ForbiddenException('Acesso restrito ao perfil MASTER');
    }

    return true;
  }
}
