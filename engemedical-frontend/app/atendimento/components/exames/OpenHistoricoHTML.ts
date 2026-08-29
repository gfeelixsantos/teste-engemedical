// utils/openHistoricoHTML.ts
import { adaptExportaDadosToAudiometriaData } from "./audiometriaAdapter";
import { generateAudiogramSVG } from "./AudiometriaGraphics";
import { AudiometriaCalculator } from "./AudiometriaOcupacional";

import { AudiometriaExportaDados } from "@/lib/soc/interfaces/AudiometriaExportaDados";

export function openHistoricoHTML(
  audiometrias: AudiometriaExportaDados[],
  atendimento: any,
) {
  const windowWidth = 800;
  const windowHeight = 600;
  const left = (window.screen.width - windowWidth) / 2;
  const top = (window.screen.height - windowHeight) / 2;

  const newWindow = window.open(
    "",
    "_blank",
    `width=${windowWidth},height=${windowHeight},left=${left},top=${top},scrollbars=yes,resizable=yes`,
  );

  if (!newWindow) {
    alert(
      "Não foi possível abrir a janela. Verifique as configurações do seu navegador.",
    );

    return;
  }

  // Ordenar por data (mais recente primeiro)
  const audiometriasOrdenadas = [...audiometrias].sort((a, b) => {
    const dateA = a.DATA_REALIZACAO?.split("/").reverse().join("-");
    const dateB = b.DATA_REALIZACAO?.split("/").reverse().join("-");

    return new Date(dateB).getTime() - new Date(dateA).getTime();
  });

  // O usuário solicitou que a audiometria mais recente (a atual) seja desconsiderada.
  if (audiometriasOrdenadas.length > 0) {
    audiometriasOrdenadas.shift();
  }

  // Gerar HTML para cada audiometria restante
  const audiometriasHTML = audiometriasOrdenadas
    .map((audiometria) => {
      // Adaptar os dados para o formato do componente
      const audiometriaData = adaptExportaDadosToAudiometriaData(
        audiometria,
        atendimento,
      );

      // CALCULAR OS RESULTADOS USANDO O MESMO CALCULATOR DO COMPONENTE
      const resultados =
        AudiometriaCalculator.calcularTodosResultados(audiometriaData);

      // Merge dos dados originais com os resultados calculados
      const dadosCompletos = {
        ...audiometriaData,
        ...resultados,
      };

      const graficos = generateAudiogramSVG(dadosCompletos);

      // Lógica para identificação do profissional (Substituição de CPF vazio)
      let labelProfissional = "CPF(s) do Profissional";
      let valueProfissional = "";

      const cpf1 = audiometria.CPF_FONO ? formatCPF(audiometria.CPF_FONO) : "";
      const cpf2 = audiometria.CPF_FONO2
        ? formatCPF(audiometria.CPF_FONO2)
        : "";

      if (cpf1 || cpf2) {
        valueProfissional = `${cpf1} ${cpf2 ? `<br/>${cpf2}` : ""}`;
      } else {
        // Fallback: Registro Profissional
        labelProfissional = "Registro Profissional";
        const reg1 = `${audiometria.CONSELHO_CLASSE_EXAMINADOR1 || ""} ${audiometria.NUM_CONSELHO_CLASSE_EXAMINADOR1 || ""}`;
        const reg2 = audiometria.CONSELHO_CLASSE_EXAMINADOR2
          ? `${audiometria.CONSELHO_CLASSE_EXAMINADOR2} ${audiometria.NUM_CONSELHO_CLASSE_EXAMINADOR2 || ""}`
          : "";

        valueProfissional = `${reg1} ${reg2 ? `<br/>${reg2}` : ""}`.trim();

        if (!valueProfissional) valueProfissional = "Não informado";
      }

      return `
      <div class="audiometria-card">
        <!-- HEADER DO EXAME -->
        <div class="card-header">
          <div class="card-title">
            <span class="data-exame">${formatDateBR(audiometria.DATA_REALIZACAO)}</span>
            <span class="numero-guia">Guia: <span class="badge badge-light">${audiometria.NUMERO_GUIA || "N/A"}</span></span>
          </div>
          <span class="badge badge-${getResultadoStyle(dadosCompletos.resultadoOD)}">
            ${formatResultado(dadosCompletos.resultadoOD)}
          </span>
        </div>

        <!-- DADOS DO EXAME -->
        <div class="info-section">
          <h4 class="section-title">Informações do Exame</h4>
          <div class="info-grid">
            ${createInfoItem("Unidade", audiometria.NOME_UNIDADE)}
            ${createInfoItem("Setor", audiometria.SETOR)}
            ${createInfoItem("Cargo", audiometria.CARGO)}
            ${createInfoItem("Repouso Auditivo", dadosCompletos.repousoAuditivo === "Sim" ? `${dadosCompletos.horasRepouso}h` : "Não")}
            ${createInfoItem("Audiômetro", dadosCompletos.tipoAudiometro)}
            ${createInfoItem("Otoscopia OD", formatOtoscopia(dadosCompletos.meatoscopiaOD))}
            ${createInfoItem("Otoscopia OE", formatOtoscopia(dadosCompletos.meatoscopiaOE))}
          </div>
        </div>

        <!-- GRÁFICOS -->
        <div class="graficos-container">
          <div class="grafico-item">
            <div class="grafico-title text-red">Ouvido Direito (OD)</div>
            ${graficos.od}
          </div>
          <div class="grafico-item">
            <div class="grafico-title text-blue">Ouvido Esquerdo (OE)</div>
            ${graficos.oe}
          </div>
        </div>

        <!-- RESULTADOS DETALHADOS -->
        <div class="resultados-container">
          <h4 class="section-title">Análise dos Limiares</h4>
          <div class="grid grid-cols-2 gap-6">
            <!-- OD -->
            <div class="resultado-box border-red">
              <h5 class="box-title text-red">Ouvido Direito (OD)</h5>
              
              <div class="mb-3">
                <div class="label">Classificação (Lloyd & Kaplan)</div>
                <div class="classification-badge ${getClassificationStyle(dadosCompletos.classificacaoOD)}">
                  ${formatClassification(dadosCompletos.classificacaoOD)}
                </div>
              </div>
              
              <div class="metrics-grid">
                <div class="metric">
                  <div class="metric-label">Média Tonal</div>
                  <div class="metric-value-sm">${dadosCompletos.mediaTonalOD} dB</div>
                </div>
                <div class="metric">
                  <div class="metric-label">Tipo</div>
                  <div class="metric-value-sm whitespace-nowrap">${dadosCompletos.tipoPerdaOD === "Sem perda auditiva" ? "-" : dadosCompletos.tipoPerdaOD || "-"}</div>
                </div>
                <div class="metric">
                  <div class="metric-label">Configuração</div>
                  <div class="metric-value-sm text-xs truncate">${dadosCompletos.configuracaoOD || "-"}</div>
                </div>
              </div>
              
              <div class="mt-3 text-xs">
                <span class="label">Frequências Alteradas:</span> 
                <span class="text-dark">${dadosCompletos.frequenciasAlteradasOD || "Nenhuma"}</span>
              </div>
              
              ${
                dadosCompletos.entalhe4000HzOD
                  ? `
                <div class="alert alert-warning mt-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                  Entalhe em 4000Hz detectado
                </div>
              `
                  : ""
              }
            </div>

            <!-- OE -->
            <div class="resultado-box border-blue">
              <h5 class="box-title text-blue">Ouvido Esquerdo (OE)</h5>
              
              <div class="mb-3">
                <div class="label">Classificação (Lloyd & Kaplan)</div>
                <div class="classification-badge ${getClassificationStyle(dadosCompletos.classificacaoOE)}">
                  ${formatClassification(dadosCompletos.classificacaoOE)}
                </div>
              </div>
              
              <div class="metrics-grid">
                <div class="metric">
                  <div class="metric-label">Média Tonal</div>
                  <div class="metric-value-sm">${dadosCompletos.mediaTonalOE} dB</div>
                </div>
                <div class="metric">
                  <div class="metric-label">Tipo</div>
                  <div class="metric-value-sm whitespace-nowrap">${dadosCompletos.tipoPerdaOE === "Sem perda auditiva" ? "-" : dadosCompletos.tipoPerdaOE || "-"}</div>
                </div>
                <div class="metric">
                  <div class="metric-label">Configuração</div>
                  <div class="metric-value-sm text-xs truncate">${dadosCompletos.configuracaoOE || "-"}</div>
                </div>
              </div>
              
              <div class="mt-3 text-xs">
                <span class="label">Frequências Alteradas:</span> 
                <span class="text-dark">${dadosCompletos.frequenciasAlteradasOE || "Nenhuma"}</span>
              </div>
              
              ${
                dadosCompletos.entalhe4000HzOE
                  ? `
                <div class="alert alert-warning mt-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                  Entalhe em 4000Hz detectado
                </div>
              `
                  : ""
              }
            </div>
          </div>

          <!-- Classificação NR-7 -->
          <div class="nr7-container mt-4">
            <h5 class="nr7-title">Classificação NR-7</h5>
            <div class="grid grid-cols-2 gap-4 mt-2">
              <div class="nr7-box">
                <span class="label">OD:</span>
                <span class="font-medium ${getNR7Style(dadosCompletos.classificacaoNR7OD)}">
                  ${dadosCompletos.classificacaoNR7OD || "Não classificado"}
                </span>
              </div>
              <div class="nr7-box">
                <span class="label">OE:</span>
                <span class="font-medium ${getNR7Style(dadosCompletos.classificacaoNR7OE)}">
                  ${dadosCompletos.classificacaoNR7OE || "Não classificado"}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- TABELA E OUTROS TESTES EM 2 COLUNAS SE POSSÍVEL -->
        <div class="grid grid-cols-1 md-grid-cols-layout gap-6 mt-6">
          <div class="table-section">
            ${createTabelaValores(dadosCompletos)}
          </div>
          <div class="other-tests-section">
            ${createIRFSRT(dadosCompletos)}
            ${dadosCompletos.observacoes ? createObservacao("Observações", dadosCompletos.observacoes) : ""}
          </div>
        </div>
        
        <!-- CONCLUSÃO E PARECER -->
        <div class="conclusao-section bg-status-${getResultadoStyle(dadosCompletos.resultadoOD)} mt-4">
          <div class="conclusao-header text-status-${getResultadoStyle(dadosCompletos.resultadoOD)}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            Parecer e Conclusão Geral
          </div>
          <div class="conclusao-body">
            <p class="conclusao-text">${dadosCompletos.conclusao || "Não informado"}</p>
            <div class="pcd-box">
              <div class="pcd-label">Critério PCD (Lei 14.768/2023)</div>
              <div class="pcd-value">${dadosCompletos.criterioPCD || "Não avaliado"}</div>
            </div>
          </div>
        </div>
        
        <!-- RODAPÉ - ASSINATURAS -->
        <div class="rodape">
          <div class="assinatura-box">
            <div class="assinatura-label">Examinador(es)</div>
            <div class="assinatura-value">
              ${audiometria.CONSELHO_CLASSE_EXAMINADOR1 || ""} ${audiometria.NUM_CONSELHO_CLASSE_EXAMINADOR1 || ""}
              ${audiometria.CONSELHO_CLASSE_EXAMINADOR2 ? `<br/>${audiometria.CONSELHO_CLASSE_EXAMINADOR2} ${audiometria.NUM_CONSELHO_CLASSE_EXAMINADOR2 || ""}` : ""}
            </div>
          </div>
          <div class="assinatura-box">
            <div class="assinatura-label">${labelProfissional}</div>
            <div class="assinatura-value">
              ${valueProfissional}
            </div>
          </div>
        </div>
      </div>
    `;
    })
    .join("");

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Histórico de Audiometrias - ${atendimento?.NOME || "Paciente"}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style>
        :root {
          --primary: #2563eb;
          --primary-light: #eff6ff;
          --success: #16a34a;
          --success-light: #f0fdf4;
          --warning: #ca8a04;
          --warning-light: #fefce8;
          --danger: #dc2626;
          --danger-light: #fef2f2;
          --gray-50: #f9fafb;
          --gray-100: #f3f4f6;
          --gray-200: #e5e7eb;
          --gray-300: #d1d5db;
          --gray-500: #6b7280;
          --gray-700: #374151;
          --gray-800: #1f2937;
          --gray-900: #111827;
          --red: #B71C1C;
          --blue: #0D47A1;
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          background-color: var(--gray-100);
          color: var(--gray-800);
          padding: 24px;
          line-height: 1.5;
        }
        
        .container {
          max-width: 1100px;
          margin: 0 auto;
        }
        
        /* App-like Header */
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          background: white;
          padding: 24px 32px;
          border-radius: 16px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03);
          margin-bottom: 24px;
        }
        
        .header-title {
          font-size: 24px;
          font-weight: 700;
          color: var(--gray-900);
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .header-title svg { color: var(--primary); }
        
        .patient-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
          row-gap: 8px;
        }
        
        .patient-info .label {
          font-size: 12px;
          font-weight: 500;
          color: var(--gray-500);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        
        .patient-info .value {
          font-size: 14px;
          font-weight: 600;
          color: var(--gray-900);
        }

        .header-actions {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 12px;
        }
        
        .exam-count {
          background: var(--primary-light);
          color: var(--primary);
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 600;
        }
        
        .btn-print {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: var(--gray-900);
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          text-decoration: none;
        }
        
        .btn-print:hover {
          background: var(--gray-800);
          transform: translateY(-1px);
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }

        /* Card de Audiometria */
        .audiometria-card {
          background: white;
          border-radius: 16px;
          padding: 32px;
          margin-bottom: 24px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03);
          border: 1px solid var(--gray-200);
        }
        
        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 1px solid var(--gray-200);
        }
        
        .data-exame {
          font-size: 20px;
          font-weight: 700;
          color: var(--gray-900);
        }
        
        .numero-guia {
          font-size: 13px;
          color: var(--gray-500);
          margin-left: 12px;
        }

        /* Badges */
        .badge {
          display: inline-flex;
          align-items: center;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.025em;
        }
        
        .badge-light { background: var(--gray-100); color: var(--gray-700); }
        .badge-normal { background: var(--success-light); color: var(--success); }
        .badge-alerta { background: var(--warning-light); color: var(--warning); }
        .badge-danger { background: var(--danger-light); color: var(--danger); }
        .badge-gray { background: var(--gray-100); color: var(--gray-700); }

        .section-title {
          font-size: 13px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--gray-500);
          margin-bottom: 12px;
        }

        /* Info Grid */
        .info-section {
          background: var(--gray-50);
          border-radius: 12px;
          padding: 16px 24px;
          margin-bottom: 24px;
          border: 1px solid var(--gray-200);
        }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 16px;
        }
        
        .info-item .label {
          font-size: 11px;
          color: var(--gray-500);
          text-transform: uppercase;
          margin-bottom: 2px;
          font-weight: 500;
        }
        
        .info-item .value {
          font-size: 14px;
          font-weight: 500;
          color: var(--gray-900);
        }

        /* Gráficos */
        .graficos-container {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          margin-bottom: 24px;
          background: white;
          padding: 24px;
          border-radius: 12px;
          border: 1px solid var(--gray-200);
        }
        
        .grafico-item {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .grafico-title {
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 12px;
        }

        .grafico-item svg {
          border: 1px solid var(--gray-200);
          border-radius: 8px;
          background: #fafafa;
        }

        /* Resultados Detalhados */
        .resultados-container { padding: 8px 0; }
        
        .resultado-box {
          background: white;
          border-radius: 12px;
          padding: 20px;
          border-left-width: 4px;
          border-left-style: solid;
          box-shadow: 0 1px 2px rgba(0,0,0,0.02);
          border-top: 1px solid var(--gray-200);
          border-right: 1px solid var(--gray-200);
          border-bottom: 1px solid var(--gray-200);
        }

        .border-red { border-left-color: var(--red); background-color: #fffafb; }
        .border-blue { border-left-color: var(--blue); background-color: #f8fbff; }
        .text-red { color: var(--red); }
        .text-blue { color: var(--blue); }

        .box-title {
          font-size: 14px;
          font-weight: 700;
          margin-bottom: 12px;
        }

        .label {
          font-size: 11px;
          font-weight: 500;
          color: var(--gray-500);
          margin-bottom: 4px;
        }

        .classification-badge {
          display: inline-block;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
        }

        .classificacao-normal { background: var(--success-light); color: var(--success); }
        .classificacao-leve { background: var(--warning-light); color: var(--warning); }
        .classificacao-moderada { background: #ffedd5; color: #c2410c; }
        .classificacao-severa { background: var(--danger-light); color: var(--danger); }
        .classificacao-profunda { background: #be123c; color: white; }
        .classificacao-outros { background: var(--gray-100); color: var(--gray-700); }

        .metrics-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1.5fr;
          gap: 8px;
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid var(--gray-200);
        }

        .metric-label { font-size: 10px; color: var(--gray-500); text-transform: uppercase; font-weight: 600;}
        .metric-value { font-size: 14px; font-weight: 600; color: var(--gray-900); }
        .metric-value-sm { font-size: 13px; font-weight: 600; color: var(--gray-900); }
        .whitespace-nowrap { white-space: nowrap; }
        .text-xs { font-size: 11px; }
        .truncate { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; display: block; }

        /* Alertas */
        .alert {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
        }
        .alert-warning { background: var(--warning-light); color: var(--warning); border: 1px solid #fef08a; }

        /* NR-7 */
        .nr7-container {
          background: var(--gray-50);
          padding: 16px;
          border-radius: 8px;
          border: 1px solid var(--gray-200);
          text-align: center;
        }
        .nr7-title { font-size: 12px; color: var(--gray-500); text-transform: uppercase; font-weight: 600; }
        .nr7-box { display: flex; justify-content: center; align-items: center; gap: 8px; }

        .nr7-normal { color: var(--success); }
        .nr7-alterado { color: var(--danger); }
        .nr7-nao-ocupacional { color: var(--warning); }
        
        .font-medium { font-weight: 500; }
        .text-dark { color: var(--gray-900); font-weight: 500; }

        /* Tabelas e Disposição */
        .grid { display: grid; }
        .grid-cols-1 { grid-template-columns: 1fr; }
        .grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
        .gap-4 { gap: 16px; }
        .gap-6 { gap: 24px; }
        .mt-2 { margin-top: 8px; }
        .mt-3 { margin-top: 12px; }
        .mt-4 { margin-top: 16px; }
        .mt-6 { margin-top: 24px; }
        .mb-3 { margin-bottom: 12px; }

        .table-section { overflow-x: auto; }
        .md-grid-cols-layout {
          grid-template-columns: 1fr;
        }
        
        @media (min-width: 1024px) {
          .md-grid-cols-layout {
            grid-template-columns: 3fr 1fr;
          }
        }

        .tabela-valores {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
          background: white;
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid var(--gray-200);
        }
        
        .tabela-valores th {
          background: var(--gray-50);
          color: var(--gray-700);
          padding: 8px;
          text-align: center;
          font-weight: 600;
          border-bottom: 1px solid var(--gray-200);
          border-right: 1px solid var(--gray-200);
        }
        
        .tabela-valores td {
          padding: 6px 4px;
          text-align: center;
          border-right: 1px solid var(--gray-200);
          border-bottom: 1px solid var(--gray-200);
          color: var(--gray-800);
        }
        
        .tabela-valores .subcabecalho { 
          background: var(--gray-100); 
          font-weight: 600; 
          text-transform: uppercase;
          font-size: 11px;
          color: var(--gray-600);
        }

        .table-title {
          font-size: 13px;
          font-weight: 600;
          color: var(--gray-700);
          margin-bottom: 8px;
          display: flex;
          align-items: center;
        }

        /* IRF / SRT */
        .other-tests-section {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .irf-box {
          background: white;
          border: 1px solid var(--gray-200);
          border-radius: 8px;
          padding: 16px;
        }

        .irf-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-top: 12px;
        }

        /* Conclusão */
        .conclusao-section {
          border-radius: 12px;
          border: 1px solid transparent; /* default */
          overflow: hidden;
          margin-bottom: 24px;
        }

        .bg-status-normal { background: var(--success-light); border-color: #bbf7d0; }
        .bg-status-alerta { background: var(--warning-light); border-color: #fef08a; }
        .bg-status-danger { background: var(--danger-light); border-color: #fecaca; }
        .bg-status-gray   { background: var(--gray-50); border-color: var(--gray-200); }

        .conclusao-header {
          padding: 14px 20px;
          font-weight: 700;
          font-size: 15px;
          display: flex;
          align-items: center;
          gap: 10px;
          border-bottom: 1px solid rgba(0,0,0,0.05);
        }

        .text-status-normal { color: var(--success); background: #bbf7d022; }
        .text-status-alerta { color: var(--warning); background: #fef08a22; }
        .text-status-danger { color: var(--danger); background: #fecaca22; }
        .text-status-gray   { color: var(--gray-700); background: var(--gray-100); }

        .conclusao-body {
          padding: 20px;
        }
        .conclusao-text {
          font-size: 16px;
          font-weight: 600;
          color: var(--gray-900);
          margin-bottom: 16px;
          line-height: 1.4;
        }
        .pcd-box {
          background: rgba(255,255,255,0.6);
          padding: 12px 16px;
          border-radius: 8px;
          border: 1px dashed rgba(0,0,0,0.1);
        }
        .pcd-label { font-size: 11px; font-weight: 600; margin-bottom: 4px; text-transform: uppercase; color: var(--gray-600); }
        .pcd-value { font-size: 14px; color: var(--gray-900); font-weight: 500; }

        /* Rodapé */
        .rodape {
          margin-top: 32px;
          padding-top: 24px;
          border-top: 1px dashed var(--gray-300);
          display: flex;
          justify-content: space-between;
        }

        .assinatura-box { text-align: left; }
        .assinatura-label { font-size: 12px; color: var(--gray-500); text-transform: uppercase; margin-bottom: 4px; }
        .assinatura-value { font-size: 14px; font-weight: 500; color: var(--gray-800); }

        .sem-resultados {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 80px 20px;
          background: white;
          border-radius: 16px;
          border: 1px solid var(--gray-200);
          text-align: center;
        }
        
        .sem-resultados h2 { color: var(--gray-900); margin-bottom: 8px; }
        .sem-resultados p { color: var(--gray-500); }

        /* Impressão */
        @media print {
          body { background: white; padding: 0; }
          .page-header { box-shadow: none; border: 1px solid var(--gray-200); }
          .btn-print { display: none; }
          .audiometria-card { box-shadow: none; break-inside: avoid; margin-bottom: 30px; }
          .graficos-container { break-inside: avoid; }
          .conclusao-section { break-inside: avoid; }
          /* Forçar cores de background */
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Header Estilo App -->
        <div class="page-header">
          <div>
            <h1 class="header-title">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>
              Histórico de Audiometrias
            </h1>
            <div class="patient-grid">
              <div class="patient-info"><div class="label">Paciente</div><div class="value">${atendimento?.NOME || "Não informado"}</div></div>
              <div class="patient-info"><div class="label">CPF</div><div class="value">${formatCPF(atendimento?.CPFFUNCIONARIO)}</div></div>
              <div class="patient-info"><div class="label">Empresa</div><div class="value">${atendimento?.NOMEEMPRESA || "Não informado"}</div></div>
              <div class="patient-info"><div class="label">Matrícula</div><div class="value">${atendimento?.MATRICULAFUNCIONARIO || "-"}</div></div>
            </div>
          </div>
          <div class="header-actions">
            <div class="exam-count">${audiometriasOrdenadas.length} exame(s) anterior(es)</div>
            <button class="btn-print" onclick="window.print()">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
              Imprimir Histórico
            </button>
          </div>
        </div>
        
        ${
          audiometriasOrdenadas.length === 0
            ? `
            <div class="sem-resultados">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--gray-300)" stroke-width="1.5" style="margin-bottom: 16px"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
              <h2>Nenhum exame anterior</h2>
              <p>Não há histórico de audiometrias (removendo a audiometria atual).</p>
            </div>
            `
            : audiometriasHTML
        }
      </div>
    </body>
    </html>
  `;

  newWindow.document.write(htmlContent);
  newWindow.document.close();
}

// ============= FUNÇÕES AUXILIARES =============

function getResultadoStyle(resultado: string): string {
  if (resultado.includes("NORMAL")) return "normal";
  if (resultado.includes("SUGESTIVO")) return "alerta";
  if (resultado.includes("PAIR") || resultado.includes("INDUZIDA"))
    return "danger";

  return "gray";
}

function formatResultado(resultado: string): string {
  return resultado?.replace(/_/g, " ") || "Não informado";
}

function formatDateBR(date?: string): string {
  if (!date) return "Não informado";
  try {
    if (date.includes("/")) return date;
    const parts = date.split("-");

    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;

    return new Date(date).toLocaleDateString("pt-BR");
  } catch {
    return date;
  }
}

function formatOtoscopia(otoscopia: string): string {
  switch (otoscopia) {
    case "SEM_OBSTRUCAO":
      return "Sem obstrução";
    case "COM_OBSTRUCAO_PARCIAL":
      return "Obstrução parcial";
    case "COM_OBSTRUCAO_TOTAL":
      return "Obstrução total";
    default:
      return otoscopia || "Não informado";
  }
}

function formatClassification(classification: string): string {
  if (!classification) return "Não classificado";
  if (
    classification.includes("normalidade") ||
    classification === "Normal" ||
    classification === "-"
  ) {
    return "Padrões de normalidade";
  }

  return classification;
}

function getClassificationStyle(classification: string): string {
  if (!classification) return "classificacao-outros";
  if (
    classification.includes("normalidade") ||
    classification === "Normal" ||
    classification === "-"
  ) {
    return "classificacao-normal";
  }
  if (classification.includes("Leve")) return "classificacao-leve";
  if (classification.includes("Moderada")) return "classificacao-moderada";
  if (classification.includes("Severa")) return "classificacao-severa";
  if (classification.includes("Profunda")) return "classificacao-profunda";

  return "classificacao-outros";
}

function getNR7Style(nr7: string): string {
  if (!nr7) return "";
  if (nr7.includes("Normal")) return "nr7-normal";
  if (nr7.includes("Alterada")) return "nr7-alterado";
  if (nr7.includes("Não Ocupacional")) return "nr7-nao-ocupacional";

  return "";
}

function createInfoItem(label: string, value: string | undefined): string {
  return `
    <div class="info-item">
      <div class="label">${label}</div>
      <div class="value">${value || "-"}</div>
    </div>
  `;
}

function createTabelaValores(data: any): string {
  return `
    <div class="table-title">Tabela de Limiares Auditivos (dB)</div>
    <table class="tabela-valores">
      <thead>
        <tr>
          <th rowspan="2">Via</th>
          <th colspan="2">250</th>
          <th colspan="2">500</th>
          <th colspan="2">1000</th>
          <th colspan="2">2000</th>
          <th colspan="2">3000</th>
          <th colspan="2">4000</th>
          <th colspan="2">6000</th>
          <th colspan="2">8000</th>
        </tr>
        <tr>
          <th>OD</th><th>OE</th><th>OD</th><th>OE</th><th>OD</th><th>OE</th>
          <th>OD</th><th>OE</th><th>OD</th><th>OE</th><th>OD</th><th>OE</th>
          <th>OD</th><th>OE</th><th>OD</th><th>OE</th>
        </tr>
      </thead>
      <tbody>
        <tr class="subcabecalho"><td colspan="17">Via Aérea</td></tr>
        <tr>
          <td>dB</td>
          <td>${data.viaAereaOD250 || "-"}</td>
          <td>${data.viaAereaOE250 || "-"}</td>
          <td>${data.viaAereaOD500 || "-"}</td>
          <td>${data.viaAereaOE500 || "-"}</td>
          <td>${data.viaAereaOD1000 || "-"}</td>
          <td>${data.viaAereaOE1000 || "-"}</td>
          <td>${data.viaAereaOD2000 || "-"}</td>
          <td>${data.viaAereaOE2000 || "-"}</td>
          <td>${data.viaAereaOD3000 || "-"}</td>
          <td>${data.viaAereaOE3000 || "-"}</td>
          <td>${data.viaAereaOD4000 || "-"}</td>
          <td>${data.viaAereaOE4000 || "-"}</td>
          <td>${data.viaAereaOD6000 || "-"}</td>
          <td>${data.viaAereaOE6000 || "-"}</td>
          <td>${data.viaAereaOD8000 || "-"}</td>
          <td>${data.viaAereaOE8000 || "-"}</td>
        </tr>
        <tr class="subcabecalho"><td colspan="17">Via Óssea</td></tr>
        <tr>
          <td>dB</td>
          <td>-</td><td>-</td>
          <td>${data.viaOsseaOD500 || "-"}</td>
          <td>${data.viaOsseaOE500 || "-"}</td>
          <td>${data.viaOsseaOD1000 || "-"}</td>
          <td>${data.viaOsseaOE1000 || "-"}</td>
          <td>${data.viaOsseaOD2000 || "-"}</td>
          <td>${data.viaOsseaOE2000 || "-"}</td>
          <td>${data.viaOsseaOD3000 || "-"}</td>
          <td>${data.viaOsseaOE3000 || "-"}</td>
          <td>${data.viaOsseaOD4000 || "-"}</td>
          <td>${data.viaOsseaOE4000 || "-"}</td>
          <td>-</td><td>-</td><td>-</td><td>-</td>
        </tr>
      </tbody>
    </table>
  `;
}

function createIRFSRT(data: any): string {
  const hasSrtOD = data.srtOD && data.srtOD.trim() !== "";
  const hasIrfOD = data.irfOD && data.irfOD.trim() !== "";
  const hasSrtOE = data.srtOE && data.srtOE.trim() !== "";
  const hasIrfOE = data.irfOE && data.irfOE.trim() !== "";

  const hasOD = hasSrtOD || hasIrfOD;
  const hasOE = hasSrtOE || hasIrfOE;

  if (!hasOD && !hasOE) {
    return "";
  }

  const renderRow = (label: string, value: string) => {
    if (!value || value.trim() === "") return "";

    return `<div style="font-size: 13px"><strong>${label}:</strong> ${value}</div>`;
  };

  return `
    <div class="irf-box">
      <h5 class="section-title" style="margin-bottom: 0">Testes de Fala (Logoaudiometria)</h5>
      <div class="irf-grid">
        ${
          hasOD
            ? `
        <div>
          <div class="label font-semibold text-red">OD</div>
          ${renderRow("SRT", data.srtOD)}
          ${renderRow("IRF", data.irfOD)}
        </div>
        `
            : ""
        }
        ${
          hasOE
            ? `
        <div>
          <div class="label font-semibold text-blue">OE</div>
          ${renderRow("SRT", data.srtOE)}
          ${renderRow("IRF", data.irfOE)}
        </div>
        `
            : ""
        }
      </div>
    </div>
  `;
}

function createObservacao(titulo: string, texto: string): string {
  return `
    <div class="alert alert-warning">
      <div>
        <strong>${titulo}:</strong> <span style="font-weight: normal">${texto}</span>
      </div>
    </div>
  `;
}

function formatCPF(cpf?: string): string {
  if (!cpf) return "Não informado";
  const cleaned = cpf.replace(/\\D/g, "");

  if (cleaned.length === 11) {
    return cleaned.replace(/(\\d{3})(\\d{3})(\\d{3})(\\d{2})/, "$1.$2.$3-$4");
  }

  return cpf;
}

function formatCNPJ(cnpj?: string): string {
  if (!cnpj) return "Não informado";
  const cleaned = cnpj.replace(/\\D/g, "");

  if (cleaned.length === 14) {
    return cleaned.replace(
      /(\\d{2})(\\d{3})(\\d{3})(\\d{4})(\\d{2})/,
      "$1.$2.$3/$4-$5",
    );
  }

  return cnpj;
}
