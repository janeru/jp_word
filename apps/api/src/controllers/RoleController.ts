import type { Request, Response } from 'express';
import type { RoleService } from '../services/RoleService.js';
import { sendOk } from '../http/apiResponse.js';
import { ValidationError } from '../errors/AppError.js';

/** 角色與權限 HTTP 控制器 */
export class RoleController {
  constructor(private readonly service: RoleService) {}

  list = async (_req: Request, res: Response): Promise<void> => {
    sendOk(res, await this.service.list());
  };

  listPermissions = async (_req: Request, res: Response): Promise<void> => {
    sendOk(res, await this.service.listPermissions());
  };

  create = async (req: Request, res: Response): Promise<void> => {
    sendOk(res, await this.service.create(req.body), 201);
  };

  update = async (req: Request, res: Response): Promise<void> => {
    sendOk(res, await this.service.update(parseId(req.params.id), req.body));
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    await this.service.remove(parseId(req.params.id));
    sendOk(res, { deleted: true });
  };
}

/** 把路徑參數轉成正整數 id(Express 5 的參數型別可能是陣列,取第一個) */
function parseId(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new ValidationError('無效的 id');
  return id;
}
