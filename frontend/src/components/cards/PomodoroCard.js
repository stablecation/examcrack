import React, { useEffect, useRef, useState } from "react";
import CardShell from "../CardShell";

const MODES = [
  { id: "pomodoro", label: "Pomodoro", def: 25 },
  { id: "shortBreak", label: "Short Break", def: 5 },
  { id: "longBreak", label: "Long Break", def: 15 },
];

function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.type = "sine";
    o.frequency.value = 880;
    g.gain.setValueAtTime(0.001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.05);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1);
    o.start();
    o.stop(ctx.currentTime + 1);
  } catch {
    /* ignore */
  }
}

export default function PomodoroCard({ durations, onChange }) {
  const cfg = { pomodoro: 25, shortBreak: 5, longBreak: 15, ...(durations || {}) };
  const [mode, setMode] = useState("pomodoro");
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(cfg.pomodoro * 60);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!running) {
      setSeconds(cfg[mode] * 60);
    }
  }, [mode, cfg.pomodoro, cfg.shortBreak, cfg.longBreak]);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          clearInterval(intervalRef.current);
          setRunning(false);
          beep();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [running]);

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  const changeDuration = (id, val) => {
    const v = Math.max(1, parseInt(val, 10) || 1);
    onChange({ ...cfg, [id]: v });
    if (id === mode && !running) setSeconds(v * 60);
  };

  return (
    <CardShell title="Pomodoro" bodyClass="text-center">
      <div className="flex justify-center gap-2 mb-4">
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => {
              setRunning(false);
              setMode(m.id);
            }}
            className={`text-xs px-3 py-1 rounded-md border transition-all ${
              mode === m.id ? "border-[var(--accent-color)] bg-[var(--accent-color)]/20 text-white" : "border-transparent text-secondary hover:border-gray-500"
            }`}
            data-testid={`pomodoro-mode-${m.id}`}
          >
            {m.label}
          </button>
        ))}
      </div>
      <div className="text-6xl font-bold my-4 tabular-nums" data-testid="pomodoro-display">
        {mm}:{ss}
      </div>
      <div className="flex justify-center gap-4 mb-4">
        <button className="btn-primary font-bold py-2 px-8 text-lg rounded-lg" onClick={() => setRunning((r) => !r)} data-testid="pomodoro-start">
          {running ? "PAUSE" : "START"}
        </button>
        <button className="text-secondary hover:text-white" onClick={() => { setRunning(false); setSeconds(cfg[mode] * 60); }} data-testid="pomodoro-reset">
          Reset
        </button>
      </div>
      <div className="flex justify-center gap-4 items-center pt-2 border-t border-[var(--border-color)]">
        {MODES.map((m) => (
          <label key={m.id} className="flex flex-col text-[10px] items-center text-secondary gap-1">
            {m.label.split(" ")[0]}
            <input
              type="number"
              min="1"
              value={cfg[m.id]}
              onChange={(e) => changeDuration(m.id, e.target.value)}
              className="form-input w-14 text-center rounded-md p-1 text-sm text-white"
            />
          </label>
        ))}
      </div>
    </CardShell>
  );
}
