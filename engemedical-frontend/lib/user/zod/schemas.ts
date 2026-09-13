import { z } from "zod";

export const userRegisterSchema = z.object({
  email: z.string().trim().email(),
  codigo: z.string().min(1),
  password: z.string().min(3),
});
export type IUserRegister = z.infer<typeof userRegisterSchema>;

export const userLoginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string(),
});
export type IUserLogin = z.infer<typeof userLoginSchema>;

export const recoveryValidateSchema = z.object({
  cpf: z.string().regex(/^\d{11}$|^\d{3}\.\d{3}\.\d{3}-\d{2}$/),
  codigo_recuperacao: z.string().min(1),
});
export type IRecoveryValidate = z.infer<typeof recoveryValidateSchema>;

export const recoveryResetSchema = z.object({
  cpf: z.string().regex(/^\d{11}$|^\d{3}\.\d{3}\.\d{3}-\d{2}$/),
  nova_senha: z.string().min(3),
});
export type IRecoveryReset = z.infer<typeof recoveryResetSchema>;
