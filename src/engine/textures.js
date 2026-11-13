import * as THREE from "three";
import { makeNoise } from "./noise.js";

// Procedural planet surfaces. Real photographs can be dropped into /public/textures (see config.js).
const hex = (c) => {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
function ramp(stops) {
  const s = stops.map(([t, c]) => [t, hex(c)]);
  return (v) => {
    if (v <= s[0][0]) return s[0][1];
    for (let i = 1; i < s.length; i++) {
      if (v <= s[i][0]) {
        const [t0, c0] = s[i - 1], [t1, c1] = s[i];
        const k = (v - t0) / (t1 - t0 || 1);
        return [c0[0] + (c1[0] - c0[0]) * k, c0[1] + (c1[1] - c0[1]) * k, c0[2] + (c1[2] - c0[2]) * k];
      }
    }
    return s[s.length - 1][1];
  };
}

function canvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  return c;
}

// Fill an equirectangular canvas by sampling noise on the unit sphere (seamless).
function paint(w, h, fn) {
  const c = canvas(w, h);
  const ctx = c.getContext("2d");
  const img = ctx.createImageData(w, h);
  const d = img.data;
  for (let y = 0; y < h; y++) {
    const lat = (0.5 - (y + 0.5) / h) * Math.PI;
    const cl = Math.cos(lat), sl = Math.sin(lat);
    for (let x = 0; x < w; x++) {
      const lon = ((x + 0.5) / w) * Math.PI * 2;
      const px = cl * Math.cos(lon), py = sl, pz = cl * Math.sin(lon);
      const [r, g, b, a = 255] = fn(px, py, pz, lat, lon);
      const i = (y * w + x) * 4;
      d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = a;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

function craters(c, n, seed, strength = 1) {
  const ctx = c.getContext("2d");
  const { rnd } = makeNoise(seed);
  for (let i = 0; i < n; i++) {
    const x = rnd() * c.width, y = rnd() * c.height;
    const lat = Math.abs(y / c.height - 0.5) * 2;
    const stretch = 1 / Math.max(0.25, Math.cos(lat * Math.PI / 2));
    const r = (rnd() ** 2.6) * c.width * 0.028 + 1.5;
    for (const dx of [0, -c.width, c.width]) {
      ctx.save();
      ctx.translate(x + dx, y);
      ctx.scale(stretch, 1);
      const g = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r);
      g.addColorStop(0, `rgba(0,0,0,${0.32 * strength})`);
      g.addColorStop(0.78, `rgba(0,0,0,${0.12 * strength})`);
      g.addColorStop(0.9, `rgba(255,255,255,${0.2 * strength})`);
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }
}

const KINDS = {
  rock(o, W, H) {
    const N = makeNoise(o.seed);
    const col = ramp(o.ramp);
    const c = paint(W, H, (x, y, z) => {
      const v = N.fbm(x * o.scale, y * o.scale, z * o.scale, 6) * 0.75 + N.fbm(x * 9, y * 9, z * 9, 3) * 0.25;
      return col(Math.min(1, Math.max(0, (v - 0.2) * 1.7)));
    });
    craters(c, o.craters ?? 160, o.seed + 7, o.crater ?? 1);
    return c;
  },
  venus(o, W, H) {
    const N = makeNoise(o.seed);
    const col = ramp([[0, "#a8742d"], [0.5, "#d9b06a"], [1, "#f3dba0"]]);
    return paint(W, H, (x, y, z) => {
      const w = N.fbm(x * 2, y * 5, z * 2, 4);
      const v = N.fbm(x * 3 + w * 2, y * 7 + w, z * 3 + w * 2, 5);
      return col(Math.min(1, Math.max(0, (v - 0.25) * 2)));
    });
  },
  earth(o, W, H) {
    const N = makeNoise(o.seed);
    const ocean = ramp([[0, "#06203f"], [0.6, "#0b3d78"], [1, "#1c6aa6"]]);
    const land = ramp([[0, "#3d6b34"], [0.35, "#7a8a45"], [0.6, "#a08a58"], [0.85, "#7a6a50"], [1, "#e8e4da"]]);
    return paint(W, H, (x, y, z, lat) => {
      const h = N.fbm(x * 1.7 + 4, y * 1.7, z * 1.7, 6);
      const ice = Math.abs(y) > 0.86 + (N.noise(x * 6, y * 6, z * 6) - 0.5) * 0.08;
      if (ice) return [238, 244, 250];
      if (h > 0.56) {
        const dry = Math.min(1, Math.max(0, (Math.abs(y) < 0.45 ? N.fbm(x * 3, y * 3, z * 3, 4) - 0.28 : 0.2) * 2.2));
        const alt = (h - 0.56) * 3.2;
        const [r, g, b] = land(Math.min(1, alt * 0.6 + dry * 0.55));
        return [r, g, b];
      }
      return ocean((h - 0.2) / 0.32).map((v) => v);
    });
  },
  clouds(o, W, H) {
    const N = makeNoise(o.seed);
    return paint(W, H, (x, y, z) => {
      const w = N.fbm(x * 2.5, y * 4, z * 2.5, 3);
      const v = N.fbm(x * 3.2 + w, y * 6 + w * 2, z * 3.2 + w, 6);
      const a = Math.min(1, Math.max(0, (v - 0.5) * 4.2));
      return [255, 255, 255, a * 170];
    });
  },
  mars(o, W, H) {
    const N = makeNoise(o.seed);
    const col = ramp([[0, "#3a1a10"], [0.35, "#8a3f20"], [0.65, "#c0693a"], [1, "#e0a070"]]);
    const c = paint(W, H, (x, y, z) => {
      const v = N.fbm(x * 2.4, y * 2.4, z * 2.4, 6);
      const d = N.fbm(x * 7, y * 7, z * 7, 3);
      if (Math.abs(y) > 0.94 + (d - 0.5) * 0.05) return [244, 238, 235];
      return col(Math.min(1, Math.max(0, (v - 0.25) * 2.0)));
    });
    craters(c, 90, 42, 0.8);
    return c;
  },
  bands(o, W, H) {
    const N = makeNoise(o.seed);
    const col = ramp(o.ramp);
    const c = paint(W, H, (x, y, z, lat) => {
      const turb = N.fbm(x * 3, y * 9, z * 3, 5) - 0.5;
      const t = lat / (Math.PI / 2);
      const band = Math.sin((t + turb * o.turb) * o.freq) * 0.5 + 0.5;
      const fine = N.fbm(x * 8 + turb * 3, y * 40, z * 8 + turb * 3, 4);
      return col(Math.min(1, Math.max(0, band * 0.7 + fine * 0.3)));
    });
    if (o.spot) {
      const ctx = c.getContext("2d");
      const [sx, sy, rx, ry, color] = o.spot;
      const g = ctx.createRadialGradient(sx * W, sy * H, 0, sx * W, sy * H, rx * W);
      g.addColorStop(0, color); g.addColorStop(0.75, color.replace(/[\d.]+\)$/, "0.55)")); g.addColorStop(1, color.replace(/[\d.]+\)$/, "0)"));
      ctx.save(); ctx.translate(sx * W, sy * H); ctx.scale(1, ry / rx); ctx.translate(-sx * W, -sy * H);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx * W, sy * H, rx * W, 0, 7); ctx.fill(); ctx.restore();
    }
    return c;
  },
  ice(o, W, H) {
    const N = makeNoise(o.seed);
    const col = ramp(o.ramp);
    const c = paint(W, H, (x, y, z) => {
      const v = N.fbm(x * 3, y * 3, z * 3, 5);
      let cr = 0;
      if (o.cracks) {
        const a = Math.abs(N.fbm(x * 5, y * 5, z * 5, 3) - 0.5);
        cr = a < 0.014 ? 1 : 0;
      }
      const [r, g, b] = col(Math.min(1, Math.max(0, (v - 0.25) * 2)));
      return cr ? [r * 0.55 + 70, g * 0.45 + 20, b * 0.4 + 8] : [r, g, b];
    });
    if (o.craters) craters(c, o.craters, o.seed + 3, 0.7);
    return c;
  },
  io(o, W, H) {
    const N = makeNoise(o.seed);
    const col = ramp([[0, "#d8c24a"], [0.4, "#e8d56a"], [0.7, "#e9a23a"], [1, "#f1ead0"]]);
    return paint(W, H, (x, y, z) => {
      const v = N.fbm(x * 3, y * 3, z * 3, 5);
      const s = N.fbm(x * 10 + 9, y * 10, z * 10, 2);
      if (s > 0.68) return [40, 28, 20];
      if (s > 0.62) return [190, 70, 30];
      return col(Math.min(1, Math.max(0, (v - 0.2) * 1.9)));
    });
  },
  pluto(o, W, H) {
    const N = makeNoise(o.seed);
    const col = ramp([[0, "#5a3a2a"], [0.4, "#a3794f"], [0.7, "#cfb08a"], [1, "#efe3d0"]]);
    return paint(W, H, (x, y, z, lat, lon) => {
      const v = N.fbm(x * 3, y * 3, z * 3, 5);
      // Tombaugh Regio: a bright, heart-shaped plain
      const dl = Math.atan2(Math.sin(lon - 3.0), Math.cos(lon - 3.0));
      const dd = Math.hypot(dl * 1.2, lat - 0.35);
      if (dd < 0.38) return [244, 232, 218].map((q, i) => q - N.noise(x * 20, y * 20, z * 20) * 14 * (i + 1) * 0.3);
      return col(Math.min(1, Math.max(0, (v - 0.2) * 1.9)));
    });
  },
  sun(o, W, H) {
    const N = makeNoise(o.seed);
    const col = ramp([[0, "#c43a00"], [0.35, "#ff7a0f"], [0.7, "#ffb62e"], [1, "#fff0b0"]]);
    return paint(W, H, (x, y, z) => {
      const g = N.fbm(x * 8, y * 8, z * 8, 5);
      const c = N.fbm(x * 22 + g, y * 22, z * 22, 3);
      const spot = N.fbm(x * 3 + 20, y * 3, z * 3, 3) > 0.7 && Math.abs(y) < 0.4 ? 0.25 : 1;
      return col(Math.min(1, Math.max(0, (g * 0.65 + c * 0.45 - 0.1) * spot * 1.25)));
    });
  },
  haze(o, W, H) {
    const N = makeNoise(o.seed);
    const col = ramp(o.ramp);
    return paint(W, H, (x, y, z) => col(Math.min(1, Math.max(0, N.fbm(x * 2, y * 4, z * 2, 4) * 1.4 - 0.1))));
  },
};

export function makeSurface(def, quality = 1) {
  const W = Math.round((def.w ?? 1024) * quality), H = Math.round(W / 2);
  const o = { seed: 1, scale: 2.4, ...def };
  const fn = KINDS[def.kind] || KINDS.rock;
  const cv = fn(o, W, H);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  t.wrapS = THREE.RepeatWrapping;
  return t;
}

// Saturn / Uranus / Neptune style ring: radial strip texture (u = distance from inner edge)
export function makeRingTexture(kind = "saturn") {
  const W = 1024, H = 4;
  const c = canvas(W, H);
  const ctx = c.getContext("2d");
  const { rnd } = makeNoise(11);
  for (let x = 0; x < W; x++) {
    const t = x / W;
    let a, v;
    if (kind === "saturn") {
      // C ring (faint), B ring (dense), Cassini division, A ring, Encke gap
      if (t < 0.18) { a = 0.12 + t * 0.9; v = 0.55; }
      else if (t < 0.55) { a = 0.78 + rnd() * 0.18; v = 0.88; }
      else if (t < 0.62) { a = 0.07; v = 0.6; }
      else if (t < 0.97) { a = 0.55 + rnd() * 0.18; v = 0.78; if (t > 0.9 && t < 0.915) a = 0.1; }
      else a = 0;
      a *= 0.75 + 0.25 * Math.sin(x * 0.9) * Math.sin(x * 0.17);
    } else { a = 0.18 + rnd() * 0.1; v = 0.7; if (t < 0.2 || t > 0.9) a *= 0.2; }
    const g = Math.round(200 * v + 40);
    ctx.fillStyle = `rgba(${g},${Math.round(g * 0.93)},${Math.round(g * 0.8)},${Math.max(0, a)})`;
    ctx.fillRect(x, 0, 1, H);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function makeGlowTexture(inner = "255,200,120") {
  const c = canvas(256, 256);
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, `rgba(${inner},1)`);
  g.addColorStop(0.18, `rgba(${inner},0.55)`);
  g.addColorStop(0.45, `rgba(${inner},0.14)`);
  g.addColorStop(1, `rgba(${inner},0)`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

// Milky Way painted in ecliptic-aligned sky coordinates. `gal` maps scene direction -> {sinB, lonFactor}
export function makeSkyTexture(galNorth, galCenter) {
  const W = 1024, H = 512;
  const N = makeNoise(77);
  const c = paint(W, H, (x, y, z, lat, lon) => {
    // direction used by three's SphereGeometry: x = -cos(phi)sin(theta) ... we only need consistency with the mesh uv.
    const dx = -x, dy = y, dz = z;
    const sinB = dx * galNorth.x + dy * galNorth.y + dz * galNorth.z;
    const b = Math.asin(Math.max(-1, Math.min(1, sinB)));
    const cx = dx * galCenter.x + dy * galCenter.y + dz * galCenter.z;
    const core = Math.max(0, cx);
    const band = Math.exp(-((b / 0.2) ** 2));
    const dust = N.fbm(x * 6, y * 12, z * 6, 5);
    const cloud = N.fbm(x * 14, y * 14, z * 14, 4);
    let v = band * (0.18 + 0.5 * dust + 0.22 * cloud) * (0.6 + 0.9 * core ** 2);
    v *= dust < 0.37 ? 0.45 : 1;
    v += Math.exp(-((b / 0.45) ** 2)) * 0.02;
    const k = Math.min(1, v);
    return [Math.round(6 + k * 90), Math.round(8 + k * 82), Math.round(16 + k * 84)];
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
