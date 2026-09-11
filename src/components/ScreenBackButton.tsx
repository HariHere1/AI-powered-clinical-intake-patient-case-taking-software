import { useApp, type Screen } from "../context/AppContext";

interface ScreenBackButtonProps {
  to: Screen;
  label?: string;
}

export default function ScreenBackButton({ to, label = "Back" }: ScreenBackButtonProps) {
  const { navigateTo } = useApp();

  return (
    <button
      onClick={() => navigateTo(to)}
      className="flex items-center gap-1 self-start mk-transition"
      style={{
        background: "none",
        border: "none",
        color: "var(--mk-muted)",
        fontFamily: "var(--font-display)",
        fontSize: "0.85rem",
        cursor: "pointer",
        padding: 0,
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <polyline points="15 18 9 12 15 6" />
      </svg>
      {label}
    </button>
  );
}