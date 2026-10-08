import { useEffect, useMemo, useState } from "react";

const CATS = {
  expense: ["Food", "Transport", "Housing", "Bills", "Health", "Fun", "Other"],
  income: ["Salary", "Freelance", "Gift", "Other"],
};
const CATEGORY_COLORS = ["#c8416b", "#e08a3c", "#5b6ee1", "#2a9d8f", "#8a5cc2", "#d4b02a", "#7a7791"];
const CURRENCIES = ["USD", "EUR", "GBP", "PHP", "JPY"];
const KEY = "budget-tracker-v1";

const pad = (n) => String(n).padStart(2, "0");
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const monthOf = (date) => date.slice(0, 7);
const shiftMonth = (m, delta) => {
  const [y, mo] = m.split("-").map(Number);
  const d = new Date(y, mo - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
};
const monthName = (m, opts) => {
  const [y, mo] = m.split("-").map(Number);
  return new Date(y, mo - 1, 1).toLocaleString(undefined, opts);
};
const total = (tx, month, type) =>
  tx.filter((t) => monthOf(t.date) === month && t.type === type).reduce((s, t) => s + t.amount, 0);

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { tx: [], currency: "USD" };
}

function sampleData() {
  const now = monthOf(today());
  const rows = [];
  for (let i = -5; i <= 0; i++) {
    const m = shiftMonth(now, i);
    rows.push(["income", "Salary", "Monthly pay", 2400, `${m}-01`]);
    rows.push(["expense", "Housing", "Rent", 800, `${m}-02`]);
    rows.push(["expense", "Food", "Groceries", 260 + ((i * 37) % 60), `${m}-08`]);
    rows.push(["expense", "Transport", "Fuel and fares", 90 + ((i * 23) % 40), `${m}-12`]);
    rows.push(["expense", "Bills", "Utilities", 120, `${m}-15`]);
    if (i % 2 === 0) rows.push(["expense", "Fun", "Weekend out", 75, `${m}-20`]);
  }
  const t = today();
  return rows
    .filter((r) => r[4] <= t)
    .map(([type, category, description, amount, date]) => ({
      id: crypto.randomUUID(), type, category, description, amount, date,
    }));
}

export default function App() {
  const [state, setState] = useState(load);
  const [month, setMonth] = useState(monthOf(today()));
  const { tx, currency } = state;

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {}
  }, [state]);

  const fmt = (n) => new Intl.NumberFormat(undefined, { style: "currency", currency }).format(n);
  const add = (t) => setState((s) => ({ ...s, tx: [...s.tx, { ...t, id: crypto.randomUUID() }] }));
  const remove = (id) => setState((s) => ({ ...s, tx: s.tx.filter((t) => t.id !== id) }));

  const months = useMemo(() => {
    const set = new Set(tx.map((t) => monthOf(t.date)));
    set.add(monthOf(today()));
    return [...set].sort().reverse();
  }, [tx]);

  const monthTx = tx.filter((t) => monthOf(t.date) === month).sort((a, b) => b.date.localeCompare(a.date));
  const income = total(tx, month, "income");
  const expenses = total(tx, month, "expense");
  const balance = income - expenses;

  return (
    <main className="app">
      <header className="top">
        <div>
          <h1>Budget Tracker</h1>
          <p>Log what comes in and goes out. Data stays in your browser.</p>
        </div>
        <div className="controls">
          <label>
            Month
            <select value={month} onChange={(e) => setMonth(e.target.value)}>
              {months.map((m) => (
                <option key={m} value={m}>{monthName(m, { month: "long", year: "numeric" })}</option>
              ))}
            </select>
          </label>
          <label>
            Currency
            <select value={currency} onChange={(e) => setState((s) => ({ ...s, currency: e.target.value }))}>
              {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
        </div>
      </header>

      <section className="summary">
        <div className="stat income"><span>Income</span><strong>{fmt(income)}</strong></div>
        <div className="stat expense"><span>Expenses</span><strong>{fmt(expenses)}</strong></div>
        <div className={`stat balance ${balance < 0 ? "neg" : ""}`}><span>Balance</span><strong>{fmt(balance)}</strong></div>
      </section>

      <div className="grid">
        <section className="panel">
          <h2>Last 6 months</h2>
          <Trend tx={tx} month={month} fmt={fmt} />
          <Breakdown tx={monthTx} fmt={fmt} />
        </section>

        <section className="panel">
          <h2>Add a transaction</h2>
          <Form onAdd={add} />
          <h2 className="spaced">Transactions</h2>
          {monthTx.length === 0 ? (
            <div className="empty">
              <p>No transactions this month. Add one above.</p>
              {tx.length === 0 && (
                <button onClick={() => setState((s) => ({ ...s, tx: sampleData() }))}>Load sample data</button>
              )}
            </div>
          ) : (
            <ul className="list">
              {monthTx.map((t) => (
                <li key={t.id}>
                  <div>
                    <p>{t.description}</p>
                    <small>{t.category} · {t.date}</small>
                  </div>
                  <span className={t.type}>{t.type === "income" ? "+" : "−"}{fmt(t.amount)}</span>
                  <button onClick={() => remove(t.id)} aria-label={`Delete ${t.description}`}>Delete</button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}

function Form({ onAdd }) {
  const [type, setType] = useState("expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(CATS.expense[0]);
  const [date, setDate] = useState(today());

  const changeType = (t) => {
    setType(t);
    setCategory(CATS[t][0]);
  };
  const submit = (e) => {
    e.preventDefault();
    const value = parseFloat(amount);
    if (!(value > 0) || !description.trim()) return;
    onAdd({ type, amount: value, description: description.trim(), category, date });
    setAmount("");
    setDescription("");
  };

  return (
    <form className="form" onSubmit={submit}>
      <div className="seg" role="group" aria-label="Type">
        {["expense", "income"].map((t) => (
          <button type="button" key={t} className={type === t ? `on ${t}` : ""} onClick={() => changeType(t)} aria-pressed={type === t}>
            {t === "expense" ? "Expense" : "Income"}
          </button>
        ))}
      </div>
      <input placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} aria-label="Description" />
      <div className="row">
        <input type="number" min="0" step="0.01" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} aria-label="Amount" />
        <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category">
          {CATS[type].map((c) => <option key={c}>{c}</option>)}
        </select>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Date" />
      </div>
      <button type="submit" className="primary">Add {type}</button>
    </form>
  );
}

function Trend({ tx, month, fmt }) {
  const data = Array.from({ length: 6 }, (_, i) => {
    const m = shiftMonth(month, i - 5);
    return { m, inc: total(tx, m, "income"), exp: total(tx, m, "expense") };
  });
  const max = Math.max(1, ...data.flatMap((d) => [d.inc, d.exp]));
  const W = 600, H = 220, base = H - 28, top = 12, bw = 24;
  const h = (v) => (v / max) * (base - top);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label="Income and expenses for the last six months">
      <line x1="0" x2={W} y1={base} y2={base} stroke="var(--line)" />
      {data.map((d, i) => {
        const cx = (W / 6) * i + W / 12;
        return (
          <g key={d.m}>
            <rect x={cx - bw - 2} y={base - h(d.inc)} width={bw} height={h(d.inc)} fill="var(--income)" rx="2">
              <title>{`Income: ${fmt(d.inc)}`}</title>
            </rect>
            <rect x={cx + 2} y={base - h(d.exp)} width={bw} height={h(d.exp)} fill="var(--expense)" rx="2">
              <title>{`Expenses: ${fmt(d.exp)}`}</title>
            </rect>
            <text x={cx} y={H - 8} textAnchor="middle" className={d.m === month ? "label sel" : "label"}>
              {monthName(d.m, { month: "short" })}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function Breakdown({ tx, fmt }) {
  const byCat = {};
  tx.filter((t) => t.type === "expense").forEach((t) => (byCat[t.category] = (byCat[t.category] || 0) + t.amount));
  const rows = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
  const sum = rows.reduce((s, r) => s + r[1], 0);
  if (!rows.length) return <p className="muted">Spending by category appears here once you add expenses.</p>;

  return (
    <div className="breakdown">
      <h3>Spending by category</h3>
      {rows.map(([cat, v], i) => (
        <div key={cat} className="bar">
          <span>{cat}</span>
          <div className="track">
            <div style={{ width: `${(v / sum) * 100}%`, background: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
          </div>
          <span>{fmt(v)}</span>
        </div>
      ))}
    </div>
  );
}