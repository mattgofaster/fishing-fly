import type { QuestState } from './quests';
import { SPOTS } from './spots';

const KEY = 'fishingfly.v1';

export interface SaveData {
  coins: number;
  caught: number;
  /** Heaviest of each catch, by id. A key here means it has been discovered. */
  records: Record<string, number>;
  /** How many of each have been landed. */
  counts: Record<string, number>;
  /** Upgrade tiers owned (index into the tier lists). */
  rod: number;
  reel: number;
  line: number;
  lures: string[];
  lure: string;
  hats: string[];
  hat: string;
  boat: boolean;
  /** Where you are fishing right now. */
  spot: string;
  /** Earl's current job for you. */
  quest: QuestState | null;
  /** How far through the story quests you are. */
  questNo: number;
  questsDone: number;
  /** Best tournament total at each spot. */
  tourneyBest: Record<string, number>;
  tourneyWins: number;
}

function fresh(): SaveData {
  return {
    coins: 0,
    caught: 0,
    records: {},
    counts: {},
    rod: 0,
    reel: 0,
    line: 0,
    lures: ['worm'],
    lure: 'worm',
    hats: ['bucket'],
    hat: 'bucket',
    boat: false,
    spot: 'pier',
    quest: null,
    questNo: 0,
    questsDone: 0,
    tourneyBest: {},
    tourneyWins: 0,
  };
}

function validQuest(v: unknown): QuestState | null {
  const s = v as QuestState | null;
  if (!s || typeof s !== 'object' || !s.q || typeof s.q.title !== 'string') return null;
  return { q: s.q, have: Number(s.have) || 0 };
}

const tier = (v: unknown) => Math.max(0, Math.min(2, Math.floor(Number(v) || 0)));
const list = (v: unknown, first: string): string[] => {
  const items = Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  return items.includes(first) ? items : [first, ...items];
};

export function loadSave(): SaveData {
  const base = fresh();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return base;
    const data = JSON.parse(raw);
    const records: Record<string, number> =
      data.records && typeof data.records === 'object' ? data.records : {};
    const counts: Record<string, number> =
      data.counts && typeof data.counts === 'object' ? data.counts : {};
    // Saves from before counts existed: anything with a record was caught at least once.
    for (const id of Object.keys(records)) counts[id] = counts[id] || 1;
    const lures = list(data.lures, 'worm');
    const hats = list(data.hats, 'bucket');
    const boat = data.boat === true;
    const spot = boat && SPOTS.some((s) => s.id === data.spot) ? String(data.spot) : 'pier';
    return {
      coins: Math.max(0, Number(data.coins) || 0),
      caught: Number(data.caught) || 0,
      records,
      counts,
      rod: tier(data.rod),
      reel: tier(data.reel),
      line: tier(data.line),
      lures,
      lure: lures.includes(data.lure) ? data.lure : 'worm',
      hats,
      hat: hats.includes(data.hat) ? data.hat : 'bucket',
      boat,
      spot,
      quest: validQuest(data.quest),
      questNo: Math.max(0, Math.floor(Number(data.questNo) || 0)),
      questsDone: Number(data.questsDone) || 0,
      tourneyBest: data.tourneyBest && typeof data.tourneyBest === 'object' ? data.tourneyBest : {},
      tourneyWins: Number(data.tourneyWins) || 0,
    };
  } catch {
    return base;
  }
}

export function writeSave(data: SaveData) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // Private browsing or storage blocked: the game still plays, it just won't remember.
  }
}
