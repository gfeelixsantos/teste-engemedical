import LoadingState from "@/components/shared/LoadingState";

interface ContentLoadingProps {
  title?: string;
  description?: string;
}

export default function ContentLoading({
  title = "Recebendo Atendimentos",
  description = "Aguarde...",
}: ContentLoadingProps) {
  return <LoadingState description={description} title={title} variant="page" />;
}
