import { useMemo, useState } from "react";
import { CATALOG } from "../data/catalog.js";
import { normalize } from "../i18n.js";

export default function Search({ t, lang, onSelect }) {
  const [q, setQ] = useState("");
  const [focus, setFocus] = useState(false);
  const index = useMemo(() => [...CATALOG.values()].map((e) => ({ e, key: normalize(e.data.name.fa + " " + e.data.name.en + " " + e.id) })), []);
  const res = useMemo(() => {
    const n = normalize(q); if (!n) return [];
    return index.filter((x) => x.key.includes(n)).slice(0, 8).map((x) => x.e);
  }, [q, index]);
  const pick = (id) => { onSelect(id); setQ(""); setFocus(false); };
  return (
    <div className="search">
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zm9 16-4-4" /></svg>
      <input type="search" value={q} placeholder={t.search} aria-label={t.search}
        onChange={(e) => setQ(e.target.value)} onFocus={() => setFocus(true)} onBlur={() => setTimeout(() => setFocus(false), 150)}
        onKeyDown={(e) => { if (e.key === "Enter" && res[0]) pick(res[0].id); if (e.key === "Escape") { setQ(""); e.currentTarget.blur(); } }} />
      {focus && q && (
        <ul className="results" role="listbox">
          {res.length === 0 && <li className="none">{t.noResult}</li>}
          {res.map((e) => (
            <li key={e.id}>
              <button type="button" onMouseDown={(ev) => ev.preventDefault()} onClick={() => pick(e.id)}>
                <i style={{ "--c": e.data.color || "#fff" }} />
                <span>{e.data.name[lang]}</span>
                <small>{t.types[e.type]}</small>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
