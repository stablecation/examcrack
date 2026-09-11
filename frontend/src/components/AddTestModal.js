import React, { useState } from "react";
import { X, Trash2 } from "lucide-react";

export default function AddTestModal({ date, existing, onClose, onAdd, onDelete }) {
  const [name, setName] = useState("");
  const pretty = new Date(date + "T00:00:00").toDateString();

  const submit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd(date, name.trim());
    onClose();
  };

  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()} data-testid="add-test-modal">
      <div className="modal-card max-w-sm p-6">
        <div className="flex justify-between items-center mb-1">
          <h2 className="text-lg font-bold">Plan a Test</h2>
          <button onClick={onClose} className="capsule-btn" data-testid="add-test-close">
            <X size={16} />
          </button>
        </div>
        <p className="text-xs text-secondary mb-4">{pretty}</p>

        {existing.length > 0 && (
          <div className="mb-4">
            <h3 className="text-[10px] uppercase tracking-widest text-secondary mb-2">Scheduled</h3>
            <ul className="space-y-2">
              {existing.map((t) => (
                <li key={t.id} className="flex justify-between items-center bg-white/5 rounded-md px-3 py-2 text-sm">
                  <span>{t.name}</span>
                  <button onClick={() => onDelete(t.id)} className="text-secondary hover:text-red-400" data-testid={`modal-test-delete-${t.id}`}>
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <form onSubmit={submit} className="flex flex-col gap-3">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Test name (e.g. AITS Part Test)"
            className="form-input px-3 py-2 text-sm"
            data-testid="modal-test-name"
          />
          <button type="submit" className="btn-primary font-bold py-2 text-sm" data-testid="modal-test-add">
            Add Test on this Day
          </button>
        </form>
      </div>
    </div>
  );
}
