import axios from "axios"
import fs from "fs-extra"
import path from "node:path"
import { AsoProcessingMessage } from "../../../web/types";


const WSSecurity = require ("wssecurity-soap");

const URL = "https://ws1.soc.com.br/WSSoc/DownloadArquivosWs?wsdl"

export async function WsDownlaodArquivo(certificate: AsoProcessingMessage, pathSaveTerm: string): Promise<Buffer | null> {
    const user = process.env.SOCWS_USUARIO
    const pass = process.env.SOCWS_PASS
    const codPrincipal = process.env.SOCWS_EMPRESA_PRINCIPAL
    const codResponsavel = process.env.SOCWS_RESPONSAVEL
    const codUsuario = process.env.SOCWS_CODUSUARIO

    const { codEmpresa, socgedCode } = certificate


    const header = new WSSecurity(user, pass, 'PasswordDigest')

    const xml = 
        `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://services.soc.age.com/">
            <soapenv:Header>
                ${header.toXML()}
            </soapenv:Header>
            <soapenv:Body>
                <ser:downloadArquivosPorGed>
                    <downloadPorGed>
                        <identificacaoWsVo>
                            <codigoEmpresaPrincipal>${ codPrincipal }</codigoEmpresaPrincipal>
                            <codigoResponsavel>${ codResponsavel }</codigoResponsavel>
                            <codigoUsuario>${ codUsuario }</codigoUsuario>
                        </identificacaoWsVo>
                        <codigoEmpresa>${ codEmpresa }</codigoEmpresa>
                        <codigoGed>${ socgedCode }</codigoGed>
                    </downloadPorGed>
                </ser:downloadArquivosPorGed>
            </soapenv:Body>
        </soapenv:Envelope>`

    const options = {
        headers: { 
            'Content-Type': 'text/xml, charset=utf-8;',
        },
        responseType: 'arraybuffer'
    }
    
                                                    // @ts-ignore
    const axiosResponse = await axios.post(URL, xml, options)

    if(axiosResponse.status == 200)
    {
        const buffer = Buffer.from(axiosResponse.data)
        fs.outputFileSync(pathSaveTerm, axiosResponse.data)

        return buffer
        
    }
    
    return null
}