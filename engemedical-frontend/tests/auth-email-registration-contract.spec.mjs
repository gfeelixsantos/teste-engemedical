import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const root = new URL("../", import.meta.url);

async function read(relativePath) {
  return readFile(new URL(relativePath, root), "utf8");
}

test("auth contract uses email and password for login", async () => {
  const schemas = await read("lib/user/zod/schemas.ts");
  const interfaces = await read("lib/user/interfaces/IUser.ts");
  const login = await read("components/login/login.tsx");
  const userService = await read("lib/user/services/user.service.ts");
  const supabaseService = await read("lib/supabase/services/supabase.service.ts");
  const loginSchema = schemas.match(/export const userLoginSchema = z\.object\(\{[\s\S]*?\n\}\);/)?.[0] ?? "";
  const loginInterface = interfaces.match(/export interface IUserLogin \{[\s\S]*?\n\}/)?.[0] ?? "";

  assert.match(loginSchema, /email:[\s\S]*\.email\(/);
  assert.doesNotMatch(loginSchema, /cpf:/);
  assert.match(loginInterface, /email: string;/);
  assert.doesNotMatch(loginInterface, /cpf: string;/);
  assert.match(login, /const \[email, setEmail\] = useState\(""\)/);
  assert.match(login, /label="E-mail"/);
  assert.match(login, /\{ email, password \}/);
  assert.doesNotMatch(login, /\{ cpf, password \}/);
  assert.match(userService, /SupabaseService\.getUserByEmail\(user\.email\)/);
  assert.match(supabaseService, /static async getUserByEmail/);
});

test("registration contract uses email, password and registration code", async () => {
  const schemas = await read("lib/user/zod/schemas.ts");
  const interfaces = await read("lib/user/interfaces/IUser.ts");
  const register = await read("components/registro/RegistroClient.tsx");
  const userService = await read("lib/user/services/user.service.ts");
  const registrationCode = await read("lib/user/registration-code.ts");
  const registerSchema = schemas.match(/export const userRegisterSchema = z\.object\(\{[\s\S]*?\n\}\);/)?.[0] ?? "";
  const registerInterface = interfaces.match(/export interface IUserRegister \{[\s\S]*?\n\}/)?.[0] ?? "";

  assert.match(registerSchema, /nome:[\s\S]*\.min\(3/);
  assert.match(registerSchema, /nome:[\s\S]*\.max\(120/);
  assert.match(registerSchema, /nome:[\s\S]*refine/);
  assert.match(registerSchema, /email:[\s\S]*\.email\(/);
  assert.match(registerSchema, /codigo:[\s\S]*\.min\(1\)/);
  assert.doesNotMatch(registerSchema, /cpf:/);
  assert.match(registerInterface, /nome: string;/);
  assert.match(registerInterface, /email: string;/);
  assert.match(register, /const \[nome, setNome\] = useState\(""\)/);
  assert.match(register, /label="Nome completo"/);
  assert.match(register, /autoComplete="name"/);
  assert.match(register, /spellCheck=\{false\}/);
  assert.match(register, /const \[email, setEmail\] = useState\(""\)/);
  assert.match(register, /label="E-mail"/);
  assert.match(register, /placeholder="Cole seu código aqui"/);
  assert.match(register, /const payload = \{[\s\S]*nome: formattedNome,[\s\S]*email,[\s\S]*codigo,[\s\S]*password,[\s\S]*consentimento: true/);
  assert.match(userService, /resolveRegistrationCode\(user\.codigo\)/);
  assert.match(registrationCode, /export function normalizeRegistrationCode/);
  assert.match(registrationCode, /\.replace\(\/\\s\+\/g, ""\)/);
  assert.match(userService, /formatPersonName\(user\.nome\)/);
  assert.match(userService, /nome: normalizedNome/);
  assert.match(registrationCode, /startsWith\("ENGM-"\)/);
  assert.match(registrationCode, /tipoUsuario: "interno"/);
  assert.match(registrationCode, /tipoUsuario: "cliente"/);
});

test("registration page is compact and highlights Engemedical in the title", async () => {
  const register = await read("components/registro/RegistroClient.tsx");

  assert.match(register, /const RegistroTitle =/);
  assert.match(register, /const brandPillars =/);
  assert.match(register, /Confiança para decidir/);
  assert.match(register, /SST sem retrabalho/);
  assert.match(register, /Visibilidade em tempo real/);
  assert.match(register, /brandPillars\.map/);
  assert.match(register, /text-transparent/);
  assert.match(register, /Criar conta Engemedical/);
  assert.match(register, /<RegistroTitle title="Criar conta Engemedical" \/>/);
  assert.match(register, /<form className="space-y-4"/);
  assert.match(register, /py-3 text-\[15px\]/);
  assert.doesNotMatch(register, /<PasswordStrength/);
});

test("registration uses shared premium feedback modal instead of browser alert", async () => {
  const register = await read("components/registro/RegistroClient.tsx");
  const modal = await read("components/shared/PremiumFeedbackModal.tsx");
  const errorMapper = await read("lib/user/registration-errors.ts");

  assert.doesNotMatch(register, /alert\(/);
  assert.match(register, /PremiumFeedbackModal/);
  assert.match(register, /mapRegistrationFeedback/);
  assert.match(register, /feedbackModal/);
  assert.match(register, /onPrimaryAction/);
  assert.match(modal, /export type PremiumFeedbackVariant = "success" \| "error" \| "warning" \| "info"/);
  assert.match(modal, /Modal/);
  assert.match(modal, /CheckCircle2|AlertTriangle|Info|XCircle/);
  assert.match(errorMapper, /export function mapRegistrationFeedback/);
  assert.match(errorMapper, /USER_ALREADY_EXISTS/);
  assert.match(errorMapper, /SOC_CADASTRO_PESSOA_NOT_FOUND/);
  assert.match(errorMapper, /USER_REGISTER_FAILED/);
  assert.match(errorMapper, /VALIDATION_ERROR/);
});
test("auth persistence contract uses users as primary identity table", async () => {
  const supabaseService = await read("lib/supabase/services/supabase.service.ts");
  const userService = await read("lib/user/services/user.service.ts");
  const migration = await read(
    "../engemedical-backend/supabase/migrations/20260911001_merge_clients_auth_into_users.sql",
  );

  assert.match(supabaseService, /private static readonly primaryTable = "users"/);
  assert.match(supabaseService, /\.from\(SupabaseService\.primaryTable\)/);
  assert.doesNotMatch(supabaseService, /legacyTable|getLegacyUser|\.from\("clients"\)/);
  assert.match(supabaseService, /\.eq\("email", normalizedEmail\)/);
  assert.doesNotMatch(supabaseService, /\.ilike\("email"/);
  assert.match(userService, /SupabaseService\.createUserAuthRecord/);
  assert.match(migration, /ALTER TABLE public\.users/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS password TEXT/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS tipo_usuario VARCHAR\(20\)/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS registration_code TEXT/);
  assert.match(migration, /INSERT INTO public\.users/);
  assert.match(migration, /FROM public\.clients/);
  assert.match(supabaseService, /return 201;/);
  assert.match(migration, /ON CONFLICT \(codigo\) DO UPDATE/);
  assert.match(migration, /DROP TABLE IF EXISTS public\.clients/);
});
test("users service contract does not expose password hashes", async () => {
  const usersService = await read("../engemedical-backend/src/users/users.service.ts");

  assert.match(usersService, /private readonly safeSelect =/);
  assert.doesNotMatch(usersService, /\.select\('\*'\)/);
  assert.doesNotMatch(usersService, /\.select\("\*"\)/);
});
test("client registration keeps company access code separate from user identity", async () => {
  const schemas = await read("lib/user/zod/schemas.ts");
  const userService = await read("lib/user/services/user.service.ts");
  const migration = await read(
    "../engemedical-backend/supabase/migrations/20260911001_merge_clients_auth_into_users.sql",
  );
  const usersOnlyMigration = await read(
    "../engemedical-backend/supabase/migrations/20260913001_registration_code_text_on_users.sql",
  );

  assert.match(schemas, /codigo:[\s\S]*\.min\(1\)/);
  assert.doesNotMatch(schemas, /codigo:[\s\S]*\.max\(/);
  assert.match(userService, /const createClientUserCodigo = \(\) =>/);
  assert.match(userService, /codigo: createClientUserCodigo\(\)/);
  assert.match(userService, /registrationCode: registration\.normalizedCode/);
  assert.match(migration, /ALTER COLUMN registration_code TYPE TEXT/);
  assert.match(usersOnlyMigration, /ALTER TABLE public\.users[\s\S]*ALTER COLUMN registration_code TYPE TEXT/);
  assert.match(usersOnlyMigration, /DROP INDEX IF EXISTS public\.idx_users_registration_code/);
  assert.match(migration, /DROP INDEX IF EXISTS public\.idx_users_registration_code/);
  assert.doesNotMatch(migration, /ON public\.users \(registration_code\)/);
  assert.match(migration, /ELSE 'CLI-' \|\| upper\(left\(encode\(digest\(clients\.codigo \|\| ':' \|\| clients\.id::text, 'sha256'\), 'hex'\), 16\)\)/);
});
test("users table has focused indexes for unified auth and listing queries", async () => {
  const indexesMigration = await read(
    "../engemedical-backend/supabase/migrations/20260913002_users_focused_indexes.sql",
  );

  assert.match(indexesMigration, /idx_users_email_unique_not_empty[\s\S]*ON public\.users \(lower\(email\)\)/);
  assert.match(indexesMigration, /idx_users_email_lookup_not_empty[\s\S]*ON public\.users \(email\)/);
  assert.match(indexesMigration, /idx_users_cpf_unique_not_empty[\s\S]*ON public\.users \(cpf\)/);
  assert.match(indexesMigration, /idx_users_active_profile_name[\s\S]*ON public\.users \(ativo, perfil, nome\)[\s\S]*WHERE anonimizado_em IS NULL/);
  assert.match(indexesMigration, /idx_users_name_not_anonymized[\s\S]*ON public\.users \(nome\)[\s\S]*WHERE anonimizado_em IS NULL/);
  assert.match(indexesMigration, /idx_users_active_name_not_anonymized[\s\S]*ON public\.users \(ativo, nome\)[\s\S]*WHERE anonimizado_em IS NULL/);
  assert.match(indexesMigration, /idx_users_tipo_usuario_active[\s\S]*ON public\.users \(tipo_usuario, ativo\)/);
  assert.match(indexesMigration, /DROP INDEX IF EXISTS public\.idx_users_registration_code/);
  assert.doesNotMatch(indexesMigration, /ON public\.users \(registration_code\)/);
});
