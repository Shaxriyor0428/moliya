import mongoose from 'mongoose';
import { activeMongoUri } from '../config/env.js';

/**
 * Mahalliy standalone MongoDB. Replica set / tranzaksiya kerak emas:
 * yozuv qatorlari bitta hujjat ichida, Mongo ning bitta hujjatga yozuvi atomar
 * (docs/02-model.md — "Nega lines ichkariga joylashtirilgan").
 */
export async function connectDb(uri: string = activeMongoUri): Promise<void> {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5_000 });
}

export async function disconnectDb(): Promise<void> {
  await mongoose.disconnect();
}
