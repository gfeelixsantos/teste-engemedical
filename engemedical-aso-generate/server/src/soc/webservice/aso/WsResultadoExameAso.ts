import axios from "axios";
import { AsoProcessingMessage } from "../../../web/types";

const WSSecurity = require("wssecurity-soap");

const URL = 'https://ws1.soc.com.br/WSSoc/services/ResultadoExamesWs?wsdl'

function extractSoapFaultMessage(responseBody: unknown): string | null {
    const text = String(responseBody || "");
    const match = text.match(/<faultstring>([\s\S]*?)<\/faultstring>/i);
    return match?.[1]?.trim() || null;
}

function normalizeSoapScalar(value: unknown): string {
    return String(value || "")
        .trim()
        .replace(/^"+|"+$/g, "")
        .replace(/^'+|'+$/g, "");
}

function buildNormalizedMap(raw: Record<string, string>): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(raw)) {
        result[key.trim().toUpperCase().normalize('NFC')] = value;
    }
    return result;
}

const ALTURA_MAP = buildNormalizedMap({
    'APTO PARA TRABALHO EM ALTURA': 'APTO',
    'APTO PARA TRABALHO EM ALTURA COM CINTO ACIMA DE 100 KG': 'APTO_COM_RESTRICOES',
    'INAPTO PARA TRABALHO EM ALTURA': 'INAPTO',
});

const CONFINADO_MAP = buildNormalizedMap({
    'APTO PARA ESPAÇO CONFINADO': 'APTO',
    'INAPTO PARA ESPAÇO CONFINADO': 'INAPTO',
});

function normalizeKey(s: string): string {
    return s.trim().toUpperCase().normalize('NFC');
}

function mapParecerParaSoc(valor: string | undefined, mapeamento: Record<string, string>): string {
    if (!valor) return 'BRANCO';
    const key = normalizeKey(valor);
    const mapped = mapeamento[key] || 'BRANCO';
    if (mapped === 'BRANCO' && key !== 'BRANCO') {
        console.log(`[WS] mapParecerParaSoc: valor="${valor}" key="${key}" nao encontrado no mapa, usando BRANCO`);
    }
    return mapped;
}

function mapParecerAsoParaSoc(parecerRaw?: string): string {
    const p = (parecerRaw || '').trim().toUpperCase();
    if (p === 'INAPTO_TEMPORARIO' || p === 'INAPTO_TEMPORARIAMENTE') return 'INAPTO_TEMPORARIO';
    if (p === 'INAPTO') return 'INAPTO';
    return 'APTO';
}

function handleCertificateObservation(parecerRaw: string | undefined, observacoes: string[] | undefined): string {
    const p = (parecerRaw || '').trim().toUpperCase();

    // Para APTO e APTO_COM_ORIENTACAO o comentário é sempre vazio
    if (p === 'APTO' || p === 'APTO_COM_ORIENTACAO') {
        return '<comentarioAso></comentarioAso>';
    }

    const list: string[] = Array.isArray(observacoes) ? [...observacoes] : [];

    // Para APTO_COM_RESTRICAO injeta o texto de restrição no topo
    if (p === 'APTO_COM_RESTRICAO' && !list.some(o => (o || '').toUpperCase().includes('APTO COM RESTRIÇÃO'))) {
        list.unshift('APTO COM RESTRIÇÃO');
    }

    if (list.length > 0) {
        const handleString = list.join('\n');
        return `<comentarioAso>${handleString}</comentarioAso>`;
    }
    return '<comentarioAso></comentarioAso>';
}

export async function WsResultadoExameAso(content: AsoProcessingMessage) {

    const user = process.env.SOCWS_USUARIO
    const pass = process.env.SOCWS_PASS
    const codPrincipal = process.env.SOCWS_EMPRESA_PRINCIPAL
    const codResponsavel = process.env.SOCWS_RESPONSAVEL
    const codUsuario = process.env.SOCWS_CODUSUARIO

    const { codEmpresa, codFuncionario, sequencial, medico, parecer, alturaParecer, confinadoParecer, observacoesParecer, dataFicha } = content

    console.log(`[WS] DEBUG WsResultadoExameAso - medico="${medico}" | codEmpresa=${codEmpresa} | codFuncionario=${codFuncionario} | sequencial=${sequencial}`);

    const medicoFormatado = normalizeSoapScalar(medico);
    const sequencialFormatado = normalizeSoapScalar(sequencial);
    console.log(`[WS] DEBUG medicoFormatado="${medicoFormatado}"`);

    const header = new WSSecurity(user, pass, 'PasswordDigest')

    const xml =
        `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://services.soc.age.com/">
            <soapenv:Header>
                ${header.toXML()}
            </soapenv:Header>
            <soapenv:Body>
                <ser:incluiDadosAso>
                    <aso>
                        <codigoEmpresa>${codEmpresa}</codigoEmpresa>
                        <codigoFuncionario>${codFuncionario}</codigoFuncionario>
                        <codigoPessoaEmissorAso>${medicoFormatado}</codigoPessoaEmissorAso>
                        <codigoSequencialFichaclinica>${sequencialFormatado}</codigoSequencialFichaclinica>
                        ${handleCertificateObservation(parecer, observacoesParecer)}
                        <conselhoClasse></conselhoClasse>
                        <dataEmissaoAso>${dataFicha ?? new Date().toLocaleDateString("pt-BR")}</dataEmissaoAso>
                        <dataFicha></dataFicha>
                        <especialidade></especialidade>
                        
                        <identificacaoWsVo>
                            <chaveAcesso>${pass}</chaveAcesso>
                            <codigoEmpresaPrincipal>${codPrincipal}</codigoEmpresaPrincipal>
                            <codigoResponsavel>${codResponsavel}</codigoResponsavel>
                            <homologacao></homologacao>
                            <codigoUsuario>${codUsuario}</codigoUsuario>
                        </identificacaoWsVo>

                        <imprimeAsoComExamesNaoPertencentesaFicha>true</imprimeAsoComExamesNaoPertencentesaFicha>
                        <inativaFunconarioExameDemissional>true</inativaFunconarioExameDemissional>

                        <medicoAsoEResponsavelPelaFicha>true</medicoAsoEResponsavelPelaFicha>
                        <nomeMedicoEmissorAso></nomeMedicoEmissorAso>
                        
                        <parecerAso>${mapParecerAsoParaSoc(parecer)}</parecerAso>
                        <parecerTrabalhoEmAltura>${mapParecerParaSoc(alturaParecer, ALTURA_MAP)}</parecerTrabalhoEmAltura>
                        <parecerTrabalhoEspacoConfinado>${mapParecerParaSoc(confinadoParecer, CONFINADO_MAP)}</parecerTrabalhoEspacoConfinado>
                        <telefoneResponsavelAso></telefoneResponsavelAso>
                        <textoLivreValidade></textoLivreValidade>
                        <tipoeExame></tipoeExame>
                        
                        <UFConselho></UFConselho>
                        <desconsideraAsoEsocial>false</desconsideraAsoEsocial>
                    </aso>
                </ser:incluiDadosAso>
            </soapenv:Body>
        </soapenv:Envelope>`


    const options = {
        headers: {
            'Content-Type': 'text/xml, charset=utf-8;',
        }
    }


    try {
        const response = await axios.post(URL, xml, options);

        console.log('STATUS:', response.status);
        console.log('SOAP RESPONSE:', response.data);

        return response.data;
    } catch (err: any) {
        console.error('Erro WsResultadoExameAso');

        if (err.response) {
            console.error('STATUS:', err.response.status);
            console.error('BODY:', err.response.data);

            const soapFault = extractSoapFaultMessage(err.response.data);
            if (soapFault) {
                const enrichedError = new Error(
                    `SOC SOAP Fault: ${soapFault}`,
                );
                (enrichedError as any).soapFault = soapFault;
                (enrichedError as any).httpStatus = err.response.status;
                throw enrichedError;
            }
        } else {
            console.error(err.message);
        }

        throw err;
    }

}



