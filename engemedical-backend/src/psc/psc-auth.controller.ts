import {
  Controller,
  Post,
  Get,
  Query,
  Body,
  Res,
  Req,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { PscAuthService } from './psc-auth.service';
import { PscSessionService } from './psc-session.service';

import { Response, Request } from 'express';
import { IUserInfo } from 'src/user/interfaces/user.interface';

@Controller('psc/auth')
export class PscAuthController {
  constructor(
    private readonly pscAuthService: PscAuthService,
    private readonly pscSessionService: PscSessionService,
  ) {}

  @Post('start')
  async startAuth(@Body() body: { user: IUserInfo; provider?: string }) {
    console.log(
      `[PscAuthController] POST /start recebida. Body:`,
      JSON.stringify(body),
    );

    if (!body.user || !body.user.codigo) {
      console.error(
        `[PscAuthController] Invalid user information received:`,
        body?.user,
      );
      throw new HttpException(
        'Invalid user information',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      console.log(
        `[PscAuthController] Chamando startAuth do service para usuário ${body.user.codigo}, provider: ${body.provider}`,
      );
      const authUrl = await this.pscAuthService.startAuth(
        body.user,
        body.provider,
      );
      console.log(`[PscAuthController] Sucesso ao gerar Auth URL`);
      return { url: authUrl };
    } catch (error) {
      console.error(`[PscAuthController] Erro interno em startAuth:`, error);
      throw new HttpException(
        error.message || 'Failed to start PSC auth',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('callback')
  async handleCallback(@Query('state') state: string, @Res() res: Response) {
    if (!state) {
      return res
        .status(HttpStatus.BAD_REQUEST)
        .json({ error: 'Missing state parameter' });
    }

    try {
      await this.pscAuthService.handleCallback('', state);

      // Recupera a sessão para obter o código do profissional
      const session = await this.pscSessionService.getSessionByState(state);
      if (session && session.user_codigo) {
           console.log(`[PscAuthController] Sessão PSC renovada para ${session.user_codigo}. Worker irá capturar a pendência via CRON.`);
      }

      const isProd = process.env.NODE_ENV === 'production';
      const frontendUrl = isProd
        ? process.env.FRONTEND_URL_PROD || 'https://cmso360-frontend.vercel.app'
        : process.env.FRONTEND_URL || 'http://localhost:3000';

      return res.redirect(`${frontendUrl}/configuracoes?psc_auth=success`);
    } catch (error) {
      console.error('Error in PSC callback:', error);
      const isProd = process.env.NODE_ENV === 'production';
      const frontendUrl = isProd
        ? process.env.FRONTEND_URL_PROD || 'https://cmso360-frontend.vercel.app'
        : process.env.FRONTEND_URL || 'http://localhost:3000';

      return res.redirect(`${frontendUrl}/configuracoes?psc_auth=error`);
    }
  }
}
