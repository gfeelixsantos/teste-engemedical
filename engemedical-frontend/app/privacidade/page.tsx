import { Shield, Mail, FileText, Lock, UserX, Eye, Download, ExternalLink } from "lucide-react";

const versao = "1.0";
const dataAtualizacao = "28 de maio de 2026";

const sections = [
  {
    icon: Shield,
    title: "1. Quem é o Controlador",
    content: (
      <>
        <p className="mb-2">
          <strong>CMSO360 - Saúde Ocupacional</strong> é o controlador dos dados
          pessoais tratados nesta plataforma, conforme definido pelo Art. 5º, VI da LGPD.
        </p>
        <p>
          O sistema é operado por profissionais de saúde ocupacional habilitados,
          sob responsabilidade técnica do médico do trabalho coordenador do PCMSO.
        </p>
      </>
    ),
  },
  {
    icon: FileText,
    title: "2. Dados Coletados e Finalidade",
    content: (
      <>
        <p className="mb-2">Coletamos os seguintes dados pessoais:</p>
        <ul className="list-disc pl-5 space-y-1 mb-3">
          <li><strong>Dados Cadastrais:</strong> nome, CPF, RG, data de nascimento, filiação, telefone, e-mail, endereço</li>
          <li><strong>Dados Profissionais:</strong> cargo, função, setor, empresa empregadora, número de registro profissional (conselho)</li>
          <li><strong>Dados de Saúde:</strong> histórico ocupacional, exames admissionais/periódicos/demissionais, atestados de saúde ocupacional (ASO), resultados de exames clínicos e complementares</li>
          <li><strong>Dados Biométricos:</strong> impressão digital (template criptografado AES-256-GCM) para autenticação em atendimento</li>
          <li><strong>Dados Faciais:</strong> fotografia para validação de identidade em atendimento</li>
          <li><strong>Dados de Acesso:</strong> logs de autenticação, endereço IP, user-agent, data/hora de acesso</li>
        </ul>
        <p className="mb-2"><strong>Finalidades:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Cumprimento de obrigação legal e regulatória (NR-7, CLT Art. 168, CFM Resolução 1.821/2007)</li>
          <li>Execução de contrato de trabalho (gestão de saúde ocupacional)</li>
          <li>Exercício regular de direitos (proteção à saúde do trabalhador)</li>
          <li>Registro de prontuário ocupacional com guarda legal de 20 anos</li>
        </ul>
      </>
    ),
  },
  {
    icon: Lock,
    title: "3. Base Legal para Tratamento",
    content: (
      <>
        <p className="mb-2">O tratamento de dados ocorre com base nos seguintes fundamentos legais (LGPD Art. 7º e 11):</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Cumprimento de obrigação legal ou regulatória (Art. 7º, II e Art. 11, II, a):</strong> para atendimento às normas regulamentadoras do Ministério do Trabalho</li>
          <li><strong>Execução de contrato (Art. 7º, V):</strong> gestão de exames ocupacionais no vínculo empregatício</li>
           <li><strong>Proteção da saúde (Art. 11, II, f):</strong> procedimentos realizados por profissionais de saúde</li>
           <li><strong>Cumprimento de obrigação legal / proteção da saúde (Art. 11, II, "a" e "c"):</strong> dados biométricos e faciais para autenticação e rastreabilidade do atendimento ocupacional, registrados em termo de ciência e aceite operacional</li>
           <li><strong>Exercício regular de direitos em processo judicial ou administrativo (Art. 7º, VI)</strong></li>
        </ul>
      </>
    ),
  },
  {
    icon: Eye,
    title: "4. Compartilhamento de Dados",
    content: (
      <>
        <p className="mb-2">Seus dados podem ser compartilhados com:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>SOC (Sistema On-line Corporativo):</strong> sistema legado de gestão ocupacional para integração de dados cadastrais e de exames</li>
          <li><strong>Supabase (Provedor de Banco de Dados):</strong> plataforma de banco de dados PostgreSQL com criptografia em repouso e em trânsito</li>
          <li><strong>Azure (Microsoft):</strong> armazenamento de documentos PDF (ASOs, exames, termos) e filas de processamento assíncrono</li>
          <li><strong>BRy / PSC:</strong> provedor de assinatura digital com certificado ICP-Brasil para validação de ASOs</li>
          <li><strong>Autoridades competentes:</strong> mediante requisição legal ou judicial</li>
        </ul>
        <p className="mt-3 text-sm text-gray-500">
          Todos os operadores contratados possuem cláusulas contratuais de proteção de dados
          e estão sujeitos às instruções do controlador.
        </p>
      </>
    ),
  },
  {
    icon: UserX,
    title: "5. Direitos do Titular (LGPD Art. 18)",
    content: (
      <>
        <p className="mb-2">Você possui os seguintes direitos, exercíveis a qualquer momento:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Confirmação e Acesso (incisos I e II):</strong> saber se tratamos seus dados e acessá-los</li>
          <li><strong>Correção (inciso III):</strong> retificar dados incompletos, inexatos ou desatualizados</li>
          <li><strong>Anonimização, bloqueio ou eliminação (inciso IV):</strong> solicitar anonimização de dados desnecessários ou tratados em desconformidade</li>
          <li><strong>Portabilidade (inciso V):</strong> solicitar cópia dos dados em formato estruturado (mediante viabilidade técnica)</li>
          <li><strong>Eliminação (inciso VI):</strong> solicitar exclusão de dados pessoais tratados com base no consentimento, respeitadas as hipóteses de guarda legal</li>
          <li><strong>Informação sobre compartilhamento (inciso VII):</strong> saber com quais entidades seus dados foram compartilhados</li>
          <li><strong>Revogação do consentimento (inciso VIII):</strong> retirar o consentimento a qualquer tempo, sem prejuízo da legalidade do tratamento anterior</li>
          <li><strong>Oposição (Art. 18, §2º):</strong> opor-se ao tratamento realizado com base em outras hipóteses legais</li>
        </ul>
        <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-md text-sm text-orange-800">
          <strong>Atenção:</strong> dados de saúde ocupacional possuem guarda legal obrigatória de 20 anos
          (CFM Resolução 1.821/2007). A solicitação de eliminação será aplicada apenas aos dados
          administrativos que não possuam obrigação legal de retenção.
        </div>
      </>
    ),
  },
  {
    icon: Download,
    title: "6. Medidas de Segurança",
    content: (
      <>
        <ul className="list-disc pl-5 space-y-1">
          <li>Criptografia em repouso (AES-256) para dados sensíveis e templates biométricos</li>
          <li>Criptografia em trânsito (TLS 1.2+) para todas as comunicações</li>
          <li>Autenticação multifator e controle de acesso baseado em perfil (RBAC)</li>
          <li>Registro de auditoria (logs de acesso imutáveis e anexos)</li>
          <li>Anonimização de dados pessoais sem prejuízo de integridade referencial</li>
          <li>Política de senhas fortes com hash bcrypt</li>
          <li>Snapshots sanitizados antes de exclusão física</li>
        </ul>
      </>
    ),
  },
  {
    icon: Mail,
    title: "7. Encarregado (DPO)",
    content: (
      <>
        <p className="mb-2">
          O encarregado pelo tratamento de dados pessoais (Data Protection Officer),
          conforme Art. 41 da LGPD, pode ser contatado:
        </p>
        <div className="bg-gray-50 p-4 rounded-md space-y-2 mt-3">
          <p><strong>E-mail:</strong> <a href="mailto:tecnologia@cmsocupacional.com.br" className="text-blue-600 hover:underline">tecnologia@cmsocupacional.com.br</a></p>
          <p><strong>Telefone / WhatsApp:</strong> (19) 3525-6269</p>
          <p><strong>Endereço:</strong> Rua Dois, 635 - Saúde - Rio Claro/SP - CEP 13500-312</p>
          <p className="text-sm text-gray-500">Horário de atendimento: Segunda a Sexta, 07:30h às 17h</p>
        </div>
      </>
    ),
  },
];

export default function PrivacidadePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-2">
            <Shield size={32} className="text-[#44735e]" />
            <h1 className="text-2xl font-bold text-gray-900">
              Política de Privacidade
            </h1>
          </div>
          <p className="text-sm text-gray-500">
            Versão {versao} &mdash; Atualizada em {dataAtualizacao}
          </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <p className="text-gray-600 leading-relaxed">
          Esta Política de Privacidade descreve como o CMSO360 - Saúde Ocupacional
          coleta, usa, armazena e protege os dados pessoais dos usuários da plataforma,
          em conformidade com a Lei Geral de Proteção de Dados Pessoais (LGPD - Lei nº
          13.709/2018) e as resoluções do Conselho Federal de Medicina e do Ministério
          do Trabalho aplicáveis à saúde ocupacional.
        </p>

        {sections.map((section) => (
          <div
            key={section.title}
            className="bg-white rounded-lg border border-gray-200 shadow-sm p-6"
          >
            <div className="flex items-start gap-4">
              <div className="mt-1 flex-shrink-0">
                <section.icon size={24} className="text-[#44735e]" />
              </div>
              <div className="flex-1 text-gray-700 leading-relaxed text-sm space-y-2">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">
                  {section.title}
                </h2>
                {section.content}
              </div>
            </div>
          </div>
        ))}

        <div className="bg-gray-100 rounded-lg border border-gray-200 p-6">
          <div className="flex items-start gap-4">
            <ExternalLink size={24} className="text-[#44735e] mt-1 flex-shrink-0" />
            <div className="text-sm text-gray-600 space-y-2">
              <h2 className="text-lg font-semibold text-gray-900">
                8. Atualizações e Vigência
              </h2>
              <p>
                Esta política entra em vigor em {dataAtualizacao}. Em caso de alterações
                significativas, os usuários serão notificados e será solicitado novo
                consentimento para a versão atualizada.
              </p>
              <p className="text-xs text-gray-400 mt-4">
                CMSO360 - Saúde Ocupacional v{versao} &mdash; {dataAtualizacao}
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
