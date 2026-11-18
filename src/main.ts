import { sfx } from './audio';
import { Game } from './game';
import { render } from './render';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const probe = document.getElementById('safe-probe')!;
const game = new Game();
let dpr = 1;

function resize() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  // Portrait only: on a wide screen the game sits in a phone-shaped column.
  const W = Math.min(vw, Math.round(vh * 0.62));
  const H = vh;
  dpr = Math.min(window.devicePixelRatio || 1, 3);
  canvas.style.width = `${W}px`;
  canvas.style.height = `${H}px`;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  const cs = getComputedStyle(probe);
  game.setLayout(W, H, parseFloat(cs.paddingTop) || 0, parseFloat(cs.paddingBottom) || 0);
}

window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 200));
resize();

// ---------- Input ----------

const pos = (e: PointerEvent) => {
  const r = canvas.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
};
let activePointer: number | null = null;

canvas.addEventListener('pointerdown', (e) => {
  sfx.unlock();
  if (activePointer !== null) return;
  const p = pos(e);
  const m = game.muteBtn();
  if (Math.hypot(p.x - m.x, p.y - m.y) < m.r * 1.3) {
    sfx.setMuted(!sfx.muted);
    return;
  }
  const mu = game.musicBtn();
  if (Math.hypot(p.x - mu.x, p.y - mu.y) < mu.r * 1.3) {
    sfx.setMusic(!sfx.musicOn);
    return;
  }
  activePointer = e.pointerId;
  canvas.setPointerCapture(e.pointerId);
  game.onDown(p.x, p.y);
});
canvas.addEventListener('pointermove', (e) => {
  if (e.pointerId !== activePointer) return;
  const p = pos(e);
  game.onMove(p.x, p.y);
});
const release = (cancelled: boolean) => (e: PointerEvent) => {
  sfx.unlock();
  if (e.pointerId !== activePointer) return;
  activePointer = null;
  game.onUp(cancelled);
};
canvas.addEventListener('pointerup', release(false));
canvas.addEventListener('pointercancel', release(true));

// Stop Safari from scrolling, zooming, or popping menus mid-fight.
const block = (e: Event) => e.preventDefault();
document.addEventListener('touchstart', block, { passive: false });
document.addEventListener('touchmove', block, { passive: false });
document.addEventListener('gesturestart', block);
document.addEventListener('contextmenu', block);
// Safari only lets sound start from a finished touch, so try on every kind.
document.addEventListener('touchend', () => sfx.unlock());
document.addEventListener('click', () => sfx.unlock());
document.addEventListener('visibilitychange', () => {
  if (document.hidden) game.onUp(true);
  sfx.setActive(!document.hidden);
});

// ---------- Loop ----------

let last = performance.now();
function frame(now: number) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  game.update(dt);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  render(ctx, game);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Offline play. Service workers need HTTPS (or localhost), so this quietly
// does nothing over the home Wi-Fi address, and it stays off in development.
if (import.meta.env.PROD && 'serviceWorker' in navigator && window.isSecureContext) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

// Handy for poking at the game from the browser console.
(window as unknown as { game: Game }).game = game;
