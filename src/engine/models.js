import * as THREE from "three";

// Small hand-built models for spacecraft. All fit in a ~1 unit box; the engine scales them.
const metal = (c = 0xcfd3d9) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.45, metalness: 0.7 });
const panel = (c = 0x1c3a8a) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.35, metalness: 0.6, emissive: 0x08142e });
const gold = () => new THREE.MeshStandardMaterial({ color: 0xe0b040, roughness: 0.3, metalness: 1, emissive: 0x3a2a00 });
const foil = () => new THREE.MeshStandardMaterial({ color: 0xb8a6d8, roughness: 0.3, metalness: 0.9, side: THREE.DoubleSide, emissive: 0x201838 });
const box = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
const cyl = (r, l, m, seg = 16) => { const x = new THREE.Mesh(new THREE.CylinderGeometry(r, r, l, seg), m); x.rotation.x = Math.PI / 2; return x; };

export function buildModel(kind) {
  const g = new THREE.Group();
  switch (kind) {
    case "iss": {
      g.add(box(1.7, 0.035, 0.035, metal()));
      for (const x of [-0.78, -0.55, 0.55, 0.78]) { const p = box(0.12, 0.01, 0.55, panel()); p.position.set(x, 0, 0.32); g.add(p); const q = p.clone(); q.position.z = -0.32; g.add(q); }
      const m = cyl(0.07, 0.6, metal(0xffffff)); m.position.set(0, 0, 0); g.add(m);
      const m2 = cyl(0.05, 0.3, metal(0xe8e8e8)); m2.rotation.set(0, Math.PI / 2, 0); m2.position.set(0.12, 0.05, 0); g.add(m2);
      break;
    }
    case "tiangong": {
      const core = cyl(0.08, 0.7, metal(0xf2f2f2)); g.add(core);
      const lab = cyl(0.07, 0.5, metal(0xe6e6e6)); lab.rotation.set(Math.PI / 2, 0, Math.PI / 2); g.add(lab);
      for (const z of [-0.2, 0.2]) for (const s of [-1, 1]) { const p = box(0.6, 0.01, 0.18, panel(0x2a4aa8)); p.position.set(s * 0.45, 0.06, z); g.add(p); }
      break;
    }
    case "hubble": {
      g.add(cyl(0.12, 0.9, metal(0xc9ccd2)));
      const e = cyl(0.14, 0.15, metal(0x6a6e78)); e.position.z = -0.38; g.add(e);
      for (const s of [-1, 1]) { const p = box(0.5, 0.01, 0.28, panel(0x2a3f8a)); p.position.set(s * 0.4, 0, 0.1); g.add(p); }
      const b = cyl(0.13, 0.25, gold()); b.position.z = 0.4; g.add(b);
      break;
    }
    case "jwst": {
      const shield = box(1.6, 0.012, 0.85, foil()); shield.position.y = -0.2; g.add(shield);
      const bus = box(0.35, 0.22, 0.35, metal(0x9aa0aa)); bus.position.y = -0.04; g.add(bus);
      const hex = new THREE.CylinderGeometry(0.1, 0.1, 0.012, 6);
      const pos = [[0, 0]];
      for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; pos.push([Math.cos(a) * 0.173, Math.sin(a) * 0.173]); }
      for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + Math.PI / 6; pos.push([Math.cos(a) * 0.3, Math.sin(a) * 0.3]); }
      for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; pos.push([Math.cos(a) * 0.346, Math.sin(a) * 0.346]); }
      pos.splice(0, 1);
      for (const [x, z] of pos.slice(0, 18)) { const h = new THREE.Mesh(hex, gold()); h.position.set(x, 0.3, z); h.rotation.x = -0.25; g.add(h); }
      const arm = cyl(0.01, 0.4, metal()); arm.position.set(0, 0.5, 0.12); arm.rotation.x = 0.4; g.add(arm);
      break;
    }
    case "voyager": {
      const dish = new THREE.Mesh(new THREE.SphereGeometry(0.5, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2.4), new THREE.MeshStandardMaterial({ color: 0xf4f4f6, roughness: 0.5, metalness: 0.4, side: THREE.DoubleSide }));
      dish.rotation.x = Math.PI / 2 * -1; dish.position.z = 0.15; g.add(dish);
      const bus = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.12, 10), metal(0xb0b4bc)); bus.rotation.x = Math.PI / 2; bus.position.z = -0.05; g.add(bus);
      const boom = cyl(0.01, 1.0, metal(0x666b75)); boom.position.set(0.5, 0, -0.1); boom.rotation.set(0, 0, Math.PI / 2); boom.rotation.x = Math.PI / 2; g.add(boom);
      const rtg = cyl(0.025, 0.55, metal(0x4a4c52)); rtg.position.set(-0.4, 0, -0.15); rtg.rotation.set(0, Math.PI / 2, 0); g.add(rtg);
      break;
    }
    default: {
      g.add(box(0.4, 0.4, 0.6, metal(0xc0c4cc)));
      for (const s of [-1, 1]) { const p = box(0.7, 0.01, 0.4, panel()); p.position.set(s * 0.55, 0, 0); g.add(p); }
      const d = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), metal(0xffffff)); d.position.set(0, 0.25, 0); g.add(d);
    }
  }
  return g;
}
