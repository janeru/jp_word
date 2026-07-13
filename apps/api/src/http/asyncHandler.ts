import type { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * 包裝 async controller,讓其中 throw 的錯誤自動轉交 Express 錯誤中介層,
 * 避免每個 handler 都要寫 try/catch。
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}
