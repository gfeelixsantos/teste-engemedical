import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import { EmailType } from './types/emailtype';
import { TemplateGenerate } from './templates/templateGenerate';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter;

  constructor() {
    this.validateEnv();
    this.transporter = this.createTransporter();
  }

  private createTransporter(): Transporter {
    this.logger.log('Inicializando transporter SMTP...');

    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_CONFIG_HOST,
      port: Number(process.env.EMAIL_CONFIG_PORT),
      secure: process.env.EMAIL_CONFIG_PORT === '465',
      auth: {
        user: process.env.EMAIL_CONFIG_USER,
        pass: process.env.EMAIL_CONFIG_PASS,
      },
      connectionTimeout: 20000,
    });

    transporter.verify((error) => {
      if (error) {
        this.logger.error('Falha ao conectar com o servidor SMTP:', error);
      } else {
        this.logger.log('Conexao SMTP validada com sucesso.');
      }
    });

    return transporter;
  }

  private validateEnv(): void {
    const requiredEnv = [
      'EMAIL_CONFIG_HOST',
      'EMAIL_CONFIG_PORT',
      'EMAIL_CONFIG_USER',
      'EMAIL_CONFIG_PASS',
    ];

    const missing = requiredEnv.filter((v) => !process.env[v]);
    if (missing.length > 0) {
      throw new Error(
        `As variaveis de ambiente ausentes para o servico de e-mail sao: ${missing.join(', ')}`,
      );
    }
  }

  async sendEmail(mail: EmailType): Promise<void> {
    mail = TemplateGenerate.render(mail);
    const html = String(mail.template || '').trim();
    const defaultFrom =
      process.env.EMAIL_FROM_DEFAULT ||
      `CMSO 360 <${process.env.EMAIL_CONFIG_USER}>`;

    const attachments = mail.attachment?.map((a) => ({
      filename: a.filename,
      content: a.content,
      contentType: a.contentType,
      path: a.path,
      cid: a.cid,
      ...(Buffer.isBuffer(a.content) ? {} : { encoding: a.encoding || 'base64' }),
    }));

    const options: any = {
      from: mail.from || defaultFrom,
      to: mail.to,
      cc: mail.cc,
      bcc: mail.bcc,
      replyTo: mail.replyTo,
      subject: mail.subject,
      text: this.buildPlainTextFallback(mail.subject, html),
      html: html || undefined,
      attachments,
      headers: {
        'X-Priority': '1',
        Importance: 'high',
        'X-MSMail-Priority': 'High',
        ...(mail.headers || {})
      },
    };

    await this.sendWithRetry(options, 3);
  }

  async sendGenericEmail(mailOptions: {
    to: string;
    cc?: string;
    bcc?: string;
    replyTo?: string;
    fromName?: string;
    subject: string;
    html?: string;
    text?: string;
    attachments?: Array<{ filename: string; path: string; cid?: string }>;
    headers?: any;
  }): Promise<void> {
    const defaultFrom =
      process.env.EMAIL_FROM_DEFAULT ||
      `CMSO 360 <${process.env.EMAIL_CONFIG_USER}>`;

    let from = defaultFrom;
    if (mailOptions.fromName) {
      from = `"${mailOptions.fromName}" <${process.env.EMAIL_CONFIG_USER}>`;
    }

    const options: any = {
      from,
      to: mailOptions.to,
      cc: mailOptions.cc,
      bcc: mailOptions.bcc,
      replyTo: mailOptions.replyTo,
      subject: mailOptions.subject,
      text: mailOptions.text || this.buildPlainTextFallback(mailOptions.subject, mailOptions.html),
      html: mailOptions.html,
      attachments: mailOptions.attachments,
      headers: {
        'X-Priority': '1',
        Importance: 'high',
        'X-MSMail-Priority': 'High',
        ...(mailOptions.headers || {})
      },
    };

    await this.sendWithRetry(options, 3);
  }

  private buildPlainTextFallback(subject: string, html?: string): string {
    const stripped = String(html || '')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|tr|li|h1|h2|h3|h4|h5|h6|td|th)>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/\r/g, '')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]{2,}/g, ' ')
      .trim();

    return stripped || subject || 'Mensagem automatica CMSO 360';
  }

  private async sendWithRetry(options: any, retries = 3): Promise<void> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        this.logger.log(
          `Enviando e-mail (tentativa ${attempt}/${retries})... to=${options.to} cc=${options.cc || '-'} bcc=${options.bcc || '-'}`,
        );
        await this.transporter.sendMail(options);
        this.logger.log(
          `E-mail enviado com sucesso para ${options.to} (bcc=${options.bcc || '-'})`,
        );
        return;
      } catch (error: any) {
        this.logger.error(
          `Erro ao enviar e-mail (tentativa ${attempt}):`,
          error,
        );

        if (
          process.env.BREVO_SMTP_HOST &&
          process.env.BREVO_SMTP_USER &&
          process.env.BREVO_SMTP_PASS
        ) {
          try {
            this.logger.warn(`Tentando envio via SMTP alternativo (Brevo)...`);
            const fallbackTransporter = nodemailer.createTransport({
              host: process.env.BREVO_SMTP_HOST,
              port: Number(process.env.BREVO_SMTP_PORT || 587),
              secure: process.env.BREVO_SMTP_PORT === '465',
              auth: {
                user: process.env.BREVO_SMTP_USER,
                pass: process.env.BREVO_SMTP_PASS,
              },
              connectionTimeout: 10000,
            });
            await fallbackTransporter.sendMail(options);
            this.logger.log(
              `E-mail enviado com sucesso via Brevo para ${options.to} (bcc=${options.bcc || '-'})`,
            );
            return;
          } catch (fallbackError: any) {
            this.logger.error(
              `Erro ao enviar e-mail via Brevo: ${fallbackError.message}`,
            );
          }
        }

        const isLastAttempt = attempt === retries;
        if (isLastAttempt) {
          this.logger.fatal?.(
            `Falha definitiva ao enviar e-mail: ${error.message}`,
          );
          throw new Error(`Falha ao enviar e-mail: ${error.message}`);
        }

        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
  }
}
