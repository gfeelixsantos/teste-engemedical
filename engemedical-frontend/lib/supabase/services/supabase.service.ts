import { supabase } from "../supabase";

import { IUserRegister } from "@/lib/user/interfaces/IUser";
import { formatCPF } from "@/lib/utils";

const normalizeCpf = (value: string) => value.replace(/\D/g, "");

export class SupabaseService {
  static async getUserByCpf(cpf: string): Promise<IUserRegister> {
    const cpfNormalizado = normalizeCpf(cpf);

    const cpfMascarado = formatCPF(cpfNormalizado);

    let { data, error } = await supabase
      .from("clients")
      .select("*")
      .or(`cpf.eq.${cpfNormalizado},cpf.eq.${cpfMascarado}`)
      .maybeSingle();

    if (!data && !error) {
      const { data: allData } = await supabase.from("clients").select("*");

      if (allData) {
        data =
          allData.find((user) => normalizeCpf(user.cpf) === cpfNormalizado) ||
          null;
      }
    }

    if (error) {
      console.error("Error fetching client:", error);
    }

    return data;
  }

  // Cria novo cliente
  static async createClient(client: IUserRegister): Promise<number> {
    const { status, error } = await supabase
      .from("clients")
      .insert([client])
      .select("*")
      .single();

    if (error) {
      throw new Error("Failed to register client", error);
    }

    return status;
  }

  static async deleteUserByCPF(cpf: string) {
    try {
      const user = await SupabaseService.getUserByCpf(cpf);

      if (!user) {
        return {
          status: 404,
          message: "Usuário não encontrado",
        };
      }

      const { error } = await supabase
        .from("clients")
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

    if (!user) {
      return false;
    }

    const { error } = await supabase
      .from("clients")
      .update({ password: newPassword })
      .eq("cpf", user.cpf);

    if (error) {
      console.error("Error updating password:", error);

      return false;
    }

    return true;
  }
}
