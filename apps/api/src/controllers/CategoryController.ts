import type { Request, Response } from 'express';
import type { CategoryService } from '../services/CategoryService.js';
import { sendOk } from '../http/apiResponse.js';

/** 分類 HTTP 控制器 */
export class CategoryController {
  constructor(private readonly service: CategoryService) {}

  list = async (_req: Request, res: Response): Promise<void> => {
    const data = await this.service.listAll();
    sendOk(res, data);
  };

  getBySlug = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.getBySlug(String(req.params.slug));
    sendOk(res, data);
  };
}
