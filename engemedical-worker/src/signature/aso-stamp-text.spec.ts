import { AsoMetadata } from './aso-metadata.types';
import { buildOfficialAsoStampText } from './aso-stamp-text';

describe('buildOfficialAsoStampText', () => {
  it('renders UTF-8 text with CRM and CPF when metadata is complete', () => {
    const metadata: AsoMetadata = {
      professionalName: 'Amanda de Souza Zanetti',
      crm: '226402',
      uf: 'SP',
      cpf: '389.583.238-33',
      prontuario: '1733915-143-3-29042026',
    };

    const stamp = buildOfficialAsoStampText(
      metadata,
      '69ef58ed126c4a3b8a9bebe2',
    );

    expect(stamp.title).toBe('ASSINADO DIGITALMENTE');
    expect(stamp.disclaimer).toContain('Assinatura eletr\u00f4nica');
    expect(stamp.disclaimer).toContain('Lei n\u00ba 14.063/2020');
    expect(stamp.professionalInfo).toBe(
      'M\u00e9dico Examinador: Amanda de Souza Zanetti',
    );
    expect(stamp.credentialsInfo).toBe('CRM: 226402-SP | CPF: 389.583.238-33');
    expect(stamp.referenceInfo).toBe(
      'ID: 69ef58ed126c4a3b8a9bebe2 | Prontu\u00e1rio: 1733915-143-3-29042026',
    );
  });

  it('keeps N/D only when metadata is truly empty', () => {
    const metadata: AsoMetadata = {
      professionalName: '',
      crm: '',
      uf: '',
      cpf: '',
      prontuario: '',
    };

    const stamp = buildOfficialAsoStampText(metadata, 'abc');

    expect(stamp.professionalInfo).toBe('M\u00e9dico Examinador: N/D');
    expect(stamp.credentialsInfo).toBe('CRM: N/D | CPF: N/D');
    expect(stamp.referenceInfo).toBe('ID: abc | Prontu\u00e1rio: N/D');
  });
});
