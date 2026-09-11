import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Responsive, WidthProvider } from "react-grid-layout";
import { X } from "lucide-react";
import Navbar from "../components/Navbar";
import SettingsModal from "../components/SettingsModal";
import InfoModal from "../components/InfoModal";
import AdminPanel from "../components/AdminPanel";
import FocusMode from "../components/FocusMode";
import StatisticsView from "../components/StatisticsView";
import AddTestModal from "../components/AddTestModal";
import AddCardModal from "../components/AddCardModal";
import ChromeContext from "../context/ChromeContext";
import CountdownCard from "../components/cards/CountdownCard";
import JourneyCard from "../components/cards/JourneyCard";
import TasksCard from "../components/cards/TasksCard";
import StudyLogCard from "../components/cards/StudyLogCard";
import WelcomeCard from "../components/cards/WelcomeCard";
import MockTestCard from "../components/cards/MockTestCard";
import TestPlannerCard from "../components/cards/TestPlannerCard";
import QuoteCard from "../components/cards/QuoteCard";
import PomodoroCard from "../components/cards/PomodoroCard";
import NoteCard from "../components/cards/NoteCard";
import YouTubeCard from "../components/cards/YouTubeCard";
import DailyAgendaCard from "../components/cards/DailyAgendaCard";
import { QUOTES } from "../data/quotes";
import { getDashboardTitle, formatDateToISO } from "../lib/dates";
import api from "../lib/api";

const ResponsiveGridLayout = WidthProvider(Responsive);

const GRID_COLS = 12;
const WIDTH_STEPS = [4, 6, 8, 12];

// Standard, usable size + position for every card. minW/minH keep cards
// large enough to stay accessible; maxW stops them growing absurdly wide.
const CARD_META = {
  countdown: { x: 0, y: 0, w: 4, h: 8, minW: 3, minH: 4, maxW: 6 },
  journey: { x: 4, y: 0, w: 4, h: 6, minW: 4, minH: 4, maxW: 12 },
  tasks: { x: 0, y: 8, w: 4, h: 9, minW: 3, minH: 6, maxW: 6 },
  studylog: { x: 4, y: 6, w: 4, h: 12, minW: 3, minH: 9, maxW: 6 },
  welcome: { x: 8, y: 0, w: 4, h: 8, minW: 3, minH: 3, maxW: 6 },
  quote: { x: 8, y: 10, w: 4, h: 7, minW: 3, minH: 5, maxW: 6 },
  mock: { x: 0, y: 14, w: 4, h: 16, minW: 3, minH: 12, maxW: 8 },
  planner: { x: 4, y: 17, w: 4, h: 8, minW: 3, minH: 6, maxW: 6 },
  pomodoro: { x: 8, y: 17, w: 4, h: 13, minW: 3, minH: 10, maxW: 6 },
  note: { x: 4, y: 25, w: 4, h: 8, minW: 3, minH: 5, maxW: 6 },
  youtube: { x: 0, y: 30, w: 4, h: 11, minW: 3, minH: 8, maxW: 8 },
  agenda: { x: 8, y: 30, w: 4, h: 13, minW: 3, minH: 9, maxW: 6 },
};

function metaFor(id) {
  return CARD_META[id] || { w: 4, h: 6, minW: 3, minH: 4, maxW: GRID_COLS };
}

// Clamp cards to their standard usable widths and attach RGL size constraints.
function applyConstraints(items) {
  return items.map((l) => {
    const m = metaFor(l.i);
    const minW = m.minW ?? 3;
    const minH = m.minH ?? 4;
    const maxW = m.maxW ?? GRID_COLS;
    return { ...l, minW, minH, maxW, w: Math.min(maxW, Math.max(minW, l.w || m.w)) };
  });
}

// Collapsed cards render at h=2; relax their height constraints so RGL
// doesn't warn, and strip stale maxH from expanded cards so they can grow.
function withCollapse(items, col) {
  return items.map((l) => {
    if (col.includes(l.i)) return { ...l, h: 2, minH: 1, maxH: 2 };
    const rest = { ...l };
    delete rest.maxH;
    return rest;
  });
}

// Dense top-to-bottom, left-to-right packing. Fills empty gaps by pulling
// later cards up into them (each card keeps its own size).
function packDense(items) {
  const sorted = [...items].sort((a, b) => a.y - b.y || a.x - b.x);
  const occ = [];
  const ensure = (r) => { while (occ.length <= r) occ.push(new Array(GRID_COLS).fill(false)); };
  const fits = (x, y, w, h) => {
    for (let r = y; r < y + h; r += 1) { ensure(r); for (let c = x; c < x + w; c += 1) if (occ[r][c]) return false; }
    return true;
  };
  const mark = (x, y, w, h) => {
    for (let r = y; r < y + h; r += 1) { ensure(r); for (let c = x; c < x + w; c += 1) occ[r][c] = true; }
  };
  const placed = {};
  sorted.forEach((it) => {
    const w = Math.min(it.w, GRID_COLS);
    const h = it.h;
    let done = false;
    for (let y = 0; !done && y < 1000; y += 1) {
      for (let x = 0; x + w <= GRID_COLS; x += 1) {
        if (fits(x, y, w, h)) { placed[it.i] = { x, y }; mark(x, y, w, h); done = true; break; }
      }
    }
  });
  return items.map((l) => ({ ...l, x: placed[l.i]?.x ?? l.x, y: placed[l.i]?.y ?? l.y }));
}

const DEFAULT_VISIBLE = ["countdown", "journey", "tasks", "studylog", "welcome", "quote", "mock", "planner", "agenda"];

const DEFAULT_LAYOUT = Object.entries(CARD_META).map(([i, m]) => ({ i, ...m }));

export default function Dashboard() {
  const [view, setView] = useState("dashboard");
  const [settings, setSettings] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [logs, setLogs] = useState([]);
  const [tests, setTests] = useState([]);
  const [scores, setScores] = useState([]);
  const [layout, setLayout] = useState(DEFAULT_LAYOUT);
  const [visible, setVisible] = useState(DEFAULT_VISIBLE);
  const [collapsed, setCollapsed] = useState([]);
  const [quoteIdx, setQuoteIdx] = useState(() => Math.floor(Math.random() * QUOTES.length));
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [focus, setFocus] = useState(false);
  const [zen, setZen] = useState(false);
  const [testModalDate, setTestModalDate] = useState(null);
  const saveTimer = useRef(null);
  const cardDataTimer = useRef(null);
  const preH = useRef({});
  const tidyRef = useRef(false);

  useEffect(() => {
    (async () => {
      const [s, t, l, te, sc] = await Promise.all([
        api.get("/settings"), api.get("/tasks"), api.get("/studylogs"), api.get("/tests"), api.get("/scores"),
      ]);
      setSettings(s.data);
      setTasks(t.data);
      setLogs(l.data);
      setTests(te.data);
      setScores(sc.data);
      const lay = s.data.layout;
      if (lay && lay.layout) {
        let savedLayout = lay.layout;
        let savedVisible = lay.visible || DEFAULT_VISIBLE;
        const savedCollapsed = lay.collapsed || [];
        // One-time migration: agenda became a default card. Add it for existing
        // users unless they later remove it (guarded by newDefaults flag).
        const newDefaults = s.data.newDefaults || [];
        let migratedLayout = savedLayout;
        let migratedVisible = savedVisible;
        let nextNewDefaults = newDefaults;
        let needsPersist = false;
        if (!savedVisible.includes("agenda") && !newDefaults.includes("agenda")) {
          migratedVisible = [...migratedVisible, "agenda"];
          migratedLayout = [...migratedLayout.filter((x) => x.i !== "agenda"), { i: "agenda", ...metaFor("agenda"), y: Infinity }];
          nextNewDefaults = [...nextNewDefaults, "agenda"];
          needsPersist = true;
        }
        // One-time correction: match the standard layout — countdown & welcome
        // tall, journey narrower (equal 3-column top row). Resets x/w/h once.
        if (!newDefaults.includes("layoutV8")) {
          const top = ["countdown", "journey", "welcome"];
          migratedLayout = migratedLayout.map((x) => {
            if (!top.includes(x.i)) return x;
            const m = metaFor(x.i);
            return { ...x, x: m.x, w: m.w, h: m.h };
          });
          nextNewDefaults = [...nextNewDefaults, "layoutV8"];
          needsPersist = true;
        }
        savedLayout = migratedLayout;
        savedVisible = migratedVisible;
        if (needsPersist) {
          api.put("/settings", {
            layout: { layout: savedLayout, visible: savedVisible, collapsed: savedCollapsed },
            newDefaults: nextNewDefaults,
          }).catch(() => {});
        }
        setLayout(withCollapse(applyConstraints(savedLayout), savedCollapsed));
        setVisible(savedVisible);
        setCollapsed(savedCollapsed);
      }
    })();
  }, []);

  // Apply theme to <html>
  useEffect(() => {
    const theme = settings?.theme || "default";
    if (theme && theme !== "default") document.documentElement.setAttribute("data-theme", theme);
    else document.documentElement.removeAttribute("data-theme");
  }, [settings?.theme]);

  const persistLayout = useCallback((nextLayout, nextVisible, nextCollapsed) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      api.put("/settings", { layout: { layout: nextLayout, visible: nextVisible, collapsed: nextCollapsed } }).catch(() => {});
    }, 600);
  }, []);

  const commit = useCallback((rawLayout, vis, col, tidy = false) => {
    let visItems = applyConstraints(rawLayout.filter((l) => vis.includes(l.i)));
    visItems = withCollapse(visItems, col);
    if (tidy) visItems = packDense(visItems);
    const hidden = rawLayout.filter((l) => !vis.includes(l.i));
    const merged = [...visItems, ...hidden];
    setLayout(merged);
    persistLayout(merged, vis, col);
    return merged;
  }, [persistLayout]);

  const onLayoutChange = (current) => {
    const tidy = tidyRef.current;
    tidyRef.current = false;
    commit(current, visible, collapsed, tidy);
  };

  const markTidy = () => { tidyRef.current = true; };

  const removeCard = (id) => {
    const nv = visible.filter((c) => c !== id);
    setVisible(nv);
    commit(layout, nv, collapsed, true);
  };

  const addCard = (id, extra) => {
    if (visible.includes(id)) return;
    const nv = [...visible, id];
    setVisible(nv);
    setShowAddMenu(false);
    if (id === "note" && extra?.content) updateCardData({ note: extra.content });
    const def = { i: id, ...metaFor(id), y: Infinity };
    const nl = [...layout.filter((l) => l.i !== id), def];
    commit(nl, nv, collapsed, true);
  };

  const toggleWidth = (id) => {
    const nl = layout.map((l) => {
      if (l.i !== id) return l;
      const m = metaFor(l.i);
      const steps = WIDTH_STEPS.filter((w) => w >= (m.minW ?? 3) && w <= (m.maxW ?? GRID_COLS));
      const idx = steps.indexOf(l.w);
      const nextW = steps[(idx + 1) % steps.length] ?? steps[0] ?? l.w;
      return { ...l, w: nextW };
    });
    commit(nl, visible, collapsed, true);
  };

  const toggleCollapse = (id) => {
    const isCol = collapsed.includes(id);
    const nl = layout.map((l) => {
      if (l.i !== id) return l;
      if (isCol) {
        const h = preH.current[id] ?? metaFor(id).h ?? 6;
        return { ...l, h };
      }
      preH.current[id] = l.h;
      return { ...l, h: 2 };
    });
    const nc = isCol ? collapsed.filter((x) => x !== id) : [...collapsed, id];
    setCollapsed(nc);
    commit(nl, visible, nc, false);
  };

  const resetLayout = () => {
    preH.current = {};
    setVisible(DEFAULT_VISIBLE);
    setCollapsed([]);
    commit(DEFAULT_LAYOUT, DEFAULT_VISIBLE, [], false);
    setShowSettings(false);
  };

  const applySettings = (patch) => {
    setSettings((s) => ({ ...s, ...patch }));
    api.put("/settings", patch).catch(() => {});
  };

  const cardData = settings?.cardData || {};
  const updateCardData = (patch) => {
    setSettings((prev) => {
      const nextCardData = { ...(prev?.cardData || {}), ...patch };
      if (cardDataTimer.current) clearTimeout(cardDataTimer.current);
      cardDataTimer.current = setTimeout(() => {
        api.put("/settings", { cardData: nextCardData }).catch(() => {});
      }, 600);
      return { ...prev, cardData: nextCardData };
    });
  };

  // ---- data mutations ----
  const addTask = async (text) => { const { data } = await api.post("/tasks", { text }); setTasks((p) => [...p, data]); };
  const toggleTask = async (t) => { const { data } = await api.put(`/tasks/${t.id}`, { done: !t.done }); setTasks((p) => p.map((x) => (x.id === t.id ? data : x))); };
  const deleteTask = async (id) => { await api.delete(`/tasks/${id}`); setTasks((p) => p.filter((x) => x.id !== id)); };

  const today = formatDateToISO(new Date());
  const todaysLogs = useMemo(() => logs.filter((l) => l.date === today), [logs, today]);
  const addLog = async (subject, seconds) => { const { data } = await api.post("/studylogs", { subject, seconds, date: today }); setLogs((p) => [data, ...p]); };
  const deleteLog = async (id) => { await api.delete(`/studylogs/${id}`); setLogs((p) => p.filter((x) => x.id !== id)); };

  const addTest = async (date, name) => { const { data } = await api.post("/tests", { date, name }); setTests((p) => [...p, data].sort((a, b) => a.date.localeCompare(b.date))); };
  const deleteTest = async (id) => { await api.delete(`/tests/${id}`); setTests((p) => p.filter((x) => x.id !== id)); };

  const addScore = async (payload) => { const { data } = await api.post("/scores", payload); setScores((p) => [...p, data]); };
  const deleteScore = async (id) => { await api.delete(`/scores/${id}`); setScores((p) => p.filter((x) => x.id !== id)); };
  const setTarget = (val) => applySettings({ targetScore: val });

  const newQuote = () => setQuoteIdx((i) => (i + 1) % QUOTES.length);

  // ---- keyboard shortcuts ----
  useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target.tagName || "").toLowerCase();
      if (["input", "textarea", "select"].includes(tag)) return;
      if (e.key === "Escape") { setFocus(false); setZen(false); setShowSettings(false); setShowInfo(false); setShowAddMenu(false); setTestModalDate(null); return; }
      const k = e.key.toLowerCase();
      if (k === "f") setFocus((v) => !v);
      else if (k === "z") setZen((v) => !v);
      else if (k === "n") setShowAddMenu((v) => !v);
      else if (k === "c") setShowSettings(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const renderCard = (id) => {
    switch (id) {
      case "countdown": return <CountdownCard settings={settings} />;
      case "journey": return <JourneyCard settings={settings} tests={tests} onDayClick={setTestModalDate} />;
      case "tasks": return <TasksCard tasks={tasks} onAdd={addTask} onToggle={toggleTask} onDelete={deleteTask} />;
      case "studylog": return <StudyLogCard settings={settings} todaysLogs={todaysLogs} onLog={addLog} onDeleteLog={deleteLog} />;
      case "welcome": return <WelcomeCard />;
      case "quote": return <QuoteCard quote={QUOTES[quoteIdx]} onNew={newQuote} />;
      case "mock": return <MockTestCard scores={scores} target={settings?.targetScore || 0} onAdd={addScore} onDelete={deleteScore} onTargetChange={setTarget} />;
      case "planner": return <TestPlannerCard tests={tests} onAdd={addTest} onDelete={deleteTest} />;
      case "pomodoro": return <PomodoroCard durations={cardData.pomodoro} onChange={(d) => updateCardData({ pomodoro: d })} />;
      case "note": return <NoteCard value={cardData.note} onChange={(v) => updateCardData({ note: v })} />;
      case "youtube": return <YouTubeCard url={cardData.youtube} onChange={(u) => updateCardData({ youtube: u })} />;
      case "agenda": return <DailyAgendaCard agenda={cardData.agenda} onChange={(a) => updateCardData({ agenda: a })} />;
      default: return null;
    }
  };

  const gridLayout = layout.filter((l) => visible.includes(l.i));
  const modalTests = testModalDate ? tests.filter((t) => t.date === testModalDate) : [];

  return (
    <div className={`container mx-auto px-2 sm:px-4 py-6 max-w-[1400px] ${zen ? "zen-mode" : ""}`}>
      <Navbar
        title={getDashboardTitle(settings)}
        view={view}
        setView={setView}
        onCustomize={() => setShowSettings(true)}
        onAddCard={() => setShowAddMenu((v) => !v)}
        onInfo={() => setShowInfo(true)}
        onFocus={() => setFocus(true)}
        onZen={() => setZen((v) => !v)}
        onAdmin={() => setShowAdmin(true)}
      />

      {zen && (
        <button onClick={() => setZen(false)} className="fixed bottom-5 right-5 z-50 capsule-btn" title="Exit Zen Mode" data-testid="zen-exit">
          <X size={16} />
        </button>
      )}

      {showAddMenu && (
        <AddCardModal visible={visible} onAdd={addCard} onClose={() => setShowAddMenu(false)} />
      )}

      <div className="mt-4">
        {view === "dashboard" && (
          <ResponsiveGridLayout
            className="layout"
            layouts={{ lg: gridLayout, md: gridLayout }}
            breakpoints={{ lg: 1024, md: 768, sm: 0 }}
            cols={{ lg: 12, md: 12, sm: 1 }}
            rowHeight={30}
            margin={[18, 18]}
            draggableHandle=".drag-handle"
            draggableCancel="input,textarea,select,button,a"
            onLayoutChange={onLayoutChange}
            onDragStop={markTidy}
            onResizeStop={markTidy}
            isBounded={false}
            compactType="vertical"
          >
            {gridLayout.map((l) => (
              <div key={l.i}>
                <ChromeContext.Provider
                  value={{ remove: () => removeCard(l.i), toggleWidth: () => toggleWidth(l.i), toggleCollapse: () => toggleCollapse(l.i), collapsed: collapsed.includes(l.i) }}
                >
                  {renderCard(l.i)}
                </ChromeContext.Provider>
              </div>
            ))}
          </ResponsiveGridLayout>
        )}

        {view === "statistics" && <StatisticsView logs={logs} scores={scores} />}

        {view === "calendar" && (
          <div className="card items-center justify-center text-center py-20" style={{ height: "auto" }}>
            <h2 className="text-xl font-bold mb-2">Calendar</h2>
            <p className="text-secondary text-sm">Use the Journey card and Test Planner to schedule tests — a full month calendar view is coming soon.</p>
          </div>
        )}
      </div>

      {showSettings && <SettingsModal settings={settings} onClose={() => setShowSettings(false)} onSave={applySettings} onReset={resetLayout} />}
      {showInfo && <InfoModal onClose={() => setShowInfo(false)} />}
      {showAdmin && <AdminPanel onClose={() => setShowAdmin(false)} />}
      {focus && <FocusMode settings={settings} onClose={() => setFocus(false)} />}
      {testModalDate && (
        <AddTestModal
          date={testModalDate}
          existing={modalTests}
          onClose={() => setTestModalDate(null)}
          onAdd={addTest}
          onDelete={deleteTest}
        />
      )}
    </div>
  );
}
