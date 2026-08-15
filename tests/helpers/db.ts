import mongoose from 'mongoose';
import { afterAll, beforeAll, beforeEach } from 'vitest';
import { env } from '../../src/config/env.js';

/**
 * Har test BO'SH bazadan boshlanadi (TZ §5 talabi) va alohida bazada ishlaydi
 * (`moliya_test`) — `npm run seed` bilan yaratilgan ma'lumotni o'chirib
 * yubormaslik uchun.
 *
 * Test fayllari ketma-ket ishlaydi (vitest.config.ts: fileParallelism: false),
 * aks holda ular bir-birining kolleksiyalarini tozalab yuborardi.
 */
export function useTestDb(): void {
  beforeAll(async () => {
    await mongoose.connect(env.MONGO_URI_TEST, { serverSelectionTimeoutMS: 5_000 });
  });

  beforeEach(async () => {
    const collections = await mongoose.connection.db!.collections();
    await Promise.all(collections.map((c) => c.deleteMany({})));
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });
}
