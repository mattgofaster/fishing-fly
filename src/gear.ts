import { roundRect } from './util';

/** Upgrades come in tiers: you always use the best one you own. */
export const RODS = [
  { name: 'Twig', desc: 'Technically a stick. Reaches the shallow end on a good day.', reach: 0.62, price: 0 },
  { name: 'Decent Rod', desc: 'Made in an actual factory. Casts to the middle of the lake.', reach: 0.82, price: 150 },
  { name: 'The Launcher', desc: 'Carbon fibre. Casts to the far bank and possibly into orbit.', reach: 1, price: 600 },
];

export const REELS = [
  { name: 'Rusty Reel', desc: 'Sounds like a haunted bicycle.', speed: 1, price: 0 },
  { name: 'Smooth Spinner', desc: 'Reels 25% faster. Barely screams at all.', speed: 1.25, price: 120 },
  { name: 'Turbo Crank', desc: 'Reels 50% faster. Comes with a warning label.', speed: 1.5, price: 500 },
];

export const LINES = [
  { name: 'Old String', desc: 'Found in a drawer. Snaps if you look at it wrong.', tough: 1, price: 0 },
  { name: 'Braided Line', desc: 'Tension builds 20% slower when a fish runs.', tough: 0.8, price: 100 },
  { name: 'Steel Cable', desc: 'Tension builds 40% slower. Could tow a truck.', tough: 0.6, price: 450 },
];

export type UpgradeKind = 'rod' | 'reel' | 'line';
export const UPGRADES: Record<UpgradeKind, { label: string; tiers: { name: string; desc: string; price: number }[] }> = {
  rod: { label: 'Rod', tiers: RODS },
  reel: { label: 'Reel', tiers: REELS },
  line: { label: 'Line', tiers: LINES },
};

/** Lures are bought once, then swapped freely. They change what bites. */
export const LURES = [
  { id: 'worm', name: 'Plain Worm', desc: 'A classic. Everything eats it, nothing respects it.', price: 0 },
  { id: 'cheese', name: 'Stinky Cheese', desc: 'Catfish, carp and turtles bite 3x as often. So do flies.', price: 150 },
  { id: 'spoon', name: 'Shiny Spoon', desc: 'Big fish want the bling: heavier catches, fewer tiddlers.', price: 200 },
  { id: 'magnet', name: 'Fridge Magnet', desc: 'Junk bites 4x as often. Why would you want that? You know why.', price: 80 },
];

/** Hats do nothing. That is the point of hats. */
export const HATS = [
  { id: 'bucket', name: 'Bucket Hat', desc: 'Standard issue. Smells like sunscreen and defeat.', price: 0 },
  { id: 'cowboy', name: 'Cowboy Hat', desc: 'Yeehaw. The fish remain unimpressed.', price: 75 },
  { id: 'propeller', name: 'Propeller Beanie', desc: 'Provides zero lift. Tested extensively.', price: 150 },
  { id: 'cone', name: 'Traffic Cone', desc: 'High visibility, low dignity.', price: 250 },
  { id: 'crown', name: 'Lake Crown', desc: 'For royalty. Changes nothing, and yet everything.', price: 1000 },
];

/** Draws a hat sitting on a head of radius 13 centred at the origin. */
export function drawHat(ctx: CanvasRenderingContext2D, id: string, t: number) {
  switch (id) {
    case 'cowboy': {
      ctx.fillStyle = '#8a5a2b';
      ctx.beginPath();
      ctx.ellipse(0, -5, 28, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-13, -6);
      ctx.quadraticCurveTo(-15, -27, -5, -24);
      ctx.quadraticCurveTo(0, -20, 5, -24);
      ctx.quadraticCurveTo(15, -27, 13, -6);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#3a2412';
      ctx.fillRect(-13, -11, 26, 3.5);
      break;
    }
    case 'propeller': {
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, -4, 14, Math.PI, 0);
      ctx.closePath();
      ctx.clip();
      const stripes = ['#e8402f', '#ffd23f', '#2f8fc4', '#ffd23f', '#e8402f'];
      stripes.forEach((c, i) => {
        ctx.fillStyle = c;
        ctx.fillRect(-14 + i * 5.6, -20, 5.7, 18);
      });
      ctx.restore();
      ctx.strokeStyle = '#30363d';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -18);
      ctx.lineTo(0, -24);
      ctx.stroke();
      ctx.fillStyle = '#e8402f';
      ctx.beginPath();
      ctx.ellipse(0, -24, 2 + 12 * Math.abs(Math.cos(t * 14)), 2.6, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'cone': {
      ctx.fillStyle = '#ff7a1a';
      roundRect(ctx, -16, -9, 32, 6, 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-10, -8);
      ctx.lineTo(-3, -36);
      ctx.lineTo(3, -36);
      ctx.lineTo(10, -8);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.moveTo(-7.5, -18);
      ctx.lineTo(-6, -24);
      ctx.lineTo(6, -24);
      ctx.lineTo(7.5, -18);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'crown': {
      ctx.fillStyle = '#f5c518';
      ctx.strokeStyle = '#b8860b';
      ctx.lineWidth = 1.5;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(-13, -5);
      ctx.lineTo(-13, -21);
      ctx.lineTo(-7, -13);
      ctx.lineTo(0, -25);
      ctx.lineTo(7, -13);
      ctx.lineTo(13, -21);
      ctx.lineTo(13, -5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      const sparkle = 0.6 + 0.4 * Math.sin(t * 5);
      for (const [x, r, c] of [[0, 2.4, '#e8402f'], [-8, 1.7, '#2f8fc4'], [8, 1.7, '#3aa655']] as const) {
        ctx.fillStyle = c;
        ctx.globalAlpha = sparkle;
        ctx.beginPath();
        ctx.arc(x, -9.5, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      break;
    }
    default: {
      // Bucket hat
      ctx.fillStyle = '#7d9440';
      ctx.beginPath();
      ctx.ellipse(0, -4, 21, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      roundRect(ctx, -13, -21, 26, 18, 8);
      ctx.fill();
      ctx.fillStyle = '#5f7430';
      ctx.fillRect(-13, -9, 26, 3);
      ctx.fillStyle = '#ff6b5a';
      ctx.beginPath();
      ctx.arc(8, -14, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
