import { supabase } from "../supabase";

import { IUserRegister } from "@/lib/user/interfaces/IUser";
import { formatCPF } from "@/lib/utils";

const normalizeCpf = (value: string) => value.replace(/\D/g, "");
const normalizeEmail = (value: string) => value.trim().toLowerCase();

type AuthUserRecord = IUserRegister & {
  nome?: string;
  perfil?: string;
  conselho?: string;
  uf_conselho?: string;
  tipo_usuario?: "interno" | "cliente";
  registration_code?: string;
};

function mapAuthUserRecord(record: AuthUserRecord | null): AuthUserRecord | null {
  if (!record?.password) return null;

  return {
    ...record,
    tipoUsuario: record.tipoUsuario || record.tipo_usuario,
    registrationCode: record.registrationCode || record.registration_code,
  };
}

export class SupabaseService {
  private static readonly primaryTable = "users";

  static async getUserByCpf(cpf: string): Promise<IUserRegister | null> {
    const cpfNormalizado = normalizeCpf(cpf);
    const cpfMascarado = formatCPF(cpfNormalizado);

    let { data, error } = await supabase
      .from(SupabaseService.primaryTable)
      .select("*")
      .or(`cpf.eq.${cpfNormalizado},cpf.eq.${cpfMascarado}`)
      .maybeSingle();

    if (!data && !error) {
      const { data: allData } = await supabase
        .from(SupabaseService.primaryTable)
        .select("*");

      if (allData) {
        data =
          allData.find((user) => normalizeCpf(user.cpf || "") === cpfNormalizado) ||
          null;
      }
    }

    if (error) {
      console.error("Error fetching user:", error);
    }

    return mapAuthUserRecord(data as AuthUserRecord | null);
  }

  static async getUserByEmail(email: string): Promise<IUserRegister | null> {
    const normalizedEmail = normalizeEmail(email);

    const { data, error } = await supabase
      .from(SupabaseService.primaryTable)
      .select("*")
      .ilike("email", normalizedEmail)
      .maybeSingle();

    if (error) {
      console.error("Error fetching user by email:", error);
    }

    return mapAuthUserRecord(data as AuthUserRecord | null);
  }

  static async createUserAuthRecord(client: AuthUserRecord): Promise<number> {
    const normalizedEmail = normalizeEmail(client.email);
    const codigo = String(client.codigo || "").trim();
    const cpf = client.cpf ? normalizeCpf(client.cpf) : null;
    const tipoUsuario = client.tipoUsuario || client.tipo_usuario || null;
    const registrationCode = client.registrationCode || client.registration_code || client.codigo;

    const { data: existing, error: findError } = await supabase
      .from(SupabaseService.primaryTable)
      .select("codigo, cpf")
      .eq("codigo", codigo)
      .maybeSingle();

    if (findError) {
      throw new Error(`Failed to inspect existing user: ${findError.message}`);
    }

    if (existing) {
      const { error } = await supabase
        .from(SupabaseService.primaryTable)
        .update({
          cpf: existing.cpf || cpf,
          email: normalizedEmail,
          password: client.password,
          tipo_usuario: tipoUsuario,
          registration_code: registrationCode,
          atualizado_em: new Date().toISOString(),
        })
        .eq("codigo", codigo)
        .select("codigo")
        .single();

      if (error) {
        throw new Error(`Failed to update user credentials: ${error.message}`);
      }

      return 201;
    }

    const { status, error } = await supabase
      .from(SupabaseService.primaryTable)
      .insert([
        {
          codigo,
          cpf,
          nome: client.nome || normalizedEmail,
          email: normalizedEmail,
          password: client.password,
          perfil: client.perfil || (tipoUsuario === "cliente" ? "CLIENTE" : "CONVIDADO"),
          conselho: client.conselho || null,
          uf_conselho: client.uf_conselho || null,
          tipo_usuario: tipoUsuario,
          registration_code: registrationCode,
        },
      ])
      .select("codigo")
      .single();

    if (error) {
      throw new Error(`Failed to register user: ${error.message}`);
    }

    return status;
  }

  static async deleteUserByCPF(cpf: string) {
    try {
      const user = await SupabaseService.getUserByCpf(cpf);

      if (!user?.cpf) {
        return {
          status: 404,
          message: "Usuário não encontrado",
        };
      }

      const { error } = await supabase
        .from(SupabaseService.primaryTable)
        .delete()
        .eq("cpf", user.cpf);

      if (error) {
        throw new Error(`Erro ao deletar usuário: ${error.message}`);
      }

      return {
        status: 200,
        message: "Usuário deletado com sucesso",
      };
    } catch (err: any) {
      return {
        status: 500,
        message: err.message || "Erro inesperado",
      };
    }
  }

  static async updatePassword(
    cpf: string,
    newPassword: string,
  ): Promise<boolean> {
    const user = await SupabaseService.getUserByCpf(cpf);

    if (!user?.cpf) {
      return false;
    }

    const { error } = await supabase
      .from(SupabaseService.primaryTable)
      .update({ password: newPassword })
      .eq("cpf", user.cpf);

    if (error) {
      console.error("Error updating password:", error);

      return false;
    }

    return true;
  }
}