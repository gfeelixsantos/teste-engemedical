"use client";

import LoadingState from "./LoadingState";

interface CustomAppLoadingProps {
  title?: string;
  description?: string;
  size?: "sm" | "md" | "lg";
  fullHeight?: boolean;
  showProgress?: boolean;
}

/** Compatibilidade para chamadas antigas; a apresentação agora é centralizada. */
export default function CustomAppLoading({
  title = "Carregando",
  description = "Aguarde um momento...",
  fullHeight = true,
}: CustomAppLoadingProps) {
  return (
    <LoadingState
      description={description}
      title={title}
      variant={fullHeight ? "page" : "section"}
    />
  );
}