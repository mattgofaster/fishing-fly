import { CATALOG, Catch } from './catalog';
import { spotById } from './spots';
import { clamp, pick, rand } from './util';

/**
 * Earl always has one job for you. The first few tell a little story;
 * after that he makes them up as he goes, like everything else.
 */
export type QuestKind = 'catch' | 'heavy' | 'streak' | 'boat' | 'junk' | 'tourney';

export interface Quest {
  kind: QuestKind;
  /** A catch id for catch/heavy, unused otherwise. */
  target?: string;
  n: number;
  lb?: number;
  reward: number;
  /** Short line for the banner. */
  title: string;
  /** What Earl says when he hands it over. */
  ask: string;
}

export interface QuestState {
  q: Quest;
  have: number;
}

const STORY: Quest[] = [
  { kind: 'junk', n: 1, reward: 40, title: 'Fish out some junk',
    ask: "Lost my boot in here last spring. Reel up any junk and I'll check if it's mine. Size 11. Smells like me." },
  { kind: 'catch', target: 'bluegill', n: 3, reward: 50, title: 'Catch 3 Bluegill',
    ask: "Catch me three Bluegill. I need bait. Don't tell them that." },
  { kind: 'heavy', target: 'bass', n: 1, lb: 4, reward: 80, title: 'A Bass over 4 lb',
    ask: 'Land a Bass over four pounds. My wall looks naked without one.' },
  { kind: 'streak', n: 3, reward: 80, title: 'Land 3 in a row',
    ask: 'Land three in a row without embarrassing us. I believe in you. Mostly.' },
  { kind: 'boat', n: 1, reward: 100, title: "Buy my cousin's boat",
    ask: "Buy my cousin's boat. It's on the map. He keeps calling me about it." },
  { kind: 'catch', target: 'gar', n: 1, reward: 150, title: 'Catch a Longnose Gar',
    ask: "Something weird lives in Lily Pad Cove. Long nose. Bad attitude. Catch it." },
  { kind: 'tourney', n: 1, reward: 150, title: 'Top 3 in a tournament',
    ask: "Big Randy's been bragging at the bait shop. Enter a tournament and finish top three." },
  { kind: 'catch', target: 'catfish', n: 1, reward: 120, title: 'Catch Sir Whiskers',
    ask: 'Catch Sir Whiskers. He owes me twelve dollars and a hat. Stinky Cheese helps.' },
  { kind: 'catch', target: 'sturgeon', n: 1, reward: 200, title: 'Catch a Lake Sturgeon',
    ask: "Catch the Sturgeon at the Drop-Off. I want a shout-out on Bottom FM." },
  { kind: 'catch', target: 'muskie', n: 1, reward: 300, title: 'Catch a Muskie',
    ask: 'Catch a Muskie. Thirty years I have tried. Thirty. Do it for me. Then never mention it.' },
];

export const STORY_LENGTH = STORY.length;

const ASKS = {
  catch: [
    'I need {x}. Do not ask why. It is a whole thing.',
    "My doctor says I need more {x} in my life. Go get some.",
    'Bet you a sandwich you cannot catch {x}.',
  ],
  heavy: [
    'Bring me a {x}. A big one. I have a photo frame to fill.',
    'I told the guys at the bait shop you could land a {x}. Prove me right for once.',
  ],
  streak: [
    'Land {x} in a row. No fumbles. No trees.',
    "{x} in a row and I'll stop making fun of you. For an hour.",
  ],
  junk: [
    'The lake is a mess. Fish out {x}. Do some good for once.',
    'Somebody keeps dumping stuff in here. Reel in {x}.',
  ],
  tourney: [
    'Enter a tournament and finish top three. Randy is unbearable when he wins.',
  ],
};

function nameFor(id: string) {
  return CATALOG.find((c) => c.id === id)?.name ?? id;
}

/** True if this catch can be found with what you have. */
function reachable(c: Catch, boat: boolean) {
  return boat || !c.spots;
}

/** Earl makes something up. */
function randomQuest(boat: boolean): Quest {
  const fish = CATALOG.filter((c) => !c.junk && reachable(c, boat));
  const roll = Math.random();
  if (roll < 0.45) {
    const c = pick(fish);
    const n = c.rarity >= 6 ? 3 : c.rarity >= 3 ? 2 : 1;
    const reward = Math.max(30, Math.round((25 * n * (8 / c.rarity)) / 5) * 5);
    const x = n > 1 ? `${n} ${c.name}` : `a ${c.name}`;
    return {
      kind: 'catch', target: c.id, n, reward: Math.min(reward, 300),
      title: `Catch ${n > 1 ? `${n} ` : ''}${c.name}`, ask: pick(ASKS.catch).replace('{x}', x),
    };
  }
  if (roll < 0.7) {
    const c = pick(fish.filter((k) => k.maxLb >= 3));
    const lb = Math.round(c.minLb + (c.maxLb - c.minLb) * rand(0.4, 0.6));
    const reward = clamp(Math.round((40 + lb * c.coinPerLb * 0.6) / 5) * 5, 50, 250);
    return {
      kind: 'heavy', target: c.id, n: 1, lb, reward,
      title: `${c.name} over ${lb} lb`, ask: pick(ASKS.heavy).replace('{x}', `${c.name} over ${lb} pounds`),
    };
  }
  if (roll < 0.85) {
    const n = 3 + Math.floor(rand(0, 3));
    return {
      kind: 'streak', n, reward: n * 25,
      title: `Land ${n} in a row`, ask: pick(ASKS.streak).replace('{x}', String(n)),
    };
  }
  if (roll < 0.95) {
    const n = 2 + Math.floor(rand(0, 2));
    return {
      kind: 'junk', n, reward: n * 20,
      title: `Reel in ${n} pieces of junk`, ask: pick(ASKS.junk).replace('{x}', `${n} pieces of junk`),
    };
  }
  return { kind: 'tourney', n: 1, reward: 120, title: 'Top 3 in a tournament', ask: pick(ASKS.tourney) };
}

/** The next job: the story first, then whatever Earl dreams up. */
export function nextQuest(storyIdx: number, boat: boolean): Quest {
  if (storyIdx < STORY.length) return { ...STORY[storyIdx] };
  return randomQuest(boat);
}

/** A line explaining what the quest needs, for the quest card. */
export function questDetail(q: Quest): string {
  switch (q.kind) {
    case 'catch': {
      const c = CATALOG.find((k) => k.id === q.target);
      const where = c?.spots ? ` Found at ${c.spots.map((s) => spotById(s).name).join(', ')}.` : '';
      return `Land ${q.n > 1 ? `${q.n} of them` : 'one'}.${where} They bite twice as often while this is active.`;
    }
    case 'heavy':
      return `Land a ${nameFor(q.target!)} weighing at least ${q.lb} lb. They bite twice as often while this is active.`;
    case 'streak':
      return `Land ${q.n} catches in a row. Any failure resets the count. Junk counts. Earl is not picky.`;
    case 'boat':
      return 'Open the MAP and buy the boat.';
    case 'junk':
      return 'Boots, cans, carts: anything that is not a fish.';
    case 'tourney':
      return 'Tap the trophy, enter a tournament, finish 1st, 2nd or 3rd.';
  }
}
