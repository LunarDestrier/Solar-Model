export default function Loader({ t, progress }) {
  const pct = Math.round(progress * 100);
  const ticks = Array.from({ length: 72 }, (_, i) => i);
  return (
    <div className="loader" role="status" aria-live="polite">
      <div className="astro">
        <svg viewBox="-100 -100 200 200" aria-hidden="true">
          <g className="ring-slow">
            {ticks.map((i) => (
              <line key={i} x1="0" y1={i % 6 === 0 ? -86 : -90} x2="0" y2="-96" transform={`rotate(${i * 5})`} />
            ))}
          </g>
          <circle r="70" className="orbit" />
          <circle r="48" className="orbit" />
          <circle r="28" className="orbit" />
          <g className="ring-mid"><circle cx="0" cy="-70" r="4" /></g>
          <g className="ring-fast"><circle cx="0" cy="-48" r="3" /></g>
          <circle r="12" className="sun" />
        </svg>
      </div>
      <h1>{t.title}</h1>
      <p>{t.loadingSub}</p>
      <div className="bar"><i style={{ width: pct + "%" }} /></div>
      <span className="pct">{new Intl.NumberFormat(t.__loc).format(pct)}٪</span>
    </div>
  );
}
