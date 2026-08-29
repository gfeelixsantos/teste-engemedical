import { strict as assert } from 'node:assert';

import { AsoMetadata } from './aso-metadata.types';
import { buildOfficialAsoStampText } from './aso-stamp-text';

const metadata: AsoMetadata = {
  professionalName: 'Amanda de Souza Zanetti',
  crm: '226402',
  uf: 'SP',
  cpf: '389.583.238-33',
  prontuario: '1733915-143-3-29042026',
};

const stamp = buildOfficialAsoStampText(metadata, '69ef58ed126c4a3b8a9bebe2');

assert.equal(stamp.title, 'ASSINADO DIGITALMENTE');
assert.match(stamp.disclaimer, /Assinatura eletrônica/);
assert.match(stamp.disclaimer, /Lei nº 14\.063\/2020/);
assert.equal(
  stamp.professionalInfo,
  'Médico Examinador: Amanda de Souza Zanetti',
);
assert.equal(stamp.credentialsInfo, 'CRM: 226402-SP | CPF: 389.583.238-33');
assert.equal(
  stamp.referenceInfo,
  'ID: 69ef58ed126c4a3b8a9bebe2 | Prontuário: 1733915-143-3-29042026',
);

const emptyStamp = buildOfficialAsoStampText(
  {
    professionalName: '',
    crm: '',
    uf: '',
    cpf: '',
    prontuario: '',
  },
  'abc',
);

assert.equal(emptyStamp.professionalInfo, 'Médico Examinador: N/D');
assert.equal(emptyStamp.credentialsInfo, 'CRM: N/D | CPF: N/D');
assert.equal(emptyStamp.referenceInfo, 'ID: abc | Prontuário: N/D');

console.log(
  'OK buildOfficialAsoStampText preserva UTF-8 e só usa N/D quando necessário',
);
