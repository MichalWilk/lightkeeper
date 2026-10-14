/* ---------- helpers ---------- */
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const rand = (a, b) => a + Math.random() * (b - a);
const dist = (x1, y1, x2, y2) => Math.hypot(x1 - x2, y1 - y2);
const lerp = (a, b, k) => a + (b - a) * k;
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
function angDiff(a, b) { let d = a - b; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; }
const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const ROMAN = ['', 'I', 'II', 'III', 'IV'];
const TAU = Math.PI * 2;
/* tunables */
const SHIP_SPEED_LIT = 48, SHIP_SPEED_DARK = 34;      // px/s at scale 1, before type multipliers
const PIRATE_SPEED = 40, PIRATE_FLEE = 62, PIRATE_LURE = 46;
const PIRATE_LIT_LIMIT = 4;                           // seconds in the main beam before a pirate leaves
/* render quality: level 2 is full, lower levels are chosen automatically when frames run slow */
const QUALITY = [
  { dpr: 1,   light: 0.35, glints: 0.45 },
  { dpr: 1.5, light: 0.5,  glints: 0.7 },
  { dpr: 2,   light: 0.5,  glints: 1 }
];
let qLevel = 2;
