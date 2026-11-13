import { SUN, PLANETS, DWARFS, MOONS, COMETS, BELTS, CRAFT } from "./bodies.js";
import { STARS } from "./stars.js";

const typeOf = { star: "star", planet: "planet", dwarf: "dwarf", comet: "comet", belt: "belt", craft: "craft" };
export const CATALOG = new Map();
const add = (d, type, group) => CATALOG.set(d.id, { id: d.id, type, group, data: d, parent: d.parent });
add(SUN, "star", "sun");
PLANETS.forEach((d) => add(d, "planet", "sun"));
DWARFS.forEach((d) => add(d, "dwarf", "dwarf"));
MOONS.forEach((d) => add(d, "moon", "moons"));
COMETS.forEach((d) => add(d, "comet", "small"));
BELTS.forEach((d) => add(d, "belt", "small"));
CRAFT.forEach((d) => add(d, "craft", "craft"));
STARS.forEach((d) => CATALOG.set("star-" + d.id, { id: "star-" + d.id, type: "skystar", group: "stars", data: { ...d, color: d.c }, parent: null }));

export const GROUP_ORDER = ["sun", "dwarf", "moons", "small", "craft", "stars"];
export const byGroup = (g) => [...CATALOG.values()].filter((e) => e.group === g);
