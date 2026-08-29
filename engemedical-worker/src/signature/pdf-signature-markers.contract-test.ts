import { strict as assert } from 'node:assert';

import {
  hasEmbeddedPdfSignature,
  readPdfSignatureMarkers,
} from './pdf-signature-markers';

const signedBuffer = Buffer.from(
  '%PDF-1.7\n1 0 obj\n<< /Type /Catalog /AcroForm 2 0 R >>\nendobj\n/ByteRange [0 10 20 30]\n/Contents <ABCDEF>\n/Sig',
  'latin1',
);

const unsignedBuffer = Buffer.from('%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>');

const signedMarkers = readPdfSignatureMarkers(signedBuffer);
assert.equal(signedMarkers.hasByteRange, true);
assert.equal(signedMarkers.hasContents, true);
assert.equal(signedMarkers.hasSig, true);
assert.equal(hasEmbeddedPdfSignature(signedBuffer), true);

const unsignedMarkers = readPdfSignatureMarkers(unsignedBuffer);
assert.equal(unsignedMarkers.hasByteRange, false);
assert.equal(unsignedMarkers.hasContents, false);
assert.equal(unsignedMarkers.hasSig, false);
assert.equal(hasEmbeddedPdfSignature(unsignedBuffer), false);

console.log(
  'OK hasEmbeddedPdfSignature reconhece marcadores PAdES e bloqueia PDFs sem assinatura embutida',
);
