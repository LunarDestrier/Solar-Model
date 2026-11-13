import { useEffect, useState } from "react";
import { dateFromJd, jdFromDate } from "../engine/orbits.js";
import { makeFmt } from "../i18n.js";

const Y0 = 1900, Y1 = 2100, STEPS = 20000;
const jdOfYear = (y) => jdFromDate(new Date(Date.UTC(Math.floor(y), 0, 1))) + (y - Math.floor(y)) * 365.25;
export const SPEEDS = [1 / 24, 1, 7, 30.4375, 365.25, 3652.5];

function yearOf(jd) { const d = dateFromJd(jd); return d.getUTCFullYear() + (d.getUTCMonth() * 31 + d.getUTCDate()) / 372; }

export default function TimeBar({ t, lang, bus, engine, speedIdx, setSpeedIdx, paused, setPaused, reverse, setReverse }) {
  const [jd, setJd] = useState(() => engine?.jd ?? Date.now() / 86400000 + 2440587.5);
  useEffect(() => bus.on(setJd), [bus]);
  const { loc } = makeFmt(lang);
  const date = dateFromJd(jd);
  const fa = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }).format(date);
  const en = new Intl.DateTimeFormat("en-GB", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }).format(date);
  const main = lang === "fa" ? fa : en, alt = lang === "fa" ? en : fa;
  const altLabel = lang === "fa" ? t.gregorian : t.jalali;
  const y = Math.min(Y1, Math.max(Y0, yearOf(jd)));
  const val = Math.round(((y - Y0) / (Y1 - Y0)) * STEPS);
  const iso = date.toISOString().slice(0, 10);

  const setYear = (v) => engine?.setTime(jdOfYear(Y0 + (v / STEPS) * (Y1 - Y0)));
  const decades = Array.from({ length: 21 }, (_, i) => Y0 + i * 10);

  return (
    <section className="timebar" aria-label={t.speedLabel}>
      <div className="tb-top">
        <div className="tb-date">
          <strong>{main}</strong>
          <small>{altLabel}: {alt}</small>
        </div>
        <div className="tb-ctrl">
          <button type="button" className="ic" onClick={() => setReverse(!reverse)} aria-pressed={reverse} title={t.reverse}>
            <svg viewBox="0 0 24 24" width="18" height="18" style={{ transform: reverse ? "none" : "scaleX(-1)" }}><path fill="currentColor" d="M11 6v12l-8.5-6L11 6zm9.5 0v12L12 12l8.5-6z" /></svg>
          </button>
          <button type="button" className="ic play" onClick={() => setPaused(!paused)} title={paused ? t.play : t.pause} aria-label={paused ? t.play : t.pause}>
            {paused
              ? <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M8 5v14l11-7z" /></svg>
              : <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M6 5h4v14H6zm8 0h4v14h-4z" /></svg>}
          </button>
          <div className="seg" role="group" aria-label={t.speedLabel}>
            {t.speeds.map((s, i) => (
              <button type="button" key={i} className={i === speedIdx ? "on" : ""} onClick={() => { setSpeedIdx(i); setPaused(false); }}>{s}</button>
            ))}
          </div>
          <input className="dateinput" type="date" value={iso} min="1900-01-01" max="2100-12-31" aria-label={t.date}
            onChange={(e) => { const v = e.target.valueAsDate; if (v) engine?.setTime(jdFromDate(v)); }} />
          <button type="button" className="chip" onClick={() => engine?.setTime(Date.now() / 86400000 + 2440587.5)}>{t.now}</button>
        </div>
      </div>
      <div className="ruler">
        <div className="ruler-scale" dir="ltr" aria-hidden="true">
          {decades.map((d) => (
            <span key={d} className={d % 50 === 0 ? "major" : ""} style={{ left: ((d - Y0) / (Y1 - Y0)) * 100 + "%" }}>
              {d % 50 === 0 ? new Intl.NumberFormat(loc, { useGrouping: false }).format(d) : ""}
            </span>
          ))}
        </div>
        <input dir="ltr" type="range" min="0" max={STEPS} value={val} onChange={(e) => setYear(Number(e.target.value))} aria-label={t.date} />
      </div>
    </section>
  );
}
