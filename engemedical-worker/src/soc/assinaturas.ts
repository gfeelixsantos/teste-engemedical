/**
 * Referencia do upload de assinatura do SOC
 * chave é o código do funcionário
 */

const empresaPrincipal = process.env.SOC_WEBSERVICE_EMPRESA_PRINCIPAL || '1153506';
const urlBase =
  `https://sistema.soc.com.br/estatico/upload/empresas/${empresaPrincipal}/pessoa/`;

export const ASSINATURAS_URL: Record<string, string> = {
  '450': urlBase + '450.png?a=1761172638989', // Gabriel teste

  // Fonos
  '1301': urlBase + '1301.png?b=1760840095521', // Mayra
  '1136': urlBase + '1136.png?b=1761172713152', // Jane
  '980': urlBase + '980.png?b=1761258823894', // Carla
  '1407': urlBase + '1407.png?b=1761258895541', // Ivania

  // Médicos
  '1006': urlBase + '1006.png?b=1761172764932', // Dra Amanda
  '1': urlBase + '1.png?b=1761172814105', // Dra Andrea
  '1400': urlBase + '1400.png?b=1761172864124', // Dr Gustavo
  '1517': urlBase + '1517.png?b=1761172902774', // Dr Carlos Quibao
  '1594': urlBase + '1594.png?b=1761173020721', // Dr Rodrigo
  '1591': urlBase + '1591.png?b=1765979139313', // Dr Rodrigo
  '1702': urlBase + '1702.png?b=1769535426562', // Dra Gabriela Cunha
  '1704': urlBase + '1704.png?b=1770747540106', // Dra Paola
  '1461': urlBase + '1461.png?b=1771510013065', // Dra Raissa
  '1698': urlBase + '1698.png?b=1772457290381', // Dra Beatriz

  // Enfermagem
  '1612': urlBase + '1612.png?a=1762273527796', // Gabriel
  '511': urlBase + '511.png?b=1762273726567', // Joice
  '1647': urlBase + '1647.png?b=1762273765207', // Rayssa
  '1645': urlBase + '1645.png?b=1762273817878', // Gabi Denardi
  '957': urlBase + '957.png?a=1762273935631', // Marcela
  '1650': urlBase + '1650.png?a=1762274044562', // Ketlin
  '1648': urlBase + '1648.png?a=1762274154038', // Pamela
};
