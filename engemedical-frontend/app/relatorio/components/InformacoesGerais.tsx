import { Divider, Input } from "@heroui/react";
import { Building, Calendar, User } from "lucide-react";
import React, { useState } from "react";

import AtendimentoStatusCard from "@/app/relatorio/components/AtendimentoStatusCard";
import {
  MongoDateLike,
  Scheduling,
} from "@/lib/scheduling/interface/scheduling";
import {
  getAsoStatusLabel,
  getSignatureStatusLabel,
  normalizeAsoStatus,
} from "@/lib/scheduling/status.helper";
import { formatCPF, getStatusColor } from "@/lib/utils";

// ============================================
// COMPONENTE: InformacoesGerais
// ============================================

export interface EditModeState {
  isEditing: boolean;
  editedData: Partial<Scheduling>;
}

const parseMongoDate = (value?: MongoDateLike): Date | null => {
  if (!value) return null;
  if (value instanceof Date)
    return Number.isNaN(value.getTime()) ? null : value;
  const dateValue = typeof value === "string" ? value : value.$date;
  const date = new Date(dateValue);

  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDateTime = (value?: MongoDateLike): string => {
  const parsedDate = parseMongoDate(value);

  if (!parsedDate) return "Nao informado";

  return parsedDate.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
};

const getAsoStatusColor = (status?: string | null) => {
  const normalizedStatus = normalizeAsoStatus(status);

  if (normalizedStatus === "LIBERADO") return "success";
  if (normalizedStatus === "FALHA") return "danger";
  if (normalizedStatus === "ASSINADO") return "primary";

  return "warning";
};

const formatStatusLabel = (status?: string | null): string => {
  if (!status) return "Nao informado";

  return status
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter: string) => letter.toUpperCase());
};

const getSignatureDisplayLabel = (
  provider?: string | null,
  status?: string | null,
): string => {
  if (provider === "PSC" || provider === "BRYKMS") return "DIGITAL";
  if (provider) return provider.replace(/_/g, " ").toUpperCase();
  if (status) return getSignatureStatusLabel(status).toUpperCase();

  return "Nao informado";
};

const InformacoesGerais: React.FC<{
  atendimento: Scheduling;
  editMode: EditModeState;
  onEditModeChange: (mode: EditModeState) => void;
  onSave: (data: Partial<Scheduling>) => Promise<void>;
}> = ({ atendimento, editMode, onEditModeChange, onSave }) => {
  const [isSaving, setIsSaving] = useState(false);

  const handleFieldChange = (field: keyof Scheduling, value: string) => {
    onEditModeChange({
      ...editMode,
      editedData: {
        ...editMode.editedData,
        [field]: value,
      },
    });
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await onSave(editMode.editedData);
      onEditModeChange({ isEditing: false, editedData: {} });
    } catch (error) {
      console.error("Erro ao salvar:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    onEditModeChange({ isEditing: false, editedData: {} });
  };

  const renderField = (
    field: keyof Scheduling,
    label: string,
    value: string,
  ) => {
    if (
      editMode.isEditing &&
      [
        "NOME",
        "CPFFUNCIONARIO",
        "DATANASCIMENTO",
        "MATRICULAFUNCIONARIO",
      ].includes(field)
    ) {
      return (
        <Input
          className="max-w-xs text-sm"
          placeholder={label}
          size="sm"
          value={(editMode.editedData[field] as string) || value}
          onChange={(e) => handleFieldChange(field, e.target.value)}
        />
      );
    }

    return <span className="text-sm text-gray-900 uppercase">{value || "Não informado"}</span>;
  };

  const hasAsoData = Boolean(
    atendimento.PARECERMEDICO || atendimento.MEDICO || atendimento.ASOINFO,
  );
  const parecerAso =
    atendimento.PARECERMEDICO?.replace(/_/g, " ") || "Não informado";
  const asoStatus = atendimento.ASOINFO?.status || atendimento.ASOSTATUS;
  const profissionalAso =
    atendimento.ASOINFO?.professional?.nome || atendimento.MEDICO;
  const statusAssinatura = atendimento.ASOINFO?.signature?.status;
  const providerAssinatura = atendimento.ASOINFO?.signature?.provider;
  const observacoesParecer = atendimento.ASOINFO?.observacoesParecer?.length
    ? atendimento.ASOINFO.observacoesParecer
    : atendimento.ASOINFO?.signature?.observacoesParecer || [];
  const hasAsoError = Boolean(
    atendimento.ASOINFO?.signature?.error || atendimento.ASOINFO?.error,
  );
  const atendimentoStatusLabel = formatStatusLabel(
    atendimento.ATENDIMENTOSTATUS,
  );
  const signatureLabel = getSignatureDisplayLabel(
    providerAssinatura,
    statusAssinatura,
  );
  const signatureDate = formatDateTime(
    atendimento.ASOINFO?.signature?.signedAt || atendimento.ASOINFO?.updatedAt,
  );
  const emailLabel = atendimento.ASOINFO?.emailSent ? "ENVIADO" : "NAO ENVIADO";
  const asoUrl = atendimento.ASOINFO?.url || atendimento.ASOINFO?.asoUrl;
  const validacaoUrl =
    atendimento.ASOINFO?.validacao || atendimento.ASOINFO?.validacaoUrl;
  const asoStatusLabel = (
    getAsoStatusLabel(asoStatus, asoUrl) || "Nao informado"
  ).toUpperCase();
  const asoStatusColor = getAsoStatusColor(asoStatus);
  const atendimentoStatusColor = getStatusColor(atendimento.ATENDIMENTOSTATUS);
  const asoErrorMessage =
    atendimento.ASOINFO?.signature?.error || atendimento.ASOINFO?.error;

  return (
    <div className="space-y-6">
      <div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-3">
            <h4 className="font-semibold text-sm text-gray-800 mb-2 flex items-center gap-2">
              <User size={16} />
              Dados do Paciente
            </h4>
            <div className="space-y-2 text-sm">
              <div>
                <label className="text-sm font-medium text-gray-500 block mb-1">
                  Nome
                </label>
                {renderField("NOME", "Nome", atendimento.NOME.toUpperCase())}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 block mb-1">
                  CPF
                </label>
                {renderField(
                  "CPFFUNCIONARIO",
                  "CPF",
                  formatCPF(atendimento.CPFFUNCIONARIO),
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 block mb-1">
                  Data Nascimento
                </label>
                {renderField(
                  "DATANASCIMENTO",
                  "Data Nascimento",
                  atendimento?.DATANASCIMENTO ?? "",
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 block mb-1">
                  Telefone
                </label>
                {renderField(
                  "TELEFONE",
                  "Telefone de Contato",
                  atendimento?.TELEFONE ?? "",
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 block mb-1">
                  Matrícula
                </label>
                {renderField(
                  "MATRICULAFUNCIONARIO",
                  "Registro eSocial",
                  atendimento?.MATRICULAFUNCIONARIO ?? "",
                )}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-sm text-gray-800 mb-2 flex items-center gap-2">
              <Building size={16} />
              Dados da Empresa
            </h4>
            <div className="space-y-2 text-sm">
              <div>
                <label className="text-sm font-medium text-gray-500 block mb-1">
                  Empresa
                </label>
                <span className="text-sm text-gray-900 uppercase">
                  {atendimento.NOMEEMPRESA || "Não informado"}
                </span>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 block mb-1">
                  CNPJ/CPF
                </label>
                <span className="text-sm text-gray-900 uppercase">
                  {atendimento.CNPJEMPRESA ||
                    atendimento.CPFEMPRESA ||
                    "Não informado"}
                </span>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 block mb-1">
                  Cargo
                </label>
                <span className="text-sm text-gray-900 uppercase">
                  {atendimento.NOMECARGO || "Não informado"}
                </span>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 block mb-1">
                  Setor
                </label>
                <span className="text-sm text-gray-900 uppercase">
                  {atendimento.NOMESETOR || "Não informado"}
                </span>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 block mb-1">
                  Unidade
                </label>
                <span className="text-sm text-gray-900 uppercase">
                  {atendimento.NOMEUNIDADE || "Não informado"}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-sm text-gray-800 mb-2 flex items-center gap-2">
              <Calendar size={16} />
              Agendamento
            </h4>
            <div className="space-y-2 text-sm">
              <div>
                <label className="text-sm font-medium text-gray-500 block mb-1">
                  Data e Hora
                </label>
                <span className="text-sm text-gray-900 uppercase">
                  {atendimento.TICKET
                    ? new Date(atendimento.TICKET?.emissao).toLocaleString(
                        "pt-BR",
                        {
                          timeZone: "America/Sao_Paulo",
                        },
                      )
                    : `${atendimento.DATAAGENDAMENTO}, ${atendimento.HORARIO}`}
                </span>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 block mb-1">
                  Tipo Exame
                </label>
                <span className="text-sm text-gray-900 uppercase">
                  {atendimento.TIPOEXAMENOME || "Não informado"}
                </span>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 block mb-1">
                  Unidade de Atendimento
                </label>
                <span className="text-sm text-gray-900 uppercase">
                  {atendimento.UNIDADEATENDIMENTO || "Não informado"}
                </span>
              </div>
              {atendimento.TICKET?.prefixo && (
                <div>
                  <label className="text-sm font-medium text-gray-500 block mb-1">
                    Senha
                  </label>
                  <span className="text-sm text-gray-900 uppercase">
                    {`${atendimento.TICKET?.prefixo}${atendimento.TICKET?.numero}` ||
                      "Não informado"}
                  </span>
                  <span className="text-sm text-gray-900 uppercase">
                    {atendimento.TICKET?.preferencialTipo}
                  </span>
                </div>
              )}
              {atendimento.TICKET?.atendente && (
                <div>
                  <label className="text-sm font-medium text-gray-500 block mb-1">
                    Atendente
                  </label>
                  <span className="text-sm text-gray-900 uppercase">
                    {atendimento.TICKET?.atendente || "Não informado"}
                  </span>
                </div>
              )}
              {atendimento.CLIENT && (
                <>
                  <div>
                    <label className="text-sm font-medium text-gray-500 block mb-1">
                      Cliente que Agendou
                    </label>
                    <span className="text-sm text-gray-900 uppercase">
                      {atendimento.CLIENT.Name || "Não informado"}
                    </span>
                  </div>
                  {atendimento.CLIENT.Email && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 block mb-1">
                        E-mail do Cliente
                      </label>
                      <span className="text-sm text-gray-900">
                        {atendimento.CLIENT.Email}
                      </span>
                    </div>
                  )}
                  {atendimento.CLIENT.Phone && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 block mb-1">
                        Telefone do Cliente
                      </label>
                      <span className="text-sm text-gray-900">
                        {atendimento.CLIENT.Phone}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <Divider className="my-6" />

        <AtendimentoStatusCard
          autenticacaoAtendimento={atendimento.AUTENTICACAOATENDIMENTO}
          asoErrorMessage={asoErrorMessage}
          asoStatusColor={asoStatusColor}
          asoStatusLabel={asoStatusLabel}
          asoUrl={asoUrl}
          atendimentoStatusColor={atendimentoStatusColor}
          atendimentoStatusLabel={atendimentoStatusLabel}
          emailLabel={emailLabel}
          employeeNome={atendimento.NOME}
          hasAsoData={hasAsoData}
          hasAsoError={hasAsoError}
          observacoesParecer={observacoesParecer}
          parecerAso={parecerAso.toUpperCase()}
          profissionalAso={profissionalAso}
          signatureDate={signatureDate}
          signatureLabel={signatureLabel}
          validacaoUrl={validacaoUrl}
          altura={atendimento.ALTURA_PARECER}
          confinado={atendimento.CONFINADO_PARECER}
        />

        {(atendimento.OBSERVACOES ||
          atendimento.ANOTACOES ||
          atendimento.RECOMENDACAOMEDICA) && (
          <>
            <Divider className="my-6" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {atendimento.OBSERVACOES && (
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-gray-600 mb-2">
                    Observações do Agendamento
                  </h4>
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <p className="text-xs text-gray-900 whitespace-pre-wrap">
                      {atendimento.OBSERVACOES}
                    </p>
                  </div>
                </div>
              )}

              {atendimento.ANOTACOES && (
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-gray-600 mb-2">
                    Anotações da Equipe
                  </h4>
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <p className="text-xs text-gray-900 whitespace-pre-wrap">
                      {atendimento.ANOTACOES}
                    </p>
                  </div>
                </div>
              )}

              {atendimento.RECOMENDACAOMEDICA && (
                <div className="md:col-span-2 space-y-3">
                  <h4 className="font-medium text-sm text-gray-600 mb-2">
                    Recomendação Médica
                  </h4>
                  <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                    <p className="text-sm text-red-900 font-bold whitespace-pre-wrap">
                      {atendimento.RECOMENDACAOMEDICA}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
      <Divider className="my-6" />
    </div>
  );
};

export default React.memo(InformacoesGerais);
