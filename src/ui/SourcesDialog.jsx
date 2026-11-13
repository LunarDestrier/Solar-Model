import { useEffect } from "react";
import { SOURCES } from "../data/sources.js";

export default function SourcesDialog({ t, lang, open, onClose }) {
  useEffect(() => {
    if (!open) return;
    const k = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="modal" onClick={onClose}>
      <div className="dialog panel" role="dialog" aria-modal="true" aria-label={t.sourcesTitle} onClick={(e) => e.stopPropagation()}>
        <header>
          <h2>{t.sourcesTitle}</h2>
          <button type="button" className="ic sm" onClick={onClose} aria-label={t.close}>✕</button>
        </header>
        <div className="scroll">
          <p className="intro">{t.sourcesIntro}</p>
          {SOURCES.map((g, i) => (
            <section key={i}>
              <h3>{g.group[lang]}</h3>
              <ul>
                {g.items.map((it, j) => (
                  <li key={j}>
                    <a href={it.url} target="_blank" rel="noreferrer noopener">{it.name[lang]}</a>
                    <small>{it.note[lang]}</small>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
