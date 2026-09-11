import React, { useState } from "react";
import { Plus } from "lucide-react";
import CardShell from "../CardShell";

export default function TasksCard({ tasks, onAdd, onToggle, onDelete, onDeleteCard }) {
  const [text, setText] = useState("");
  const done = tasks.filter((t) => t.done).length;
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

  const submit = (e) => {
    e.preventDefault();
    const v = text.trim();
    if (!v) return;
    onAdd(v);
    setText("");
  };

  return (
    <CardShell title="My Tasks" onDelete={onDeleteCard} bodyClass="flex flex-col">
      <div className="flex items-center gap-3 mb-3">
        <div className="progress-track flex-1">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-xs text-secondary tabular-nums" data-testid="tasks-progress">{pct}%</span>
      </div>

      <ul className="flex-1 space-y-2 overflow-y-auto no-scrollbar min-h-[80px]" data-testid="task-list">
        {tasks.length === 0 && (
          <li className="text-center text-sm text-secondary py-10">No active tasks. Time to focus.</li>
        )}
        {tasks.map((t) => (
          <li
            key={t.id}
            className="flex items-center gap-2 group text-sm bg-white/5 rounded-lg px-3 py-2"
            data-testid={`task-item-${t.id}`}
          >
            <input
              type="checkbox"
              checked={t.done}
              onChange={() => onToggle(t)}
              className="accent-[var(--accent-color)] w-4 h-4 cursor-pointer"
              data-testid={`task-toggle-${t.id}`}
            />
            <span className={`flex-1 ${t.done ? "line-through text-secondary" : ""}`}>{t.text}</span>
            <button
              onClick={() => onDelete(t.id)}
              className="text-secondary hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
              data-testid={`task-delete-${t.id}`}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>

      <form onSubmit={submit} className="flex items-center gap-2 mt-3">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add new task..."
          className="form-input flex-1 px-3 py-2 text-sm"
          data-testid="task-input"
        />
        <button type="submit" className="btn-primary w-10 h-10 flex items-center justify-center rounded-full shrink-0" data-testid="task-add-btn">
          <Plus size={18} />
        </button>
      </form>
      <p className="text-[10px] text-secondary/60 mt-2 font-mono text-center">
        Click circle to toggle · Click name to prioritize
      </p>
    </CardShell>
  );
}
