const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { appLogs, LogLevel } = require("./appLogs");
export {};

function createTempLogFilePath() {
  const uniqueDir = fs.mkdtempSync(path.join(os.tmpdir(), "cmso360-logs-"));
  return path.join(uniqueDir, "logs.txt");
}

function readLogFile(filePath: string) {
  return fs.readFileSync(filePath, "utf8");
}

async function testWritesAppLogsToFile() {
  const logFilePath = createTempLogFilePath();
  appLogs.resetForTests();
  appLogs.initializeFileLogging(logFilePath);
  appLogs.setLevel(LogLevel.INFO);

  appLogs.info("Worker iniciado para teste");

  const content = readLogFile(logFilePath);
  assert.equal(content.includes("[INFO] Worker iniciado para teste"), true);
}

async function testCapturesConsoleErrorsToFile() {
  const logFilePath = createTempLogFilePath();
  appLogs.resetForTests();
  appLogs.initializeFileLogging(logFilePath);

  console.error("Falha capturada no console");

  const content = readLogFile(logFilePath);
  assert.equal(content.includes("Falha capturada no console"), true);
}

async function main() {
  await testWritesAppLogsToFile();
  await testCapturesConsoleErrorsToFile();
  appLogs.resetForTests();
  console.log("appLogs.spec.ts: ok");
}

main().catch((error: unknown) => {
  appLogs.resetForTests();
  console.error(error);
  process.exit(1);
});
