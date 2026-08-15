import { Schema, model } from 'mongoose';

/** Yordamchi kolleksiya — hisobot raqamlari bunga bog'liq emas. */
export interface Investor {
  name: string;
}

const investorSchema = new Schema<Investor>(
  {
    name: { type: String, required: true },
  },
  { versionKey: false },
);

export const InvestorModel = model<Investor>('Investor', investorSchema);
