import { randomUUID } from "node:crypto";

import { IUserInfo, IUserLogin, IUserReauth, IUserRegister } from "../interfaces/IUser";
import { resolveRegistrationCode, RegistrationUserType } from "../registration-code";
import { getEmpresasFromRegistrationCode } from "../empresa-parser";

import { Bcrypt } from "@/lib/bcrypt/bcrypt";
import { SOC } from "@/lib/soc/services/soc";
import { SupabaseService } from "@/lib/supabase/services/supabase.service";
import { ApiMessages } from "@/shared/responses/ApiMessages";
import { ApiResponse } from "@/shared/responses/ApiResponse";
import { HttpCodes } from "@/shared/responses/HttpCodes";
import { JWT } from "@/lib/jwt/jwt";
import { mapCadastroPessoasToUserInfo } from "@/lib/utils";
import { NEST_URL } from "@/config/constants";

type AuthUserRecord = IUserRegister & {
  nome?: string;
  perfil?: string;
  conselho?: string;
  uf_conselho?: string;
  tipo_usuario?: RegistrationUserType;
  registration_code?: string;
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const nameParticles = new Set(["da", "das", "de", "di", "do", "dos", "du", "e"]);

const capitalizeNamePart = (part: string, index: number) => {
  const lower = part.toLocaleLowerCase("pt-BR");

  if (index > 0 && nameParticles.has(lower)) return lower;

  return lower.replace(/(^|[-'])\p{L}/gu, (match) =>
    match.toLocaleUpperCase("pt-BR"),
  );
};

const formatPersonName = (value: string) =>
  value
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map(capitalizeNamePart)
    .join(" ");

const createClientUserCodigo = () =>
  `CLI-${randomUUID().replace(/-/g, "").slice(0, 16).toUpperCase()}`;

const getClientRegistrationCode = (client: AuthUserRecord) =>
  client.registrationCode || client.registration_code || client.codigo;

const getClientUserType = (client: AuthUserRecord): RegistrationUserType =>
  client.tipoUsuario ||
  client.tipo_usuario ||
  resolveRegistrationCode(getClientRegistrationCode(client)).tipoUsuario;

/**
 * Service responsável por lidar com regras de negócio relacionadas a Usuários.
 *
 * - Encapsula operações de autenticação (`login`) e cadastro (`register`).
 * - Faz integração com:
 *   - Supabase (persistência de usuários).
 *   - SOC (sistema legado de cadastro de pessoas).
 *   - Utilitários (bcrypt para senha, JWT para token).
 * - Retorna sempre instâncias de ApiResponse<T> padronizando a comunicação.
 */
export class UserService {
  /**
   * Autentica um usuário com base no e-mail e senha.
   *
   * Fluxo:
   *  1. Busca o usuário no Supabase.
   *  2. Valida se o usuário existe.
   *  3. Compara a senha informada com o hash salvo.
   *  4. Consulta o cadastro de pessoas no SOC.
   *  5. Gera JWT e retorna objeto com dados do usuário + token.
   *
   * @param user Dados de login (e-mail, senha).
   * @returns ApiResponse<IUserLoginSuccess> em caso de sucesso,
   *          ou ApiResponse<null> com erro apropriado.
   */
  static async login(
    user: IUserLogin,
  ): Promise<ApiResponse<{ token: string; userInfo: IUserInfo }>> {
    const normalizedEmail = normalizeEmail(user.email);
    const userRegister = await SupabaseService.getUserByEmail(user.email);

    if (!userRegister) {
      return new ApiResponse(
        HttpCodes.BAD_REQUEST,
        ApiMessages.USER_INPUT_INVALID,
      );
    }

    const clientRecord = userRegister as AuthUserRecord;
    const registrationCode = getClientRegistrationCode(clientRecord);
    const resolvedCode = resolveRegistrationCode(registrationCode);
    const tipoUsuario = getClientUserType(clientRecord);
    const userCodigo = String(clientRecord.codigo || resolvedCode.userCodigo);

    // Valida senha utilizando bcrypt
    const passwordIsValid = await Bcrypt.comparePasswords(
      user.password,
      userRegister.password,
    );

    if (!passwordIsValid) {
      return new ApiResponse(
        HttpCodes.UNAUTHORIZED,
        ApiMessages.USER_INPUT_INVALID,
      );
    }

    // Busca informações complementares da nossa tabela local via backend
    let userData: any = null;
    try {
      const response = await fetch(`${NEST_URL}users/${userCodigo}`);
      if (response.ok) {
        userData = await response.json();
      }
    } catch (err) {
      console.error("Erro ao buscar dados do usuário no banco local:", err);
    }

    // Complementa dados internos a partir do SOC quando a tabela users ainda estiver incompleta.

    if (!userData && tipoUsuario === "interno") {
      try {
        const cadastroPessoas = await SOC.ExportaDadosCadastroPessoas();
        const socUser = cadastroPessoas?.find(
          (p) => p.CODIGO == userCodigo,
        );

        if (socUser) {
          const syncRes = await fetch(`${NEST_URL}users/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              codigo: String(socUser.CODIGO),
              cpf: String(socUser.CPF || '').replace(/\D/g, ''),
              nome: socUser.NOME || '',
              email: normalizedEmail,
              perfil: socUser.REGISTRO_FUNCIONAL || 'CONVIDADO',
              conselho: socUser.CONSELHO_CLASSE || null,
              uf_conselho: socUser.UF_CONSELHO || null,
              ultimo_login: new Date().toISOString(),
            }),
          });
          if (syncRes.ok) {
            userData = await syncRes.json();
          }
        }
      } catch (err) {
        console.error('Erro ao complementar usuário interno com dados do SOC:', err);
      }
    }

    if (!userData) {
      try {
        const syncRes = await fetch(`${NEST_URL}users/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            codigo: userCodigo,
            cpf: clientRecord.cpf || null,
            nome: clientRecord.nome || normalizedEmail,
            email: normalizedEmail,
            perfil: clientRecord.perfil || (tipoUsuario === "cliente" ? "CLIENTE" : "CONVIDADO"),
            conselho: clientRecord.conselho || null,
            uf_conselho: clientRecord.uf_conselho || null,
            ultimo_login: new Date().toISOString(),
          }),
        });
        if (syncRes.ok) {
          userData = await syncRes.json();
        }
      } catch (err) {
        console.error('Erro ao sincronizar usuário com users:', err);
      }
    }

    // Se ainda não encontrou, tenta uma última leitura local.
    if (!userData) {
      try {
        const response = await fetch(`${NEST_URL}users/${userCodigo}`);
        if (response.ok) userData = await response.json();
      } catch {}
    }

    if (!userData) {
      return new ApiResponse(
        HttpCodes.UNPROCESSABLE_ENTITY,
        "Dados cadastrais do profissional não encontrados. Entre em contato com o administrador.",
      );
    }

    // Verifica se o usuário está ativo localmente
    if (userData.ativo === false) {
      return new ApiResponse(
        HttpCodes.FORBIDDEN,
        ApiMessages.USER_INACTIVE,
      );
    }

    // Gera token JWT e mapeia para o modelo de sucesso de login
    const empresaResult = tipoUsuario === "cliente"
      ? await getEmpresasFromRegistrationCode(registrationCode)
      : { empresas: [], missingCodes: [], invalidCodes: [], originalCode: registrationCode };

    const userInfo: IUserInfo = {
      codigo: userData.codigo,
      nome: userData.nome,
      cpf: userData.cpf || clientRecord.cpf || "",
      email: userData.email || normalizedEmail,
      conselho: userData.conselho || "",
      ufconselho: userData.uf_conselho || "",
      perfil: userData.perfil || "CONVIDADO",
      tipoUsuario,
      registrationCode,
      empresas: empresaResult.empresas,
    };

    (userInfo as any).missingCodes = empresaResult.missingCodes;
    (userInfo as any).invalidCodes = empresaResult.invalidCodes;

    const token = await JWT.generateJwt(userInfo);

    // Atualiza o último login em background
    try {
      await fetch(`${NEST_URL}users/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigo: userInfo.codigo,
          cpf: userInfo.cpf,
          nome: userInfo.nome,
          email: userInfo.email,
          perfil: userInfo.perfil,
          conselho: userInfo.conselho || null,
          uf_conselho: userInfo.ufconselho || null,
          ultimo_login: new Date().toISOString(),
        }),
      });
    } catch (err) {
      console.error('Erro ao sincronizar último login (não crítico):', err);
    }

    return new ApiResponse(
      HttpCodes.OK,
      ApiMessages.USER_LOGGED_IN_SUCCESSFULLY,
      { token: token, userInfo: userInfo },
    );
  }

  static async reauthenticate(
    user: IUserReauth,
  ): Promise<ApiResponse<{ valid: boolean }>> {
    if (user.email) {
      const loginResponse = await UserService.login({
        email: user.email,
        password: user.password,
      });

      if (loginResponse.status !== HttpCodes.OK || !loginResponse.data) {
        return new ApiResponse(loginResponse.status, loginResponse.message, {
          valid: false,
        });
      }

      return new ApiResponse(HttpCodes.OK, "Reautenticacao validada", {
        valid: true,
      });
    }

    return UserService.reauthenticateOnly(user);
  }

  static async reauthenticateOnly(
    user: IUserReauth,
  ): Promise<ApiResponse<{ valid: boolean }>> {
    const userRegister = user.email
      ? await SupabaseService.getUserByEmail(user.email)
      : user.cpf
        ? await SupabaseService.getUserByCpf(user.cpf)
        : null;

    if (!userRegister) {
      return new ApiResponse(
        HttpCodes.BAD_REQUEST,
        ApiMessages.USER_INPUT_INVALID,
        { valid: false },
      );
    }

    const passwordIsValid = await Bcrypt.comparePasswords(
      user.password,
      userRegister.password,
    );

    if (!passwordIsValid) {
      return new ApiResponse(
        HttpCodes.UNAUTHORIZED,
        ApiMessages.USER_INPUT_INVALID,
        { valid: false },
      );
    }

    return new ApiResponse(HttpCodes.OK, "Reautenticacao validada", {
      valid: true,
    });
  }

  /**
   * Registra um novo usuário no sistema.
   *
   * Fluxo:
   *  1. Em paralelo:
   *      - Busca cadastro de pessoas no SOC.
   *      - Verifica se CPF já existe no Supabase.
   *  2. Se usuário já existe → retorna conflito (409).
   *  3. Se não existe no SOC → retorna not found (404).
   *  4. Gera hash da senha.
   *  5. Cria usuário no Supabase.
   *  6. Retorna dados de usuário mapeados.
   *
   * @param user Dados do usuário a serem cadastrados.
   * @returns ApiResponse<IUserInfo> ou erro apropriado.
   */
  static async register(user: IUserRegister) {
    try {
      const registration = resolveRegistrationCode(user.codigo);
      const normalizedNome = formatPersonName(user.nome);
      const normalizedEmail = normalizeEmail(user.email);
      const supabaseData = await SupabaseService.getUserByEmail(user.email);

      if (supabaseData?.email) {
        return new ApiResponse(
          HttpCodes.CONFLICT,
          ApiMessages.USER_ALREADY_EXISTS,
          null,
        );
      }

      let userInfoMapped: IUserInfo;
      let supabaseCpf = "";

      if (registration.tipoUsuario === "interno") {
        const cadastroPessoas = await SOC.ExportaDadosCadastroPessoas();

        if (!cadastroPessoas) {
          return new ApiResponse(
            HttpCodes.INTERNAL_SERVER_ERROR,
            ApiMessages.SOC_ED_CADASTRO_PESSOAS_NULL,
            null,
          );
        }

        const socRegisterUser = cadastroPessoas.find(
          (item) => String(item.CODIGO) === registration.socCodigo,
        );

        if (!socRegisterUser) {
          return new ApiResponse(
            HttpCodes.NOT_FOUND,
            ApiMessages.SOC_CADASTRO_PESSOA_NOT_FOUND,
            null,
          );
        }

        const socUserInfo = mapCadastroPessoasToUserInfo(socRegisterUser);

        userInfoMapped = {
          ...socUserInfo,
          nome: socUserInfo.nome ? formatPersonName(socUserInfo.nome) : normalizedNome,
          email: normalizedEmail,
          tipoUsuario: registration.tipoUsuario,
          registrationCode: registration.normalizedCode,
        };
        supabaseCpf = userInfoMapped.cpf || "";
      } else {
        userInfoMapped = {
          codigo: createClientUserCodigo(),
          nome: normalizedNome,
          cpf: "",
          email: normalizedEmail,
          perfil: "CLIENTE",
          tipoUsuario: registration.tipoUsuario,
          registrationCode: registration.normalizedCode,
        };
      }

      // Criptografa senha antes de persistir
      const hashedPassword = await Bcrypt.createHash(user.password);

      // Cria usuário no Supabase
      const statusCode = await SupabaseService.createUserAuthRecord({
        ...user,
        codigo: userInfoMapped.codigo,
        nome: userInfoMapped.nome,
        cpf: supabaseCpf,
        email: normalizedEmail,
        password: hashedPassword,
        perfil: userInfoMapped.perfil,
        conselho: userInfoMapped.conselho || undefined,
        uf_conselho: userInfoMapped.ufconselho || undefined,
        tipoUsuario: registration.tipoUsuario,
        registrationCode: registration.normalizedCode,
      });

      if (statusCode != HttpCodes.CREATED) {
        return new ApiResponse(
          HttpCodes.UNPROCESSABLE_ENTITY,
          ApiMessages.USER_REGISTER_FAILED,
          null,
        );
      }

      try {
        await fetch(`${NEST_URL}users/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            codigo: userInfoMapped.codigo,
            cpf: userInfoMapped.cpf || null,
            nome: userInfoMapped.nome,
            email: userInfoMapped.email,
            perfil: userInfoMapped.perfil,
            conselho: userInfoMapped.conselho || null,
            uf_conselho: userInfoMapped.ufconselho || null,
            ultimo_login: new Date().toISOString(),
          }),
        });
      } catch (err) {
        console.error('Erro ao criar usuário na tabela users (não crítico):', err);
      }

      return new ApiResponse(
        HttpCodes.CREATED,
        ApiMessages.USER_REGISTERED_SUCCESSFULLY,
        userInfoMapped,
      );
    } catch (err) {
      console.error(err);

      return new ApiResponse(
        HttpCodes.INTERNAL_SERVER_ERROR,
        ApiMessages.INTERNAL_ERROR,
        null,
      );
    }
  }

  static async validateRecoveryCode(
    cpf: string,
    codigoRecuperacao: string,
  ): Promise<ApiResponse<{ valid: boolean }>> {
    const userRegister = await SupabaseService.getUserByCpf(cpf);

    if (!userRegister) {
      return new ApiResponse(
        HttpCodes.BAD_REQUEST,
        "CPF ou código de recuperação inválidos",
        { valid: false },
      );
    }

    const normalizeCpf = (value?: string | null) => String(value ?? "").replace(/\D/g, "");
    const cpfBancoNormalizado = normalizeCpf(userRegister.cpf);
    if (!cpfBancoNormalizado) {
      return new ApiResponse(
        HttpCodes.BAD_REQUEST,
        "CPF ou código de recuperação inválidos",
        { valid: false },
      );
    }

    const ultimos2Cpf = cpfBancoNormalizado.slice(-2);

    const codigoBase = String(userRegister.codigo).split("").reverse().join("");
    const codigoEsperado = `${codigoBase}${ultimos2Cpf}`;

    const isValid = codigoEsperado === codigoRecuperacao;

    return new ApiResponse(
      isValid ? HttpCodes.OK : HttpCodes.UNAUTHORIZED,
      isValid
        ? "Código validado com sucesso"
        : "CPF ou código de recuperação inválidos",
      { valid: isValid },
    );
  }

  static async resetPassword(
    cpf: string,
    novaSenha: string,
  ): Promise<ApiResponse<{ success: boolean }>> {
    const userRegister = await SupabaseService.getUserByCpf(cpf);

    if (!userRegister) {
      return new ApiResponse(
        HttpCodes.BAD_REQUEST,
        ApiMessages.USER_INPUT_INVALID,
        { success: false },
      );
    }

    const hashedPassword = await Bcrypt.createHash(novaSenha);
    // Usa o CPF já normalizado (sem máscara) para garantir que o UPDATE
    // encontre o usuário mesmo quando houver máscara no CPF
    const cpfNormalizado = cpf.replace(/\D/g, '');
    const updated = await SupabaseService.updatePassword(cpfNormalizado, hashedPassword);

    if (!updated) {
      return new ApiResponse(
        HttpCodes.INTERNAL_SERVER_ERROR,
        ApiMessages.INTERNAL_ERROR,
        { success: false },
      );
    }

    return new ApiResponse(HttpCodes.OK, "Senha atualizada com sucesso", {
      success: true,
    });
  }
}
