import React from "react";

interface PareceresComplementaresProps {
  altura: string | null;
  confinado: string | null;
}

const formatParecer = (value: string | null): string | null => {
  if (!value) return null;
  return value.replace(/_/g, " ").toUpperCase();
};

const PareceresComplementares: React.FC<PareceresComplementaresProps> = ({
  altura,
  confinado,
}) => {
  const alturaLabel = formatParecer(altura);
  const confinadoLabel = formatParecer(confinado);

  if (!alturaLabel && !confinadoLabel) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
      {alturaLabel && (
        <div>
          <span className="text-xs text-gray-500 font-medium">
            TRABALHO EM ALTURA
          </span>
          <p className="text-sm font-semibold text-gray-900">
            {alturaLabel}
          </p>
        </div>
      )}
      {confinadoLabel && (
        <div>
          <span className="text-xs text-gray-500 font-medium">
            ESPAÇO CONFINADO
          </span>
          <p className="text-sm font-semibold text-gray-900">
            {confinadoLabel}
          </p>
        </div>
      )}
    </div>
  );
};

export default React.memo(PareceresComplementares);
