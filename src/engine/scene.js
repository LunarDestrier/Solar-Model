import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { SUN, PLANETS, DWARFS, MOONS, COMETS, BELTS, CRAFT } from "../data/bodies.js";
import { STARS } from "../data/stars.js";
import { makeSurface, makeRingTexture, makeGlowTexture, makeSkyTexture } from "./textures.js";
import { helioPos, orbitSamples, toScene, radecToScene, AU_KM, D2R, J2000, solveKepler, speedKms } from "./orbits.js";
import { buildModel } from "./models.js";
import { USE_LOCAL_TEXTURES, TEXTURE_DIR } from "../config.js";

const KU = 14; // scene units per AU at the Earth (stylised) and for linear/true modes
const TRUE_ALT = { iss: 1.064, tiangong: 1.061, hubble: 1.084, chandra: 11.5 };
const LAYER_OF = { moon: "moons", dwarf: "dwarfs", belt: "belts", comet: "comets", craft: "craft", skystar: "stars" };
const PRIORITY = { sun: 90, planet: 80, dwarf: 60, craft: 50, comet: 50, belt: 40, skystar: 30, moon: 20 };
const V = THREE.Vector3;

const glowVS = `
#include <common>
#include <logdepthbuf_pars_vertex>
varying vec3 vN; varying vec3 vV;
void main(){ vN = normalize(normalMatrix*normal); vec4 mv = modelViewMatrix*vec4(position,1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv;
#include <logdepthbuf_vertex>
}`;
const glowFS = `
#include <common>
#include <logdepthbuf_pars_fragment>
uniform vec3 uColor; uniform float uPower; varying vec3 vN; varying vec3 vV;
void main(){
#include <logdepthbuf_fragment>
 float f = pow(clamp(1.0 - dot(normalize(vN), normalize(vV)), 0.0, 1.0), uPower);
 gl_FragColor = vec4(uColor, 1.0) * f * 1.3; }`;

export class SolarEngine {
  constructor(container, labelLayer, cb = {}) {
    this.container = container;
    this.labelLayer = labelLayer;
    this.cb = cb;
    this.lang = "fa";
    this.layers = { orbits: true, labels: true, moons: true, dwarfs: true, belts: true, comets: true, craft: true, stars: true, milkyway: true, grid: false, bloom: true };
    this.mode = "stylized";
    this.speed = 1; this.paused = false;
    this.jd = Date.now() / 86400000 + 2440587.5;
    this.spinDays = 0;
    this.objs = new Map();
    this.order = [];
    this.selectedId = null; this.hoverId = null; this.focusId = null;
    this.trans = null;
    this.lastTick = 0;
    this.disposed = false;
    this._v = new V(); this._v2 = new V();
  }

  /* ----------------------------------------------------------------- setup */
  async init(onProgress = () => {}) {
    const w = this.container.clientWidth || 1200, h = this.container.clientHeight || 700;
    const renderer = (this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance", logarithmicDepthBuffer: true }));
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h);
    renderer.setClearColor(0x03040a, 1);
    this.container.appendChild(renderer.domElement);
    renderer.domElement.className = "solar-canvas";

    const scene = (this.scene = new THREE.Scene());
    const camera = (this.camera = new THREE.PerspectiveCamera(48, w / h, 0.01, 30000));
    camera.position.set(0, 120, 230);
    const controls = (this.controls = new OrbitControls(camera, renderer.domElement));
    controls.enableDamping = true; controls.dampingFactor = 0.07;
    controls.minDistance = 2; controls.maxDistance = 4000;
    controls.autoRotate = true; controls.autoRotateSpeed = 0.35;
    controls.zoomSpeed = 1.1;
    controls.addEventListener("start", () => { controls.autoRotate = false; this.userMoved = true; });
    controls.target.set(0, 0, 0);

    // postprocessing
    const rt = new THREE.WebGLRenderTarget(w, h, { samples: 4, type: THREE.HalfFloatType });
    const composer = (this.composer = new EffectComposer(renderer, rt));
    composer.addPass(new RenderPass(scene, camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0.55, 0.7, 0.9);
    composer.addPass(this.bloom);
    composer.addPass(new OutputPass());

    scene.add(new THREE.AmbientLight(0x8890b0, 0.35));
    const sunLight = (this.sunLight = new THREE.PointLight(0xfff2dc, 3.2, 0, 0));
    scene.add(sunLight);

    this.sphereGeo = new THREE.SphereGeometry(1, 72, 48);
    this.glowTex = makeGlowTexture();
    this.sysGroup = new THREE.Group(); scene.add(this.sysGroup);

    await this.buildSky(onProgress);
    await this.buildBodies(onProgress);
    this.buildBelts();
    this.buildStarsSky();
    this.buildGrid();
    this.buildReticle();
    this.applyScale();
    this.setLang(this.lang);
    this.applyLayers();

    // events
    this._onResize = () => this.resize();
    window.addEventListener("resize", this._onResize);
    this.ro = new ResizeObserver(this._onResize); this.ro.observe(this.container);
    const el = renderer.domElement;
    el.addEventListener("pointerdown", (e) => { this.down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
    el.addEventListener("pointerup", (e) => {
      if (!this.down) return;
      const moved = Math.hypot(e.clientX - this.down.x, e.clientY - this.down.y);
      this.down = null;
      if (moved < 6) {
        const r = el.getBoundingClientRect();
        const id = this.pick(e.clientX - r.left, e.clientY - r.top);
        if (id) this.select(id); else if (this.selectedId) this.select(null);
      }
    });
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      const id = this.pick(e.clientX - r.left, e.clientY - r.top);
      if (id !== this.hoverId) {
        this.hoverId = id;
        el.style.cursor = id ? "pointer" : "grab";
      }
    });
    el.addEventListener("dblclick", (e) => {
      const r = el.getBoundingClientRect();
      const id = this.pick(e.clientX - r.left, e.clientY - r.top);
      if (id) this.focus(id);
    });

    this.clock = new THREE.Clock();
    this.loop = this.loop.bind(this);
    renderer.setAnimationLoop(this.loop);
    this.ready = true;
  }

  async buildSky(onProgress) {
    const ngp = new V(...radecToScene(12.8573, 27.1283, 1)).normalize();
    const gc = new V(...radecToScene(17.7611, -28.9362, 1)).normalize();
    const tex = makeSkyTexture(ngp, gc);
    const sky = (this.sky = new THREE.Mesh(new THREE.SphereGeometry(4500, 64, 32),
      new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, depthWrite: false, toneMapped: false })));
    sky.renderOrder = -10;
    this.scene.add(sky);
    // field stars
    const n = 9000, pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, s = Math.sqrt(1 - u * u);
      pos.set([Math.cos(a) * s * 4300, u * 4300, Math.sin(a) * s * 4300], i * 3);
      const t = Math.random(), b = 0.35 + Math.pow(Math.random(), 3) * 0.65;
      col.set([b * (0.8 + 0.2 * t), b * 0.9, b * (1 - 0.25 * t)], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    this.fieldStars = new THREE.Points(g, new THREE.PointsMaterial({ size: 1.6, sizeAttenuation: false, vertexColors: true, depthWrite: false, transparent: true, opacity: 0.95 }));
    this.scene.add(this.fieldStars);
    await new Promise((r) => setTimeout(r));
  }

  async getTexture(def, id, w) {
    if (USE_LOCAL_TEXTURES) {
      try {
        const t = await new THREE.TextureLoader().loadAsync(`${TEXTURE_DIR}/${id}.jpg`);
        t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
      } catch { /* fall back to procedural */ }
    }
    return makeSurface({ w, ...def });
  }

  register(obj) {
    this.objs.set(obj.id, obj);
    this.order.push(obj);
    const el = document.createElement("button");
    el.type = "button"; el.className = `lbl t-${obj.type}`;
    el.innerHTML = `<i style="--c:${obj.data.color || "#fff"}"></i><span></span>`;
    el.addEventListener("click", (e) => { e.stopPropagation(); this.select(obj.id); });
    el.addEventListener("pointerenter", () => { this.hoverId = obj.id; });
    el.addEventListener("pointerleave", () => { if (this.hoverId === obj.id) this.hoverId = null; });
    this.labelLayer.appendChild(el);
    obj.label = el; obj.txt = el.querySelector("span");
    obj.world = new V(); obj.real = new V(); // real = AU (scene axes)
    obj.sp = { x: 0, y: 0, r: 0, on: false };
  }

  async buildBodies(onProgress) {
    const all = [SUN, ...PLANETS, ...DWARFS, ...MOONS, ...COMETS];
    let done = 0;
    const total = all.length;
    const spin = (r) => new Promise((res) => setTimeout(res, 0)).then(() => r);
    const mk = async (d) => {
      const isMoon = d.parent && !d.type;
      const type = d.type || "moon";
      const node = new THREE.Group();
      const tilt = new THREE.Group(); node.add(tilt);
      const spinG = new THREE.Group(); tilt.add(spinG);
      const w = type === "star" ? 1024 : type === "planet" ? 1024 : type === "moon" ? 384 : 512;
      const map = await this.getTexture(d.tex, d.id, w);
      const mat = type === "star"
        ? new THREE.MeshBasicMaterial({ map, toneMapped: false, color: 0xffffff })
        : new THREE.MeshStandardMaterial({ map, roughness: 1, metalness: 0 });
      if (type === "star") mat.color.setScalar(1.6);
      const mesh = new THREE.Mesh(this.sphereGeo, mat); spinG.add(mesh);
      const obj = { id: d.id, type, data: d, node, tilt, spinG, mesh, parent: d.parent || null, visR: 1, children: [] };
      if (type === "star") {
        const g1 = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, color: 0xffb04a, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.85 }));
        const g2 = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, color: 0xff7a22, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.35 }));
        node.add(g1, g2); obj.glows = [g1, g2];
      }
      if (d.atmo) {
        const c = d.atmo.color.split(",").map((x) => Number(x) / 255);
        const m = new THREE.ShaderMaterial({ vertexShader: glowVS, fragmentShader: glowFS, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, uniforms: { uColor: { value: new THREE.Color(...c) }, uPower: { value: d.atmo.power } } });
        obj.atmo = new THREE.Mesh(this.sphereGeo, m); node.add(obj.atmo);
      }
      if (d.clouds) {
        const ct = await this.getTexture({ kind: "clouds", seed: 9, w: 1024 }, d.id + "_clouds", 1024);
        obj.clouds = new THREE.Mesh(this.sphereGeo, new THREE.MeshStandardMaterial({ map: ct, transparent: true, depthWrite: false, roughness: 1 }));
        spinG.add(obj.clouds);
      }
      if (d.ring) {
        const rg = new THREE.RingGeometry(d.ring.in, d.ring.out, 160, 1);
        const p = rg.attributes.position, uv = rg.attributes.uv;
        for (let i = 0; i < p.count; i++) uv.setXY(i, (Math.hypot(p.getX(i), p.getY(i)) - d.ring.in) / (d.ring.out - d.ring.in), 0.5);
        rg.rotateX(-Math.PI / 2);
        const rm = new THREE.MeshStandardMaterial({ map: makeRingTexture(d.ring.tex || "uranus"), transparent: true, side: THREE.DoubleSide, roughness: 1, depthWrite: false, opacity: d.ring.opacity });
        obj.ring = new THREE.Mesh(rg, rm); tilt.add(obj.ring);
      }
      if (type === "comet") {
        const n = 160, pos = new Float32Array(n * 3), g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
        obj.tail = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.5, color: 0x9fd8ff, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
        obj.tail.frustumCulled = false; this.sysGroup.add(obj.tail);
        const cs = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, color: 0xaee0ff, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.9 }));
        cs.scale.setScalar(1.4); node.add(cs); obj.coma = cs;
      }
      this.register(obj);
      done++; onProgress(done / total, d.name);
      await spin();
      return obj;
    };

    const sun = await mk(SUN); this.sysGroup.add(sun.node);
    for (const d of [...PLANETS, ...DWARFS, ...COMETS]) {
      const o = await mk(d); this.sysGroup.add(o.node);
      if (d.orbit) {
        o.line = this.makeLine(d.color, 0.55); this.sysGroup.add(o.line);
      }
    }
    for (const d of MOONS) {
      const o = await mk(d);
      const par = this.objs.get(d.parent);
      const frame = d.frame === "ecliptic" ? par.node : par.tilt;
      frame.add(o.node); o.frame = frame; par.children.push(o);
      o.phase = (hashStr(d.id) % 628) / 100;
      o.line = this.makeLine(d.color, 0.28, true); frame.add(o.line);
    }
    // spacecraft
    for (const d of CRAFT) {
      const node = new THREE.Group();
      const model = buildModel(d.model || "plain"); node.add(model);
      const marker = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, color: new THREE.Color(d.color), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, sizeAttenuation: false }));
      marker.scale.setScalar(0.022); node.add(marker);
      const obj = { id: d.id, type: "craft", data: d, node, model, marker, parent: d.parent || null, visR: 0.1, children: [], phase: d.phase ?? hashStr(d.id) % 6 };
      this.register(obj);
      if (d.mode === "leo") { const par = this.objs.get("earth"); par.node.add(node); obj.frame = par.node; obj.line = this.makeLine(d.color, 0.3, true); par.node.add(obj.line); }
      else { this.sysGroup.add(node); obj.line = this.makeLine(d.color, d.mode === "escape" ? 0.12 : 0.35, true); this.sysGroup.add(obj.line); }
      if (d.mode === "escape") { const [x, y, z] = radecToScene(d.raH, d.dec, 1); obj.dir = new V(x, y, z).normalize(); }
      onProgress(1, d.name);
    }
    // belts
    for (const d of BELTS) {
      const node = new THREE.Object3D();
      const obj = { id: d.id, type: "belt", data: d, node, visR: 8, children: [] };
      this.sysGroup.add(node); this.register(obj);
    }
    this.sunObj = sun;
  }

  makeLine(color, opacity, dashed = false) {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(3 * 361), 3));
    const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: new THREE.Color(color), transparent: true, opacity, depthWrite: false }));
    l.frustumCulled = false; l.userData.base = opacity;
    return l;
  }
  setLine(line, pts) {
    const a = line.geometry.attributes.position;
    if (a.count !== pts.length) line.geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(pts.length * 3), 3));
    const arr = line.geometry.attributes.position.array;
    pts.forEach((p, i) => { arr[i * 3] = p[0]; arr[i * 3 + 1] = p[1]; arr[i * 3 + 2] = p[2]; });
    line.geometry.attributes.position.needsUpdate = true;
    line.geometry.setDrawRange(0, pts.length);
  }

  buildBelts() {
    const mkPoints = (n, fn, color, size, opacity) => {
      const pos = new Float32Array(n * 3), g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      const pts = new THREE.Points(g, new THREE.PointsMaterial({ size, color, transparent: true, opacity, depthWrite: false, sizeAttenuation: true }));
      pts.frustumCulled = false;
      const data = Array.from({ length: n }, fn);
      return { pts, data, pos };
    };
    const rnd = Math.random;
    const gauss = () => (rnd() + rnd() + rnd() - 1.5) / 1.5;
    // main belt: avoid Kirkwood gaps (2.5, 2.82, 2.95 AU)
    this.mainBelt = mkPoints(7000, () => {
      let a; do { a = 2.1 + rnd() * 1.2 + gauss() * 0.15; } while ([2.5, 2.82, 2.95].some((g) => Math.abs(a - g) < 0.025));
      return { a, e: rnd() * 0.2, th: rnd() * 6.283, inc: gauss() * 0.16, n: 360 / (Math.pow(a, 1.5) * 365.25), M: rnd() * 6.283 };
    }, 0xc9b896, 0.1, 0.8);
    this.sysGroup.add(this.mainBelt.pts);
    this.kuiper = mkPoints(6000, () => {
      const a = 39 + rnd() * 9 + (rnd() < 0.1 ? rnd() * 20 : 0);
      return { a, e: rnd() * 0.12, th: rnd() * 6.283, inc: gauss() * 0.3, n: 0, M: 0 };
    }, 0x8fb4d8, 0.35, 0.6);
    this.sysGroup.add(this.kuiper.pts);
    this.beltPlace = {};
  }

  updateBelts() {
    const f = (a) => this.distVis(a);
    const mb = this.mainBelt;
    const d = this.jd - J2000;
    for (let i = 0; i < mb.data.length; i++) {
      const b = mb.data[i];
      const ang = b.th + b.n * d * D2R;
      const r = f(b.a * (1 - b.e * Math.cos(b.M + ang)));
      mb.pos[i * 3] = Math.cos(ang) * r; mb.pos[i * 3 + 2] = -Math.sin(ang) * r; mb.pos[i * 3 + 1] = Math.sin(ang * 1.3 + b.M) * b.inc * r * 0.28;
    }
    mb.pts.geometry.attributes.position.needsUpdate = true;
    this.kuiper.pts.rotation.y = (2 * Math.PI * d) / (282 * 365.25);
  }
  placeKuiper() {
    const k = this.kuiper;
    for (let i = 0; i < k.data.length; i++) {
      const b = k.data[i], r = this.distVis(b.a * (1 - b.e * Math.cos(b.M)));
      k.pos[i * 3] = Math.cos(b.th) * r; k.pos[i * 3 + 2] = -Math.sin(b.th) * r; k.pos[i * 3 + 1] = b.inc * r * 0.2 * Math.sin(b.th * 2.1 + 1);
    }
    k.pts.geometry.attributes.position.needsUpdate = true;
  }

  buildStarsSky() {
    this.starGroup = new THREE.Group(); this.scene.add(this.starGroup);
    for (const s of STARS) {
      const [x, y, z] = radecToScene(s.ra, s.dec, 4000);
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, color: new THREE.Color(s.c), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, sizeAttenuation: false }));
      const m = Math.max(-1.5, Math.min(4, s.mag));
      sp.scale.setScalar(0.02 + (4 - m) * 0.006); sp.position.set(x, y, z);
      this.starGroup.add(sp);
      const data = { ...s, type: "skystar", color: s.c, isSky: true };
      const obj = { id: "star-" + s.id, type: "skystar", data, node: sp, visR: 0, children: [], sky: true };
      this.register(obj);
    }
  }

  buildGrid() {
    this.grid = new THREE.Group(); this.sysGroup.add(this.grid);
    this.gridRings = [];
    for (const au of [1, 2, 5, 10, 20, 30, 40, 50, 70]) {
      const line = this.makeLine("#7da4d8", 0.14);
      this.grid.add(line);
      const el = document.createElement("span"); el.className = "lbl-grid"; this.labelLayer.appendChild(el);
      this.gridRings.push({ au, line, el, w: new V() });
    }
  }
  updateGrid() {
    for (const g of this.gridRings) {
      const r = this.distVis(g.au), pts = [];
      for (let k = 0; k <= 180; k++) { const a = (k / 180) * Math.PI * 2; pts.push([Math.cos(a) * r, 0, Math.sin(a) * r]); }
      this.setLine(g.line, pts);
      g.w.set(r * 0.7071, 0, r * 0.7071);
    }
  }

  buildReticle() {
    const el = document.createElement("div"); el.className = "reticle";
    el.innerHTML = "<b></b><b></b><b></b><b></b>"; this.labelLayer.appendChild(el); this.reticle = el;
  }

  /* ------------------------------------------------------------ scale modes */
  distVis(aAU) {
    if (this.mode === "stylized") return KU * Math.pow(Math.max(aAU, 1e-6), 0.55);
    return KU * aAU;
  }
  visFromReal(v, out) {
    const r = v.length();
    if (r < 1e-9) return out.set(0, 0, 0);
    return out.copy(v).multiplyScalar(this.distVis(r) / r);
  }
  radiusVis(o) {
    const d = o.data, R = d.R;
    if (o.type === "star") return this.mode === "true" ? Math.max(695700 / AU_KM * KU, 0.07) : this.mode === "linear" ? 3.4 : 4;
    if (this.mode === "true") return Math.max(R / AU_KM * KU, 0.0004);
    return Math.max(0.5 * Math.pow(R / 6371, 0.45), 0.05);
  }
  moonOrbitR(o) {
    const par = this.objs.get(o.parent), d = o.data;
    if (this.mode === "true") return d.a / AU_KM * KU;
    return par.visR * (Math.pow(d.a / par.data.R, 0.55) + 0.7);
  }
  craftScale(o) {
    return this.mode === "true" ? 0.0006 : o.data.mode === "escape" ? 0.22 : 0.075;
  }

  applyScale() {
    const parentsFirst = this.order.filter((o) => o.type !== "moon");
    for (const o of this.order) {
      if (o.type === "belt" || o.sky) continue;
      if (o.type === "craft") {
        const s = this.craftScale(o); o.model.scale.setScalar(s); o.visR = s * 0.9; continue;
      }
    }
    for (const o of parentsFirst) {
      if (o.type === "belt" || o.sky || o.type === "craft") continue;
      o.visR = this.radiusVis(o);
      const st = o.data.stretch || [1, 1, 1];
      o.spinG.scale.set(o.visR * st[0], o.visR * st[1], o.visR * st[2]);
      if (o.atmo) o.atmo.scale.setScalar(o.visR * o.data.atmo.k);
      if (o.ring) o.ring.scale.setScalar(o.visR);
      if (o.clouds) o.clouds.scale.setScalar(1.012);
      if (o.glows) { const base = this.mode === "true" ? Math.max(o.visR * 14, 1.6) : o.visR; o.glows[0].scale.setScalar(base * 6.5); o.glows[1].scale.setScalar(base * 16); }
      if (o.coma) o.coma.scale.setScalar(this.mode === "true" ? 0.05 : 1.4);
    }
    for (const o of this.order.filter((o) => o.type === "moon")) {
      o.visR = this.radiusVis(o);
      const st = o.data.stretch || [1, 1, 1];
      o.spinG.scale.set(o.visR * st[0], o.visR * st[1], o.visR * st[2]);
      if (o.atmo) o.atmo.scale.setScalar(o.visR * o.data.atmo.k);
      o.orbitR = this.moonOrbitR(o);
      const pts = [], inc = (o.data.incl || 0) * D2R;
      for (let k = 0; k <= 180; k++) {
        const a = (k / 180) * Math.PI * 2, x = Math.cos(a) * o.orbitR, z = -Math.sin(a) * o.orbitR;
        pts.push([x, z * Math.sin(inc), z * Math.cos(inc)]);
      }
      this.setLine(o.line, pts);
    }
    // heliocentric orbit lines
    for (const o of this.order) {
      if (o.data.orbit && o.line) {
        this.setLine(o.line, orbitSamples(o.data.orbit, 360).map((p) => {
          const s = toScene(p); const v = this.visFromReal(this._v.set(...s), this._v2); return [v.x, v.y, v.z];
        }));
      }
    }
    // spacecraft orbit lines
    for (const o of this.order) if (o.type === "craft") this.craftLine(o);
    this.placeKuiper(); this.updateGrid();
    // belt label anchors
    for (const b of BELTS) {
      const o = this.objs.get(b.id), r = this.distVis(b.labelA);
      o.node.position.set(Math.cos(0.9) * r, 0, -Math.sin(0.9) * r); o.visR = this.mode === "true" ? 1 : 5;
    }
    if (this.selectedId && this.focusId) this.focus(this.focusId, true);
  }

  craftLine(o) {
    const d = o.data; let pts = [];
    if (d.mode === "leo") {
      const par = this.objs.get("earth"), r = this.craftOrbitR(o, par), inc = d.incl * D2R;
      for (let k = 0; k <= 120; k++) { const a = (k / 120) * Math.PI * 2; const x = Math.cos(a) * r, z = -Math.sin(a) * r; pts.push([x, z * Math.sin(inc), z * Math.cos(inc)]); }
    } else if (d.mode === "lagrange") {
      pts = [[0, 0, 0], [0, 0, 0]];
    } else if (d.mode === "ellipse") {
      const { a, e } = this.parkerEl();
      for (let k = 0; k <= 180; k++) { const E = (k / 180) * Math.PI * 2; const x = a * (Math.cos(E) - e), y = a * Math.sqrt(1 - e * e) * Math.sin(E); const inc = d.incl * D2R; pts.push([x, y * Math.sin(inc), -y * Math.cos(inc)]); }
    } else pts = [[0, 0, 0], [0, 0, 0]];
    this.setLine(o.line, pts);
  }
  craftOrbitR(o, par) {
    if (this.mode === "true") return par.visR * TRUE_ALT[o.id];
    return par.visR * o.data.altR;
  }
  parkerEl() {
    const d = this.objs.get("parker").data;
    const peri = this.mode === "true" ? 0.046 * KU : d.visPeri, apo = this.mode === "true" ? 0.73 * KU : d.visApo;
    return { a: (peri + apo) / 2, e: (apo - peri) / (apo + peri) };
  }

  /* ------------------------------------------------------------- public API */
  setLang(lang) {
    this.lang = lang;
    for (const o of this.order) { o.txt.textContent = o.data.name[lang]; o.w = 0; }
    this.measure = true;
    for (const g of this.gridRings) g.el.textContent = new Intl.NumberFormat(lang === "fa" ? "fa-IR" : "en-US").format(g.au) + (lang === "fa" ? " و.ن" : " AU");
  }
  setLayers(l) { Object.assign(this.layers, l); this.applyLayers(); }
  applyLayers() {
    const L = this.layers;
    for (const o of this.order) {
      const key = LAYER_OF[o.type];
      const on = !key || L[key];
      o.on = on;
      if (!o.sky && o.node) o.node.visible = on && !(o.type === "belt");
      if (o.line) o.line.visible = on && L.orbits;
      if (o.tail) o.tail.visible = on;
      if (o.sky && o.node) o.node.visible = on;
    }
    this.mainBelt.pts.visible = L.belts; this.kuiper.pts.visible = L.belts;
    this.sky.visible = L.milkyway;
    this.fieldStars.visible = L.stars || L.milkyway;
    this.grid.visible = L.grid;
    for (const g of this.gridRings) g.el.style.display = L.grid ? "" : "none";
    this.bloom.enabled = L.bloom;
  }
  setScaleMode(m) {
    this.mode = m; this.applyScale();
    this.camera.near = m === "true" ? 0.00005 : 0.01; this.camera.updateProjectionMatrix();
    this.controls.minDistance = m === "true" ? 0.0001 : 2;
    this.refit();
  }
  refit() { if (this.focusId) this.focus(this.focusId, true); else this.resetView(); }
  setSpeed(d) { this.speed = d; }
  setPaused(p) { this.paused = p; }
  setTime(jd) { this.jd = jd; }
  resize() {
    if (!this.renderer) return;
    const w = this.container.clientWidth, h = this.container.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h); this.composer.setSize(w, h);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
  }

  resetView() {
    this.focusId = null; this.selectedId = null;
    this.startTransition(new V(0, 0, 0), new V(0, 110, 220).normalize(), this.mode === "true" ? 40 : 260, null);
    this.controls.minDistance = this.mode === "true" ? 0.0001 : 2;
    this.cb.onSelect?.(null);
  }
  topView() { this.startTransition(new V(0, 0, 0), new V(0, 1, 0.001).normalize(), 320, null); this.focusId = null; }

  focusDistance(o) {
    if (o.type === "belt") return o.id === "kuiper-belt" ? 90 : 36;
    if (o.type === "craft") return Math.max(o.visR * 4.5, 0.0015);
    if (o.type === "skystar") return null;
    return Math.max(o.visR * (o.ring ? 8.5 : 7), 0.0015);
  }
  select(id, opts = {}) {
    const o = id ? this.objs.get(id) : null;
    this.selectedId = id;
    if (o && !o.sky) this.focus(id);
    if (o && o.sky) this.focusId = null;
    this.cb.onSelect?.(id);
  }
  focus(id, instant = false) {
    const o = this.objs.get(id); if (!o || o.sky) return;
    this.focusId = id;
    const dist = this.focusDistance(o);
    o.node.getWorldPosition(this._v);
    const dir = this.camera.position.clone().sub(this.controls.target);
    if (dir.lengthSq() < 1e-12) dir.set(0, 0.4, 1);
    dir.normalize();
    if (dir.y < 0.3) dir.y = 0.38; dir.normalize();
    this.controls.minDistance = Math.max(o.visR * 1.25, this.mode === "true" ? 0.0001 : 0.05);
    this.startTransition(this._v.clone(), dir, dist, id, instant);
  }
  startTransition(target, dir, dist, followId, instant = false) {
    const cam = this.camera.position, t0 = this.controls.target.clone();
    this.trans = { t: 0, dur: instant ? 0.01 : 1.6, fromT: t0, fromOff: cam.clone().sub(t0), toDir: dir.clone(), toDist: dist, toTarget: target, followId };
    this.controls.autoRotate = false;
  }

  /* ------------------------------------------------------------------ pick */
  pick(mx, my) {
    let best = null, bd = 1e9;
    for (const o of this.order) {
      const s = o.sp; if (!s.on || !o.shown) continue;
      const rad = Math.max(s.r, o.sky ? 14 : 16);
      const d = Math.hypot(s.x - mx, s.y - my);
      if (d < rad) { const score = d / rad; if (score < bd) { bd = score; best = o.id; } }
    }
    return best;
  }

  getLive(id) {
    const o = this.objs.get(id); if (!o) return null;
    const earth = this.objs.get("earth");
    const rSun = o.real.length();
    const dE = o.real.distanceTo(earth.real);
    let speed = null;
    const el = o.data.orbit;
    if (el) speed = speedKms(el, this.jd);
    return { rSun, dEarth: dE, speed, jd: this.jd };
  }

  /* ----------------------------------------------------------- update loop */
  updatePositions() {
    const jd = this.jd, earth = this.objs.get("earth");
    const tmp = [0, 0, 0];
    for (const o of this.order) {
      if (o.sky || o.type === "belt") continue;
      const d = o.data;
      if (d.orbit) {
        helioPos(d.orbit, jd, tmp);
        o.real.set(tmp[0], tmp[2], -tmp[1]);
        this.visFromReal(o.real, o.node.position);
      }
    }
    // spin
    for (const o of this.order) {
      if (o.type === "star" || !o.spinG || o.type === "moon" && false) continue;
      const rot = o.data.phys?.rot; if (!rot) continue;
      const tilt = (o.data.phys.tilt || 0), sign = tilt > 90 ? 1 : Math.sign(rot);
      o.tilt.rotation.x = -tilt * D2R;
      if (o.type !== "moon") o.spinG.rotation.y = sign * 2 * Math.PI * (this.spinDays * 24 / Math.abs(rot));
      if (o.clouds) o.clouds.rotation.y = this.spinDays * 0.02;
    }
    // sun spin
    this.sunObj.spinG.rotation.y = this.spinDays * 0.1;
    // moons
    const dd = jd - J2000;
    for (const o of this.order) {
      if (o.type !== "moon") continue;
      const d = o.data, phi = o.phase + (2 * Math.PI * dd) / d.P, r = o.orbitR, inc = (d.incl || 0) * D2R;
      const x = Math.cos(phi) * r, z = -Math.sin(phi) * r;
      o.node.position.set(x, z * Math.sin(inc), z * Math.cos(inc));
      o.spinG.rotation.y = phi + Math.PI;
      const par = this.objs.get(o.parent);
      // real position (AU): approximate by scaling the visual offset to the true distance
      const dir = new V(Math.cos(phi), 0, -Math.sin(phi));
      o.real.copy(par.real).addScaledVector(dir, d.a / AU_KM);
    }
    // comets: tail points away from the Sun
    for (const o of this.order) {
      if (o.type !== "comet") continue;
      const p = o.node.position, r = p.length();
      const dir = this._v.copy(p).normalize();
      const len = Math.min(34, 0.55 * Math.pow(Math.max(30 - r / 4, 0.5), 1.1) + 1) * (this.mode === "true" ? 0.2 : 1);
      const arr = o.tail.geometry.attributes.position.array, n = arr.length / 3;
      for (let i = 0; i < n; i++) {
        const t = i / n, jitter = (Math.sin(i * 12.9898) * 43758.5453 % 1) * 0.25 * t * len;
        arr[i * 3] = p.x + dir.x * t * len + jitter * 0.6;
        arr[i * 3 + 1] = p.y + dir.y * t * len + (jitter * 0.5);
        arr[i * 3 + 2] = p.z + dir.z * t * len - jitter * 0.6;
      }
      o.tail.geometry.attributes.position.needsUpdate = true;
      o.tail.material.opacity = Math.max(0.1, Math.min(0.7, 12 / (r + 4)));
    }
    // spacecraft
    for (const o of this.order) {
      if (o.type !== "craft") continue;
      const d = o.data;
      if (d.mode === "leo") {
        const par = this.objs.get("earth"), r = this.craftOrbitR(o, par), inc = d.incl * D2R;
        const phi = o.phase + (2 * Math.PI * dd) / d.P;
        const x = Math.cos(phi) * r, z = -Math.sin(phi) * r;
        o.node.position.set(x, z * Math.sin(inc), z * Math.cos(inc));
        o.model.lookAt(o.node.position.clone().multiplyScalar(2));
        o.real.copy(par.real);
      } else if (d.mode === "lagrange") {
        const dir = earth.node.position.clone().normalize();
        const sgn = d.point === "L2" ? 1 : -1;
        const off = this.mode === "true" ? 0.01 * KU : d.offset;
        const halo = this.mode === "true" ? 0.002 : d.haloR;
        const perp = new V(0, 1, 0).cross(dir).normalize();
        const up = new V(0, 1, 0);
        const ang = o.phase + (2 * Math.PI * dd) / d.P;
        o.node.position.copy(earth.node.position).addScaledVector(dir, sgn * off).addScaledVector(perp, Math.cos(ang) * halo).addScaledVector(up, Math.sin(ang) * halo * 0.8);
        o.model.quaternion.setFromUnitVectors(new V(0, 1, 0), dir.clone().multiplyScalar(-sgn)); // sunshield/optics face away
        o.real.copy(earth.real).addScaledVector(dir, sgn * 0.01);
      } else if (d.mode === "ellipse") {
        const { a, e } = this.parkerEl();
        const M = o.phase + (2 * Math.PI * dd) / d.P, E = solveKepler(M, e);
        const x = a * (Math.cos(E) - e), y = a * Math.sqrt(1 - e * e) * Math.sin(E), inc = d.incl * D2R;
        o.node.position.set(x, y * Math.sin(inc), -y * Math.cos(inc));
        o.model.lookAt(0, 0, 0);
        o.real.copy(o.node.position).multiplyScalar(0.73 / (a * (1 + e)));
      } else if (d.mode === "escape") {
        const au = d.ref.au + d.vAuYr * (jd - d.ref.jd) / 365.25;
        o.real.copy(o.dir).multiplyScalar(au);
        this.visFromReal(o.real, o.node.position);
        const pts = [[0, 0, 0]]; const N = 40;
        for (let k = 1; k <= N; k++) { const q = this.visFromReal(this._v.copy(o.dir).multiplyScalar(au * k / N), this._v2); pts.push([q.x, q.y, q.z]); }
        this.setLine(o.line, pts);
        o.model.lookAt(o.node.position.clone().multiplyScalar(2));
      }
    }
    this.updateBelts();
  }

  loop() {
    if (this.disposed) return;
    const dt = Math.min(this.clock.getDelta(), 0.1);
    if (!this.paused) {
      this.jd += this.speed * dt;
      this.spinDays += Math.min(Math.abs(this.speed), 1.5) * Math.sign(this.speed) * dt;
    }
    this.updatePositions();
    this.sysGroup.updateMatrixWorld(true);
    for (const o of this.order) {
      o.node.getWorldPosition(o.world);
    }
    // camera follow
    const cam = this.camera, ctl = this.controls;
    if (this.trans) {
      const tr = this.trans; tr.t += dt / tr.dur;
      const k = Math.min(tr.t, 1), e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      let tgt = tr.toTarget;
      if (tr.followId) tgt = this.objs.get(tr.followId).world;
      const t = this._v.copy(tr.fromT).lerp(tgt, e);
      const fromLen = tr.fromOff.length();
      const dir = this._v2.copy(tr.fromOff).normalize().lerp(tr.toDir, e).normalize();
      // geometric interpolation of distance feels natural when zooming across scales
      const dist = tr.toDist == null ? fromLen : Math.exp(Math.log(fromLen) * (1 - e) + Math.log(tr.toDist) * e);
      ctl.target.copy(t);
      cam.position.copy(t).addScaledVector(dir, dist);
      if (k >= 1) this.trans = null;
    } else if (this.focusId) {
      const o = this.objs.get(this.focusId);
      const nt = o.world;
      this._v.copy(nt).sub(ctl.target);
      cam.position.add(this._v); ctl.target.copy(nt);
    }
    ctl.update();
    // the sky follows the camera
    this.sky.position.copy(cam.position); this.fieldStars.position.copy(cam.position); this.starGroup.position.copy(cam.position);
    cam.updateMatrixWorld();
    this.updateLabels();
    if (performance.now() - this.lastTick > 90) { this.lastTick = performance.now(); this.cb.onTick?.(this.jd); }
    this.composer.render();
  }

  updateLabels() {
    const cam = this.camera, w = this.container.clientWidth, h = this.container.clientHeight;
    const fovK = h / (2 * Math.tan((cam.fov * D2R) / 2));
    const L = this.layers, v = this._v;
    const placed = [];
    const list = [];
    for (const o of this.order) {
      let show = o.on !== false && !!o.on;
      o.shown = false; o.sp.on = false;
      if (!show) { o.label.style.display = "none"; continue; }
      v.copy(o.world).project(cam);
      const camDist = cam.position.distanceTo(o.world);
      const behind = v.z > 1 || v.z < -1;
      const x = (v.x * 0.5 + 0.5) * w, y = (-v.y * 0.5 + 0.5) * h;
      const sr = o.sky ? 0 : (o.visR * fovK) / Math.max(camDist, 1e-9);
      o.sp.x = x; o.sp.y = y; o.sp.r = Math.min(sr, 2000);
      o.sp.on = !behind && x > -50 && x < w + 50 && y > -50 && y < h + 50;
      // contextual visibility
      let ok = true;
      if (o.type === "moon") {
        const par = this.objs.get(o.parent);
        ok = cam.position.distanceTo(par.world) < Math.max(par.orbitExtent ?? 0, this.maxMoonR(par) * 3.2) || this.selectedId === o.id;
      } else if (o.type === "craft" && o.data.mode === "leo") {
        ok = cam.position.distanceTo(this.objs.get("earth").world) < 12 || this.selectedId === o.id;
      }
      o.shown = ok && o.sp.on;
      o.sp.on = o.sp.on && ok;
      if (!o.shown) { o.label.style.display = "none"; continue; }
      const isSel = o.id === this.selectedId, isHover = o.id === this.hoverId;
      const pr = PRIORITY[o.type] + (isSel ? 200 : 0) + (isHover ? 150 : 0) + (o.type === "planet" ? 5 : 0);
      list.push({ o, x, y, sr, pr, isSel, isHover });
    }
    list.sort((a, b) => b.pr - a.pr);
    for (const it of list) {
      const { o } = it;
      if (!L.labels && !it.isSel && !it.isHover) { o.label.style.display = "none"; continue; }
      if (!o.w) { o.label.style.display = ""; o.w = o.label.offsetWidth || 80; }
      const off = Math.min(Math.max(it.sr, 0) + 7, 160);
      const rect = [it.x + off - 4, it.y - 13, o.w + 8, 26];
      let clash = false;
      if (!it.isSel && !it.isHover) for (const p of placed) if (rect[0] < p[0] + p[2] && rect[0] + rect[2] > p[0] && rect[1] < p[1] + p[3] && rect[1] + rect[3] > p[1]) { clash = true; break; }
      if (clash) { o.label.style.display = "none"; continue; }
      placed.push(rect);
      o.label.style.display = "";
      o.label.style.transform = `translate(${(it.x + off).toFixed(1)}px, ${(it.y - 13).toFixed(1)}px)`;
      o.label.classList.toggle("sel", it.isSel); o.label.classList.toggle("hov", it.isHover);
    }
    // grid labels
    if (L.grid) for (const g of this.gridRings) {
      v.copy(g.w).project(cam);
      if (v.z > 1) { g.el.style.display = "none"; continue; }
      g.el.style.display = "";
      g.el.style.transform = `translate(${((v.x * 0.5 + 0.5) * w).toFixed(1)}px, ${((-v.y * 0.5 + 0.5) * h).toFixed(1)}px)`;
    }
    // reticle
    const sel = this.selectedId && this.objs.get(this.selectedId);
    if (sel && sel.sp.on) {
      const s = Math.max(sel.sp.r * 2 + 26, 44);
      this.reticle.style.display = "block";
      this.reticle.style.width = this.reticle.style.height = s + "px";
      this.reticle.style.transform = `translate(${sel.sp.x - s / 2}px, ${sel.sp.y - s / 2}px)`;
    } else this.reticle.style.display = "none";
  }
  maxMoonR(par) { let m = 0; for (const c of par.children) m = Math.max(m, c.orbitR || 0); return m || par.visR * 4; }

  dispose() {
    this.disposed = true;
    this.renderer?.setAnimationLoop(null);
    window.removeEventListener("resize", this._onResize);
    this.ro?.disconnect();
    this.controls?.dispose();
    this.renderer?.dispose();
    this.renderer?.domElement?.remove();
    this.labelLayer.innerHTML = "";
  }
}

function hashStr(s) { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }
