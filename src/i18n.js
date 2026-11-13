export const UI = {
  fa: {
    title: "منظومه شمسی", tagline: "مدل سه‌بعدی زندهٔ منظومهٔ شمسی با داده‌های واقعی",
    search: "جست‌وجوی سیاره، قمر، فضاپیما، ستاره…", noResult: "چیزی پیدا نشد",
    objects: "اجرام", options: "گزینه‌ها", sources: "منابع", lang: "English",
    loading: "در حال ساختن منظومه…", loadingSub: "بافت‌ها و مدارها محاسبه می‌شوند",
    groups: { sun: "خورشید و سیارات", dwarf: "سیارات کوتوله", moons: "قمرها", small: "دنباله‌دار و کمربندها", craft: "فضاپیماها و تلسکوپ‌ها", stars: "ستارگان" },
    types: { star: "ستاره", planet: "سیاره", dwarf: "سیارهٔ کوتوله", moon: "قمر", comet: "دنباله‌دار", belt: "کمربند", craft: "فضاپیما / تلسکوپ", skystar: "ستارهٔ آسمان" },
    tabs: { overview: "نمای کلی", physical: "ویژگی‌ها", orbit: "مدار", composition: "ترکیب", refs: "منابع" },
    close: "بستن", live: "اکنون", now: "اکنون", play: "پخش", pause: "توقف", reverse: "برعکس",
    speeds: ["۱ ساعت/ث", "۱ روز/ث", "۱ هفته/ث", "۱ ماه/ث", "۱ سال/ث", "۱۰ سال/ث"],
    speedLabel: "سرعت زمان", date: "تاریخ", jalali: "شمسی", gregorian: "میلادی",
    distSun: "فاصله از خورشید", distEarth: "فاصله از زمین", lightTime: "زمان رسیدن نور از زمین", speed: "سرعت مداری",
    radius: "شعاع", mass: "جرم", density: "چگالی", gravity: "گرانش سطحی", escape: "سرعت گریز", rotation: "دورهٔ چرخش", tilt: "کجی محور",
    temp: "دما", moonsCount: "تعداد قمرها", pressure: "فشار سطح", retro: "(وارونه)",
    sma: "نیم‌قطر بزرگ", ecc: "برون‌مرکزی", incl: "شیب مداری", period: "دورهٔ مداری", peri: "حضیض", apo: "اوج", distParent: "فاصله از مادر",
    vsEarth: "برابر زمین", facts: "می‌دانستید؟", structure: "ساختار درونی", approx: "موقعیت این جرم تقریبی است.",
    layersT: "لایه‌ها", atmoT: "ترکیب جوّ (درصد حجمی)", noComp: "داده‌ای ثبت نشده است.",
    refsT: "منابع این جرم", wikiEn: "ویکی‌پدیا (انگلیسی)", wikiFa: "ویکی‌پدیا (فارسی)", nasa: "صفحهٔ ناسا", factsheet: "برگهٔ داده‌های ناسا", horizons: "JPL Horizons", simbad: "SIMBAD",
    layersTitle: "لایه‌ها", scaleTitle: "مقیاس", quality: "کیفیت",
    L: { orbits: "مدارها", labels: "برچسب‌ها", moons: "قمرها", dwarfs: "سیارات کوتوله", belts: "کمربندها", comets: "دنباله‌دارها", craft: "فضاپیماها", stars: "ستارگان درخشان", milkyway: "راه شیری", grid: "شبکهٔ فاصله", bloom: "درخشش (Bloom)" },
    scale: { stylized: "نمادین", linear: "فاصله‌ها خطی", true: "مقیاس واقعی" },
    scaleHint: { stylized: "فاصله‌ها فشرده و اندازه‌ها بزرگ‌نمایی‌شده تا همه چیز دیده شود.", linear: "فاصله‌ها متناسب با واقعیت؛ اندازه‌ها هنوز بزرگ‌نمایی‌شده.", true: "فاصله‌ها و اندازه‌ها واقعی‌اند. سیارات نقطه‌ای می‌شوند؛ اجرام ریز کمی بزرگ‌تر نشان داده می‌شوند." },
    view: "نما", reset: "نمای کلی", top: "نمای بالا", help: "کشیدن: چرخش · چرخ ماوس: بزرگ‌نمایی · کلیک: انتخاب · دوبار کلیک: تمرکز · فاصله: توقف",
    sourcesTitle: "منابع داده", sourcesIntro: "همهٔ اعداد از منابع رسمی گرفته شده‌اند. بافت سطح سیارات در این نسخه تولیدی (پروسیجرال) است؛ می‌توانید تصاویر واقعی ناسا را جایگزین کنید.",
    copyright: "© ۲۰۲۶ Lunar", powered: "قدرت‌گرفته از", github: "گیت‌هاب",
    au: "واحد نجومی", km: "کیلومتر", kmps: "کیلومتر بر ثانیه", kg: "کیلوگرم", gcm3: "گرم بر سانتی‌متر مکعب", ms2: "متر بر ثانیه²", hours: "ساعت", days: "روز", years: "سال", min: "دقیقه", ly: "سال نوری", deg: "°",
    ra: "صعود راست", dec: "میل", mag: "قدر ظاهری", distLy: "فاصله", cls: "رده طیفی", starTemp: "دمای سطح", starMass: "جرم (خورشید = ۱)", starRadius: "شعاع (خورشید = ۱)", starLum: "درخشندگی (خورشید = ۱)", con: "صورت فلکی",
    swatch: "کلید", sunMass: "جرم خورشیدی",
  },
  en: {
    title: "Solar System", tagline: "A live 3D model of the solar system built on real data",
    search: "Search planets, moons, spacecraft, stars…", noResult: "Nothing found",
    objects: "Objects", options: "Options", sources: "Sources", lang: "فارسی",
    loading: "Building the solar system…", loadingSub: "Painting surfaces and solving orbits",
    groups: { sun: "Sun & planets", dwarf: "Dwarf planets", moons: "Moons", small: "Comets & belts", craft: "Spacecraft & telescopes", stars: "Stars" },
    types: { star: "Star", planet: "Planet", dwarf: "Dwarf planet", moon: "Moon", comet: "Comet", belt: "Belt", craft: "Spacecraft / telescope", skystar: "Sky star" },
    tabs: { overview: "Overview", physical: "Physical", orbit: "Orbit", composition: "Composition", refs: "Sources" },
    close: "Close", live: "Right now", now: "Now", play: "Play", pause: "Pause", reverse: "Reverse",
    speeds: ["1 hour/s", "1 day/s", "1 week/s", "1 month/s", "1 year/s", "10 years/s"],
    speedLabel: "Time speed", date: "Date", jalali: "Solar Hijri", gregorian: "Gregorian",
    distSun: "Distance from Sun", distEarth: "Distance from Earth", lightTime: "Light travel time from Earth", speed: "Orbital speed",
    radius: "Radius", mass: "Mass", density: "Density", gravity: "Surface gravity", escape: "Escape velocity", rotation: "Rotation period", tilt: "Axial tilt",
    temp: "Temperature", moonsCount: "Moons", pressure: "Surface pressure", retro: "(retrograde)",
    sma: "Semi-major axis", ecc: "Eccentricity", incl: "Inclination", period: "Orbital period", peri: "Perihelion", apo: "Aphelion", distParent: "Distance from parent",
    vsEarth: "× Earth", facts: "Did you know?", structure: "Internal structure", approx: "This object's position is approximate.",
    layersT: "Layers", atmoT: "Atmosphere (volume %)", noComp: "No data recorded.",
    refsT: "Sources for this object", wikiEn: "Wikipedia (English)", wikiFa: "Wikipedia (Persian)", nasa: "NASA page", factsheet: "NASA fact sheet", horizons: "JPL Horizons", simbad: "SIMBAD",
    layersTitle: "Layers", scaleTitle: "Scale", quality: "Quality",
    L: { orbits: "Orbits", labels: "Labels", moons: "Moons", dwarfs: "Dwarf planets", belts: "Belts", comets: "Comets", craft: "Spacecraft", stars: "Bright stars", milkyway: "Milky Way", grid: "Distance grid", bloom: "Glow (bloom)" },
    scale: { stylized: "Stylised", linear: "Linear distance", true: "True scale" },
    scaleHint: { stylized: "Distances compressed and sizes enlarged so everything stays visible.", linear: "Distances proportional to reality; sizes still enlarged.", true: "Distances and sizes are real. Planets become dots; tiny bodies are drawn slightly larger than life." },
    view: "View", reset: "Overview", top: "Top view", help: "Drag: orbit · Wheel: zoom · Click: select · Double-click: focus · Space: pause",
    sourcesTitle: "Data sources", sourcesIntro: "Every number comes from official sources. Surface textures in this build are procedural; drop real NASA imagery into /public/textures to replace them.",
    copyright: "© 2026 Lunar", powered: "Powered by", github: "GitHub",
    au: "AU", km: "km", kmps: "km/s", kg: "kg", gcm3: "g/cm³", ms2: "m/s²", hours: "h", days: "days", years: "years", min: "min", ly: "light-years", deg: "°",
    ra: "Right ascension", dec: "Declination", mag: "Apparent magnitude", distLy: "Distance", cls: "Spectral class", starTemp: "Surface temperature", starMass: "Mass (Sun = 1)", starRadius: "Radius (Sun = 1)", starLum: "Luminosity (Sun = 1)", con: "Constellation",
    swatch: "Key", sunMass: "Solar masses",
  },
};

export function makeFmt(lang) {
  const loc = lang === "fa" ? "fa-IR" : "en-US";
  const nf = (n, d = 2) => new Intl.NumberFormat(loc, { maximumFractionDigits: d, minimumFractionDigits: 0 }).format(n);
  const int = (n) => new Intl.NumberFormat(loc, { maximumFractionDigits: 0 }).format(n);
  const smart = (n) => {
    const a = Math.abs(n);
    if (a === 0) return nf(0);
    if (a >= 1000) return int(n);
    if (a >= 100) return nf(n, 1);
    if (a >= 1) return nf(n, 2);
    if (a >= 0.01) return nf(n, 3);
    return nf(n, 5);
  };
  return { nf, int, smart, loc };
}

export const normalize = (s) => (s || "").toString().toLowerCase().replace(/ي/g, "ی").replace(/ك/g, "ک").replace(/[\u064B-\u0652\u200c]/g, "").replace(/[()\-‘’'’]/g, " ").replace(/\s+/g, " ").trim();
