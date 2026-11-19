/**
 * Sky, far shore and open water, drawn with depth cues: layered ridges that
 * fade into haze, lit trees, their reflection, waves that shrink and soften
 * toward the horizon, and the sun glittering on the water.
 *
 * Everything that never moves is baked into an offscreen canvas per spot and
 * screen size, so the per-frame cost stays low on a phone.
 */
import { Game, project } from './game';
import { clamp, lerp } from './util';

type Ctx = CanvasRenderingContext2D;

/** The pale blue the air turns everything far away into. */
export const HAZE = '#dcedf7';

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Blend two #rrggbb colours; t = 0 gives a, 1 gives b. Returns #rrggbb. */
export function mix(a: string, b: string, t: number): string {
  const A = rgb(a);
  const B = rgb(b);
  const c = A.map((v, i) => Math.round(lerp(v, B[i], t)));
  return '#' + ((1 << 24) | (c[0] << 16) | (c[1] << 8) | c[2]).toString(16).slice(1);
}

export function rgba(hex: string, a: number): string {
  const [r, g, b] = rgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

/** Stable pseudo-random 0..1 for an index. */
const hash = (i: number) => {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/** Where the sun sits. The light comes from here, so lit sides face right. */
export function sunPos(g: Game) {
  const { W, u, horizon } = g.L;
  return { x: W * 0.8, y: horizon - 78 * u };
}

// ---------- Sky (live: the clouds drift) ----------

export function drawSky(ctx: Ctx, g: Game) {
  const { W, u, horizon } = g.L;
  const sky = ctx.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, '#3d98dc');
  sky.addColorStop(0.55, '#86c9f1');
  sky.addColorStop(0.88, '#cfeaf8');
  sky.addColorStop(1, '#eef6f4');
  ctx.fillStyle = sky;
  ctx.fillRect(-30, -30, W + 60, horizon + 30);

  const sun = sunPos(g);
  const glow = ctx.createRadialGradient(sun.x, sun.y, 0, sun.x, sun.y, 110 * u);
  glow.addColorStop(0, 'rgba(255,248,214,0.95)');
  glow.addColorStop(0.25, 'rgba(255,244,200,0.45)');
  glow.addColorStop(1, 'rgba(255,244,200,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(sun.x - 110 * u, sun.y - 110 * u, 220 * u, 220 * u);
  ctx.fillStyle = '#fffbe8';
  ctx.beginPath();
  ctx.arc(sun.x, sun.y, 20 * u, 0, Math.PI * 2);
  ctx.fill();

  // A thin, slow, far layer near the horizon, then the big puffy ones.
  for (let i = 0; i < 4; i++) {
    const span = W + 140 * u;
    const x = ((i * 113 * u + g.time * 2 * u) % span) - 70 * u;
    cloud(ctx, x, horizon - (36 + (i % 2) * 9) * u, 0.45 * u, 0.55);
  }
  for (let i = 0; i < 3; i++) {
    const span = W + 200 * u;
    const x = ((i * 151 * u + g.time * (5 + i * 3) * u) % span) - 100 * u;
    cloud(ctx, x, horizon - (70 + i * 34) * u, (0.85 + i * 0.2) * u, 1);
  }
}

/** A cloud with a grey underside, so it reads as a lump and not a sticker. */
function cloud(ctx: Ctx, x: number, y: number, s: number, alpha: number) {
  const puffs: [number, number, number][] = [[0, 0, 16], [20, -9, 21], [42, -3, 17], [60, 3, 12], [28, 4, 15]];
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#bcd3e4';
  ctx.beginPath();
  for (const [px, py, r] of puffs) {
    ctx.moveTo(x + (px + r) * s, y + (py + 3) * s);
    ctx.arc(x + px * s, y + (py + 3) * s, r * s, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  for (const [px, py, r] of puffs) {
    ctx.moveTo(x + (px + r * 0.92) * s, y + (py - 1.5) * s);
    ctx.arc(x + px * s, y + (py - 1.5) * s, r * 0.92 * s, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.globalAlpha = 1;
}

// ---------- The baked backdrop: far shore, reflection, still water ----------

let baked: { key: string; canvas: HTMLCanvasElement } | null = null;

export function drawBackdrop(ctx: Ctx, g: Game) {
  const { W, H } = g.L;
  // The soft background does not need full retina resolution.
  const dpr = Math.min(ctx.getTransform().a || 1, 2);
  const key = `${g.save.spot}|${g.onBoat()}|${W}|${H}|${dpr}`;
  if (!baked || baked.key !== key) {
    const canvas = baked?.canvas ?? document.createElement('canvas');
    canvas.width = Math.round((W + 60) * dpr);
    canvas.height = Math.round((H + 60) * dpr);
    const c = canvas.getContext('2d')!;
    c.setTransform(dpr, 0, 0, dpr, 30 * dpr, 30 * dpr);
    bake(c, g);
    baked = { key, canvas };
  }
  ctx.drawImage(baked.canvas, -30, -30, W + 60, H + 60);
}

interface Tree { x: number; r: number; pine: boolean; seed: number }

function treeRow(W: number, u: number, n: number, rMin: number, rMax: number, seed: number, pines: number): Tree[] {
  const out: Tree[] = [];
  for (let i = 0; i <= n; i++) {
    out.push({
      x: (i / n) * W + (hash(seed + i) - 0.5) * (W / n) * 0.9,
      r: lerp(rMin, rMax, hash(seed + i + 50)) * u,
      pine: hash(seed + i + 90) < pines,
      seed: seed * 31 + i * 7,
    });
  }
  return out;
}

/** Shadow, body and sunlit colours for a row of trees. Reflections use `dark` only. */
interface Palette { dark: string; mid?: string; light?: string; trunk?: string }

/** Draws a row of trees standing on `base`. */
function drawTrees(ctx: Ctx, trees: Tree[], base: number, pal: Palette) {
  for (const t of trees) {
    if (t.pine) pine(ctx, t, base, pal);
    else broadleaf(ctx, t, base, pal);
  }
}

/** A leafy tree: a trunk under a dome of foliage clumps, lit from the upper right. */
function broadleaf(ctx: Ctx, t: Tree, base: number, pal: Palette) {
  const r = t.r;
  const cx = t.x;
  const cy = base - r * 1.15;
  if (pal.trunk) {
    ctx.fillStyle = pal.trunk;
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.13, base);
    ctx.lineTo(cx - r * 0.07, cy);
    ctx.lineTo(cx + r * 0.07, cy);
    ctx.lineTo(cx + r * 0.13, base);
    ctx.closePath();
    ctx.fill();
  }
  const clumps: [number, number, number][] = [];
  const n = 7;
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + hash(t.seed + k) * 0.7;
    const d = r * 0.52 * (0.75 + hash(t.seed + k + 20) * 0.4);
    clumps.push([cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.8, r * (0.4 + hash(t.seed + k + 40) * 0.18)]);
  }
  clumps.push([cx, cy - r * 0.1, r * 0.55]);
  const blob = (dx: number, dy: number, k: number, keep: (c: [number, number, number]) => boolean) => {
    ctx.beginPath();
    for (const c of clumps) {
      if (!keep(c)) continue;
      const x = c[0] + c[2] * dx;
      const y = c[1] + c[2] * dy;
      ctx.moveTo(x + c[2] * k, y);
      ctx.arc(x, y, c[2] * k, 0, Math.PI * 2);
    }
    ctx.fill();
  };
  ctx.fillStyle = pal.dark;
  blob(0, 0, 1, () => true);
  if (pal.mid) {
    ctx.fillStyle = pal.mid;
    blob(0.18, -0.22, 0.7, (c) => c[1] < cy + r * 0.3);
  }
  if (pal.light) {
    ctx.fillStyle = pal.light;
    blob(0.3, -0.36, 0.4, (c) => c[0] - cx - (c[1] - cy) > r * 0.15);
  }
}

/** A conifer: tiers of drooping boughs, narrowing to a point. */
function pine(ctx: Ctx, t: Tree, base: number, pal: Palette) {
  const r = t.r * 0.95;
  const x = t.x;
  const h = r * 3.6;
  if (pal.trunk) {
    ctx.fillStyle = pal.trunk;
    ctx.fillRect(x - r * 0.09, base - r * 0.6, r * 0.18, r * 0.6);
  }
  const tiers = 4;
  for (let i = 0; i < tiers; i++) {
    const y0 = base - r * 0.4 - i * h * 0.19;
    const w = r * (1 - i * 0.2);
    const top = i === tiers - 1 ? base - h : y0 - h * 0.34;
    const droop = r * 0.14;
    ctx.fillStyle = pal.dark;
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x + w, y0);
    ctx.lineTo(x + w * 0.55, y0 - droop);
    ctx.lineTo(x + w * 0.2, y0 + droop * 0.3);
    ctx.lineTo(x - w * 0.2, y0 - droop * 0.6);
    ctx.lineTo(x - w * 0.6, y0 + droop * 0.2);
    ctx.lineTo(x - w, y0);
    ctx.closePath();
    ctx.fill();
    if (pal.mid) {
      ctx.fillStyle = pal.mid;
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x + w, y0);
      ctx.lineTo(x + w * 0.55, y0 - droop);
      ctx.lineTo(x + w * 0.2, y0 + droop * 0.3);
      ctx.lineTo(x + w * 0.05, y0 - droop);
      ctx.closePath();
      ctx.fill();
    }
  }
}

function ridge(ctx: Ctx, W: number, base: number, heightAt: (xs: number) => number, u: number) {
  ctx.beginPath();
  ctx.moveTo(-30, base);
  for (let x = -30; x <= W + 30; x += 8) ctx.lineTo(x, base - heightAt(x / u) * u);
  ctx.lineTo(W + 30, base);
  ctx.closePath();
  ctx.fill();
}

const MOUNTAINS = (xs: number) => 40 + 15 * Math.sin(xs * 0.007 + 2) + 9 * Math.sin(xs * 0.019 + 0.5) + 3 * Math.sin(xs * 0.06);
const HILLS = (xs: number) => 17 + 9 * Math.sin(xs * 0.012 + 1) + 5 * Math.sin(xs * 0.031);

function bake(c: Ctx, g: Game) {
  const { W, H, u, horizon } = g.L;
  const spot = g.spot();
  const [w0, w1, w2] = spot.water;
  const [hill, tree] = spot.bank;
  const waterTop = horizon + 1 * u;

  // Water: a mirror of the hazy sky far away, the lake's own deep colour up close.
  const water = c.createLinearGradient(0, waterTop, 0, H);
  water.addColorStop(0, mix(w0, HAZE, 0.45));
  water.addColorStop(0.1, w0);
  water.addColorStop(0.45, w1);
  water.addColorStop(1, w2);
  c.fillStyle = water;
  c.fillRect(-30, waterTop, W + 60, H - waterTop + 30);

  const back = treeRow(W, u, 52, 4.5, 8, 1, 0.35);
  const front = treeRow(W, u, 36, 7, 13.5, 200, 0.3);

  // The far bank, upside down in the water, broken up by ripples.
  c.save();
  c.beginPath();
  c.rect(-30, waterTop, W + 60, 80 * u);
  c.clip();
  c.translate(0, waterTop);
  c.scale(1, -0.8);
  c.translate(0, -waterTop);
  c.fillStyle = mix(mix(hill, HAZE, 0.4), w0, 0.45);
  ridge(c, W, waterTop, HILLS, u);
  drawTrees(c, back, waterTop, { dark: mix(mix(tree, HAZE, 0.3), w0, 0.4) });
  drawTrees(c, front, waterTop, { dark: mix(tree, w1, 0.35) });
  c.restore();
  c.fillStyle = rgba(w0, 0.45);
  for (let y = waterTop + 2 * u; y < waterTop + 70 * u; y += 3.2 * u) {
    for (let x = -30; x < W + 30; x += 40 * u) {
      const off = hash(Math.floor(y) * 7 + Math.floor(x)) * 30 * u;
      c.fillRect(x + off, y, 26 * u, 1.1 * u);
    }
  }
  const fade = c.createLinearGradient(0, waterTop, 0, waterTop + 70 * u);
  fade.addColorStop(0, rgba(w0, 0.1));
  fade.addColorStop(1, rgba(w0, 1));
  c.fillStyle = fade;
  c.fillRect(-30, waterTop + 20 * u, W + 60, 50 * u);
  // The fade's last strip has to blend into the water gradient underneath.
  const blend = c.createLinearGradient(0, waterTop + 60 * u, 0, waterTop + 90 * u);
  blend.addColorStop(0, rgba(w0, 1));
  blend.addColorStop(1, rgba(w0, 0));
  c.fillStyle = blend;
  c.fillRect(-30, waterTop + 60 * u, W + 60, 30 * u);

  // The sun's long soft glow on the water.
  const sun = sunPos(g);
  c.save();
  c.translate(sun.x, waterTop);
  c.scale(0.28, 1);
  const glow = c.createRadialGradient(0, 0, 0, 0, 0, 260 * u);
  glow.addColorStop(0, 'rgba(255,250,225,0.55)');
  glow.addColorStop(0.4, 'rgba(255,250,225,0.18)');
  glow.addColorStop(1, 'rgba(255,250,225,0)');
  c.fillStyle = glow;
  c.fillRect(-260 * u, 0, 520 * u, 260 * u);
  c.restore();

  // Far mountains, nearly lost in the haze; then hills; then two rows of trees.
  c.fillStyle = mix(mix(tree, '#6f8fb0', 0.35), HAZE, 0.62);
  ridge(c, W, horizon, MOUNTAINS, u);
  c.fillStyle = mix(hill, HAZE, 0.32);
  ridge(c, W, horizon, HILLS, u);
  drawTrees(c, back, horizon, { dark: mix(tree, HAZE, 0.4), mid: mix(tree, HAZE, 0.3) });
  // Undergrowth along the bank, so the trees stand in a wood and not on a line.
  c.fillStyle = mix(tree, '#0c1d14', 0.3);
  ridge(c, W, horizon + 1 * u, (xs) => 6.5 + 2.5 * Math.sin(xs * 0.09) + 1.8 * Math.sin(xs * 0.23 + 1), u);
  drawTrees(c, front, horizon + 1 * u, {
    dark: mix(tree, '#0c1d14', 0.28),
    mid: mix(tree, HAZE, 0.06),
    light: mix(mix(tree, HAZE, 0.06), '#f2f0b4', 0.2),
    trunk: mix('#4a3826', HAZE, 0.2),
  });

  // Air between you and the shore: a haze band right where land meets water.
  const haze = c.createLinearGradient(0, horizon - 40 * u, 0, horizon + 14 * u);
  haze.addColorStop(0, rgba(HAZE, 0));
  haze.addColorStop(0.7, rgba(HAZE, 0.35));
  haze.addColorStop(1, rgba(HAZE, 0));
  c.fillStyle = haze;
  c.fillRect(-30, horizon - 40 * u, W + 60, 54 * u);

  // Shoreline: a sunlit lip of sand, then the dark line where it meets the water.
  c.fillStyle = 'rgba(240,232,196,0.7)';
  c.fillRect(-30, horizon - 0.5 * u, W + 60, 1.6 * u);
  c.fillStyle = 'rgba(10,30,30,0.22)';
  c.fillRect(-30, horizon + 1.1 * u, W + 60, 1.4 * u);

  // From out on the lake, the pier is a speck on the near-left shore.
  if (g.onBoat()) {
    const px = W * 0.12;
    c.fillStyle = '#7a5a3a';
    c.fillRect(px, horizon - 1 * u, 26 * u, 3 * u);
    for (const k of [0, 1, 2]) c.fillRect(px + k * 11 * u, horizon - 1 * u, 2 * u, 6 * u);
    c.fillStyle = 'rgba(80,60,40,0.3)';
    c.fillRect(px, horizon + 4 * u, 26 * u, 2 * u);
  }
}

// ---------- Live water: waves and sun glitter ----------

export function drawWaves(ctx: Ctx, g: Game) {
  const { u } = g.L;
  const t = g.time;
  const N = 30;
  // Rows of chop roll slowly toward you.
  const f = (t * 0.35) % 1;
  ctx.lineCap = 'round';
  for (let i = 0; i < N; i++) {
    const d = (i + 1 - f) / N;
    const p0 = project(g.L, 0, d);
    const a = lerp(0.6, 0.16, d) * clamp((1 - d) * 10, 0, 1) * clamp(d * 12, 0, 1);
    if (a <= 0.01) continue;
    const amp = 3.4 * u * p0.s;
    // Follows the row as it rolls in, so each wave keeps its shape.
    const seed = (i + Math.floor(t * 0.35)) * 2.3;
    ctx.beginPath();
    let open = false;
    for (let lx = -1.5; lx <= 1.5; lx += 0.06) {
      const v = Math.sin(lx * 6 + seed + t * 0.6) + 0.6 * Math.sin(lx * 14 - seed * 0.7 - t * 0.9);
      const p = project(g.L, lx, d);
      const y = p0.y - Math.max(0, v - 0.6) * amp;
      if (v > 0.6) {
        if (!open) ctx.moveTo(p.x, y);
        else ctx.lineTo(p.x, y);
        open = true;
      } else open = false;
    }
    // Lit crest on top, shadowed trough just under it.
    ctx.lineWidth = (0.6 + 1.4 * p0.s) * u;
    ctx.strokeStyle = `rgba(255,255,255,${a})`;
    ctx.stroke();
    ctx.save();
    ctx.translate(0, (1 + 2.2 * p0.s) * u);
    ctx.strokeStyle = `rgba(4,32,58,${a * 0.55})`;
    ctx.stroke();
    ctx.restore();
  }

  // Sun glitter: a column of sparkles that widens as it comes toward you.
  const sun = sunPos(g);
  ctx.strokeStyle = '#fffbe6';
  for (let k = 0; k < 70; k++) {
    const d = Math.pow(hash(k), 0.8);
    const p = project(g.L, 0, d);
    const spread = (10 + 70 * (1 - d)) * u;
    const x = sun.x + (hash(k + 300) - 0.5) * 2 * spread + Math.sin(t * 0.8 + k) * 3 * u * p.s;
    const tw = Math.sin(t * (2.5 + hash(k + 7) * 4) + k * 5.1);
    if (tw < 0.5) continue;
    ctx.globalAlpha = ((tw - 0.5) / 0.5) * lerp(0.95, 0.6, 1 - d);
    ctx.lineWidth = (0.8 + 1.4 * p.s) * u;
    const len = (2 + 7 * p.s) * u;
    ctx.beginPath();
    ctx.moveTo(x - len, p.y);
    ctx.lineTo(x + len, p.y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

/** Darkens the corners a touch, which pulls the eye in and adds depth. */
export function drawVignette(ctx: Ctx, g: Game) {
  const { W, H } = g.L;
  const v = ctx.createRadialGradient(W / 2, H * 0.48, Math.min(W, H) * 0.45, W / 2, H * 0.5, Math.max(W, H) * 0.78);
  v.addColorStop(0, 'rgba(5,20,35,0)');
  v.addColorStop(1, 'rgba(5,20,35,0.38)');
  ctx.fillStyle = v;
  ctx.fillRect(-30, -30, W + 60, H + 60);
}
