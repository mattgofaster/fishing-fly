import { CATALOG } from './catalog';
import { drawCatch } from './fishart';
import { FONT } from './util';

type Ctx = CanvasRenderingContext2D;

const BASS = CATALOG.find((c) => c.id === 'bass')!.look;

/** "HOOK, LINE & SINKER" in chunky, wobbling letters. `size` sets the overall scale. */
export function drawLogo(ctx: Ctx, cx: number, cy: number, size: number, t: number) {
  const maxW = size * 5.6;
  const word = (text: string, y: number, s0: number, fill: string, phase: number) => {
    ctx.font = `900 ${s0}px ${FONT}`;
    // Shrink to fit if the line would run too wide
    const raw = [...text].reduce((a, ch) => a + ctx.measureText(ch).width, 0) * 1.02;
    const s = raw > maxW ? (s0 * maxW) / raw : s0;
    ctx.font = `900 ${s}px ${FONT}`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.lineJoin = 'round';
    const spacing = s * 0.02;
    const widths = [...text].map((ch) => ctx.measureText(ch).width);
    const total = widths.reduce((a, b) => a + b, 0) + spacing * (text.length - 1);
    let x = cx - total / 2;
    [...text].forEach((ch, i) => {
      const dy = Math.sin(t * 2.2 + i * 0.7 + phase) * s * 0.05;
      const rot = Math.sin(t * 1.7 + i * 0.9 + phase) * 0.05;
      ctx.save();
      ctx.translate(x + widths[i] / 2, y + dy);
      ctx.rotate(rot);
      ctx.fillStyle = 'rgba(8,30,48,0.35)';
      ctx.fillText(ch, -widths[i] / 2 + s * 0.04, s * 0.07);
      ctx.lineWidth = s * 0.2;
      ctx.strokeStyle = '#0f2a3d';
      ctx.strokeText(ch, -widths[i] / 2, 0);
      ctx.fillStyle = fill;
      ctx.fillText(ch, -widths[i] / 2, 0);
      ctx.restore();
      x += widths[i] + spacing;
    });
  };
  word('HOOK, LINE &', cy - size * 0.6, size * 0.7, '#ffffff', 0);
  word('SINKER', cy + size * 0.45, size * 1.25, '#ffd84a', 2);
}

/** Sky, far bank and lake, split at `horizon`. */
function scene(ctx: Ctx, W: number, H: number, horizon: number) {
  const sky = ctx.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, '#5bbcf5');
  sky.addColorStop(1, '#d5f1ff');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, horizon);
  const water = ctx.createLinearGradient(0, horizon, 0, H);
  water.addColorStop(0, '#a6e0ee');
  water.addColorStop(0.3, '#46a9d3');
  water.addColorStop(1, '#1c6f9f');
  ctx.fillStyle = water;
  ctx.fillRect(0, horizon, W, H - horizon);
  // Treeline
  ctx.fillStyle = '#3f7d4a';
  const r = W * 0.035;
  for (let x = -r; x < W + r; x += r * 1.3) {
    ctx.beginPath();
    ctx.arc(x, horizon - r * 0.4, r * (0.9 + 0.25 * Math.sin(x * 7.1)), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#356b40';
  ctx.fillRect(0, horizon - r * 0.15, W, r * 0.3);
}

/** The bass leaping out of the water, hooked, with a splash around its tail. */
function leapingBass(ctx: Ctx, x: number, y: number, len: number, t: number, lineFrom?: { x: number; y: number }) {
  const angle = -0.55;
  // Mouth position, for the fishing line
  const lx = len * 0.44;
  const ly = len * 0.06;
  const mouth = {
    x: x + Math.cos(angle) * lx - Math.sin(angle) * ly,
    y: y + Math.sin(angle) * lx + Math.cos(angle) * ly,
  };
  if (lineFrom) {
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = Math.max(1.5, len * 0.012);
    ctx.beginPath();
    ctx.moveTo(lineFrom.x, lineFrom.y);
    ctx.quadraticCurveTo((lineFrom.x + mouth.x) / 2, (lineFrom.y + mouth.y) / 2 + len * 0.05, mouth.x, mouth.y);
    ctx.stroke();
    // Bobber riding the line
    const bx = lineFrom.x + (mouth.x - lineFrom.x) * 0.45;
    const by = lineFrom.y + (mouth.y - lineFrom.y) * 0.45 + len * 0.03;
    const br = len * 0.055;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8402f';
    ctx.beginPath();
    ctx.arc(bx, by, br, Math.PI, 0);
    ctx.fill();
    ctx.strokeStyle = 'rgba(20,30,40,0.6)';
    ctx.lineWidth = br * 0.18;
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  drawCatch(ctx, BASS, 0, 0, len, t);
  ctx.restore();

  // Splash at the tail
  const tail = { x: x - Math.cos(angle) * len * 0.5, y: y - Math.sin(angle) * len * 0.5 };
  ctx.fillStyle = '#fff';
  for (let i = 0; i < 9; i++) {
    const a = Math.PI + (i / 8) * Math.PI;
    const d = len * (0.12 + (i % 3) * 0.05);
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.arc(tail.x + Math.cos(a) * d, tail.y + Math.sin(a) * d * 0.7, len * (0.018 + (i % 2) * 0.012), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 0.8;
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = len * 0.015;
  ctx.beginPath();
  ctx.ellipse(tail.x, tail.y + len * 0.04, len * 0.22, len * 0.06, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

/**
 * App icon, S pixels square. `safe` shrinks the artwork toward the middle so
 * Android's masks can't crop it; iOS rounds the corners itself.
 */
export function drawIcon(ctx: Ctx, S: number, safe = 1) {
  scene(ctx, S, S, S * 0.6);
  // Sun
  ctx.fillStyle = '#fff3b0';
  ctx.beginPath();
  ctx.arc(S * 0.8, S * 0.18, S * 0.09, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.translate(S / 2, S / 2);
  ctx.scale(safe, safe);
  ctx.translate(-S / 2, -S / 2);
  leapingBass(ctx, S * 0.52, S * 0.56, S * 0.78, 0.35, { x: S * 0.05, y: -S * 0.05 });
  ctx.restore();
}

/** Launch screen, shown by iOS while the game loads. */
export function drawSplash(ctx: Ctx, W: number, H: number) {
  scene(ctx, W, H, H * 0.52);
  const s = Math.min(W / 390, H / 844);
  drawLogo(ctx, W / 2, H * 0.3, 64 * s, 0);
  leapingBass(ctx, W * 0.52, H * 0.6, 260 * s, 0.35);
}
