import { FileText, UserCheck, Shield, Clock, Trash2, AlertTriangle, Scale, Mail, ExternalLink } from "lucide-react";

const versao = "1.0";
const dataAtualizacao = "19 de junho de 2026";

const sections = [
  {
    icon: FileText,
    title: "1. Objeto e Finalidade",
    content: (
      <>
        <p className="mb-2">
          O <strong>CMSO360</strong> é uma plataforma digital de gestão em saúde
          ocupacional, destinada ao registro, emissão e guarda de Atestados de
          Saúde Ocupacional (ASO), exames complementares, prontuários
          ocupacionais e documentos correlatos, em conformidade com o PCMSO
          (NR-7) e demais normas regulamentadoras do Ministério do Trabalho e
          Emprego.
        </p>
        <p>
          A plataforma opera sob a responsabilidade técnica da{" "}
          <strong>Centro Médico de Saúde Ocupacional S/S Ltda.</strong>, CNPJ
          06.900.766/0001-09, e tem como médica do trabalho responsável a Dra.{" "}
          <strong>Andrea Cristina Defina do Amaral (CRM 85318)</strong>.
        </p>
      </>
    ),
  },
  {
    icon: UserCheck,
    title: "2. Aceitação e Cadastro",
    content: (
      <>
        <p className="mb-2">
          Ao acessar e utilizar o CMSO360, o usuário declara estar ciente e de
          acordo com as condições previstas nestes Termos de Uso.
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            O cadastro é pessoal e intransferível, sendo vedado o
            compartilhamento de credenciais de acesso.
          </li>
          <li>
            O usuário é o único responsável pela veracidade dos dados
            informados no momento do registro.
          </li>
          <li>
            O sistema registra todas as operações realizadas para fins de
            auditoria, rastreabilidade e compliance (LGPD Art. 37).
          </li>
        </ul>
      </>
    ),
  },
  {
    icon: Shield,
    title: "3. Obrigações do Usuário",
    content: (
      <>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            Utilizar a plataforma exclusivamente para as finalidades de saúde
            ocupacional previstas nestes Termos.
          </li>
          <li>
            Manter a confidencialidade de sua senha e demais credenciais de
            acesso.
          </li>
          <li>
            Não praticar atos que comprometam a segurança, integridade ou
            disponibilidade do sistema.
          </li>
          <li>
            Comunicar imediatamente ao DPO qualquer uso não autorizado de sua
            conta.
          </li>
          <li>
            O uso inadequado, fraudulento ou em desacordo com a legislação
            vigente poderá resultar em bloqueio imediato do acesso, sem prejuízo
            das demais sanções legais cabíveis.
          </li>
        </ul>
      </>
    ),
  },
  {
    icon: Clock,
    title: "4. Guarda Legal e Retenção de Dados",
    content: (
      <>
        <p className="mb-2">
          Os prazos de guarda dos dados tratados na plataforma observam as
          seguintes disposições legais:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Prontuários ocupacionais e ASOs:</strong> 20 anos (NR-7,
            item 7.6.1; CFM Resolução 1.821/2007).
          </li>
          <li>
            <strong>Logs de acesso e auditoria:</strong> 2 anos (Marco Civil da
            Internet, Lei nº 12.965/2014, Art. 15).
          </li>
          <li>
            <strong>Termos de ciência e aceite:</strong> pelo prazo do
            prontuário correspondente.
          </li>
        </ul>
      </>
    ),
  },
  {
    icon: Trash2,
    title: "5. Exclusão e Cancelamento",
    content: (
      <>
        <p className="mb-2">
          O titular dos dados poderá solicitar a qualquer momento a exclusão de
          sua conta e dos dados pessoais tratados, ressalvadas as hipóteses de
          guarda legal obrigatória.
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            A solicitação deve ser encaminhada ao Encarregado (DPO) pelo e-mail{" "}
            <a
              href="mailto:tecnologia@cmsocupacional.com.br"
              className="text-blue-600 hover:underline"
            >
              tecnologia@cmsocupacional.com.br
            </a>
            .
          </li>
          <li>
            O prazo para processamento da solicitação é de até 30 (trinta) dias.
          </li>
          <li>
            Dados de saúde ocupacional com obrigação legal de retenção (20 anos)
            serão preservados, sendo excluídos apenas os dados administrativos
            sem obrigação de guarda.
          </li>
          <li>
            Após a exclusão, os dados remanescentes serão anonimizados sempre
            que possível.
          </li>
        </ul>
      </>
    ),
  },
  {
    icon: AlertTriangle,
    title: "6. Limitação de Responsabilidade",
    content: (
      <>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            O CMSO360 atua como plataforma de software, não se responsabilizando
            por atos ou omissões dos profissionais de saúde habilitados que
            utilizam o sistema.
          </li>
          <li>
            A responsabilidade técnica pelos atos médicos (emissão de ASOs,
            diagnósticos, exames) é exclusiva do profissional de saúde
            registrado no respectivo conselho profissional.
          </li>
          <li>
            A plataforma não se responsabiliza por danos decorrentes de caso
            fortuito, força maior, ou por atos de terceiros operadores (SOC,
            Supabase, Azure, BRy) contratados para a operação do sistema.
          </li>
          <li>
            A responsabilidade do CMSO360 fica limitada ao valor do serviço
            contratado, nos termos do Código de Defesa do Consumidor (Lei nº
            8.078/90) e do Código Civil Brasileiro.
          </li>
        </ul>
      </>
    ),
  },
  {
    icon: Scale,
    title: "7. Disposições Gerais",
    content: (
      <>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            Estes Termos de Uso regem-se pela legislação brasileira.
          </li>
          <li>
            Fica eleito o foro da Comarca de Rio Claro/SP para dirimir
            quaisquer controvérsias oriundas destes Termos.
          </li>
          <li>
            Alterações significativas nestes Termos serão comunicadas
            previamente aos usuários, podendo ser solicitado novo aceite.
          </li>
          <li>
            A versão atualizada destes Termos estará sempre disponível em{" "}
            <a
              href="/termos-de-uso"
              className="text-blue-600 hover:underline"
            >
              /termos-de-uso
            </a>
            .
          </li>
        </ul>
      </>
    ),
  },
  {
    icon: Mail,
    title: "8. Encarregado (DPO) e Contato",
    content: (
      <>
        <p className="mb-2">
          O encarregado pelo tratamento de dados pessoais (Data Protection
          Officer), conforme Art. 41 da LGPD, pode ser contatado para dúvidas,
          solicitações ou exercício de direitos:
        </p>
        <div className="bg-gray-50 p-4 rounded-md space-y-2 mt-3">
          <p>
            <strong>E-mail:</strong>{" "}
            <a
              href="mailto:tecnologia@cmsocupacional.com.br"
              className="text-blue-600 hover:underline"
            >
              tecnologia@cmsocupacional.com.br
            </a>
          </p>
          <p>
            <strong>Telefone / WhatsApp:</strong> (19) 3525-6269
          </p>
          <p>
            <strong>Endereço:</strong> Rua Dois, 635 - Saúde - Rio Claro/SP -
            CEP 13500-312
          </p>
          <p className="text-sm text-gray-500">
            Horário de atendimento: Segunda a Sexta, 07:30h às 17h
          </p>
        </div>
      </>
    ),
  },
];

export default function TermosDeUsoPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-2">
            <FileText size={32} className="text-[#44735e]" />
            <h1 className="text-2xl font-bold text-gray-900">
              Termos de Uso
            </h1>
          </div>
          <p className="text-sm text-gray-500">
            Versão {versao} &mdash; Atualizada em {dataAtualizacao}
          </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <p className="text-gray-600 leading-relaxed">
          Estes Termos de Uso regulam o acesso e a utilização da plataforma
          CMSO360 - Saúde Ocupacional por usuários autorizados, em
          conformidade com a Lei Geral de Proteção de Dados Pessoais (LGPD - Lei
          nº 13.709/2018), as normas regulamentadoras do Ministério do Trabalho
          e Emprego (NR-7 - PCMSO), a Consolidação das Leis do Trabalho (CLT
          Art. 168) e as resoluções do Conselho Federal de Medicina aplicáveis à
          saúde ocupacional.
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
                9. Atualizações e Vigência
              </h2>
              <p>
                Estes Termos entram em vigor em {dataAtualizacao}. Em caso de
                alterações significativas, os usuários serão notificados e será
                solicitado novo aceite para a versão atualizada.
              </p>
              <p className="text-xs text-gray-400 mt-4">
                Centro Médico de Saúde Ocupacional S/S Ltda. &mdash; CNPJ
                06.900.766/0001-09 &mdash; v{versao} &mdash;{" "}
                {dataAtualizacao}
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
