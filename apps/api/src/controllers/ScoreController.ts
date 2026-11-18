import type { Request, Response } from 'express';
import type { ScoreService } from '../services/ScoreService.js';
import { sendOk } from '../http/apiResponse.js';
import { UnauthorizedError } from '../errors/AppError.js';

/** 成績 HTTP 控制器 */
export class ScoreController {
  constructor(private readonly service: ScoreService) {}

  leaderboard = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.leaderboard(req.query.limit as string | undefined);
    sendOk(res, data);
  };

  myRank = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) throw new UnauthorizedError('請先登入');
    sendOk(res, await this.service.myRank(req.user));
  };

  submit = async (req: Request, res: Response): Promise<void> => {
    // 路由已掛 requirePermission,這裡再擋一次是為了型別收窄
    if (!req.user) throw new UnauthorizedError('請先登入');
    const data = await this.service.submit(req.body, req.user);
    sendOk(res, data, 201);
  };
}
