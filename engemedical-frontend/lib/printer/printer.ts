/*
Repository: https://www.npmjs.com/package/node-thermal-printer
*/

const path = require("node:path");

const {
  ThermalPrinter,
  PrinterTypes,
  CharacterSet,
  BreakLine,
} = require("node-thermal-printer");

async function printerService() {
  const numero = 0;

  let printer = new ThermalPrinter({
    // type: PrinterTypes.STAR,                                  // Printer type: 'star' or 'epson'
    interface: "tcp://" + process.env.THERMAL_PRINT_IP, // Printer interface
    characterSet: CharacterSet.PC852_LATIN2, // Printer character set
    removeSpecialCharacters: false, // Removes special characters - default: false
    lineCharacter: "=", // Set character for lines - default: "-"
    breakLine: BreakLine.WORD, // Break line after WORD or CHARACTERS. Disabled with NONE - default: WORD
    options: {
      // Additional options
      timeout: 3000, // Connection timeout (ms) [applicable only for network printers] - default: 3000
    },
  });

  // Verifica se impressora esta conectada...
  const checkConexao = await printer.isPrinterConnected();

  if (checkConexao) {
    printer.upsideDown(true);
    printer.alignCenter();

    // printer.invert(true);  // Background/text color inversion
    printer.setTextNormal();
    printer.println(`Emissão: ${new Date().toLocaleString("pt-br")}`);
    // printer.invert(false);  // Background/text color inversion

    printer.setTextSize(4, 4);
    printer.println(numero);

    printer.setTextQuadArea();
    printer.setTypeFontA();
    printer.bold(true);
    printer.println("SENHA");
    printer.newLine();

    const logoCmso = path.join(__dirname, "logohorizontal.png");

    await printer.printImage(logoCmso);

    printer.cut();

    try {
      await printer.execute();
      printer.clear();
      printer.beep();
    } catch (error) {
      console.error("Print error:", error);
    }
  } else {
    console.info("Impressora não esta conectada...");
  }
}

module.exports = printerService;
