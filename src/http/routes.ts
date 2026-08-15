import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { balance } from '../reports/balance.js';
import { cashFlow } from '../reports/cashflow.js';
import { listPeriods } from '../reports/periods.js';
import { pnl } from '../reports/pnl.js';

/**
 * Hisobot endpointlari — docs/04-reports.md dagi jadval.
 * Autentifikatsiya yo'q (TZ §10). Hisobotlar bazaga hech narsa yozmaydi.
 */

const periodQuery = z.object({
  period: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'period "YYYY-MM" formatida bo\'lishi kerak'),
});

const asOfQuery = z.object({
  asOf: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'asOf "YYYY-MM-DD" formatida bo\'lishi kerak'),
});

export const routes: Router = Router();

routes.get('/api/reports/pnl', async (req, res) => {
  const parsed = periodQuery.safeParse(req.query);
  if (!parsed.success) return badRequest(res, parsed.error);
  res.json(await pnl(parsed.data.period));
});

routes.get('/api/reports/cash-flow', async (req, res) => {
  const parsed = periodQuery.safeParse(req.query);
  if (!parsed.success) return badRequest(res, parsed.error);
  res.json(await cashFlow(parsed.data.period));
});

routes.get('/api/reports/balance', async (req, res) => {
  const parsed = asOfQuery.safeParse(req.query);
  if (!parsed.success) return badRequest(res, parsed.error);

  // ISO sana satri UTC da parse bo'ladi — mahalliy vaqt aralashmaydi (D10).
  const asOf = new Date(`${parsed.data.asOf}T00:00:00.000Z`);
  if (Number.isNaN(asOf.getTime())) {
    return res.status(400).json({ error: `Yaroqsiz sana: ${parsed.data.asOf}` });
  }

  res.json(await balance(asOf));
});

routes.get('/api/periods', async (_req: Request, res: Response) => {
  res.json(await listPeriods());
});

function badRequest(res: Response, error: z.ZodError): Response {
  return res.status(400).json({
    error: 'Query parametri noto\'g\'ri',
    issues: error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
  });
}
