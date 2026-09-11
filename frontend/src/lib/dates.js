// Exam date resolution + formatting helpers (ported from StudyLocus config).
const EXAM_DATES = {
  "jee-mains": { 2026: "2026-01-21", 2027: "2027-01-21", 2028: "2028-01-21" },
  "jee-advanced": { 2026: "2026-05-17", 2027: "2027-05-23", 2028: "2028-05-23" },
  neet: { 2026: "2026-05-03", 2027: "2027-05-02", 2028: "2028-05-02" },
};

export const EXAM_LABELS = {
  "jee-mains": "JEE",
  "jee-advanced": "JEE Advanced",
  neet: "NEET",
  custom: "Exam",
};

export function getExamDate(settings) {
  if (!settings) return new Date("2027-01-21T00:00:00");
  if (settings.examType === "custom" && settings.customExamDate) {
    return new Date(settings.customExamDate + "T00:00:00");
  }
  const table = EXAM_DATES[settings.examType] || EXAM_DATES["jee-mains"];
  const year = settings.examYear || "2027";
  const iso = table[year] || table[2027] || "2027-01-21";
  return new Date(iso + "T00:00:00");
}

export function getDashboardTitle(settings) {
  if (!settings) return "JEE 2027";
  const label = EXAM_LABELS[settings.examType] || "JEE";
  return `${label} ${settings.examYear || "2027"}`;
}

export function formatDateToISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fmtHMS(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = String(Math.floor(s / 3600)).padStart(2, "0");
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const sec = String(s % 60).padStart(2, "0");
  return `${h}:${m}:${sec}`;
}

export function fmtDuration(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  if (s < 60) return `${s}s`;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
