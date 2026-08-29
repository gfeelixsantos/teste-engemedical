
import React, { useEffect, useState } from "react";

import { Scheduling } from "@/lib/scheduling/interface/scheduling";
import { fetchRiscosConfig, IRiscoConfig } from "@/lib/riscos-config/services/riscos-config.service";

interface RiscosFuncionarioProps {
  atendimento: Scheduling;
}

interface CategoryConfig {
  key: string;
  label: string;
  color: string;
}

const riskCategories: CategoryConfig[] = [
  { key: "FISICOS", label: "Físicos", color: "#009966" },
  { key: "QUIMICOS", label: "Químicos", color: "#FF0000" },
  { key: "BIOLOGICOS", label: "Biológicos", color: "#663333" },
  { key: "ERGONOMICOS", label: "Ergonômicos", color: "#FF9900" },
  { key: "ACIDENTES", label: "Acidentes", color: "#0000FF" },
  { key: "INESPECIFICOS", label: "Inespecíficos", color: "#6B7280" },
];

const RiscosFuncionario: React.FC<RiscosFuncionarioProps> = ({
  atendimento,
}) => {
  const [riskConfigs, setRiskConfigs] = useState<IRiscoConfig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRiskConfigs = async () => {
      try {
        const configs = await fetchRiscosConfig();
        setRiskConfigs(configs);
      } catch (error) {
        console.error("Erro ao carregar configurações de risco:", error);
        setRiskConfigs([]);
      } finally {
        setLoading(false);
      }
    };

    loadRiskConfigs();
  }, []);

  const riscos = atendimento.RISCOSASO || [];

  if (riscos.length === 0) {
    return (
      <div>
        <h2 className="text-base font-bold text-gray-800">
          Riscos Ocupacionais
        </h2>
        <p className="text-sm text-gray-400 italic mt-3">
          Não há riscos identificados no momento
        </p>
      </div>
    );
  }

  const grouped: Record<string, string[]> = {
    FISICOS: [],
    QUIMICOS: [],
    BIOLOGICOS: [],
    ERGONOMICOS: [],
    ACIDENTES: [],
    INESPECIFICOS: [],
  };

  for (const r of riscos) {
    const g = String(r.grupo || "").toUpperCase();
    const riskName = r.risco || "N/D";
    if (g.includes("FISICO") || g === "1") {
      grouped.FISICOS.push(riskName);
    } else if (g.includes("QUIMICO") || g === "2") {
      grouped.QUIMICOS.push(riskName);
    } else if (g.includes("BIOLOGICO") || g === "3") {
      grouped.BIOLOGICOS.push(riskName);
    } else if (g.includes("ERGONOMICO") || g === "4") {
      grouped.ERGONOMICOS.push(riskName);
    } else if (g.includes("ACIDENTES") || g === "5") {
      grouped.ACIDENTES.push(riskName);
    } else {
      grouped.INESPECIFICOS.push(riskName);
    }
  }

  return (
    <div>
      <div className="mb-3">
        <h2 className="text-base font-bold text-gray-800">
          Riscos Ocupacionais
        </h2>
      </div>

      <div className="space-y-2">
        {riskCategories.map((cat) => {
          const items = grouped[cat.key];
          if (items.length === 0) return null;

          return (
            <div key={cat.key} className="flex items-baseline gap-3">
              <span
                className="text-sm font-semibold shrink-0 w-24 text-right"
                style={{ color: cat.color }}
              >
                {cat.label}
              </span>
              <span className="text-sm text-gray-700">
                {items.join(", ")}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default React.memo(RiscosFuncionario);
