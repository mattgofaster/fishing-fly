import { rand } from './util';

/** Three minutes, heaviest total wins. Junk does not count. */
export const TOURNEY_TIME = 180;
export const COUNTDOWN = 3;

export interface Rival {
  name: string;
  quip: string;
  /** Share of the par weight they usually land. */
  skill: number;
  /** How much their haul swings from one tournament to the next (± share). */
  swing: number;
  color: string;
}

export const RIVALS: Rival[] = [
  { name: 'Kevin', quip: 'Twelve. Brought a juice box. Talks the entire time.', skill: 0.35, swing: 0.2, color: '#5fd36a' },
  { name: 'Grandma Pearl', quip: 'Sweet as pie. Has never once lost. Do not trust her.', skill: 0.7, swing: 0.2, color: '#f4a6c8' },
  { name: 'Big Randy', quip: 'Matching boat, truck and sunglasses. Calls everyone "champ".', skill: 1.5, swing: 0.1, color: '#ffb347' },
];

/**
 * Par: roughly what a solid player lands in three minutes with starter gear,
 * measured by simulation. Rivals scale off this.
 */
export const PAR: Record<string, number> = { pier: 22, cove: 24, dropoff: 31, stumps: 22 };

export const PRIZES = [200, 100, 50, 15];
export const BEST_BONUS = 50;

export interface RivalRun {
  name: string;
  color: string;
  total: number;
  /** Their catches, as [time, lb], in order. */
  plan: [number, number][];
  next: number;
}

/** Decides ahead of time what each rival will land and when. */
export function planRivals(spot: string): RivalRun[] {
  const par = PAR[spot] ?? 22;
  return RIVALS.map((r) => {
    const final = par * r.skill * rand(1 - r.swing, 1 + r.swing);
    const n = Math.max(3, Math.round(final / (par / 9)));
    const weights = Array.from({ length: n }, () => rand(0.5, 1.5));
    const sum = weights.reduce((a, b) => a + b, 0);
    const plan: [number, number][] = weights
      .map((w, i): [number, number] => [
        ((i + rand(0.2, 0.9)) / n) * (TOURNEY_TIME - 4),
        Math.round(((w / sum) * final) * 10) / 10,
      ]);
    return { name: r.name, color: r.color, total: 0, plan, next: 0 };
  });
}

export const TOURNEY_LINES = {
  start: ['Three minutes. Heaviest bag wins. Boots do NOT count.', "Go go go! Randy's already casting!"],
  minute: ['One minute left! Stop looking at me!', "Sixty seconds! Reel like you mean it!"],
  ten: ['TEN SECONDS!', 'Last cast! Make it count!'],
  junk: ["The judges don't weigh footwear.", 'Zero pounds. Garbage is not a fish.', 'Nice try. Junk counts for nothing.'],
  overtaken: ['{x} just passed you!', '{x} is ahead! Unacceptable!'],
  lastFish: ["Time! But land that one, it still counts!"],
  place: [
    ["FIRST! I knew you could do it! I said that out loud once!", "Champion! Randy is crying in his truck!"],
    ['Second. Respectable. Not great. Respectable.', 'Silver. Like my hair. And my hopes.'],
    ['Third. You beat somebody. Probably Kevin.', 'Bronze. They give you a tiny medal and a big sigh.'],
    ['Last. Behind KEVIN. He is twelve.', 'Dead last. Grandma Pearl sends her condolences.'],
  ],
};
