import React from "react";

// Função para converter SVG string para data URL
const svgToDataURL = (svgString: string): string => {
  try {
    if (!svgString || typeof svgString !== "string") {
      console.error("SVG string inválida:", svgString);

      return "";
    }

    // Método 1: Tentar com encodeURIComponent (mais simples)
    try {
      const encoded = encodeURIComponent(svgString);

      return `data:image/svg+xml;charset=utf-8,${encoded}`;
    } catch (encodeError) {
      console.log("encodeURIComponent falhou, tentando base64...");

      // Método 2: Usar base64
      // Primeiro precisamos limpar caracteres Unicode
      const utf8Bytes = new TextEncoder().encode(svgString);
      let binary = "";

      for (let i = 0; i < utf8Bytes.length; i++) {
        binary += String.fromCharCode(utf8Bytes[i]);
      }
      const base64 = btoa(binary);

      return `data:image/svg+xml;base64,${base64}`;
    }
  } catch (error) {
    console.error("Erro fatal ao converter SVG:", error);

    return "";
  }
};

// Componente para exibir os gráficos de audiometria
export const AudiogramDisplay: React.FC<{
  svgData: { od: string; oe: string } | null;
}> = React.memo(({ svgData }) => {
  if (!svgData) return null;

  // Log para debug
  React.useEffect(() => {
    if (svgData.od) {
      console.log(
        "SVG OD (primeiros 300 chars):",
        svgData.od.substring(0, 300),
      );
      console.log("SVG OD tem <svg>?", svgData.od.includes("<svg"));
      console.log("SVG OD tem </svg>?", svgData.od.includes("</svg>"));
    }
    if (svgData.oe) {
      console.log(
        "SVG OE (primeiros 300 chars):",
        svgData.oe.substring(0, 300),
      );
      console.log("SVG OE tem <svg>?", svgData.oe.includes("<svg"));
      console.log("SVG OE tem </svg>?", svgData.oe.includes("</svg>"));
    }
  }, [svgData]);

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 rounded-lg">
        <div className="flex flex-col items-center">
          <div className="text-sm font-medium text-red-700 mb-2">
            Ouvido Direito (OD)
          </div>
          <div className="bg-white p-2 rounded shadow-sm">
            {svgData.od ? (
              <img
                alt="Audiograma - Ouvido Direito (OD)"
                className="max-w-full h-auto"
                src={svgToDataURL(svgData.od)}
                onError={(e) => {
                  console.error("Erro ao carregar gráfico OD");
                  console.error("SVG content:", svgData.od.substring(0, 500));
                  console.error(
                    "Data URL gerada:",
                    svgToDataURL(svgData.od).substring(0, 200),
                  );
                  e.currentTarget.style.display = "none";
                  e.currentTarget.parentElement!.innerHTML =
                    '<div class="text-red-500 text-sm p-4">Erro ao carregar gráfico OD</div>';
                }}
                onLoad={() => console.log("Gráfico OD carregado com sucesso")}
              />
            ) : (
              <div className="text-gray-400 p-4">Sem dados para OD</div>
            )}
          </div>
        </div>
        <div className="flex flex-col items-center">
          <div className="text-sm font-medium text-blue-700 mb-2">
            Ouvido Esquerdo (OE)
          </div>
          <div className="bg-white p-2 rounded shadow-sm">
            {svgData.oe ? (
              <img
                alt="Audiograma - Ouvido Esquerdo (OE)"
                className="max-w-full h-auto"
                src={svgToDataURL(svgData.oe)}
                onError={(e) => {
                  console.error("Erro ao carregar gráfico OE");
                  console.error("SVG content:", svgData.oe?.substring(0, 500));
                  console.error(
                    "Data URL gerada:",
                    svgToDataURL(svgData.oe).substring(0, 200),
                  );
                  e.currentTarget.style.display = "none";
                  e.currentTarget.parentElement!.innerHTML =
                    '<div class="text-red-500 text-sm p-4">Erro ao carregar gráfico OE</div>';
                }}
                onLoad={() => console.log("Gráfico OE carregado com sucesso")}
              />
            ) : (
              <div className="text-gray-400 p-4">Sem dados para OE</div>
            )}
          </div>
        </div>
      </div>
      <p className="text-xs text-gray-500 mb-10 text-center">
        <strong>Legenda:</strong> ○ = VA OD não mascarado | △ = VA OD mascarado
        | × = VA OE não mascarado | □ = VA OE mascarado | &lt; = VO OD não
        mascarado | [ = VO OD mascarado | &gt; = VO OE não mascarado | ] = VO OE
        mascarado
      </p>
    </div>
  );
});
