/*
  SUBJECT: «منظومه شمسی» (Solar System): a live, interactive 3D model of the solar system built on real data
  (NASA/JPL elements, NSSDC fact sheets, Wikipedia). Persian (RTL, default) + English. For a GitHub repo (LunarDestrier).
  AUDIENCE: curious Persian-speaking students + hobbyists. JOB: explore any object and read its real data.
  DESIGN PLAN
   - Type: Peyda (user's own, /public/fonts) -> Vazirmatn fallback. Quiet big titles, tabular numerals.
   - Colour: lapis-lazuli night (0.15 0.04 265), parchment text, astrolabe-brass gold (primary), turquoise for live data.
   - Layout: full-bleed 3D scene; objects list (inline-start), info "medal" panel (inline-end), ruler-style timeline at the bottom, slim footer.
   - Signature: the timeline is an astrolabe-style ruler (1900-2100) with dual Solar Hijri / Gregorian date, and the selected body gets a graduated brass medal + reticle.
*/
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SolarEngine } from "./engine/scene.js";
import { UI } from "./i18n.js";
import { SITE_NAME } from "./config.js";
import ObjectList from "./ui/ObjectList.jsx";
import InfoPanel from "./ui/InfoPanel.jsx";
import TimeBar, { SPEEDS } from "./ui/TimeBar.jsx";
import Options from "./ui/Options.jsx";
import Search from "./ui/Search.jsx";
import SourcesDialog from "./ui/SourcesDialog.jsx";
import Footer from "./ui/Footer.jsx";
import Loader from "./ui/Loader.jsx";
import "./styles.css";

const initialLang = () => {
  try { const q = new URLSearchParams(window.location.search).get("lang"); if (q === "en" || q === "fa") return q; } catch { /* noop */ }
  return "fa";
};
function makeBus() {
  const subs = new Set();
  return { on(fn) { subs.add(fn); return () => subs.delete(fn); }, emit(v) { subs.forEach((f) => f(v)); } };
}
const DEFAULT_LAYERS = { orbits: true, labels: true, moons: true, dwarfs: true, belts: true, comets: true, craft: true, stars: true, milkyway: true, grid: false, bloom: true };

export default function App() {
  const [lang, setLang] = useState(initialLang);
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const [fail, setFail] = useState(null);
  const [selected, setSelected] = useState(null);
  const [layers, setLayers] = useState(DEFAULT_LAYERS);
  const [mode, setModeState] = useState("stylized");
  const [speedIdx, setSpeedIdx] = useState(1);
  const [paused, setPaused] = useState(false);
  const [reverse, setReverse] = useState(false);
  const [listOpen, setListOpen] = useState(() => (typeof window !== "undefined" ? window.innerWidth > 1100 : true));
  const [optOpen, setOptOpen] = useState(false);
  const [srcOpen, setSrcOpen] = useState(false);
  const [engine, setEngine] = useState(null);
  const stage = useRef(null), labelRef = useRef(null);
  const bus = useMemo(makeBus, []);
  const t = useMemo(() => ({ ...UI[lang], __loc: lang === "fa" ? "fa-IR" : "en-US" }), [lang]);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "fa" ? "rtl" : "ltr";
    document.title = SITE_NAME[lang];
    try {
      const u = new URL(window.location.href);
      if (lang === "en") u.searchParams.set("lang", "en"); else u.searchParams.delete("lang");
      window.history.replaceState(null, "", u);
    } catch { /* sandboxed */ }
    engine?.setLang(lang);
  }, [lang, engine]);

  useEffect(() => {
    let eng = new SolarEngine(stage.current, labelRef.current, {
      onSelect: (id) => { setSelected(id); if (id && window.innerWidth < 900) { setListOpen(false); setOptOpen(false); } },
      onTick: (jd) => bus.emit(jd),
    });
    let dead = false;
    eng.lang = initialLang();
    eng.init((p) => !dead && setProgress(p)).then(() => {
      if (dead) { eng.dispose(); return; }
      setEngine(eng); setReady(true);
      window.__solar = eng;
      try { const f = new URLSearchParams(window.location.search).get("focus"); if (f) eng.select(f); } catch { /* noop */ }
    }).catch((e) => { console.error(e); setFail(String(e?.message || e)); });
    return () => { dead = true; eng.dispose(); };
  }, [bus]);

  useEffect(() => { engine?.setSpeed((reverse ? -1 : 1) * SPEEDS[speedIdx]); }, [engine, speedIdx, reverse]);
  useEffect(() => { engine?.setPaused(paused); }, [engine, paused]);

  const setLayer = useCallback((k, v) => { setLayers((l) => { const n = { ...l, [k]: v }; engine?.setLayers(n); return n; }); }, [engine]);
  const setMode = useCallback((m) => { setModeState(m); engine?.setScaleMode(m); }, [engine]);
  const select = useCallback((id) => { engine?.select(id); }, [engine]);
  const close = useCallback(() => { engine?.select(null); }, [engine]);

  useEffect(() => {
    const k = (e) => {
      if (e.target instanceof HTMLElement && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName) && e.target.type !== "range") return;
      if (e.code === "Space") { e.preventDefault(); setPaused((p) => !p); }
      if (e.key === "Escape") { engine?.select(null); setOptOpen(false); }
      if (e.key === "]") setSpeedIdx((i) => Math.min(SPEEDS.length - 1, i + 1));
      if (e.key === "[") setSpeedIdx((i) => Math.max(0, i - 1));
      if (e.key.toLowerCase() === "r") engine?.resetView();
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [engine]);

  return (
    <div className={"app " + (lang === "fa" ? "rtl" : "ltr")} dir={lang === "fa" ? "rtl" : "ltr"} data-lang={lang}>
      <div className="stage" ref={stage} />
      <div className="labels" ref={labelRef} dir={lang === "fa" ? "rtl" : "ltr"} />

      {ready && (
        <>
          <header className="topbar">
            <div className="brand">
              <svg viewBox="-20 -20 40 40" width="30" height="30" aria-hidden="true"><circle r="4.6" className="b-sun" /><circle r="10" className="b-o" /><circle r="16.5" className="b-o" /><circle cx="10" cy="0" r="1.9" className="b-p" /><circle cx="-11.7" cy="-11.7" r="1.7" className="b-p2" /></svg>
              <div><h1>{t.title}</h1><p>{t.tagline}</p></div>
            </div>
            <Search t={t} lang={lang} onSelect={select} />
            <div className="actions">
              <button type="button" className={"chip" + (listOpen ? " on" : "")} onClick={() => { setListOpen(!listOpen); setOptOpen(false); }}>{t.objects}</button>
              <button type="button" className={"chip" + (optOpen ? " on" : "")} onClick={() => { setOptOpen(!optOpen); setListOpen(false); }}>{t.options}</button>
              <button type="button" className="chip" onClick={() => setSrcOpen(true)}>{t.sources}</button>
              <button type="button" className="chip lang" onClick={() => setLang(lang === "fa" ? "en" : "fa")} lang={lang === "fa" ? "en" : "fa"}>{t.lang}</button>
            </div>
          </header>
          <ObjectList t={t} lang={lang} selectedId={selected} onSelect={select} open={listOpen} onClose={() => setListOpen(false)} />
          <Options t={t} layers={layers} setLayer={setLayer} mode={mode} setMode={setMode} open={optOpen} onClose={() => setOptOpen(false)}
            onReset={() => engine?.resetView()} onTop={() => engine?.topView()} />
          <InfoPanel id={selected} t={t} lang={lang} engine={engine} onClose={close} />
          <TimeBar t={t} lang={lang} bus={bus} engine={engine} speedIdx={speedIdx} setSpeedIdx={setSpeedIdx} paused={paused} setPaused={setPaused} reverse={reverse} setReverse={setReverse} />
          <Footer t={t} onSources={() => setSrcOpen(true)} />
          <SourcesDialog t={t} lang={lang} open={srcOpen} onClose={() => setSrcOpen(false)} />
        </>
      )}
      {!ready && !fail && <Loader t={t} progress={progress} />}
      {fail && <div className="loader"><h1>{t.title}</h1><p>WebGL: {fail}</p></div>}
    </div>
  );
}
