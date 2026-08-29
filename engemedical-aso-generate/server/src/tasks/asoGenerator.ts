import { Page } from "puppeteer";
import { AsoProcessingMessage } from "../web/types";

export async function asoGenerator(page: Page, certificate: AsoProcessingMessage) {
  await page.waitForSelector("#socframe");
  const iframe = await page.$("#socframe");
  const frame = await iframe?.contentFrame();

  const srcImage = "";
  await new Promise((resolve) => setTimeout(resolve, 2500));

  if (true) {
    await frame?.waitForSelector("#botoes > table > tbody > tr > td:nth-child(5) > img:nth-child(5)");
    await frame?.evaluate(() => {
      const serviceIcon = document.querySelector("#botoes > table > tbody > tr > td:nth-child(5) > img:nth-child(5)");
      //@ts-ignore
      serviceIcon.click();

      const asoIcon = document.querySelector("#divIconesOcultos > ul > li:nth-child(5) > a");
      //@ts-ignore
      asoIcon.click();
    });

    await new Promise((resolve) => setTimeout(resolve, 3500));

    await frame?.evaluate(() => {
      const printAso = document.querySelector("#botoes > table > tbody > tr > td:nth-child(5) > a:nth-child(10)");

      //@ts-ignore
      printAso.click();
    });

    await new Promise((resolve) => setTimeout(resolve, 8500));
  }
}
