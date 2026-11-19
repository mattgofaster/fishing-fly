/**
 * Gives any flat drawing some volume: it is drawn into a scratch canvas, then
 * sunlight from the upper right and shade toward the lower left are painted
 * over it, only where it has pixels. The scene's sun sits up and to the right.
 */
type Ctx = CanvasRenderingContext2D;

let scratch: HTMLCanvasElement | null = null;

/**
 * Draws `draw` lit. (x, y, w, h) is a box in the current coordinate space
 * that holds everything `draw` paints; anything outside it is cut off.
 */
export function drawLit(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  draw: (c: Ctx) => void,
  strength = 1,
) {
  const m = ctx.getTransform();
  const scale = Math.hypot(m.a, m.b);
  const pw = Math.ceil(w * scale);
  const ph = Math.ceil(h * scale);
  if (pw < 4 || ph < 4 || pw > 2048 || ph > 2048) {
    draw(ctx);
    return;
  }
  scratch ??= document.createElement('canvas');
  if (scratch.width < pw || scratch.height < ph) {
    scratch.width = Math.max(scratch.width, pw);
    scratch.height = Math.max(scratch.height, ph);
  }
  const c = scratch.getContext('2d')!;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalCompositeOperation = 'source-over';
  c.globalAlpha = 1;
  // Clear a margin too: image smoothing samples a pixel past the edge.
  c.clearRect(0, 0, pw + 2, ph + 2);
  c.setTransform(scale, 0, 0, scale, -x * scale, -y * scale);
  c.save();
  draw(c);
  c.restore();

  c.globalCompositeOperation = 'source-atop';
  const light = c.createLinearGradient(x + w, y, x, y + h);
  light.addColorStop(0, `rgba(255,248,225,${0.32 * strength})`);
  light.addColorStop(0.42, 'rgba(255,248,225,0)');
  light.addColorStop(0.58, 'rgba(10,20,35,0)');
  light.addColorStop(1, `rgba(10,20,35,${0.42 * strength})`);
  c.fillStyle = light;
  c.fillRect(x, y, w, h);
  c.globalCompositeOperation = 'source-over';

  ctx.drawImage(scratch, 0, 0, pw, ph, x, y, w, h);
}
