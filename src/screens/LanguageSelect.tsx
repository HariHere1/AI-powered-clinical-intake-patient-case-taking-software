import { useApp, Language } from "../context/AppContext";
import ScreenBackButton from "../components/ScreenBackButton";

const LANGUAGES: Language[] = [
  { code: "en", native: "English", english: "English", script: "Latin" },
  { code: "hi", native: "हिंदी", english: "Hindi", script: "Devanagari" },
  { code: "ta", native: "தமிழ்", english: "Tamil", script: "Tamil" },
  { code: "te", native: "తెలుగు", english: "Telugu", script: "Telugu" },
  { code: "bn", native: "বাংলা", english: "Bengali", script: "Bengali" },
  { code: "mr", native: "मराठी", english: "Marathi", script: "Devanagari" },
  { code: "pa", native: "ਪੰਜਾਬੀ", english: "Punjabi", script: "Gurmukhi" },
  { code: "kn", native: "ಕನ್ನಡ", english: "Kannada", script: "Kannada" },
  { code: "ml", native: "മലയാളം", english: "Malayalam", script: "Malayalam" },
  { code: "gu", native: "ગુજરાતી", english: "Gujarati", script: "Gujarati" },
  { code: "od", native: "ଓଡ଼ିଆ", english: "Odia", script: "Odia" },
  { code: "ur", native: "اردو", english: "Urdu", script: "Arabic" },
];

const SCRIPT_FONTS: Record<string, string> = {
  Devanagari: "'Noto Sans Devanagari', 'Noto Sans', sans-serif",
  Tamil: "'Noto Sans Tamil', 'Noto Sans', sans-serif",
  Telugu: "'Noto Sans Telugu', 'Noto Sans', sans-serif",
  Bengali: "'Noto Sans Bengali', 'Noto Sans', sans-serif",
  Kannada: "'Noto Sans Kannada', 'Noto Sans', sans-serif",
  Malayalam: "'Noto Sans Malayalam', 'Noto Sans', sans-serif",
  Latin: "'Outfit', sans-serif",
  Gurmukhi: "'Noto Sans', sans-serif",
  Gujarati: "'Noto Sans', sans-serif",
  Odia: "'Noto Sans', sans-serif",
  Arabic: "'Noto Sans Arabic', 'Noto Sans', sans-serif",
};

export default function LanguageSelect() {
  const { navigateTo, setLanguage } = useApp();

  function handleSelect(lang: Language) {
    setLanguage(lang);
    navigateTo("consent");
  }

  return (
    <div
      className="flex flex-col items-center flex-1 overflow-y-auto scrollbar-hide screen-enter mk-transition"
      style={{ backgroundColor: "var(--mk-bg)", color: "var(--mk-fg)" }}
    >
      {/* Header section */}
      <div
        className="w-full flex flex-col items-center py-10 px-6"
        style={{ borderBottom: "1.5px solid var(--mk-border)" }}
      >
        <div className="w-full" style={{ maxWidth: 960, marginBottom: 24 }}>
          <ScreenBackButton to="entry" label="Back to check-in" />
        </div>
        <div
          className="rounded-full flex items-center justify-center mb-4"
          style={{ width: 72, height: 72, backgroundColor: "var(--mk-sand)" }}
        >
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--mk-primary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
        </div>

        <h1
          className="font-bold text-center mb-2"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(1.5rem, 3vw, 2rem)",
            color: "var(--mk-fg)",
          }}
        >
          Choose your language
        </h1>
        <p
          className="text-center"
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "clamp(0.95rem, 1.8vw, 1.1rem)",
            color: "var(--mk-muted)",
            maxWidth: 440,
          }}
        >
          अपनी भाषा चुनें &nbsp;·&nbsp; உங்கள் மொழியை தேர்வு செய்யுங்கள் &nbsp;·&nbsp; మీ భాష ఎంచుకోండి
        </p>
      </div>

      {/* Language grid */}
      <div
        className="w-full grid p-6 gap-4"
        style={{
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          maxWidth: 960,
        }}
      >
        {LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            onClick={() => handleSelect(lang)}
            className="flex flex-col items-center justify-center rounded-2xl mk-transition"
            style={{
              minHeight: 110,
              backgroundColor: "var(--mk-card)",
              border: "2px solid var(--mk-border)",
              cursor: "pointer",
              padding: "20px 16px",
              gap: 6,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--mk-primary)";
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--mk-sand)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--mk-border)";
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--mk-card)";
            }}
          >
            <span
              style={{
                fontFamily: SCRIPT_FONTS[lang.script] || "var(--font-body)",
                fontSize: lang.code === "en" ? "1.6rem" : "1.8rem",
                fontWeight: 600,
                color: "var(--mk-fg)",
                lineHeight: 1.2,
              }}
            >
              {lang.native}
            </span>
            {lang.code !== "en" && (
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "0.78rem",
                  color: "var(--mk-muted)",
                  fontWeight: 500,
                  letterSpacing: "0.03em",
                  textTransform: "uppercase",
                }}
              >
                {lang.english}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Footer note */}
      <div className="pb-8 px-6 text-center" style={{ color: "var(--mk-muted)", fontSize: "0.85rem", maxWidth: 500 }}>
        <span style={{ fontFamily: "var(--font-body)" }}>
          Need help? Please ask a staff member.&nbsp;&nbsp;
          <span style={{ fontFamily: "var(--font-body)" }}>मदद के लिए कर्मचारी से पूछें।</span>
        </span>
      </div>
    </div>
  );
}
