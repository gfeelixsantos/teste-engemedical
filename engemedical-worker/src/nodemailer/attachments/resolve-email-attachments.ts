import { Logger } from '@nestjs/common';
import { Attachment } from '../types/emailtype';

export type BlobAttachmentReference = {
  container: string;
  blobName: string;
};

export async function resolveEmailAttachments(
  attachments: Attachment[],
  downloadBlob: (container: string, blobName: string) => Promise<Buffer>,
  logger?: Logger,
): Promise<{
  attachments: Attachment[];
  blobBackedAttachments: BlobAttachmentReference[];
}> {
  const resolved: Attachment[] = [];
  const blobBackedAttachments: BlobAttachmentReference[] = [];

  for (const attachment of attachments || []) {
    if (attachment.content || attachment.path) {
      resolved.push(attachment);
      continue;
    }

    if (attachment.container && attachment.blobName) {
      try {
        const buffer = await downloadBlob(
          attachment.container,
          attachment.blobName,
        );

        resolved.push({
          ...attachment,
          content: buffer,
        });
        blobBackedAttachments.push({
          container: attachment.container,
          blobName: attachment.blobName,
        });
      } catch (err) {
        logger?.warn(
          `Anexo ${attachment.filename} (${attachment.blobName}) nao encontrado no blob. Enviando email sem este anexo. Erro: ${err}`,
        );
      }
      continue;
    }

    throw new Error(
      `Anexo ${attachment.filename} sem conteudo e sem referencia de blob.`,
    );
  }

  return {
    attachments: resolved,
    blobBackedAttachments,
  };
}
