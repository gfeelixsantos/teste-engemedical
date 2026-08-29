import { gerarDocAcuidadeVisual } from 'src/pdfmake/templates/acuidade';
import { gerarDocAudiometria } from 'src/pdfmake/templates/audiometria';
import { gerarDocDinamometria } from 'src/pdfmake/templates/dinamometria';
import { gerarDocEspirometria } from 'src/pdfmake/templates/espirometria';
import { gerarDocExameClinico } from 'src/pdfmake/templates/exameClinico';
import { gerarDocFichaAssistencial } from 'src/pdfmake/templates/fichaAssistencial';
import { gerarDocPsicossocial } from 'src/pdfmake/templates/psicossocial';
import { gerarDocRestricaoTemporaria } from 'src/pdfmake/templates/restricao';
import { gerarDocTriagem } from 'src/pdfmake/templates/triagem';
import { gerarDocUltrassom } from 'src/pdfmake/templates/ultrassom';

export const TEMPLATE_MAP: Record<string, Function> = {
  exameClinico: gerarDocExameClinico,
  fichaAssistencial: gerarDocFichaAssistencial,
  restricaoTemporaria: gerarDocRestricaoTemporaria,
  audiometria: gerarDocAudiometria,
  acuidade: gerarDocAcuidadeVisual,
  psicossocial: gerarDocPsicossocial,
  espirometria: gerarDocEspirometria,
  dinamometria: gerarDocDinamometria,
  ultrassom: gerarDocUltrassom,
  triagem: gerarDocTriagem,
};
