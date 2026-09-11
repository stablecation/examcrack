import React, { useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import CardShell from "../CardShell";
import { formatDateToISO } from "../../lib/dates";

export default function DailyAgendaCard({ agenda, onChange }) {
  const [date, setDate] = useState(formatDateToISO(new Date()));
  const [text, setText] = useState("");
  const list = agenda?.[date] || [];
  const done = list.filter((t) => t.done).length;
  const pct = list.length ? Math.round((done / list.length) * 100) : 0;

  const write = (next) => onChange({ ...(agenda || {}), [date]: next });

  const shift = (delta) => {
    const d = new Date(date + "T00:00:00");
    d.setDate(d.getDate() + delta);
    setDate(formatDateToISO(d));
  };

  const add = (e) => {
    e.preventDefault();
    const v = text.trim();
    if (!v) return;
    write([...list, { id: `${Date.now()}`, text: v, done: false }]);
    setText("");
  };
  const toggle = (id) => write(list.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  const remove = (id) => write(list.filter((t) => t.id !== id));

  const pretty = new Date(date + "T00:00:00").toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });

  return (
    <CardShell title="Daily Agenda" bodyClass="flex flex-col">
      <div className="flex items-center justify-between gap-2 px-3 py-2 mb-3 bg-black/20 rounded-lg border border-white/5">
        <button onClick={() => shift(-1)} className="p-1 text-gray-400 hover:text-white rounded" data-testid="agenda-prev">
          <ChevronLeft size={16} />
        </button>
        <span className="text-xs font-bold tracking-wide" data-testid="agenda-date">{pretty}</span>
        <button onClick={() => shift(1)} className="p-1 text-gray-400 hover:text-white rounded" data-testid="agenda-next">
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <div className="progress-track flex-1">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-[10px] text-secondary font-bold">{pct}%</span>
      </div>

      <ul className="flex-1 space-y-2 overflow-y-auto no-scrollbar min-h-[70px]" data-testid="agenda-list">
        {list.length === 0 && <li className="text-center text-xs text-secondary py-6">Nothing planned for this day.</li>}
        {list.map((t) => (
          <li key={t.id} className="flex items-center gap-2 group text-sm bg-white/5 rounded-lg px-3 py-2">
            <input type="checkbox" checked={t.done} onChange={() => toggle(t.id)} className="accent-[var(--accent-color)] w-4 h-4 cursor-pointer" />
            <span className={`flex-1 ${t.done ? "line-through text-secondary" : ""}`}>{t.text}</span>
            <button onClick={() => remove(t.id)} className="text-secondary hover:text-red-400 opacity-0 group-hover:opacity-100">✕</button>
          </li>
        ))}
      </ul>

      <form onSubmit={add} className="flex items-center gap-2 mt-3">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add task for this day..." className="form-input flex-1 px-3 py-2 text-sm" data-testid="agenda-input" />
        <button type="submit" className="btn-primary w-9 h-9 flex items-center justify-center rounded-full shrink-0" data-testid="agenda-add">
          <Plus size={16} />
        </button>
      </form>
    </CardShell>
  );
}
