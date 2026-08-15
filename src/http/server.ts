import express, { type NextFunction, type Request, type Response } from 'express';
import { env } from '../config/env.js';
import { connectDb } from '../db/connection.js';
import { ensureIndexes } from '../db/indexes.js';
import { routes } from './routes.js';

const app = express();

/**
 * CORS — frontend boshqa portda (Vite :5173) ishlaydi. Faqat GET kerak,
 * cookie va autentifikatsiya yo'q, shuning uchun `cors` paketi ortiqcha.
 */
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(routes);

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

await connectDb();
await ensureIndexes();

app.listen(env.PORT, () => {
  console.log(`moliya API: http://localhost:${env.PORT}`);
});
