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

  assert.match(registerSchema, /email:[\s\S]*\.email\(/);
  assert.match(registerSchema, /codigo:[\s\S]*\.min\(1\)/);
  assert.doesNotMatch(registerSchema, /cpf:/);
  assert.match(registerInterface, /email: string;/);
  assert.match(register, /const \[email, setEmail\] = useState\(""\)/);
  assert.match(register, /label="E-mail"/);
  assert.match(register, /placeholder="Cole seu código aqui"/);
  assert.match(register, /\{ email, codigo, password, consentimento: true \}/);
  assert.match(userService, /resolveRegistrationCode\(user\.codigo\)/);
  assert.match(registrationCode, /startsWith\("ENGM-"\)/);
  assert.match(registrationCode, /tipoUsuario: "interno"/);
  assert.match(registrationCode, /tipoUsuario: "cliente"/);
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
  assert.match(userService, /SupabaseService\.createUserAuthRecord/);
  assert.match(migration, /ALTER TABLE public\.users/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS password TEXT/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS tipo_usuario VARCHAR\(20\)/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS registration_code VARCHAR\(50\)/);
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
