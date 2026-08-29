import { EmailType, TemplateNames } from '../types/emailtype';
import { parecerMedicoHtml } from './html/parecerMedico';
import { asoReleaseHtml } from './html/asoRelease';
import { asoNoContactsHtml } from './html/asoNoContacts';
import { complementarReleaseHtml } from './html/complementarRelease';
import { positionCreationNotificationHtml } from './html/positionCreationNotification';
import { schedulingClientHtml } from './html/schedulingClient';
import { schedulingInternalHtml } from './html/schedulingInternal';
import { customerNoEmailHtml } from './html/customerNoEmail';
import { relatorioFaturamentoHtml } from './html/relatorioFaturamento';
import { commitmentNotificationHtml } from './html/commitmentNotification';
import { examesNaoRealizadosHtml } from './html/examesNaoRealizados';

export class TemplateGenerate {
  static render(mail: EmailType) {
    switch (mail.templatename) {
      case TemplateNames.PARECER_MEDICO:
        if (mail.data?.funcionario && mail.data?.medicalOpinion) {
          mail.template = parecerMedicoHtml(
            mail.data.funcionario,
            mail.data.medicalOpinion,
            mail.data.issuedBy,
            mail.data?.asoInfo?.asoFileUrl,
            mail.data?.asoInfo?.observacoesParecer,
          );
        } else {
          console.warn(
            'Dados incompletos para gerar o template PARECER_MEDICO',
          );
        }
        return mail;

      case TemplateNames.ASO_RELEASE:
        if (mail.data?.asoInfo) {
          mail.template = asoReleaseHtml(
            mail.data.asoInfo.nomeFuncionario,
            mail.data.asoInfo.nomeEmpresa,
            mail.data.asoInfo.tipoExame,
            mail.data.asoInfo.data,
            mail.data.asoInfo.chegada,
            mail.data.asoInfo.cpf,
            mail.data.asoInfo.parecer,
            mail.data.asoInfo.observacoesParecer,
            mail.data.asoInfo.asoFileUrl,
            mail.data.asoInfo.examesRealizados,
          );
        } else {
          console.warn('Dados incompletos para gerar o template ASO_RELEASE');
        }
        return mail;

      case TemplateNames.ASO_NO_CONTACTS:
        if (mail.data?.asoInfo) {
          mail.template = asoNoContactsHtml(
            mail.data.asoInfo.nomeFuncionario,
            mail.data.asoInfo.nomeEmpresa,
            mail.data.asoInfo.tipoExame,
            mail.data.asoInfo.data,
            mail.data.asoInfo.cpf || 'N/D',
            mail.data.asoInfo.parecer || 'N/D',
            mail.data.asoInfo.asoFileName || 'N/D',
          );
        } else {
          console.warn(
            'Dados incompletos para gerar o template ASO_NO_CONTACTS',
          );
        }
        return mail;

      case TemplateNames.COMPLEMENTAR_RELEASE:
        if (mail.data?.complementarInfo) {
          mail.template = complementarReleaseHtml(
            mail.data.complementarInfo.nomeFuncionario,
            mail.data.complementarInfo.nomeEmpresa,
            mail.data.complementarInfo.tipoExame,
            mail.data.complementarInfo.data,
            mail.data.complementarInfo.chegada,
            mail.data.complementarInfo.cpf,
            mail.data.complementarInfo.unidade,
            mail.data.complementarInfo.examesRealizados,
          );
        } else {
          console.warn(
            'Dados incompletos para gerar o template COMPLEMENTAR_RELEASE',
          );
        }
        return mail;

      case TemplateNames.POSITION_CREATION_NOTIFICATION:
        if (mail.data?.positionInfo) {
          mail.template = positionCreationNotificationHtml(mail.data.positionInfo);
        } else {
          console.warn(
            'Dados incompletos para gerar o template POSITION_CREATION_NOTIFICATION',
          );
        }
        return mail;

      case TemplateNames.SCHEDULING_CLIENT:
        if (mail.data?.funcionario) {
          mail.template = schedulingClientHtml(mail.data.funcionario);
        } else {
          console.warn(
            'Dados incompletos para gerar o template SCHEDULING_CLIENT',
          );
        }
        return mail;

      case TemplateNames.SCHEDULING_INTERNAL:
        if (mail.data?.funcionario) {
          mail.template = schedulingInternalHtml(mail.data.funcionario);
        } else {
          console.warn(
            'Dados incompletos para gerar o template SCHEDULING_INTERNAL',
          );
        }
        return mail;

      case TemplateNames.CUSTOMER_NO_EMAIL:
        if (mail.data?.customerNoEmailInfo) {
          mail.template = customerNoEmailHtml(
            mail.data.customerNoEmailInfo.nomeCliente,
            mail.data.customerNoEmailInfo.nomeEmpresa,
            mail.data.customerNoEmailInfo.linkAtualizacao,
          );
        } else {
          console.warn(
            'Dados incompletos para gerar o template CUSTOMER_NO_EMAIL',
          );
        }
        return mail;

      case TemplateNames.RELATORIO_FATURAMENTO:
        if (mail.data?.faturamentoInfo) {
          mail.template = relatorioFaturamentoHtml(
            mail.data.faturamentoInfo.nomeEmpresa,
            mail.data.faturamentoInfo.dataReferencia,
            mail.data.faturamentoInfo.tipoDocumento,
            mail.data.faturamentoInfo.arquivoUrl,
            mail.data.faturamentoInfo.nomeArquivo,
            mail.data.faturamentoInfo.observacoes,
            mail.data.faturamentoInfo.cnpj,
          );
        } else {
          console.warn('Dados incompletos para gerar o template RELATORIO_FATURAMENTO');
        }
        return mail;

      case TemplateNames.COMMITMENT_NOTIFICATION:
        if (mail.data?.commitmentInfo) {
          mail.template = commitmentNotificationHtml(mail.data.commitmentInfo);
        } else {
          console.warn('Dados incompletos para gerar o template COMMITMENT_NOTIFICATION');
        }
        return mail;

      case TemplateNames.EXAMES_NAO_REALIZADOS:
        if (mail.data?.unfinishedExamsInfo) {
          mail.template = examesNaoRealizadosHtml(mail.data.unfinishedExamsInfo);
        } else {
          console.warn('Dados incompletos para gerar o template EXAMES_NAO_REALIZADOS');
        }
        return mail;

      case TemplateNames.CUSTOM_HTML:
        // HTML customizado já está em mail.template (definido pelo chamador)
        return mail;

      default:
        console.warn(`Template nao reconhecido: ${mail.templatename}`);
        return mail;
    }
  }
}
