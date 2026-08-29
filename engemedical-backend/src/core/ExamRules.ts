import { ExamStatus } from 'src/mongo/enum/scheduling.enum';
import { FuncionarioEntity } from 'src/mongo/model/FuncionarioEntity';
import { getExamesList, ExamToogle } from 'src/exames/exames.provider';
import { hasPsychosocialFormData } from 'src/mongo/utils/psychosocial-form.util';

/* Regras puras: recebem entidade e dados, retornam efeitos (p.ex. códigos adicionais para atualizar) */
export class ExamRules {
  static isClinicoCodigo(codigo: string, examesList = getExamesList()) {
    const list = examesList['Exame Clínico'] || [];
    const set = new Set(list.flatMap((e) => e.codigos || []));
    return set.has(codigo);
  }

  static getPsicoCodigos(examesList = getExamesList()) {
    const list = examesList['Psicossocial'] || [];
    const psico = list.find((e) => e.nome === 'Psicossocial') || list[0];
    return new Set(psico?.codigos || []);
  }

  static getConsultaOftalmologicaCodigos(examesList = getExamesList()) {
    const list = examesList['Acuidade Visual'] || [];
    const consulta = list.find((e) => e.nome === 'Consulta Oftalmológica') || list[1] || list[0];
    return new Set(consulta?.codigos || []);
  }

  // src/core/ExamRules.ts

  static aplicarRegrasTriagemEClinico(
    codigosParaAtualizar: string[],
    funcionario: FuncionarioEntity,
    formulario: any,
  ) {
    const list = getExamesList()['Exame Clínico'] || [];
    const codigosClinico = new Set(list.flatMap((e) => e.codigos || []));

    const ehTriagem = codigosParaAtualizar.includes('triagem');
    const ehClinico = codigosParaAtualizar.some((c) => codigosClinico.has(c));

    const exames = funcionario.getRaw().EXAMES;

    // Detecta se o exame clínico existe no documento
    const indexClinico = exames.findIndex((e) =>
      codigosClinico.has(e.codigoExame),
    );

    const clinicoExiste = indexClinico !== -1;

    // ----------------------------------------------------
    // 1) TRIAGEM
    // ----------------------------------------------------
    if (ehTriagem) {
      const indexTri = exames.findIndex((e) => e.codigoExame === 'triagem');

      if (indexTri !== -1) {
        if (clinicoExiste) {
          // Garante que o formulário seja um objeto para desestruturação
          const formObj =
            typeof formulario === 'object' && formulario !== null
              ? formulario
              : {};

          // Remove campos de identificação profissional para não sobrescrever o médico do Clínico
          const {
            codigoMedico,
            medico,
            profissional,
            codigoProfissional,
            ...dadosClinicos
          } = formObj;

          const clinicoOrig = funcionario.getRaw().EXAMES[indexClinico];
          const formClinicoOrig =
            typeof clinicoOrig.formulario === 'object' &&
            clinicoOrig.formulario !== null
              ? clinicoOrig.formulario
              : {};

          // Mescla apenas os dados clínicos preservando o médico original do formulário clínico
          funcionario.updateExameAtIndex(indexClinico, {
            formulario: {
              ...formClinicoOrig,
              ...dadosClinicos,
            },
          });
        } else {
          funcionario.updateExameAtIndex(indexTri, {
            formulario: { ...formulario },
          });
        }

        // Triagem SEMPRE finaliza
        funcionario.updateExameAtIndex(indexTri, {
          status: ExamStatus.FINALIZADO,
        });
      }
    }

    // ----------------------------------------------------
    // 2) CLÍNICO → sempre finaliza a triagem
    // ----------------------------------------------------
    if (ehClinico) {
      const indexTri = exames.findIndex((e) => e.codigoExame === 'triagem');
      if (indexTri !== -1) {
        // Usa updateExameAtIndex
        funcionario.updateExameAtIndex(indexTri, {
          status: ExamStatus.FINALIZADO,
        });
      }
    }

    return codigosParaAtualizar;
  }

  static aplicarRegraEegEcgPsico(
    codigosParaAtualizar: string[],
    funcionario: FuncionarioEntity,
    formulario?: any,
  ) {
    const exameEegOuEcg = codigosParaAtualizar.some(
      (c) => c === '22010017' || c === '20.01.001-0',
    );
    if (!exameEegOuEcg) return;

    // Só adiciona o Psicossocial se o payload tiver dados psicossociais reais.
    // Caso contrário, o Psicossocial permanece PENDENTE para o psicólogo preencher
    // em uma requisição separada, evitando auto-finalização com formulário vazio.
    if (formulario && !hasPsychosocialFormData(formulario)) return;

    const codigosPsico = this.getPsicoCodigos();
    const psicoIndex = funcionario
      .getRaw()
      .EXAMES.findIndex((e) => codigosPsico.has(e.codigoExame));
    if (psicoIndex !== -1) {
      const preparacao =
        funcionario.getRaw().EXAMES[psicoIndex].preparacao || '';
      if (
        !preparacao.includes('Entrevista') &&
        funcionario.getRaw().EXAMES[psicoIndex].status !== ExamStatus.FINALIZADO
      ) {
        const psicoCodigo =
          funcionario.getRaw().EXAMES[psicoIndex].codigoExame;
        // Insere no início da fila para ser processado ANTES do ECG/EEG,
        // garantindo que o formulário psicossocial seja aplicado primeiro.
        codigosParaAtualizar.unshift(psicoCodigo);
      }
    }
  }

  static aplicarRegraConsultaOftalmologica(
    codigosParaAtualizar: string[],
    funcionario: FuncionarioEntity,
  ) {
    const consultaOftalmologicaCodigos = this.getConsultaOftalmologicaCodigos();
    const consultaOftalmologicaIndex = funcionario
      .getRaw()
      .EXAMES.findIndex((e) => consultaOftalmologicaCodigos.has(e.codigoExame));
    if (consultaOftalmologicaIndex === -1) return;

    const consultaOftalmologicaCodigo =
      funcionario.getRaw().EXAMES[consultaOftalmologicaIndex].codigoExame;

    // Se algum dos códigos relacionados à consulta oftalmológica estiver na lista de atualização, adiciona o código da consulta
    const temCodigoRelacionado = codigosParaAtualizar.some((codigo) =>
      consultaOftalmologicaCodigos.has(codigo),
    );

    if (temCodigoRelacionado) {
      codigosParaAtualizar.push(consultaOftalmologicaCodigo);
    }
  }

  /** Regra centralizada de validação/manipulação do exameInfo */
  static aplicarValidacaoExameInfo(
    exameInfo: ExamToogle,
    funcionario: FuncionarioEntity,
  ) {
    // Regra 1: Se for Riclan ou Credenciada, não envia para o azure e finaliza exame
    if (funcionario.isCredenciada()) {
      exameInfo.enviarParaAzure = false;
      exameInfo.statusFinalizacao = ExamStatus.FINALIZADO;

      return exameInfo;
    }

    // Regra 2: Se for credenciada manual atualiza para aguardar resultado
    // if (funcionario.isComplementarManual()) {
    //   exameInfo.enviarParaAzure = false;
    //   exameInfo.statusFinalizacao = ExamStatus.AGUARDANDO_RESULTADO;

    //   return exameInfo;
    // }

    return exameInfo;
  }
}
