import { useState } from "react";
import { CATALOG, GROUP_ORDER, byGroup } from "../data/catalog.js";

export default function ObjectList({ t, lang, selectedId, onSelect, open, onClose }) {
  const [collapsed, setCollapsed] = useState({ moons: true, stars: true, craft: false });
  return (
    <aside className={"panel list" + (open ? " open" : "")} aria-label={t.objects}>
      <header>
        <h2>{t.objects}</h2>
        <button type="button" className="ic sm" onClick={onClose} aria-label={t.close}>✕</button>
      </header>
      <div className="scroll">
        {GROUP_ORDER.map((g) => {
          const items = byGroup(g);
          const isOpen = !collapsed[g];
          let content;
          if (g === "moons") {
            const parents = [...new Set(items.map((i) => i.parent))];
            content = parents.map((p) => (
              <div key={p} className="sub">
                <h4>{CATALOG.get(p).data.name[lang]}</h4>
                {items.filter((i) => i.parent === p).map((i) => <Row key={i.id} e={i} lang={lang} sel={selectedId === i.id} onSelect={onSelect} />)}
              </div>
            ));
          } else content = items.map((i) => <Row key={i.id} e={i} lang={lang} sel={selectedId === i.id} onSelect={onSelect} />);
          return (
            <section key={g} className="grp">
              <button type="button" className="grp-h" aria-expanded={isOpen} onClick={() => setCollapsed({ ...collapsed, [g]: isOpen })}>
                <span>{t.groups[g]}</span>
                <em>{new Intl.NumberFormat(lang === "fa" ? "fa-IR" : "en-US").format(items.length)}</em>
                <svg viewBox="0 0 12 12" width="12" height="12" style={{ transform: isOpen ? "rotate(180deg)" : "none" }}><path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>
              </button>
              {isOpen && <div className="grp-b">{content}</div>}
            </section>
          );
        })}
      </div>
    </aside>
  );
}

function Row({ e, lang, sel, onSelect }) {
  return (
    <button type="button" className={"row" + (sel ? " sel" : "")} onClick={() => onSelect(e.id)}>
      <i style={{ "--c": e.data.color || "#fff" }} />
      <span>{e.data.name[lang]}</span>
    </button>
  );
}
