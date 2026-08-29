import { buildBlobPeriodPrefix } from "../../../arquivos/lib/blob-explorer-periods.mjs";

function extractCompanyCode(blob) {
  if (blob?.metadata?.codigoEmpresa) {
    return String(blob.metadata.codigoEmpresa);
  }

  const parts = String(blob?.name ?? "").split("/");

  return parts[3] ? String(parts[3]) : "";
}

export async function handleBlobExplorerList({
  ano,
  mes,
  codigoEmpresa,
  container = "documents",
  listBlobs,
}) {
  if (!ano || !mes || !codigoEmpresa) {
    return {
      status: 400,
      body: JSON.stringify({
        message: "Os parâmetros 'codigoEmpresa', 'ano' e 'mes' são obrigatórios.",
      }),
    };
  }

  const prefix = buildBlobPeriodPrefix({ ano, mes });
  const blobs = await listBlobs(prefix, container);
  const filteredBlobs = blobs.filter(
    (blob) => extractCompanyCode(blob) === String(codigoEmpresa),
  );

  return {
    status: 200,
    body: JSON.stringify({
      blobs: filteredBlobs,
      prefix,
      container,
    }),
  };
}
