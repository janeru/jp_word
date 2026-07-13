import type { Request, Response } from 'express';
import type { ScoreService } from '../services/ScoreService.js';
import { sendOk } from '../http/apiResponse.js';

/** 成績 HTTP 控制器 */
export class ScoreController {
  constructor(private readonly service: ScoreService) {}

  leaderboard = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.leaderboard(req.query.limit as string | undefined);
    sendOk(res, data);
  };

  submit = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.submit(req.body);
    sendOk(res, data, 201);
  };
}
