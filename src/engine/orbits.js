export const J2000 = 2451545.0;
export const AU_KM = 149597870.7;
export const D2R = Math.PI / 180;

export function jdFromDate(date) { return date.getTime() / 86400000 + 2440587.5; }
export function dateFromJd(jd) { return new Date((jd - 2440587.5) * 86400000); }

export function solveKepler(M, e) {
  M = ((M % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  let E = e < 0.8 ? M : Math.PI;
  for (let i = 0; i < 30; i++) {
    const d = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= d;
    if (Math.abs(d) < 1e-10) break;
  }
  return E;
}

// JPL "Approximate Positions of the Planets" style elements -> normalised
export function planetEl(a, e, i, L, w, O, Pyears) {
  return { a, e, i, O, omega: w - O, M0: L - w, P: Pyears * 365.25 };
}
export function periEl(a, e, i, O, omega, TpJd, Pyears) {
  const P = Pyears * 365.25;
  return { a, e, i, O, omega, M0: (360 * (J2000 - TpJd)) / P, P };
}

// ecliptic heliocentric position, AU, z = north
export function helioPos(el, jd, out = [0, 0, 0]) {
  const M = (el.M0 + (360 * (jd - J2000)) / el.P) * D2R;
  const E = solveKepler(M, el.e);
  const xp = el.a * (Math.cos(E) - el.e);
  const yp = el.a * Math.sqrt(1 - el.e * el.e) * Math.sin(E);
  return rotate(el, xp, yp, out);
}
function rotate(el, xp, yp, out) {
  const w = el.omega * D2R, O = el.O * D2R, I = el.i * D2R;
  const cw = Math.cos(w), sw = Math.sin(w), cO = Math.cos(O), sO = Math.sin(O), cI = Math.cos(I), sI = Math.sin(I);
  out[0] = (cw * cO - sw * sO * cI) * xp + (-sw * cO - cw * sO * cI) * yp;
  out[1] = (cw * sO + sw * cO * cI) * xp + (-sw * sO + cw * cO * cI) * yp;
  out[2] = sw * sI * xp + cw * sI * yp;
  return out;
}
export function orbitSamples(el, n = 360) {
  const pts = [];
  for (let k = 0; k <= n; k++) {
    const E = (k / n) * Math.PI * 2;
    const xp = el.a * (Math.cos(E) - el.e);
    const yp = el.a * Math.sqrt(1 - el.e * el.e) * Math.sin(E);
    pts.push(rotate(el, xp, yp, [0, 0, 0]));
  }
  return pts;
}
export function speedKms(el, jd) {
  // vis-viva, a in AU -> km/s
  const [x, y, z] = helioPos(el, jd);
  const r = Math.hypot(x, y, z);
  const mu = 1.32712440018e11; // km^3/s^2
  return Math.sqrt(mu * (2 / (r * AU_KM) - 1 / (el.a * AU_KM)));
}
// ecliptic (x,y,z north) -> three scene (x, up, -y)
export const toScene = (p) => [p[0], p[2], -p[1]];

export function radecToScene(raH, decDeg, r = 1) {
  const a = raH * 15 * D2R, d = decDeg * D2R, eps = 23.4393 * D2R;
  const x = Math.cos(d) * Math.cos(a), y = Math.cos(d) * Math.sin(a), z = Math.sin(d);
  const xe = x, ye = y * Math.cos(eps) + z * Math.sin(eps), ze = -y * Math.sin(eps) + z * Math.cos(eps);
  return [xe * r, ze * r, -ye * r];
}
