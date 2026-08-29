import { resolveAsoMetadata } from './resolve-aso-metadata';

describe('resolveAsoMetadata', () => {
  it('prioritizes payload professional and returns complete medical metadata', () => {
    const result = resolveAsoMetadata({
      payloadProfessional: {
        codigo: '1698',
        nome: 'Amanda de Souza Zanetti',
        cpf: '389.583.238-33',
        conselho: '226402',
        ufconselho: 'SP',
      },
      scheduling: {
        CODIGOPRONTUARIO: '1733915-143-3-29042026',
        MEDICO: 'Amanda de Souza Zanetti',
      },
      trimmedId: '1733915',
    });

    expect(result).toEqual({
      professionalName: 'Amanda de Souza Zanetti',
      crm: '226402',
      uf: 'SP',
      cpf: '389.583.238-33',
      prontuario: '1733915-143-3-29042026',
    });
  });

  it('uses ASOINFO professional when payload professional is absent', () => {
    const result = resolveAsoMetadata({
      asoProfessional: {
        codigo: '1698',
        nome: 'Amanda de Souza Zanetti',
        cpf: '389.583.238-33',
        conselho: '226402',
        ufconselho: 'SP',
      },
      scheduling: {
        CODIGOPRONTUARIO: '1733915-143-3-29042026',
        MEDICO: 'Amanda de Souza Zanetti',
      },
      trimmedId: '1733915',
    });

    expect(result).toEqual({
      professionalName: 'Amanda de Souza Zanetti',
      crm: '226402',
      uf: 'SP',
      cpf: '389.583.238-33',
      prontuario: '1733915-143-3-29042026',
    });
  });

  it('falls back to clinical data and db user without producing N/D when source data exists', () => {
    const result = resolveAsoMetadata({
      payloadProfessional: {
        codigo: '1698',
        nome: 'Amanda de Souza Zanetti',
      },
      clinicalProfessionalData: {
        cpf: '38958323833',
        conselho: '226402',
        ufconselho: 'SP',
      },
      dbUser: {
        nome: 'Amanda de Souza Zanetti',
        cpf: '389.583.238-33',
        crm: '226402',
        uf: 'SP',
      },
      scheduling: {
        CODIGOPRONTUARIO: '991254-493-1-28042026',
        MEDICO: 'Amanda de Souza Zanetti',
      },
      trimmedId: '991254',
    });

    expect(result.professionalName).toBe('Amanda de Souza Zanetti');
    expect(result.crm).toBe('226402');
    expect(result.uf).toBe('SP');
    expect(result.cpf).toBe('38958323833');
    expect(result.prontuario).toBe('991254-493-1-28042026');
  });

  it('returns N/D only when no medical identity source is available', () => {
    const result = resolveAsoMetadata({
      scheduling: {},
      trimmedId: 'abc',
    });

    expect(result.professionalName).toBe('N/D');
    expect(result.crm).toBe('');
    expect(result.uf).toBe('');
    expect(result.cpf).toBe('');
    expect(result.prontuario).toBe('abc');
  });
});
