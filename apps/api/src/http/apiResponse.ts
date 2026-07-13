import type { Response } from 'express';
import type { ApiResponse } from '@jp-word/shared';

/** 統一成功回應格式 */
export function sendOk<T>(res: Response, data: T, status = 200): void {
  const body: ApiResponse<T> = { ok: true, data };
  res.status(status).json(body);
}

/** 統一失敗回應格式 */
export function sendError(res: Response, error: string, status = 500): void {
  const body: ApiResponse<never> = { ok: false, error };
  res.status(status).json(body);
}
