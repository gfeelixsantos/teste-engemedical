import fs from "node:fs";
import path from "node:path";

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

type ConsoleMethodName = "log" | "info" | "warn" | "error" | "debug";

type OriginalConsoleMethods = Record<ConsoleMethodName, (...args: any[]) => void>;

export class appLogs {
  private static currentLevel: LogLevel = LogLevel.INFO;
  private static logFilePath = path.join(process.cwd(), "logs.txt");
  private static initialized = false;
  private static originalConsole: OriginalConsoleMethods = {
    log: console.log.bind(console),
    info: console.info.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
    debug: console.debug.bind(console),
  };

  static setLevel(level: LogLevel): void {
    this.currentLevel = level;
  }

  static initializeFileLogging(logFilePath?: string): void {
    this.logFilePath = logFilePath || path.join(process.cwd(), "logs.txt");
    this.ensureLogFile();

    if (!this.initialized) {
      this.captureConsole();
      this.initialized = true;
    }
  }

  static debug(message: string, ...args: any[]): void {
    if (this.currentLevel <= LogLevel.DEBUG) {
      this.emit("DEBUG", "debug", message, ...args);
    }
  }

  static info(message: string, ...args: any[]): void {
    if (this.currentLevel <= LogLevel.INFO) {
      this.emit("INFO", "log", message, ...args);
    }
  }

  static warn(message: string, ...args: any[]): void {
    if (this.currentLevel <= LogLevel.WARN) {
      this.emit("WARN", "warn", message, ...args);
    }
  }

  static error(err: any, message?: string): void {
    if (this.currentLevel <= LogLevel.ERROR) {
      const renderedError = this.serializeArg(err);
      const composedMessage = message ? `${message}: ${renderedError}` : renderedError;
      this.emit("ERROR", "error", composedMessage);
    }
  }

  static registerLog(err: any) {
    this.error(err);
  }

  static resetForTests(): void {
    console.log = this.originalConsole.log;
    console.info = this.originalConsole.info;
    console.warn = this.originalConsole.warn;
    console.error = this.originalConsole.error;
    console.debug = this.originalConsole.debug;
    this.initialized = false;
    this.currentLevel = LogLevel.INFO;
    this.logFilePath = path.join(process.cwd(), "logs.txt");
  }

  private static captureConsole(): void {
    console.log = (...args: any[]) => {
      this.writeConsoleLine("LOG", args);
      this.originalConsole.log(...args);
    };

    console.info = (...args: any[]) => {
      this.writeConsoleLine("INFO", args);
      this.originalConsole.info(...args);
    };

    console.warn = (...args: any[]) => {
      this.writeConsoleLine("WARN", args);
      this.originalConsole.warn(...args);
    };

    console.error = (...args: any[]) => {
      this.writeConsoleLine("ERROR", args);
      this.originalConsole.error(...args);
    };

    console.debug = (...args: any[]) => {
      this.writeConsoleLine("DEBUG", args);
      this.originalConsole.debug(...args);
    };
  }

  private static emit(levelLabel: string, consoleMethod: ConsoleMethodName, message: string, ...args: any[]): void {
    const line = `${this.getTimestamp()} [${levelLabel}] ${[message, ...args].map((arg) => this.serializeArg(arg)).join(" ")}`.trim();
    this.appendLine(line);
    this.originalConsole[consoleMethod](line);
  }

  private static writeConsoleLine(levelLabel: string, args: any[]): void {
    const line = `${this.getTimestamp()} [${levelLabel}] ${args.map((arg) => this.serializeArg(arg)).join(" ")}`.trim();
    this.appendLine(line);
  }

  private static ensureLogFile(): void {
    const directory = path.dirname(this.logFilePath);
    fs.mkdirSync(directory, { recursive: true });
    if (!fs.existsSync(this.logFilePath)) {
      fs.writeFileSync(this.logFilePath, "", "utf8");
    }
  }

  private static appendLine(line: string): void {
    this.ensureLogFile();
    fs.appendFileSync(this.logFilePath, `${line}\n`, "utf8");
  }

  private static getTimestamp(): string {
    return `[${new Date().toLocaleDateString("pt-BR")} ${new Date().toLocaleTimeString("pt-BR")}]`;
  }

  private static serializeArg(arg: any): string {
    if (arg instanceof Error) {
      return arg.stack || `${arg.name}: ${arg.message}`;
    }

    if (typeof arg === "string") {
      return arg;
    }

    if (arg === undefined) {
      return "undefined";
    }

    if (arg === null) {
      return "null";
    }

    try {
      return JSON.stringify(arg);
    } catch {
      return String(arg);
    }
  }
}
