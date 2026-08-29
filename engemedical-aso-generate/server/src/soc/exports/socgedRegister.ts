
import { AsoProcessingMessage } from "../../web/types";
 
const CODIGOTERMOSOCGED = process.env.CODSOCGED_TERMO || 96


export async function socgedRegister(certificate: AsoProcessingMessage) {
    
    const url = `https://ws1.soc.com.br/WebSoc/exportadados?parametro={"empresa":"${certificate.codEmpresa.trim()}","codigo":"185018","chave":"1f08c325e1730380d6ab","tipoSaida":"json","tipoBusca":"1","sequencialFicha":"${certificate.sequencial.trim()}","cpfFuncionario":"","filtraPorTipoSocged":"true","codigoTipoSocged":"${CODIGOTERMOSOCGED}","dataInicio":"","dataFim":"","dataEmissaoInicio":"","dataEmissaoFim":""}`; 

    try {
        const response = await fetch(url)

        const responseBuff = await response.arrayBuffer()
        const responseDecode = new TextDecoder('iso-8859-1').decode(responseBuff)
        const socgedRegister = await JSON.parse(responseDecode)

        if(socgedRegister.length > 0)
        {
            return socgedRegister[ socgedRegister.length -1 ]["CD_GED"]
        } else {
            return
        }
        
    } catch (err) {
        throw new Error("Erro socgedRegister: " + err)
    }
}

export function convertExamType(stringNumber: string)
{
    switch (stringNumber) {
        case "1":
            return "Admissional"
        case "2":
            return "Periódico"
        case "3":
            return "Retorno ao Trabalho"
        case "4":
            return "Mudança de Risco"
        case "5":
            return "Demissional"
        default:
            return ""
    }
}

/*
Campos de saída:

- CD_EMPRESA: Tipo: numérico (8)
- CD_UNIDADE: Tipo: alfanumérico (20)
- CD_GED: Tipo: numérico (20)
- NM_GED: Tipo: alfanumérico (200)
- DT_VALIDADE: Tipo: data (10)
- DT_EMISSAO: Tipo: data (10)
- IC_CRIADO_SOCNET: Tipo: number (1)
- CD_FUNCIONARIO: Tipo: numérico (20)
- DATAFICHA: Tipo: data (10)
- TIPOFICHA: Tipo: numérico (8)
- CD_ARQUIVO_GED: Tipo: numérico (20)
- NM_ARQUIVOS_GED: Tipo: alfanumérico (200)
- ASSINADO_DIGITALMENTE: Tipo: number (1)
- CD_TIPO_GED: Tipo: numérico (8)
- SEQUENCIAL_FICHA: Tipo: numérico (20)
- NOME_FUNCIONARIO: Tipo: alfanumérico (120)
- CPF_FUNCIONARIO: Tipo: alfanumérico (19)
- MATRICULA_FUNCIONARIO: Tipo: alfanumérico (30)
- UNIDADE: Tipo: alfanumérico (130)
- DT_UPLOAD_ARQUIVO: Tipo: data (10)
- OBSERVACAO: Tipo: clob (3500)
- HR_UPLOAD_ARQUIVO: Tipo: alfanumérico (5)
*/
