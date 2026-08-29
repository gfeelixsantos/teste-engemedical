import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
} from '@nestjs/common';
import { TeleatendimentoService } from './teleatendimento.service';

type CreateSessionBody = {
  schedulingId: string;
  professionalId?: string;
  professionalName: string;
  unidade?: string;
  sala?: string;
  exame?: string;
  employeeId?: string;
  employeeName: string;
  companyCode?: string;
  prontuarioCode?: string;
  examType?: string;
};

@Controller('teleatendimento')
export class TeleatendimentoController {
  constructor(
    private readonly teleatendimentoService: TeleatendimentoService,
  ) {}

  @Post('session')
  createSession(
    @Body() body: CreateSessionBody,
    @Headers('x-app-origin') appOrigin?: string,
  ) {
    return this.teleatendimentoService.createSession({
      ...body,
      appOrigin,
    });
  }

  @Get('session/:sessionId')
  getSession(@Param('sessionId') sessionId: string) {
    return this.teleatendimentoService.getSessionForProfessional(sessionId);
  }

  @Get('invite/:inviteToken')
  getInvite(@Param('inviteToken') inviteToken: string) {
    return this.teleatendimentoService.getInviteDetails(inviteToken);
  }

  @Post('session/:sessionId/end')
  endSession(@Param('sessionId') sessionId: string) {
    const session = this.teleatendimentoService.endSession(sessionId);
    return {
      success: true,
      sessionId: session.id,
      status: session.status,
      endedAt: session.endedAt,
    };
  }
}
