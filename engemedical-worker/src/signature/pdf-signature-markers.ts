export type PdfSignatureMarkers = {
  hasByteRange: boolean;
  hasContents: boolean;
  hasSig: boolean;
  hasAcroForm: boolean;
};

export function readPdfSignatureMarkers(buffer: Buffer): PdfSignatureMarkers {
  const ascii = buffer.toString('latin1');

  return {
    hasByteRange: ascii.includes('/ByteRange'),
    hasContents: ascii.includes('/Contents'),
    hasSig: ascii.includes('/Sig'),
    hasAcroForm: ascii.includes('/AcroForm'),
  };
}

export function hasEmbeddedPdfSignature(buffer: Buffer): boolean {
  const markers = readPdfSignatureMarkers(buffer);
  return (
    markers.hasByteRange &&
    markers.hasContents &&
    (markers.hasSig || markers.hasAcroForm)
  );
}
