import type { Request, Response } from 'express';
import type { AuthService } from '../services/AuthService.js';
import { sendOk } from '../http/apiResponse.js';
import { clearAuthCookie, setAuthCookie, signToken } from '../auth/token.js';

/**
 * 認證 HTTP 控制器。
 * token 一律只寫進 httpOnly cookie,不放在回應 body —
 * 前端讀不到也不需要保管 token,降低 XSS 風險。
 */
export class AuthController {
  constructor(private readonly service: AuthService) {}

  register = async (req: Request, res: Response): Promise<void> => {
    const user = await this.service.register(req.body);
    setAuthCookie(res, signToken({ sub: user.id, email: user.email }));
    sendOk(res, user, 201);
  };

  login = async (req: Request, res: Response): Promise<void> => {
    const user = await this.service.login(req.body);
    setAuthCookie(res, signToken({ sub: user.id, email: user.email }));
    sendOk(res, user);
  };

  logout = async (_req: Request, res: Response): Promise<void> => {
    clearAuthCookie(res);
    sendOk(res, { loggedOut: true });
  };

  /** 前端啟動時呼叫,用來還原登入狀態;未登入回 null 而非 401 */
  me = async (req: Request, res: Response): Promise<void> => {
    sendOk(res, req.user ?? null);
  };
}
