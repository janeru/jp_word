import type { Request, Response } from 'express';
import type { UserService } from '../services/UserService.js';
import { sendOk } from '../http/apiResponse.js';
import { ValidationError } from '../errors/AppError.js';

/** 使用者管理 HTTP 控制器 */
export class UserController {
  constructor(private readonly service: UserService) {}

  list = async (_req: Request, res: Response): Promise<void> => {
    sendOk(res, await this.service.list());
  };

  get = async (req: Request, res: Response): Promise<void> => {
    sendOk(res, await this.service.get(parseId(req.params.id)));
  };

  assignRoles = async (req: Request, res: Response): Promise<void> => {
    sendOk(res, await this.service.assignRoles(parseId(req.params.id), req.body));
  };
}

function parseId(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new ValidationError('無效的 id');
  return id;
}
