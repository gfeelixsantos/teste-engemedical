"use client";

import { useState } from "react";
import { Button, Input, Select, SelectItem } from "@heroui/react";

import { AuditFilterParams } from "@/lib/audit-log/types";

import { AUDIT_ACTION_OPTIONS } from "./action-options.mjs";
import { buildAuditFilterParams } from "./filter-params.mjs";

interface AuditFilterFormProps {
  onFilter: (params: Partial<AuditFilterParams>) => void;
  onClear: () => void;
  isLoading: boolean;
}

export function AuditFilterForm({ onFilter, onClear, isLoading }: AuditFilterFormProps) {
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [userCodigo, setUserCodigo] = useState("");
  const [acao, setAcao] = useState("");
  const [unidade, setUnidade] = useState("");
  const [pacienteCodigo, setPacienteCodigo] = useState("");
  const [requestId, setRequestId] = useState("");

  function handleSubmit() {
    if ((dataInicio && !dataFim) || (!dataInicio && dataFim)) {
      alert("Por favor, preencha ambas as datas (início e fim) ou deixe ambas em branco.");
      return;
    }
    onFilter(
      buildAuditFilterParams({
        dataInicio,
        dataFim,
        userCodigo,
        acao,
        unidade,
        pacienteCodigo,
        requestId,
      }),
    );
  }

  function handleClear() {
    setDataInicio("");
    setDataFim("");
    setUserCodigo("");
    setAcao("");
    setUnidade("");
    setPacienteCodigo("");
    setRequestId("");
    onClear();
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <Input
          label="Data início"
          type="date"
          value={dataInicio}
          onValueChange={setDataInicio}
        />
        <Input
          label="Data fim"
          type="date"
          value={dataFim}
          onValueChange={setDataFim}
        />
        <Input
          label="Usuário/Código"
          value={userCodigo}
          onValueChange={setUserCodigo}
        />
        <Select
          label="Ação"
          placeholder="Todas as ações"
          selectedKeys={acao ? [acao] : []}
          onSelectionChange={(keys) => {
            const val = Array.from(keys)[0] as string;
            setAcao(val || "");
          }}
        >
          {AUDIT_ACTION_OPTIONS.map((option) => (
            <SelectItem key={option.value}>{option.label}</SelectItem>
          ))}
        </Select>
        <Input
          label="Unidade"
          value={unidade}
          onValueChange={setUnidade}
        />
        <Input
          label="Código do funcionário"
          value={pacienteCodigo}
          onValueChange={setPacienteCodigo}
        />
        <Input
          label="Código de rastreio"
          value={requestId}
          onValueChange={setRequestId}
        />
      </div>

      <div className="flex gap-3">
        <Button
          color="primary"
          onPress={handleSubmit}
          isLoading={isLoading}
          style={{ backgroundColor: "#44735e" }}
        >
          Pesquisar
        </Button>
        <Button
          variant="flat"
          onPress={handleClear}
        >
          Limpar filtros
        </Button>
      </div>
    </div>
  );
}
