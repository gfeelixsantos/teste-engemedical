import { FichaClinicaData } from './templates/exameClinico';

// Fun├º├úo ├║nica para todas as restri├º├Áes
export const getRestricoesCompletas = (form: FichaClinicaData) => {
  if (form.conclusao !== 'Apto com restri├º├Áes') return [];

  const elementos: any = [];
  const { restricoes } = form;

  // Informa├º├Áes de dura├º├úo
  if (form.duracaoRestricaoDias || form.dataInicioRestricao) {
    const duracaoText: string[] = [];
    if (form.duracaoRestricaoDias)
      duracaoText.push(`Dura├º├úo: ${form.duracaoRestricaoDias} dias`);
    if (form.dataInicioRestricao) {
      const dataFormatada = new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
      }).format(new Date(form.dataInicioRestricao));
      duracaoText.push(`In├¡cio: ${dataFormatada}`);
    }

    elementos.push({
      text: duracaoText.join(' | '),
      margin: [0, 0, 0, 8],
      bold: true,
      fontSize: 9,
    });
  }

  // Restri├º├Áes
  if (restricoes) {
    const restricoesText: string[] = [];

    if (restricoes.evitarCarregarPeso) {
      restricoesText.push(
        restricoes.pesoMaximoKg
          ? `Carregar peso (m├íx. ${restricoes.pesoMaximoKg}kg)`
          : 'Carregar peso excessivo',
      );
    }

    if (restricoes.evitarElevacaoBracos && restricoes.tipoElevacaoBracos) {
      restricoesText.push(`Elevar bra├ºos (${restricoes.tipoElevacaoBracos})`);
    }

    if (restricoes.evitarCurvarTronco) restricoesText.push('Curvar tronco');
    if (restricoes.evitarEscadas) restricoesText.push('Escadas/degraus');
    if (restricoes.evitarLongasCaminhadas)
      restricoesText.push('Longas caminhadas');
    if (restricoes.evitarAlterarPostura) restricoesText.push('Alterar postura');

    if (restricoes.outros && restricoes.descricaoOutros) {
      restricoesText.push(`Outros: ${restricoes.descricaoOutros}`);
    }

    if (restricoesText.length > 0) {
      elementos.push({
        text: `Restri├º├Áes: ${restricoesText.join('; ')}`,
        margin: [0, 0, 0, 5],
        fontSize: 9,
      });
    }
  }

  return elementos;
};
