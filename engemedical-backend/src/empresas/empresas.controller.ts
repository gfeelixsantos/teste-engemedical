import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Req,
  Query,
  UseGuards,
  ForbiddenException,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from 'src/soc/guards/jwt-auth.guard';
import { parseAuthUserHeader } from 'src/core/professional-identity.resolver';
import { EmpresaDocumentosService } from './empresa-documentos.service';
import { Request } from 'express';

@Controller('empresas')
@UseGuards(JwtAuthGuard)
export class EmpresasController {
  constructor(
    private readonly empresaDocumentosService: EmpresaDocumentosService,
  ) {}

  @Post(':codigo/documentos')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocumento(
    @Param('codigo') codigo: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
    @Req() request: Request,
  ) {
    const userHeader = request.headers['x-auth-user'];
    const authUser = parseAuthUserHeader(userHeader as string);
    if (!authUser || authUser.perfil !== 'MASTER') {
      throw new ForbiddenException('Acesso restrito ao perfil MASTER');
    }

    if (!file) {
      throw new BadRequestException('Nenhum arquivo enviado.');
    }

    return await this.empresaDocumentosService.uploadDocument(
      codigo,
      file,
      {
        categoria: body.categoria,
        tipoDocumento: body.tipoDocumento,
        dataReferencia: body.dataReferencia,
        observacoes: body.observacoes,
        comunicarEmail: body.comunicarEmail,
        contatosNotificados: body.contatosNotificados,
      },
      authUser.nome || 'SISTEMA',
    );
  }

  @Get(':codigo/documentos')
  async listDocumentos(
    @Param('codigo') codigo: string,
    @Query('categoria') categoria?: string,
  ) {
    return await this.empresaDocumentosService.listDocuments(codigo, categoria);
  }

  @Delete(':codigo/documentos/:documentoId')
  async deleteDocumento(
    @Param('codigo') codigo: string,
    @Param('documentoId') documentoId: string,
    @Req() request: Request,
  ) {
    const userHeader = request.headers['x-auth-user'];
    const authUser = parseAuthUserHeader(userHeader as string);
    if (!authUser || authUser.perfil !== 'MASTER') {
      throw new ForbiddenException('Acesso restrito ao perfil MASTER');
    }

    await this.empresaDocumentosService.deleteDocument(codigo, documentoId);
    return { success: true };
  }

  @Patch(':codigo/documentos/:documentoId')
  @UseInterceptors(FileInterceptor('file'))
  async updateDocumento(
    @Param('codigo') codigo: string,
    @Param('documentoId') documentoId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: any,
    @Req() request: Request,
  ) {
    const userHeader = request.headers['x-auth-user'];
    const authUser = parseAuthUserHeader(userHeader as string);
    if (!authUser || authUser.perfil !== 'MASTER') {
      throw new ForbiddenException('Acesso restrito ao perfil MASTER');
    }

    return await this.empresaDocumentosService.updateDocumentNotification(
      codigo,
      documentoId,
      file,
      {
        comunicarEmail: body.comunicarEmail,
        contatosNotificados: body.contatosNotificados,
      },
    );
  }
}
