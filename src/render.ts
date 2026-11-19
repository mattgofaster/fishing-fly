import { sfx } from './audio';
import { drawCatch } from './fishart';
import { drawHat } from './gear';
import { drawCoin, drawNav, drawScreens } from './ui';
import { Bubble, Game, project, RED_LEVEL, TRAVEL_DUR, TREES_AT } from './game';
import { drawLogo } from './brand';
import { drawHud, drawMusicButton } from './hud';
import { spotById } from './spots';
import { drawBackdrop, drawSky, drawVignette, drawWaves, mix } from './backdrop';
import { clamp, easeOut, lerp, rand, roundRect, setFont, wrapText } from './util';

type Ctx = CanvasRenderingContext2D;

export function render(ctx: Ctx, g: Game) {
  const { W, H } = g.L;
  ctx.clearRect(0, 0, W, H);
  g.hits.length = 0;

  ctx.save();
  if (g.shake > 0) {
    const m = g.shake * 9 * g.L.u;
    ctx.translate(rand(-m, m), rand(-m, m));
  }
  drawSky(ctx, g);
  drawBackdrop(ctx, g);
  drawWaves(ctx, g);
  drawSwimmers(ctx, g);
  drawScenery(ctx, g);
  drawRipples(ctx, g);
  drawBobber(ctx, g);
  drawParticles(ctx, g);
  if (g.onBoat()) drawBoat(ctx, g);
  else drawPier(ctx, g);
  drawAngler(ctx, g);
  drawRodAndLine(ctx, g);
  drawAim(ctx, g);
  drawVignette(ctx, g);
  ctx.restore();

  if (g.title) {
    drawTitle(ctx, g);
    drawMute(ctx, g);
    drawMusicButton(ctx, g);
    return;
  }

  drawFishBubble(ctx, g);
  if (g.phase === 'fight') drawTension(ctx, g);
  drawHint(ctx, g);
  drawNav(ctx, g);
  if (g.phase === 'fail') drawFail(ctx, g);
  if (g.phase === 'result') drawResult(ctx, g);
  drawHud(ctx, g);
  drawScreens(ctx, g);
  drawTravel(ctx, g);
  drawBuddy(ctx, g);
  drawMute(ctx, g);
  drawMusicButton(ctx, g);
}

// ---------- Scene ----------

function drawShadow(
  ctx: Ctx, x: number, y: number, scale: number, dir: number, wiggle: number, alpha: number,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir * scale, scale * 0.55);
  // Seen through water, so the edges go soft: a wide faint pass, then the body.
  ctx.fillStyle = `rgba(8,40,62,${alpha * 0.35})`;
  ctx.beginPath();
  ctx.ellipse(-4, 0, 30, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = `rgba(8,40,62,${alpha * 0.8})`;
  ctx.beginPath();
  ctx.ellipse(0, 0, 22, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-17, 0);
  ctx.lineTo(-35, -10 + wiggle);
  ctx.lineTo(-35, 10 + wiggle);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawSwimmers(ctx: Ctx, g: Game) {
  const { u } = g.L;
  for (const s of g.shadows) {
    const p = project(g.L, s.lx, s.d);
    drawShadow(ctx, p.x, p.y, p.s * s.size * u, s.dir, Math.sin(g.time * 5 + s.phase) * 5, 0.22);
  }

  const sizeFor = (lb: number) => 0.9 + clamp(lb / 18, 0, 1) * 1.3;

  const lurk = g.lurk();
  if (lurk) {
    const p = project(g.L, lurk.lx, lurk.d);
    drawShadow(ctx, p.x, p.y, p.s * sizeFor(g.weight) * u, lurk.dir, Math.sin(g.time * 7) * 5, 0.5);
  }

  if (g.phase === 'fight' && g.current) {
    const f = g.fish;
    const p = project(g.L, f.lx, f.d);
    if (g.current.junk) {
      ctx.fillStyle = 'rgba(8,40,62,0.55)';
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, 16 * u * p.s, 8 * u * p.s, 0, 0, Math.PI * 2);
      ctx.fill();
      if (f.state === 'warn') label(ctx, '!', p.x, p.y - 24 * u, 30 * u, '#ffd84a');
    } else {
      const run = f.state === 'run';
      const jitter = f.state === 'warn' ? Math.sin(g.time * 60) * 2 * u : 0;
      drawShadow(
        ctx, p.x + jitter, p.y, p.s * sizeFor(g.weight) * u, run ? f.dir : 1,
        Math.sin(g.time * (run ? 26 : 7)) * (run ? 9 : 5), 0.62,
      );
      if (f.state === 'warn') {
        setFont(ctx, 30 * u, '900');
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.lineWidth = 5 * u;
        ctx.strokeStyle = '#7a1f12';
        ctx.fillStyle = '#ffd84a';
        ctx.strokeText('!', p.x, p.y - 22 * u);
        ctx.fillText('!', p.x, p.y - 22 * u);
      }
    }
  }
}

// ---------- Spot scenery ----------

const LILIES: [number, number, number][] = [
  [-0.85, 0.18, 1.3], [-0.55, 0.32, 1], [-1.05, 0.45, 1.1], [0.75, 0.22, 1.2], [0.95, 0.5, 0.9],
  [-0.3, 0.62, 0.8], [0.45, 0.7, 0.9], [-0.75, 0.8, 0.8], [0.15, 0.4, 0.7], [1.1, 0.85, 0.8],
];

const STUMPS: [number, number, number][] = [
  [-0.9, 0.3, 1.2], [0.7, 0.42, 1], [-0.35, 0.58, 0.9], [0.25, 0.78, 1.1], [1.0, 0.7, 0.9],
  [-0.8, 0.88, 1], [0.05, 0.2, 0.7],
];

function drawScenery(ctx: Ctx, g: Game) {
  const { u } = g.L;
  const id = g.save.spot;
  if (id === 'cove') {
    LILIES.forEach(([lx, d, k], i) => {
      const p = project(g.L, lx + Math.sin(g.time * 0.4 + i) * 0.01, d);
      const r = 17 * u * p.s * k;
      ctx.fillStyle = 'rgba(10,50,30,0.25)';
      ctx.beginPath();
      ctx.ellipse(p.x + 2 * u * p.s, p.y + 2 * u * p.s, r, r * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();
      // A pad with a wedge cut out
      ctx.fillStyle = i % 2 ? '#4f9a3c' : '#5aac45';
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, r, r * 0.42, 0, 0.35 + i, Math.PI * 2 - 0.35 + i);
      ctx.lineTo(p.x, p.y);
      ctx.closePath();
      ctx.fill();
      if (i % 3 === 0) {
        ctx.fillStyle = '#ffd1e6';
        for (let k2 = 0; k2 < 5; k2++) {
          const a = (k2 / 5) * Math.PI * 2;
          ctx.beginPath();
          ctx.ellipse(p.x + Math.cos(a) * 3.5 * u * p.s, p.y - 3 * u * p.s + Math.sin(a) * 1.6 * u * p.s,
            3.6 * u * p.s, 2.2 * u * p.s, a, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = '#ffd84a';
        ctx.beginPath();
        ctx.arc(p.x, p.y - 3 * u * p.s, 2 * u * p.s, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    // Reeds hugging the sides
    ctx.strokeStyle = '#4c7a34';
    ctx.lineCap = 'round';
    for (let i = 0; i < 26; i++) {
      const side = i % 2 ? 1 : -1;
      const d = 0.05 + ((i * 0.37) % 1) * 0.55;
      const p = project(g.L, side * (1.18 + ((i * 0.13) % 0.2)), d);
      const hgt = (34 + (i % 4) * 8) * u * p.s;
      const sway = Math.sin(g.time * 1.3 + i) * 4 * u * p.s;
      ctx.lineWidth = 2.2 * u * p.s;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.quadraticCurveTo(p.x, p.y - hgt * 0.6, p.x + sway, p.y - hgt);
      ctx.stroke();
      if (i % 3 === 0) {
        ctx.fillStyle = '#6b4a2a';
        roundRect(ctx, p.x + sway - 2.5 * u * p.s, p.y - hgt - 2 * u * p.s, 5 * u * p.s, 12 * u * p.s, 2.5 * u * p.s);
        ctx.fill();
      }
    }
  } else if (id === 'dropoff') {
    // The deep: a dark patch where the bottom falls away
    const c = project(g.L, 0.1, 0.62);
    const deep = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, 150 * u * c.s);
    deep.addColorStop(0, 'rgba(5,25,55,0.35)');
    deep.addColorStop(1, 'rgba(5,25,55,0)');
    ctx.fillStyle = deep;
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, 150 * u * c.s, 50 * u * c.s, 0, 0, Math.PI * 2);
    ctx.fill();
    // Marker buoy
    const p = project(g.L, 0.6, 0.5);
    const s = u * p.s * 1.4;
    const tilt = Math.sin(g.time * 1.7) * 0.12;
    ctx.save();
    ctx.translate(p.x, p.y + Math.sin(g.time * 2.1) * 1.5 * s);
    ctx.rotate(tilt);
    ctx.fillStyle = '#fff';
    roundRect(ctx, -7 * s, -30 * s, 14 * s, 32 * s, 4 * s);
    ctx.fill();
    ctx.fillStyle = '#e8402f';
    ctx.fillRect(-7 * s, -21 * s, 14 * s, 7 * s);
    ctx.fillRect(-7 * s, -8 * s, 14 * s, 7 * s);
    ctx.fillStyle = '#30363d';
    ctx.fillRect(-1 * s, -40 * s, 2 * s, 11 * s);
    ctx.fillStyle = Math.sin(g.time * 3) > 0.6 ? '#ffe066' : '#b89a2a';
    ctx.beginPath();
    ctx.arc(0, -41 * s, 3 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1.2 * u * p.s;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + 2 * s, 12 * s, 3.5 * s, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else if (id === 'stumps') {
    STUMPS.forEach(([lx, d, k], i) => {
      const p = project(g.L, lx, d);
      const s = u * p.s * k;
      const w = 12 * s;
      const h = (26 + (i % 3) * 14) * s;
      const stump = (dir: number) => {
        ctx.beginPath();
        ctx.moveTo(p.x - w, p.y);
        ctx.lineTo(p.x - w * 0.8, p.y - dir * h);
        ctx.lineTo(p.x - w * 0.2, p.y - dir * (h + 6 * s));
        ctx.lineTo(p.x + w * 0.3, p.y - dir * (h - 2 * s));
        ctx.lineTo(p.x + w * 0.8, p.y - dir * (h + 3 * s));
        ctx.lineTo(p.x + w, p.y);
        ctx.closePath();
      };
      // Its reflection, squashed and wobbling
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.scale(1 + Math.sin(g.time * 2 + i) * 0.03, 0.7);
      ctx.translate(-p.x, -p.y);
      ctx.fillStyle = 'rgba(30,25,15,0.28)';
      stump(-1);
      ctx.fill();
      ctx.restore();
      // Lit on the sun side, dark on the other
      const bark = ctx.createLinearGradient(p.x - w, 0, p.x + w, 0);
      bark.addColorStop(0, '#3e2c1c');
      bark.addColorStop(0.55, '#5e4630');
      bark.addColorStop(1, '#8a6a48');
      ctx.fillStyle = bark;
      stump(1);
      ctx.fill();
      ctx.fillStyle = 'rgba(20,30,25,0.35)';
      ctx.fillRect(p.x - w, p.y - 4 * s, w * 2, 4 * s);
      // The odd dead branch
      if (i % 2 === 0) {
        ctx.strokeStyle = '#5e4630';
        ctx.lineWidth = 3 * s;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(p.x + w * 0.5, p.y - h * 0.7);
        ctx.lineTo(p.x + w * 1.8, p.y - h * 1.15);
        ctx.lineTo(p.x + w * 2.2, p.y - h * 1.05);
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.45)';
      ctx.lineWidth = 1.2 * s;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, w * (1.4 + 0.2 * Math.sin(g.time * 2 + i)), w * 0.45, 0, 0, Math.PI * 2);
      ctx.stroke();
    });
  }
}

function drawRipples(ctx: Ctx, g: Game) {
  const { u } = g.L;
  ctx.strokeStyle = '#fff';
  for (const r of g.ripples) {
    const p = project(g.L, r.lx, r.d);
    const k = r.t / 1.2;
    ctx.globalAlpha = (1 - k) * 0.7;
    ctx.lineWidth = 1.6 * u * p.s;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, (6 + k * 34) * u * p.s, (3 + k * 15) * u * p.s, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function bobberShape(ctx: Ctx, x: number, y: number, r: number) {
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e8402f';
  ctx.beginPath();
  ctx.arc(x, y, r, Math.PI, 0);
  ctx.fill();
  // Round it off: shadow on the far-from-sun side, a glint near the sun.
  const shade = ctx.createRadialGradient(x + r * 0.35, y - r * 0.4, r * 0.1, x, y, r * 1.05);
  shade.addColorStop(0, 'rgba(255,255,255,0.75)');
  shade.addColorStop(0.3, 'rgba(255,255,255,0)');
  shade.addColorStop(0.75, 'rgba(0,0,0,0.05)');
  shade.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = shade;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(20,30,40,0.5)';
  ctx.lineWidth = Math.max(1, r * 0.14);
  ctx.stroke();
}

function bobberScreen(g: Game) {
  const { u } = g.L;
  const p = project(g.L, g.bobber.lx, g.bobber.d);
  const r = Math.max(4 * u, 8 * u * p.s);
  return { ...p, r };
}

function drawBobber(ctx: Ctx, g: Game) {
  if (g.phase !== 'wait' && g.phase !== 'bite') return;
  const { u } = g.L;
  const b = bobberScreen(g);
  const dip = g.bobberDip();
  const y = b.y - b.r * 0.35 + Math.sin(g.time * 3) * 1.2 * u + dip * b.r * 1.7;

  ctx.save();
  ctx.beginPath();
  ctx.rect(b.x - 3 * b.r, b.y - 6 * b.r, 6 * b.r, 6 * b.r + b.r * 0.35);
  ctx.clip();
  bobberShape(ctx, b.x, y, b.r);
  ctx.restore();

  // A wobbly red reflection just under the waterline.
  const wl = b.y + b.r * 0.35;
  ctx.globalAlpha = 0.35 * (1 - dip);
  ctx.fillStyle = '#e8402f';
  ctx.beginPath();
  ctx.ellipse(b.x + Math.sin(g.time * 4) * 0.6 * b.r * 0.2, wl + b.r * 0.7, b.r * 0.8, b.r * 0.45, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 1.4 * u * b.s;
  ctx.beginPath();
  ctx.ellipse(b.x, b.y + b.r * 0.35, b.r * (1.5 + dip), b.r * (0.5 + dip * 0.3), 0, 0, Math.PI * 2);
  ctx.stroke();

  if (g.phase === 'bite') {
    // Countdown ring: how long you have left to tap.
    const left = clamp(1 - g.phaseT / g.biteWindow(), 0, 1);
    const rr = 26 * u;
    ctx.lineCap = 'round';
    ctx.lineWidth = 5 * u;
    ctx.strokeStyle = 'rgba(10,30,45,0.35)';
    ctx.beginPath();
    ctx.arc(b.x, b.y, rr, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = left > 0.35 ? '#ffd84a' : '#ff5a4a';
    ctx.beginPath();
    ctx.arc(b.x, b.y, rr, -Math.PI / 2, -Math.PI / 2 + left * Math.PI * 2);
    ctx.stroke();

    const pulse = 1 + Math.sin(g.time * 22) * 0.12;
    setFont(ctx, 46 * u * pulse, '900');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.lineWidth = 7 * u;
    ctx.strokeStyle = '#7a1f12';
    ctx.fillStyle = '#ffd84a';
    ctx.strokeText('!', b.x, b.y - 18 * u);
    ctx.fillText('!', b.x, b.y - 18 * u);
  }
}

function drawParticles(ctx: Ctx, g: Game) {
  ctx.fillStyle = '#fff';
  for (const p of g.particles) {
    ctx.globalAlpha = clamp(p.life / p.max, 0, 1) * 0.9;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawPier(ctx: Ctx, g: Game) {
  const { W, H, u, pierTop } = g.L;
  const cx = W / 2;
  const topW = W * 0.36;
  const botW = W * 0.7;
  const bottom = H + 30;
  // k runs 0 at the far end to 1 at your feet, spaced like real boards in perspective.
  const yAt = (k: number) => pierTop + (bottom - pierTop) * Math.pow(k, 1.5);
  const halfAt = (y: number) => lerp(topW, botW, (y - pierTop) / (bottom - pierTop)) / 2;

  // Shadow on the water, offset toward you because the sun is beyond the pier
  ctx.fillStyle = 'rgba(8,45,70,0.3)';
  ctx.beginPath();
  ctx.moveTo(cx - topW / 2 - 10 * u, pierTop + 4 * u);
  ctx.lineTo(cx + topW / 2 + 2 * u, pierTop + 4 * u);
  ctx.lineTo(cx + botW / 2 + 8 * u, bottom);
  ctx.lineTo(cx - botW / 2 - 30 * u, bottom);
  ctx.closePath();
  ctx.fill();

  // Pilings: posts sunk into the lake along both sides, with ripples and reflections
  for (const k of [0, 0.3, 0.55, 0.78]) {
    const y = yAt(k);
    const pw = lerp(7, 15, k) * u;
    const len = lerp(20, 46, k) * u;
    for (const side of [-1, 1]) {
      const x = cx + side * (halfAt(y) + pw * 0.2);
      const wy = y + len;
      ctx.fillStyle = 'rgba(40,28,15,0.3)';
      ctx.fillRect(x - pw / 2, wy, pw, len * 0.5);
      const post = ctx.createLinearGradient(x - pw / 2, 0, x + pw / 2, 0);
      post.addColorStop(0, '#3a2816');
      post.addColorStop(0.6, '#5f4226');
      post.addColorStop(1, '#7c5a36');
      ctx.fillStyle = post;
      ctx.fillRect(x - pw / 2, y, pw, len);
      // Wet, darker band at the waterline
      ctx.fillStyle = 'rgba(20,40,30,0.45)';
      ctx.fillRect(x - pw / 2, wy - 5 * u * lerp(0.5, 1, k), pw, 5 * u * lerp(0.5, 1, k));
      ctx.strokeStyle = 'rgba(255,255,255,0.45)';
      ctx.lineWidth = 1.2 * u;
      ctx.beginPath();
      ctx.ellipse(x, wy, pw * (0.9 + 0.12 * Math.sin(g.time * 2 + k * 9 + side)), pw * 0.28, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // Side beams: the deck has thickness, and you see the outer face of each
  for (const side of [-1, 1]) {
    ctx.fillStyle = side < 0 ? '#5e4126' : '#6e4d2d';
    ctx.beginPath();
    ctx.moveTo(cx + (side * topW) / 2, pierTop);
    ctx.lineTo(cx + (side * botW) / 2, bottom);
    ctx.lineTo(cx + side * (botW / 2 + 2 * u), bottom + 22 * u);
    ctx.lineTo(cx + side * (topW / 2 + 1 * u), pierTop + 7 * u);
    ctx.closePath();
    ctx.fill();
  }
  // Far end: the beam facing you, in shadow
  ctx.fillStyle = '#4e3620';
  ctx.fillRect(cx - topW / 2, pierTop, topW, 7 * u);

  // Deck: individual boards, each a slightly different shade
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx - topW / 2, pierTop);
  ctx.lineTo(cx + topW / 2, pierTop);
  ctx.lineTo(cx + botW / 2, bottom);
  ctx.lineTo(cx - botW / 2, bottom);
  ctx.closePath();
  ctx.clip();
  const BOARDS = 14;
  const tones = ['#c99d64', '#bf925a', '#d0a66e', '#c3955c', '#cba068'];
  for (let k = 0; k < BOARDS; k++) {
    const y0 = yAt(k / BOARDS);
    const y1 = yAt((k + 1) / BOARDS);
    ctx.fillStyle = tones[(k * 3) % tones.length];
    ctx.fillRect(0, y0, W, y1 - y0 + 1);
    // Grain
    ctx.strokeStyle = 'rgba(110,72,36,0.18)';
    ctx.lineWidth = 0.8 * u;
    for (let j = 1; j < 3; j++) {
      const gy = lerp(y0, y1, j / 3);
      const hw = halfAt(gy);
      ctx.beginPath();
      ctx.moveTo(cx - hw + ((k * 37 + j * 13) % 20) * u, gy);
      ctx.lineTo(cx + hw * (0.2 + ((k * 7 + j) % 5) * 0.15), gy + 0.5 * u);
      ctx.stroke();
    }
    // Gap between boards: dark slit with a lit edge on the next board
    const gap = lerp(1, 3, k / BOARDS) * u;
    ctx.fillStyle = 'rgba(60,36,14,0.6)';
    ctx.fillRect(0, y1 - gap / 2, W, gap);
    ctx.fillStyle = 'rgba(255,236,200,0.25)';
    ctx.fillRect(0, y1 + gap / 2, W, gap * 0.5);
    // Nails over the two joists
    ctx.fillStyle = 'rgba(50,40,35,0.55)';
    for (const jx of [-0.72, 0.72]) {
      for (const dy of [0.3, 0.7]) {
        const ny = lerp(y0, y1, dy);
        ctx.beginPath();
        ctx.arc(cx + jx * halfAt(ny), ny, lerp(0.6, 1.6, k / BOARDS) * u, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  // Light: hazier far away, darker right under you, sunnier on the right
  const depth = ctx.createLinearGradient(0, pierTop, 0, bottom);
  depth.addColorStop(0, 'rgba(220,237,247,0.3)');
  depth.addColorStop(0.35, 'rgba(255,240,210,0.05)');
  depth.addColorStop(1, 'rgba(40,20,5,0.3)');
  ctx.fillStyle = depth;
  ctx.fillRect(0, pierTop, W, bottom - pierTop);
  const side = ctx.createLinearGradient(cx - botW / 2, 0, cx + botW / 2, 0);
  side.addColorStop(0, 'rgba(40,20,5,0.22)');
  side.addColorStop(0.5, 'rgba(40,20,5,0)');
  side.addColorStop(1, 'rgba(255,240,200,0.12)');
  ctx.fillStyle = side;
  ctx.fillRect(0, pierTop, W, bottom - pierTop);
  ctx.restore();

  // Edge boards along the rims
  ctx.strokeStyle = '#8a623a';
  ctx.lineWidth = 3 * u;
  ctx.beginPath();
  ctx.moveTo(cx - topW / 2, pierTop);
  ctx.lineTo(cx - botW / 2, bottom);
  ctx.moveTo(cx + topW / 2, pierTop);
  ctx.lineTo(cx + botW / 2, bottom);
  ctx.stroke();
  ctx.fillStyle = '#a77b4c';
  ctx.fillRect(cx - topW / 2, pierTop - 2 * u, topW, 4 * u);

  // End posts stand up out of the deck at the far corners
  for (const s of [-1, 1]) {
    const x = cx + (s * topW) / 2 - 6 * u;
    const post = ctx.createLinearGradient(x, 0, x + 12 * u, 0);
    post.addColorStop(0, '#4a321c');
    post.addColorStop(1, '#7c5a36');
    ctx.fillStyle = post;
    roundRect(ctx, x, pierTop - 18 * u, 12 * u, 24 * u, 3 * u);
    ctx.fill();
    ctx.fillStyle = '#8f6a42';
    ctx.beginPath();
    ctx.ellipse(x + 6 * u, pierTop - 18 * u + 2 * u, 6 * u, 2.4 * u, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Outline of the bow, seen from behind the angler. `inset` shrinks it toward the middle. */
function bowPath(ctx: Ctx, cx: number, tipY: number, bottom: number, halfW: number, inset: number) {
  const span = bottom - tipY;
  ctx.beginPath();
  ctx.moveTo(cx, tipY + inset * 1.8);
  ctx.bezierCurveTo(
    cx + halfW * 0.5 - inset, tipY + span * 0.06 + inset,
    cx + halfW - inset, tipY + span * 0.38,
    cx + halfW - inset, bottom,
  );
  ctx.lineTo(cx - halfW + inset, bottom);
  ctx.bezierCurveTo(
    cx - halfW + inset, tipY + span * 0.38,
    cx - halfW * 0.5 + inset, tipY + span * 0.06 + inset,
    cx, tipY + inset * 1.8,
  );
  ctx.closePath();
}

/** The Knot Working: a glitter-red bass boat with a trolling motor on the nose. */
function drawBoat(ctx: Ctx, g: Game) {
  const { W, H, u, pierTop } = g.L;
  const cx = W / 2;
  const bob = g.bob();
  const tipY = pierTop - 14 * u + bob;
  const bottom = H + 40;
  const halfW = W * 0.47;

  // Shadow and wake lapping at the hull
  ctx.fillStyle = 'rgba(8,45,70,0.3)';
  bowPath(ctx, cx, tipY + 10 * u - bob, bottom, halfW + 14 * u, 0);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineCap = 'round';
  for (let i = 0; i < 5; i++) {
    const k = (g.time * 0.35 + i / 5) % 1;
    const y = tipY + 30 * u + k * (H - tipY);
    const spread = (0.25 + k * 0.85) * halfW + 16 * u;
    ctx.globalAlpha = 0.5 * (1 - k);
    ctx.lineWidth = 2 * u;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(cx + s * spread, y);
      ctx.lineTo(cx + s * (spread + 18 * u), y + 6 * u);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;

  // Trolling motor: shaft into the water, head on top
  const tip = { x: cx, y: tipY + 4 * u };
  ctx.strokeStyle = '#2b3036';
  ctx.lineWidth = 4 * u;
  ctx.beginPath();
  ctx.moveTo(tip.x + 6 * u, tip.y - 4 * u);
  ctx.lineTo(tip.x + 6 * u, tip.y - 30 * u);
  ctx.stroke();
  ctx.fillStyle = '#2b3036';
  roundRect(ctx, tip.x - 4 * u, tip.y - 42 * u, 22 * u, 14 * u, 5 * u);
  ctx.fill();
  ctx.fillStyle = '#ffd84a';
  ctx.fillRect(tip.x, tip.y - 37 * u, 10 * u, 3 * u);

  // Hull: glitter red with a flake that twinkles
  ctx.fillStyle = '#c8202f';
  bowPath(ctx, cx, tipY, bottom, halfW, 0);
  ctx.fill();
  ctx.save();
  ctx.clip();
  // Curved hull: shadowed flank on the left, sun catching the right
  const hull = ctx.createLinearGradient(cx - halfW, 0, cx + halfW, 0);
  hull.addColorStop(0, 'rgba(40,0,10,0.5)');
  hull.addColorStop(0.45, 'rgba(40,0,10,0.05)');
  hull.addColorStop(0.8, 'rgba(255,200,200,0.18)');
  hull.addColorStop(1, 'rgba(40,0,10,0.25)');
  ctx.fillStyle = hull;
  ctx.fillRect(cx - halfW, tipY, halfW * 2, bottom - tipY);
  for (let i = 0; i < 70; i++) {
    const x = cx + (((i * 97) % 200) / 100 - 1) * halfW;
    const y = tipY + ((i * 53) % 100) / 100 * (H - tipY);
    const tw = Math.sin(g.time * 3 + i * 1.7);
    if (tw < 0.2) continue;
    ctx.fillStyle = `rgba(255,220,220,${tw * 0.8})`;
    ctx.beginPath();
    ctx.arc(x, y, (0.8 + tw) * u, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // White gunwale, then the carpeted deck
  ctx.fillStyle = '#f2f2ee';
  bowPath(ctx, cx, tipY, bottom, halfW, 9 * u);
  ctx.fill();
  const carpet = ctx.createLinearGradient(0, tipY, 0, H);
  carpet.addColorStop(0, '#6c7682');
  carpet.addColorStop(1, '#3f4750');
  ctx.fillStyle = carpet;
  bowPath(ctx, cx, tipY, bottom, halfW, 15 * u);
  ctx.fill();
  ctx.save();
  ctx.clip();
  // The gunwale throws a shadow onto the deck along the left side
  const lip = ctx.createLinearGradient(cx - halfW, 0, cx - halfW + 40 * u, 0);
  lip.addColorStop(0, 'rgba(0,0,0,0.35)');
  lip.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = lip;
  ctx.fillRect(cx - halfW, tipY, 40 * u, H - tipY);
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 2 * u;
  for (let x = -W; x < W * 2; x += 10 * u) {
    ctx.beginPath();
    ctx.moveTo(x, tipY);
    ctx.lineTo(x + 60 * u, H);
    ctx.stroke();
  }
  ctx.restore();

  // Running lights on the nose
  ctx.fillStyle = '#ff4a3d';
  ctx.beginPath();
  ctx.arc(cx - 7 * u, tipY + 14 * u, 3 * u, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#4be07a';
  ctx.beginPath();
  ctx.arc(cx + 7 * u, tipY + 14 * u, 3 * u, 0, Math.PI * 2);
  ctx.fill();

  // Earl's cooler, stencilled so nobody steals his sandwiches
  const cy = g.L.feetY - 4 * u + bob;
  const kx = cx - 96 * u;
  ctx.fillStyle = '#2f8fc4';
  roundRect(ctx, kx, cy - 26 * u, 46 * u, 30 * u, 5 * u);
  ctx.fill();
  ctx.fillStyle = '#fff';
  roundRect(ctx, kx - 2 * u, cy - 32 * u, 50 * u, 9 * u, 4 * u);
  ctx.fill();
  setFont(ctx, 9 * u, '900');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('EARL', kx + 23 * u, cy - 10 * u);
}

function drawAngler(ctx: Ctx, g: Game) {
  const { u, anglerX, feetY } = g.L;
  ctx.save();
  ctx.translate(anglerX, feetY + g.bob());
  ctx.scale(u, u);

  // Sun is out beyond the water, so the shadow stretches back toward you.
  ctx.save();
  ctx.transform(1, 0, -0.35, 0.45, 0, 0);
  ctx.fillStyle = 'rgba(40,22,6,0.22)';
  ctx.beginPath();
  ctx.ellipse(-2, 70, 20, 70, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  const contact = ctx.createRadialGradient(0, 2, 2, 0, 2, 30);
  contact.addColorStop(0, 'rgba(40,22,6,0.45)');
  contact.addColorStop(1, 'rgba(40,22,6,0)');
  ctx.fillStyle = contact;
  ctx.beginPath();
  ctx.ellipse(0, 2, 30, 9, 0, 0, Math.PI * 2);
  ctx.fill();

  // Every part is lit from the right: dark on the left, highlight on the right.
  const lit = (c: string, x0: number, x1: number) => {
    const gr = ctx.createLinearGradient(x0, 0, x1, 0);
    gr.addColorStop(0, mix(c, '#1a0e05', 0.38));
    gr.addColorStop(0.6, c);
    gr.addColorStop(1, mix(c, '#fff4dc', 0.2));
    return gr;
  };

  // Boots and legs
  ctx.fillStyle = lit('#3a2a1c', -16, 16);
  roundRect(ctx, -16, -12, 14, 14, 4);
  ctx.fill();
  roundRect(ctx, 2, -12, 14, 14, 4);
  ctx.fill();
  ctx.fillStyle = lit('#3f5f94', -16, -1);
  roundRect(ctx, -15, -50, 13, 42, 4);
  ctx.fill();
  ctx.fillStyle = lit('#3f5f94', 1, 16);
  roundRect(ctx, 2, -50, 13, 42, 4);
  ctx.fill();

  // Left arm, torso, vest pockets
  ctx.fillStyle = lit('#d8b24a', -27, -17);
  roundRect(ctx, -27, -92, 10, 40, 5);
  ctx.fill();
  ctx.fillStyle = lit('#c9542e', -20, 20);
  roundRect(ctx, -20, -98, 40, 54, 10);
  ctx.fill();
  // The vest shadows the shirt under the arms, and the belt line
  ctx.fillStyle = 'rgba(30,10,0,0.18)';
  roundRect(ctx, -20, -52, 40, 8, 4);
  ctx.fill();
  ctx.fillStyle = '#a84322';
  roundRect(ctx, -14, -66, 11, 12, 2);
  ctx.fill();
  roundRect(ctx, 3, -66, 11, 12, 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,230,200,0.25)';
  ctx.fillRect(-14, -66, 11, 2);
  ctx.fillRect(3, -66, 11, 2);

  // Right arm reaching for the rod
  ctx.strokeStyle = lit('#d8b24a', 12, 30);
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(17, -90);
  ctx.lineTo(24, -80);
  ctx.lineTo(20, -76);
  ctx.stroke();

  // Head: a ball, not a disc. The back of it faces you, mostly in shade.
  const head = ctx.createRadialGradient(5, -116, 2, 0, -110, 14);
  head.addColorStop(0, '#f7d6b4');
  head.addColorStop(0.6, '#e6b48a');
  head.addColorStop(1, '#b98760');
  ctx.fillStyle = head;
  ctx.beginPath();
  ctx.arc(0, -110, 13, 0, Math.PI * 2);
  ctx.fill();
  // Neck shadow under the head
  ctx.fillStyle = 'rgba(60,20,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(0, -97, 10, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.translate(0, -110);
  drawHat(ctx, g.save.hat, g.time);
  ctx.restore();
}

/** Screen position of the bobber while it is in the air. */
function flyingBobber(g: Game) {
  const { u, horizon } = g.L;
  const k = clamp(g.phaseT / g.castDur, 0, 1);
  const land = g.castTrees
    ? { x: project(g.L, g.castTo.lx, 1).x, y: horizon - 16 * u, s: 0.38 }
    : project(g.L, g.castTo.lx, g.castTo.d);
  return {
    x: lerp(g.castFrom.x, land.x, k),
    y: lerp(g.castFrom.y, land.y, k) - Math.sin(k * Math.PI) * (80 + 110 * g.castPower) * u,
    r: Math.max(4 * u, 8 * u * lerp(1, land.s, k)),
  };
}

function drawRodAndLine(ctx: Ctx, g: Game) {
  const { u } = g.L;
  const h = g.hand();
  const tip = g.rodTip();
  const rest = { x: h.x + 30 * u, y: h.y - 118 * u };

  // Rod bends from a control point that stays on its resting line.
  ctx.strokeStyle = '#4a3220';
  ctx.lineCap = 'round';
  ctx.lineWidth = 3.4 * u;
  ctx.beginPath();
  ctx.moveTo(h.x - 3 * u, h.y + 12 * u);
  ctx.lineTo(h.x, h.y);
  ctx.quadraticCurveTo(lerp(h.x, rest.x, 0.6), lerp(h.y, rest.y, 0.6), tip.x, tip.y);
  ctx.stroke();
  ctx.fillStyle = '#9aa3ad';
  ctx.beginPath();
  ctx.arc(h.x + 5 * u, h.y - 6 * u, 5 * u, 0, Math.PI * 2);
  ctx.fill();
  if (g.phase === 'fight' && g.reeling) {
    const a = g.time * 14;
    ctx.strokeStyle = '#30363d';
    ctx.lineWidth = 2 * u;
    ctx.beginPath();
    ctx.moveTo(h.x + 5 * u, h.y - 6 * u);
    ctx.lineTo(h.x + 5 * u + Math.cos(a) * 8 * u, h.y - 6 * u + Math.sin(a) * 8 * u);
    ctx.stroke();
  }

  ctx.lineWidth = 1.1 * u;
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath();
  ctx.moveTo(tip.x, tip.y);

  if (g.phase === 'cast') {
    const b = flyingBobber(g);
    ctx.quadraticCurveTo((tip.x + b.x) / 2, (tip.y + b.y) / 2 + 14 * u, b.x, b.y);
    ctx.stroke();
    bobberShape(ctx, b.x, b.y, b.r);
  } else if (g.phase === 'wait' || g.phase === 'bite') {
    const b = bobberScreen(g);
    const sag = g.phase === 'bite' ? 0 : 26 * u;
    ctx.quadraticCurveTo((tip.x + b.x) / 2, (tip.y + b.y) / 2 + sag, b.x, b.y - b.r * 0.5);
    ctx.stroke();
  } else if (g.phase === 'fight') {
    const f = project(g.L, g.fish.lx, g.fish.d);
    const hot = clamp((g.tension - RED_LEVEL) / (1 - RED_LEVEL), 0, 1);
    ctx.strokeStyle = `rgba(255,${Math.round(255 - hot * 150)},${Math.round(255 - hot * 170)},0.9)`;
    const sag = Math.max(0, 0.3 - g.tension) * 150 * u;
    ctx.quadraticCurveTo((tip.x + f.x) / 2, (tip.y + f.y) / 2 + sag, f.x, f.y);
    ctx.stroke();
  } else {
    // Nothing out: bobber dangles from the tip.
    const sway = Math.sin(g.time * 2) * 3 * u;
    const end = { x: tip.x + sway, y: tip.y + 38 * u };
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
    bobberShape(ctx, end.x, end.y + 5 * u, 6 * u);
  }
}

/** While swiping: shows where the cast will land. */
function drawAim(ctx: Ctx, g: Game) {
  if (g.phase !== 'idle' || !g.drag) return;
  const { u, horizon } = g.L;
  const info = g.dragInfo();
  if (info.dy < 34 * u) return;
  const trees = info.raw > TREES_AT;
  const tip = g.rodTip();
  const land = trees
    ? { x: project(g.L, info.lx, 1).x, y: horizon - 16 * u, s: 0.38 }
    : project(g.L, info.lx, g.castD(info.raw));
  const color = trees ? '#ff5a4a' : '#ffffff';

  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.75;
  ctx.lineWidth = 2 * u;
  ctx.setLineDash([2 * u, 8 * u]);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(tip.x, tip.y);
  ctx.quadraticCurveTo(
    (tip.x + land.x) / 2,
    Math.min(tip.y, land.y) - (60 + 60 * clamp(info.raw, 0, 1.2)) * u,
    land.x,
    land.y,
  );
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;

  ctx.lineWidth = 2.5 * u;
  ctx.beginPath();
  ctx.ellipse(land.x, land.y, 20 * u * land.s, 9 * u * land.s, 0, 0, Math.PI * 2);
  ctx.stroke();

  // A weaker rod cannot reach the whole lake: show where it tops out.
  if (g.reach() < 1 && !trees) {
    const lim = project(g.L, 0, g.reach());
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 1.5 * u;
    ctx.setLineDash([6 * u, 6 * u]);
    ctx.beginPath();
    ctx.moveTo(0, lim.y - 8 * u * lim.s);
    ctx.lineTo(g.L.W, lim.y - 8 * u * lim.s);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    if (info.raw >= 1) label(ctx, 'ROD LIMIT', g.L.W / 2, lim.y - 22 * u * lim.s, 11 * u, '#fff');
  }
  if (trees) {
    label(ctx, 'TOO FAR!', land.x, land.y - 22 * u, 15 * u, '#ff5a4a');
  }
}

// ---------- HUD ----------

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

function bubbleAlpha(b: Bubble) {
  return clamp(Math.min(b.t / 0.15, (b.dur - b.t) / 0.3), 0, 1);
}

function drawBuddy(ctx: Ctx, g: Game) {
  const { W, u, safeTop } = g.L;
  const r = 26 * u;
  const cx = 12 * u + r;
  const cy = safeTop + 10 * u + r;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(u, u);
  ctx.beginPath();
  ctx.arc(0, 0, 26, 0, Math.PI * 2);
  ctx.fillStyle = '#ffe2a8';
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = '#4f7a45';
  ctx.beginPath();
  ctx.ellipse(0, 30, 24, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e3b184';
  ctx.beginPath();
  ctx.arc(0, 2, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#c0392b';
  ctx.beginPath();
  ctx.arc(0, -3, 14.5, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = '#9c2b20';
  roundRect(ctx, -3, -6, 22, 5, 2.5);
  ctx.fill();
  ctx.fillStyle = '#1c1c24';
  roundRect(ctx, -11, 0, 9, 6, 2);
  ctx.fill();
  roundRect(ctx, 2, 0, 9, 6, 2);
  ctx.fill();
  ctx.fillRect(-3, 1.5, 6, 1.5);
  ctx.fillStyle = '#6b4a2a';
  ctx.beginPath();
  ctx.ellipse(0, 11, 8, 3.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#fff';
  ctx.stroke();
  ctx.restore();

  const b = g.buddy;
  if (!b) return;
  const x0 = cx + r + 12 * u;
  const maxW = W - x0 - 56 * u;
  setFont(ctx, 15 * u, '700');
  const lines = wrapText(ctx, b.text, maxW - 24 * u);
  const textW = Math.max(...lines.map((l) => ctx.measureText(l).width));
  const w = textW + 24 * u;
  const lh = 19 * u;
  const h = lines.length * lh + 16 * u;
  const y0 = cy - Math.min(h / 2, r);

  ctx.globalAlpha = bubbleAlpha(b);
  ctx.fillStyle = '#fff';
  roundRect(ctx, x0, y0, w, h, 12 * u);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x0 + 2 * u, cy - 6 * u);
  ctx.lineTo(x0 - 8 * u, cy);
  ctx.lineTo(x0 + 2 * u, cy + 6 * u);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#22303c';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  lines.forEach((l, i) => ctx.fillText(l, x0 + 12 * u, y0 + 8 * u + lh * (i + 0.5)));
  ctx.globalAlpha = 1;
}

function drawFishBubble(ctx: Ctx, g: Game) {
  const b = g.fishSay;
  if (!b) return;
  const { W, u } = g.L;
  const at = g.phase === 'fight' ? g.fish : g.fishSayAt;
  const p = project(g.L, at.lx, at.d);

  setFont(ctx, 14 * u, '800');
  const lines = wrapText(ctx, b.text, 170 * u);
  const textW = Math.max(...lines.map((l) => ctx.measureText(l).width));
  const w = textW + 20 * u;
  const lh = 17 * u;
  const h = lines.length * lh + 12 * u;
  const x0 = clamp(p.x - w / 2, 8 * u, W - 52 * u - w);
  const y0 = p.y - 30 * u - h;
  const tailX = clamp(p.x, x0 + 12 * u, x0 + w - 12 * u);

  ctx.globalAlpha = bubbleAlpha(b);
  ctx.fillStyle = '#fffbe6';
  ctx.strokeStyle = 'rgba(15,30,45,0.8)';
  ctx.lineWidth = 2 * u;
  roundRect(ctx, x0, y0, w, h, 10 * u);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(tailX - 6 * u, y0 + h - 1 * u);
  ctx.lineTo(tailX, y0 + h + 9 * u);
  ctx.lineTo(tailX + 6 * u, y0 + h - 1 * u);
  ctx.fill();
  ctx.stroke();
  ctx.fillRect(tailX - 5 * u, y0 + h - 3 * u, 10 * u, 3 * u);
  ctx.fillStyle = '#22303c';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  lines.forEach((l, i) => ctx.fillText(l, x0 + w / 2, y0 + 6 * u + lh * (i + 0.5)));
  ctx.globalAlpha = 1;
}

function drawTension(ctx: Ctx, g: Game) {
  const { W, u, yFar, yNear } = g.L;
  const w = 18 * u;
  const h = yNear - yFar - 70 * u;
  const y0 = yFar + 40 * u;
  const red = g.tension > RED_LEVEL;
  const slack = g.tension < 0.15 && !g.current?.junk;
  const x0 = W - 16 * u - w + (red ? Math.sin(g.time * 70) * 2 * u : 0);
  const yAt = (v: number) => y0 + h * (1 - v);

  ctx.fillStyle = 'rgba(10,30,45,0.55)';
  roundRect(ctx, x0 - 4 * u, y0 - 4 * u, w + 8 * u, h + 8 * u, 8 * u);
  ctx.fill();

  const zones: [number, number, string][] = [
    [0, 0.15, '#58b4ff'],
    [0.15, RED_LEVEL, '#5fd36a'],
    [RED_LEVEL, 1, '#ff5a4a'],
  ];
  ctx.save();
  roundRect(ctx, x0, y0, w, h, 5 * u);
  ctx.clip();
  for (const [a, b, color] of zones) {
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.3;
    ctx.fillRect(x0, yAt(b), w, yAt(a) - yAt(b));
    const top = Math.min(b, g.tension);
    if (top > a) {
      ctx.globalAlpha = 1;
      ctx.fillRect(x0, yAt(top), w, yAt(a) - yAt(top));
    }
  }
  ctx.restore();
  ctx.globalAlpha = 1;

  // Needle
  const ny = yAt(clamp(g.tension, 0, 1));
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(x0 - 2 * u, ny);
  ctx.lineTo(x0 - 12 * u, ny - 7 * u);
  ctx.lineTo(x0 - 12 * u, ny + 7 * u);
  ctx.closePath();
  ctx.fill();

  label(ctx, 'LINE', x0 + w / 2, y0 - 16 * u, 11 * u, '#fff');
  label(ctx, `${Math.max(0, Math.round(g.fish.d * 150))} ft`, x0 + w / 2, y0 + h + 18 * u, 12 * u, '#fff');

  if (Math.sin(g.time * 16) > -0.3) {
    if (red) label(ctx, 'LET GO!', W / 2, yFar + 26 * u, 22 * u, '#ff5a4a');
    else if (slack) label(ctx, 'HOLD TO REEL!', W / 2, yFar + 26 * u, 22 * u, '#7cc8ff');
  }
}

function drawHint(ctx: Ctx, g: Game) {
  const { W, u, feetY } = g.L;
  let text = '';
  let hot = false;
  let fill = '#ffd84a';
  let ink = '#5a1a0c';
  switch (g.phase) {
    case 'idle':
      text = g.drag ? 'Release to cast' : 'Swipe up to cast';
      break;
    case 'wait':
      text = g.rebite ? "It's coming back... get ready!" : g.lurk() ? 'Wait for it...' : 'Tap when the bobber dives';
      break;
    case 'bite':
      text = 'TAP ANYWHERE!';
      hot = true;
      break;
    case 'fight': {
      // Big and live: tells you what to do with your finger right now.
      const running = g.fish.state === 'run' && !g.current?.junk;
      const snagged = g.fish.state === 'run' && g.current?.junk;
      if (running || snagged) {
        text = running ? 'IT RUNS! LET GO!' : 'SNAGGED! LET GO!';
        fill = '#ff5a4a';
        ink = '#fff';
      } else if (g.reeling) {
        text = 'REELING... KEEP HOLDING';
        fill = '#5fd36a';
        ink = '#0f3a1a';
      } else {
        text = 'HOLD TO REEL';
        fill = '#ffd84a';
        ink = '#5a1a0c';
      }
      hot = true;
      break;
    }
    default:
      return;
  }
  const size = (hot ? 20 : 15) * u * (hot ? 1 + Math.sin(g.time * 22) * 0.06 : 1);
  setFont(ctx, size, '800');
  const w = ctx.measureText(text).width + 28 * u;
  const h = size + 16 * u;
  const y = feetY + 30 * u;
  ctx.fillStyle = hot ? fill : 'rgba(10,30,45,0.6)';
  roundRect(ctx, W / 2 - w / 2, y - h / 2, w, h, h / 2);
  ctx.fill();
  ctx.fillStyle = hot ? ink : '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, W / 2, y + 1 * u);
}

function drawFail(ctx: Ctx, g: Game) {
  const { W, H, u } = g.L;
  const pop = easeOut(clamp(g.phaseT / 0.2, 0, 1));
  const y = H * 0.44;
  ctx.fillStyle = `rgba(10,25,40,${0.5 * pop})`;
  ctx.fillRect(0, y - 58 * u, W, 116 * u);
  label(ctx, g.failTitle, W / 2, y - 16 * u, 42 * u * (0.6 + 0.4 * pop), '#ffd84a');
  setFont(ctx, 15 * u, '700');
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(g.failSub, W / 2, y + 22 * u);
  if (g.phaseT > 0.6) {
    ctx.globalAlpha = 0.75;
    setFont(ctx, 12 * u, '700');
    ctx.fillText('Tap to cast again', W / 2, y + 44 * u);
    ctx.globalAlpha = 1;
  }
}

function drawResult(ctx: Ctx, g: Game) {
  const r = g.result;
  if (!r) return;
  const { W, H, u } = g.L;
  const a = easeOut(clamp(g.phaseT / 0.35, 0, 1));

  ctx.fillStyle = `rgba(8,20,32,${0.55 * a})`;
  ctx.fillRect(0, 0, W, H);

  const w = Math.min(W - 36 * u, 340 * u);
  const h = 466 * u;
  const x0 = W / 2 - w / 2;
  const y0 = H / 2 - h / 2 + 24 * u + (1 - a) * H * 0.6;
  const cx = W / 2;

  ctx.fillStyle = '#fffaf0';
  roundRect(ctx, x0, y0, w, h, 24 * u);
  ctx.fill();

  // Header
  const header = r.first
    ? `NEW CATCH!  ${r.found} OF ${r.total}`
    : r.c.junk
      ? 'YOU CAUGHT... THAT'
      : r.record
        ? 'NEW RECORD!'
        : 'YOU CAUGHT';
  ctx.fillStyle = r.first ? '#3aa655' : r.record && !r.c.junk ? '#f2a81d' : '#2f8fc4';
  roundRect(ctx, cx - 92 * u, y0 + 18 * u, 184 * u, 30 * u, 15 * u);
  ctx.fill();
  setFont(ctx, 14 * u, '900');
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(header, cx, y0 + 34 * u);

  // Portrait
  const py = y0 + 138 * u;
  const pr = 78 * u;
  const bg = ctx.createLinearGradient(0, py - pr, 0, py + pr);
  bg.addColorStop(0, '#bfe9f7');
  bg.addColorStop(1, '#6fc0e3');
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.arc(cx, py, pr, 0, Math.PI * 2);
  ctx.fill();
  const wobble = Math.sin(g.time * 3) * 4 * u;
  const len = r.c.look.kind === 'fish' ? 136 * u : 104 * u;
  drawCatch(ctx, r.c.look, cx + (r.c.look.kind === 'fish' ? 6 * u : 0), py + wobble, len, g.time);

  // Text
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  setFont(ctx, 26 * u, '900');
  ctx.fillStyle = '#22303c';
  ctx.fillText(r.c.name, cx, y0 + 244 * u);
  setFont(ctx, 19 * u, '800');
  ctx.fillStyle = '#2f8fc4';
  ctx.fillText(`${r.weight.toFixed(1)} lb`, cx, y0 + 272 * u);

  setFont(ctx, 14 * u, '600');
  ctx.fillStyle = '#5b6770';
  let y = y0 + 300 * u;
  for (const l of wrapText(ctx, r.c.desc, w - 48 * u)) {
    ctx.fillText(l, cx, y);
    y += 18 * u;
  }
  y += 6 * u;
  ctx.font = `italic ${ctx.font}`;
  ctx.fillStyle = '#22303c';
  for (const l of wrapText(ctx, `“${r.quote}”`, w - 48 * u)) {
    ctx.fillText(l, cx, y);
    y += 18 * u;
  }

  // Coins
  setFont(ctx, 20 * u, '900');
  const coinText = `+${r.coins}`;
  const tw = ctx.measureText(coinText).width;
  const cy = y0 + h - 58 * u;
  drawCoin(ctx, cx - tw / 2 - 6 * u, cy, 10 * u);
  ctx.fillStyle = '#b8860b';
  ctx.textAlign = 'left';
  ctx.fillText(coinText, cx - tw / 2 + 10 * u, cy + 1 * u);

  if (g.phaseT > 0.7) {
    setFont(ctx, 13 * u, '700');
    ctx.fillStyle = '#8a959d';
    ctx.textAlign = 'center';
    ctx.globalAlpha = 0.6 + 0.4 * Math.sin(g.time * 4);
    ctx.fillText(g.tourney ? (r.c.junk ? 'Junk: 0 lb to the judges' : 'Added to your bag!') : 'Tap to keep fishing', cx, y0 + h - 24 * u);
    ctx.globalAlpha = 1;
  }
}

/** Is this Safari on an iPhone, not yet installed to the Home Screen? */
function wantsInstallTip() {
  const nav = navigator as Navigator & { standalone?: boolean };
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const installed = nav.standalone === true || window.matchMedia?.('(display-mode: standalone)').matches;
  return ios && !installed;
}
const INSTALL_TIP = wantsInstallTip();

/** Title screen over the live scene. */
function drawTitle(ctx: Ctx, g: Game) {
  const { W, H, u, safeTop, feetY } = g.L;
  const shade = ctx.createLinearGradient(0, 0, 0, H);
  shade.addColorStop(0, 'rgba(10,40,70,0.15)');
  shade.addColorStop(0.55, 'rgba(10,40,70,0.05)');
  shade.addColorStop(1, 'rgba(10,30,50,0.55)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, W, H);

  drawLogo(ctx, W / 2, safeTop + 150 * u, 58 * u, g.time);
  setFont(ctx, 15 * u, '800');
  ctx.fillStyle = '#0f2a3d';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('A fishing game. Allegedly.', W / 2, safeTop + 248 * u);

  // A fish that cannot resist showing off
  const k = (g.time % 3.2) / 3.2;
  if (k < 0.45) {
    const p = k / 0.45;
    const x = lerp(W * 0.2, W * 0.8, p);
    const y = g.L.yNear - 60 * u - Math.sin(p * Math.PI) * 150 * u;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(lerp(-0.7, 0.7, p));
    drawCatch(ctx, { kind: 'fish', body: '#5d8a3a', belly: '#e9efc4', fin: '#3f6426', stretch: 2.3,
      stripes: 'rgba(20,50,20,0.35)', brow: 'smug' }, 0, 0, 90 * u, g.time);
    ctx.restore();
  }

  const pulse = 1 + Math.sin(g.time * 4) * 0.05;
  const by = feetY + 40 * u;
  setFont(ctx, 20 * u * pulse, '900');
  const textW = ctx.measureText('TAP TO START').width;
  const iconW = 26 * u * pulse;
  const tw = textW + iconW + 44 * u;
  ctx.fillStyle = '#ffd84a';
  roundRect(ctx, W / 2 - tw / 2, by - 24 * u, tw, 48 * u, 24 * u);
  ctx.fill();
  // Speaker with sound waves: the tap is what turns the sound on.
  const ix = W / 2 - (textW + iconW) / 2 - 4 * u;
  ctx.save();
  ctx.translate(ix + 8 * u, by);
  ctx.scale(u * pulse, u * pulse);
  ctx.fillStyle = '#5a1a0c';
  ctx.strokeStyle = '#5a1a0c';
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-8, -3.5);
  ctx.lineTo(-3.5, -3.5);
  ctx.lineTo(2, -9);
  ctx.lineTo(2, 9);
  ctx.lineTo(-3.5, 3.5);
  ctx.lineTo(-8, 3.5);
  ctx.closePath();
  ctx.fill();
  const wave = (g.time * 2) % 1;
  for (const [r, k] of [[6, 0], [11, 0.5]] as const) {
    ctx.globalAlpha = 0.45 + 0.55 * Math.abs(Math.sin((wave + k) * Math.PI));
    ctx.beginPath();
    ctx.arc(3, 0, r, -0.85, 0.85);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
  ctx.fillStyle = '#5a1a0c';
  ctx.textAlign = 'left';
  ctx.fillText('TAP TO START', ix + iconW + 10 * u, by + 1 * u);
  ctx.textAlign = 'center';

  // HOW TO PLAY: starts the game straight into the practice lesson.
  const hy = by - 62 * u;
  setFont(ctx, 15 * u, '900');
  const hw = ctx.measureText('HOW TO PLAY').width + 40 * u;
  ctx.fillStyle = 'rgba(10,30,45,0.6)';
  roundRect(ctx, W / 2 - hw / 2, hy - 19 * u, hw, 38 * u, 19 * u);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 2 * u;
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.fillText('HOW TO PLAY', W / 2, hy + 1 * u);
  g.hits.push({ x: W / 2 - hw / 2 - 6 * u, y: hy - 25 * u, w: hw + 12 * u, h: 50 * u, fn: () => g.leaveTitle(true) });

  if (INSTALL_TIP) {
    setFont(ctx, 12.5 * u, '700');
    ctx.fillStyle = '#fff';
    ctx.fillText('Tip: tap Share, then "Add to Home Screen" to install', W / 2, by + 46 * u);
  }
}

/** The boat ride: the screen washes over, the boat zips across, the new spot fades in. */
function drawTravel(ctx: Ctx, g: Game) {
  const tr = g.travel;
  if (!tr) return;
  const { W, H, u } = g.L;
  const k = clamp(tr.t / TRAVEL_DUR, 0, 1);
  const cover = clamp(Math.sin(k * Math.PI) * 1.6, 0, 1);

  ctx.fillStyle = `rgba(20,80,120,${cover})`;
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = cover;

  // Speed streaks
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 2 * u;
  ctx.lineCap = 'round';
  for (let i = 0; i < 14; i++) {
    const y = H * (0.1 + ((i * 0.618) % 1) * 0.8);
    const x = ((i * 0.37 + tr.t * 1.6) % 1.4) * W * 1.3 - W * 0.3;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - 50 * u, y);
    ctx.stroke();
  }

  // The boat, side-on, bouncing over chop
  // Crosses the middle of the screen right when the cover is thickest.
  const bx = lerp(-70 * u, W + 70 * u, k);
  const by = H * 0.44 + Math.abs(Math.sin(tr.t * 9)) * -6 * u;
  ctx.save();
  ctx.translate(bx, by);
  ctx.rotate(-0.06 + Math.sin(tr.t * 9) * 0.04);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  for (let i = 1; i < 5; i++) {
    ctx.beginPath();
    ctx.arc(-46 * u - i * 14 * u, 8 * u + Math.sin(tr.t * 20 + i) * 2 * u, (5 - i) * 2 * u, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#c8202f';
  ctx.beginPath();
  ctx.moveTo(-46 * u, -4 * u);
  ctx.lineTo(44 * u, -4 * u);
  ctx.quadraticCurveTo(56 * u, -6 * u, 52 * u, 0);
  ctx.lineTo(36 * u, 12 * u);
  ctx.lineTo(-44 * u, 12 * u);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#f2f2ee';
  ctx.fillRect(-46 * u, -6 * u, 92 * u, 4 * u);
  ctx.fillStyle = '#2b3036';
  roundRect(ctx, -58 * u, -14 * u, 14 * u, 20 * u, 3 * u);
  ctx.fill();
  // Angler and Earl, hats clamped on
  for (const [x, hat] of [[-14, '#7d9440'], [14, '#c0392b']] as const) {
    ctx.fillStyle = '#eec39a';
    ctx.beginPath();
    ctx.arc(x * u, -16 * u, 7 * u, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = hat;
    ctx.beginPath();
    ctx.arc(x * u, -18 * u, 7.5 * u, Math.PI, 0);
    ctx.fill();
  }
  ctx.restore();

  label(ctx, spotById(tr.to).name, W / 2, H * 0.44 + 54 * u, 26 * u, '#fff');
  ctx.globalAlpha = 1;
}

function drawMute(ctx: Ctx, g: Game) {
  const { u } = g.L;
  const b = g.muteBtn();
  ctx.fillStyle = 'rgba(10,30,45,0.55)';
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(b.x - 2 * u, b.y);
  ctx.scale(u, u);
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  // Speaker body
  ctx.beginPath();
  ctx.moveTo(-8, -3);
  ctx.lineTo(-4, -3);
  ctx.lineTo(1, -8);
  ctx.lineTo(1, 8);
  ctx.lineTo(-4, 3);
  ctx.lineTo(-8, 3);
  ctx.closePath();
  ctx.fill();
  if (sfx.muted) {
    ctx.beginPath();
    ctx.moveTo(5, -4);
    ctx.lineTo(11, 4);
    ctx.moveTo(11, -4);
    ctx.lineTo(5, 4);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(2, 0, 5, -0.9, 0.9);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(2, 0, 9, -0.9, 0.9);
    ctx.stroke();
  }
  ctx.restore();
}
