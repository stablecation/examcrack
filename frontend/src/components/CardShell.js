import React, { useContext } from "react";
import { Maximize2, Minus, Trash2, GripVertical } from "lucide-react";
import ChromeContext from "../context/ChromeContext";

// Reusable card chrome: title + top-right controls (resize, collapse, delete, drag).
export default function CardShell({ title, titleIcon, headerExtra, onDelete, children, bodyClass = "" }) {
  const chrome = useContext(ChromeContext);
  const remove = chrome?.remove || onDelete;
  const collapsed = chrome?.collapsed;

  return (
    <div
      className={`card ${collapsed ? "collapsed" : ""}`}
      data-testid={`card-${(title || "card").toLowerCase().replace(/\s+/g, "-")}`}
    >
      <div className="card-header">
        <h2 className="flex items-center gap-2">
          {titleIcon}
          {title}
        </h2>
        <div className="card-header-controls">
          {headerExtra}
          <button title="Cycle size" data-testid="card-resize-btn" onClick={chrome?.toggleWidth}>
            <Maximize2 size={15} />
          </button>
          <button title={collapsed ? "Expand" : "Collapse"} data-testid="card-collapse-btn" onClick={chrome?.toggleCollapse}>
            <Minus size={15} />
          </button>
          {remove && (
            <button title="Delete card" className="delete-card-btn" onClick={remove} data-testid="card-delete-btn">
              <Trash2 size={15} />
            </button>
          )}
          <span className="drag-handle" title="Drag to move" aria-label="Drag to reorder">
            <GripVertical size={15} />
          </span>
        </div>
      </div>
      <div className={`card-body no-scrollbar ${bodyClass}`}>{children}</div>
    </div>
  );
}
