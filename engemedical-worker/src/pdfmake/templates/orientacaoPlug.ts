import { Content } from 'pdfmake/interfaces';
import { AudiometriaData } from './audiometria';
import { getImageBase64, createGridSection } from 'src/utils/util';

export async function getPaginaOrientacaoPlugSilicone(
  form: AudiometriaData,
  asoData: any,
  profissional: {
    codigo: string;
    cpf: string;
    conselho: string;
    ufconselho: string;
  },
  assinaturaProfissional: string | null,
  nomefono: string | null,
): Promise<Content[]> {
  void profissional;
  void assinaturaProfissional;
  void nomefono;

  const {
    NOME,
    CPFFUNCIONARIO,
    DATANASCIMENTO,
    DATAAGENDAMENTO,
    NOMECARGO,
    TIPOEXAMENOME,
  } = asoData;

  if (
    !form.orientacaoPlugSilicone ||
    form.orientacaoPlugSilicone.trim() === ''
  ) {
    return [];
  }

  const logoWhirlpool = await getImageBase64(
    'https://sistema.soc.com.br/estatico/upload/empresas/16459/logos/relatorio/16459r16logorel.png',
  );

  const imagemUsoProtetor = await getImageBase64(
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSgWgwWk2kvUkiXXb_FipaJixdX1_fGV1mjtA&s',
  );

  const dadosFuncionarioGrid = [
    ['NOME', NOME || 'N/D', 'DT. NASC', DATANASCIMENTO || 'N/D'],
    ['FUNÇÃO', NOMECARGO || 'N/D', 'CPF', CPFFUNCIONARIO || 'N/D'],
    ['TIPO DE EXAME', TIPOEXAMENOME || 'N/D', 'DATA', DATAAGENDAMENTO || 'N/D'],
  ];

  const content: Content[] = [];

  content.push({
    text: '',
    pageBreak: 'before',
  });

  content.push({
    columns: [
      {
        width: '*',
        stack: [
          { text: 'Ficha de Inspeção e Treinamento do Uso do EPI' },
          { text: 'Documento integrante do PCA - Ref: 03' },
          { text: 'Empresa: Whirlpool Latin América - Rio Claro', bold: true },
        ],
      },
      ...(logoWhirlpool
        ? [
            {
              width: '*',
              stack: [
                {
                  image: logoWhirlpool,
                  width: 100,
                  alignment: 'right' as const,
                  margin: [0, 0, 0, 15] as [number, number, number, number],
                },
              ],
            },
          ]
        : []),
    ],
    margin: [0, 0, 0, 10],
  });

  content.push(createGridSection('', dadosFuncionarioGrid, { fontSize: 9 }));

  content.push(
    {
      text: 'O colaborador acima descrito, nesta data recebeu pelo CEDOR Centro Médico as seguintes orientações:',
      alignment: 'justify',
      margin: [0, 0, 0, 10],
    },
    {
      text: 'Deverá utilizar o PROTETOR AUDITIVO:',
      margin: [0, 0, 0, 10],
    },
    {
      text: `TIPO PLUG SILICONE TAMANHO: ${form.orientacaoPlugSilicone}`,
      bold: true,
      fontSize: 14,
      margin: [0, 0, 0, 15],
    },
  );

  content.push(
    {
      text: 'Deve utilizar protetor auditivo conforme orientações específicas do modelo, durante todo o tempo em que estiver exposto a ruído, colocando-o antes de entrar nas áreas e retirando-o apenas após sair de locais ruidosos.',
      margin: [0, 0, 0, 8],
    },
    {
      text: 'Havendo qualquer queixa quanto ao seu uso, o mesmo deverá se encaminhar imediatamente para avaliação do SERVIÇO DE MEDICINA DO TRABALHO, para que seja avaliada a queixa e tomadas as devidas providências.',
      margin: [0, 0, 0, 8],
    },
    {
      text: 'Fica o colaborador ciente que de acordo com Norma Regulamentadora 6-7.1, aprovada pela portaria nº 3.214 do Ministério do Trabalho, é sua obrigação com relação aos EPIs fornecidos pela empresa:',
      margin: [0, 0, 0, 8],
    },
  );

  content.push({
    ul: [
      'Usá-lo(s) apenas para a finalidade a que se destina.',
      'Responsabilizar-se por sua guarda e proteção.',
      'Comunicar à empregadora qualquer alteração que o torne impróprio para uso.',
    ],
    margin: [0, 0, 0, 15],
  });

  content.push(
    {
      text: 'Quanto à higienização e armazenamento dos protetores:',
      margin: [0, 0, 0, 8],
    },
    {
      text: 'Ao final do expediente, lave-o com água corrente e sabão neutro, deixe secar e guarde-o em local fechado.',
      bold: true,
      margin: [0, 0, 0, 8],
    },
    {
      text: 'A troca dos protetores deve ocorrer sempre que seu supervisor informar.',
      bold: true,
      margin: [0, 0, 0, 15],
    },
  );

  if (imagemUsoProtetor) {
    content.push({
      image: imagemUsoProtetor,
      width: 520,
      alignment: 'center',
      margin: [0, 0, 0, 15],
    });
  }

  content.push({
    columns: [
      {
        width: '*',
        text: '1. Com as mãos limpas, segure o protetor auditivo com os dedos polegar e indicador.',
        fontSize: 7,
      },
      {
        width: '*',
        text: '2. Passe a outra mão ao redor da cabeça e puxe o topo de sua orelha para facilitar a inserção.',
        fontSize: 7,
      },
      {
        width: '*',
        text: '3. Insira o protetor no canal auditivo com cuidado, empurrando até obter melhor vedação.',
        fontSize: 7,
      },
      {
        width: '*',
        text: '4. Protetor corretamente inserido: ao menos metade deve permanecer dentro do canal auditivo.',
        fontSize: 7,
      },
    ],
    margin: [0, 0, 0, 40],
  });

  return content;
}
