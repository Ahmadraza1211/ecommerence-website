import { Request, Response, NextFunction } from 'express';

export class ApiError extends Error {
  statusCode: number;
  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  console.error('[Error]', err?.message || err);
  const statusCode = err?.statusCode || 500;
  const message = err?.message || 'Internal server error';
  res.status(statusCode).json({ error: message, details: err?.details });
}

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: 'Resource not found' });
}
