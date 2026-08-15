import { useEffect, useState } from 'react';

/**
 * TZ §8: dizayn baholanmaydi, oddiy jadval yetarli, UI kutubxona kerak emas.
 * Shu sababli: bitta fayl, CSS fayl yo'q, komponentlarga bo'linmagan.
 */

const API = 'http://localhost:3000';

interface Pnl {
  period: string;
  revenue: number;
  expenses: Record<string, number>;
  totalExpense: number;
  netProfit: number;
}

interface CashFlow {
  period: string;
  opening: number;
  operating: number;
  investing: number;
  financing: number;
  netChange: number;
  closing: number;
}

interface Balance {
  asOf: string;
  assets: Record<string, number>;
  liabilities: Record<string, number>;
  equity: { capital: number; retainedEarnings: number; total: number };
  check: { assets: number; liabilitiesAndEquity: number; difference: number };
}

/** 1 800 000 — bo'sh joy bilan. */
const som = (n: number): string => n.toLocaleString('en-US').replace(/,/g, ' ');

/** "2026-01" -> shu oyning oxirgi kuni, UTC ("2026-01-31"). */
const lastDayOf = (period: string): string => {
  const [year, month] = period.split('-').map(Number);
  return new Date(Date.UTC(year!, month!, 0)).toISOString().slice(0, 10);
};

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`);
  if (!res.ok) throw new Error(`${path} → HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

export function App() {
  const [periods, setPeriods] = useState<string[]>([]);
  const [period, setPeriod] = useState('');
  const [data, setData] = useState<{ pnl: Pnl; cash: CashFlow; balance: Balance } | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getJson<string[]>('/api/periods')
      .then((list) => {
        setPeriods(list);
        setPeriod(list[list.length - 1] ?? '');
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!period) return;
    setLoading(true);
    setError('');

    Promise.all([
      getJson<Pnl>(`/api/reports/pnl?period=${period}`),
      getJson<CashFlow>(`/api/reports/cash-flow?period=${period}`),
      getJson<Balance>(`/api/reports/balance?asOf=${lastDayOf(period)}`),
    ])
      .then(([pnl, cash, balance]) => setData({ pnl, cash, balance }))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [period]);

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', margin: '2rem', maxWidth: 720 }}>
      <h1>Moliya hisobotlari</h1>

      <label>
        Oy:{' '}
        <select value={period} onChange={(e) => setPeriod(e.target.value)}>
          {periods.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </label>

      {loading && <p>Yuklanmoqda…</p>}
      {error && <p style={{ color: 'crimson' }}>Xato: {error}</p>}

      {data && !loading && (
        <>
          <h2>Foyda va zarar — {data.pnl.period}</h2>
          <table border={1} cellPadding={6}>
            <tbody>
              <Row label="Daromad" value={data.pnl.revenue} />
              {Object.entries(data.pnl.expenses).map(([account, amount]) => (
                <Row key={account} label={account} value={-amount} />
              ))}
              <Row label="Jami xarajat" value={data.pnl.totalExpense} bold />
              <Row label="Sof foyda" value={data.pnl.netProfit} bold />
            </tbody>
          </table>

          <h2>Pul oqimi — {data.cash.period}</h2>
          <table border={1} cellPadding={6}>
            <tbody>
              <Row label="Oy boshidagi qoldiq" value={data.cash.opening} />
              <Row label="Operatsion" value={data.cash.operating} />
              <Row label="Investitsion" value={data.cash.investing} />
              <Row label="Moliyaviy" value={data.cash.financing} />
              <Row label="Sof o'zgarish" value={data.cash.netChange} bold />
              <Row label="Oy oxiridagi qoldiq" value={data.cash.closing} bold />
            </tbody>
          </table>

          <h2>Balans — {data.balance.asOf}</h2>
          <table border={1} cellPadding={6}>
            <tbody>
              {Object.entries(data.balance.assets).map(([key, value]) => (
                <Row key={key} label={key === 'total' ? 'Aktivlar jami' : key} value={value} bold={key === 'total'} />
              ))}
              {Object.entries(data.balance.liabilities).map(([key, value]) => (
                <Row key={key} label={key === 'total' ? 'Majburiyatlar jami' : key} value={value} bold={key === 'total'} />
              ))}
              <Row label="Kapital" value={data.balance.equity.capital} />
              <Row label="Taqsimlanmagan foyda" value={data.balance.equity.retainedEarnings} />
              <Row label="Kapital jami" value={data.balance.equity.total} bold />
            </tbody>
          </table>

          <p>
            Tekshiruv: aktivlar {som(data.balance.check.assets)} = majburiyat + kapital{' '}
            {som(data.balance.check.liabilitiesAndEquity)} — <b>farq: {som(data.balance.check.difference)}</b>
          </p>
        </>
      )}
    </main>
  );
}

function Row({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <tr style={bold ? { fontWeight: 'bold' } : undefined}>
      <td>{label}</td>
      <td style={{ textAlign: 'right' }}>{som(value)}</td>
    </tr>
  );
}
