import React from "react";
import CardShell from "../CardShell";

export default function QuoteCard({ quote, onNew, onDelete }) {
  return (
    <CardShell title="Quote" onDelete={onDelete} bodyClass="flex flex-col">
      <div className="flex-1 flex flex-col justify-center items-center text-center px-4 py-4">
        <p className="text-lg md:text-xl leading-relaxed text-gray-200 font-serif italic mb-4" data-testid="quote-text">
          &ldquo;{quote.text}&rdquo;
        </p>
        <div className="w-12 h-[2px] bg-[var(--accent-color)] opacity-50 mb-4 rounded-full" />
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400" data-testid="quote-author">
          - {quote.author}
        </p>
      </div>
      <div className="flex justify-end">
        <button
          onClick={onNew}
          className="text-xs text-secondary hover:text-white px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
          data-testid="quote-new-btn"
        >
          New Quote
        </button>
      </div>
    </CardShell>
  );
}
