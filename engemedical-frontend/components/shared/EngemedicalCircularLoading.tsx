import LoadingState from "./LoadingState";

interface EngemedicalCircularLoadingProps {
  title?: string;
  description?: string;
  /** Mantidos para compatibilidade com chamadas legadas; o visual agora é centralizado. */
  iconSize?: number;
  spinnerColor?: string;
  fullHeight?: boolean;
}

export default function EngemedicalCircularLoading({
  title = "Carregando",
  description = "Aguarde um momento...",
  fullHeight = true,
}: EngemedicalCircularLoadingProps) {
  return (
    <LoadingState
      className={fullHeight ? "" : "min-h-[200px] py-8"}
      description={description}
      title={title}
      variant={fullHeight ? "page" : "section"}
    />
  );
}
