/**
 * 應用程式自訂錯誤基底。
 * 各層(Service/Controller)只要 throw 這些型別化錯誤,
 * 由集中式錯誤處理中介層統一轉成 HTTP 回應。
 */
export abstract class AppError extends Error {
  /** 對應的 HTTP 狀態碼 */
  abstract readonly statusCode: number;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** 400:請求資料不合法 */
export class ValidationError extends AppError {
  readonly statusCode = 400;
}

/** 404:找不到資源 */
export class NotFoundError extends AppError {
  readonly statusCode = 404;
}
