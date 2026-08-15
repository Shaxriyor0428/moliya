import express from 'express';
import { env } from '../config/env.js';
import { connectDb } from '../db/connection.js';

// Hisobot endpointlari 3-sessiyada qo'shiladi. Hozircha server faqat
// ko'tariladi va bazaga ulanadi — skeletning ishlashini tekshirish uchun.
const app = express();

await connectDb();

app.listen(env.PORT, () => {
  console.log(`moliya API: http://localhost:${env.PORT}`);
});
