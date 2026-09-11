import React, { useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Flame, Target, Clock, BookOpen } from "lucide-react";
import { formatDateToISO, fmtDuration } from "../lib/dates";

export default function StatisticsView({ logs, scores }) {
  const [range, setRange] = useState(7);

  const byDate = useMemo(() => {
    const map = {};
    logs.forEach((l) => {
      map[l.date] = (map[l.date] || 0) + l.seconds;
    });
    return map;
  }, [logs]);

  const totalSeconds = logs.reduce((a, l) => a + l.seconds, 0);

  const streak = useMemo(() => {
    let s = 0;
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    while ((byDate[formatDateToISO(d)] || 0) > 0) {
      s += 1;
      d.setDate(d.getDate() - 1);
    }
    return s;
  }, [byDate]);

  const consistency = useMemo(() => {
    let studied = 0;
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    for (let i = 0; i < 30; i += 1) {
      if ((byDate[formatDateToISO(d)] || 0) > 0) studied += 1;
      d.setDate(d.getDate() - 1);
    }
    return Math.round((studied / 30) * 100);
  }, [byDate]);

  const grade = consistency >= 80 ? "A" : consistency >= 60 ? "B" : consistency >= 40 ? "C" : "D";

  const chartData = useMemo(() => {
    const out = [];
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    for (let i = range - 1; i >= 0; i -= 1) {
      const dd = new Date(d);
      dd.setDate(d.getDate() - i);
      const iso = formatDateToISO(dd);
      out.push({
        label: dd.toLocaleDateString([], range === 7 ? { weekday: "short" } : { day: "numeric", month: "short" }),
        hours: +((byDate[iso] || 0) / 3600).toFixed(2),
      });
    }
    return out;
  }, [byDate, range]);

  const subjectTotals = useMemo(() => {
    const map = {};
    logs.forEach((l) => {
      map[l.subject] = (map[l.subject] || 0) + l.seconds;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [logs]);

  const Stat = ({ icon, label, value, sub, color }) => (
    <div className="card" style={{ height: "auto" }}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}22`, color }}>
          {icon}
        </div>
        <div>
          <div className="text-xs uppercase tracking-wider text-secondary">{label}</div>
          <div className="text-2xl font-black text-white">{value}</div>
        </div>
      </div>
      {sub && <div className="text-[11px] text-secondary mt-2">{sub}</div>}
    </div>
  );

  return (
    <div className="space-y-5 pb-10" data-testid="statistics-view">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon={<Flame size={20} />} label="Current Streak" value={`${streak} ${streak === 1 ? "Day" : "Days"}`} sub="Keep the fire burning!" color="#f97316" />
        <Stat icon={<Target size={20} />} label="Consistency" value={`${consistency}%`} sub={`Grade ${grade} · last 30 days`} color="#58a6ff" />
        <Stat icon={<Clock size={20} />} label="Total Logged" value={fmtDuration(totalSeconds)} sub={`${logs.length} sessions`} color="#22c55e" />
        <Stat icon={<BookOpen size={20} />} label="Mock Tests" value={scores.length} sub="Scores recorded" color="#a78bfa" />
      </div>

      <div className="card" style={{ height: "auto" }}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Study Hours</h2>
          <div className="flex gap-2">
            {[7, 30].map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`text-xs px-3 py-1 rounded-md border transition-all ${
                  range === r ? "border-[var(--accent-color)] bg-[var(--accent-color)] text-white" : "border-[var(--border-color)] text-secondary"
                }`}
                data-testid={`stats-range-${r}`}
              >
                Last {r} Days
              </button>
            ))}
          </div>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff11" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: "#8b949e", fontSize: 11 }} axisLine={false} tickLine={false} interval={range === 7 ? 0 : "preserveStartEnd"} />
              <YAxis tick={{ fill: "#8b949e", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: "#ffffff08" }} contentStyle={{ background: "var(--bg-color-2)", border: "1px solid var(--border-color)", borderRadius: 10, color: "#c9d1d9" }} formatter={(v) => [`${v} h`, "Studied"]} />
              <Bar dataKey="hours" radius={[6, 6, 0, 0]}>
                {chartData.map((_, i) => (
                  <Cell key={i} fill="var(--accent-color)" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card" style={{ height: "auto" }}>
        <h2 className="text-lg font-semibold mb-4">Subject Breakdown</h2>
        {subjectTotals.length === 0 ? (
          <p className="text-sm text-secondary">No study sessions logged yet.</p>
        ) : (
          <div className="space-y-3">
            {subjectTotals.map(([sub, sec]) => {
              const pct = totalSeconds ? Math.round((sec / totalSeconds) * 100) : 0;
              return (
                <div key={sub}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold">{sub}</span>
                    <span className="text-secondary">{fmtDuration(sec)} · {pct}%</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
