import type { Request, Response } from 'express';
import type { WordService } from '../services/WordService.js';
import { sendOk } from '../http/apiResponse.js';

/** 單字 HTTP 控制器:只負責解析請求 / 回傳,業務邏輯交給 Service */
export class WordController {
  constructor(private readonly service: WordService) {}

  list = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.list({
      level: req.query.level as string | undefined,
      category: req.query.category as string | undefined,
      limit: req.query.limit as string | undefined,
    });
    sendOk(res, data);
  };
}
