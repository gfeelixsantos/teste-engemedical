export interface Message {
  id: string;
  title: string;
  content: string;
  contentType?: "text" | "html";
  date: string;
  isImportant?: boolean;
}

const SAFE_URL_PATTERN = /^(https?:|mailto:|tel:|#|\/)/i;
const SAFE_IMAGE_PATTERN = /^(https?:|data:image\/|\/)/i;

const stripDisallowedTags = (html: string): string => {
  return html
    .replace(
      /<\s*(script|style|iframe|object|embed|meta|link)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi,
      "",
    )
    .replace(
      /<\s*(script|style|iframe|object|embed|meta|link)[^>]*\/?\s*>/gi,
      "",
    );
};

const stripUnsafeAttributes = (html: string): string => {
  return html
    .replace(/\s+on[a-z]+\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi, "")
    .replace(/\s+style\s*=\s*(".*?"|'.*?')/gi, "");
};

const sanitizeHrefAndSrc = (html: string): string => {
  return html
    .replace(
      /\s+href\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/gi,
      (_m, _whole, g2, g3, g4) => {
        const value = (g2 ?? g3 ?? g4 ?? "").trim();

        if (!SAFE_URL_PATTERN.test(value)) return ' href="#"';

        return ` href="${value}"`;
      },
    )
    .replace(
      /\s+src\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/gi,
      (_m, _whole, g2, g3, g4) => {
        const value = (g2 ?? g3 ?? g4 ?? "").trim();

        if (!SAFE_IMAGE_PATTERN.test(value)) return "";

        return ` src="${value}"`;
      },
    );
};

const enforceLinkSafety = (html: string): string => {
  return html.replace(/<a\s+([^>]*?)>/gi, (_m, attrs: string) => {
    const cleanAttrs = attrs
      .replace(/\s+target\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi, "")
      .replace(/\s+rel\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi, "")
      .trim();

    return `<a ${cleanAttrs} target="_blank" rel="noopener noreferrer">`;
  });
};

export const sanitizeMessageHtml = (html: string): string => {
  const withoutBadTags = stripDisallowedTags(html);
  const withoutBadAttrs = stripUnsafeAttributes(withoutBadTags);
  const safeUrls = sanitizeHrefAndSrc(withoutBadAttrs);

  return enforceLinkSafety(safeUrls);
};

// Função para buscar mensagem atual (deve ser substituída por chamada à API)
// ... (mantenha as interfaces e funções de sanitização acima)

const getCurrentMessage = async (): Promise<Message | null> => {
  try {
    return {
      id: `msg_${new Date().getTime()}`,
      title: "CMSO 360 - Boletim de Atualizações | Março 2026",
      contentType: "html",
      content: `
        <div class="flex flex-col md:flex-row items-center justify-center gap-8 py-1">
          <div class="w-full md:w-2/3">
            <h3 class="text-xl font-bold mb-4">Destaques da versão</h3>
            <ul class="space-y-2">
              <li><strong>Aproveitamento inteligente de exames</strong> no mesmo ASO dentro de 30 dias.</li>
              <li><strong>Finalização de ultrassom</strong> diretamente pela tela de relatório.</li>
              <li><strong>Impressão do relatório de atendimento</strong> com fluxo simplificado.</li>
              <li><strong>Upload de anexos no relatório</strong> com rastreabilidade do atendimento.</li>
              <li><strong>Sincronização SOC (beta)</strong> para atualização cadastral e merge de exames.</li>
              <li><strong>Histórico de audiometrias anteriores</strong> disponível para análise clínica.</li>
            </ul>
          </div>
          <div class="w-full md:w-1/3 flex justify-center">
            <video
              autoplay
              loop
              muted
              playsinline
              class="w-full h-auto max-w-[200px] md:max-w-full rounded-lg"
              src="/images/gifs/work.webm"
            />
          </div>
        </div>
      `,
      date: new Date().toLocaleDateString("pt-BR"),
      isImportant: false,
    };
  } catch (error) {
    console.error("Erro ao buscar mensagem:", error);

    return null;
  }
};

export { getCurrentMessage };
