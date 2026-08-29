export function buildWorkerAsoUpdate(
  workerResult: { url: string; documentHash?: string; filename?: string },
  updatedAt: Date,
) {
  return {
    $set: {
      ASOSTATUS: 'GERADO' as const,
      'ASOINFO.status': 'PENDENTE' as const,
      'ASOINFO.url': workerResult.url,
      'ASOINFO.signature.status': 'PENDENTE' as const,
      'ASOINFO.documentHash': workerResult.documentHash,
      'ASOINFO.workerUpdatedAt': updatedAt,
    },
  };
}

export function applyWorkerAsoToLocalDoc(
  doc: any,
  workerResult: { url: string; documentHash?: string; filename?: string },
  updatedAt: Date,
) {
  doc.ASOSTATUS = 'GERADO';
  doc.ASOINFO = {
    ...doc.ASOINFO,
    status: 'PENDENTE',
    url: workerResult.url,
    signature: { ...doc.ASOINFO?.signature, status: 'PENDENTE' },
    documentHash: workerResult.documentHash,
    workerUpdatedAt: updatedAt,
  };
}
