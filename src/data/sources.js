const T = (fa, en) => ({ fa, en });
export const SOURCES = [
  { group: T("ناسا (NASA)", "NASA"), items: [
    { name: T("برگه‌های آماری سیارات (NSSDC)", "Planetary Fact Sheets (NSSDC)"), url: "https://nssdc.gsfc.nasa.gov/planetary/factsheet/", note: T("جرم، شعاع، چگالی، گرانش، دما و مدار", "Mass, radius, density, gravity, temperature, orbits") },
    { name: T("کاوش منظومهٔ شمسی ناسا", "NASA Solar System Exploration"), url: "https://science.nasa.gov/solar-system/", note: T("توضیحات سیارات، قمرها و مأموریت‌ها", "Planets, moons, missions") },
    { name: T("JPL: موقعیت تقریبی سیارات", "JPL: Approximate Positions of the Planets"), url: "https://ssd.jpl.nasa.gov/planets/approx_pos.html", note: T("عناصر کپلری J2000 که در محاسبهٔ مدارها استفاده شده‌اند", "Keplerian elements (J2000) used for the orbits") },
    { name: T("JPL: سامانهٔ Horizons", "JPL Horizons"), url: "https://ssd.jpl.nasa.gov/horizons/", note: T("مرجع موقعیت دقیق اجرام", "High-precision ephemerides") },
    { name: T("JPL: پارامترهای مداری قمرها", "JPL: Planetary Satellite Parameters"), url: "https://ssd.jpl.nasa.gov/sats/elem/", note: T("شعاع و دورهٔ مدار قمرها", "Moon radii and orbital periods") },
    { name: T("ناسا: مأموریت‌های ویجر، وب، هابل، پارکر", "NASA: Voyager, Webb, Hubble, Parker missions"), url: "https://science.nasa.gov/mission/", note: T("اطلاعات فضاپیماها و تلسکوپ‌ها", "Spacecraft and telescope data") },
  ] },
  { group: T("ویکی‌پدیا", "Wikipedia"), items: [
    { name: T("ویکی‌پدیای فارسی: منظومهٔ شمسی", "Persian Wikipedia: Solar System"), url: "https://fa.wikipedia.org/wiki/%D9%85%D9%86%D8%B8%D9%88%D9%85%D9%87_%D8%B4%D9%85%D8%B3%DB%8C", note: T("متن‌های فارسی و نام‌ها", "Persian terminology") },
    { name: T("ویکی‌پدیای انگلیسی: Solar System", "English Wikipedia: Solar System"), url: "https://en.wikipedia.org/wiki/Solar_System", note: T("ترکیبات، کشف و سایر جزئیات هر جرم", "Composition, discovery and per-object details") },
    { name: T("فهرست قمرهای طبیعی", "List of natural satellites"), url: "https://en.wikipedia.org/wiki/List_of_natural_satellites", note: T("تعداد قمرها", "Moon counts") },
  ] },
  { group: T("سازمان‌های دیگر", "Other organisations"), items: [
    { name: T("ESA — آژانس فضایی اروپا", "ESA — European Space Agency"), url: "https://www.esa.int/Science_Exploration", note: T("SOHO، Gaia، JUICE، Euclid", "SOHO, Gaia, JUICE, Euclid") },
    { name: T("اتحادیهٔ بین‌المللی نجوم (IAU)", "International Astronomical Union (IAU)"), url: "https://www.iau.org/", note: T("تعریف سیاره و سیارهٔ کوتوله، نام‌گذاری", "Definitions of planet and dwarf planet, naming") },
    { name: T("SIMBAD (رصدخانهٔ استراسبورگ)", "SIMBAD (Strasbourg Observatory)"), url: "https://simbad.cds.unistra.fr/", note: T("مختصات و ویژگی‌های ستارگان", "Star coordinates and properties") },
    { name: T("ESA Gaia", "ESA Gaia"), url: "https://www.esa.int/Science_Exploration/Space_Science/Gaia", note: T("فواصل ستارگان", "Stellar distances") },
    { name: T("Solar System Scope — بافت‌ها", "Solar System Scope: textures"), url: "https://www.solarsystemscope.com/textures/", note: T("بافت‌های واقعی برای جایگزینی (CC BY 4.0)", "Real textures to drop in (CC BY 4.0)") },
  ] },
];
