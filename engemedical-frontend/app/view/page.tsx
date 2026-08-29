"use client";

import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { Suspense } from "react";

function ViewerContent() {
  const params = useSearchParams();
  const docName = params.get("name") || "Documento";
  const blobUrl = params.get("url");

  if (!blobUrl) {
    return (
      <div style={styles.error}>
        <p>URL do documento não fornecida.</p>
      </div>
    );
  }

  const proxyUrl = `/api/blob/proxy?url=${encodeURIComponent(blobUrl)}&_t=${Date.now()}`;

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <Image
            alt="CMSO 360"
            height={40}
            src="/images/logo.png"
            width={140}
            priority
            style={{ height: 40, width: "auto" }}
          />
          <span style={styles.separator} />
          <span style={styles.title}>Visualizador</span>
        </div>
        <div style={styles.badge}>Documento Protegido</div>
      </header>
      <iframe
        src={proxyUrl}
        style={styles.iframe}
        title={docName}
      />
    </div>
  );
}

export default function ViewPage() {
  return (
    <Suspense fallback={<div style={styles.loading}>Carregando...</div>}>
      <ViewerContent />
    </Suspense>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    margin: 0,
    padding: 0,
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
    background: "#f8faf9",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 24px",
    height: 64,
    background: "#fff",
    borderBottom: "1px solid #e5e7eb",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
    flexShrink: 0,
    zIndex: 10,
  },
  headerInner: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    minWidth: 0,
  },
  separator: {
    width: 1,
    height: 28,
    background: "#e5e7eb",
    flexShrink: 0,
  },
  title: {
    fontSize: 14,
    fontWeight: 600,
    color: "#1a3d2c",
    letterSpacing: 0.5,
    whiteSpace: "nowrap" as const,
  },
  badge: {
    fontSize: 10,
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: 1,
    padding: "5px 12px",
    borderRadius: 6,
    background: "#f0fdf4",
    color: "#166534",
    border: "1px solid #bbf7d0",
    flexShrink: 0,
    marginLeft: 16,
  },
  iframe: {
    flex: 1,
    border: "none",
    width: "100%",
    height: "100%",
  },
  loading: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100vh",
    fontFamily: "system-ui, sans-serif",
    color: "#666",
    fontSize: 14,
  },
  error: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100vh",
    fontFamily: "system-ui, sans-serif",
    color: "#c00",
    fontSize: 14,
  },
};
