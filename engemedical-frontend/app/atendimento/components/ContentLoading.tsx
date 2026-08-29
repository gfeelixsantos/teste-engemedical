import { Spinner } from "@heroui/react";

interface ContentLoadingProps {
  title?: string;
  description?: string;
}

export default function ContentLoading({
  title = "Recebendo Atendimentos",
  description = "Aguarde...",
}: ContentLoadingProps) {
  return (
    <div
      aria-label="Carregando atendimentos"
      aria-live="polite"
      className="min-h-screen flex items-center justify-center bg-default-50/50"
      role="status"
    >
      <div className="text-center space-y-6">
        {/* Spinner do HeroUI com tamanho personalizado e cor primária */}
        <div className="flex justify-center">
          <Spinner
            aria-label="Carregando"
            classNames={{
              circle1: "border-b-green-700",
              circle2: "border-b-yellow-400",
              wrapper: "w-16 h-16",
            }}
            color="success"
            size="lg"
          />
        </div>

        {/* Conteúdo textual com animação sutil */}
        <div className="space-y-2">
          <h3 className="text-xl font-semibold text-default-700">
            {title}
          </h3>
          <p className="text-default-500 text-medium" id="loading-description">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}
