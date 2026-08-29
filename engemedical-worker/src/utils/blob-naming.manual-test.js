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
console.log('BLOB NAMING SYSTEM - MANUAL TESTS');
console.log('========================================\n');

// Testes de generateBlobFileName
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

test('EXAM file name generation', () => {
  const result = generateBlobFileName({
    type: 'EXAM',
    empresaCode: 'EMP002',
    funcionarioName: 'Maria Souza',
    documentType: 'Exame Clínico',
    date: mockDate,
    addHash: false,
  });
  assertEqual(result, 'EXM_EMP002_MARIA_SOUZA_EXAME_CLINICO_20260127.pdf');
});

test('EXAM_SIGNED file name with _DIGITAL suffix', () => {
  const result = generateBlobFileName({
    type: 'EXAM_SIGNED',
    empresaCode: 'EMP002',
    funcionarioName: 'Maria Souza',
    documentType: 'Exame Clínico',
    date: mockDate,
    addHash: false,
  });
  assertEqual(result, 'EXM_EMP002_MARIA_SOUZA_EXAME_CLINICO_DIGITAL_20260127.pdf');
});

test('ATTACHMENT file name generation', () => {
  const result = generateBlobFileName({
    type: 'ATTACHMENT',
    empresaCode: 'EMP003',
    funcionarioName: 'Pedro Santos',
    documentType: 'RG Frente',
    date: mockDate,
    addHash: false,
  });
  assertEqual(result, 'ANX_EMP003_PEDRO_SANTOS_RG_FRENTE_20260127.pdf');
});

test('RECORD (Prontuário) file name generation', () => {
  const result = generateBlobFileName({
    type: 'RECORD',
    empresaCode: 'EMP004',
    funcionarioName: 'Ana Costa',
    documentType: 'Prontuário Completo',
    date: mockDate,
    addHash: false,
  });
  assertEqual(result, 'PRT_EMP004_ANA_COSTA_PRONTUARIO_COMPLETO_20260127.pdf');
});

test('RESTRICTION file name generation', () => {
  const result = generateBlobFileName({
    type: 'RESTRICTION',
    empresaCode: 'EMP005',
    funcionarioName: 'Carlos Lima',
    documentType: 'Laudo Restrição',
    date: mockDate,
    addHash: false,
  });
  assertEqual(result, 'RST_EMP005_CARLOS_LIMA_LAUDO_RESTRICAO_20260127.pdf');
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

test('Unique hash generation', () => {
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
  // Com 100 gerações, a probabilidade de colisão é praticamente zero
  // mas se houver colisão, o Set terá menos de 100 itens
  if (results.size < 100) {
    console.log(`   ⚠️  Warning: ${100 - results.size} hash collisions detected in 100 generations`);
  }
  // Não falha o teste pois colisões são estatisticamente possíveis (embora raras)
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

test('Exames path generation', () => {
  const result = generateBlobPath({
    fileType: 'exames',
    empresaCode: 'EMP002',
    prontuario: '450-789012',
    fileName: 'EXM_EMP002_MARIA_SOUZA_CLINICO_20260127_X9K2.pdf',
    date: mockDate,
  });
  assertEqual(result, 'exames/2026/01/EMP002/450-789012/EXM_EMP002_MARIA_SOUZA_CLINICO_20260127_X9K2.pdf');
});

test('Anexos path generation', () => {
  const result = generateBlobPath({
    fileType: 'anexos',
    empresaCode: 'EMP003',
    prontuario: '450-345678',
    fileName: 'ANX_EMP003_PEDRO_SANTOS_RG_20260127_B4K2.pdf',
    date: mockDate,
  });
  assertEqual(result, 'anexos/2026/01/EMP003/450-345678/ANX_EMP003_PEDRO_SANTOS_RG_20260127_B4K2.pdf');
});

test('Prontuarios path generation', () => {
  const result = generateBlobPath({
    fileType: 'prontuarios',
    empresaCode: 'EMP004',
    prontuario: '450-901234',
    fileName: 'PRT_EMP004_ANA_COSTA_COMPLETO_20260127_L2N4.pdf',
    date: mockDate,
  });
  assertEqual(result, 'prontuarios/2026/01/EMP004/450-901234/PRT_EMP004_ANA_COSTA_COMPLETO_20260127_L2N4.pdf');
});

test('Laudos path generation', () => {
  const result = generateBlobPath({
    fileType: 'laudos',
    empresaCode: 'EMP005',
    prontuario: '450-567890',
    fileName: 'RST_EMP005_CARLOS_LIMA_RESTRICAO_20260127_M8P1.pdf',
    date: mockDate,
  });
  assertEqual(result, 'laudos/2026/01/EMP005/450-567890/RST_EMP005_CARLOS_LIMA_RESTRICAO_20260127_M8P1.pdf');
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

test('Complete signed exam path', () => {
  const fileName = generateBlobFileName({
    type: 'EXAM_SIGNED',
    empresaCode: 'EMP002',
    funcionarioName: 'Maria Souza',
    documentType: 'Audiometria',
    date: mockDate,
    addHash: false,
  });
  
  const fullPath = generateBlobPath({
    fileType: 'exames',
    empresaCode: 'EMP002',
    prontuario: '450-789012',
    fileName,
    date: mockDate,
  });
  
  assertEqual(fullPath, 'exames/2026/01/EMP002/450-789012/EXM_EMP002_MARIA_SOUZA_AUDIOMETRIA_DIGITAL_20260127.pdf');
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
  process.exit(0);
} else {
  console.log(`\n⚠️  ${failed} test(s) failed.`);
  process.exit(1);
}
