import { TDocumentDefinitions } from 'pdfmake/interfaces';
import { gerarDocAcuidadeVisual } from 'src/pdfmake/templates/acuidade';
import { gerarDocAudiometria } from 'src/pdfmake/templates/audiometria';
import { gerarDocDinamometria } from 'src/pdfmake/templates/dinamometria';
import { gerarDocEspirometria } from 'src/pdfmake/templates/espirometria';
import { gerarDocExameClinico } from 'src/pdfmake/templates/exameClinico';
import { gerarDocPsicossocial } from 'src/pdfmake/templates/psicossocial';

export const TEMPLATE_MAP: Record<string, (...args: any[]) => TDocumentDefinitions | Promise<TDocumentDefinitions>> = {
  exameClinico: gerarDocExameClinico,
  audiometria: gerarDocAudiometria,
  acuidade: gerarDocAcuidadeVisual,
  espirometria: gerarDocEspirometria,
  dinamometria: gerarDocDinamometria,
  psicossocial: gerarDocPsicossocial,
};
