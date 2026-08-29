import { Card, Input } from "@heroui/react";
import { AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";

import { Scheduling } from "@/lib/scheduling/interface/scheduling";

interface HeaderExameProp {
  agendamento?: Scheduling;
  exame: string;
  formularioPreCarregado?: boolean;
}
export default function HeaderExame({
  agendamento,
  exame,
  formularioPreCarregado = false,
}: HeaderExameProp) {
  const [isKitCredenciada, setIsKitCredenciada] = useState(false);

  // Exibe mensagem de kit credenciada
  useEffect(() => {
    if (agendamento && agendamento.ASOSTATUS === "KIT_CREDENCIADA") {
      setIsKitCredenciada(true);
    }
  }, [agendamento, exame]);

  return (
    <div>
      {/* 1. Dados do Atendimento / Funcionário */}
      <Card
        className={`p-6 shadow-none border border-gray-200 bg-white w-full`}
      >
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
          <div className="text-center lg:text-left">
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
              {exame || "Exame Ocupacional"}
            </h1>
          </div>
          <div>
            <img src="/images/cmso_icone.png" width={80} />
          </div>
        </div>
        {/* Alerta para KIT_CREDENCIADA */}
        {isKitCredenciada && (
          <div className="p-5 m-4 shadow-md border border-amber-200 bg-amber-50">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-6 w-6 text-amber-600 mt-1" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-amber-800 mb-2">
                  Empresa com KIT Atendimento
                </h3>
                <p className="text-amber-700 text-sm leading-relaxed">
                  O preenchimento da documentação deverá ser feito manualmente
                  na documentação entregue pelo funcionário.
                </p>
                <div className="mt-3 p-3 bg-amber-100 rounded border border-amber-200">
                  <p className="text-amber-800 text-xs font-medium">
                    📝 <strong>Procedimento:</strong> Utilize os formulários
                    físicos fornecidos pela empresa credenciada para registrar
                    todas as informações do atendimento.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
        {formularioPreCarregado && (
          <div className="p-4 m-4 rounded-lg border border-blue-200 bg-blue-50 text-blue-800 text-sm">
            Formulario ja carregado com dados previamente registrados deste
            exame.
          </div>
        )}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold text-gray-600">
              Informações cadastrais
            </span>
          </div>
        </div>

        <div>
          {/* Dados Pessoais */}
          <div className="p-4 rounded-lg ">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome Completo
                </label>
                <Input
                  isReadOnly
                  className="bg-white border-gray-300"
                  value={agendamento?.NOME}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CPF
                </label>
                <Input
                  isReadOnly
                  className="bg-white border-gray-300"
                  placeholder="000.000.000-00"
                  value={agendamento?.CPFFUNCIONARIO}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data Nascimento
                </label>
                <Input
                  isReadOnly
                  className="bg-white border-gray-300"
                  placeholder="DD/MM/AAAA"
                  value={agendamento?.DATANASCIMENTO ?? ""}
                />
              </div>
            </div>
          </div>

          {/* Dados Profissionais */}
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cargo
                </label>
                <Input
                  isReadOnly
                  className="bg-white border-gray-300"
                  value={agendamento?.NOMECARGO}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Setor
                </label>
                <Input
                  isReadOnly
                  className="bg-white border-gray-300"
                  value={agendamento?.NOMESETOR}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Exame
                </label>
                <Input
                  isReadOnly
                  className="bg-white border-gray-300"
                  value={agendamento?.TIPOEXAMENOME}
                />
              </div>
            </div>
          </div>

          {/* Dados da Empresa */}
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Empresa
                </label>
                <Input
                  isReadOnly
                  className="bg-white border-gray-300"
                  value={agendamento?.NOMEEMPRESA}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CNPJ
                </label>
                <Input
                  isReadOnly
                  className="bg-white border-gray-300"
                  value={agendamento?.CNPJEMPRESA}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Unidade
                </label>
                <Input
                  isReadOnly
                  className="bg-white border-gray-300"
                  value={agendamento?.NOMEUNIDADE}
                />
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
