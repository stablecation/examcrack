import React, { useState } from "react";
import CardShell from "../CardShell";

function extractId(url) {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/live\/)([\w-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  if (/^[\w-]{11}$/.test(url.trim())) return url.trim();
  return null;
}

export default function YouTubeCard({ url, onChange }) {
  const [input, setInput] = useState(url || "");
  const videoId = extractId(url);

  const submit = (e) => {
    e.preventDefault();
    onChange(input.trim());
  };

  return (
    <CardShell title="YouTube" bodyClass="flex flex-col">
      <div className="w-full aspect-video bg-black/40 rounded-lg overflow-hidden mb-3 flex items-center justify-center">
        {videoId ? (
          <iframe
            className="w-full h-full"
            title="YouTube video player"
            src={`https://www.youtube.com/embed/${videoId}`}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            data-testid="youtube-iframe"
          />
        ) : (
          <span className="text-secondary text-xs px-4 text-center">Paste a YouTube link below to watch lectures or lo-fi streams.</span>
        )}
      </div>
      <form onSubmit={submit} className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste YouTube URL..."
          className="form-input flex-1 px-3 py-2 text-sm"
          data-testid="youtube-input"
        />
        <button type="submit" className="btn-primary font-bold py-2 px-4 text-sm" data-testid="youtube-load">
          Load
        </button>
      </form>
    </CardShell>
  );
}
