import React, { useEffect, useRef, useState } from "react";
import CardShell from "../CardShell";

export default function NoteCard({ value, onChange }) {
  const [text, setText] = useState(value || "");
  const timer = useRef(null);

  useEffect(() => {
    setText(value || "");
  }, [value]);

  const handle = (v) => {
    setText(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onChange(v), 600);
  };

  return (
    <CardShell title="Sticky Note" bodyClass="flex flex-col">
      <textarea
        value={text}
        onChange={(e) => handle(e.target.value)}
        placeholder="Jot down formulas, reminders, quick notes..."
        className="form-input w-full flex-1 min-h-[140px] p-3 text-sm resize-none leading-relaxed"
        data-testid="note-textarea"
      />
    </CardShell>
  );
}
