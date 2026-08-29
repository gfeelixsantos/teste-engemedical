// PainelDireita.tsx
"use client";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  memo,
  useRef,
} from "react";
import {
  addToast,
  Autocomplete,
  AutocompleteItem,
  AutocompleteSection,
  Button,
  Card,
  CardBody,
  Chip,
  Divider,
  Input,
  Select,
  SelectItem,
  SelectSection,
  Textarea,
  Alert,
  Accordion,
  AccordionItem,
  RadioGroup,
  Radio,
  Modal as HeroModal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Checkbox,
  CheckboxGroup,
  Spinner,
} from "@heroui/react";
import {
  ClipboardList,
  Eye,
  UserCheck,
  CheckCircle2,
  FileText,
  UserLock,
} from "lucide-react";

import { MedicalRecord } from "../page";

import { IUserInfo } from "@/lib/user/interfaces/IUser";
import {
  AtendimentoStatus,
  ParecerEspaçoConfinado,
  ParecerMedico,
  ParecerTrabalhoAltura,
} from "@/lib/scheduling/enum/scheduling.enum";
import {
  CODIGOS_ESPACO_CONFINADO,
  CODIGOS_RISCO_ALTURA,
  USER_PROFILE,
  NEST_URL,
} from "@/config/constants";
import { fetchRiscosConfig, IRiscoConfig } from "@/lib/riscos-config/services/riscos-config.service";
import {
  getRiskOpinionOptions,
  hasConfiguredRisk,
  parseSchedulingRisks,
} from "@/lib/riscos-config/utils";
import { RiscosAso } from "@/lib/scheduling/interface/scheduling";
import { addDaysToISODate, getBrazilDateISO } from "@/lib/utils";
import {
  fetchOrientacoesConfig,
  orientacoesFallbackWithIds,
  groupOrientacoesByCategoria,
  IOrientacaoConfig,
} from "@/lib/orientacoes-config/services/orientacoes-config.service";

// Hook para status de autenticação PSC
import { usePscAuthStatus } from "@/hooks/usePscAuthStatus";
import { PscProviderSelector } from "@/app/atendimento/components/PscProviderSelector";

/* ---------------------- Tipos ---------------------- */

enum LaudoTipo {
  RESTRICAO_TEMPORARIA = "RESTRICAO_TEMPORARIA",
}

type LaudoRestricaoData = {
  cid: string;
  descricaoCid: string;
  restricoes: string;
  periodoDias: number;
  dataInicio: string;
  dataFim: string;
  recomendacoes: string;
};

export type MedicalOpinionData = {
  opinionType: ParecerMedico | null;
  details?: string | null;
  laudoRestricao?: LaudoRestricaoData | null;
  altura?: ParecerTrabalhoAltura | null;
  confinado?: ParecerEspaçoConfinado | null;
  examesParaRepetir?: string[];
  isProgrammed?: boolean | null;
  orientacaoId?: string | null;
};

interface RightPanelProps {
  selectedRecord: MedicalRecord | null;
  setSelectedRecord: React.Dispatch<React.SetStateAction<MedicalRecord | null>>;
  currentPdfIndex: number;
  onPdfIndexChange: (index: number) => void;
  user: IUserInfo;
  onRecordUpdate: (record: MedicalRecord) => void;
}

/* ---------------------- Componentes Auxiliares Memoizados ---------------------- */

const ExameCard = memo(
  ({
    exame,
    isActive,
    hasPdf,
    onView,
  }: {
    exame: any;
    isActive: boolean;
    hasPdf: boolean;
    onView: () => void;
  }) => {
    const data = exame?.dataExame
      ? new Date(exame.dataExame).toLocaleDateString("pt-BR")
      : "N/A";
    const hora = exame?.dataExame
      ? new Date(exame.dataExame).toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "";

    return (
      <tr
        className={`transition-all border-b border-default-200 ${
          isActive ? "bg-primary-50" : "hover:bg-default-50"
        }`}
      >
        <td className="p-2 text-default-800">
          <div className="flex flex-col">
            <span className="font-medium truncate text-xs sm:text-sm">
              {exame.grupo}
            </span>
            {isActive && (
              <Chip
                className="mt-1 w-fit"
                color="primary"
                size="sm"
                variant="flat"
              >
                Visualizando
              </Chip>
            )}
          </div>
        </td>
        <td className="p-2 text-default-600 whitespace-nowrap text-xs">
          {data} <br />
          <span className="text-[0.65rem]">{hora}</span>
        </td>
        <td className="p-2 text-center">
          {hasPdf && (
            <Button
              isIconOnly
              color="primary"
              size="sm"
              title="Visualizar PDF"
              variant={isActive ? "solid" : "ghost"}
              onPress={onView}
            >
              <Eye className="w-4 h-4" />
            </Button>
          )}
        </td>
      </tr>
    );
  },
);

ExameCard.displayName = "ExameCard";

const AnexoCard = memo(
  ({
    anexo,
    isActive,
    hasPdf,
    onView,
  }: {
    anexo: any;
    isActive: boolean;
    hasPdf: boolean;
    onView: () => void;
  }) => {
    const size =
      anexo?.Size != null
        ? anexo.Size > 1024 * 1024
          ? `${(anexo.Size / (1024 * 1024)).toFixed(1)} MB`
          : `${Math.round(anexo.Size / 1024)} KB`
        : "";

    return (
      <tr
        className={`transition-all border-b border-default-200 ${
          isActive ? "bg-primary-50" : "hover:bg-default-50"
        }`}
      >
        <td className="p-2 text-default-800 overflow-hidden">
          <div className="flex items-start gap-2">
            <FileText className="w-4 h-4 text-[#44735E] shrink-0 mt-0.5" />
            <div className="flex flex-col min-w-0 overflow-hidden">
              <span className="font-medium truncate text-xs sm:text-sm">
                {anexo.Name}
              </span>
              <div className="flex items-center gap-1.5">
                {size && (
                  <span className="text-[0.6rem] text-default-400">{size}</span>
                )}
                {isActive && (
                  <Chip
                    className="w-fit bg-blue-600 text-white"
                    size="sm"
                    variant="flat"
                  >
                    Visualizando
                  </Chip>
                )}
              </div>
            </div>
          </div>
        </td>
        <td className="p-2 text-center">
          {hasPdf && (
            <Button
              isIconOnly
              size="sm"
              title="Visualizar anexo"
              variant={isActive ? "solid" : "ghost"}
              className={isActive ? "bg-blue-600 text-white" : "text-blue-600 border-blue-300"}
              onPress={onView}
            >
              <Eye className="w-4 h-4" />
            </Button>
          )}
        </td>
      </tr>
    );
  },
);

AnexoCard.displayName = "AnexoCard";

/* ---------------------- Modal de Seleção de Exames ---------------------- */



/* ---------------------- Modal de Confirmação ---------------------- */

const ConfirmacaoParecerModal = memo(
  ({
    isOpen,
    onClose,
    onConfirm,
    opinion,
    isLoading,
    orientacoesCatalogo,
  }: {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    opinion: MedicalOpinionData;
    isLoading: boolean;
    orientacoesCatalogo: IOrientacaoConfig[] | null;
  }) => {
    return (
      <HeroModal
        backdrop="blur"
        hideCloseButton={isLoading}
        isDismissable={!isLoading}
        isOpen={isOpen}
        size="md"
        onClose={onClose}
      >
        <ModalContent>
          <ModalHeader>
            <h3 className="text-base sm:text-lg md:text-xl font-bold">
              Confirmar Parecer Médico
            </h3>
          </ModalHeader>
           <ModalBody>
            <div className="space-y-4">
              {opinion.isProgrammed === true &&
                (opinion.opinionType === ParecerMedico.APTO ||
                  opinion.opinionType ===
                    ParecerMedico.APTO_COM_ORIENTACAO) && (
                  <Alert
                    color="success"
                    title="Orientação Programada"
                    description="O ASO será enviado diretamente ao e-mail do cliente."
                    classNames={{
                      base: "border border-success-200 bg-success-50/50 rounded-lg py-2 px-3",
                      title: "text-success-800 font-semibold text-xs",
                      description: "text-success-600 text-xs",
                    }}
                  />
                )}
               <Card className="border border-default-200">
                <CardBody className="p-4 space-y-3">
                  <div>
                    <p className="text-xs text-default-500">
                      Parecer Principal:
                    </p>
                    <p className="text-sm font-semibold text-foreground">
                      {opinion.opinionType?.replace(/_/g, " ")}
                    </p>
                  </div>

                  {opinion.details && (
                    <div>
                      <p className="text-xs text-default-500">
                        Justificativa / Orientação:
                      </p>
                      <p className="text-sm font-semibold text-foreground break-words">
                        {opinion.details}
                      </p>
                    </div>
                  )}

                  {opinion.altura && (
                    <div>
                      <p className="text-xs text-default-500">
                        Trabalho em Altura:
                      </p>
                      <p className="text-sm font-semibold text-foreground">
                        {opinion.altura}
                      </p>
                    </div>
                  )}

                  {opinion.confinado && (
                    <div>
                      <p className="text-xs text-default-500">
                        Espaço Confinado:
                      </p>
                      <p className="text-sm font-semibold text-foreground">
                        {opinion.confinado}
                      </p>
                    </div>
                  )}

                  {opinion.examesParaRepetir &&
                    opinion.examesParaRepetir.length > 0 && (
                      <div>
                        <p className="text-xs text-default-500 mb-2">
                          Exames para Repetição (
                          {opinion.examesParaRepetir.length}):
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {opinion.examesParaRepetir.map((exame) => (
                            <Chip
                              key={exame}
                              color="warning"
                              size="sm"
                              variant="flat"
                            >
                              {exame}
                            </Chip>
                          ))}
                        </div>
                      </div>
                    )}

                  {(opinion.laudoRestricao) && (
                    <div>
                      <p className="text-xs text-default-500 mb-2">
                        Laudos Emitidos:
                      </p>
                      <div className="space-y-1">
                        {opinion.laudoRestricao && (
                          <Chip color="warning" size="sm" variant="flat">
                            Restrição Temporária - CID:{" "}
                            {opinion.laudoRestricao.cid}
                          </Chip>
                        )}
                      </div>
                    </div>
                  )}
                </CardBody>
              </Card>

              {/* Resumo de Fluxo - ASO e Email */}
              {(() => {
                const isInapto =
                  opinion.opinionType === ParecerMedico.INAPTO;
                const isInaptoTemporariamente =
                  opinion.opinionType ===
                  ParecerMedico.INAPTO_TEMPORARIAMENTE;
                const naoGeraAso = isInapto || isInaptoTemporariamente;

                const orientacaoSelecionada = opinion.orientacaoId
                  ? orientacoesCatalogo?.find(
                      (orientacao) =>
                        orientacao.id === opinion.orientacaoId,
                    )
                  : undefined;

                const hasDetalhes = Boolean(
                  opinion.details?.trim(),
                );

                // Espelha o roteamento do backend: libera_cliente da
                // orientação define isProgrammed; APTO livre sem detalhes
                // sempre libera o ASO ao cliente.
                const emailParaCliente =
                  !naoGeraAso &&
                  (opinion.opinionType === ParecerMedico.APTO
                    ? !hasDetalhes && !opinion.laudoRestricao
                    : orientacaoSelecionada
                      ? orientacaoSelecionada.libera_cliente
                      : opinion.isProgrammed === true);

                return (
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold text-default-600 uppercase">
                      Resumo
                    </h4>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-2 p-2 bg-default-50 rounded-lg">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            naoGeraAso ? "bg-danger" : "bg-success"
                          }`}
                        />
                        <div>
                          <p className="text-xs text-default-500">ASO</p>
                          <p className="text-xs font-medium text-foreground">
                            {naoGeraAso
                              ? "NÃO será gerado"
                              : "Será gerado e assinado"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 p-2 bg-default-50 rounded-lg">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            emailParaCliente ? "bg-success" : "bg-info"
                          }`}
                        />
                        <div>
                          <p className="text-xs text-default-500">
                            Email
                          </p>
                          <p className="text-xs font-medium text-foreground">
                            {emailParaCliente
                              ? "ASO Liberado (cliente)"
                              : "Parecer Médico (interno)"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {naoGeraAso && (
                      <Alert
                        color="warning"
                        description={
                          isInapto
                            ? "Parecer INAPTO — ASO não será gerado. Email de PARECER_MEDICO será enviado para a equipe interna."
                            : "Parecer INAPTO TEMPORARIAMENTE — ASO não será gerado. Email de PARECER_MEDICO será enviado para a equipe interna com as restrições."
                        }
                        hideIcon
                        classNames={{
                          base: "border border-warning-200 bg-warning-50",
                        }}
                      />
                    )}
                  </div>
                );
              })()}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button
              isDisabled={isLoading}
              size="sm"
              variant="light"
              onPress={onClose}
            >
              Cancelar
            </Button>
            <Button
              className="text-white font-bold"
              color="success"
              isLoading={isLoading}
              size="sm"
              startContent={!isLoading && <CheckCircle2 className="w-4 h-4" />}
              onPress={onConfirm}
            >
              {isLoading ? "Salvando..." : "Confirmar e Finalizar"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </HeroModal>
    );
  },
);

ConfirmacaoParecerModal.displayName = "ConfirmacaoParecerModal";

/* ---------------------- Tipos de Restrições (mesmo modelo da FichaClinicaOcupacional) ---------------------- */

interface RestricoesMedicas {
  evitarCarregarPeso: boolean;
  pesoMaximoKg?: string;
  evitarElevacaoBracos: boolean;
  tipoElevacaoBracos?: "direito" | "esquerdo" | "ambos";
  evitarCurvarTronco: boolean;
  evitarEscadas: boolean;
  evitarLongasCaminhadas: boolean;
  evitarAlterarPostura: boolean;
  outros: boolean;
  descricaoOutros?: string;
}

interface RestricaoFormData {
  cid: string;
  descricaoCid: string;
  duracaoRestricaoDias: string;
  dataInicioRestricao: string;
  observacoesMedicas: string;
  restricoes: RestricoesMedicas;
}

const RESTRICAO_INICIAL: RestricaoFormData = {
  cid: "",
  descricaoCid: "",
  duracaoRestricaoDias: "30",
  dataInicioRestricao: "",
  observacoesMedicas: "",
  restricoes: {
    evitarCarregarPeso: false,
    pesoMaximoKg: "",
    evitarElevacaoBracos: false,
    tipoElevacaoBracos: undefined,
    evitarCurvarTronco: false,
    evitarEscadas: false,
    evitarLongasCaminhadas: false,
    evitarAlterarPostura: false,
    outros: false,
    descricaoOutros: "",
  },
};

/* ---------------------- Modal de Laudos ---------------------- */

const LaudosModal = memo(
  ({
    isOpen,
    onClose,
    onSave,
  }: {
    isOpen: boolean;
    onClose: () => void;
    onSave: (tipo: LaudoTipo, data: any) => void;
  }) => {
    const [restricaoForm, setRestricaoForm] = useState<RestricaoFormData>(RESTRICAO_INICIAL);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    // Reset ao abrir
    useEffect(() => {
      if (isOpen) {
        setRestricaoForm(RESTRICAO_INICIAL);
        setFormErrors({});
      }
    }, [isOpen]);

    const handleRestricoesChange = useCallback((field: keyof RestricoesMedicas, value: any) => {
      setRestricaoForm((prev) => ({
        ...prev,
        restricoes: { ...prev.restricoes, [field]: value },
      }));
    }, []);

    const validateRestricao = useCallback((): boolean => {
      const errors: Record<string, string> = {};
      const dias = parseInt(restricaoForm.duracaoRestricaoDias, 10);
      if (!Number.isInteger(dias) || dias <= 0) {
        errors.duracaoRestricaoDias = "Duração deve ser um número inteiro positivo";
      }
      if (!restricaoForm.dataInicioRestricao) {
        errors.dataInicioRestricao = "Data de início é obrigatória";
      }
      setFormErrors(errors);
      return Object.keys(errors).length === 0;
    }, [restricaoForm]);

    const handleSave = useCallback(() => {
      if (!validateRestricao()) return;
      // Converte para o formato esperado pelo backend (LaudoRestricaoData)
      // e também mantém os campos estruturados para o worker gerar o PDF corretamente
      const payload = {
        cid: restricaoForm.cid,
        descricaoCid: restricaoForm.descricaoCid,
        periodoDias: parseInt(restricaoForm.duracaoRestricaoDias, 10),
        dataInicio: restricaoForm.dataInicioRestricao,
        dataFim: "",
        recomendacoes: restricaoForm.observacoesMedicas,
        // Campos estruturados para o template PDF do worker
        restricoes: restricaoForm.restricoes,
        duracaoRestricaoDias: restricaoForm.duracaoRestricaoDias,
        dataInicioRestricao: restricaoForm.dataInicioRestricao,
        observacoesMedicas: restricaoForm.observacoesMedicas,
      };
      onSave(LaudoTipo.RESTRICAO_TEMPORARIA, payload);
      onClose();
    }, [restricaoForm, validateRestricao, onSave, onClose]);

    return (
      <HeroModal
        backdrop="blur"
        classNames={{ base: "max-h-[95vh]" }}
        isOpen={isOpen}
        scrollBehavior="inside"
        size="3xl"
        onClose={onClose}
      >
        <ModalContent>
          <ModalHeader>
            <div className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              <h3 className="text-base sm:text-lg md:text-xl font-bold">
                Emitir Laudo de Restrição Temporária
              </h3>
            </div>
          </ModalHeader>
          <ModalBody>
            <div className="space-y-4 sm:space-y-6">
              <div className="space-y-4">
                {/* CID e Descrição */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="CID"
                    placeholder="Ex: M54.5"
                    size="sm"
                    value={restricaoForm.cid}
                    onValueChange={(v) => setRestricaoForm((p) => ({ ...p, cid: v }))}
                  />
                  <Input
                    label="Descrição do CID"
                    placeholder="Descrição da condição médica"
                    size="sm"
                    value={restricaoForm.descricaoCid}
                    onValueChange={(v) => setRestricaoForm((p) => ({ ...p, descricaoCid: v }))}
                  />
                </div>

                {/* Duração e Data Início */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Input
                      isInvalid={!!formErrors.duracaoRestricaoDias}
                      label="Duração (dias) *"
                      min={1}
                      size="sm"
                      type="number"
                      value={restricaoForm.duracaoRestricaoDias}
                      onValueChange={(v) => setRestricaoForm((p) => ({ ...p, duracaoRestricaoDias: v }))}
                    />
                    {formErrors.duracaoRestricaoDias && (
                      <p className="text-xs text-danger mt-1">{formErrors.duracaoRestricaoDias}</p>
                    )}
                  </div>
                  <div>
                    <Input
                      isInvalid={!!formErrors.dataInicioRestricao}
                      label="Data de Início *"
                      size="sm"
                      type="date"
                      value={restricaoForm.dataInicioRestricao}
                      onValueChange={(v) => setRestricaoForm((p) => ({ ...p, dataInicioRestricao: v }))}
                    />
                    {formErrors.dataInicioRestricao && (
                      <p className="text-xs text-danger mt-1">{formErrors.dataInicioRestricao}</p>
                    )}
                  </div>
                </div>

                {/* Restrições estruturadas — mesmo modelo da FichaClinicaOcupacional */}
                <div className="bg-amber-50 p-4 rounded-lg border border-amber-200 space-y-3">
                  <h3 className="text-sm font-semibold text-amber-800">Restrições Médicas</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

                    {/* Carregar peso */}
                    <div className="space-y-2">
                      <Checkbox
                        classNames={{ label: "text-sm font-medium text-gray-700" }}
                        color="danger"
                        isSelected={restricaoForm.restricoes.evitarCarregarPeso}
                        size="sm"
                        onValueChange={(v) => handleRestricoesChange("evitarCarregarPeso", v)}
                      >
                        Evitar carregar peso excessivo
                      </Checkbox>
                      {restricaoForm.restricoes.evitarCarregarPeso && (
                        <div className="ml-6">
                          <Input
                            className="w-32"
                            label="Peso máximo (kg)"
                            size="sm"
                            type="number"
                            value={restricaoForm.restricoes.pesoMaximoKg || ""}
                            onValueChange={(v) => handleRestricoesChange("pesoMaximoKg", v)}
                          />
                        </div>
                      )}
                    </div>

                    {/* Elevação dos braços */}
                    <div className="space-y-2">
                      <Checkbox
                        classNames={{ label: "text-sm font-medium text-gray-700" }}
                        color="danger"
                        isSelected={restricaoForm.restricoes.evitarElevacaoBracos}
                        size="sm"
                        onValueChange={(v) => handleRestricoesChange("evitarElevacaoBracos", v)}
                      >
                        Evitar elevação dos braços acima dos ombros
                      </Checkbox>
                      {restricaoForm.restricoes.evitarElevacaoBracos && (
                        <div className="ml-6 flex gap-3">
                          {(["direito", "esquerdo", "ambos"] as const).map((tipo) => (
                            <Checkbox
                              key={tipo}
                              classNames={{ label: "text-xs text-gray-700" }}
                              color="warning"
                              isSelected={restricaoForm.restricoes.tipoElevacaoBracos === tipo}
                              size="sm"
                              onValueChange={(v) => handleRestricoesChange("tipoElevacaoBracos", v ? tipo : undefined)}
                            >
                              {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
                            </Checkbox>
                          ))}
                        </div>
                      )}
                    </div>

                    <Checkbox
                      classNames={{ label: "text-sm font-medium text-gray-700" }}
                      color="danger"
                      isSelected={restricaoForm.restricoes.evitarCurvarTronco}
                      size="sm"
                      onValueChange={(v) => handleRestricoesChange("evitarCurvarTronco", v)}
                    >
                      Evitar curvar tronco com frequência
                    </Checkbox>

                    <Checkbox
                      classNames={{ label: "text-sm font-medium text-gray-700" }}
                      color="danger"
                      isSelected={restricaoForm.restricoes.evitarEscadas}
                      size="sm"
                      onValueChange={(v) => handleRestricoesChange("evitarEscadas", v)}
                    >
                      Evitar subir/descer escadas ou degraus
                    </Checkbox>

                    <Checkbox
                      classNames={{ label: "text-sm font-medium text-gray-700" }}
                      color="danger"
                      isSelected={restricaoForm.restricoes.evitarLongasCaminhadas}
                      size="sm"
                      onValueChange={(v) => handleRestricoesChange("evitarLongasCaminhadas", v)}
                    >
                      Evitar longas caminhadas
                    </Checkbox>

                    <Checkbox
                      classNames={{ label: "text-sm font-medium text-gray-700" }}
                      color="danger"
                      isSelected={restricaoForm.restricoes.evitarAlterarPostura}
                      size="sm"
                      onValueChange={(v) => handleRestricoesChange("evitarAlterarPostura", v)}
                    >
                      Evitar alterar postura sentado e em pé
                    </Checkbox>

                    {/* Outros */}
                    <div className="space-y-2">
                      <Checkbox
                        classNames={{ label: "text-sm font-medium text-gray-700" }}
                        color="danger"
                        isSelected={restricaoForm.restricoes.outros}
                        size="sm"
                        onValueChange={(v) => handleRestricoesChange("outros", v)}
                      >
                        Outros
                      </Checkbox>
                      {restricaoForm.restricoes.outros && (
                        <div className="ml-6">
                          <Input
                            label="Descrição"
                            size="sm"
                            value={restricaoForm.restricoes.descricaoOutros || ""}
                            onValueChange={(v) => handleRestricoesChange("descricaoOutros", v)}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Observações / Recomendações */}
                <Textarea
                  label="Observações / Recomendações"
                  placeholder="Recomendações e orientações para o período de restrição..."
                  rows={3}
                  size="sm"
                  value={restricaoForm.observacoesMedicas}
                  onValueChange={(v) => setRestricaoForm((p) => ({ ...p, observacoesMedicas: v }))}
                />
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button size="sm" variant="light" onPress={onClose}>
              Cancelar
            </Button>
            <Button color="primary" size="sm" onPress={handleSave}>
              Emitir Laudo
            </Button>
          </ModalFooter>
        </ModalContent>
      </HeroModal>
    );
  },
);

LaudosModal.displayName = "LaudosModal";

/* ---------------------- Componente Principal ---------------------- */

const PainelDireita: React.FC<RightPanelProps> = ({
  selectedRecord,
  setSelectedRecord,
  currentPdfIndex,
  onPdfIndexChange,
  user,
  onRecordUpdate,
}) => {
  /* ---------------------- Estados ---------------------- */

  const initialOpinion: MedicalOpinionData = {
    opinionType: null,
    details: "",
    laudoRestricao: null,
    altura: null,
    confinado: null,
    examesParaRepetir: [],
    isProgrammed: null,
    orientacaoId: null,
  };

  const [opinion, setOpinion] = useState<MedicalOpinionData>(initialOpinion);

  const [isSavingOpinion, setIsSavingOpinion] = useState(false);
  const [laudoModalOpen, setLaudoModalOpen] = useState(false);
  const [examesAccordionOpen, setExamesAccordionOpen] = useState<string[]>([]);
  const [confirmacaoModalOpen, setConfirmacaoModalOpen] = useState(false);

  /* ---------------------- Estados para Autenticação PSC ---------------------- */
  const {
    settings,
    pscAuthStatus,
    isLoading: isPscLoading,
    refetch: refetchPscStatus,
  } = usePscAuthStatus();

  const assinaDigitalmente = settings?.assinaDigitalmente ?? false;
  const [isProviderSelectorOpen, setIsProviderSelectorOpen] = useState(false);

  // Estados para gerenciar o popup de autenticação PSC
  const [isPscAuthenticating, setIsPscAuthenticating] = useState(false);
  const [modalPscAvisoOpen, setModalPscAvisoOpen] = useState(false);
  const [isWaitingForAuthToSave, setIsWaitingForAuthToSave] = useState(false);
  const [pscAuthWindowUrl, setPscAuthWindowUrl] = useState<string>("");
  const [riscosConfigs, setRiscosConfigs] = useState<IRiscoConfig[]>([]);
  const pscWindowRef = useRef<Window | null>(null);
  const pscPollingRef = useRef<NodeJS.Timeout | null>(null);
  const previousPscStatusRef = useRef(pscAuthStatus.status);

  // Limpar os intervalos ao sair
  useEffect(() => {
    return () => {
      if (pscPollingRef.current) clearInterval(pscPollingRef.current);
    };
  }, []);

  // Carregar configurações de risco da API
  useEffect(() => {
    fetchRiscosConfig()
      .then(setRiscosConfigs)
      .catch(() => setRiscosConfigs([]));
  }, []);

  // Carregar catálogo de orientações de parecer da API, com fallback embutido
  const [orientacoesCatalogo, setOrientacoesCatalogo] = useState<
    IOrientacaoConfig[] | null
  >(null);

  useEffect(() => {
    let active = true;
    fetchOrientacoesConfig()
      .then((data) => {
        if (!active) return;
        setOrientacoesCatalogo(
          data && data.length > 0 ? data : orientacoesFallbackWithIds(),
        );
      })
      .catch(() => {
        if (!active) return;
        setOrientacoesCatalogo(orientacoesFallbackWithIds());
      });
    return () => {
      active = false;
    };
  }, []);

  const orientacoesDisponiveis = useMemo(() => {
    const catalogo =
      orientacoesCatalogo ?? orientacoesFallbackWithIds();
    return groupOrientacoesByCategoria(
      catalogo.filter((o) => o.ativo),
    );
  }, [orientacoesCatalogo]);

  // Polling para detectar sucesso ou fechamento da janela
  useEffect(() => {
    if (isPscAuthenticating) {
      pscPollingRef.current = setInterval(async () => {
        // Checar se o popup foi fechado prematuramente
        if (pscWindowRef.current && pscWindowRef.current.closed) {
          if (pscPollingRef.current) clearInterval(pscPollingRef.current);
          setIsPscAuthenticating(false);
          addToast({
            title: "Autenticação Não Concluída",
            description:
              "A janela de autenticação foi fechada antes de concluir.",
            severity: "warning",
            color: "foreground",
            variant: "flat",
          });

          return;
        }

        // Tentar buscar novo status
        try {
          await refetchPscStatus();
        } catch (error) {
          console.error("[PSC Auth] Erro no polling de status:", error);
        }
      }, 3000);
    } else {
      if (pscPollingRef.current) clearInterval(pscPollingRef.current);
    }

    return () => {
      if (pscPollingRef.current) clearInterval(pscPollingRef.current);
    };
  }, [isPscAuthenticating, refetchPscStatus]);

  // Se o polling detectou o status ativo
  useEffect(() => {
    if (isPscAuthenticating && pscAuthStatus.isActive) {
      setIsPscAuthenticating(false);

      if (pscWindowRef.current && !pscWindowRef.current.closed) {
        pscWindowRef.current.close();
      }

      addToast({
        title: "Autenticação Realizada",
        description: "Assinatura digital habilitada com sucesso.",
        severity: "success",
        color: "foreground",
        variant: "flat",
      });

      // --- Se estava aguardando para salvar, continuar ---
      if (isWaitingForAuthToSave) {
        setIsWaitingForAuthToSave(false);
        // Abre a confirmação normalmente após autenticação bem-sucedida
        handleOpenConfirmacaoWithAuth();
      }
    }
  }, [pscAuthStatus.isActive, isPscAuthenticating, isWaitingForAuthToSave]);

  useEffect(() => {
    const previousStatus = previousPscStatusRef.current;
    const currentStatus = pscAuthStatus.status;

    if (previousStatus !== currentStatus && currentStatus === "EXPIRED") {
      addToast({
        title: "Sessão PSC expirada",
        description:
          "Sua autenticação de assinatura expirou. Reautentique-se para continuar salvando com assinatura digital.",
        severity: "warning",
        color: "foreground",
        variant: "flat",
      });
    }

    previousPscStatusRef.current = currentStatus;
  }, [pscAuthStatus.status]);

  /**
   * Inicia o processo de autenticação PSC
   */
  const handlePscAuth = async (provider?: string) => {
    console.log(
      `[PSC Auth] Iniciando com provedor: ${provider || "Nenhum/Padrão"}`,
    );
    try {
      if (!user) return;

      const payload = {
        user: user,
        provider: provider,
      };

      const safeNestUrl = NEST_URL || "";
      const baseUrl = safeNestUrl.endsWith("/")
        ? safeNestUrl.slice(0, -1)
        : safeNestUrl;
      const finalUrl = `${baseUrl}/psc/auth/start`;

      console.log(`[PSC Auth] URL chamada: ${finalUrl}`);
      console.log("[PSC Auth] Payload enviada:", JSON.stringify(payload));

      const response = await fetch(finalUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();

        console.error(
          `[PSC Auth] Falha HTTP Status ${response.status} na URL ${finalUrl}:`,
          errorText,
        );
        throw new Error(errorText || "Falha ao iniciar autenticação");
      }

      const data = await response.json();

      if (data.url) {
        console.log("[PSC Auth] Abrindo janela popup para URL retornada");

        setPscAuthWindowUrl(data.url);
        setIsPscAuthenticating(true);

        const width = 800;
        const height = 700;
        const left = window.screen.width
          ? (window.screen.width - width) / 2
          : 0;
        const top = window.screen.height
          ? (window.screen.height - height) / 2
          : 0;

        const newWindow = window.open(
          data.url,
          "psc_auth",
          `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=yes`,
        );

        if (newWindow) {
          pscWindowRef.current = newWindow;
          newWindow.focus();
        } else {
          console.warn("[PSC Auth] O navegador bloqueou o popup.");
        }
      } else {
        console.warn(
          "[PSC Auth] Callback bem sucedido mas sem URL de redirecionamento.",
        );
      }
    } catch (error: any) {
      console.error("[PSC Auth] Erro capturado:", error);
      addToast({
        title: "Erro de Autenticação",
        description: `Falha ao conectar com provedor: ${error.message || "Erro desconhecido"}`,
        severity: "danger",
        color: "foreground",
        variant: "flat",
      });
    }
  };

  /**
   * Função para lidar com clique no status PSC
   */
  const handlePscClick = () => {
    if (pscAuthStatus.status === "ACTIVE") {
      addToast({
        title: "Sessão Ativa",
        description: "Sua sessão com o provedor de assinatura já está ativa.",
        severity: "success",
        color: "foreground",
        variant: "flat",
      });

      return;
    }

    // Se for BRYKMS e estiver configurado, não faz nada (considerado autenticado)
    if (settings?.assinaturaProvider === "BRYKMS") {
      const isBryKmsConfigured =
        settings?.uuidCert && settings?.uuidCert.trim() !== "";

      if (isBryKmsConfigured) {
        addToast({
          title: "BRy Cloud Configurado",
          description:
            "Seu provedor BRy Cloud está configurado e pronto para uso.",
          severity: "success",
          color: "foreground",
          variant: "flat",
        });

        return;
      }
    }

    const defaultPscProvider = settings?.pscPadrao ?? settings?.provedorPadrao;

    if (defaultPscProvider) {
      handlePscAuth(defaultPscProvider);
    } else {
      setIsProviderSelectorOpen(true);
    }
  };

  /**
   * Função modificada para abrir confirmação com verificação de autenticação
   */
  const handleOpenConfirmacaoWithAuth = () => {
    if (!opinion || !opinion.opinionType) {
      addToast({
        variant: "solid",
        title: "Parecer incompleto",
        description: "Selecione um parecer médico antes de salvar.",
        color: "danger",
      });

      return;
    }

    if (
      opinionRequiresDetails(opinion) &&
      (!opinion.details || opinion.details.trim() === "")
    ) {
      addToast({
        variant: "solid",
        title: "Justificativa necessária",
        description:
          "Este parecer exige justificativa. Preencha o campo 'Detalhes' antes de salvar.",
        color: "danger",
      });

      return;
    }

    // APTO_COM_RESTRICAO requer laudo preenchido com periodoDias e dataInicio
    if (opinion.opinionType === ParecerMedico.APTO_COM_RESTRICAO) {
      if (!opinion.laudoRestricao || !opinion.laudoRestricao.dataInicio || opinion.laudoRestricao.periodoDias <= 0) {
        addToast({
          variant: "solid",
          title: "Laudo de restrição obrigatório",
          description: "Preencha o laudo de Restrição Temporária (CID, período e data de início) antes de salvar.",
          color: "danger",
        });
        setLaudoModalOpen(true);
        return;
      }
    }

    // Verifica se precisa de autenticação PSC
    let requiresPscAuth = false;

    if (assinaDigitalmente) {
      if (settings?.assinaturaProvider === "BRYKMS") {
        // Para BRYKMS, verifica se ID e PIN estão configurados
        const isBryKmsConfigured =
          settings?.uuidCert && settings?.uuidCert.trim() !== "";

        requiresPscAuth = !isBryKmsConfigured;
      } else {
        // Para PSC, verifica se tem sessão ativa
        requiresPscAuth = !pscAuthStatus.isActive;
      }
    }

    // Se precisa autenticar -> Abre Modal (apenas para PSC)
    if (requiresPscAuth && settings?.assinaturaProvider !== "BRYKMS") {
      setModalPscAvisoOpen(true);

      return;
    }

    // Se BRYKMS não está configurado, mostra alerta
    if (requiresPscAuth && settings?.assinaturaProvider === "BRYKMS") {
      addToast({
        title: "Configuração Necessária",
        description:
          "Para usar o provedor BRy Cloud, configure o ID Cert (UUID) e PIN nas configurações de assinatura digital.",
        severity: "warning",
        color: "foreground",
        variant: "flat",
      });

      return;
    }

    // Se passou por tudo, abre o modal de confirmação
    setConfirmacaoModalOpen(true);
  };

  /* ---------------------- Helpers ---------------------- */
  const todayIso = useCallback(() => getBrazilDateISO(), []);
  const calcularDataFim = useCallback((inicio: string, dias: number) => {
    return addDaysToISODate(inicio, dias);
  }, []);

  /* ---------------------- Dados Derivados ---------------------- */

  // exames com sala — depende explicitamente de EXAMES (defensivo)
  const examesComSala = useMemo(() => {
    return selectedRecord?.EXAMES ?? [];
  }, [selectedRecord?.EXAMES]);

  // normaliza a propriedade RISCOSASO como array seguro
  const riscos = useMemo(
    () => parseSchedulingRisks(selectedRecord?.RISCOSASO),
    [selectedRecord?.RISCOSASO],
  );

  const hasHeightRisk = useMemo(
    () =>
      hasConfiguredRisk(riscos, riscosConfigs, "ALTURA", CODIGOS_RISCO_ALTURA),
    [riscos, riscosConfigs],
  );

  const hasConfinedRisk = useMemo(
    () =>
      hasConfiguredRisk(
        riscos,
        riscosConfigs,
        "CONFINADO",
        CODIGOS_ESPACO_CONFINADO,
      ),
    [riscos, riscosConfigs],
  );

  const alturaParecerOpcoes = useMemo(
    () =>
      getRiskOpinionOptions(
        riscosConfigs,
        "ALTURA",
        Object.values(ParecerTrabalhoAltura),
      ),
    [riscosConfigs],
  );

  const confinadoParecerOpcoes = useMemo(
    () =>
      getRiskOpinionOptions(
        riscosConfigs,
        "CONFINADO",
        Object.values(ParecerEspaçoConfinado),
      ),
    [riscosConfigs],
  );

  const GRUPOS_ORDEM = [
    "FISICOS",
    "QUIMICOS",
    "BIOLOGICOS",
    "ERGONOMICOS",
    "ACIDENTES",
    "INESPECIFICOS",
  ];

  const agruparRiscos = (riscos: RiscosAso[]) => {
    const grupos = riscos.reduce(
      (acc, risco) => {
        if (!acc[risco.grupo]) acc[risco.grupo] = [];
        acc[risco.grupo].push(risco);
        return acc;
      },
      {} as Record<string, RiscosAso[]>,
    );

    // ordena os riscos dentro de cada grupo alfabeticamente
    for (const grupo of Object.keys(grupos)) {
      grupos[grupo].sort((a, b) => a.risco.localeCompare(b.risco));
    }

    // retorna na ordem definida
    return GRUPOS_ORDEM.filter((g) => grupos[g]).map(
      (g) => [g, grupos[g]] as [string, RiscosAso[]],
    );
  };

  const hasPdfForExame = useCallback(
    (exameGrupo: string) =>
      !!(selectedRecord?.pdfUrls ?? []).some(
        (p: any) => p.grupo === exameGrupo && p.type === "exame",
      ),
    [selectedRecord?.pdfUrls],
  );

  const hasPdfForAnexo = useCallback(
    (anexoTitle: string) =>
      !!(selectedRecord?.pdfUrls ?? []).some(
        (p: any) => p.title === anexoTitle && p.type === "anexo",
      ),
    [selectedRecord?.pdfUrls],
  );

  /* ---------------------- Lifecycle ---------------------- */

  // Ao trocar de prontuário, resetamos o opinion para garantir que não haja estado stale entre prontuários
  useEffect(() => {
    if (!selectedRecord) {
      setOpinion(initialOpinion);

      return;
    }
    setOpinion(initialOpinion);
  }, [selectedRecord]);

  /* ---------------------- Handlers ---------------------- */
  const selectPdfFromExame = useCallback(
    (exameGrupo: string) => {
      if (!selectedRecord) return;

      const pdfIndex = (selectedRecord.pdfUrls ?? []).findIndex(
        (pdf: any) => pdf.grupo === exameGrupo && pdf.type === "exame",
      );

      if (pdfIndex !== -1) {
        document.getElementById("pdf-viewer")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
          inline: "nearest",
        });
        onPdfIndexChange(pdfIndex);
      }
    },
    [onPdfIndexChange, selectedRecord?.pdfUrls],
  );

  const selectPdfFromAnexo = useCallback(
    (anexoTitle: string) => {
      if (!selectedRecord) return;

      const pdfIndex = (selectedRecord.pdfUrls ?? []).findIndex(
        (pdf: any) => pdf.title === anexoTitle && pdf.type === "anexo",
      );

      if (pdfIndex !== -1) {
        document.getElementById("pdf-viewer")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
          inline: "nearest",
        });
        onPdfIndexChange(pdfIndex);
      }
    },
    [onPdfIndexChange, selectedRecord?.pdfUrls],
  );

  const isExamBeingDisplayed = useCallback(
    (exameGrupo: string) => {
      const currentPdf = (selectedRecord?.pdfUrls ?? [])[currentPdfIndex];

      if (!currentPdf?.grupo) return false;

      return currentPdf.grupo === exameGrupo;
    },
    [currentPdfIndex, selectedRecord?.pdfUrls],
  );

  const isAnexoBeingDisplayed = useCallback(
    (anexoTitle: string) => {
      const currentPdf = (selectedRecord?.pdfUrls ?? [])[currentPdfIndex];

      if (!currentPdf || currentPdf.type !== "anexo") return false;

      return currentPdf.title === anexoTitle;
    },
    [currentPdfIndex, selectedRecord?.pdfUrls],
  );

  const opinionRequiresDetails = useCallback(
    (op: MedicalOpinionData | null) => {
      if (!op) return false;
      const mainRequires =
        !!op.opinionType &&
        [
          ParecerMedico.APTO_COM_ORIENTACAO,
          ParecerMedico.INAPTO,
          ParecerMedico.INAPTO_TEMPORARIAMENTE,
        ].includes(op.opinionType);
      const alturaInapto =
        op.altura === (ParecerTrabalhoAltura as any).INAPTO_ALTURA;
      const confinadoInapto =
        op.confinado === (ParecerEspaçoConfinado as any).INAPTO_CONFINADO;

      return Boolean(mainRequires || alturaInapto || confinadoInapto);
    },
    [],
  );

  const opinionHasInvalidAptoDetails = useCallback(
    (op: MedicalOpinionData | null) =>
      op?.opinionType === ParecerMedico.APTO &&
      Boolean(op.details && op.details.trim() !== "") &&
      op.isProgrammed !== true,
    [],
  );

  const handleOpenConfirmacao = useCallback(() => {
    if (!opinion || !opinion.opinionType) {
      addToast({
        variant: "solid",
        title: "Parecer incompleto",
        description: "Selecione um parecer médico antes de salvar.",
        color: "danger",
      });

      return;
    }

    if (
      opinionHasInvalidAptoDetails(opinion)
    ) {
      addToast({
        variant: "solid",
        title: "Parecer inconsistente",
        description:
          "Parecer APTO não pode conter texto. Use APTO COM ORIENTAÇÃO quando houver recomendação médica.",
        color: "danger",
      });

      return;
    }

    // APTO_COM_RESTRICAO requer laudo preenchido com periodoDias e dataInicio
    if (opinion.opinionType === ParecerMedico.APTO_COM_RESTRICAO) {
      if (!opinion.laudoRestricao || !opinion.laudoRestricao.dataInicio || opinion.laudoRestricao.periodoDias <= 0) {
        addToast({
          variant: "solid",
          title: "Laudo de restrição obrigatório",
          description: "Preencha o laudo de Restrição Temporária (CID, período e data de início) antes de salvar.",
          color: "danger",
        });
        setLaudoModalOpen(true);
        return;
      }
    }

    if (
      opinionRequiresDetails(opinion) &&
      (!opinion.details || opinion.details.trim() === "")
    ) {
      addToast({
        variant: "solid",
        title: "Justificativa necessária",
        description:
          "Este parecer exige justificativa. Preencha o campo 'Detalhes' antes de salvar.",
        color: "danger",
      });

      return;
    }

    setConfirmacaoModalOpen(true);
  }, [
    opinion,
    opinionHasInvalidAptoDetails,
    opinionRequiresDetails,
  ]);

  const saveOpinion = useCallback(async () => {
    if (!opinion || !opinion.opinionType || !selectedRecord) return;
    if (opinionHasInvalidAptoDetails(opinion)) {
      addToast({
        variant: "solid",
        title: "Parecer inconsistente",
        description:
          "Parecer APTO não pode conter texto. Use APTO COM ORIENTAÇÃO quando houver recomendação médica.",
        color: "danger",
      });

      return;
    }

    const pinFromSettings =
      typeof (settings as any)?.pin === "string"
        ? String((settings as any).pin).trim()
        : "";
    const credentials =
      settings?.assinaturaProvider === "BRYKMS" && pinFromSettings
        ? { pin: pinFromSettings }
        : undefined;

    setIsSavingOpinion(true);
    try {
      const response = await fetch("/api/schedulings/finish", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          scheduledId: selectedRecord._id,
          user: user,
          options: opinion,
          credentials,
        }),
      });

      if (!response.ok) {
        const err = await response.text();

        throw new Error(`Erro ao salvar parecer ${err}`);
      }

      // NÃO mutamos selectedRecord diretamente. Se for necessário atualizar, faça de forma imutável
      const updatedRecord = {
        ...selectedRecord,
        // se houve alterações retornadas do backend, aplique aqui (ex: status atualizado)
      };

      onRecordUpdate(updatedRecord);
      setOpinion(initialOpinion);
      setSelectedRecord(null);
      setConfirmacaoModalOpen(false);

      addToast({
        title: "Prontuário liberado",
        description: "Parecer médico salvo com sucesso.",
        color: "foreground",
      });
    } catch (err) {
      console.error(err);
      addToast({
        variant: "solid",
        title: "Erro ao finalizar prontuário",
        description:
          "Verifique detalhes no console, se o erro persistir contate o suporte.",
        color: "danger",
      });
    } finally {
      setIsSavingOpinion(false);
    }
  }, [
    opinion,
    opinionHasInvalidAptoDetails,
    onRecordUpdate,
    selectedRecord,
    user,
    setSelectedRecord,
  ]);

  const handleLimparParecer = useCallback(() => {
    setOpinion(initialOpinion);
  }, []);

  const riscoCor = useCallback((risco: any) => {
    // Aceita tanto formato textual (FISICOS) quanto numérico (1, 2, 3...)
    const grupo = String(risco);

    if (grupo === "FISICOS" || grupo === "1") return "text-green-600";
    if (grupo === "QUIMICOS" || grupo === "2") return "text-red-600";
    if (grupo === "BIOLOGICOS" || grupo === "3") return "text-amber-800";
    if (grupo === "ERGONOMICOS" || grupo === "4") return "text-amber-500";
    if (grupo === "ACIDENTES" || grupo === "5") return "text-blue-700";
    if (grupo === "INESPECIFICOS" || grupo === "6") return "text-purple-700";
    return "";
  }, []);

  /* ---------------------- Render ---------------------- */

  if (!selectedRecord) {
    return (
      <aside className="w-full sm:w-82 bg-content1 border-l border-divider flex-shrink-0 flex flex-col">
        <Card className="m-4">
          <CardBody className="text-center p-6">
            <p className="text-default-500 text-xs sm:text-sm">
              Selecione um prontuário para visualizar as opções.
            </p>
          </CardBody>
        </Card>
      </aside>
    );
  }

  const showDetailsField = opinionRequiresDetails(opinion);
  const normalizeStr = (s: string) =>
    s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
  const perfilNorm = normalizeStr(user.perfil);
  const isMedicoOrMaster =
    perfilNorm === normalizeStr(USER_PROFILE.MEDICO) ||
    perfilNorm === normalizeStr(USER_PROFILE.MASTER);
  const isAwaitingMedical =
    selectedRecord.ATENDIMENTOSTATUS === AtendimentoStatus.AVALIACAO_MEDICA;

  const hasPendentes =
    selectedRecord.EXAMES?.some(
      (e) => e.status === "PENDENTE",
    ) ?? false;

  const canFinish = isAwaitingMedical && opinion?.opinionType && !hasPendentes;

  return (
    <aside className="w-full sm:w-82 lg:w-[26rem] bg-content1 flex-shrink-0 flex flex-col overflow-y-auto">
      <div className="flex flex-col flex-1">
        {/* Informações do Paciente */}
        <div className="rounded-none">
          <div className="p-3 sm:p-4">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-lg font-bold text-foreground truncate">
                  {selectedRecord.NOME}
                </h3>
                <Chip className="mt-1" size="md" variant="flat">
                  {selectedRecord.TIPOEXAMENOME}
                </Chip>
                <div className="space-y-1 mt-2 text">
                  <div className="flex flex-col justify-between">
                    <Input
                      readOnly
                      className="text-xs text-default-600"
                      label="Cargo"
                      size="sm"
                      value={selectedRecord.NOMECARGO}
                      variant="underlined"
                    />
                    <Input
                      readOnly
                      className="text-xs text-default-600"
                      label="Setor/Unidade"
                      size="sm"
                      value={`${selectedRecord.NOMESETOR} - ${selectedRecord.NOMEUNIDADE}`}
                      variant="underlined"
                    />
                    <Input
                      readOnly
                      className="text-xs text-default-600"
                      label="Empresa"
                      size="sm"
                      value={selectedRecord.NOMEEMPRESA}
                      variant="underlined"
                    />
                  </div>

                  {riscos.length > 0 && (
                    <article className="mt-6" title="Riscos">
                      <div className="flex items-center gap-2 pb-2">
                        <h4 className="font-bold text-sm sm:text-base">
                          Riscos
                        </h4>
                      </div>

                      {agruparRiscos(riscos).map(
                        ([grupo, lista]) => (
                          <ul key={grupo} className="list-none pl-4 text-[0.65rem] sm:text-[0.7rem]">
                            {lista.map((risco, index) => (
                              <li
                                key={index}
                                className={`capitalize ${riscoCor(risco.grupo)}`}
                              >
                                {risco.risco}
                              </li>
                            ))}
                          </ul>
                        ),
                      )}
                    </article>
                  )}

                  {selectedRecord.OBSERVACOES && (
                    <Alert
                      className="text-[0.6rem] sm:text-[0.65rem]"
                      color="danger"
                      title="Observações cliente"
                      variant="flat"
                    >
                      {selectedRecord.OBSERVACOES}
                    </Alert>
                  )}
                  {selectedRecord.ANOTACOES && (
                    <Alert
                      className="text-[0.6rem] sm:text-[0.65rem]"
                      color="primary"
                      title="Anotações internas"
                      variant="flat"
                    >
                      {selectedRecord.ANOTACOES}
                    </Alert>
                  )}
                </div>
              </div>
            </div>
            <Divider className="mt-4" />

            {/* Lista de Exames */}
            {examesComSala.length > 0 && (
              <Accordion
                isCompact
                className="mt-2"
                selectedKeys={examesAccordionOpen}
                selectionMode="multiple"
                onSelectionChange={(keys) =>
                  setExamesAccordionOpen(Array.from(keys as Set<string>))
                }
              >
                <AccordionItem
                  key="exames"
                  aria-label="Exames Realizados"
                  title={
                    <div className="flex items-center gap-2 pb-2 hover:cursor-pointer">
                      <h4 className="font-bold text-sm sm:text-base">
                        Exames realizados:{" "}
                        {(selectedRecord.EXAMES ?? []).length}
                      </h4>
                    </div>
                  }
                >
                  <div className="overflow-x-auto p-1">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead className="sticky top-0 bg-default-100 z-10">
                        <tr className="text-default-700">
                          <th className="p-2 font-semibold w-[50%]">Exame</th>
                          <th className="p-2 font-semibold">Data/Hora</th>
                          <th className="p-2 font-semibold text-center w-[60px]">
                            Ver
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {examesComSala.map((exame: any) => (
                          <ExameCard
                            key={exame.codigoExame}
                            exame={exame}
                            hasPdf={hasPdfForExame(exame.grupo)}
                            isActive={isExamBeingDisplayed(exame.grupo)}
                            onView={() => selectPdfFromExame(exame.grupo)}
                          />
                        ))}
                      </tbody>
                      <footer>
                        <tr className="text-right">
                          <td>
                            {selectedRecord.TICKET?.emissao.toLocaleString(
                              "pt-BR",
                            )}
                          </td>
                        </tr>
                      </footer>
                    </table>
                  </div>

                  {selectedRecord.ANEXOS?.length > 0 && (
                    <div className="mt-4 px-1">
                      <Divider className="my-2" />
                      <h5 className="text-xs font-semibold text-default-600 mb-2">
                        Anexos ({selectedRecord.ANEXOS.length})
                      </h5>
                      <table className="w-full text-xs text-left border-collapse">
                        <thead className="sticky top-0 bg-default-100 z-10">
                          <tr className="text-default-700">
                            <th className="p-2 font-semibold w-[50%]">Arquivo</th>
                            <th className="p-2 font-semibold text-center w-[60px]">
                              Ver
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedRecord.ANEXOS.map((anexo: any) => (
                            <AnexoCard
                              key={anexo._id || anexo.Name}
                              anexo={anexo}
                              hasPdf={hasPdfForAnexo(anexo.Name)}
                              isActive={isAnexoBeingDisplayed(anexo.Name)}
                              onView={() => selectPdfFromAnexo(anexo.Name)}
                            />
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </AccordionItem>
              </Accordion>
            )}
          </div>
        </div>

        {/* Parecer Médico */}
        {isMedicoOrMaster && isAwaitingMedical && (
          <div className="flex-1 m-3 sm:m-4">
            <div className="space-y-3 sm:space-y-4 p-3 sm:p-4">
              <div className="flex items-center gap-2 pb-2">
                <h4 className="font-bold text-sm sm:text-base">
                  Parecer Médico
                </h4>
              </div>

              <Select
                classNames={{
                  label: "text-xs sm:text-sm",
                  value: "text-xs sm:text-sm",
                }}
                label="Tipo de Parecer"
                placeholder="Selecione o parecer"
                selectedKeys={opinion?.opinionType ? [opinion.opinionType] : []}
                size="sm"
                onSelectionChange={(keys) => {
                  const value = Array.from(keys)[0] as ParecerMedico;

                  setOpinion((prev) => ({
                    ...(prev || {}),
                    opinionType: value,
                    details:
                      value === ParecerMedico.APTO ? "" : (prev?.details ?? ""),
                    // Limpa laudoRestricao ao trocar para outro parecer que não seja APTO_COM_RESTRICAO
                    laudoRestricao:
                      value === ParecerMedico.APTO_COM_RESTRICAO
                        ? (prev?.laudoRestricao ?? null)
                        : null,
                  }));

                  // Abre o modal de laudo automaticamente ao selecionar APTO_COM_RESTRICAO
                  if (value === ParecerMedico.APTO_COM_RESTRICAO) {
                    setLaudoModalOpen(true);
                  }
                }}
              >
                <SelectItem key={ParecerMedico.APTO}>
                  {ParecerMedico.APTO}
                </SelectItem>
                <SelectItem key={ParecerMedico.APTO_COM_ORIENTACAO}>
                  {ParecerMedico.APTO_COM_ORIENTACAO.replace(/_/g, " ")}
                </SelectItem>
                <SelectItem key={ParecerMedico.APTO_COM_RESTRICAO}>
                  APTO COM RESTRIÇÃO TEMPORÁRIA
                </SelectItem>
                <SelectItem key={ParecerMedico.INAPTO}>
                  {ParecerMedico.INAPTO}
                </SelectItem>
                <SelectItem key={ParecerMedico.INAPTO_TEMPORARIAMENTE}>
                  {ParecerMedico.INAPTO_TEMPORARIAMENTE.replace(/_/g, " ")}
                </SelectItem>
              </Select>

              {/* Pareceres Complementares - Trabalho em altura e espaço confinado, exibidos se não for RT e DEM */}
              {(hasHeightRisk || hasConfinedRisk) &&
                selectedRecord.TIPOEXAME != "3" &&
                selectedRecord.TIPOEXAME != "5" &&
                selectedRecord.TIPOEXAME != "6" && (
                  <div className="space-y-3">
                    <Divider />
                    <p className="text-xs font-semibold text-default-600">
                      Pareceres Complementares
                    </p>

                    {hasHeightRisk && (
                      <Select
                        classNames={{
                          label: "text-xs",
                          value: "text-xs",
                        }}
                        label="Trabalho em Altura"
                        placeholder="Selecione o parecer"
                        selectedKeys={opinion?.altura ? [opinion.altura] : []}
                        size="sm"
                        onSelectionChange={(keys) => {
                          const val = Array.from(
                            keys,
                          )[0] as ParecerTrabalhoAltura;

                          setOpinion((prev) => ({
                            ...(prev || {}),
                            altura: val,
                            details: prev?.details ?? "",
                          }));
                        }}
                      >
                        {alturaParecerOpcoes.map((opt) => (
                          <SelectItem key={opt}>{opt}</SelectItem>
                        ))}
                      </Select>
                    )}

                    {hasConfinedRisk && (
                      <Select
                        classNames={{
                          label: "text-xs",
                          value: "text-xs",
                        }}
                        label="Espaço Confinado"
                        placeholder="Selecione o parecer"
                        selectedKeys={
                          opinion?.confinado ? [opinion.confinado] : []
                        }
                        size="sm"
                        onSelectionChange={(keys) => {
                          const val = Array.from(
                            keys,
                          )[0] as ParecerEspaçoConfinado;

                          setOpinion((prev) => ({
                            ...(prev || {}),
                            confinado: val,
                            details: prev?.details ?? "",
                          }));
                        }}
                      >
                        {confinadoParecerOpcoes.map((opt) => (
                          <SelectItem key={opt}>{opt}</SelectItem>
                        ))}
                      </Select>
                    )}
                  </div>
                )}

              {/* Indicadores de Laudos */}
              {opinion?.laudoRestricao && (
                <>
                  <Divider />
                  <Card className="bg-primary-50 border-primary-200">
                    <CardBody className="p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <UserCheck className="w-4 h-4 text-primary" />
                        <span className="font-semibold text-xs sm:text-sm text-primary">
                          Laudos Emitidos:
                        </span>
                      </div>
                      <div className="space-y-2">
                        {opinion.laudoRestricao && (
                          <Chip color="warning" size="sm" variant="flat">
                            Restrição Temporária - CID:{" "}
                            {opinion.laudoRestricao.cid}
                          </Chip>
                        )}
                      </div>
                    </CardBody>
                  </Card>
                </>
              )}

              {/* Campo Justificativa */}
              {showDetailsField && (
                <>
                  <Divider />
                  <Autocomplete
                    label="Modelo de Orientação"
                    placeholder="Digite para buscar ou clique para selecionar..."
                    size="sm"
                    defaultItems={orientacoesDisponiveis}
                    selectedKey={opinion?.orientacaoId ?? null}
                    onSelectionChange={(key) => {
                      if (key) {
                        const orientacao = orientacoesDisponiveis
                          .flatMap((group) => group.items)
                          .find((orientacao) => orientacao.id === key);

                        setOpinion((prev) => ({
                          ...(prev || {}),
                          details:
                            orientacao?.texto_tela ?? String(key),
                          orientacaoId: orientacao?.id ?? null,
                          isProgrammed: orientacao
                            ? orientacao.libera_cliente
                            : true,
                        }));
                      }
                    }}
                  >
                    {(group) => (
                      <AutocompleteSection
                        key={group.categoria}
                        title={group.categoria}
                        showDivider
                      >
                        {group.items.map((orientacao) => (
                          <AutocompleteItem key={orientacao.id}>
                            {orientacao.texto_tela}
                          </AutocompleteItem>
                        ))}
                      </AutocompleteSection>
                    )}
                  </Autocomplete>
                  <Textarea
                    classNames={{
                      label: "text-xs sm:text-sm",
                      input: "text-xs sm:text-sm",
                    }}
                    label="Justificativa / Detalhes"
                    placeholder="Descreva a justificativa do parecer..."
                    description="Selecione um modelo acima ou digite livremente."
                    rows={4}
                    size="sm"
                    value={opinion?.details ?? ""}
                     onValueChange={(value) =>
                       setOpinion((prev) => ({
                         ...(prev || {}),
                         details: value,
                         isProgrammed: false,
                         orientacaoId: null,
                       }))
                     }
                  />

                  {opinion?.opinionType ===
                    ParecerMedico.INAPTO_TEMPORARIAMENTE && (
                    <Input
                      classNames={{
                        label: "text-xs sm:text-sm",
                      }}
                      label="Inapto até"
                      size="sm"
                      type="date"
                      value={opinion?.laudoRestricao?.dataFim ?? todayIso()}
                      onValueChange={(value) => {
                        setOpinion((prev) => {
                          const newLaudo = prev?.laudoRestricao
                            ? { ...prev.laudoRestricao }
                            : {
                                cid: "",
                                descricaoCid: "",
                                restricoes: "",
                                periodoDias: 30,
                                dataInicio: todayIso(),
                                dataFim: calcularDataFim(todayIso(), 30),
                                recomendacoes: "",
                              };

                          newLaudo.dataFim = value;

                          return { ...(prev || {}), laudoRestricao: newLaudo };
                        });
                      }}
                    />
                  )}
                </>
              )}

              {/* Botões de Ação */}
              {hasPendentes && (
                <Alert
                  className="text-[0.65rem]"
                  color="warning"
                  title="Atenção: existem exames pendentes"
                  variant="flat"
                >
                  O atendimento só pode ser finalizado após todos os exames
                  serem realizados.
                </Alert>
              )}
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <Button
                  className="flex-1 text-xs sm:text-sm text-white font-bold"
                  color="success"
                  isDisabled={isSavingOpinion || !canFinish}
                  size="md"
                  startContent={<CheckCircle2 className="w-4 h-4" />}
                  onPress={handleOpenConfirmacaoWithAuth}
                >
                  Salvar Parecer
                </Button>
                <Button
                  className="text-xs sm:text-sm"
                  isDisabled={isSavingOpinion}
                  size="sm"
                  variant="bordered"
                  onPress={handleLimparParecer}
                >
                  Limpar
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modais */}
      <ConfirmacaoParecerModal
        isLoading={isSavingOpinion}
        isOpen={confirmacaoModalOpen}
        opinion={opinion}
        onClose={() => setConfirmacaoModalOpen(false)}
        onConfirm={saveOpinion}
        orientacoesCatalogo={orientacoesCatalogo}
      />

      <LaudosModal
        isOpen={laudoModalOpen}
        onClose={() => setLaudoModalOpen(false)}
        onSave={(t, d) => {
          setOpinion((prev) => ({
            ...(prev || {}),
            // Se o parecer já é APTO_COM_RESTRICAO, mantém; caso contrário usa o padrão anterior
            opinionType:
              prev?.opinionType === ParecerMedico.APTO_COM_RESTRICAO
                ? ParecerMedico.APTO_COM_RESTRICAO
                : prev?.opinionType || ParecerMedico.INAPTO_TEMPORARIAMENTE,
            laudoRestricao: d,
          }));
          addToast({
            title: "Laudo de Restrição emitido",
            description: "Laudo de restrição temporária adicionado ao parecer",
            color: "foreground",
          });
        }}
      />

      {/* PSC Provider Selector */}
      <PscProviderSelector
        isOpen={isProviderSelectorOpen}
        onClose={() => setIsProviderSelectorOpen(false)}
        onSelect={(provider) => {
          setIsProviderSelectorOpen(false);
          handlePscAuth(provider);
        }}
      />

      {/* Modal de Aguardando Autenticação PSC */}
      <HeroModal
        hideCloseButton
        disableAnimation={true}
        isDismissable={false}
        isOpen={isPscAuthenticating}
      >
        <ModalContent className="border border-[#44735e]/20">
          <ModalHeader className="bg-gradient-to-r from-[#44735e] to-[#5a8c7a] text-white flex flex-col gap-1">
            Autenticação Necessária
          </ModalHeader>
          <ModalBody className="py-6 flex flex-col items-center justify-center text-center">
            <Spinner className="mb-4" color="primary" size="lg" />
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Aguardando provedor...
            </h3>
            <p className="text-gray-600 mb-4 text-sm">
              Conclua a autenticação na janela que foi aberta.
            </p>

            {pscAuthWindowUrl && (
              <div className="bg-[#e8f4e3] border border-[#b8d864] p-3 rounded-lg w-full mb-4">
                <p className="text-xs text-[#2a4a3a] mb-1 font-medium text-center">
                  A janela não abriu?
                </p>
                <a
                  className="text-[#44735e] hover:text-[#2a4a3a] hover:underline text-xs break-all text-center block"
                  href={pscAuthWindowUrl}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Clique aqui para abrir a autenticação em uma nova aba
                  diretamente
                </a>
              </div>
            )}
          </ModalBody>
          <ModalFooter className="flex justify-center border-t border-gray-100">
            <Button
              color="danger"
              variant="light"
              onPress={() => {
                if (pscPollingRef.current) clearInterval(pscPollingRef.current);
                setIsPscAuthenticating(false);
                if (pscWindowRef.current && !pscWindowRef.current.closed) {
                  pscWindowRef.current.close();
                }
              }}
            >
              Cancelar Autenticação
            </Button>
          </ModalFooter>
        </ModalContent>
      </HeroModal>

      {/* Modal de Aviso PSC ao Salvar */}
      <HeroModal
        disableAnimation={true}
        isDismissable={false}
        isOpen={modalPscAvisoOpen}
        onClose={() => setModalPscAvisoOpen(false)}
      >
        <ModalContent className="border border-[#44735e]/20">
          <ModalHeader className="flex flex-col gap-1 bg-gradient-to-r from-[#44735e] to-[#5a8c7a] text-white">
            <div className="flex items-center gap-2">
              <UserLock className="h-8 w-8" />
              <span className="text-lg font-semibold">
                Autenticação Necessária
              </span>
            </div>
          </ModalHeader>
          <ModalBody className="py-6 px-6">
            <p className="font-semibold text-lg text-gray-800">
              Você possui assinatura digital habilitada.
            </p>
            <p className="text-gray-600 mt-2">
              Sua sessão de assinatura não está ativa. Deseja autenticar agora
              para salvar o parecer com assinatura digital?
            </p>
          </ModalBody>
          <ModalFooter className="px-6 pb-4">
            <Button
              className="font-medium"
              color="default"
              variant="flat"
              onPress={() => {
                // Opção: Continuar sem autenticar (apenas salva)
                setModalPscAvisoOpen(false);
                setConfirmacaoModalOpen(true);
              }}
            >
              Continuar sem autenticar
            </Button>
            <Button
              className="font-medium bg-gradient-to-r from-[#44735e] to-[#5a8c7a] text-white focus-visible:ring-2 focus-visible:ring-[#44735e]/40"
              onPress={() => {
                // Opção: Autenticar agora
                setModalPscAvisoOpen(false);
                setIsWaitingForAuthToSave(true);

                const defaultPscProvider =
                  settings?.pscPadrao ?? settings?.provedorPadrao;

                if (defaultPscProvider) {
                  handlePscAuth(defaultPscProvider);
                } else {
                  setIsProviderSelectorOpen(true);
                }
              }}
            >
              Autenticar agora
            </Button>
          </ModalFooter>
        </ModalContent>
      </HeroModal>
    </aside>
  );
};

export default memo(PainelDireita);
