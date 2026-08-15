import { Schema, model } from 'mongoose';

/**
 * Yordamchi kolleksiya — hisobot raqamlari bunga bog'liq emas.
 *
 * Amortizatsiya jadvali saqlanmaydi: har oy foiz = qoldiq × annualRatePercent / 12,
 * asosiy qarz esa qat'iy summa (D8). TZ §5.4 dagi 3 mln / 9 mln shu sxemaga mos.
 */
export interface Loan {
  principal: number;
  annualRatePercent: number;
  takenAt: Date;
  termMonths: number;
}

const loanSchema = new Schema<Loan>(
  {
    principal: { type: Number, required: true },
    annualRatePercent: { type: Number, required: true },
    takenAt: { type: Date, required: true },
    termMonths: { type: Number, required: true },
  },
  { versionKey: false },
);

export const LoanModel = model<Loan>('Loan', loanSchema);
