import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { PuppeteerService } from './puppeteer.service';

export interface HtmlPdfOptions {
  format?: 'A4' | 'A5' | 'Letter';
  margin?: {
    top?: string;
    bottom?: string;
    left?: string;
    right?: string;
  };
  printBackground?: boolean;
}

@Injectable()
export class HtmlPdfService {
  private readonly logger = new Logger(HtmlPdfService.name);
  private readonly templatesDir: string;

  constructor(private readonly puppeteerService: PuppeteerService) {
    this.templatesDir = path.join(
      process.cwd(),
      'src',
      'pdfmake',
      'html-templates',
    );
  }

  async generatePdf(
    templateName: string,
    data: Record<string, any>,
    options?: HtmlPdfOptions,
  ): Promise<Buffer> {
    const startTime = Date.now();

    try {
      const html = await this.renderTemplate(templateName, data);

      const browser = await this.puppeteerService.getBrowser();
      const page = await browser.newPage();

      try {
        await page.setContent(html, {
          waitUntil: 'networkidle0',
          timeout: 30000,
        });

        const pdfBuffer = await page.pdf({
          format: options?.format || 'A4',
          printBackground: options?.printBackground ?? true,
          margin: {
            top: options?.margin?.top || '20mm',
            bottom: options?.margin?.bottom || '25mm',
            left: options?.margin?.left || '20mm',
            right: options?.margin?.right || '20mm',
          },
        });

        const duration = Date.now() - startTime;
        this.logger.log(
          `PDF gerado com sucesso em ${duration}ms (template: ${templateName})`,
        );

        return Buffer.from(pdfBuffer);
      } finally {
        await page.close();
      }
    } catch (error) {
      this.logger.error(
        `Erro ao gerar PDF com template ${templateName}:`,
        error,
      );
      throw error;
    }
  }

  private async renderTemplate(
    templateName: string,
    data: Record<string, any>,
  ): Promise<string> {
    const templatePath = path.join(this.templatesDir, `${templateName}.html`);

    if (!fs.existsSync(templatePath)) {
      throw new Error(
        `Template HTML não encontrado: ${templateName}.html`,
      );
    }

    let html = fs.readFileSync(templatePath, 'utf-8');

    html = this.processTemplate(html, data);

    return html;
  }

  private processTemplate(html: string, data: Record<string, any>): string {
    const replaceValue = (value: any): string => {
      if (value === null || value === undefined) {
        return 'N/D';
      }
      if (typeof value === 'string') {
        return this.escapeHtml(value);
      }
      if (typeof value === 'number') {
        return String(value);
      }
      if (Array.isArray(value)) {
        return value.map(replaceValue).join(', ');
      }
      return this.escapeHtml(String(value));
    };

    html = html.replace(/\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_, key, content) => {
      return data[key] ? content : '';
    });

    html = html.replace(/\{\{#unless\s+(\w+)\}\}([\s\S]*?)\{\{\/unless\}\}/g, (_, key, content) => {
      return !data[key] ? content : '';
    });

    html = html.replace(/\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (_, key, content) => {
      const arr = data[key];
      if (!Array.isArray(arr)) return '';

      return arr.map((item: any) => {
        let itemHtml = content;
        for (const [k, v] of Object.entries(item)) {
          itemHtml = itemHtml.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), replaceValue(v));
        }
        return itemHtml;
      }).join('');
    });

    html = html.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_, key) => {
      const keys = key.split('.');
      let value = data;
      for (const k of keys) {
        value = value?.[k];
      }
      return replaceValue(value);
    });

    return html;
  }

  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }

  async getTemplateNames(): Promise<string[]> {
    if (!fs.existsSync(this.templatesDir)) {
      return [];
    }

    return fs
      .readdirSync(this.templatesDir)
      .filter((file) => file.endsWith('.html'))
      .map((file) => path.basename(file, '.html'));
  }
}