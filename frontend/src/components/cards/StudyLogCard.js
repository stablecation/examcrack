import React, { useEffect, useRef, useState } from "react";
import { PictureInPicture2 } from "lucide-react";
import CardShell from "../CardShell";
import { fmtHMS, fmtDuration } from "../../lib/dates";

export default function StudyLogCard({ settings, todaysLogs, onLog, onDeleteLog, onDeleteCard }) {
  const subjects = settings?.subjects || ["Physics", "Chemistry", "Maths"];
  const [subject, setSubject] = useState(subjects[0]);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [showManual, setShowManual] = useState(false);
  const [manualSubject, setManualSubject] = useState(subjects[0]);
  const [manualMins, setManualMins] = useState("");
  const [msg, setMsg] = useState("");
  const startRef = useRef(null);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 250);
    return () => clearInterval(id);
  }, [running]);

  const toggle = () => {
    if (running) {
      setRunning(false);
    } else {
      startRef.current = Date.now() - elapsed * 1000;
      setRunning(true);
    }
  };

  const doLog = () => {
    if (elapsed < 1) {
      setMsg("Start the timer first!");
      setTimeout(() => setMsg(""), 2500);
      return;
    }
    onLog(subject, elapsed);
    setRunning(false);
    setElapsed(0);
  };

  const reset = () => {
    setRunning(false);
    setElapsed(0);
  };

  const addManual = (e) => {
    e.preventDefault();
    const mins = parseInt(manualMins, 10);
    if (!mins || mins < 1) return;
    onLog(manualSubject, mins * 60);
    setManualMins("");
    setShowManual(false);
  };

  const total = todaysLogs.reduce((a, l) => a + l.seconds, 0);

  return (
    <CardShell
      title="Study Log"
      onDelete={onDeleteCard}
      headerExtra={
        <button title="Floating window" tabIndex={-1}>
          <PictureInPicture2 size={15} />
        </button>
      }
      bodyClass="text-center"
    >
      <div className="text-5xl font-bold my-3 tabular-nums text-white" data-testid="studylog-timer">{fmtHMS(elapsed)}</div>

      <div className="flex items-center justify-center gap-2 mb-4">
        <label className="text-sm text-secondary">Subject:</label>
        <select
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="form-input px-3 py-2 text-sm flex-1 max-w-[220px]"
          data-testid="studylog-subject"
        >
          {subjects.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="flex justify-center items-center gap-4 mb-2">
        <button className="btn-primary font-bold py-2 px-8 text-base rounded-lg" onClick={toggle} data-testid="studylog-start">
          {running ? "PAUSE" : "START"}
        </button>
        <button className="btn-primary font-bold py-2 px-8 text-base rounded-lg" onClick={doLog} data-testid="studylog-log">
          LOG
        </button>
        <button className="text-secondary hover:text-white" onClick={reset} data-testid="studylog-reset">
          Reset
        </button>
      </div>
      <p className="text-red-400 text-xs h-4 mb-1">{msg}</p>

      <div className="w-full border-t border-[var(--border-color)] my-3" />

      <div className="flex justify-between items-center mb-2">
        <h3 className="text-md font-semibold">Today's Log</h3>
        <span className="text-sm font-bold text-secondary" data-testid="studylog-total">Total: {fmtDuration(total)}</span>
      </div>

      <ul className="space-y-2 max-h-32 overflow-y-auto no-scrollbar text-left text-sm" data-testid="studylog-list">
        {todaysLogs.length === 0 && <li className="text-secondary text-sm py-2">No sessions logged today.</li>}
        {todaysLogs.map((l) => (
          <li key={l.id} className="flex justify-between items-center bg-white/5 rounded-md px-3 py-1.5 group">
            <span>{l.subject}</span>
            <span className="flex items-center gap-2">
              <span className="text-secondary">{fmtDuration(l.seconds)}</span>
              <button
                onClick={() => onDeleteLog(l.id)}
                className="text-secondary hover:text-red-400 opacity-0 group-hover:opacity-100"
              >
                ✕
              </button>
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-4 pt-2 border-t border-gray-700/50">
        <button
          onClick={() => setShowManual((v) => !v)}
          className="text-xs text-secondary hover:text-white mx-auto block"
          data-testid="studylog-manual-toggle"
        >
          + Add Manual Entry
        </button>
        {showManual && (
          <form onSubmit={addManual} className="flex gap-2 mt-2">
            <select
              value={manualSubject}
              onChange={(e) => setManualSubject(e.target.value)}
              className="form-input px-2 py-1.5 text-xs flex-1"
            >
              {subjects.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <input
              type="number"
              min="1"
              value={manualMins}
              onChange={(e) => setManualMins(e.target.value)}
              placeholder="Mins"
              className="form-input px-2 py-1.5 text-xs w-16 text-center"
            />
            <button type="submit" className="btn-primary text-xs px-3 py-1 rounded font-bold">Add</button>
          </form>
        )}
      </div>
    </CardShell>
  );
}
