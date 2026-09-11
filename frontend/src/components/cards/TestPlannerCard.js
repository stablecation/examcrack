import React, { useState } from "react";
import CardShell from "../CardShell";

export default function TestPlannerCard({ tests, onAdd, onDelete, onDeleteCard }) {
  const [date, setDate] = useState("");
  const [name, setName] = useState("");

  const submit = (e) => {
    e.preventDefault();
    if (!date || !name.trim()) return;
    onAdd(date, name.trim());
    setDate("");
    setName("");
  };

  return (
    <CardShell title="Test Planner" onDelete={onDeleteCard}>
      <form onSubmit={submit} className="flex flex-col gap-3 mb-4">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="form-input px-3 py-2 text-sm"
          required
          data-testid="test-date-input"
        />
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Test Name"
          className="form-input px-3 py-2 text-sm"
          required
          data-testid="test-name-input"
        />
        <button type="submit" className="btn-primary font-bold py-2 px-4 text-sm w-full" data-testid="test-add-btn">
          Add Test
        </button>
      </form>
      <h3 className="text-md font-semibold mb-2 border-b pb-1" style={{ borderColor: "var(--border-color)" }}>
        Tests
      </h3>
      <ul className="space-y-2 max-h-48 overflow-y-auto no-scrollbar" data-testid="test-list">
        {tests.length === 0 && <li className="text-secondary text-sm py-1">No tests scheduled.</li>}
        {tests.map((t) => (
          <li key={t.id} className="flex justify-between items-center bg-white/5 rounded-md px-3 py-2 text-sm group">
            <div>
              <div className="font-medium">{t.name}</div>
              <div className="text-xs text-secondary">{t.date}</div>
            </div>
            <button
              onClick={() => onDelete(t.id)}
              className="text-secondary hover:text-red-400 opacity-0 group-hover:opacity-100"
              data-testid={`test-delete-${t.id}`}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </CardShell>
  );
}
