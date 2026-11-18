import { Look } from './catalog';
import { FONT, roundRect } from './util';

type Ctx = CanvasRenderingContext2D;

const INK = 'rgba(20,30,40,0.6)';

/** Draws a catch centred on (cx, cy), `len` wide, facing right unless flipped. */
export function drawCatch(
  ctx: Ctx,
  look: Look,
  cx: number,
  cy: number,
  len: number,
  t: number,
  flip = false,
) {
  ctx.save();
  ctx.translate(cx, cy);
  if (flip) ctx.scale(-1, 1);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  if (look.kind === 'fish') {
    drawFish(ctx, look, len, t);
  } else {
    // Everything else is drawn in a 100-unit box.
    ctx.scale(len / 100, len / 100);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = INK;
    switch (look.kind) {
      case 'boot': drawBoot(ctx, look, t); break;
      case 'turtle': drawTurtle(ctx, look, t); break;
      case 'cart': drawCart(ctx, look, t); break;
      case 'can': drawCan(ctx, look, t); break;
      case 'phone': drawPhone(ctx, look, t); break;
      case 'duck': drawDuck(ctx, look, t); break;
      case 'bottle': drawBottle(ctx, look, t); break;
    }
  }
  ctx.restore();
}

// ---------- Fish ----------

function drawFish(ctx: Ctx, look: Look, len: number, t: number) {
  const h = len / look.stretch;
  const rx = len * 0.42;
  const ry = h * 0.5;
  const thin = Math.max(1.5, len * 0.018);
  ctx.lineWidth = thin;
  ctx.strokeStyle = 'rgba(20,30,40,0.55)';

  // Tail
  ctx.save();
  ctx.translate(-rx * 0.9, 0);
  ctx.rotate(Math.sin(t * 7) * 0.22);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-len * 0.2, -h * 0.5);
  ctx.quadraticCurveTo(-len * 0.11, 0, -len * 0.2, h * 0.5);
  ctx.closePath();
  ctx.fillStyle = look.fin;
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Dorsal fin
  ctx.beginPath();
  ctx.moveTo(-rx * 0.5, -ry * 0.78);
  ctx.quadraticCurveTo(-rx * 0.1, -ry * 1.75, rx * 0.35, -ry * 0.85);
  ctx.closePath();
  ctx.fillStyle = look.fin;
  ctx.fill();
  ctx.stroke();

  // Body with belly and markings clipped inside it
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = look.body;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = look.belly;
  ctx.beginPath();
  ctx.ellipse(rx * 0.05, ry * 0.95, rx * 1.1, ry * 0.75, 0, 0, Math.PI * 2);
  ctx.fill();
  if (look.scales) {
    ctx.strokeStyle = look.scales;
    ctx.lineWidth = Math.max(1, len * 0.01);
    const step = ry * 0.36;
    for (let row = 0; row < 5; row++) {
      for (let x = -rx; x < rx * 0.45; x += step) {
        ctx.beginPath();
        ctx.arc(x + (row % 2) * step * 0.5, -ry * 0.75 + row * step * 0.8, step * 0.5, -1, 1);
        ctx.stroke();
      }
    }
  }
  if (look.band) {
    ctx.fillStyle = look.band;
    ctx.fillRect(-rx, -ry * 0.12, rx * 2, ry * 0.34);
  }
  if (look.stripes) {
    ctx.fillStyle = look.stripes;
    for (let i = -2; i <= 1; i++) {
      ctx.fillRect(i * rx * 0.34 - rx * 0.07, -ry, rx * 0.14, ry * 1.25);
    }
  }
  if (look.spots) {
    ctx.fillStyle = look.spots;
    for (let i = 0; i < 12; i++) {
      const sx = -rx * 0.75 + ((i * 0.37) % 1) * rx * 1.15;
      const sy = -ry * 0.7 + ((i * 0.61) % 1) * ry * 0.95;
      ctx.beginPath();
      ctx.ellipse(sx, sy, rx * 0.045, ry * 0.09, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
  ctx.lineWidth = thin;
  ctx.strokeStyle = 'rgba(20,30,40,0.55)';
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Pectoral fin
  ctx.save();
  ctx.translate(rx * 0.1, ry * 0.35);
  ctx.rotate(0.5 + Math.sin(t * 5) * 0.2);
  ctx.beginPath();
  ctx.ellipse(-rx * 0.12, 0, rx * 0.2, ry * 0.2, 0, 0, Math.PI * 2);
  ctx.fillStyle = look.fin;
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Whiskers
  if (look.whiskers) {
    ctx.lineWidth = Math.max(1.2, len * 0.012);
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(rx * 0.88, ry * 0.2);
      ctx.quadraticCurveTo(rx * 1.15, ry * (0.2 + s * 0.3), rx * 1.25, ry * (0.5 + s * 0.55));
      ctx.stroke();
    }
    ctx.lineWidth = thin;
  }

  // Mouth
  const mx = rx * 0.78;
  const my = ry * 0.3;
  ctx.beginPath();
  if (look.teeth) {
    ctx.moveTo(rx * 0.45, my);
    ctx.lineTo(rx * 0.97, ry * 0.12);
    ctx.stroke();
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 5; i++) {
      const tx = rx * (0.5 + i * 0.09);
      const ty = my - (i * (my - ry * 0.12)) / 5.2;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(tx + rx * 0.035, ty + ry * 0.22);
      ctx.lineTo(tx + rx * 0.07, ty - ry * 0.02);
      ctx.closePath();
      ctx.fill();
    }
  } else if (look.brow === 'worried') {
    ctx.ellipse(mx, my, rx * 0.07, ry * 0.13, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#3a1c1c';
    ctx.fill();
  } else if (look.brow === 'tired' || look.brow === 'shifty') {
    ctx.moveTo(mx - rx * 0.14, my + ry * 0.05);
    ctx.lineTo(mx + rx * 0.12, my + ry * 0.05);
    ctx.stroke();
  } else if (look.brow === 'diva') {
    ctx.ellipse(mx + rx * 0.06, my, rx * 0.08, ry * 0.11, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#e0325a';
    ctx.fill();
    ctx.stroke();
  } else if (look.brow === 'calm') {
    ctx.arc(mx - rx * 0.06, my - ry * 0.2, rx * 0.2, 0.3, 1.9);
    ctx.stroke();
  } else {
    ctx.arc(mx - rx * 0.05, my - ry * 0.12, rx * 0.17, 0.25, 1.75);
    ctx.stroke();
  }

  // Eye
  const ex = rx * (look.bigEye ? 0.5 : 0.55);
  const ey = -ry * 0.22;
  const er = Math.min(ry * 0.3, rx * 0.2) * (look.bigEye ? 1.6 : 1);
  if (look.brow === 'calm') {
    // Closed and content
    ctx.lineWidth = Math.max(2, len * 0.024);
    ctx.strokeStyle = '#16202a';
    ctx.beginPath();
    ctx.arc(ex, ey + er * 0.3, er * 0.85, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(ex, ey, er, 0, Math.PI * 2);
    ctx.fillStyle = look.bigEye ? '#fff7d6' : '#fff';
    ctx.fill();
    ctx.stroke();
    const px = look.brow === 'shifty' ? -er * 0.38 : er * 0.25;
    const py = look.brow === 'tired' ? er * 0.25 : 0;
    ctx.beginPath();
    ctx.arc(ex + px, ey + py, er * (look.bigEye ? 0.32 : 0.5), 0, Math.PI * 2);
    ctx.fillStyle = '#16202a';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(ex + px - er * 0.15, ey - er * 0.25, er * 0.17, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    if (look.bigEye) {
      // Bloodshot from years of no sleep
      ctx.strokeStyle = 'rgba(200,60,60,0.7)';
      ctx.lineWidth = Math.max(1, len * 0.008);
      for (const a of [2.4, 3.3, 4.2, 5.6]) {
        ctx.beginPath();
        ctx.moveTo(ex + Math.cos(a) * er * 0.95, ey + Math.sin(a) * er * 0.95);
        ctx.lineTo(ex + Math.cos(a + 0.2) * er * 0.6, ey + Math.sin(a + 0.2) * er * 0.6);
        ctx.stroke();
      }
    }
  }

  // Brow
  ctx.lineWidth = Math.max(2, len * 0.028);
  ctx.strokeStyle = '#16202a';
  ctx.beginPath();
  if (look.brow === 'angry') {
    ctx.moveTo(ex - er * 1.1, ey - er * 1.5);
    ctx.lineTo(ex + er * 1.0, ey - er * 0.7);
  } else if (look.brow === 'worried') {
    ctx.moveTo(ex - er * 1.0, ey - er * 1.0);
    ctx.lineTo(ex + er * 0.9, ey - er * 1.6);
  } else if (look.brow === 'smug') {
    ctx.moveTo(ex - er * 1.0, ey - er * 1.35);
    ctx.lineTo(ex + er * 1.0, ey - er * 1.2);
  } else if (look.brow === 'tired') {
    // Heavy eyelid instead of a brow
    ctx.moveTo(ex - er, ey - er * 0.15);
    ctx.lineTo(ex + er, ey - er * 0.15);
  } else if (look.brow === 'shifty') {
    // Low, suspicious lid
    ctx.moveTo(ex - er * 1.1, ey - er * 0.5);
    ctx.lineTo(ex + er * 1.1, ey - er * 0.35);
  } else if (look.brow === 'diva') {
    // Lashes
    for (const a of [-2.3, -1.85, -1.4]) {
      ctx.moveTo(ex + Math.cos(a) * er, ey + Math.sin(a) * er);
      ctx.lineTo(ex + Math.cos(a) * er * 1.6, ey + Math.sin(a) * er * 1.6);
    }
  }
  ctx.stroke();

  // Tiny top hat
  if (look.hat) {
    ctx.save();
    ctx.translate(rx * 0.42, -ry * 0.9);
    ctx.rotate(0.22);
    const hw = len * 0.13;
    ctx.fillStyle = '#1c1c24';
    ctx.fillRect(-hw * 0.85, -hw * 0.12, hw * 1.7, hw * 0.2);
    ctx.fillRect(-hw * 0.5, -hw * 1.05, hw, hw);
    ctx.fillStyle = '#c0392b';
    ctx.fillRect(-hw * 0.5, -hw * 0.38, hw, hw * 0.22);
    ctx.restore();
  }
}

// ---------- Everything that is not a fish (100-unit box) ----------

function drawBoot(ctx: Ctx, look: Look, t: number) {
  ctx.rotate(Math.sin(t * 2) * 0.06);

  // Sole
  ctx.beginPath();
  ctx.moveTo(-34, 30);
  ctx.lineTo(42, 30);
  ctx.quadraticCurveTo(48, 30, 48, 36);
  ctx.lineTo(-34, 36);
  ctx.closePath();
  ctx.fillStyle = look.fin;
  ctx.fill();
  ctx.stroke();

  // Upper
  ctx.beginPath();
  ctx.moveTo(-34, 30);
  ctx.lineTo(-32, -34);
  ctx.quadraticCurveTo(-14, -42, 2, -34);
  ctx.lineTo(4, 0);
  ctx.quadraticCurveTo(40, 2, 46, 30);
  ctx.closePath();
  ctx.fillStyle = look.body;
  ctx.fill();
  ctx.stroke();

  // Toe cap and cuff
  ctx.beginPath();
  ctx.moveTo(22, 6);
  ctx.quadraticCurveTo(18, 18, 20, 30);
  ctx.lineTo(46, 30);
  ctx.quadraticCurveTo(40, 6, 22, 6);
  ctx.fillStyle = look.belly;
  ctx.fill();
  ctx.fillRect(-33, -36, 35, 9);

  // Laces
  ctx.strokeStyle = '#e8dcc0';
  ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(-8, -20 + i * 9);
    ctx.lineTo(4, -17 + i * 9);
    ctx.stroke();
  }

  // Hole in the toe, with a drip
  ctx.beginPath();
  ctx.ellipse(34, 18, 5, 4, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#1a120a';
  ctx.fill();
  drip(ctx, -20, 40, t);
}

function drip(ctx: Ctx, x: number, y: number, t: number) {
  const k = (t * 0.9) % 1;
  ctx.beginPath();
  ctx.ellipse(x, y + k * 22, 2.5, 4, 0, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(120,200,235,${1 - k})`;
  ctx.fill();
}

function drawTurtle(ctx: Ctx, look: Look, t: number) {
  const paddle = Math.sin(t * 5) * 3;

  // Tail
  ctx.fillStyle = look.fin;
  ctx.beginPath();
  ctx.moveTo(-36, 12);
  ctx.lineTo(-54, 20);
  ctx.lineTo(-34, 22);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Legs
  for (const [x, dy] of [[-22, paddle], [16, -paddle]] as const) {
    ctx.beginPath();
    ctx.ellipse(x, 27 + dy * 0.5, 9, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // Head
  ctx.beginPath();
  ctx.ellipse(40, 6, 15, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(52, 2);
  ctx.lineTo(61, 9);
  ctx.lineTo(51, 12);
  ctx.closePath();
  ctx.fillStyle = '#c9b060';
  ctx.fill();
  ctx.stroke();

  // Shell
  ctx.beginPath();
  ctx.moveTo(-40, 20);
  ctx.quadraticCurveTo(-40, -36, 0, -34);
  ctx.quadraticCurveTo(36, -32, 34, 20);
  ctx.closePath();
  ctx.fillStyle = look.body;
  ctx.fill();
  ctx.stroke();
  // Ridges and plates
  ctx.fillStyle = look.body;
  for (const x of [-22, -4, 14]) {
    ctx.beginPath();
    ctx.moveTo(x - 7, -28);
    ctx.lineTo(x, -40);
    ctx.lineTo(x + 7, -28);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(20,30,10,0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-26, 18);
  ctx.lineTo(-18, -24);
  ctx.moveTo(-4, 18);
  ctx.lineTo(-2, -30);
  ctx.moveTo(18, 18);
  ctx.lineTo(14, -24);
  ctx.moveTo(-38, -4);
  ctx.lineTo(33, -4);
  ctx.stroke();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.5;
  ctx.fillStyle = look.belly;
  roundRect(ctx, -42, 15, 78, 8, 4);
  ctx.fill();
  ctx.stroke();

  // Face: permanently unimpressed
  ctx.beginPath();
  ctx.arc(43, 2, 4, 0, Math.PI * 2);
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(44.5, 2.5, 2, 0, Math.PI * 2);
  ctx.fillStyle = '#16202a';
  ctx.fill();
  ctx.strokeStyle = '#16202a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(37, -5);
  ctx.lineTo(50, -1);
  ctx.stroke();
}

function drawCart(ctx: Ctx, look: Look, t: number) {
  ctx.rotate(-0.12 + Math.sin(t * 2) * 0.03);
  ctx.strokeStyle = look.body;
  ctx.lineWidth = 3.5;

  // Basket
  ctx.beginPath();
  ctx.moveTo(-34, -24);
  ctx.lineTo(36, -24);
  ctx.lineTo(27, 12);
  ctx.lineTo(-27, 12);
  ctx.closePath();
  ctx.fillStyle = 'rgba(200,215,225,0.3)';
  ctx.fill();
  ctx.stroke();
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  for (let i = -2; i <= 2; i++) {
    ctx.moveTo(i * 12 + 1, -24);
    ctx.lineTo(i * 9.5, 12);
  }
  ctx.moveTo(-31, -12);
  ctx.lineTo(33, -12);
  ctx.moveTo(-29, 0);
  ctx.lineTo(30, 0);
  ctx.stroke();

  // Handle
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(-34, -24);
  ctx.lineTo(-46, -36);
  ctx.stroke();
  ctx.strokeStyle = look.belly;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(-52, -36);
  ctx.lineTo(-42, -36);
  ctx.stroke();

  // Frame and wheels
  ctx.strokeStyle = look.body;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(-22, 12);
  ctx.lineTo(-25, 30);
  ctx.lineTo(25, 30);
  ctx.lineTo(22, 12);
  ctx.stroke();
  ctx.fillStyle = look.fin;
  ctx.beginPath();
  ctx.arc(-25, 36, 6, 0, Math.PI * 2);
  ctx.fill();
  // The wobbly one
  ctx.beginPath();
  ctx.arc(25 + Math.sin(t * 9) * 2.5, 36, 6, 0, Math.PI * 2);
  ctx.fill();

  // Pond weed draped over the side
  ctx.strokeStyle = '#3f9a55';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(8, -26);
  ctx.quadraticCurveTo(20, -10, 10, 2);
  ctx.quadraticCurveTo(4, 12, 14, 22);
  ctx.stroke();
  drip(ctx, -6, 40, t);
}

function drawCan(ctx: Ctx, look: Look, t: number) {
  ctx.rotate(-0.22 + Math.sin(t * 2.2) * 0.05);

  const metal = ctx.createLinearGradient(-20, 0, 20, 0);
  metal.addColorStop(0, '#8d98a3');
  metal.addColorStop(0.4, '#e3e8ec');
  metal.addColorStop(1, look.body);
  ctx.fillStyle = metal;
  roundRect(ctx, -20, -26, 40, 58, 4);
  ctx.fill();
  ctx.stroke();

  // Label
  ctx.fillStyle = look.belly;
  ctx.fillRect(-19, -10, 38, 26);
  ctx.fillStyle = '#fff';
  ctx.font = `900 10px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('BEANS', 0, 4);

  // Rust
  ctx.fillStyle = 'rgba(140,80,30,0.6)';
  for (const [x, y, r] of [[-12, -18, 3], [10, 24, 4], [14, -20, 2]] as const) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Open top and bent-back lid
  ctx.fillStyle = '#4f5961';
  ctx.beginPath();
  ctx.ellipse(0, -26, 20, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.save();
  ctx.translate(17, -30);
  ctx.rotate(-0.95);
  ctx.fillStyle = '#c9d1d9';
  ctx.beginPath();
  ctx.ellipse(12, 0, 16, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  drip(ctx, -8, 38, t);
}

function drawBottle(ctx: Ctx, look: Look, t: number) {
  ctx.rotate(-0.5 + Math.sin(t * 1.8) * 0.06);

  // Glass: body, shoulders, neck
  ctx.fillStyle = look.body;
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.moveTo(-17, 40);
  ctx.lineTo(-17, -8);
  ctx.quadraticCurveTo(-17, -20, -7, -26);
  ctx.lineTo(-7, -42);
  ctx.lineTo(7, -42);
  ctx.lineTo(7, -26);
  ctx.quadraticCurveTo(17, -20, 17, -8);
  ctx.lineTo(17, 40);
  ctx.quadraticCurveTo(0, 45, -17, 40);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;

  // Rolled-up note inside, tied with string
  ctx.save();
  ctx.clip();
  ctx.fillStyle = look.belly;
  roundRect(ctx, -9, -14, 18, 46, 6);
  ctx.fill();
  ctx.strokeStyle = 'rgba(120,90,50,0.5)';
  ctx.lineWidth = 1.2;
  for (const y of [-6, 2, 10, 18, 26]) {
    ctx.beginPath();
    ctx.moveTo(-6, y);
    ctx.lineTo(6, y);
    ctx.stroke();
  }
  ctx.strokeStyle = '#c0392b';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-9, 9);
  ctx.lineTo(9, 9);
  ctx.stroke();
  ctx.restore();

  // Outline and shine
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-11, -4);
  ctx.lineTo(-11, 30);
  ctx.stroke();

  // Cork
  ctx.fillStyle = look.fin;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  roundRect(ctx, -8, -52, 16, 13, 3);
  ctx.fill();
  ctx.stroke();

  // A barnacle or two
  ctx.fillStyle = '#e9e4d6';
  for (const [x, y] of [[14, 30], [-14, 20]] as const) {
    ctx.beginPath();
    ctx.arc(x, y, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  drip(ctx, 0, 46, t);
}

function drawPhone(ctx: Ctx, look: Look, t: number) {
  // Buzzes in bursts, like an incoming call
  const ringing = t % 2 < 0.7;
  ctx.rotate(0.14 + (ringing ? Math.sin(t * 55) * 0.04 : 0));

  // Case
  ctx.fillStyle = look.body;
  roundRect(ctx, -25, -43, 50, 86, 11);
  ctx.fill();
  ctx.stroke();

  // Screen
  ctx.fillStyle = look.belly;
  roundRect(ctx, -20, -37, 40, 68, 6);
  ctx.fill();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#9fd8ff';
  ctx.font = `700 6.5px ${FONT}`;
  ctx.fillText('calling...', 0, -26);
  ctx.fillStyle = '#fff';
  ctx.font = `900 14px ${FONT}`;
  ctx.fillText('DAD', 0, -13);
  ctx.fillStyle = '#ff8a8a';
  ctx.font = `700 6px ${FONT}`;
  ctx.fillText('37 missed', 0, -1);

  // Answer / decline
  ctx.fillStyle = ringing ? '#4be07a' : '#2f9a55';
  ctx.beginPath();
  ctx.arc(-9, 17, 6.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e8483f';
  ctx.beginPath();
  ctx.arc(9, 17, 6.5, 0, Math.PI * 2);
  ctx.fill();

  // Crack across the screen
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(20, -30);
  ctx.lineTo(8, -20);
  ctx.lineTo(13, -12);
  ctx.lineTo(2, 6);
  ctx.stroke();

  // Shell charm and a strand of weed
  ctx.fillStyle = '#fff3e0';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 37, 4.5, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = look.fin;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(25, -34);
  ctx.quadraticCurveTo(38, -20, 28, -6);
  ctx.quadraticCurveTo(22, 4, 31, 14);
  ctx.stroke();

  if (ringing) {
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 2;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(s * 30, -40, 7, s > 0 ? -1.2 : Math.PI + 0.2, s > 0 ? 0.2 : Math.PI + 1.2);
      ctx.stroke();
    }
  }
}

function drawDuck(ctx: Ctx, look: Look, t: number) {
  ctx.translate(0, Math.sin(t * 3) * 3);
  ctx.rotate(Math.sin(t * 2.4) * 0.08);

  // Tail flick and body
  ctx.fillStyle = look.body;
  ctx.beginPath();
  ctx.moveTo(-30, 2);
  ctx.lineTo(-44, -10);
  ctx.lineTo(-24, -6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(-2, 12, 34, 24, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Wing
  ctx.fillStyle = look.belly;
  ctx.beginPath();
  ctx.ellipse(-8, 12, 15, 10, -0.3, 0, Math.PI * 2);
  ctx.fill();

  // Head
  ctx.fillStyle = look.body;
  ctx.beginPath();
  ctx.arc(20, -16, 19, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Beak
  ctx.fillStyle = look.fin;
  ctx.beginPath();
  ctx.ellipse(40, -11, 11, 6, 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // The thousand-yard stare
  ctx.fillStyle = '#16202a';
  ctx.beginPath();
  ctx.arc(24, -21, 3.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(25, -22.5, 1.2, 0, Math.PI * 2);
  ctx.fill();
}
