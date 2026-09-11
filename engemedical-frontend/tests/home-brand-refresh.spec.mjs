import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

test("home login uses the Engemedical Connect brand system", async () => {
  const tailwindConfig = await readFile(
    new URL("../tailwind.config.js", import.meta.url),
    "utf8",
  );
  const loginPage = await readFile(
    new URL("../components/login/login.tsx", import.meta.url),
    "utf8",
  );

  for (const token of [
    "midnight",
    "deep",
    "blue",
    "cyan",
    "green",
    "lime",
    "surface",
    "line",
  ]) {
    assert.match(
      tailwindConfig,
      new RegExp(`["']?${token}["']?:\\s*["']#[0-9a-fA-F]{6}["']`),
      `Expected Tailwind brand token ${token}`,
    );
  }

  assert.match(
    loginPage,
    /engemedicalIcon from "@\/public\/images\/logo\.png"/,
  );
  assert.doesNotMatch(loginPage, /Engemedical Connect/);
  assert.doesNotMatch(loginPage, /Portal operacional/);
  assert.doesNotMatch(loginPage, /Clínica ocupacional/);
  assert.match(loginPage, /TypewriterTitle/);
  assert.match(loginPage, /typewriter-text/);
  assert.match(loginPage, /Conectando você ao futuro SST/);
  assert.match(loginPage, /Confiança para decidir/);
  assert.match(loginPage, /SST sem retrabalho/);
  assert.match(loginPage, /Visibilidade em tempo real/);
  assert.doesNotMatch(loginPage, /Processos, exames e documentos organizados/);
  assert.doesNotMatch(loginPage, /Fluxos conectados reduzem falhas/);
  assert.doesNotMatch(loginPage, /Indicadores claros ajudam sua empresa/);
  assert.match(loginPage, /ShieldCheck/);
  assert.match(loginPage, /LayoutDashboard/);
  assert.match(loginPage, /BarChart3/);
  assert.doesNotMatch(loginPage, /Controle clínico ocupacional/);
  assert.doesNotMatch(loginPage, /ASO e documentação/);
  assert.doesNotMatch(loginPage, /Operação multiempresa/);
  assert.doesNotMatch(loginPage, /Exames ocupacionais/);
  assert.doesNotMatch(loginPage, /ASO e documentos/);
  assert.doesNotMatch(loginPage, /PCMSO e conformidade/);
  assert.doesNotMatch(loginPage, /Rede de atendimento/);
  assert.match(loginPage, /sm:grid-cols-3/);
  assert.match(loginPage, /max-w-\[34rem\]/);
  assert.match(loginPage, /sm:min-h-\[4\.9rem\]/);
  assert.match(loginPage, /compact-brand-stage/);
  assert.match(loginPage, /md:h-\[15rem\]/);
  assert.match(loginPage, /pt-2/);
  assert.doesNotMatch(
    loginPage,
    /flex flex-1 flex-col items-center justify-center gap-2/,
  );
  assert.doesNotMatch(loginPage, /md:h-\[17rem\]/);
  assert.doesNotMatch(loginPage, /xl:h-\[19rem\]/);
  assert.match(loginPage, /connect-line-primary/);
  assert.doesNotMatch(loginPage, /connect-line-secondary/);
  assert.match(loginPage, /connect-line-diagonal/);
  assert.match(loginPage, /space-y-2/);
  assert.match(loginPage, /className="mt-0"/);
  assert.doesNotMatch(loginPage, /top-\[66%\] h-2 w-2 rounded-full bg-brand-/);
  assert.match(loginPage, /max-w-\[29rem\]/);
  assert.match(loginPage, /#020817_0%/);
  assert.match(loginPage, /#06281f_100%/);
  assert.doesNotMatch(loginPage, /#082a4c_48%/);
  assert.doesNotMatch(
    loginPage,
    /Cuidado ocupacional com tecnologia, presença clínica e gestão integrada/,
  );
  assert.doesNotMatch(
    loginPage,
    /Exames, ASO, PCMSO e rede credenciada em uma jornada mais simples/,
  );
  assert.doesNotMatch(
    loginPage,
    /Atendimento clínico, documentação ocupacional e conformidade/,
  );
  assert.match(loginPage, /Engemedical Brasil/);
  assert.doesNotMatch(loginPage, /Centro Médico de Saúde Ocupacional/);
  assert.match(loginPage, /Acesse o ambiente Engemedical/);
  assert.match(
    loginPage,
    /Entre com seu e-mail e senha para consultar rotinas, documentos e atendimentos/,
  );
  assert.doesNotMatch(loginPage, /Gestão ocupacional em um ambiente conectado/);
  assert.match(loginPage, /bg-brand-midnight/);
  assert.match(loginPage, /shadow-\[0_18px_44px_rgba\(0,46,66,0\.22\)\]/);
  assert.match(loginPage, /Entrar/);
  assert.match(loginPage, /Entrando\.\.\./);
  assert.match(loginPage, /Recuperar senha/);
  assert.match(loginPage, /Criar nova senha/);
  assert.match(loginPage, /Salvar nova senha/);
  assert.match(loginPage, /Ainda não tem acesso\?/);
  assert.match(loginPage, /Cadastre-se/);
  assert.doesNotMatch(loginPage, /Solicitar cadastro/);
  assert.doesNotMatch(loginPage, /Solicitar acesso/);
  assert.doesNotMatch(loginPage, /Acesso ao Sistema/);
  assert.doesNotMatch(loginPage, /Acessar Sistema/);
  assert.doesNotMatch(loginPage, /Acesso protegido/);
  assert.doesNotMatch(loginPage, /Ambiente seguro/);
  assert.doesNotMatch(loginPage, /Acesse sua área Engemedical/);
  assert.doesNotMatch(loginPage, /Use suas credenciais corporativas/);
  assert.doesNotMatch(loginPage, /Recuperação de Senha/);
  assert.doesNotMatch(loginPage, /Nova Senha/);
  assert.doesNotMatch(loginPage, /Registre-se aqui/);
  assert.match(loginPage, /cyber-grid/);
  assert.match(loginPage, /brand-card-shine/);
  assert.match(loginPage, /whileHover=\{\{ y: -4, scale: 1\.018 \}\}/);
  assert.match(loginPage, /motion\.section/);
  assert.match(loginPage, /motion\.div/);
  assert.match(loginPage, /repeat:\s*Infinity/);
});
