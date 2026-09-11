import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { getExamDate, getDashboardTitle } from "../lib/dates";

export default function FocusMode({ settings, onClose }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const exam = getExamDate(settings).getTime();
  const diff = Math.max(0, exam - now.getTime());
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const clock = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return (
    <div className="focus-overlay" data-testid="focus-mode">
      <button onClick={onClose} className="capsule-btn absolute top-6 right-6" data-testid="focus-close">
        <X size={18} />
      </button>
      <div className="text-secondary text-sm uppercase tracking-[0.3em]">{getDashboardTitle(settings)}</div>
      <div className="text-7xl md:text-9xl font-extrabold tabular-nums text-white">{clock}</div>
      <div className="text-lg text-secondary">
        <span className="text-[var(--accent-color)] font-bold text-2xl">{days}</span> days until exam day
      </div>
      <div className="text-xs text-secondary/60 mt-4">Press Esc or click ✕ to exit focus mode</div>
    </div>
  );
}
