// Genera ilustraciones SVG de marca para el contenido demo (portadas, hero, campus).

const NAVY = "#020235";
const DEEP = "#14175a";
const ORANGE = "#d63d17";
const ORANGE_L = "#f0623a";
const CREAM = "#f2efe8";

export const PALETTES = [
  { bg: NAVY, fg: CREAM, ac: ORANGE, ac2: ORANGE_L },
  { bg: ORANGE, fg: CREAM, ac: NAVY, ac2: "#ffd2c2" },
  { bg: CREAM, fg: NAVY, ac: ORANGE, ac2: DEEP },
  { bg: DEEP, fg: CREAM, ac: ORANGE_L, ac2: ORANGE },
];

const FONT = "'Barlow Condensed','Arial Narrow','Roboto Condensed',Impact,Arial,sans-serif";

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function wrap(text: string, max: number) {
  const words = text.toUpperCase().split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > max && cur) {
      lines.push(cur);
      cur = w;
    } else cur = (cur + " " + w).trim();
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 4);
}

function mic(x: number, y: number, w: number, h: number, fill: string, stroke: string) {
  const r = w / 2;
  const lines = [0.22, 0.32, 0.42]
    .map((p) => `<rect x="${x}" y="${y + h * p}" width="${w * 0.52}" height="${h * 0.05}" rx="${h * 0.015}" fill="${stroke}"/>`)
    .join("");
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${w * 0.08}"/>${lines}`;
}

function waves(cx: number, cy: number, color: string, scale = 1) {
  return [1, 2, 3]
    .map((i) => {
      const r = 60 * i * scale;
      return `<path d="M${cx + r * 0.7} ${cy - r * 0.7} A ${r} ${r} 0 0 1 ${cx + r * 0.7} ${cy + r * 0.7}" fill="none" stroke="${color}" stroke-width="${14 * scale}" stroke-linecap="round" opacity="${1 - i * 0.22}"/>`;
    })
    .join("");
}

function bars(x: number, y: number, color: string, n = 18, w = 14, gap = 10, maxH = 160, seed = 1) {
  let s = "";
  for (let i = 0; i < n; i++) {
    const h = 20 + Math.abs(Math.sin((i + 1) * 1.7 * seed)) * maxH;
    s += `<rect x="${x + i * (w + gap)}" y="${y - h / 2}" width="${w}" height="${h}" rx="${w / 2}" fill="${color}"/>`;
  }
  return s;
}

/** Imagen de tarjeta (proporción 1.13). */
export function cardSvg(title: string, kicker: string, variant: number) {
  const p = PALETTES[variant % PALETTES.length];
  const lines = wrap(title, 12);
  const size = lines.length > 3 ? 78 : 90;
  const text = lines
    .map((l, i) => `<text x="70" y="${560 + i * size * 0.92}" font-family="${FONT}" font-weight="700" font-size="${size}" fill="${p.fg}" letter-spacing="-2">${esc(l)}</text>`)
    .join("");
  const motif =
    variant % 3 === 0
      ? `<circle cx="900" cy="240" r="230" fill="${p.ac}" opacity=".95"/>${mic(840, 110, 120, 250, p.bg, p.fg)}`
      : variant % 3 === 1
        ? `${bars(560, 250, p.ac2, 20, 16, 12, 220, variant + 1)}`
        : `<circle cx="860" cy="250" r="150" fill="none" stroke="${p.ac}" stroke-width="40"/>${waves(860, 250, p.ac2, 1.1)}${mic(815, 150, 90, 190, p.ac, p.fg)}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1130 1000" width="1130" height="1000">
<rect width="1130" height="1000" fill="${p.bg}"/>
${motif}
<rect x="70" y="${470 - 30}" width="120" height="10" fill="${p.ac}"/>
<text x="70" y="420" font-family="${FONT}" font-weight="600" font-size="34" fill="${p.fg}" opacity=".8" letter-spacing="4">${esc(kicker.toUpperCase())}</text>
${text}
<text x="70" y="940" font-family="${FONT}" font-weight="700" font-size="40" fill="${p.ac}" letter-spacing="2">TUKI ACADEMIA</text>
</svg>`;
}

/** Portada alargada del detalle de curso (1600x600). */
export function coverSvg(title: string, kicker: string, variant: number) {
  const p = PALETTES[variant % PALETTES.length];
  const lines = wrap(title, 14);
  const text = lines
    .map((l, i) => `<text x="90" y="${290 + i * 84}" font-family="${FONT}" font-weight="700" font-size="84" fill="${p.fg}" letter-spacing="-2">${esc(l)}</text>`)
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 600" width="1600" height="600">
<rect width="1600" height="600" fill="${p.bg}"/>
<circle cx="1330" cy="300" r="250" fill="${p.ac}"/>
${waves(1330, 300, p.ac2, 1.6)}
${mic(1275, 150, 110, 260, p.bg, p.fg)}
<text x="92" y="190" font-family="${FONT}" font-weight="600" font-size="36" fill="${p.fg}" opacity=".8" letter-spacing="5">${esc(kicker.toUpperCase())}</text>
${text}
</svg>`;
}

export function heroSvg(variant: number) {
  const p = PALETTES[variant % PALETTES.length];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 900" width="1920" height="900">
<defs><radialGradient id="g" cx="70%" cy="40%" r="70%"><stop offset="0" stop-color="${p.ac}" stop-opacity=".55"/><stop offset="1" stop-color="${p.bg}" stop-opacity="0"/></radialGradient></defs>
<rect width="1920" height="900" fill="${p.bg}"/>
<rect width="1920" height="900" fill="url(#g)"/>
${bars(980, 420, p.ac2, 34, 18, 10, 300, variant + 2)}
<circle cx="1480" cy="380" r="210" fill="${p.ac}"/>
${mic(1420, 220, 120, 300, p.bg, p.fg)}
${waves(1480, 380, p.fg, 2)}
</svg>`;
}

export function campusSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" width="1600" height="1000">
<rect width="1600" height="1000" fill="${CREAM}"/>
<circle cx="1320" cy="180" r="260" fill="${ORANGE}" opacity=".9"/>
<rect x="200" y="160" width="1200" height="720" rx="28" fill="${NAVY}"/>
<rect x="232" y="200" width="1136" height="640" rx="14" fill="#f6f5f1"/>
<rect x="232" y="200" width="70" height="640" fill="#ffffff"/>
${[0, 1, 2, 3, 4, 5].map((i) => `<rect x="252" y="${250 + i * 60}" width="30" height="30" rx="8" fill="${i === 0 ? ORANGE : "#d9d5cc"}"/>`).join("")}
<rect x="302" y="200" width="1066" height="46" fill="${NAVY}"/>
<rect x="320" y="211" width="150" height="24" rx="12" fill="${ORANGE}"/>
<rect x="340" y="280" width="260" height="520" rx="10" fill="#ffffff"/>
${[0, 1, 2, 3, 4, 5, 6].map((i) => `<rect x="360" y="${305 + i * 66}" width="${200 - (i % 3) * 30}" height="16" rx="8" fill="${i === 2 ? ORANGE : "#e3dfd6"}"/><rect x="360" y="${330 + i * 66}" width="120" height="10" rx="5" fill="#ece9e2"/>`).join("")}
<rect x="630" y="280" width="700" height="394" rx="14" fill="${DEEP}"/>
<circle cx="980" cy="477" r="56" fill="${ORANGE}"/>
<path d="M965 450v54l44-27-44-27Z" fill="#fff"/>
<rect x="650" y="640" width="660" height="6" rx="3" fill="#ffffff" opacity=".3"/>
<rect x="650" y="640" width="260" height="6" rx="3" fill="${ORANGE}"/>
<rect x="630" y="700" width="420" height="20" rx="10" fill="#d9d5cc"/>
<rect x="630" y="735" width="300" height="14" rx="7" fill="#e3dfd6"/>
<rect x="1150" y="700" width="180" height="40" rx="20" fill="${ORANGE}"/>
<rect x="120" y="880" width="1360" height="34" rx="17" fill="${NAVY}"/>
</svg>`;
}

export function experienceSvg(city: string, variant: number) {
  const p = PALETTES[(variant + 1) % PALETTES.length];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" width="1600" height="900">
<rect width="1600" height="900" fill="${p.bg}"/>
${bars(80, 700, p.ac, 40, 22, 16, 380, variant + 3)}
<text x="90" y="360" font-family="${FONT}" font-weight="800" font-size="230" fill="${p.fg}" opacity=".14" letter-spacing="-6">${esc(city.toUpperCase())}</text>
<circle cx="1300" cy="260" r="160" fill="${p.ac}"/>
</svg>`;
}

export function avatarSvg(initials: string, variant: number) {
  const p = PALETTES[variant % PALETTES.length];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
<rect width="200" height="200" fill="${p.bg}"/>
<circle cx="150" cy="40" r="50" fill="${p.ac}"/>
<text x="100" y="128" text-anchor="middle" font-family="${FONT}" font-weight="700" font-size="84" fill="${p.fg}">${esc(initials)}</text>
</svg>`;
}
