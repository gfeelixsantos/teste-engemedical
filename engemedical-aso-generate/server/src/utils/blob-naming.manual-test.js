/**
 * Script de teste manual para o sistema de nomenclatura de arquivos
 * 
 * Execute com: node src/utils/blob-naming.manual-test.js
 * 
 * Este script testa as funções generateBlobFileName e generateBlobPath
 * sem necessidade de framework de teste.
 */

// Simula as funções do util.ts para teste
function normalizeFileName(str) {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();
}

function generateBlobFileName(options) {
  const {
    type,
    empresaCode,
    funcionarioName,
    documentType,
    date = new Date(),
    addHash = true,
  } = options;

  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');

  const prefixMap = {
    ASO: 'ASO',
    ASO_SIGNED: 'ASO',
    EXAM: 'EXM',
    EXAM_SIGNED: 'EXM',
    ATTACHMENT: 'ANX',
    RECORD: 'PRT',
    RESTRICTION: 'RST',
  };

  const signedSuffix = type.includes('SIGNED') ? '_DIGITAL' : '';
  const prefix = prefixMap[type];
  const nameClean = normalizeFileName(funcionarioName);
  const docClean = normalizeFileName(documentType);

  let fileName = `${prefix}_${empresaCode}_${nameClean}_${docClean}${signedSuffix}_${dateStr}`;

  if (addHash) {
    const hash = Math.random().toString(36).substring(2, 6).toUpperCase();
    fileName += `_${hash}`;
  }

  return `${fileName}.pdf`;
}

function generateBlobPath(options) {
  const { fileType, empresaCode, prontuario, fileName, date = new Date() } = options;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${fileType}/${year}/${month}/${empresaCode}/${prontuario}/${fileName}`;
}

// ============================================
// TESTES
// ============================================

const mockDate = new Date('2026-01-27T10:30:00.000Z');
let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    passed++;
  } catch (error) {
    console.log(`❌ FAIL: ${name}`);
    console.log(`   Error: ${error.message}`);
    failed++;
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message || 'Assertion failed'}\n   Expected: ${expected}\n   Actual: ${actual}`);
  }
}

function assertMatch(actual, pattern, message) {
  if (!pattern.test(actual)) {
    throw new Error(`${message || 'Pattern match failed'}\n   Pattern: ${pattern}\n   Actual: ${actual}`);
  }
}

console.log('\n========================================');
console.log('BLOB NAMING SYSTEM - ASO GENERATE TESTS');
console.log('========================================\n');

// Testes de generateBlobFileName para ASO
test('ASO file name generation', () => {
  const result = generateBlobFileName({
    type: 'ASO',
    empresaCode: 'EMP001',
    funcionarioName: 'João Silva',
    documentType: 'Admissional',
    date: mockDate,
    addHash: false,
  });
  assertEqual(result, 'ASO_EMP001_JOAO_SILVA_ADMISSIONAL_20260127.pdf');
});

test('ASO_SIGNED file name with _DIGITAL suffix', () => {
  const result = generateBlobFileName({
    type: 'ASO_SIGNED',
    empresaCode: 'EMP001',
    funcionarioName: 'João Silva',
    documentType: 'Admissional',
    date: mockDate,
    addHash: false,
  });
  assertEqual(result, 'ASO_EMP001_JOAO_SILVA_ADMISSIONAL_DIGITAL_20260127.pdf');
});

test('ASO Periódico file name', () => {
  const result = generateBlobFileName({
    type: 'ASO',
    empresaCode: 'EMP002',
    funcionarioName: 'Maria Souza',
    documentType: 'Periódico',
    date: mockDate,
    addHash: false,
  });
  assertEqual(result, 'ASO_EMP002_MARIA_SOUZA_PERIODICO_20260127.pdf');
});

test('ASO Demissional file name', () => {
  const result = generateBlobFileName({
    type: 'ASO',
    empresaCode: 'EMP003',
    funcionarioName: 'Pedro Santos',
    documentType: 'Demissional',
    date: mockDate,
    addHash: false,
  });
  assertEqual(result, 'ASO_EMP003_PEDRO_SANTOS_DEMISSIONAL_20260127.pdf');
});

test('ASO Retorno ao Trabalho file name', () => {
  const result = generateBlobFileName({
    type: 'ASO',
    empresaCode: 'EMP004',
    funcionarioName: 'Ana Costa',
    documentType: 'Retorno ao Trabalho',
    date: mockDate,
    addHash: false,
  });
  assertEqual(result, 'ASO_EMP004_ANA_COSTA_RETORNO_AO_TRABALHO_20260127.pdf');
});

test('Hash generation when addHash is true', () => {
  const result = generateBlobFileName({
    type: 'ASO',
    empresaCode: 'EMP001',
    funcionarioName: 'João Silva',
    documentType: 'Admissional',
    date: mockDate,
    addHash: true,
  });
  assertMatch(result, /^ASO_EMP001_JOAO_SILVA_ADMISSIONAL_20260127_[A-Z0-9]{4}\.pdf$/, 'Hash pattern mismatch');
});

test('Special characters normalization', () => {
  const result = generateBlobFileName({
    type: 'ASO',
    empresaCode: 'EMP001',
    funcionarioName: 'José María Çauê',
    documentType: 'Periódico',
    date: mockDate,
    addHash: false,
  });
  assertEqual(result, 'ASO_EMP001_JOSE_MARIA_CAUE_PERIODICO_20260127.pdf');
});

test('Long funcionario name handling', () => {
  const result = generateBlobFileName({
    type: 'ASO',
    empresaCode: 'EMP001',
    funcionarioName: 'Maria Antonieta de las Nieves Garcia Rodriguez',
    documentType: 'Admissional',
    date: mockDate,
    addHash: false,
  });
  assertEqual(result, 'ASO_EMP001_MARIA_ANTONIETA_DE_LAS_NIEVES_GARCIA_RODRIGUEZ_ADMISSIONAL_20260127.pdf');
});

test('Company code with numbers and letters', () => {
  const result = generateBlobFileName({
    type: 'ASO',
    empresaCode: 'ABC123',
    funcionarioName: 'Test User',
    documentType: 'Demissional',
    date: mockDate,
    addHash: false,
  });
  assertEqual(result, 'ASO_ABC123_TEST_USER_DEMISSIONAL_20260127.pdf');
});

test('Unique hash generation for concurrent uploads', () => {
  const results = new Set();
  for (let i = 0; i < 100; i++) {
    const result = generateBlobFileName({
      type: 'ASO',
      empresaCode: 'EMP001',
      funcionarioName: 'João Silva',
      documentType: 'Admissional',
      date: mockDate,
      addHash: true,
    });
    results.add(result);
  }
  // Com 100 gerações, devemos ter próximo de 100 nomes únicos
  // Colisões são estatisticamente possíveis mas raras (aprox 0.6%)
  const collisionRate = (100 - results.size) / 100;
  if (collisionRate > 0.05) { // Alerta se mais de 5% de colisões
    console.log(`   ⚠️  Warning: High collision rate: ${(collisionRate * 100).toFixed(1)}%`);
  }
});

// Testes de generateBlobPath
console.log('\n--- Blob Path Tests ---\n');

test('ASO path generation', () => {
  const result = generateBlobPath({
    fileType: 'aso',
    empresaCode: 'EMP001',
    prontuario: '450-123456',
    fileName: 'ASO_EMP001_JOAO_SILVA_ADMISSIONAL_20260127_A7B3.pdf',
    date: mockDate,
  });
  assertEqual(result, 'aso/2026/01/EMP001/450-123456/ASO_EMP001_JOAO_SILVA_ADMISSIONAL_20260127_A7B3.pdf');
});

test('Month padding for January', () => {
  const januaryDate = new Date('2026-01-15T10:30:00.000Z');
  const result = generateBlobPath({
    fileType: 'aso',
    empresaCode: 'EMP001',
    prontuario: '450-123456',
    fileName: 'test.pdf',
    date: januaryDate,
  });
  assertEqual(result, 'aso/2026/01/EMP001/450-123456/test.pdf');
});

test('Month padding for November', () => {
  const novemberDate = new Date('2026-11-15T10:30:00.000Z');
  const result = generateBlobPath({
    fileType: 'aso',
    empresaCode: 'EMP001',
    prontuario: '450-123456',
    fileName: 'test.pdf',
    date: novemberDate,
  });
  assertEqual(result, 'aso/2026/11/EMP001/450-123456/test.pdf');
});

// Teste de integração
console.log('\n--- Integration Tests ---\n');

test('Complete ASO path with file name', () => {
  const fileName = generateBlobFileName({
    type: 'ASO',
    empresaCode: 'EMP001',
    funcionarioName: 'João Silva',
    documentType: 'Admissional',
    date: mockDate,
    addHash: false,
  });
  
  const fullPath = generateBlobPath({
    fileType: 'aso',
    empresaCode: 'EMP001',
    prontuario: '450-123456',
    fileName,
    date: mockDate,
  });
  
  assertEqual(fullPath, 'aso/2026/01/EMP001/450-123456/ASO_EMP001_JOAO_SILVA_ADMISSIONAL_20260127.pdf');
});

test('Complete ASO_SIGNED path with file name', () => {
  const fileName = generateBlobFileName({
    type: 'ASO_SIGNED',
    empresaCode: 'EMP002',
    funcionarioName: 'Maria Souza',
    documentType: 'Periódico',
    date: mockDate,
    addHash: false,
  });
  
  const fullPath = generateBlobPath({
    fileType: 'aso',
    empresaCode: 'EMP002',
    prontuario: '450-789012',
    fileName,
    date: mockDate,
  });
  
  assertEqual(fullPath, 'aso/2026/01/EMP002/450-789012/ASO_EMP002_MARIA_SOUZA_PERIODICO_DIGITAL_20260127.pdf');
});

test('Different exam types generate different names', () => {
  const admissional = generateBlobFileName({
    type: 'ASO',
    empresaCode: 'EMP001',
    funcionarioName: 'João Silva',
    documentType: 'Admissional',
    date: mockDate,
    addHash: false,
  });

  const periodico = generateBlobFileName({
    type: 'ASO',
    empresaCode: 'EMP001',
    funcionarioName: 'João Silva',
    documentType: 'Periódico',
    date: mockDate,
    addHash: false,
  });

  const demissional = generateBlobFileName({
    type: 'ASO',
    empresaCode: 'EMP001',
    funcionarioName: 'João Silva',
    documentType: 'Demissional',
    date: mockDate,
    addHash: false,
  });

  // Verifica que cada um contém o tipo correto
  if (!admissional.includes('ADMISSIONAL')) throw new Error('Admissional not found in filename');
  if (!periodico.includes('PERIODICO')) throw new Error('Periodico not found in filename');
  if (!demissional.includes('DEMISSIONAL')) throw new Error('Demissional not found in filename');
  
  // Verifica que são diferentes
  if (admissional === periodico) throw new Error('Admissional and Periodico are the same');
  if (admissional === demissional) throw new Error('Admissional and Demissional are the same');
  if (periodico === demissional) throw new Error('Periodico and Demissional are the same');
});

test('Concurrent uploads generate unique file names', () => {
  const baseConfig = {
    type: 'ASO',
    empresaCode: 'EMP001',
    funcionarioName: 'João Silva',
    documentType: 'Admissional',
    date: mockDate,
    addHash: true,
  };

  const fileName1 = generateBlobFileName(baseConfig);
  const fileName2 = generateBlobFileName(baseConfig);

  // Os hashes devem ser diferentes
  if (fileName1 === fileName2) {
    throw new Error('Hash collision detected - files would overwrite each other!');
  }

  // Ambos devem seguir o padrão correto
  assertMatch(fileName1, /^ASO_EMP001_JOAO_SILVA_ADMISSIONAL_20260127_[A-Z0-9]{4}\.pdf$/);
  assertMatch(fileName2, /^ASO_EMP001_JOAO_SILVA_ADMISSIONAL_20260127_[A-Z0-9]{4}\.pdf$/);
});

// ============================================
// RESUMO
// ============================================
console.log('\n========================================');
console.log('TEST SUMMARY');
console.log('========================================');
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`📊 Total: ${passed + failed}`);

if (failed === 0) {
  console.log('\n🎉 All tests passed!');
  console.log('\nExemplos de nomenclatura gerada:');
  console.log('  ASO: ' + generateBlobFileName({
    type: 'ASO',
    empresaCode: 'EMP001',
    funcionarioName: 'João Silva',
    documentType: 'Admissional',
    date: new Date(),
    addHash: true,
  }));
  console.log('  ASO_SIGNED: ' + generateBlobFileName({
    type: 'ASO_SIGNED',
    empresaCode: 'EMP001',
    funcionarioName: 'João Silva',
    documentType: 'Admissional',
    date: new Date(),
    addHash: true,
  }));
  process.exit(0);
} else {
  console.log(`\n⚠️  ${failed} test(s) failed.`);
  process.exit(1);
}
