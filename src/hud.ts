import { sfx } from './audio';
import { Game } from './game';
import { TOURNEY_TIME } from './tourney';
import { drawCoin } from './ui';
import { clamp, easeOut, roundRect, setFont } from './util';

type Ctx = CanvasRenderingContext2D;

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

const ordinal = (n: number) => ['1st', '2nd', '3rd', '4th'][n - 1] ?? `${n}th`;

/** Everything layered over the scene that is not a full-screen panel. */
export function drawHud(ctx: Ctx, g: Game) {
  if (g.training) {
    drawTrainBanner(ctx, g);
    drawSwipeHint(ctx, g);
    return;
  }
  drawTrophy(ctx, g);
  drawHelp(ctx, g);
  if (g.tourney) drawClock(ctx, g);
  else drawQuestBanner(ctx, g);
  drawToast(ctx, g);
}

/** The ? button under the trophy: opens the practice lesson. */
function drawHelp(ctx: Ctx, g: Game) {
  if (g.tourney) return;
  const b = g.helpBtn();
  const active = g.phase === 'idle' && g.screen === 'none' && !g.travel;
  iconButton(ctx, g, b, active ? 1 : 0.5);
  ctx.globalAlpha = active ? 1 : 0.5;
  setFont(ctx, 20 * g.L.u, '900');
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('?', b.x, b.y + 1 * g.L.u);
  ctx.globalAlpha = 1;
  if (active) {
    g.hits.push({ x: b.x - b.r - 4, y: b.y - b.r - 4, w: b.r * 2 + 8, h: b.r * 2 + 8, fn: () => g.startTraining() });
  }
}

const TRAIN_STEPS = ['Cast', 'Wait', 'Tap', 'Reel'];

/** PRACTICE banner: which of the four steps you're on, plus a way out. */
function drawTrainBanner(ctx: Ctx, g: Game) {
  if (g.screen !== 'none') return;
  const { W, u, safeTop } = g.L;
  const step = g.trainStep();
  const x = 12 * u;
  // Below even a four-line Earl bubble.
  const y = safeTop + 116 * u;
  const h = 34 * u;
  const quitW = 54 * u;
  const w = W - x * 2 - 50 * u;

  ctx.fillStyle = 'rgba(10,30,45,0.78)';
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fill();
  setFont(ctx, 10.5 * u, '900');
  const tag = 'PRACTICE';
  const tagW = ctx.measureText(tag).width + 14 * u;
  ctx.fillStyle = '#5fd36a';
  roundRect(ctx, x + 5 * u, y + 5 * u, tagW, h - 10 * u, (h - 10 * u) / 2);
  ctx.fill();
  ctx.fillStyle = '#0f3a1a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(tag, x + 5 * u + tagW / 2, y + h / 2 + 0.5 * u);

  // Four step dots with labels
  const left = x + tagW + 14 * u;
  const right = x + w - quitW - 6 * u;
  const gap = (right - left) / TRAIN_STEPS.length;
  setFont(ctx, 11.5 * u, '800');
  TRAIN_STEPS.forEach((name, i) => {
    const n = i + 1;
    const cx = left + gap * i + gap / 2;
    ctx.fillStyle = n < step ? '#5fd36a' : n === step ? '#ffd84a' : 'rgba(255,255,255,0.5)';
    ctx.fillText(n < step ? `✓ ${name}` : name, cx, y + h / 2 + 0.5 * u);
  });

  // QUIT
  const qx = x + w - quitW - 5 * u;
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  roundRect(ctx, qx, y + 5 * u, quitW, h - 10 * u, (h - 10 * u) / 2);
  ctx.fill();
  setFont(ctx, 10.5 * u, '900');
  ctx.fillStyle = '#fff';
  ctx.fillText('QUIT', qx + quitW / 2, y + h / 2 + 0.5 * u);
  const canQuit = g.phase === 'idle' || g.phase === 'wait' || g.phase === 'bite' || g.phase === 'fight' || g.phase === 'fail';
  if (canQuit) {
    g.hits.push({ x: qx - 6 * u, y: y - 4 * u, w: quitW + 12 * u, h: h + 8 * u, fn: () => g.quitTraining() });
  }
}

/** A ghost finger swiping up from the angler, until they cast. */
function drawSwipeHint(ctx: Ctx, g: Game) {
  if (g.phase !== 'idle' || g.drag || g.screen !== 'none') return;
  const { W, u, feetY } = g.L;
  const k = (g.time % 1.6) / 1.6;
  const move = easeOut(clamp(k / 0.7, 0, 1));
  const alpha = k < 0.1 ? k / 0.1 : k > 0.8 ? (1 - k) / 0.2 : 1;
  const x = W / 2 + 85 * u;
  const y0 = feetY - 40 * u;
  const y = y0 - move * 170 * u;

  ctx.globalAlpha = alpha * 0.7;
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 6 * u;
  ctx.lineCap = 'round';
  ctx.setLineDash([2 * u, 12 * u]);
  ctx.beginPath();
  ctx.moveTo(x, y0);
  ctx.lineTo(x, y + 20 * u);
  ctx.stroke();
  ctx.setLineDash([]);

  // Fingertip
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#ffd9b8';
  ctx.strokeStyle = 'rgba(60,30,10,0.6)';
  ctx.lineWidth = 2 * u;
  ctx.beginPath();
  ctx.ellipse(x, y, 13 * u, 17 * u, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath();
  ctx.ellipse(x, y - 7 * u, 7 * u, 6 * u, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  label(ctx, 'SWIPE UP!', x, y0 + 28 * u, 18 * u, '#ffd84a');
}

function iconButton(ctx: Ctx, g: Game, b: { x: number; y: number; r: number }, alpha = 1) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(10,30,45,0.55)';
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  void g;
}

/** Music picker, under the speaker: each tap plays the next tune, then off. */
export function drawMusicButton(ctx: Ctx, g: Game) {
  const b = g.musicBtn();
  iconButton(ctx, g, b);
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.scale(g.L.u, g.L.u);
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  // Two beamed eighth notes
  ctx.beginPath();
  ctx.ellipse(-5, 5, 3.6, 2.8, -0.4, 0, Math.PI * 2);
  ctx.ellipse(5, 3, 3.6, 2.8, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-2, 5);
  ctx.lineTo(-2, -7);
  ctx.lineTo(8, -9);
  ctx.lineTo(8, 3);
  ctx.stroke();
  if (!sfx.musicOn) {
    ctx.strokeStyle = '#ff6b5a';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-10, -10);
    ctx.lineTo(10, 10);
    ctx.stroke();
  } else {
    // Which tune: a little numbered badge
    ctx.fillStyle = '#ffd84a';
    ctx.beginPath();
    ctx.arc(12, 12, 6.5, 0, Math.PI * 2);
    ctx.fill();
    setFont(ctx, 9, '900');
    ctx.fillStyle = '#5a1a0c';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(sfx.track + 1), 12, 12.5);
  }
  ctx.restore();

  // Now playing: slides out to the left of the button after a tap, then fades.
  const since = (performance.now() - sfx.trackChangedAt) / 1000;
  if (since < 2.2) {
    const { u } = g.L;
    const a = clamp(Math.min(since / 0.15, (2.2 - since) / 0.4), 0, 1);
    const text = sfx.muted && sfx.musicOn ? `${sfx.trackLabel()} (sound off)` : sfx.trackLabel();
    setFont(ctx, 13 * u, '800');
    const w = ctx.measureText(text).width + 34 * u;
    const h = 28 * u;
    const x = b.x - b.r - 8 * u - w + (1 - a) * 12 * u;
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(10,30,45,0.8)';
    roundRect(ctx, x, b.y - h / 2, w, h, h / 2);
    ctx.fill();
    ctx.fillStyle = sfx.musicOn ? '#ffd84a' : '#ff8a7a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(sfx.musicOn ? '♪' : '✕', x + 14 * u, b.y + 1 * u);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    ctx.fillText(text, x + 24 * u, b.y + 1 * u);
    ctx.globalAlpha = 1;
  }
}

function drawTrophy(ctx: Ctx, g: Game) {
  if (g.tourney) return;
  const b = g.trophyBtn();
  const active = g.phase === 'idle' && g.screen === 'none' && !g.travel;
  iconButton(ctx, g, b, active ? 1 : 0.5);
  ctx.save();
  ctx.globalAlpha = active ? 1 : 0.5;
  ctx.translate(b.x, b.y);
  ctx.scale(g.L.u, g.L.u);
  ctx.fillStyle = '#ffd84a';
  ctx.beginPath();
  ctx.moveTo(-8, -9);
  ctx.lineTo(8, -9);
  ctx.quadraticCurveTo(8, 3, 0, 4);
  ctx.quadraticCurveTo(-8, 3, -8, -9);
  ctx.fill();
  ctx.strokeStyle = '#ffd84a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(-8, -5, 4, Math.PI * 0.5, Math.PI * 1.5);
  ctx.arc(8, -5, 4, -Math.PI * 0.5, Math.PI * 0.5);
  ctx.stroke();
  ctx.fillRect(-1.5, 3, 3, 4);
  roundRect(ctx, -6, 7, 12, 3.5, 1.5);
  ctx.fill();
  ctx.restore();
  ctx.globalAlpha = 1;
  if (active) {
    g.hits.push({ x: b.x - b.r - 4, y: b.y - b.r - 4, w: b.r * 2 + 8, h: b.r * 2 + 8, fn: () => g.openScreen('tourney') });
  }
}

/** Earl's current job, under his face. */
function drawQuestBanner(ctx: Ctx, g: Game) {
  const s = g.save.quest;
  if (!s) return;
  const { W, u, safeTop } = g.L;
  const active = g.phase === 'idle' && g.screen === 'none' && !g.travel;
  const x = 12 * u;
  // Low enough to clear a three-line Earl bubble.
  const y = safeTop + 90 * u;
  const h = 28 * u;
  const prog = s.q.n > 1 ? `${s.have}/${s.q.n}` : '';
  const maxW = W - x - 60 * u;

  setFont(ctx, 10.5 * u, '900');
  const tagW = ctx.measureText('QUEST').width + 14 * u;
  setFont(ctx, 12.5 * u, '800');
  let title = s.q.title;
  const progW = prog ? ctx.measureText(prog).width + 12 * u : 0;
  while (title.length > 4 && tagW + ctx.measureText(title).width + progW + 24 * u > maxW) {
    title = title.slice(0, -2) + '…';
  }
  const w = tagW + ctx.measureText(title).width + progW + 22 * u;

  ctx.globalAlpha = active ? 1 : 0.6;
  ctx.fillStyle = 'rgba(10,30,45,0.72)';
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fill();
  ctx.fillStyle = '#ffd84a';
  roundRect(ctx, x + 4 * u, y + 4 * u, tagW, h - 8 * u, (h - 8 * u) / 2);
  ctx.fill();
  setFont(ctx, 10.5 * u, '900');
  ctx.fillStyle = '#5a3a0c';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('QUEST', x + 4 * u + tagW / 2, y + h / 2 + 0.5 * u);
  setFont(ctx, 12.5 * u, '800');
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'left';
  ctx.fillText(title, x + tagW + 12 * u, y + h / 2 + 0.5 * u);
  if (prog) {
    ctx.fillStyle = '#9fe0ff';
    ctx.fillText(prog, x + w - progW - 2 * u, y + h / 2 + 0.5 * u);
  }
  ctx.globalAlpha = 1;
  if (active) g.hits.push({ x, y: y - 6 * u, w, h: h + 12 * u, fn: () => g.openScreen('quest') });
}

/** Tournament clock, standings and the countdown. */
function drawClock(ctx: Ctx, g: Game) {
  const tr = g.tourney!;
  const { W, H, u, safeTop } = g.L;

  if (tr.t < 0) {
    const n = Math.ceil(-tr.t);
    const k = 1 - (-tr.t - Math.floor(-tr.t));
    ctx.fillStyle = 'rgba(8,20,32,0.35)';
    ctx.fillRect(0, 0, W, H);
    label(ctx, String(n), W / 2, H * 0.42, (90 + k * 30) * u, '#ffd84a');
    label(ctx, 'GET READY', W / 2, H * 0.42 + 80 * u, 20 * u, '#fff');
    return;
  }
  if (tr.t < 0.8) label(ctx, 'GO!', W / 2, H * 0.42, 100 * u * (1 + tr.t * 0.3), '#5fd36a');

  const left = Math.max(0, TOURNEY_TIME - tr.t);
  const mins = Math.floor(Math.ceil(left) / 60);
  const secs = String(Math.ceil(left) % 60).padStart(2, '0');
  const cx = W / 2;
  const y = safeTop + 90 * u;
  const w = 150 * u;
  const h = 56 * u;
  const urgent = left <= 10;
  ctx.fillStyle = urgent && Math.sin(g.time * 12) > 0 ? 'rgba(160,30,20,0.85)' : 'rgba(10,30,45,0.78)';
  roundRect(ctx, cx - w / 2, y, w, h, 14 * u);
  ctx.fill();
  setFont(ctx, 26 * u, '900');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = tr.lastFish ? '#ff8a7a' : '#fff';
  ctx.fillText(tr.lastFish ? 'LAST FISH' : `${mins}:${secs}`, cx, y + 20 * u);
  setFont(ctx, 12.5 * u, '800');
  ctx.fillStyle = '#ffd84a';
  ctx.fillText(`${tr.total.toFixed(1)} lb  ·  ${ordinal(g.rank())} of 4`, cx, y + 42 * u);

  const tk = g.ticker;
  if (tk) {
    const a = clamp(Math.min(tk.t / 0.2, (tk.dur - tk.t) / 0.4), 0, 1);
    ctx.globalAlpha = a;
    setFont(ctx, 12 * u, '800');
    const tw = ctx.measureText(tk.text).width + 20 * u;
    ctx.fillStyle = 'rgba(10,30,45,0.6)';
    roundRect(ctx, cx - tw / 2, y + h + 6 * u, tw, 22 * u, 11 * u);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillText(tk.text, cx, y + h + 17.5 * u);
    ctx.globalAlpha = 1;
  }
}

/** QUEST COMPLETE banner that drops in from the top. */
function drawToast(ctx: Ctx, g: Game) {
  const t = g.toast;
  if (!t) return;
  const { W, u, safeTop } = g.L;
  const inA = easeOut(clamp(t.t / 0.3, 0, 1));
  const outA = clamp((t.dur - t.t) / 0.4, 0, 1);
  const w = Math.min(W - 40 * u, 300 * u);
  const h = 86 * u;
  const x = W / 2 - w / 2;
  const y = safeTop + 90 * u - (1 - inA) * 140 * u;

  ctx.globalAlpha = outA;
  ctx.fillStyle = '#3aa655';
  roundRect(ctx, x, y, w, h, 18 * u);
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 3 * u;
  ctx.stroke();
  label(ctx, t.title, W / 2, y + 22 * u, 20 * u, '#ffd84a');
  setFont(ctx, 13.5 * u, '800');
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.fillText(t.sub, W / 2, y + 46 * u);
  setFont(ctx, 17 * u, '900');
  const coins = `+${t.coins}`;
  const cw = ctx.measureText(coins).width;
  drawCoin(ctx, W / 2 - cw / 2 - 6 * u, y + 69 * u, 8 * u);
  ctx.fillStyle = '#fff3b0';
  ctx.textAlign = 'left';
  ctx.fillText(coins, W / 2 - cw / 2 + 7 * u, y + 70 * u);
  ctx.globalAlpha = 1;
}
