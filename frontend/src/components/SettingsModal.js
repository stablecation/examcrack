import React, { useState } from "react";
import { X, Check, RotateCcw } from "lucide-react";
import { THEMES } from "../data/themes";

const EXAM_TYPES = [
  { id: "jee-mains", label: "JEE Mains" },
  { id: "jee-advanced", label: "JEE Advanced" },
  { id: "neet", label: "NEET" },
  { id: "custom", label: "Custom" },
];
const YEARS = ["2026", "2027", "2028"];

export default function SettingsModal({ settings, onClose, onSave, onReset }) {
  const [examType, setExamType] = useState(settings?.examType || "jee-mains");
  const [examYear, setExamYear] = useState(settings?.examYear || "2027");
  const [customExamDate, setCustomExamDate] = useState(settings?.customExamDate || "");
  const [subjects, setSubjects] = useState((settings?.subjects || ["Physics", "Chemistry", "Maths"]).join(", "));
  const [theme, setTheme] = useState(settings?.theme || "default");

  const save = () => {
    const subjectList = subjects
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    onSave({
      examType,
      examYear,
      customExamDate: examType === "custom" ? customExamDate : null,
      subjects: subjectList.length ? subjectList : ["Physics", "Chemistry", "Maths"],
      theme,
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()} data-testid="settings-modal">
      <div className="modal-card max-w-lg p-6">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-xl font-bold">Customize Dashboard</h2>
          <button onClick={onClose} className="capsule-btn" data-testid="settings-close">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-5">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-secondary">Exam</label>
            <div className="grid grid-cols-4 gap-2 mt-2">
              {EXAM_TYPES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setExamType(t.id)}
                  className={`text-xs py-2 rounded-lg border transition-all font-semibold ${
                    examType === t.id
                      ? "border-[var(--accent-color)] text-white bg-[var(--accent-color)]/20"
                      : "border-[var(--border-color)] text-secondary hover:text-white"
                  }`}
                  data-testid={`exam-type-${t.id}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {examType === "custom" ? (
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-secondary">Exam Date</label>
              <input
                type="date"
                value={customExamDate}
                onChange={(e) => setCustomExamDate(e.target.value)}
                className="form-input px-3 py-2 text-sm w-full mt-2"
                data-testid="settings-custom-date"
              />
            </div>
          ) : (
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-secondary">Year</label>
              <div className="flex gap-2 mt-2">
                {YEARS.map((y) => (
                  <button
                    key={y}
                    onClick={() => setExamYear(y)}
                    className={`flex-1 text-sm py-2 rounded-lg border transition-all font-semibold ${
                      examYear === y
                        ? "border-[var(--accent-color)] text-white bg-[var(--accent-color)]/20"
                        : "border-[var(--border-color)] text-secondary hover:text-white"
                    }`}
                    data-testid={`settings-year-${y}`}
                  >
                    {y}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-secondary">Subjects (comma separated)</label>
            <input
              value={subjects}
              onChange={(e) => setSubjects(e.target.value)}
              className="form-input px-3 py-2 text-sm w-full mt-2"
              data-testid="settings-subjects"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-secondary">Theme</label>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={`relative text-left p-2 rounded-lg border transition-all ${
                    theme === t.id ? "border-[var(--accent-color)]" : "border-[var(--border-color)] hover:border-white/40"
                  }`}
                  style={{ background: t.swatch[0] }}
                  data-testid={`theme-${t.id}`}
                >
                  <div className="theme-swatch mb-1.5">
                    {t.swatch.map((c, i) => (
                      <span key={i} style={{ background: c }} />
                    ))}
                  </div>
                  <span className="text-[10px] font-semibold" style={{ color: t.swatch[1] }}>
                    {t.name}
                  </span>
                  {theme === t.id && (
                    <Check size={12} className="absolute top-1.5 right-1.5" style={{ color: t.swatch[1] }} />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mt-6 pt-4 border-t border-[var(--border-color)]">
          <button
            onClick={() => {
              if (onReset) onReset();
            }}
            className="text-xs font-semibold text-secondary hover:text-red-400 flex items-center gap-1.5 transition-colors"
            data-testid="settings-reset-layout"
            title="Restore default card positions and sizes"
          >
            <RotateCcw size={14} /> Reset Layout to Default
          </button>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-secondary hover:text-white">
              Cancel
            </button>
            <button onClick={save} className="btn-primary px-5 py-2 text-sm font-bold" data-testid="settings-save">
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
