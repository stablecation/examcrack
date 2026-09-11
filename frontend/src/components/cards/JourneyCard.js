import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import CardShell from "../CardShell";
import { getExamDate, formatDateToISO } from "../../lib/dates";

export default function JourneyCard({ settings, tests, onDayClick }) {
  const [hover, setHover] = useState(null);

  const testsByDate = useMemo(() => {
    const m = {};
    (tests || []).forEach((t) => {
      (m[t.date] = m[t.date] || []).push(t.name);
    });
    return m;
  }, [tests]);

  const days = useMemo(() => {
    const out = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTime = today.getTime();
    const exam = getExamDate(settings);
    exam.setHours(0, 0, 0, 0);
    const examTime = exam.getTime();
    // Start from TODAY (do not show past dates), through exam day.
    const cur = new Date(today);
    let guard = 0;
    while (cur.getTime() <= examTime && guard < 1500) {
      guard += 1;
      const iso = formatDateToISO(cur);
      const t = cur.getTime();
      const names = testsByDate[iso] || [];
      let cls = "day-future";
      const isToday = t === todayTime;
      const isExam = t === examTime;
      if (isToday) cls = "day-today";
      if (names.length) cls = "day-test";
      if (isExam) cls = "day-exam";
      out.push({ iso, cls, isToday, isExam, names, label: cur.toDateString() });
      cur.setDate(cur.getDate() + 1);
    }
    return out;
  }, [settings, testsByDate]);

  const Legend = ({ cls, label }) => (
    <div className="flex items-center gap-1.5">
      <span className={`legend-color day ${cls}`} />
      <span>{label}</span>
    </div>
  );

  return (
    <CardShell title="Journey">
      <div
        className="graph-container no-scrollbar"
        data-testid="journey-graph"
        onMouseLeave={() => setHover(null)}
      >
        {days.map((d) => (
          <div
            key={d.iso}
            className={`day ${d.cls}`}
            data-date={d.iso}
            data-testid="journey-day"
            onMouseEnter={(e) => setHover({ ...d, x: e.clientX, y: e.clientY })}
            onMouseMove={(e) => setHover((h) => (h && h.iso === d.iso ? { ...h, x: e.clientX, y: e.clientY } : h))}
            onClick={() => onDayClick && onDayClick(d.iso)}
          />
        ))}
      </div>

      {hover && createPortal(
        <div
          className="fixed z-[9999] pointer-events-none rounded-lg border border-[var(--border-color)] bg-[var(--bg-color-2)] px-3 py-2 text-xs shadow-2xl"
          style={{
            left: Math.min(hover.x + 14, window.innerWidth - 220),
            top: Math.min(hover.y + 14, window.innerHeight - 90),
          }}
          data-testid="journey-tooltip"
        >
          <div className="font-bold text-white">
            {hover.label}
            {hover.isToday && <span className="text-[var(--accent-color)]"> · Today</span>}
          </div>
          {hover.isExam && <div className="text-red-400 font-semibold mt-0.5">Exam Day</div>}
          {hover.names.length > 0 ? (
            <div className="mt-1 border-t border-white/10 pt-1">
              {hover.names.map((n, i) => (
                <div key={i} className="text-[var(--accent-color)]">• {n}</div>
              ))}
            </div>
          ) : (
            !hover.isExam && <div className="text-secondary mt-0.5">No test scheduled · click to add</div>
          )}
        </div>,
        document.body
      )}

      <div className="flex justify-center flex-wrap gap-x-4 gap-y-2 mt-4 text-xs text-secondary">
        <Legend cls="day-future" label="Upcoming" />
        <Legend cls="day-today" label="Today" />
        <Legend cls="day-test" label="Test" />
        <Legend cls="day-exam" label="Exam" />
      </div>
      <p className="text-[10px] text-secondary/60 text-center mt-2">Tip: click any day to plan a test on it.</p>
    </CardShell>
  );
}
