import React, { useEffect, useState } from "react";
import { X, Github, Loader2, CheckCircle2, Users, ExternalLink } from "lucide-react";
import api, { formatApiErrorDetail } from "../lib/api";

export default function AdminPanel({ onClose }) {
  const [repo, setRepo] = useState("");
  const [pat, setPat] = useState("");
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [info, setInfo] = useState({ exports: [], users_count: 0 });

  useEffect(() => {
    api
      .get("/admin/export-log")
      .then(({ data }) => {
        setInfo({ exports: data.exports || [], users_count: data.users_count || 0 });
        setSummary(data.summary || "");
      })
      .catch(() => {});
  }, []);

  const doExport = async () => {
    setError("");
    setResult(null);
    setLoading(true);
    try {
      const { data } = await api.post("/admin/export-github", { repo, pat, summary });
      setResult(data);
      setPat("");
      const log = await api.get("/admin/export-log");
      setInfo({ exports: log.data.exports || [], users_count: log.data.users_count || 0 });
    } catch (e) {
      setError(formatApiErrorDetail(e.response?.data?.detail) || e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" data-testid="admin-panel-overlay">
      <div className="card w-full max-w-2xl max-h-[88vh] overflow-y-auto no-scrollbar" style={{ height: "auto" }} data-testid="admin-panel">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Github size={20} className="text-[var(--accent-color)]" />
            <h2 className="text-xl font-bold text-white">Admin Console</h2>
          </div>
          <button className="capsule-btn" onClick={onClose} data-testid="admin-close-btn">
            <X size={16} />
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs text-secondary mb-5">
          <Users size={14} />
          <span data-testid="admin-users-count">{info.users_count} registered account(s) — mirrored locally to backend/data/users.json</span>
        </div>

        <div className="rounded-xl border border-white/10 p-4">
          <h3 className="font-bold text-sm text-white mb-1">Export full website code to GitHub</h3>
          <p className="text-xs text-secondary mb-4">
            Snapshots the entire app and force-pushes to a <b>private</b> repo. Creates the repo if it doesn't exist.
            A continuation summary is bundled as <code>EMERGENT_CONTINUE.md</code>.
          </p>

          <label className="block text-xs font-semibold text-secondary mb-1">Repository (owner/name)</label>
          <input
            className="form-input px-3 py-2.5 text-sm w-full mb-3"
            placeholder="stablecation/examcrack"
            value={repo}
            onChange={(e) => setRepo(e.target.value)}
            data-testid="admin-repo-input"
          />

          <label className="block text-xs font-semibold text-secondary mb-1">GitHub Personal Access Token (repo scope)</label>
          <input
            className="form-input px-3 py-2.5 text-sm w-full mb-3"
            type="password"
            placeholder="ghp_..."
            value={pat}
            autoComplete="off"
            onChange={(e) => setPat(e.target.value)}
            data-testid="admin-pat-input"
          />

          <label className="block text-xs font-semibold text-secondary mb-1">Continuation summary (editable — saved into the repo)</label>
          <textarea
            className="form-input px-3 py-2.5 text-sm w-full mb-4 font-mono"
            rows={7}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            data-testid="admin-summary-input"
          />

          <button
            className="btn-primary font-bold py-2.5 px-4 text-sm w-full flex items-center justify-center gap-2"
            disabled={loading}
            onClick={doExport}
            data-testid="admin-export-btn"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Github size={16} />}
            {loading ? "Exporting…" : "Export & Push to GitHub"}
          </button>

          {error && <p className="text-red-400 text-xs mt-3" data-testid="admin-export-error">{error}</p>}
          {result && (
            <div className="mt-3 flex items-start gap-2 text-xs text-green-400" data-testid="admin-export-success">
              <CheckCircle2 size={14} className="mt-0.5" />
              <span>
                Pushed to{" "}
                <a href={result.url} target="_blank" rel="noreferrer" className="underline inline-flex items-center gap-1">
                  {result.repository} <ExternalLink size={11} />
                </a>{" "}
                @ {String(result.commit).slice(0, 10)}
              </span>
            </div>
          )}
        </div>

        {info.exports.length > 0 && (
          <div className="mt-5">
            <h3 className="font-bold text-sm text-white mb-2">Recent exports</h3>
            <div className="space-y-1.5" data-testid="admin-export-history">
              {info.exports.map((x) => (
                <div key={x.id} className="text-xs text-secondary flex justify-between border-b border-white/5 pb-1.5">
                  <span>{x.repo} · {String(x.commit).slice(0, 10)}</span>
                  <span>{x.created_at ? new Date(x.created_at).toLocaleString() : ""}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
