// Earl, in person: sitting on the side of the pier with his legs over the
// edge (or on his cooler in the boat), casting now and then without a care.
// Purely for show; his fishing runs off the clock and never touches yours.

import { mix } from './backdrop';
import { Game, project } from './game';
import { clamp, easeOut, lerp, roundRect } from './util';

type Ctx = CanvasRenderingContext2D;

/** Seconds per cast: wind up, cast, sit a while, reel in, dangle. */
const CYCLE = 17;
const CAST_AT = 0.85;
const LAND_AT = 1.6;
const REEL_AT = 13;
const REELED_AT = 15;
/** Rod angles (radians, 0 = pointing right, -PI/2 = straight up). */
const REST = -2.45;
const BACK = -1.05;
const FLICK = -2.65;
const ROD_LEN = 80;
const SCALE = 1;

const hash = (n: number) => {
  const s = Math.sin(n * 12.9898 + 4.1) * 43758.5453;
  return s - Math.floor(s);
};
const smooth = (t: number) => t * t * (3 - 2 * t);

/** Where Earl's bottom meets the deck (or the cooler), and how big he is. */
function seat(g: Game) {
  const { W, H, u, pierTop, feetY } = g.L;
  if (g.onBoat()) {
    // On his cooler, which the boat draws at this spot.
    const cy = feetY - 4 * u + g.bob();
    return { x: W / 2 - 73 * u, y: cy - 30 * u, k: SCALE * u, boat: true };
  }
  // On the left rim of the pier, a little way out from you.
  const y = feetY - 36 * u;
  const bottom = H + 30;
  const half = lerp(W * 0.36, W * 0.7, (y - pierTop) / (bottom - pierTop)) / 2;
  return { x: W / 2 - half + 5 * u, y, k: SCALE * u, boat: false };
}

/** Top of Earl's cap on screen: where his speech bubble points. */
export function earlHead(g: Game) {
  const s = seat(g);
  return { x: s.x, y: s.y - 64 * s.k };
}

function rodAngle(t: number, time: number) {
  if (t < 0.6) return lerp(REST, BACK, smooth(t / 0.6));
  if (t < CAST_AT) return lerp(BACK, FLICK, (t - 0.6) / (CAST_AT - 0.6));
  if (t < LAND_AT) return lerp(FLICK, REST, easeOut((t - CAST_AT) / (LAND_AT - CAST_AT)));
  if (t >= REEL_AT && t < REELED_AT) return REST + Math.sin(t * 22) * 0.03;
  // A lazy little jig halfway through, then back to waiting.
  const jig = t > 7 && t < 7.6 ? Math.sin(((t - 7) / 0.6) * Math.PI) * 0.16 : 0;
  return REST + jig + Math.sin(time * 0.7) * 0.03;
}

export function drawEarl(ctx: Ctx, g: Game) {
  const { u } = g.L;
  const s = seat(g);
  const k = s.k;
  // Starts partway through a cast, so on launch his line is already out.
  const clock = g.time + 9;
  const n = Math.floor(clock / CYCLE);
  const t = clock - n * CYCLE;

  // Lit from the right like everything else.
  const lit = (c: string, x0: number, x1: number) => {
    const gr = ctx.createLinearGradient(x0, 0, x1, 0);
    gr.addColorStop(0, mix(c, '#1a0e05', 0.38));
    gr.addColorStop(0.6, c);
    gr.addColorStop(1, mix(c, '#fff4dc', 0.2));
    return gr;
  };

  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.scale(k, k);
  ctx.lineCap = 'round';

  // Soft shadow where he sits
  const contact = ctx.createRadialGradient(0, 0, 1, 0, 0, 18);
  contact.addColorStop(0, 'rgba(40,22,6,0.4)');
  contact.addColorStop(1, 'rgba(40,22,6,0)');
  ctx.fillStyle = contact;
  ctx.beginPath();
  ctx.ellipse(0, 0, 18, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  const jeans = '#45576b';
  if (!s.boat) {
    // Legs over the edge, kicking slowly
    for (const i of [0, 1]) {
      const knee = { x: -9 - i * 2, y: -1 + i };
      const kick = Math.sin(g.time * 1.2 + i * 2.2) * 2.5;
      const foot = { x: -13 - i * 3 + kick, y: 24 + i };
      ctx.strokeStyle = i === 0 ? mix(jeans, '#000', 0.25) : jeans;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(2, -5);
      ctx.lineTo(knee.x, knee.y);
      ctx.lineTo(foot.x, foot.y);
      ctx.stroke();
      ctx.fillStyle = '#3b2a1c';
      ctx.beginPath();
      ctx.ellipse(foot.x - 2, foot.y + 3, 6, 3.5, -0.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Hips
  ctx.fillStyle = lit(jeans, -10, 13);
  ctx.beginPath();
  ctx.ellipse(1, -5, 12, 6.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Back, leaning toward the water a touch
  ctx.save();
  ctx.translate(1, -6);
  ctx.rotate(-0.1);
  const shirt = '#4f7a45';
  ctx.fillStyle = lit(shirt, -12, 12);
  roundRect(ctx, -11, -36, 23, 37, 9);
  ctx.fill();
  // Suspenders, because Earl
  ctx.strokeStyle = '#7a3b22';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(-5, -34);
  ctx.lineTo(-2, 0);
  ctx.moveTo(6, -34);
  ctx.lineTo(4, 0);
  ctx.stroke();
  ctx.restore();

  // Head: back and right side toward you, facing out over the water on the left
  const hx = -1;
  const hy = -51;
  const head = ctx.createRadialGradient(hx + 4, hy - 3, 1, hx, hy, 11);
  head.addColorStop(0, '#f3c99e');
  head.addColorStop(0.65, '#dca77a');
  head.addColorStop(1, '#a8754f');
  ctx.fillStyle = head;
  ctx.beginPath();
  ctx.arc(hx, hy, 10, 0, Math.PI * 2);
  ctx.fill();
  // A bit of beard showing past his cheek, and an ear
  ctx.fillStyle = '#6b4a2a';
  ctx.beginPath();
  ctx.ellipse(hx - 7, hy + 5, 4, 5, 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#d29a6e';
  ctx.beginPath();
  ctx.ellipse(hx + 3, hy + 1, 2.2, 3.2, 0, 0, Math.PI * 2);
  ctx.fill();
  // Red cap, brim pointing where he's looking
  const cap = ctx.createLinearGradient(hx - 11, 0, hx + 11, 0);
  cap.addColorStop(0, '#8e2318');
  cap.addColorStop(0.6, '#c0392b');
  cap.addColorStop(1, '#e05a48');
  ctx.fillStyle = cap;
  ctx.beginPath();
  ctx.arc(hx, hy - 3, 10.6, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = '#9c2b20';
  roundRect(ctx, hx - 19, hy - 5, 12, 3.6, 1.8);
  ctx.fill();
  ctx.fillStyle = 'rgba(60,20,10,0.3)';
  ctx.fillRect(hx - 9, hy - 3, 18, 2);

  // Arms out to the rod
  const hand = { x: -17, y: -26 };
  ctx.strokeStyle = mix(shirt, '#1a0e05', 0.3);
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(-7, -36);
  ctx.lineTo(hand.x - 1, hand.y + 2);
  ctx.stroke();
  ctx.strokeStyle = lit(shirt, -18, 12);
  ctx.lineWidth = 7.5;
  ctx.beginPath();
  ctx.moveTo(9, -36);
  ctx.quadraticCurveTo(2, -22, hand.x + 2, hand.y);
  ctx.stroke();
  ctx.restore();

  // Rod and line, in screen space so the line can reach the lake.
  const hx0 = s.x + hand.x * k;
  const hy0 = s.y + hand.y * k;
  const a = rodAngle(t, g.time);
  const tip = { x: hx0 + Math.cos(a) * ROD_LEN * k, y: hy0 + Math.sin(a) * ROD_LEN * k };
  const bend = (t >= LAND_AT && t < REEL_AT) ? 6 * k : 0;
  ctx.strokeStyle = '#3a2a1c';
  ctx.lineWidth = 2.6 * u;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(hx0 - Math.cos(a) * 10 * k, hy0 - Math.sin(a) * 10 * k);
  ctx.quadraticCurveTo(
    (hx0 + tip.x) / 2, (hy0 + tip.y) / 2 + bend,
    tip.x, tip.y,
  );
  ctx.stroke();
  ctx.fillStyle = '#f3c99e';
  ctx.beginPath();
  ctx.arc(hx0, hy0, 3.4 * k, 0, Math.PI * 2);
  ctx.fill();

  // Where this cast lands: out on the left side of the lake.
  const spot = project(g.L, -0.68 - hash(n) * 0.16, 0.24 + hash(n + 0.5) * 0.16);
  const dangle = { x: tip.x + Math.sin(g.time * 2.1) * 2 * u, y: tip.y + 26 * u };
  let bob: { x: number; y: number; floating: boolean };
  if (t < CAST_AT || t >= REELED_AT) {
    bob = { ...dangle, floating: false };
  } else if (t < LAND_AT) {
    const f = (t - CAST_AT) / (LAND_AT - CAST_AT);
    bob = {
      x: lerp(tip.x, spot.x, f),
      y: lerp(tip.y, spot.y, f) - Math.sin(f * Math.PI) * 90 * u,
      floating: false,
    };
  } else if (t < REEL_AT) {
    bob = { x: spot.x, y: spot.y + Math.sin(g.time * 3) * 1.2 * u, floating: true };
  } else {
    // Reeling in: skims back across the water, then lifts out.
    const f = (t - REEL_AT) / (REELED_AT - REEL_AT);
    bob = { x: lerp(spot.x, dangle.x, f * f), y: lerp(spot.y, dangle.y, f * f), floating: f < 0.8 };
  }

  if (bob.floating) {
    // Rings: a splash ring on landing, then a slow lazy one
    const since = t - LAND_AT;
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1.1 * u;
    const ring = since < 1.2 ? since / 1.2 : ((g.time * 0.6) % 1);
    ctx.globalAlpha = 1 - ring;
    ctx.beginPath();
    ctx.ellipse(bob.x, bob.y + 2 * u, (5 + ring * 14) * u * spot.s, (2 + ring * 5) * u * spot.s, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // The line, sagging when it's out on the water
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 1 * u;
  ctx.beginPath();
  ctx.moveTo(tip.x, tip.y);
  const sag = bob.floating ? 22 * u : 6 * u;
  ctx.quadraticCurveTo((tip.x + bob.x) / 2, (tip.y + bob.y) / 2 + sag, bob.x, bob.y);
  ctx.stroke();

  // His bobber: small and orange, so nobody mistakes it for yours.
  const r = clamp(4.5 * u * (bob.floating ? spot.s * 1.3 : 1), 3 * u, 5 * u);
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(bob.x, bob.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ff9a1f';
  ctx.beginPath();
  ctx.arc(bob.x, bob.y, r, Math.PI, 0);
  ctx.fill();
  ctx.strokeStyle = 'rgba(20,30,40,0.5)';
  ctx.lineWidth = Math.max(1, r * 0.18);
  ctx.beginPath();
  ctx.arc(bob.x, bob.y, r, 0, Math.PI * 2);
  ctx.stroke();
}
