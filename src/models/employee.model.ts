import { Schema, model } from 'mongoose';

/** Yordamchi kolleksiya — hisobot raqamlari bunga bog'liq emas (student.model.ts izohiga qarang). */
export interface Employee {
  name: string;
  /** Oylik ish haqi, butun son so'm. */
  monthlySalary: number;
  hiredFrom: Date;
  firedAt?: Date | null;
}

const employeeSchema = new Schema<Employee>(
  {
    name: { type: String, required: true },
    monthlySalary: { type: Number, required: true },
    hiredFrom: { type: Date, required: true },
    firedAt: { type: Date, default: null },
  },
  { versionKey: false },
);

export const EmployeeModel = model<Employee>('Employee', employeeSchema);
