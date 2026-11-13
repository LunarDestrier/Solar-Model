export default function Options({ t, layers, setLayer, mode, setMode, open, onClose, onReset, onTop }) {
  const keys = ["orbits", "labels", "moons", "dwarfs", "belts", "comets", "craft", "stars", "milkyway", "grid", "bloom"];
  return (
    <aside className={"panel options" + (open ? " open" : "")} aria-label={t.options}>
      <header>
        <h2>{t.options}</h2>
        <button type="button" className="ic sm" onClick={onClose} aria-label={t.close}>✕</button>
      </header>
      <div className="scroll">
        <h3>{t.view}</h3>
        <div className="btnrow">
          <button type="button" className="chip" onClick={onReset}>{t.reset}</button>
          <button type="button" className="chip" onClick={onTop}>{t.top}</button>
        </div>
        <h3>{t.scaleTitle}</h3>
        <div className="seg wrap" role="radiogroup">
          {["stylized", "linear", "true"].map((m) => (
            <button type="button" key={m} role="radio" aria-checked={mode === m} className={mode === m ? "on" : ""} onClick={() => setMode(m)}>{t.scale[m]}</button>
          ))}
        </div>
        <p className="hint">{t.scaleHint[mode]}</p>
        <h3>{t.layersTitle}</h3>
        <ul className="switches">
          {keys.map((k) => (
            <li key={k}>
              <button type="button" role="switch" aria-checked={layers[k]} className={"sw" + (layers[k] ? " on" : "")} onClick={() => setLayer(k, !layers[k])}>
                <span>{t.L[k]}</span><i />
              </button>
            </li>
          ))}
        </ul>
        <p className="hint">{t.help}</p>
      </div>
    </aside>
  );
}
