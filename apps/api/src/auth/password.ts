import bcrypt from 'bcryptjs';

/** bcrypt 成本因子:10 在安全性與登入速度之間是常見的平衡點 */
const SALT_ROUNDS = 10;

/** 把明碼雜湊成可存進資料庫的字串 */
export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

/** 比對明碼與雜湊值 */
export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
