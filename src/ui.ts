import { CATALOG, Catch } from './catalog';
import { drawCatch } from './fishart';
import { Game } from './game';
import { drawHat, HATS, LURES, UpgradeKind, UPGRADES } from './gear';
import { questDetail } from './quests';
import { BOAT, Spot, spotById, SPOTS } from './spots';
import { BEST_BONUS, PRIZES, RIVALS } from './tourney';
import { clamp, easeOut, roundRect, setFont, wrapText } from './util';

type Ctx = CanvasRenderingContext2D;

const INK = '#22303c';
const SUB = '#5b6770';
const PAPER = '#fffaf0';
const BLUE = '#2f8fc4';
const GREEN = '#3aa655';

export function drawCoin(ctx: Ctx, x: number, y: number, r: number) {
  ctx.fillStyle = '#ffcf3f';
  ctx.strokeStyle = '#b8860b';
  ctx.lineWidth = r * 0.25;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

/** Registers a tappable area. Later registrations sit on top. */
function hit(g: Game, x: number, y: number, w: number, h: number, fn: () => void, pad = 0) {
  g.hits.push({ x: x - pad, y: y - pad, w: w + pad * 2, h: h + pad * 2, fn });
}

type BtnKind = 'buy' | 'broke' | 'use' | 'on' | 'off';

function button(
  ctx: Ctx, g: Game, x: number, y: number, w: number, h: number,
  text: string, kind: BtnKind, fn?: () => void, coin = false,
) {
  const u = g.L.u;
  const fill = { buy: GREEN, broke: '#b9c2c9', use: BLUE, on: PAPER, off: '#e3e7ea' }[kind];
  const ink = { buy: '#fff', broke: '#fff', use: '#fff', on: BLUE, off: '#8a959d' }[kind];
  ctx.fillStyle = fill;
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fill();
  if (kind === 'on') {
    ctx.strokeStyle = BLUE;
    ctx.lineWidth = 2 * u;
    ctx.stroke();
  }
  setFont(ctx, 13 * u, '900');
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillStyle = ink;
  if (coin) {
    const tw = ctx.measureText(text).width;
    const total = tw + 18 * u;
    drawCoin(ctx, x + w / 2 - total / 2 + 6 * u, y + h / 2, 6 * u);
    ctx.fillStyle = ink;
    ctx.textAlign = 'left';
    ctx.fillText(text, x + w / 2 - total / 2 + 18 * u, y + h / 2 + 1 * u);
  } else {
    ctx.fillText(text, x + w / 2, y + h / 2 + 1 * u);
  }
  if (fn) hit(g, x, y, w, h, fn, 8 * u);
}

// ---------- Bottom buttons on the pier ----------

export function drawNav(ctx: Ctx, g: Game) {
  const { W, u, feetY } = g.L;
  if (g.tourney) return;
  const active = g.phase === 'idle' && g.screen === 'none' && !g.drag && !g.travel;
  const h = 34 * u;
  const y = feetY + 66 * u - h / 2;
  ctx.globalAlpha = active ? 1 : 0.5;
  setFont(ctx, 14 * u, '800');
  ctx.textBaseline = 'middle';

  const pill = (x: number, w: number) => {
    ctx.fillStyle = 'rgba(10,30,45,0.72)';
    roundRect(ctx, x, y, w, h, h / 2);
    ctx.fill();
    if (active) {
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 1.5 * u;
      ctx.stroke();
    }
  };

  // Shop, showing the purse
  const coins = String(g.save.coins);
  const cw = ctx.measureText(coins).width;
  const sw = ctx.measureText('SHOP').width;
  const lw = cw + sw + 58 * u;
  const lx = 12 * u;
  pill(lx, lw);
  drawCoin(ctx, lx + 17 * u, y + h / 2, 7 * u);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#fff';
  ctx.fillText(coins, lx + 30 * u, y + h / 2 + 1 * u);
  ctx.fillStyle = '#ffd84a';
  ctx.fillText('SHOP', lx + 42 * u + cw, y + h / 2 + 1 * u);
  if (active) hit(g, lx, y, lw, h, () => g.openScreen('shop'), 8 * u);

  // Journal, showing progress
  const text = `JOURNAL ${g.found()}/${CATALOG.length}`;
  const rw = ctx.measureText(text).width + 28 * u;
  const rx = W - 12 * u - rw;
  pill(rx, rw);
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.fillText(text, rx + rw / 2, y + h / 2 + 1 * u);
  if (active) hit(g, rx, y, rw, h, () => g.openScreen('journal'), 8 * u);

  // Map, in the gap between the two
  const mw = ctx.measureText('MAP').width + 28 * u;
  const mx = (lx + lw + rx) / 2 - mw / 2;
  pill(mx, mw);
  ctx.fillStyle = '#9fe0ff';
  ctx.textAlign = 'center';
  ctx.fillText('MAP', mx + mw / 2, y + h / 2 + 1 * u);
  if (active) hit(g, mx, y, mw, h, () => g.openScreen('map'), 6 * u);
  // Nudge: you can afford the boat
  if (!g.save.boat && g.save.coins >= BOAT.price) {
    const r = (5 + Math.sin(g.time * 6)) * u;
    ctx.fillStyle = '#ff5a4a';
    ctx.beginPath();
    ctx.arc(mx + mw - 4 * u, y + 4 * u, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ---------- Full-screen panels ----------

export function drawScreens(ctx: Ctx, g: Game) {
  if (g.screen === 'none') return;
  if (g.screen === 'quest') {
    drawQuestCard(ctx, g);
    return;
  }
  const { W, H, u, safeTop, safeBottom } = g.L;
  const a = easeOut(clamp(g.screenT / 0.25, 0, 1));

  ctx.fillStyle = `rgba(8,20,32,${0.6 * a})`;
  ctx.fillRect(0, 0, W, H);
  hit(g, 0, 0, W, H, () => g.closeScreen());

  const x = 12 * u;
  const w = W - 24 * u;
  const top = safeTop + 78 * u;
  const h = H - top - safeBottom - 14 * u;
  const y = top + (1 - a) * H * 0.5;

  ctx.fillStyle = PAPER;
  roundRect(ctx, x, y, w, h, 22 * u);
  ctx.fill();
  hit(g, x, y, w, h, () => {});

  // Title, purse, close
  setFont(ctx, 18 * u, '900');
  ctx.fillStyle = INK;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const title = {
    shop: "EARL'S TACKLE SHACK",
    journal: 'FISH-O-PEDIA',
    map: 'LAKE MAP',
    tourney: 'BASS-ISH MASTERS',
    tourneyEnd: 'RESULTS',
    quest: '',
    none: '',
  }[g.screen];
  ctx.fillText(title, x + 18 * u, y + 30 * u);

  const cx = x + w - 28 * u;
  const cy = y + 30 * u;
  ctx.fillStyle = '#e3e7ea';
  ctx.beginPath();
  ctx.arc(cx, cy, 15 * u, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = SUB;
  ctx.lineWidth = 2.5 * u;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - 5 * u, cy - 5 * u);
  ctx.lineTo(cx + 5 * u, cy + 5 * u);
  ctx.moveTo(cx + 5 * u, cy - 5 * u);
  ctx.lineTo(cx - 5 * u, cy + 5 * u);
  ctx.stroke();
  hit(g, cx - 15 * u, cy - 15 * u, 30 * u, 30 * u, () => g.closeScreen(), 8 * u);

  if (g.screen === 'shop') drawShop(ctx, g, x, y, w, h);
  else if (g.screen === 'map') drawMap(ctx, g, x, y, w, h);
  else if (g.screen === 'tourney') drawTourney(ctx, g, x, y, w, h);
  else if (g.screen === 'tourneyEnd') drawTourneyEnd(ctx, g, x, y, w, h);
  else drawJournal(ctx, g, x, y, w, h);
}

// ---------- Quest card ----------

function drawQuestCard(ctx: Ctx, g: Game) {
  const s = g.save.quest;
  const { W, H, u } = g.L;
  const a = easeOut(clamp(g.screenT / 0.2, 0, 1));
  ctx.fillStyle = `rgba(8,20,32,${0.6 * a})`;
  ctx.fillRect(0, 0, W, H);
  hit(g, 0, 0, W, H, () => g.closeScreen());
  if (!s) return;

  const w = Math.min(W - 44 * u, 320 * u);
  const h = 300 * u;
  const x0 = W / 2 - w / 2;
  const y0 = H / 2 - h / 2 + (1 - a) * 60 * u;
  const cx = W / 2;
  ctx.fillStyle = PAPER;
  roundRect(ctx, x0, y0, w, h, 22 * u);
  ctx.fill();
  hit(g, x0, y0, w, h, () => {});

  ctx.fillStyle = '#ffd84a';
  roundRect(ctx, cx - 70 * u, y0 + 18 * u, 140 * u, 28 * u, 14 * u);
  ctx.fill();
  setFont(ctx, 13 * u, '900');
  ctx.fillStyle = '#5a3a0c';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText("EARL'S QUEST", cx, y0 + 32.5 * u);

  setFont(ctx, 20 * u, '900');
  ctx.fillStyle = INK;
  let ty = y0 + 72 * u;
  for (const l of wrapText(ctx, s.q.title, w - 40 * u)) {
    ctx.fillText(l, cx, ty);
    ty += 24 * u;
  }
  setFont(ctx, 13.5 * u, '600');
  ctx.fillStyle = SUB;
  ty += 4 * u;
  for (const l of wrapText(ctx, questDetail(s.q), w - 44 * u).slice(0, 4)) {
    ctx.fillText(l, cx, ty);
    ty += 18 * u;
  }

  // Progress and reward
  const fy = y0 + h - 104 * u;
  const facts: [string, string][] = [
    ['Progress', `${Math.min(s.have, s.q.n)} / ${s.q.n}`],
    ['Reward', `${s.q.reward}`],
  ];
  facts.forEach(([k, v], i) => {
    const fx = x0 + w * (i === 0 ? 0.3 : 0.7);
    setFont(ctx, 11 * u, '800');
    ctx.fillStyle = '#8a959d';
    ctx.textAlign = 'center';
    ctx.fillText(k.toUpperCase(), fx, fy);
    setFont(ctx, 17 * u, '900');
    ctx.fillStyle = i === 0 ? BLUE : '#b8860b';
    if (i === 1) {
      const tw = ctx.measureText(v).width;
      drawCoin(ctx, fx - tw / 2 - 6 * u, fy + 21 * u, 7 * u);
      ctx.fillText(v, fx + 6 * u, fy + 22 * u);
    } else {
      ctx.fillText(v, fx, fy + 22 * u);
    }
  });

  const bw = 110 * u;
  const bh = 36 * u;
  const by = y0 + h - 52 * u;
  button(ctx, g, cx - bw - 6 * u, by, bw, bh, 'SKIP', 'off', () => g.skipQuest());
  button(ctx, g, cx + 6 * u, by, bw, bh, 'ON IT', 'use', () => g.closeScreen());
}

// ---------- Tournament ----------

function avatar(ctx: Ctx, x: number, y: number, r: number, color: string, letter: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  setFont(ctx, r * 1.1, '900');
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(letter, x, y + r * 0.06);
}

function drawTourney(ctx: Ctx, g: Game, x: number, y: number, w: number, h: number) {
  const u = g.L.u;
  const spot = spotById(g.save.spot);
  const best = g.save.tourneyBest[spot.id];
  const fx = x + 18 * u;
  const fw = w - 36 * u;

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  setFont(ctx, 13 * u, '800');
  ctx.fillStyle = BLUE;
  ctx.fillText(`Held at: ${spot.name}`, fx, y + 62 * u);

  const rules = [
    '3 minutes. Heaviest total weight wins.',
    'Junk weighs nothing to the judges.',
    `Prizes: ${PRIZES.map((p, i) => `${['1st', '2nd', '3rd', '4th'][i]} ${p}`).join(' · ')}`,
    `+${BEST_BONUS} coins for a new personal best here.`,
  ];
  setFont(ctx, 13 * u, '600');
  ctx.fillStyle = SUB;
  let ty = y + 88 * u;
  for (const r of rules) {
    for (const l of wrapText(ctx, `•  ${r}`, fw)) {
      ctx.fillText(l, fx, ty);
      ty += 18 * u;
    }
  }
  ty += 6 * u;
  setFont(ctx, 14 * u, '900');
  ctx.fillStyle = INK;
  ctx.fillText(best ? `Your best here: ${best.toFixed(1)} lb` : 'Your best here: no entries yet', fx, ty);
  ty += 22 * u;

  // The competition
  setFont(ctx, 11 * u, '800');
  ctx.fillStyle = '#8a959d';
  ctx.fillText('THE COMPETITION', fx, ty);
  ty += 12 * u;
  const bottom = y + h - 72 * u;
  const rh = Math.min(64 * u, (bottom - ty) / RIVALS.length);
  RIVALS.forEach((r, i) => {
    const ry = ty + i * rh;
    avatar(ctx, fx + 18 * u, ry + rh / 2, 16 * u, r.color, r.name[0]);
    ctx.textAlign = 'left';
    setFont(ctx, 14.5 * u, '900');
    ctx.fillStyle = INK;
    ctx.fillText(r.name, fx + 44 * u, ry + rh / 2 - 9 * u);
    setFont(ctx, 12 * u, '600');
    ctx.fillStyle = SUB;
    wrapText(ctx, r.quip, fw - 48 * u).slice(0, 2).forEach((l, k) => {
      ctx.fillText(l, fx + 44 * u, ry + rh / 2 + 8 * u + k * 14 * u);
    });
  });

  button(ctx, g, fx, y + h - 58 * u, fw, 42 * u, 'START  (3:00)', 'buy', () => g.startTourney());
}

function drawTourneyEnd(ctx: Ctx, g: Game, x: number, y: number, w: number, h: number) {
  const r = g.tourneyResult;
  if (!r) return;
  const u = g.L.u;
  const fx = x + 18 * u;
  const fw = w - 36 * u;
  const cx = x + w / 2;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  label(ctx, ['1ST PLACE!', '2ND PLACE', '3RD PLACE', 'LAST PLACE'][r.place], cx, y + 74 * u, 28 * u,
    ['#ffd84a', '#d5dadd', '#e0a26b', '#ff8a7a'][r.place]);
  setFont(ctx, 12.5 * u, '700');
  ctx.fillStyle = SUB;
  ctx.fillText(spotById(r.spot).name, cx, y + 100 * u);

  // Leaderboard
  const ly = y + 118 * u;
  const rh = 46 * u;
  r.rows.forEach((row, i) => {
    const ry = ly + i * rh;
    if (row.you) {
      ctx.fillStyle = '#dff1f8';
      roundRect(ctx, fx, ry + 3 * u, fw, rh - 6 * u, 12 * u);
      ctx.fill();
    }
    setFont(ctx, 16 * u, '900');
    ctx.fillStyle = '#8a959d';
    ctx.textAlign = 'left';
    ctx.fillText(String(i + 1), fx + 12 * u, ry + rh / 2);
    avatar(ctx, fx + 46 * u, ry + rh / 2, 14 * u, row.color, row.name[0]);
    setFont(ctx, 15 * u, '900');
    ctx.fillStyle = INK;
    ctx.textAlign = 'left';
    ctx.fillText(row.name, fx + 68 * u, ry + rh / 2);
    ctx.textAlign = 'right';
    ctx.fillStyle = row.you ? BLUE : SUB;
    ctx.fillText(`${row.total.toFixed(1)} lb`, fx + fw - 12 * u, ry + rh / 2);
  });

  // Your numbers
  let ty = ly + rh * r.rows.length + 22 * u;
  ctx.textAlign = 'center';
  setFont(ctx, 13 * u, '700');
  ctx.fillStyle = SUB;
  ctx.fillText(
    `${r.count} fish landed  ·  biggest ${r.biggest.toFixed(1)} lb`, cx, ty,
  );
  ty += 26 * u;
  if (r.best) {
    ctx.fillStyle = '#f2a81d';
    roundRect(ctx, cx - 100 * u, ty - 13 * u, 200 * u, 26 * u, 13 * u);
    ctx.fill();
    setFont(ctx, 13 * u, '900');
    ctx.fillStyle = '#fff';
    ctx.fillText(`NEW PERSONAL BEST  +${BEST_BONUS}`, cx, ty + 0.5 * u);
    ty += 34 * u;
  }
  setFont(ctx, 22 * u, '900');
  const prize = `+${r.prize}`;
  const pw = ctx.measureText(prize).width;
  drawCoin(ctx, cx - pw / 2 - 8 * u, ty + 6 * u, 10 * u);
  ctx.fillStyle = '#b8860b';
  ctx.textAlign = 'left';
  ctx.fillText(prize, cx - pw / 2 + 8 * u, ty + 7 * u);

  button(ctx, g, fx, y + h - 58 * u, fw, 42 * u, 'COLLECT', 'use', () => g.closeScreen());
}

function label(ctx: Ctx, s: string, x: number, y: number, size: number, color: string) {
  setFont(ctx, size, '900');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = size * 0.28;
  ctx.strokeStyle = 'rgba(15,30,45,0.85)';
  ctx.strokeText(s, x, y);
  ctx.fillStyle = color;
  ctx.fillText(s, x, y);
}

// ---------- Map ----------

/** Lumpy lake outline through a ring of points, smoothed with midpoint curves. */
function lakePath(ctx: Ctx, cx: number, cy: number, rx: number, ry: number) {
  const bumps = [1, 0.92, 1.05, 0.88, 1.02, 0.95, 1.08, 0.9, 1, 0.94, 1.04, 0.9];
  const pts = bumps.map((b, i) => {
    const a = (i / bumps.length) * Math.PI * 2;
    return { x: cx + Math.cos(a) * rx * b, y: cy + Math.sin(a) * ry * b };
  });
  ctx.beginPath();
  const mid = (i: number) => {
    const p = pts[i % pts.length];
    const q = pts[(i + 1) % pts.length];
    return { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
  };
  const m0 = mid(0);
  ctx.moveTo(m0.x, m0.y);
  for (let i = 1; i <= pts.length; i++) {
    const p = pts[i % pts.length];
    const m = mid(i);
    ctx.quadraticCurveTo(p.x, p.y, m.x, m.y);
  }
  ctx.closePath();
}

/** A tiny picture of each spot, drawn in a 40-unit circle. */
function spotIcon(ctx: Ctx, id: string, t: number) {
  switch (id) {
    case 'pier':
      ctx.fillStyle = '#c69a62';
      ctx.fillRect(-6, -14, 12, 26);
      ctx.fillStyle = 'rgba(95,62,30,0.6)';
      for (const y of [-8, -2, 4]) ctx.fillRect(-6, y, 12, 1.5);
      break;
    case 'cove':
      ctx.fillStyle = '#5aac45';
      ctx.beginPath();
      ctx.arc(-3, 2, 10, 0.4, Math.PI * 2 - 0.4);
      ctx.lineTo(-3, 2);
      ctx.fill();
      ctx.fillStyle = '#ffd1e6';
      ctx.beginPath();
      ctx.arc(7, -6, 5, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'dropoff':
      ctx.fillStyle = '#fff';
      roundRect(ctx, -5, -12 + Math.sin(t * 2) * 1.5, 10, 22, 3);
      ctx.fill();
      ctx.fillStyle = '#e8402f';
      ctx.fillRect(-5, -5 + Math.sin(t * 2) * 1.5, 10, 5);
      break;
    case 'stumps':
      ctx.fillStyle = '#5e4630';
      for (const [x, h] of [[-7, 14], [5, 20]] as const) {
        ctx.beginPath();
        ctx.moveTo(x - 4, 8);
        ctx.lineTo(x - 3, 8 - h);
        ctx.lineTo(x + 3, 6 - h);
        ctx.lineTo(x + 4, 8);
        ctx.fill();
      }
      break;
  }
}

function padlock(ctx: Ctx) {
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, -3, 6, Math.PI, 0);
  ctx.stroke();
  ctx.fillStyle = '#fff';
  roundRect(ctx, -9, -3, 18, 14, 3);
  ctx.fill();
  ctx.fillStyle = '#7d8791';
  ctx.beginPath();
  ctx.arc(0, 4, 2.5, 0, Math.PI * 2);
  ctx.fill();
}

/** Side-on picture of the boat for the shop card. */
function miniBoat(ctx: Ctx) {
  ctx.fillStyle = '#c8202f';
  ctx.beginPath();
  ctx.moveTo(-30, -2);
  ctx.lineTo(28, -2);
  ctx.quadraticCurveTo(36, -3, 33, 2);
  ctx.lineTo(22, 10);
  ctx.lineTo(-28, 10);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#f2f2ee';
  ctx.fillRect(-30, -4, 60, 3);
  ctx.fillStyle = '#2b3036';
  roundRect(ctx, -38, -10, 9, 14, 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,220,220,0.8)';
  for (const [x, y] of [[-18, 3], [-4, 6], [10, 2], [18, 6]] as const) {
    ctx.beginPath();
    ctx.arc(x, y, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawMap(ctx: Ctx, g: Game, x: number, y: number, w: number, h: number) {
  const u = g.L.u;
  const s = g.save;
  const here = spotById(s.spot);

  setFont(ctx, 15 * u, '900');
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = BLUE;
  ctx.fillText(here.short, x + w - 54 * u, y + 31 * u);

  // Land, then the lake
  const footH = 132 * u;
  const mx = x + 14 * u;
  const my = y + 58 * u;
  const mw = w - 28 * u;
  const mh = h - 58 * u - footH - 8 * u;
  ctx.fillStyle = '#a8d58a';
  roundRect(ctx, mx, my, mw, mh, 16 * u);
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = '#7fb866';
  for (let i = 0; i < 18; i++) {
    const tx = mx + ((i * 0.37) % 1) * mw;
    const ty = my + ((i * 0.61) % 1) * mh;
    ctx.beginPath();
    ctx.arc(tx, ty, (8 + (i % 3) * 3) * u, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  const lcx = mx + mw / 2;
  const lcy = my + mh / 2;
  const lrx = mw * 0.44;
  const lry = mh * 0.44;
  ctx.fillStyle = '#e8d9a8';
  lakePath(ctx, lcx, lcy, lrx + 6 * u, lry + 6 * u);
  ctx.fill();
  const lake = ctx.createLinearGradient(0, my, 0, my + mh);
  lake.addColorStop(0, '#2f86b8');
  lake.addColorStop(1, '#6cc4e4');
  ctx.fillStyle = lake;
  lakePath(ctx, lcx, lcy, lrx, lry);
  ctx.fill();
  // A couple of map-style wave marks
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1.5 * u;
  for (const [wx, wy] of [[0.35, 0.3], [0.7, 0.62], [0.42, 0.72], [0.3, 0.12]] as const) {
    const px = mx + mw * wx;
    const py = my + mh * wy;
    ctx.beginPath();
    ctx.moveTo(px - 8 * u, py);
    ctx.quadraticCurveTo(px - 4 * u, py - 4 * u, px, py);
    ctx.quadraticCurveTo(px + 4 * u, py + 4 * u, px + 8 * u, py);
    ctx.stroke();
  }

  // Spots
  const at = (sp: Spot) => ({
    px: lcx + (sp.mapX - 0.5) * 2 * lrx * 0.82,
    py: lcy + (sp.mapY - 0.5) * 2 * lry * 0.86,
  });
  for (const sp of SPOTS) {
    const { px, py } = at(sp);
    const locked = sp.boat && !s.boat;
    const current = sp.id === s.spot;
    const r = 24 * u;

    if (current) {
      ctx.strokeStyle = '#ffd84a';
      ctx.lineWidth = 4 * u;
      ctx.globalAlpha = 0.6 + 0.4 * Math.sin(g.time * 4);
      ctx.beginPath();
      ctx.arc(px, py, r + 6 * u, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = locked ? '#8a959d' : sp.water[1];
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3 * u;
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.save();
    ctx.translate(px, py);
    ctx.scale(u, u);
    if (locked) padlock(ctx);
    else spotIcon(ctx, sp.id, g.time);
    ctx.restore();

    // Name tag
    setFont(ctx, 11.5 * u, '900');
    const tag = current ? `${sp.name} (here)` : sp.name;
    const tw = ctx.measureText(tag).width + 14 * u;
    const tx = clamp(px - tw / 2, mx + 4 * u, mx + mw - 4 * u - tw);
    const ty = py + r + 6 * u;
    ctx.fillStyle = current ? '#ffd84a' : 'rgba(10,30,45,0.78)';
    roundRect(ctx, tx, ty, tw, 19 * u, 9.5 * u);
    ctx.fill();
    ctx.fillStyle = current ? INK : '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(tag, tx + tw / 2, ty + 10 * u);

    hit(g, px - r, py - r, r * 2, r * 2 + 26 * u, () => g.goTo(sp.id), 6 * u);
  }

  // Footer: buy the boat, or what this spot is about
  const fy = my + mh + 12 * u;
  const fx = x + 18 * u;
  const fw = w - 36 * u;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  if (!s.boat) {
    ctx.save();
    ctx.translate(fx + 36 * u, fy + 28 * u);
    ctx.scale(u * 1.1, u * 1.1);
    miniBoat(ctx);
    ctx.restore();
    setFont(ctx, 16 * u, '900');
    ctx.fillStyle = INK;
    ctx.fillText(`The ${BOAT.name}`, fx + 84 * u, fy + 16 * u);
    setFont(ctx, 12.5 * u, '600');
    ctx.fillStyle = SUB;
    wrapText(ctx, BOAT.desc, fw - 84 * u).slice(0, 3).forEach((l, i) => {
      ctx.fillText(l, fx + 84 * u, fy + 36 * u + i * 15.5 * u);
    });
    const bw = fw;
    const bh = 40 * u;
    button(
      ctx, g, fx, fy + footH - bh - 14 * u, bw, bh,
      `BUY THE BOAT  ${BOAT.price}`, s.coins >= BOAT.price ? 'buy' : 'broke', () => g.buyBoat(),
    );
  } else {
    setFont(ctx, 16 * u, '900');
    ctx.fillStyle = INK;
    ctx.fillText(here.name, fx, fy + 16 * u);
    setFont(ctx, 13 * u, '600');
    ctx.fillStyle = SUB;
    wrapText(ctx, here.blurb, fw).slice(0, 3).forEach((l, i) => {
      ctx.fillText(l, fx, fy + 38 * u + i * 16 * u);
    });
    setFont(ctx, 12 * u, '700');
    ctx.fillStyle = '#a3adb5';
    ctx.textAlign = 'center';
    ctx.fillText('Tap a spot to head there', x + w / 2, fy + footH - 24 * u);
  }
}

function drawShop(ctx: Ctx, g: Game, x: number, y: number, w: number, h: number) {
  const u = g.L.u;
  const s = g.save;

  // Purse
  setFont(ctx, 15 * u, '900');
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#b8860b';
  const purse = String(s.coins);
  ctx.fillText(purse, x + w - 54 * u, y + 31 * u);
  drawCoin(ctx, x + w - 66 * u - ctx.measureText(purse).width, y + 30 * u, 7 * u);

  // Tabs
  const tabs = [['gear', 'Gear'], ['lures', 'Lures'], ['hats', 'Hats']] as const;
  const tw = (w - 36 * u - 16 * u) / 3;
  tabs.forEach(([id, name], i) => {
    const tx = x + 18 * u + i * (tw + 8 * u);
    button(ctx, g, tx, y + 56 * u, tw, 32 * u, name, g.shopTab === id ? 'use' : 'off', () => {
      g.shopTab = id;
    });
  });

  const listY = y + 104 * u;
  const rows = g.shopTab === 'gear' ? 3 : g.shopTab === 'lures' ? LURES.length : HATS.length;
  const rh = Math.min(104 * u, (h - 104 * u - 12 * u) / rows);
  const bw = 92 * u;
  const bh = 36 * u;

  const row = (
    i: number, title: string, sub: string, label: string, kind: BtnKind,
    fn: (() => void) | undefined, coin: boolean, icon?: () => void, pips?: [number, number],
  ) => {
    const ry = listY + i * rh;
    if (i > 0) {
      ctx.strokeStyle = '#e6e0d2';
      ctx.lineWidth = 1.5 * u;
      ctx.beginPath();
      ctx.moveTo(x + 18 * u, ry);
      ctx.lineTo(x + w - 18 * u, ry);
      ctx.stroke();
    }
    const tx = x + (icon ? 66 : 18) * u;
    if (icon) {
      ctx.save();
      ctx.translate(x + 38 * u, ry + rh / 2 + 10 * u);
      ctx.scale(u * 1.15, u * 1.15);
      icon();
      ctx.restore();
    }
    setFont(ctx, 15.5 * u, '900');
    ctx.fillStyle = INK;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, tx, ry + 20 * u);
    if (pips) {
      const px = tx + ctx.measureText(title).width + 12 * u;
      for (let k = 0; k < pips[1]; k++) {
        ctx.fillStyle = k <= pips[0] ? GREEN : '#d5dadd';
        ctx.beginPath();
        ctx.arc(px + k * 11 * u, ry + 20 * u, 4 * u, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    setFont(ctx, 12.5 * u, '600');
    ctx.fillStyle = SUB;
    const lines = wrapText(ctx, sub, x + w - 18 * u - bw - 12 * u - tx).slice(0, 4);
    lines.forEach((l, k) => ctx.fillText(l, tx, ry + 40 * u + k * 15.5 * u));
    button(ctx, g, x + w - 18 * u - bw, ry + rh / 2 - bh / 2, bw, bh, label, kind, fn, coin);
  };

  if (g.shopTab === 'gear') {
    (['rod', 'reel', 'line'] as UpgradeKind[]).forEach((kind, i) => {
      const { label, tiers } = UPGRADES[kind];
      const have = s[kind];
      const next = tiers[have + 1];
      const title = `${label}: ${tiers[have].name}`;
      if (next) {
        row(
          i, title, `Next: ${next.name}. ${next.desc}`, String(next.price),
          s.coins >= next.price ? 'buy' : 'broke', () => g.buyUpgrade(kind), true,
          undefined, [have, tiers.length],
        );
      } else {
        row(i, title, tiers[have].desc, 'MAXED', 'off', undefined, false, undefined, [have, tiers.length]);
      }
    });
  } else {
    const hats = g.shopTab === 'hats';
    const items = hats ? HATS : LURES;
    const owned = hats ? s.hats : s.lures;
    const inUse = hats ? s.hat : s.lure;
    items.forEach((it, i) => {
      const icon = hats
        ? () => {
            ctx.fillStyle = '#eec39a';
            ctx.beginPath();
            ctx.arc(0, 0, 13, 0, Math.PI * 2);
            ctx.fill();
            drawHat(ctx, it.id, g.time);
          }
        : undefined;
      const act = () => (hats ? g.pickHat(it.id) : g.pickLure(it.id));
      if (it.id === inUse) row(i, it.name, it.desc, hats ? 'WEARING' : 'IN USE', 'on', undefined, false, icon);
      else if (owned.includes(it.id)) row(i, it.name, it.desc, hats ? 'WEAR' : 'USE', 'use', act, false, icon);
      else row(i, it.name, it.desc, String(it.price), s.coins >= it.price ? 'buy' : 'broke', act, true, icon);
    });
  }
}

// ---------- Journal ----------

const silhouettes = new Map<string, HTMLCanvasElement>();

/** A dark cut-out of a catch, for things not yet discovered. */
function silhouette(c: Catch): HTMLCanvasElement {
  let cv = silhouettes.get(c.id);
  if (!cv) {
    cv = document.createElement('canvas');
    cv.width = 300;
    cv.height = 300;
    const sc = cv.getContext('2d')!;
    drawCatch(sc, c.look, 150, 150, c.look.kind === 'fish' ? 220 : 170, 0.4);
    sc.globalCompositeOperation = 'source-in';
    sc.fillStyle = '#93a1ac';
    sc.fillRect(0, 0, 300, 300);
    silhouettes.set(c.id, cv);
  }
  return cv;
}

function where(c: Catch): string {
  if (c.spots) return c.spots.length === 1 ? spotById(c.spots[0]).short : 'by boat';
  const [a, b] = c.band;
  if (a <= 0 && b >= 1) return 'anywhere';
  const mid = (a + b) / 2;
  return mid < 0.35 ? 'near the pier' : mid < 0.68 ? 'mid-lake' : 'far out';
}

function drawJournal(ctx: Ctx, g: Game, x: number, y: number, w: number, h: number) {
  const u = g.L.u;
  const s = g.save;

  setFont(ctx, 15 * u, '900');
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = GREEN;
  ctx.fillText(`${g.found()} / ${CATALOG.length}`, x + w - 54 * u, y + 31 * u);

  const cols = CATALOG.length > 15 ? 4 : 3;
  const rows = Math.ceil(CATALOG.length / cols);
  const gap = 8 * u;
  const gx = x + 14 * u;
  const gy = y + 60 * u;
  const cw = (w - 28 * u - gap * (cols - 1)) / cols;
  const ch = Math.min(116 * u, (h - 60 * u - 14 * u - gap * (rows - 1)) / rows);

  CATALOG.forEach((c, i) => {
    const cx = gx + (i % cols) * (cw + gap);
    const cy = gy + Math.floor(i / cols) * (ch + gap);
    const known = !!s.records[c.id];
    ctx.fillStyle = known ? '#dff1f8' : '#eceff1';
    roundRect(ctx, cx, cy, cw, ch, 12 * u);
    ctx.fill();

    const artY = cy + ch * 0.42;
    const fish = c.look.kind === 'fish';
    if (known) {
      drawCatch(ctx, c.look, cx + cw / 2 + (fish ? 3 * u : 0), artY, Math.min(cw * (fish ? 0.74 : 0.5), ch * 0.9), g.time);
    } else {
      const size = Math.min(cw, ch) * 1.02;
      ctx.drawImage(silhouette(c), cx + cw / 2 - size / 2, artY - size / 2, size, size);
    }
    // Shrink long names until they fit the card.
    const name = known ? c.name : '???';
    let size = 11.5;
    setFont(ctx, size * u, '800');
    while (size > 8 && ctx.measureText(name).width > cw - 8 * u) {
      size -= 0.5;
      setFont(ctx, size * u, '800');
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = known ? INK : '#8a959d';
    ctx.fillText(name, cx + cw / 2, cy + ch - 11 * u);
    if (known && (s.counts[c.id] ?? 0) > 1) {
      setFont(ctx, 10.5 * u, '800');
      ctx.textAlign = 'right';
      ctx.fillStyle = BLUE;
      ctx.fillText(`x${s.counts[c.id]}`, cx + cw - 8 * u, cy + 12 * u);
    }
    hit(g, cx, cy, cw, ch, () => g.openEntry(c.id));
  });

  if (g.journalSel) drawEntry(ctx, g);
}

function drawEntry(ctx: Ctx, g: Game) {
  const c = CATALOG.find((k) => k.id === g.journalSel);
  if (!c) return;
  const { W, H, u } = g.L;
  const s = g.save;
  const known = !!s.records[c.id];

  ctx.fillStyle = 'rgba(8,20,32,0.6)';
  ctx.fillRect(0, 0, W, H);
  hit(g, 0, 0, W, H, () => {
    g.journalSel = null;
  });

  const w = Math.min(W - 44 * u, 320 * u);
  const h = 400 * u;
  const x0 = W / 2 - w / 2;
  const y0 = H / 2 - h / 2 + 20 * u;
  const cx = W / 2;
  ctx.fillStyle = PAPER;
  roundRect(ctx, x0, y0, w, h, 22 * u);
  ctx.fill();

  const py = y0 + 96 * u;
  const pr = 70 * u;
  const bg = ctx.createLinearGradient(0, py - pr, 0, py + pr);
  bg.addColorStop(0, known ? '#bfe9f7' : '#e3e7ea');
  bg.addColorStop(1, known ? '#6fc0e3' : '#c5ccd2');
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.arc(cx, py, pr, 0, Math.PI * 2);
  ctx.fill();
  const fish = c.look.kind === 'fish';
  if (known) {
    drawCatch(ctx, c.look, cx + (fish ? 5 * u : 0), py, (fish ? 122 : 94) * u, g.time);
  } else {
    ctx.drawImage(silhouette(c), cx - 84 * u, py - 84 * u, 168 * u, 168 * u);
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  setFont(ctx, 24 * u, '900');
  ctx.fillStyle = INK;
  ctx.fillText(known ? c.name : '???', cx, y0 + 196 * u);

  setFont(ctx, 14 * u, '600');
  ctx.fillStyle = SUB;
  let ty = y0 + 226 * u;
  const body = known ? c.desc : 'Not caught yet. Earl says it exists. Earl says a lot of things.';
  for (const l of wrapText(ctx, body, w - 44 * u)) {
    ctx.fillText(l, cx, ty);
    ty += 18 * u;
  }

  // Facts
  const facts: [string, string][] = known
    ? [
        ['Caught', String(s.counts[c.id] ?? 1)],
        ['Biggest', `${s.records[c.id].toFixed(1)} lb`],
        ['Bites', where(c)],
      ]
    : [['Bites', where(c)]];
  const fy = y0 + h - 78 * u;
  const fw = (w - 36 * u) / facts.length;
  facts.forEach(([k, v], i) => {
    const fx = x0 + 18 * u + fw * (i + 0.5);
    setFont(ctx, 11 * u, '800');
    ctx.fillStyle = '#8a959d';
    ctx.fillText(k.toUpperCase(), fx, fy);
    setFont(ctx, 15 * u, '900');
    ctx.fillStyle = BLUE;
    ctx.fillText(v, fx, fy + 20 * u);
  });

  setFont(ctx, 12 * u, '700');
  ctx.fillStyle = '#a3adb5';
  ctx.fillText('Tap to close', cx, y0 + h - 20 * u);
}
