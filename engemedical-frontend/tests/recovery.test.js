/**
 * Testes Unitários - Recuperação de Senha
 * Executar: node tests/recovery.test.js
 */

const testCases = [
  {
    name: "Validar código de recuperação - CPF sem máscara",
    input: {
      cpf: "42889178838",
      codigoRecuperacao: "05438",
    },
    expected: {
      valid: true,
    },
  },
  {
    name: "Validar código de recuperação - CPF com máscara",
    input: {
      cpf: "428.891.788-38",
      codigoRecuperacao: "05438",
    },
    expected: {
      valid: true,
    },
  },
  {
    name: "Código inválido - wrong code",
    input: {
      cpf: "42889178838",
      codigoRecuperacao: "99999",
    },
    expected: {
      valid: false,
    },
  },
  {
    name: "Código com zeros à esquerda - código 100",
    input: {
      cpf: "12345678901",
      codigoRecuperacao: "00190",
    },
    expected: {
      valid: true,
    },
  },
  {
    name: "CPF não encontrado",
    input: {
      cpf: "00000000000",
      codigoRecuperacao: "05438",
    },
    expected: {
      valid: false,
      userFound: false,
    },
  },
];

function generateRecoveryCode(cpf, codigoRegistro) {
  const cpfNormalizado = cpf.replace(/\D/g, "");
  const codigoRegistroStr = String(codigoRegistro);
  const codigoInvertido = codigoRegistroStr.split("").reverse().join("");
  const ultimos2Cpf = cpfNormalizado.slice(-2);
  return codigoInvertido + ultimos2Cpf;
}

function validateRecoveryCode(cpf, codigoRecuperacao, mockUser) {
  if (!mockUser) {
    return { valid: false, reason: "Usuário não encontrado" };
  }

  const codigoRegistroStr = String(mockUser.codigo);
  const codigoInvertido = codigoRegistroStr.split("").reverse().join("");
  const ultimos2Cpf = cpf.slice(-2);
  const expectedCode = codigoInvertido + ultimos2Cpf;

  const isValid = expectedCode === codigoRecuperacao;

  return { valid: isValid, reason: isValid ? "Código válido" : "Código inválido" };
}

const expectedCode = generateRecoveryCode(cpf, mockUser.codigo);
const isValid = expectedCode === codigoRecuperacao;

return {
  valid: isValid,
  reason: isValid ? "Código válido" : "Código inválido",
};


console.log("=".repeat(60));
console.log("TESTES - RECUPERAÇÃO DE SENHA");
console.log("=".repeat(60));

let passed = 0;
let failed = 0;

const mockUsers = {
  42889178838: { codigo: "450", nome: "Test User" },
  12345678901: { codigo: "100", nome: "Test User 2" },
};

testCases.forEach((tc, index) => {
  console.log(`\n[${index + 1}] ${tc.name}`);
  console.log(
    `  Input: CPF=${tc.input.cpf}, CodigoRecuperacao=${tc.input.codigoRecuperacao}`,
  );

  const cpfNormalizado = tc.input.cpf.replace(/\D/g, "");
  const mockUser = mockUsers[cpfNormalizado];

  if (!tc.expected.userFound && tc.expected.userFound !== undefined) {
    const result = validateRecoveryCode(
      cpfNormalizado,
      tc.input.codigoRecuperacao,
      null,
    );
    const success = result.valid === tc.expected.valid;
    console.log(
      `  Result: ${success ? "PASS" : "FAIL"} (expected valid=${tc.expected.valid}, got=${result.valid})`,
    );
    success ? passed++ : failed++;
  } else {
    const result = validateRecoveryCode(
      cpfNormalizado,
      tc.input.codigoRecuperacao,
      mockUser,
    );
    const success = result.valid === tc.expected.valid;
    console.log(
      `  Result: ${success ? "PASS" : "FAIL"} (expected valid=${tc.expected.valid}, got=${result.valid})`,
    );
    if (tc.expected.recoveryCode) {
      const generated = generateRecoveryCode(
        tc.input.cpf,
        tc.input.codigoRecuperacao,
      );
      console.log(
        `  Generated Code: ${generated} (expected: ${tc.expected.recoveryCode})`,
      );
    }
    success ? passed++ : failed++;
  }
});

console.log("\n" + "=".repeat(60));
console.log(`RESULTADO: ${passed} passed, ${failed} failed`);
console.log("=".repeat(60));

process.exit(failed > 0 ? 1 : 0);
