import React from "react";
import CardShell from "../CardShell";

export default function WelcomeCard({ onDelete }) {
  return (
    <CardShell title="Welcome!" onDelete={onDelete}>
      <p className="text-sm leading-relaxed text-[var(--text-primary)]">
        Welcome to your new dashboard! You can drag, resize, and delete these cards. Add your own
        from the top right customise button. Best of luck in your journey! You can delete this card
        now.
      </p>
    </CardShell>
  );
}
