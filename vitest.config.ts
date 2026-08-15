import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    // Testlar bitta mahalliy bazani (moliya_test) baham ko'radi va har testdan
    // oldin kolleksiyalarni tozalaydi. Fayllar parallel ketsa — bir-birining
    // ma'lumotini o'chirib yuboradi. Shuning uchun ketma-ket.
    fileParallelism: false,
    hookTimeout: 20_000,
    testTimeout: 20_000,
  },
});
