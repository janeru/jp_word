import type { AuthUser, LoginRequest, RegisterRequest } from '@jp-word/shared';
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '@jp-word/shared';
import { ConflictError, UnauthorizedError, ValidationError } from '../errors/AppError.js';
import type { IUserRepository } from '../repositories/UserRepository.js';
import type { IRoleRepository } from '../repositories/RoleRepository.js';
import { hashPassword, verifyPassword } from '../auth/password.js';
import { toAuthUser } from '../mappers/authMapper.js';
import {
  getCachedAuthUser,
  invalidateAuthUser,
  setCachedAuthUser,
} from '../redis/authCache.js';

const MAX_NAME_LENGTH = 32;
// 夠寬鬆的 email 格式檢查:擋掉明顯的錯字,真正的驗證交給寄信流程
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** 註冊、登入與身分查詢的業務邏輯 */
export class AuthService {
  constructor(
    private readonly users: IUserRepository,
    private readonly roles: IRoleRepository,
  ) {}

  /**
   * 依 id 載入完整身分(含角色與權限聯集)。
   * 每個需要驗證的請求都會呼叫它 — 因此權限異動立即生效,不必等 token 過期。
   * 已停用或已軟刪除的帳號一律回 null,等同未登入。
   */
  async loadAuthUser(id: number): Promise<AuthUser | null> {
    // 先問快取。Redis 不可用時 getCachedAuthUser 回 null,自動退回查資料庫。
    const cached = await getCachedAuthUser(id);
    if (cached) return cached;

    const user = await this.users.findByIdWithRoles(id);
    if (!user || !user.isActive) return null;

    const authUser = toAuthUser(user);
    await setCachedAuthUser(authUser);
    return authUser;
  }

  /** 註冊:建立帳號並掛上預設角色 */
  async register(body: Partial<RegisterRequest>): Promise<AuthUser> {
    const { email, password, name } = this.validateRegister(body);

    if (await this.users.existsByEmail(email)) {
      throw new ConflictError('這個 email 已經被註冊了');
    }

    const user = await this.users.create({
      email,
      passwordHash: await hashPassword(password),
      name,
    });

    // 掛上預設角色(seed 會把 player 設為 isDefault)
    const defaultRoles = await this.roles.findDefaults();
    await this.users.assignRoles(
      user.id,
      defaultRoles.map((r) => r.id),
    );

    const created = await this.loadAuthUser(user.id);
    if (!created) throw new ValidationError('建立帳號失敗');
    return created;
  }

  /**
   * 登入:比對密碼並回傳身分。
   * 注意:帳號不存在與密碼錯誤回傳同一個訊息,
   * 避免這支 API 被拿來探測哪些 email 有註冊過。
   */
  async login(body: Partial<LoginRequest>): Promise<AuthUser> {
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    if (!email || !password) {
      throw new ValidationError('請輸入 email 與密碼');
    }

    const user = await this.users.findByEmailWithPassword(email);
    if (!user) throw new UnauthorizedError('email 或密碼錯誤');

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) throw new UnauthorizedError('email 或密碼錯誤');

    if (!user.isActive) throw new UnauthorizedError('這個帳號已被停用');

    await this.users.touchLastLogin(user.id);
    // lastLoginAt 剛更新,清掉舊快取以免回傳過期的登入時間
    await invalidateAuthUser(user.id);

    const authUser = await this.loadAuthUser(user.id);
    if (!authUser) throw new UnauthorizedError('這個帳號已被停用');
    return authUser;
  }

  /** 驗證並正規化註冊資料 */
  private validateRegister(body: Partial<RegisterRequest>): RegisterRequest {
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const name = typeof body.name === 'string' ? body.name.trim() : '';

    if (!EMAIL_PATTERN.test(email)) {
      throw new ValidationError('email 格式不正確');
    }
    if (password.length < PASSWORD_MIN_LENGTH) {
      throw new ValidationError(`密碼至少要 ${PASSWORD_MIN_LENGTH} 個字元`);
    }
    if (password.length > PASSWORD_MAX_LENGTH) {
      throw new ValidationError(`密碼最多 ${PASSWORD_MAX_LENGTH} 個字元`);
    }
    if (!name) {
      throw new ValidationError('請輸入顯示名稱');
    }

    return { email, password, name: name.slice(0, MAX_NAME_LENGTH) };
  }
}
