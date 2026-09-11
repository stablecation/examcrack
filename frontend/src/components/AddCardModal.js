import React, { useEffect, useState } from "react";
import {
  X, PenSquare, CheckCircle2, CalendarDays, Timer, Clock, Activity,
  Hourglass, LayoutGrid, CalendarClock, Youtube, Quote, Hand,
} from "lucide-react";

// Catalog of every card type the user can add. Order matches the design:
// the primary study cards first, then the extras. `color` tints the icon.
const CARD_CATALOG = [
  { id: "note", name: "Note", icon: PenSquare, color: "#60a5fa", desc: "Simple text area for scratchpad or reminders." },
  { id: "tasks", name: "To-Do List", icon: CheckCircle2, color: "#34d399", desc: "Task management with progress tracking." },
  { id: "agenda", name: "Calendar Tasks", icon: CalendarDays, color: "#a78bfa", desc: "Date-specific tasks with progress tracking." },
  { id: "pomodoro", name: "Pomodoro", icon: Timer, color: "#fb7185", desc: "Focus timer with short and long breaks." },
  { id: "studylog", name: "Study Logger", icon: Clock, color: "#fbbf24", desc: "Track subject-wise study hours." },
  { id: "mock", name: "Marks Graph", icon: Activity, color: "#818cf8", desc: "Visualize test scores and trends." },
  { id: "countdown", name: "Countdown", icon: Hourglass, color: "#22d3ee", desc: "Live countdown to your exam day." },
  { id: "journey", name: "Journey", icon: LayoutGrid, color: "#4ade80", desc: "GitHub-style study consistency graph." },
  { id: "planner", name: "Test Planner", icon: CalendarClock, color: "#38bdf8", desc: "Schedule your upcoming mock tests." },
  { id: "youtube", name: "YouTube", icon: Youtube, color: "#f87171", desc: "Embed lectures or lo-fi streams." },
  { id: "quote", name: "Quote", icon: Quote, color: "#c084fc", desc: "Daily motivational quotes." },
  { id: "welcome", name: "Welcome", icon: Hand, color: "#2dd4bf", desc: "Friendly intro / welcome message." },
];

export default function AddCardModal({ visible, onAdd, onClose }) {
  const firstAvailable = CARD_CATALOG.find((c) => !visible.includes(c.id));
  const [selected, setSelected] = useState(firstAvailable ? firstAvailable.id : CARD_CATALOG[0].id);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const selectedIsAdded = visible.includes(selected);

  const handleAdd = () => {
    if (selectedIsAdded) return;
    onAdd(selected, { title: title.trim(), content: content.trim() });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      data-testid="add-card-modal"
    >
      <div
        className="card w-full max-w-xl relative flex flex-col"
        style={{ height: "auto", maxHeight: "90vh", padding: "1.25rem 1.5rem" }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3.5 right-4 text-secondary hover:text-white transition-colors"
          data-testid="add-card-close"
        >
          <X size={18} />
        </button>

        <h2 className="text-lg font-bold mb-3 shrink-0">Add New Card</h2>

        <div className="grid grid-cols-2 gap-2 mb-3 overflow-y-auto pr-1" style={{ minHeight: 0 }}>
          {CARD_CATALOG.map((c) => {
            const Icon = c.icon;
            const isSelected = selected === c.id;
            const isAdded = visible.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelected(c.id)}
                disabled={isAdded}
                data-testid={`add-card-option-${c.id}`}
                className="text-left rounded-lg px-2.5 py-2 border transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  borderColor: isSelected ? "var(--accent, #3b82f6)" : "var(--border, rgba(255,255,255,0.1))",
                  background: isSelected ? "rgba(59,130,246,0.08)" : "var(--card-alt, rgba(255,255,255,0.02))",
                }}
              >
                <div className="flex items-center gap-2">
                  <Icon size={16} style={{ color: c.color }} className="shrink-0" />
                  <span className="font-semibold text-[13px] truncate">{c.name}</span>
                  {isAdded && <span className="ml-auto text-[9px] uppercase tracking-wide text-secondary shrink-0">Added</span>}
                </div>
                <p className="text-[11px] text-secondary leading-tight mt-0.5 line-clamp-2">{c.desc}</p>
              </button>
            );
          })}
        </div>

        {selected === "note" && (
          <div className="space-y-2 mb-3 shrink-0">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Card Title (optional)"
              className="w-full bg-transparent border rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 transition-colors"
              style={{ borderColor: "var(--border, rgba(255,255,255,0.1))" }}
              data-testid="add-card-title"
            />
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Card Content — starts your note"
              rows={2}
              className="w-full bg-transparent border rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 transition-colors resize-none"
              style={{ borderColor: "var(--border, rgba(255,255,255,0.1))" }}
              data-testid="add-card-content"
            />
          </div>
        )}

        <div className="flex justify-end gap-3 shrink-0 pt-1">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-full text-sm font-semibold transition-colors"
            style={{ background: "var(--card-alt, rgba(255,255,255,0.06))" }}
            data-testid="add-card-cancel"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={selectedIsAdded}
            className="px-5 py-2 rounded-full text-sm font-semibold bg-blue-500 hover:bg-blue-400 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            data-testid="add-card-submit"
          >
            Add Card
          </button>
        </div>
      </div>
    </div>
  );
}
