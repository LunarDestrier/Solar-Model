import { useEffect, useState } from "react";
import { CATALOG } from "../data/catalog.js";
import { makeFmt } from "../i18n.js";
import { AU_KM } from "../engine/orbits.js";

const EARTH_R = 6371, EARTH_M = 5.9724e24;

function Sci({ v, f }) {
  const [m, e] = v;
  return <span dir="ltr" className="num">{f.nf(m, 4)} × 10<sup>{f.nf(e, 0)}</sup></span>;
}
function Row({ k, children }) { return <div className="kv"><dt>{k}</dt><dd>{children}</dd></div>; }
const L = (x, lang) => (x && typeof x === "object" && "fa" in x ? x[lang] : x);

export default function InfoPanel({ id, t, lang, engine, onClose }) {
  const entry = id ? CATALOG.get(id) : null;
  const [tab, setTab] = useState("overview");
  const [live, setLive] = useState(null);
  useEffect(() => { setTab("overview"); }, [id]);
  useEffect(() => {
    if (!id || !engine) return;
    const upd = () => setLive(engine.getLive(id));
    upd();
    const h = setInterval(upd, 500);
    return () => clearInterval(h);
  }, [id, engine]);

  if (!entry) return null;
  const f = makeFmt(lang);
  const d = entry.data, ph = d.phys || {};
  const sky = entry.type === "skystar";
  const num = (n, u) => <span className="num" dir="ltr">{f.smart(n)}</span>;
  const unit = (n, u) => <><span className="num" dir="ltr">{f.smart(n)}</span> <small className="u">{u}</small></>;

  const tabs = [["overview", t.tabs.overview], ["physical", t.tabs.physical]];
  const hasOrbit = !!(d.orbit || d.a || sky || d.mode);
  if (hasOrbit) tabs.push(["orbit", sky ? (lang === "fa" ? "موقعیت" : "Position") : t.tabs.orbit]);
  if (d.bulk || d.atmo2 || d.layers || d.atmoNote) tabs.push(["composition", t.tabs.composition]);
  tabs.push(["refs", t.tabs.refs]);

  const rel = (v, ref) => <small className="u"> ({f.nf(v / ref, v / ref < 10 ? 2 : 1)} {t.vsEarth})</small>;
  const rotText = (h) => {
    const a = Math.abs(h);
    const retro = h < 0 ? " " + t.retro : "";
    if (a >= 48) return <>{unit(a / 24, t.days)}{retro}</>;
    return <>{unit(a, t.hours)}{retro}</>;
  };

  /* ---------- tab bodies ---------- */
  const bars = (arr, title) => (
    <div className="bars">
      <h4>{title}</h4>
      {arr.map((b, i) => (
        <div key={i} className="bar-row">
          <span className="sym" dir="ltr">{b.k}</span>
          <span className="nm">{b.name[lang]}</span>
          <div className="track"><i style={{ width: Math.max(1.5, Math.min(100, b.pct)) + "%", "--i": i }} /></div>
          <span className="pc" dir="ltr">{f.nf(b.pct, b.pct < 1 ? 3 : 2)}%</span>
        </div>
      ))}
    </div>
  );

  let body;
  if (tab === "overview") {
    body = (
      <>
        <p className="desc">{d.desc[lang]}</p>
        {live && !sky && (
          <div className="live">
            <h4><i className="dot" /> {t.live}</h4>
            <dl>
              {entry.type !== "star" && <Row k={t.distSun}>{unit(live.rSun, t.au)}<small className="u"> ≈ {f.int(live.rSun * AU_KM / 1e6)} {lang === "fa" ? "میلیون" : "M"} {t.km}</small></Row>}
              {id !== "earth" && <Row k={t.distEarth}>{unit(live.dEarth, t.au)}</Row>}
              {id !== "earth" && <Row k={t.lightTime}>{live.dEarth * 8.3167 < 120 ? unit(live.dEarth * 8.3167, t.min) : unit(live.dEarth * 8.3167 / 60, t.hours)}</Row>}
              {live.speed && <Row k={t.speed}>{unit(live.speed, t.kmps)}</Row>}
            </dl>
          </div>
        )}
        {d.layers && <><h4>{t.structure}</h4><p className="plain">{L(d.layers, lang)}</p></>}
        {d.facts?.length > 0 && <><h4>{t.facts}</h4><ul className="facts">{d.facts.map((x, i) => <li key={i}>{x[lang]}</li>)}</ul></>}
        {d.approx && <p className="note">{t.approx}</p>}
      </>
    );
  } else if (tab === "physical") {
    if (sky) {
      body = (
        <dl>
          <Row k={t.cls}><span className="num" dir="ltr">{d.cls}</span></Row>
          <Row k={t.con}>{d.con[lang]}</Row>
          <Row k={t.distLy}>{unit(d.ly, t.ly)}</Row>
          <Row k={t.mag}>{num(d.mag)}</Row>
          <Row k={t.starTemp}>{unit(d.K, "K")}</Row>
          <Row k={t.starMass}>{num(d.M)}</Row>
          <Row k={t.starRadius}>{num(d.R)}</Row>
          <Row k={t.starLum}>{num(d.L)}</Row>
        </dl>
      );
    } else {
      body = (
        <dl>
          {d.R && <Row k={t.radius}>{unit(d.R, t.km)}{entry.type !== "craft" && d.R !== EARTH_R && rel(d.R, EARTH_R)}</Row>}
          {ph.mass && <Row k={t.mass}><Sci v={ph.mass} f={f} /> <small className="u">{t.kg}</small>{entry.type !== "craft" && entry.type !== "belt" && ph.mass[0] * 10 ** ph.mass[1] > 1e18 && rel(ph.mass[0] * 10 ** ph.mass[1], EARTH_M)}</Row>}
          {ph.dens && <Row k={t.density}>{unit(ph.dens, t.gcm3)}</Row>}
          {ph.g != null && <Row k={t.gravity}>{unit(ph.g, t.ms2)}</Row>}
          {ph.esc != null && <Row k={t.escape}>{unit(ph.esc, t.kmps)}</Row>}
          {ph.rot != null && <Row k={t.rotation}>{rotText(ph.rot)}</Row>}
          {ph.tilt != null && ph.rot != null && <Row k={t.tilt}>{unit(ph.tilt, "°")}</Row>}
          {ph.temp && <Row k={t.temp}>{L(ph.temp, lang)}</Row>}
          {ph.moons != null && <Row k={t.moonsCount}>{typeof ph.moons === "object" ? ph.moons[lang] : f.int(ph.moons)}</Row>}
          {ph.pressure && ph.pressure !== "—" && <Row k={t.pressure}>{L(ph.pressure, lang)}</Row>}
          {ph.extra?.map(([k, v], i) => <Row key={i} k={k[lang]}>{L(v, lang)}</Row>)}
        </dl>
      );
    }
  } else if (tab === "orbit") {
    if (sky) {
      const h = Math.floor(d.ra), m = Math.round((d.ra - h) * 60);
      body = (
        <dl>
          <Row k={t.ra}><span className="num" dir="ltr">{f.int(h)}h {f.int(m)}m</span></Row>
          <Row k={t.dec}><span className="num" dir="ltr">{f.nf(d.dec, 2)}°</span></Row>
          <Row k={t.distLy}>{unit(d.ly, t.ly)}</Row>
          <Row k={t.con}>{d.con[lang]}</Row>
        </dl>
      );
    } else if (d.orbit) {
      const o = d.orbit;
      body = (
        <dl>
          <Row k={t.sma}>{unit(o.a, t.au)}<small className="u"> ≈ {f.int(o.a * AU_KM / 1e6)} {lang === "fa" ? "میلیون" : "M"} {t.km}</small></Row>
          <Row k={t.ecc}>{num(o.e)}</Row>
          <Row k={t.incl}>{unit(o.i, "°")}</Row>
          <Row k={t.period}>{o.P > 700 ? unit(o.P / 365.25, t.years) : unit(o.P, t.days)}</Row>
          <Row k={t.peri}>{unit(o.a * (1 - o.e), t.au)}</Row>
          <Row k={t.apo}>{unit(o.a * (1 + o.e), t.au)}</Row>
          {live?.speed && <Row k={t.speed}>{unit(live.speed, t.kmps)}</Row>}
        </dl>
      );
    } else if (d.a) {
      body = (
        <dl>
          <Row k={t.distParent}>{unit(d.a, t.km)}</Row>
          <Row k={t.period}>{unit(Math.abs(d.P), t.days)}{d.P < 0 && <small className="u"> {t.retro}</small>}</Row>
          {d.incl != null && <Row k={t.incl}>{unit(d.incl, "°")}</Row>}
        </dl>
      );
    } else {
      body = <dl>{ph.extra?.map(([k, v], i) => <Row key={i} k={k[lang]}>{L(v, lang)}</Row>)}</dl>;
    }
  } else if (tab === "composition") {
    body = (
      <>
        {d.layers && <><h4>{t.layersT}</h4><p className="plain">{L(d.layers, lang)}</p></>}
        {d.bulk && bars(d.bulk, L(d.bulkTitle, lang) || t.tabs.composition)}
        {d.atmo2 && bars(d.atmo2, t.atmoT)}
        {d.atmoNote && <p className="note">{d.atmoNote[lang]}</p>}
        {!d.bulk && !d.atmo2 && !d.layers && <p className="plain">{t.noComp}</p>}
      </>
    );
  } else {
    const enName = d.wiki || (sky ? d.wiki : null);
    const faQ = encodeURIComponent(d.name.fa.replace(/\s*\(.*?\)/g, ""));
    body = (
      <>
        <h4>{t.refsT}</h4>
        <ul className="refs">
          {enName && <li><a href={`https://en.wikipedia.org/wiki/${enName}`} target="_blank" rel="noreferrer noopener">{t.wikiEn}</a></li>}
          <li><a href={`https://fa.wikipedia.org/w/index.php?search=${faQ}`} target="_blank" rel="noreferrer noopener">{t.wikiFa}</a></li>
          {d.nasa && <li><a href={d.nasa} target="_blank" rel="noreferrer noopener">{t.nasa}</a></li>}
          {d.fact && <li><a href={d.fact} target="_blank" rel="noreferrer noopener">{t.factsheet}</a></li>}
          {(d.orbit || d.a) && <li><a href="https://ssd.jpl.nasa.gov/horizons/" target="_blank" rel="noreferrer noopener">{t.horizons}</a></li>}
          {sky && <li><a href={`https://simbad.cds.unistra.fr/simbad/sim-basic?Ident=${encodeURIComponent(d.name.en)}`} target="_blank" rel="noreferrer noopener">{t.simbad}</a></li>}
        </ul>
      </>
    );
  }

  const ticks = Array.from({ length: 48 }, (_, i) => i);
  return (
    <aside className="panel info" aria-label={d.name[lang]} key={id}>
      <header>
        <div className="medal" style={{ "--c": d.color || "#fff" }}>
          <svg viewBox="-50 -50 100 100" aria-hidden="true">
            <g className="spin">{ticks.map((i) => <line key={i} x1="0" y1={i % 4 === 0 ? -42 : -45} x2="0" y2="-48" transform={`rotate(${i * 7.5})`} />)}</g>
            <circle r="30" className="rim" />
          </svg>
          <i />
        </div>
        <div className="ttl">
          <small>{t.types[entry.type]}</small>
          <h2>{d.name[lang]}</h2>
          <span className="alt" dir={lang === "fa" ? "ltr" : "rtl"} lang={lang === "fa" ? "en" : "fa"}>{d.name[lang === "fa" ? "en" : "fa"]}</span>
        </div>
        <button type="button" className="ic sm" onClick={onClose} aria-label={t.close}>✕</button>
      </header>
      <nav className="tabs" role="tablist">
        {tabs.map(([k, label]) => <button type="button" role="tab" key={k} aria-selected={tab === k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{label}</button>)}
      </nav>
      <div className="scroll body" role="tabpanel">{body}</div>
    </aside>
  );
}
