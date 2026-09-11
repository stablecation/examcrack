import React from "react";
import { X } from "lucide-react";

const SHORTCUTS = [
  ["F", "Toggle Super Focus Mode"],
  ["Z", "Toggle Zen Mode"],
  ["N", "Add a new card"],
  ["C", "Open customization / settings"],
  ["Esc", "Close modals / exit focus"],
];

export default function InfoModal({ onClose }) {
  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()} data-testid="info-modal">
      <div className="modal-card max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Welcome to StudyLocus</h2>
          <button onClick={onClose} className="capsule-btn" data-testid="info-close">
            <X size={16} />
          </button>
        </div>
        <p className="text-sm text-secondary leading-relaxed mb-5">
          Your personalized JEE / NEET dashboard. Drag cards by the handle, resize or collapse them
          with the header icons, and add new cards with the <strong className="text-white">+</strong> button.
          Everything syncs to your account automatically.
        </p>
        <h3 className="text-xs font-bold uppercase tracking-widest text-secondary mb-2">Keyboard Shortcuts</h3>
        <ul className="space-y-2">
          {SHORTCUTS.map(([k, label]) => (
            <li key={k} className="flex items-center justify-between text-sm">
              <span className="text-secondary">{label}</span>
              <kbd className="px-2 py-0.5 rounded bg-white/10 border border-white/10 text-xs font-mono">{k}</kbd>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
