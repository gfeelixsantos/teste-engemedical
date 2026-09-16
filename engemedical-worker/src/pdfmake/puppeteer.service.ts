import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import * as puppeteer from 'puppeteer-core';

@Injectable()
export class PuppeteerService implements OnModuleDestroy {
  private readonly logger = new Logger(PuppeteerService.name);
  private browser: puppeteer.Browser | null = null;
  private isInitializing = false;

  async getBrowser(): Promise<puppeteer.Browser> {
    if (this.browser) {
      return this.browser;
    }

    if (this.isInitializing) {
      await this.waitForBrowser();
      return this.browser!;
    }

    this.isInitializing = true;

    try {
      const executablePath =
        process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/google-chrome-stable';

      this.logger.log(`Inicializando Puppeteer com Chrome: ${executablePath}`);

      this.browser = await puppeteer.launch({
        headless: true,
        executablePath,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-extensions',
        ],
      });

      this.logger.log('Puppeteer inicializado com sucesso');
      return this.browser;
    } catch (error) {
      this.logger.error('Erro ao inicializar Puppeteer:', error);
      throw error;
    } finally {
      this.isInitializing = false;
    }
  }

  private async waitForBrowser(): Promise<void> {
    return new Promise((resolve) => {
      const check = setInterval(() => {
        if (this.browser) {
          clearInterval(check);
          resolve();
        }
      }, 100);
    });
  }

  async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.logger.log('Puppeteer browser fechado');
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.closeBrowser();
  }
}