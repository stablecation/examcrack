import React, { useMemo, useState } from "react";
import { Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Area, ComposedChart } from "recharts";
import { TrendingUp } from "lucide-react";
import CardShell from "../CardShell";

const SUBJECTS = [
  { key: "total", label: "Total", color: "#58a6ff" },
  { key: "phy", label: "Physics", color: "#3b82f6" },
  { key: "chem", label: "Chemistry", color: "#22c55e" },
  { key: "math", label: "Math/Bio", color: "#ef4444" },
];

export default function MockTestCard({ scores, target, onAdd, onDelete, onDeleteCard, onTargetChange }) {
  const [active, setActive] = useState("total");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", phy: "", chem: "", math: "", maxMarks: "300" });

  const data = useMemo(
    () =>
      scores.map((s, i) => ({
        name: s.name || `Test ${i + 1}`,
        total: (s.phy || 0) + (s.chem || 0) + (s.math || 0),
        phy: s.phy || 0,
        chem: s.chem || 0,
        math: s.math || 0,
      })),
    [scores]
  );

  const totals = data.map((d) => d.total);
  const avg = totals.length ? Math.round(totals.reduce((a, b) => a + b, 0) / totals.length) : 0;
  const best = totals.length ? Math.max(...totals) : 0;
  const trend = totals.length >= 2 ? totals[totals.length - 1] - totals[totals.length - 2] : 0;

  const activeMeta = SUBJECTS.find((s) => s.key === active);

  const submit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onAdd({
      name: form.name.trim(),
      phy: parseFloat(form.phy) || 0,
      chem: parseFloat(form.chem) || 0,
      math: parseFloat(form.math) || 0,
      maxMarks: parseFloat(form.maxMarks) || 300,
    });
    setForm({ name: "", phy: "", chem: "", math: "", maxMarks: "300" });
    setShowForm(false);
  };

  const Stat = ({ label, value, color }) => (
    <div className="bg-white/5 rounded-lg p-2 text-center">
      <div className="text-[10px] text-secondary uppercase tracking-wider">{label}</div>
      <div className="text-lg font-bold" style={{ color: color || "#fff" }}>{value}</div>
    </div>
  );

  return (
    <CardShell
      title="Mock Test Progress"
      titleIcon={<TrendingUp size={18} style={{ color: "var(--accent-color)" }} />}
      onDelete={onDeleteCard}
    >
      <div className="grid grid-cols-3 gap-2 mb-4">
        <Stat label="Average" value={avg} />
        <Stat label="Best" value={best} color="var(--accent-color)" />
        <Stat label="Trend" value={trend > 0 ? `▲ ${trend}` : trend < 0 ? `▼ ${Math.abs(trend)}` : "-"} color={trend > 0 ? "#22c55e" : trend < 0 ? "#ef4444" : "#9ca3af"} />
      </div>

      <div className="h-56 w-full" data-testid="mock-chart">
        {data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-secondary text-sm">
            Add a test score to see your progress.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={activeMeta.color} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={activeMeta.color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#21262d" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: "#8b949e", fontSize: 11 }} axisLine={{ stroke: "#30363d" }} tickLine={false} />
              <YAxis tick={{ fill: "#8b949e", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 10, color: "#c9d1d9" }} />
              {target > 0 && <ReferenceLine y={target} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: "Target", fill: "#f59e0b", fontSize: 10, position: "right" }} />}
              <Area type="monotone" dataKey={active} stroke="none" fill="url(#grad)" />
              <Line type="monotone" dataKey={active} stroke={activeMeta.color} strokeWidth={2.5} dot={{ r: 4, fill: activeMeta.color }} activeDot={{ r: 6 }} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="flex justify-center flex-wrap gap-2 my-4">
        {SUBJECTS.map((s) => (
          <button
            key={s.key}
            onClick={() => setActive(s.key)}
            className="text-[10px] px-3 py-1 rounded-full border transition-all font-semibold"
            style={
              active === s.key
                ? { background: s.color, borderColor: s.color, color: "#fff" }
                : { borderColor: "#374151", color: "#8b949e" }
            }
            data-testid={`mock-toggle-${s.key}`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <button
        onClick={() => setShowForm((v) => !v)}
        className="w-full text-xs text-secondary hover:text-white py-1"
        data-testid="mock-add-toggle"
      >
        + Add Test Score
      </button>
      {showForm && (
        <form onSubmit={submit} className="grid grid-cols-4 gap-2 mt-2">
          <input className="form-input col-span-4 px-2 py-2 text-xs" placeholder="Test Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required data-testid="mock-name" />
          <input className="form-input px-2 py-2 text-xs text-center" type="number" placeholder="Phy" value={form.phy} onChange={(e) => setForm({ ...form, phy: e.target.value })} />
          <input className="form-input px-2 py-2 text-xs text-center" type="number" placeholder="Chem" value={form.chem} onChange={(e) => setForm({ ...form, chem: e.target.value })} />
          <input className="form-input px-2 py-2 text-xs text-center" type="number" placeholder="M/B" value={form.math} onChange={(e) => setForm({ ...form, math: e.target.value })} />
          <input className="form-input px-2 py-2 text-xs text-center" type="number" placeholder="Total" value={form.maxMarks} onChange={(e) => setForm({ ...form, maxMarks: e.target.value })} />
          <button type="submit" className="btn-primary font-bold py-1.5 rounded text-xs col-span-4" data-testid="mock-save">Save</button>
        </form>
      )}

      {scores.length > 0 && (
        <div className="mt-3">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-[10px] font-bold text-secondary uppercase tracking-widest">History</h3>
            <div className="flex items-center gap-2 text-xs">
              <label className="text-secondary text-[10px]">Target:</label>
              <input
                type="number"
                value={target || ""}
                onChange={(e) => onTargetChange(parseFloat(e.target.value) || 0)}
                className="form-input w-14 px-1 py-0.5 text-right text-[10px]"
                data-testid="mock-target"
              />
            </div>
          </div>
          <ul className="space-y-2 max-h-32 overflow-y-auto no-scrollbar">
            {scores.map((s) => (
              <li key={s.id} className="flex justify-between items-center bg-white/5 rounded-md px-3 py-1.5 text-xs group">
                <span>{s.name}</span>
                <span className="flex items-center gap-2">
                  <span className="font-bold text-white">{(s.phy || 0) + (s.chem || 0) + (s.math || 0)}</span>
                  <button onClick={() => onDelete(s.id)} className="text-secondary hover:text-red-400 opacity-0 group-hover:opacity-100">✕</button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </CardShell>
  );
}
