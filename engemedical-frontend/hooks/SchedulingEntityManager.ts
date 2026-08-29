import { useState, useCallback } from "react";
import { Socket } from "socket.io-client";

import { MongoOperationTypes } from "@/lib/scheduling/enum/scheduling.enum";
import { Scheduling } from "@/lib/scheduling/interface/scheduling";
import { TicketActionType } from "@/lib/ticket/ticket";

export interface SchedulingEntityManager {
  schedulings: Scheduling[];

  addOrUpdate: (sch: Scheduling) => void;
  setAll: (list: Scheduling[]) => void;
  remove: (schedulingCode: string) => void;
  clear: () => void;
  get: (schedulingCode: string) => Scheduling | undefined;

  // Ação WS → atendimento_action
  executarAtendimentoAcao: (
    funcionario: string,
    ticketId: number,
    action: TicketActionType,
    unidade: string,
    socket: Socket,
    sala?: string,
    exame?: string,
    user?: string,
    nomeFuncionario?: string,
  ) => void;

  // Handlers para atualizar lista via ChangeStream
  handleSchedulingChange: (payload: {
    operation: MongoOperationTypes;
    schedule: Scheduling;
  }) => void;
}

export function useSchedulingEntityManager(
  initial: Scheduling[] = [],
): SchedulingEntityManager {
  const [schedulings, setSchedulings] = useState<Scheduling[]>(initial);

  // -------------------------
  // CRUD em memória
  // -------------------------

  const addOrUpdate = useCallback((sch: Scheduling) => {
    setSchedulings((prev) => {
      const idx = prev.findIndex(
        (p) => p.SCHEDULINGCODE === sch.SCHEDULINGCODE,
      );

      if (idx !== -1) {
        const updated = [...prev];

        updated[idx] = sch;

        return updated;
      }

      return [...prev, sch];
    });
  }, []);

  const setAll = useCallback((list: Scheduling[]) => {
    setSchedulings(list);
  }, []);

  const remove = useCallback((schedulingCode: string) => {
    setSchedulings((prev) =>
      prev.filter((p) => p.SCHEDULINGCODE !== schedulingCode),
    );
  }, []);

  const clear = useCallback(() => setSchedulings([]), []);

  const get = useCallback(
    (schedulingCode: string) =>
      schedulings.find((s) => s.SCHEDULINGCODE === schedulingCode),
    [schedulings],
  );

  // -------------------------------------------
  // WS -> Executar ação no backend
  // -------------------------------------------

  const executarAtendimentoAcao = (
    funcionarioId: string,
    ticketId: number,
    action: TicketActionType,
    unidade: string,
    socket: Socket,
    sala: string = "",
    exame: string = "",
    user: string = "",
    nomeFuncionario: string = "",
  ) => {
    if (!socket.connected) {
      alert("❌ Não conectado ao servidor");

      return;
    }

    socket.emit("atendimento_action", {
      funcionarioId,
      ticketId,
      action,
      unidade,
      sala,
      exame,
      user,
      nomeFuncionario,
    });
  };

  // --------------------------------------------------------
  // 🔥 Handler único para INSERT / UPDATE / DELETE
  // --------------------------------------------------------

  const handleSchedulingChange = useCallback(
    ({
      operation,
      schedule,
    }: {
      operation: MongoOperationTypes;
      schedule: Scheduling;
    }) => {
      switch (operation) {
        case MongoOperationTypes.INSERT:
          addOrUpdate(schedule);
          break;

        case MongoOperationTypes.UPDATE:
          addOrUpdate(schedule);
          break;

        case MongoOperationTypes.DELETE:
          remove(schedule.SCHEDULINGCODE);
          break;

        default:
          console.warn("⚠ Operação desconhecida:", operation);
      }
    },
    [addOrUpdate, remove],
  );

  // --------------------------------------------------------
  // Retorno final
  // --------------------------------------------------------

  return {
    schedulings,
    addOrUpdate,
    setAll,
    remove,
    clear,
    get,
    executarAtendimentoAcao,
    handleSchedulingChange,
  };
}
