import { SftpEmailWorker } from './sftp-email.worker';

describe('SftpEmailWorker', () => {
  it('adapts the Cloudflare SFTP email payload to EmailService', async () => {
    const queueService = {
      ack: jest.fn().mockResolvedValue(true),
      retry: jest.fn().mockResolvedValue(true),
    };
    const emailService = {
      sendEmail: jest.fn().mockResolvedValue(undefined),
    };
    const worker = new SftpEmailWorker(queueService as any, emailService as any);
    const content = Buffer.from('excel-content');

    await (worker as any).processMessage(
      'message-1',
      JSON.stringify({
        to: ['felix.devx@gmail.com'],
        subject: '[DRY-RUN] Inativação SOC',
        html: '<h1>Validação segura finalizada</h1>',
        attachments: [
          {
            filename: 'relatorio.xlsx',
            content: content.toString('base64'),
            contentType:
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          },
        ],
      }),
    );

    expect(emailService.sendEmail).toHaveBeenCalledWith({
      to: ['felix.devx@gmail.com'],
      subject: '[DRY-RUN] Inativação SOC',
      template: '<h1>Validação segura finalizada</h1>',
      templatename: 'CUSTOM_HTML',
      attachment: [
        {
          filename: 'relatorio.xlsx',
          content,
          contentType:
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
      ],
    });
    expect(queueService.ack).toHaveBeenCalledWith('message-1');
  });
});
