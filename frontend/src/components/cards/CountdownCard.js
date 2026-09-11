import React, { useEffect, useState } from "react";
import CardShell from "../CardShell";
import { getExamDate } from "../../lib/dates";

function Unit({ value, label }) {
  return (
    <div className="countdown-unit">
      <div className="countdown-num" data-testid={`countdown-${label.toLowerCase()}`}>
        {String(value).padStart(2, "0")}
      </div>
      <div className="countdown-label">{label}</div>
    </div>
  );
}

export default function CountdownCard({ settings, onDelete }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const exam = getExamDate(settings).getTime();
  const diff = Math.max(0, exam - now);
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  return (
    <CardShell title="Countdown" onDelete={onDelete} bodyClass="flex items-center justify-center">
      <div className="countdown-wrap" data-testid="countdown-wrap">
        <div className="countdown-grid">
          <Unit value={days} label="Days" />
          <Unit value={hours} label="Hours" />
          <Unit value={minutes} label="Minutes" />
        </div>
      </div>
    </CardShell>
  );
}
