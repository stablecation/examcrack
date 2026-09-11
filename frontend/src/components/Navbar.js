import React from "react";
import { Plus, Settings, Info, Target, Moon, LogOut, Shield } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Navbar({ title, view, setView, onCustomize, onAddCard, onInfo, onFocus, onZen, onAdmin }) {
  const { user, logout } = useAuth();
  const tabs = ["Dashboard", "Calendar", "Statistics"];

  return (
    <header className="header-capsule flex flex-wrap justify-between items-center gap-y-2 relative">
      <div className="flex items-center gap-3 pl-2">
        <a href="https://sval.tech" target="_blank" rel="noreferrer" className="hover:opacity-80 transition-opacity">
          <span className="brand-text">sval.tech</span>
        </a>
        <span className="text-gray-600">|</span>
        <h1 className="text-lg sm:text-xl font-bold tracking-tight" data-testid="dashboard-title">{title}</h1>
      </div>

      <div className="order-last w-full md:w-auto md:absolute md:left-1/2 md:-translate-x-1/2 flex justify-center">
        <nav className="flex p-1 bg-black/30 backdrop-blur-md rounded-full border border-white/10">
          {tabs.map((t) => {
            const key = t.toLowerCase();
            const activeTab = view === key;
            return (
              <button
                key={t}
                onClick={() => setView(key)}
                className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all ${
                  activeTab ? "bg-[var(--accent-color)] text-white" : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
                data-testid={`nav-tab-${key}`}
              >
                {t}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="flex items-center gap-2 pr-1 ml-auto md:ml-0">
        <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-green-900/20 border border-green-500/30 text-xs font-bold text-green-400 zen-hide">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
          <span>Online</span>
        </div>

        {user && (
          <button
            onClick={logout}
            className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold py-1.5 px-3 rounded-full transition-colors"
            data-testid="signout-btn"
            title={user.email}
          >
            <span className="max-w-[120px] truncate">{user.name || user.email}</span>
            <LogOut size={13} />
          </button>
        )}

        {user?.role === "admin" && (
          <button
            onClick={onAdmin}
            className="flex items-center gap-1.5 bg-[var(--accent-color)]/15 hover:bg-[var(--accent-color)]/25 border border-[var(--accent-color)]/40 text-[var(--accent-color)] text-xs font-bold py-1.5 px-3 rounded-full transition-colors zen-hide"
            data-testid="admin-btn"
            title="Admin Console"
          >
            <Shield size={13} />
            <span className="hidden sm:inline">Admin</span>
          </button>
        )}

        <div className="h-4 w-px bg-white/10 mx-1 hidden sm:block zen-hide" />
        <div className="flex items-center gap-1.5 zen-hide">
          <button className="capsule-btn" title="Add New Card" onClick={onAddCard} data-testid="add-card-btn">
            <Plus size={16} strokeWidth={2.5} />
          </button>
          <button className="capsule-btn" title="Customize" onClick={onCustomize} data-testid="customize-btn">
            <Settings size={16} />
          </button>
          <button className="capsule-btn" title="Info" onClick={onInfo} data-testid="info-btn">
            <Info size={16} />
          </button>
          <button className="capsule-btn" title="Super Focus Mode" onClick={onFocus} data-testid="focus-btn">
            <Target size={16} />
          </button>
          <button className="capsule-btn" title="Zen Mode" onClick={onZen} data-testid="zen-btn">
            <Moon size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}
