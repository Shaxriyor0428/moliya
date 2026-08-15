import { Schema, model } from 'mongoose';

/**
 * Yordamchi kolleksiya — faqat seed va hisobotdagi izohlar uchun.
 * Hisobot raqamlari bunga BOG'LIQ EMAS: hammasi jurnaldan chiqadi.
 * Shu sabab indeks, unique constraint va validatsiya qo'yilmagan.
 */
export interface Student {
  name: string;
  /** Chegirmasiz oylik to'lov, butun son so'm. */
  monthlyFee: number;
  /** 0..100. Amaldagi to'lov: floor(monthlyFee × (100 − discountPercent) / 100) — D5. */
  discountPercent: number;
  enrolledFrom: Date;
  droppedAt?: Date | null;
}

const studentSchema = new Schema<Student>(
  {
    name: { type: String, required: true },
    monthlyFee: { type: Number, required: true },
    discountPercent: { type: Number, default: 0 },
    enrolledFrom: { type: Date, required: true },
    droppedAt: { type: Date, default: null },
  },
  { versionKey: false },
);

export const StudentModel = model<Student>('Student', studentSchema);
