import test from "node:test";
import assert from "node:assert/strict";

const { handleBlobExplorerList } = await import(
  "../app/api/blob-explorer/list/handler.mjs"
);

test("retorna 400 quando empresa, ano ou mes nao forem informados", async () => {
  const response = await handleBlobExplorerList({
    ano: "",
    mes: "05",
    codigoEmpresa: "",
    container: "documents",
    listBlobs: async () => [],
  });

  assert.equal(response.status, 400);
  assert.equal(
    response.body,
    JSON.stringify({
      message: "Os parâmetros 'codigoEmpresa', 'ano' e 'mes' são obrigatórios.",
    }),
  );
});

test("lista blobs do periodo e filtra a empresa no servidor", async () => {
  const response = await handleBlobExplorerList({
    ano: "2026",
    mes: "05",
    codigoEmpresa: "1733915",
    container: "documents",
    listBlobs: async (prefix, container) => {
      assert.equal(prefix, "aso/2026/05/");
      assert.equal(container, "documents");

      return [
        {
          name: "aso/2026/05/1733915/prontuario-a/ASO_1.pdf",
          size: 10,
          lastModified: "2026-05-10T00:00:00.000Z",
          metadata: { codigoEmpresa: "1733915" },
        },
        {
          name: "aso/2026/05/999999/prontuario-b/ASO_2.pdf",
          size: 11,
          lastModified: "2026-05-10T00:00:00.000Z",
          metadata: { codigoEmpresa: "999999" },
        },
        {
          name: "aso/2026/05/1733915/prontuario-c/ASO_3.pdf",
          size: 12,
          lastModified: "2026-05-11T00:00:00.000Z",
        },
      ];
    },
  });

  assert.equal(response.status, 200);

  const body = JSON.parse(response.body);

  assert.equal(body.prefix, "aso/2026/05/");
  assert.equal(body.container, "documents");
  assert.equal(body.blobs.length, 2);
  assert.equal(body.blobs[0].name, "aso/2026/05/1733915/prontuario-a/ASO_1.pdf");
  assert.equal(body.blobs[1].name, "aso/2026/05/1733915/prontuario-c/ASO_3.pdf");
});
