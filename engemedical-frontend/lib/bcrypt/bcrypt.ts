import * as bcrypt from "bcrypt";

export class Bcrypt {
  static async createHash(str: string): Promise<string> {
    return await bcrypt.hash(str, 10);
  }

  static async comparePasswords(
    password: string,
    hash: string,
  ): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  }
}
