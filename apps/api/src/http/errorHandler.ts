import type { ErrorRequestHandler } from 'express';
import { AppError } from '../errors/AppError.js';
import { sendError } from './apiResponse.js';

/**
 * 集中式錯誤處理中介層(掛在所有路由之後)。
 * 已知的 AppError → 對應狀態碼;其餘 → 500 並記錄。
 */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    return sendError(res, err.message, err.statusCode);
  }
  console.error('❌ 未預期的錯誤:', err);
  sendError(res, '伺服器內部錯誤', 500);
};
