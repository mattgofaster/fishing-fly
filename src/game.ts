import { sfx } from './audio';
import { BUDDY } from './buddy';
import { CATALOG, Catch, coinsFor, pickCatch, rollWeight } from './catalog';
import { HATS, LINES, LURES, REELS, RODS, UpgradeKind, UPGRADES } from './gear';
import { loadSave, SaveData, writeSave } from './save';
import { nextQuest, STORY_LENGTH } from './quests';
import { BOAT, spotById } from './spots';
import {
  BEST_BONUS, COUNTDOWN, planRivals, PRIZES, RivalRun, TOURNEY_LINES, TOURNEY_TIME,
} from './tourney';
import { clamp, easeOut, lerp, pick, rand } from './util';

export type Phase = 'idle' | 'cast' | 'wait' | 'bite' | 'fight' | 'result' | 'fail';

export interface Layout {
  W: number;
  H: number;
  /** Design unit: 1 on a 390x844 screen. */
  u: number;
  safeTop: number;
  safeBottom: number;
  horizon: number;
  yNear: number;
  yFar: number;
  pierTop: number;
  anglerX: number;
  feetY: number;
}

/** Lake coordinates (lx: -1..1 across, d: 0 at the pier to 1 at the far bank) to screen. */
export function project(L: Layout, lx: number, d: number) {
  const dd = clamp(d, 0, 1);
  const p = 0.45 * dd + 0.55 * (1 - (1 - dd) * (1 - dd));
  return {
    x: L.W / 2 + lx * L.W * 0.44 * lerp(1, 0.6, p),
    y: lerp(L.yNear, L.yFar, p),
    s: lerp(1, 0.38, p),
  };
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  r: number;
}

export interface Ripple {
  lx: number;
  d: number;
  t: number;
}

export interface Bubble {
  text: string;
  t: number;
  dur: number;
}

export interface Shadow {
  lx: number;
  d: number;
  dir: number;
  speed: number;
  size: number;
  phase: number;
}

export interface FightFish {
  lx: number;
  d: number;
  state: 'tire' | 'warn' | 'run';
  stateT: number;
  stamina: number;
  targetLx: number;
  dir: number;
}

export interface Hit {
  x: number;
  y: number;
  w: number;
  h: number;
  fn: () => void;
}

export type Screen = 'none' | 'shop' | 'journal' | 'map' | 'quest' | 'tourney' | 'tourneyEnd';

export interface Tourney {
  /** Seconds since GO. Negative during the countdown. */
  t: number;
  total: number;
  count: number;
  biggest: number;
  rivals: RivalRun[];
  /** Time ran out mid-fight: that fish still counts. */
  lastFish: boolean;
  warned60: boolean;
  warned10: boolean;
  overtakeCool: number;
}

export interface TourneyResult {
  spot: string;
  total: number;
  count: number;
  biggest: number;
  rows: { name: string; total: number; color: string; you: boolean }[];
  place: number;
  prize: number;
  best: boolean;
}

export interface Toast {
  title: string;
  sub: string;
  coins: number;
  t: number;
  dur: number;
}

/** Seconds the boat ride between spots takes. The scene swaps halfway. */
export const TRAVEL_DUR = 1.9;

export interface Result {
  c: Catch;
  weight: number;
  coins: number;
  record: boolean;
  /** First time this has ever been caught. */
  first: boolean;
  found: number;
  total: number;
  quote: string;
}

const REEL_SPEED = 0.13;
const SLACK_LEVEL = 0.15;
const SLACK_LIMIT = 1.6;
export const RED_LEVEL = 0.78;
export const TREES_AT = 1.2;

/** Picks a line, avoiding an immediate repeat. */
function fresh(lines: readonly string[], last: string): string {
  if (lines.length < 2) return lines[0];
  let line = pick(lines);
  while (line === last) line = pick(lines);
  return line;
}

export class Game {
  L: Layout = {
    W: 390, H: 844, u: 1, safeTop: 0, safeBottom: 0,
    horizon: 250, yNear: 560, yFar: 262, pierTop: 590, anglerX: 195, feetY: 740,
  };
  phase: Phase = 'idle';
  phaseT = 0;
  time = 0;
  save: SaveData = loadSave();

  held = false;
  drag: { x0: number; y0: number; x: number; y: number } | null = null;

  // Cast
  castFrom = { x: 0, y: 0 };
  castTo = { lx: 0, d: 0.5 };
  castDur = 1;
  castPower = 0.5;
  castTrees = false;

  // Bobber and the thing about to bite
  bobber = { lx: 0, d: 0.5 };
  current: Catch | null = null;
  weight = 0;
  biteAt = 0;
  approachAt = Infinity;
  arriveAt = Infinity;
  nibbles: number[] = [];
  lurkFrom = { lx: 0, d: 0 };
  waitChatAt = Infinity;

  // Fight
  fish: FightFish = { lx: 0, d: 0, state: 'tire', stateT: 1, stamina: 1, targetLx: 0, dir: 1 };
  tension = 0.4;
  slackT = 0;
  warnCooldown = 0;
  /** Countdowns to the next reel click and the next too-tight beep. */
  tickT = 0;
  beepT = 0;
  nibbleIdx = 0;
  winStreak = 0;

  // Menus. `hits` is rebuilt by the renderer every frame.
  screen: Screen = 'none';
  screenT = 0;
  shopTab: 'gear' | 'lures' | 'hats' = 'gear';
  journalSel: string | null = null;
  hits: Hit[] = [];
  /** Boat ride in progress. */
  travel: { to: string; t: number; switched: boolean } | null = null;
  private boatHinted = false;
  tourney: Tourney | null = null;
  tourneyResult: TourneyResult | null = null;
  /** Big announcement at the top: quest complete. */
  toast: Toast | null = null;
  /** Small news line under the tournament clock. */
  ticker: Bubble | null = null;
  /** When Earl hands out the next quest. */
  private questAt = 8;
  failStreak = 0;
  private lastBuddy = '';
  private lastFish = '';
  splashAcc = 0;

  result: Result | null = null;
  failTitle = '';
  failSub = '';

  buddy: Bubble | null = null;
  fishSay: Bubble | null = null;
  /** Where the fish bubble is anchored when there is no live fish to follow. */
  fishSayAt = { lx: 0, d: 0.5 };
  idleNag = 6;
  shake = 0;

  particles: Particle[] = [];
  ripples: Ripple[] = [];
  shadows: Shadow[] = [];

  /** Title screen up: the first tap starts the game (and unlocks sound on iOS). */
  title = true;

  constructor() {
    this.spawnShadows();
  }

  private leaveTitle() {
    this.title = false;
    sfx.splash(0.5);
    this.say(this.onBoat() ? BUDDY.arrive[this.save.spot] : BUDDY.hello, 6);
    this.questAt = this.time + 8;
  }

  private spawnShadows() {
    // Boat spots are fishier, and the shadows run a little bigger.
    const boat = this.onBoat();
    this.shadows = [];
    for (let i = 0; i < (boat ? 7 : 5); i++) {
      this.shadows.push({
        lx: rand(-1, 1),
        d: rand(0.12, 0.95),
        dir: pick([-1, 1]),
        speed: rand(0.04, 0.1),
        size: rand(0.6, 1.2) * (boat ? 1.15 : 1),
        phase: rand(0, 6),
      });
    }
  }

  onBoat() {
    return this.save.spot !== 'pier';
  }

  spot() {
    return spotById(this.save.spot);
  }

  /** The boat rocks gently; the pier does not. */
  bob() {
    return this.onBoat() ? Math.sin(this.time * 1.6) * 2.5 * this.L.u : 0;
  }

  setLayout(W: number, H: number, safeTop: number, safeBottom: number) {
    const u = Math.min(W / 390, H / 844);
    const horizon = Math.max(H * 0.27, safeTop + 150 * u);
    const feetY = H - safeBottom - 92 * u;
    const pierTop = feetY - 146 * u;
    this.L = {
      W, H, u, safeTop, safeBottom, horizon,
      yNear: pierTop - 26 * u,
      yFar: horizon + 14 * u,
      pierTop,
      anglerX: W / 2,
      feetY,
    };
  }

  // ---------- Talking ----------

  say(lines: readonly string[], dur = 3.6) {
    this.lastBuddy = fresh(lines, this.lastBuddy);
    this.buddy = { text: this.lastBuddy, t: 0, dur };
    sfx.buddyTalk();
    this.idleNag = rand(9, 14);
  }

  fishTalk(lines: readonly string[], dur = 2.3) {
    this.lastFish = fresh(lines, this.lastFish);
    this.fishSay = { text: this.lastFish, t: 0, dur };
    switch (this.current?.voice) {
      case 'squelch': sfx.squelch(); break;
      case 'squeak': sfx.squeak(); break;
      case 'ring': sfx.ring(); break;
      case 'clank': sfx.clank(); break;
      default: sfx.fishTalk(this.weight);
    }
  }

  // ---------- Geometry shared with the renderer ----------

  hand() {
    const { anglerX, feetY, u } = this.L;
    return { x: anglerX + 20 * u, y: feetY - 76 * u + this.bob() };
  }

  rodTip() {
    const { u } = this.L;
    const h = this.hand();
    let x = h.x + 30 * u;
    let y = h.y - 118 * u;
    if (this.phase === 'idle' && this.drag) {
      const pull = clamp(this.dragInfo().raw, 0, 1.3);
      x -= pull * 26 * u;
      y += pull * 56 * u;
    } else if (this.phase === 'cast') {
      // Whip forward, then settle.
      const t = clamp(this.phaseT / 0.28, 0, 1);
      const back = (1 - easeOut(t)) * this.castPower;
      x -= back * 26 * u;
      y += back * 56 * u - Math.sin(t * Math.PI) * 14 * u;
    } else if (this.phase === 'fight') {
      const f = project(this.L, this.fish.lx, this.fish.d);
      const side = clamp((f.x - h.x) / (this.L.W * 0.4), -1, 1);
      x += side * 30 * u * (0.4 + this.tension);
      y += this.tension * 34 * u;
      if (this.fish.state === 'run') x += Math.sin(this.time * 40) * 2 * u;
    } else if (this.phase === 'bite') {
      y += 8 * u;
    }
    return { x, y };
  }

  /** Speaker button, top right. */
  muteBtn() {
    const { W, u, safeTop } = this.L;
    const r = 17 * u;
    return { x: W - 12 * u - r, y: safeTop + 10 * u + r, r };
  }

  /** Music note button, under the speaker. */
  musicBtn() {
    const m = this.muteBtn();
    return { x: m.x, y: m.y + m.r * 2 + 8 * this.L.u, r: m.r };
  }

  /** Tournament trophy, under the music button. */
  trophyBtn() {
    const m = this.musicBtn();
    return { x: m.x, y: m.y + m.r * 2 + 8 * this.L.u, r: m.r };
  }

  /** How far out a swipe of this strength lands with the current rod. */
  castD(raw: number) {
    return clamp(raw, 0.05, 1) * RODS[this.save.rod].reach;
  }

  reach() {
    return RODS[this.save.rod].reach;
  }

  /** What the current swipe would do if released now. */
  dragInfo() {
    const g = this.drag;
    if (!g) return { raw: 0, lx: 0, dy: 0 };
    const dy = g.y0 - g.y;
    const raw = dy / (this.L.H * 0.36);
    const lx = clamp(((g.x - g.x0) / Math.max(dy, 1)) * 1.5, -1, 1);
    return { raw, lx, dy };
  }

  /** Position of the fish that is about to bite, while waiting. */
  lurk() {
    if (!this.current || this.current.junk || this.phase !== 'wait' && this.phase !== 'bite') {
      return null;
    }
    const t = this.phase === 'bite' ? Infinity : this.phaseT;
    if (t < this.approachAt) return null;
    const a = easeOut(clamp((t - this.approachAt) / (this.arriveAt - this.approachAt), 0, 1));
    const side = Math.sign(this.lurkFrom.lx - this.bobber.lx) || 1;
    const circle = a >= 1 ? Math.sin(this.time * 2.2) * 0.03 : 0;
    return {
      lx: lerp(this.lurkFrom.lx, this.bobber.lx + side * 0.07, a) + circle,
      d: lerp(this.lurkFrom.d, this.bobber.d, a),
      dir: -side,
    };
  }

  /** How far the bobber is pulled under, 0..1. */
  bobberDip() {
    if (this.phase === 'bite') return 1;
    if (this.phase !== 'wait') return 0;
    for (const n of this.nibbles) {
      const dt = this.phaseT - n;
      if (dt >= 0 && dt < 0.26) return 0.35 * Math.sin((dt / 0.26) * Math.PI);
    }
    return 0;
  }

  // ---------- Input ----------

  onDown(x: number, y: number) {
    if (this.title) {
      if (this.time > 0.4) this.leaveTitle();
      return;
    }
    if (this.travel || (this.tourney && this.tourney.t < 0)) return;
    for (let i = this.hits.length - 1; i >= 0; i--) {
      const h = this.hits[i];
      if (x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) {
        h.fn();
        return;
      }
    }
    if (this.screen !== 'none') return;
    switch (this.phase) {
      case 'idle':
        this.drag = { x0: x, y0: y, x, y };
        break;
      case 'wait':
        if (this.lurk()) this.fail('early');
        else this.reelIn();
        break;
      case 'bite':
        this.startFight();
        break;
      case 'fight':
        this.held = true;
        break;
      case 'result':
        if (this.phaseT > 0.7) this.toIdle();
        break;
      case 'fail':
        if (this.phaseT > 0.6) this.toIdle();
        break;
    }
  }

  onMove(x: number, y: number) {
    if (this.drag) {
      this.drag.x = x;
      this.drag.y = y;
    }
  }

  onUp(cancelled = false) {
    this.held = false;
    if (this.phase === 'idle' && this.drag) {
      const info = this.dragInfo();
      this.drag = null;
      if (!cancelled && info.dy > 34 * this.L.u) this.cast(info.raw, info.lx);
    } else {
      this.drag = null;
    }
  }

  // ---------- Menus and shopping ----------

  found() {
    return CATALOG.filter((c) => this.save.records[c.id]).length;
  }

  openScreen(screen: Screen) {
    this.screen = screen;
    this.screenT = 0;
    this.journalSel = null;
    this.drag = null;
    sfx.tick();
    const lines = {
      shop: BUDDY.shop,
      journal: BUDDY.journal,
      map: this.save.boat ? BUDDY.map : BUDDY.mapNoBoat,
      quest: this.save.quest ? [this.save.quest.q.ask] : BUDDY.idle,
      tourney: BUDDY.tourneyOpen,
      tourneyEnd: BUDDY.idle,
      none: BUDDY.idle,
    }[screen];
    this.say(lines, screen === 'quest' ? 6 : 4);
  }

  // ---------- Quests ----------

  private giveQuest() {
    const story = this.save.questNo < STORY_LENGTH;
    const q = nextQuest(this.save.questNo, this.save.boat);
    if (story) this.save.questNo++;
    this.save.quest = { q, have: 0 };
    writeSave(this.save);
    this.say([q.ask], 6.5);
    sfx.tick();
    // Already done? (You bought the boat before he asked.)
    if (q.kind === 'boat' && this.save.boat) this.questEvent({ type: 'boat' });
  }

  private questEvent(
    e: { type: 'win'; c: Catch; weight: number } | { type: 'fail' } | { type: 'boat' } | { type: 'tourney'; place: number },
  ) {
    const s = this.save.quest;
    if (!s) return;
    const q = s.q;
    const before = s.have;
    switch (q.kind) {
      case 'catch':
        if (e.type === 'win' && e.c.id === q.target) s.have++;
        break;
      case 'heavy':
        if (e.type === 'win' && e.c.id === q.target && e.weight >= (q.lb ?? 0)) s.have++;
        break;
      case 'junk':
        if (e.type === 'win' && e.c.junk) s.have++;
        break;
      case 'streak':
        if (e.type === 'win') s.have++;
        else if (e.type === 'fail') s.have = 0;
        break;
      case 'boat':
        if (e.type === 'boat') s.have = 1;
        break;
      case 'tourney':
        if (e.type === 'tourney' && e.place <= 2) s.have = 1;
        break;
    }
    if (s.have >= q.n) this.completeQuest();
    else if (s.have !== before) writeSave(this.save);
  }

  private completeQuest() {
    const q = this.save.quest!.q;
    this.save.coins += q.reward;
    this.save.questsDone++;
    this.save.quest = null;
    writeSave(this.save);
    this.toast = { title: 'QUEST COMPLETE!', sub: q.title, coins: q.reward, t: 0, dur: 3.2 };
    sfx.questDone();
    this.say(BUDDY.questDone, 4.5);
    this.questAt = this.time + 7;
  }

  skipQuest() {
    if (!this.save.quest) return;
    this.save.quest = null;
    writeSave(this.save);
    this.closeScreen();
    this.say(BUDDY.questSkip, 4);
    this.questAt = this.time + 4;
  }

  // ---------- Tournaments ----------

  startTourney() {
    this.closeScreen();
    this.toIdle();
    this.tourney = {
      t: -COUNTDOWN,
      total: 0,
      count: 0,
      biggest: 0,
      rivals: planRivals(this.save.spot),
      lastFish: false,
      warned60: false,
      warned10: false,
      overtakeCool: 0,
    };
    this.buddy = null;
    sfx.countdown(0);
    sfx.setMusicMode('tourney');
  }

  /** 1-based place right now. */
  rank() {
    const tr = this.tourney;
    if (!tr) return 1;
    return 1 + tr.rivals.filter((r) => r.total > tr.total).length;
  }

  private updateTourney(dt: number) {
    const tr = this.tourney!;
    const prev = tr.t;
    tr.t += dt;
    if (tr.t < 0) {
      // Beep on each whole second of the countdown.
      if (Math.floor(prev) !== Math.floor(tr.t)) sfx.countdown(0);
      return;
    }
    if (prev < 0) {
      sfx.horn();
      this.say(TOURNEY_LINES.start, 3);
    }
    tr.overtakeCool -= dt;

    // Rivals land their fish on schedule.
    for (const r of tr.rivals) {
      while (r.next < r.plan.length && r.plan[r.next][0] <= tr.t) {
        const [, lb] = r.plan[r.next++];
        const wasBehind = r.total <= tr.total;
        r.total = Math.round((r.total + lb) * 10) / 10;
        this.ticker = { text: `${r.name} +${lb.toFixed(1)} lb`, t: 0, dur: 2.2 };
        if (wasBehind && r.total > tr.total && tr.total > 0 && tr.overtakeCool <= 0 && this.phase !== 'fight') {
          this.say(TOURNEY_LINES.overtaken.map((l) => l.replace('{x}', r.name)), 2.5);
          tr.overtakeCool = 12;
        }
      }
    }

    const left = TOURNEY_TIME - tr.t;
    if (!tr.warned60 && left <= 60) {
      tr.warned60 = true;
      if (this.phase !== 'fight') this.say(TOURNEY_LINES.minute, 2.5);
      sfx.countdown(0);
    }
    if (!tr.warned10 && left <= 10) {
      tr.warned10 = true;
      this.say(TOURNEY_LINES.ten, 2);
    }
    if (left <= 10 && left > 0 && Math.floor(prev) !== Math.floor(tr.t)) sfx.countdown(0, 0.5);

    if (left <= 0) {
      if (this.phase === 'fight') {
        if (!tr.lastFish) {
          tr.lastFish = true;
          this.say(TOURNEY_LINES.lastFish, 3);
        }
      } else {
        this.endTourney();
      }
    }
  }

  private endTourney() {
    const tr = this.tourney!;
    // Rivals finish whatever is left on their plan.
    for (const r of tr.rivals) {
      while (r.next < r.plan.length) r.total = Math.round((r.total + r.plan[r.next++][1]) * 10) / 10;
    }
    const total = Math.round(tr.total * 10) / 10;
    const rows = [
      { name: 'You', total, color: '#2f8fc4', you: true },
      ...tr.rivals.map((r) => ({ name: r.name, total: r.total, color: r.color, you: false })),
    ].sort((a, b) => b.total - a.total || (a.you ? -1 : 1));
    const place = rows.findIndex((r) => r.you);
    const spot = this.save.spot;
    const best = total > 0 && total > (this.save.tourneyBest[spot] ?? 0);
    if (best) this.save.tourneyBest[spot] = total;
    const prize = PRIZES[place] + (best ? BEST_BONUS : 0);
    this.save.coins += prize;
    if (place === 0) this.save.tourneyWins++;
    writeSave(this.save);

    this.tourneyResult = { spot, total, count: tr.count, biggest: tr.biggest, rows, place, prize, best };
    this.tourney = null;
    this.ticker = null;
    this.toIdle();
    this.screen = 'tourneyEnd';
    this.screenT = 0;
    sfx.setMusicMode('chill');
    sfx.whistle();
    if (place === 0) sfx.win(true);
    else if (place === 3) sfx.fail(0.6);
    else sfx.win(false);
    this.say(TOURNEY_LINES.place[place], 6);
    this.questEvent({ type: 'tourney', place });
  }

  buyBoat() {
    if (this.save.boat || !this.pay(BOAT.price)) return;
    this.save.boat = true;
    writeSave(this.save);
    sfx.horn();
    this.say(BUDDY.boatBuy, 5);
    this.questEvent({ type: 'boat' });
  }

  /** Heads to a spot on the map, by boat. */
  goTo(id: string) {
    const spot = spotById(id);
    if (spot.boat && !this.save.boat) {
      sfx.warn();
      this.say(BUDDY.mapNoBoat, 4);
      return;
    }
    this.closeScreen();
    if (id === this.save.spot) return;
    this.travel = { to: id, t: 0, switched: false };
    this.drag = null;
    sfx.motor(TRAVEL_DUR);
    this.say(BUDDY.travel, 2);
  }

  private updateTravel(dt: number) {
    const tr = this.travel!;
    tr.t += dt;
    if (!tr.switched && tr.t >= TRAVEL_DUR / 2) {
      tr.switched = true;
      this.save.spot = tr.to;
      writeSave(this.save);
      this.particles = [];
      this.ripples = [];
      this.spawnShadows();
    }
    if (tr.t >= TRAVEL_DUR) {
      this.travel = null;
      this.say(BUDDY.arrive[tr.to] ?? BUDDY.idle, 5);
    }
  }

  closeScreen() {
    this.screen = 'none';
    this.journalSel = null;
    sfx.tick();
  }

  openEntry(id: string) {
    this.journalSel = id;
    sfx.tick();
  }

  private pay(price: number): boolean {
    if (this.save.coins < price) {
      sfx.warn();
      this.say(BUDDY.broke, 3);
      return false;
    }
    this.save.coins -= price;
    sfx.coin();
    return true;
  }

  buyUpgrade(kind: UpgradeKind) {
    const next = UPGRADES[kind].tiers[this.save[kind] + 1];
    if (!next || !this.pay(next.price)) return;
    this.save[kind] += 1;
    writeSave(this.save);
    this.say(BUDDY.buy, 3.5);
  }

  /** Buys the lure if needed, then puts it on. */
  pickLure(id: string) {
    const lure = LURES.find((l) => l.id === id);
    if (!lure) return;
    const owned = this.save.lures.includes(id);
    if (!owned && !this.pay(lure.price)) return;
    if (!owned) this.save.lures.push(id);
    else sfx.tick();
    this.save.lure = id;
    writeSave(this.save);
    this.say(owned ? BUDDY.swap : BUDDY.buy, 3.5);
  }

  pickHat(id: string) {
    const hat = HATS.find((h) => h.id === id);
    if (!hat) return;
    const owned = this.save.hats.includes(id);
    if (!owned && !this.pay(hat.price)) return;
    if (!owned) this.save.hats.push(id);
    else sfx.tick();
    this.save.hat = id;
    writeSave(this.save);
    this.say(BUDDY.hat, 3.5);
  }

  // ---------- Phase changes ----------

  private setPhase(p: Phase) {
    this.phase = p;
    this.phaseT = 0;
  }

  private toIdle() {
    this.current = null;
    this.result = null;
    this.fishSay = null;
    this.held = false;
    this.setPhase('idle');
  }

  private cast(raw: number, lx: number) {
    const tip = this.rodTip();
    this.castFrom = { x: tip.x, y: tip.y };
    this.castTrees = raw > TREES_AT;
    const d = this.castD(raw + rand(-0.03, 0.03));
    this.castPower = clamp(raw, 0.1, 1.2);
    this.castTo = { lx: clamp(lx + rand(-0.04, 0.04), -1, 1), d };
    this.castDur = 0.55 + this.castPower * 0.55;
    sfx.cast(this.castPower);
    this.setPhase('cast');
  }

  private land() {
    if (this.castTrees) {
      this.fail('trees');
      return;
    }
    this.bobber = { ...this.castTo };
    this.ripples.push({ ...this.bobber, t: 0 });
    const p = project(this.L, this.bobber.lx, this.bobber.d);
    this.splash(p.x, p.y, 10, p.s);
    sfx.splash(0.4);

    const d = this.bobber.d;
    if (d < 0.16) this.say(BUDDY.castShort);
    else if (d > 0.86) this.say(BUDDY.castFar);
    else if (Math.random() < 0.3) this.say(BUDDY.castGood);

    const q = this.save.quest?.q;
    const favor = q && (q.kind === 'catch' || q.kind === 'heavy') ? q.target : undefined;
    const c = pickCatch(d, this.save.lure, this.save.spot, favor);
    this.current = c;
    this.weight = rollWeight(c, this.save.lure);
    if (c.junk) {
      this.biteAt = rand(2.5, 5);
      this.nibbles = [];
      this.approachAt = Infinity;
      this.arriveAt = Infinity;
    } else {
      const n = Math.floor(rand(0, 3));
      const lead = 0.5 + n * 0.75;
      this.biteAt = Math.max(rand(2.4, 5.5), 0.5 + 1.3 + lead);
      this.arriveAt = this.biteAt - lead;
      this.approachAt = this.arriveAt - 1.3;
      this.nibbles = [];
      for (let i = 0; i < n; i++) this.nibbles.push(this.arriveAt + 0.3 + i * 0.75);
      const side = pick([-1, 1]);
      this.lurkFrom = {
        lx: clamp(this.bobber.lx + side * 0.9, -1.25, 1.25),
        d: clamp(this.bobber.d + rand(-0.12, 0.18), 0.05, 1),
      };
    }
    this.nibbleIdx = 0;
    this.waitChatAt = this.biteAt > 4 && Math.random() < 0.5 ? 1.4 : Infinity;
    this.setPhase('wait');
  }

  private reelIn() {
    for (let i = 0; i < 6; i++) sfx.tick(false, i * 0.06);
    if (Math.random() < 0.5) this.say(BUDDY.reelIn);
    this.toIdle();
  }

  private startFight() {
    const c = this.current!;
    this.fish = {
      lx: this.bobber.lx,
      d: this.bobber.d,
      state: 'tire',
      stateT: rand(0.5, 1.0),
      stamina: 1,
      targetLx: this.bobber.lx * 0.6,
      dir: 1,
    };
    this.tension = 0.4;
    this.slackT = 0;
    this.warnCooldown = 2;
    this.held = true;
    this.shake = 0.35;
    this.tickT = 0;
    this.beepT = 0;
    sfx.hook();
    this.fishTalk(c.lines.bite, 2);
    const p = project(this.L, this.fish.lx, this.fish.d);
    this.splash(p.x, p.y, 14, p.s);
    this.setPhase('fight');
  }

  private win() {
    const c = this.current!;
    const coins = coinsFor(c, this.weight);
    const best = this.save.records[c.id] ?? 0;
    const first = best === 0;
    const record = this.weight > best;
    if (record) this.save.records[c.id] = this.weight;
    this.save.coins += coins;
    this.save.caught += 1;
    this.save.counts[c.id] = (this.save.counts[c.id] ?? 0) + 1;
    writeSave(this.save);

    const found = CATALOG.filter((k) => this.save.records[k.id]).length;
    this.result = {
      c, weight: this.weight, coins, record, first, found, total: CATALOG.length,
      quote: pick(c.lines.caught),
    };
    this.fishSay = null;
    const big = (this.weight - c.minLb) / (c.maxLb - c.minLb) > 0.55 || this.weight >= 6;
    if (c.junk) sfx.junk();
    else sfx.win(big || first);
    this.failStreak = 0;
    this.winStreak++;
    if (!this.save.boat && !this.boatHinted && this.save.coins >= BOAT.price) {
      this.boatHinted = true;
      this.say(BUDDY.boatHint, 6);
    } else if (this.winStreak % 4 === 0) this.say(BUDDY.winStreak, 6);
    else if (first || Math.random() < 0.6) this.say(c.buddy, 6);
    else if (!first && record && !c.junk) this.say(BUDDY.record, 6);
    else this.say(c.junk ? BUDDY.caughtJunk : big ? BUDDY.caughtBig : BUDDY.caughtSmall, 6);

    const tr = this.tourney;
    if (tr && tr.t >= 0) {
      if (c.junk) {
        this.say(TOURNEY_LINES.junk, 2.5);
      } else {
        tr.total = Math.round((tr.total + this.weight) * 10) / 10;
        tr.count++;
        tr.biggest = Math.max(tr.biggest, this.weight);
      }
    }
    this.setPhase('result');
    this.questEvent({ type: 'win', c, weight: this.weight });
  }

  private fail(kind: 'trees' | 'early' | 'missed' | 'snap' | 'slack' | 'spooled') {
    const c = this.current;
    const titles = {
      trees: ['TREE!', 'You overcooked it. Lake is the blue bit.'],
      early: ['TOO EARLY!', 'Wait for the bobber to dive.'],
      missed: ['TOO SLOW!', 'It took the bait and left.'],
      snap: ['SNAP!', 'Line broke. Let go when it runs.'],
      slack: ['IT GOT OFF!', 'Too much slack. Keep reeling.'],
      spooled: ['SPOOLED!', 'It ran off with all your line.'],
    } as const;
    [this.failTitle, this.failSub] = titles[kind];
    this.winStreak = 0;
    this.failStreak++;
    this.say(this.failStreak % 3 === 0 ? BUDDY.failStreak : BUDDY[kind], 4.5);

    if (c && kind !== 'trees') {
      const at = this.phase === 'fight' ? this.fish : this.lurk() ?? this.bobber;
      this.fishSayAt = { lx: at.lx, d: at.d };
      this.fishTalk(c.lines.escape, 2.6);
      const p = project(this.L, at.lx, at.d);
      this.splash(p.x, p.y, 12, p.s);
    }
    if (kind === 'snap') {
      this.shake = 0.6;
      sfx.snap();
    } else if (kind === 'trees') {
      sfx.trees();
    } else {
      sfx.splash(0.5);
    }
    sfx.fail(0.35);
    this.held = false;
    this.setPhase('fail');
    this.questEvent({ type: 'fail' });
  }

  // ---------- Effects ----------

  splash(x: number, y: number, n: number, scale = 1) {
    const u = this.L.u;
    for (let i = 0; i < n; i++) {
      const a = rand(-Math.PI * 0.95, -Math.PI * 0.05);
      const sp = rand(40, 150) * u * scale;
      const max = rand(0.3, 0.6);
      this.particles.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: max, max,
        r: rand(1.5, 3.5) * u * scale,
      });
    }
  }

  // ---------- Update ----------

  update(dt: number) {
    this.time += dt;
    this.phaseT += dt;
    this.screenT += dt;
    this.shake = Math.max(0, this.shake - dt * 1.6);

    if (this.buddy && (this.buddy.t += dt) > this.buddy.dur) this.buddy = null;
    if (this.fishSay && (this.fishSay.t += dt) > this.fishSay.dur) this.fishSay = null;

    for (const p of this.particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 420 * this.L.u * dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const r of this.ripples) r.t += dt;
    this.ripples = this.ripples.filter((r) => r.t < 1.2);

    for (const s of this.shadows) {
      s.lx += s.dir * s.speed * dt;
      if (s.lx > 1.35) s.dir = -1;
      if (s.lx < -1.35) s.dir = 1;
    }

    if (this.toast && (this.toast.t += dt) > this.toast.dur) this.toast = null;
    if (this.ticker && (this.ticker.t += dt) > this.ticker.dur) this.ticker = null;
    if (this.travel) this.updateTravel(dt);
    if (this.tourney) this.updateTourney(dt);

    const calm = !this.title && this.screen === 'none' && !this.travel && !this.tourney && !this.drag;
    switch (this.phase) {
      case 'idle':
        if (calm && !this.save.quest && this.time >= this.questAt) {
          this.giveQuest();
        } else if (calm && !this.buddy && (this.idleNag -= dt) <= 0) {
          this.say(BUDDY.idle);
        }
        break;
      case 'result':
        // In a tournament the clock is running: don't wait for a tap.
        if (this.tourney && this.phaseT > 2) this.toIdle();
        break;
      case 'cast':
        if (this.phaseT >= this.castDur) this.land();
        break;
      case 'wait':
        if (this.phaseT >= this.waitChatAt) {
          this.waitChatAt = Infinity;
          this.say(BUDDY.waiting);
        }
        if (this.nibbleIdx < this.nibbles.length && this.phaseT >= this.nibbles[this.nibbleIdx]) {
          this.nibbleIdx++;
          sfx.nibble();
        }
        if (this.phaseT >= this.biteAt) {
          this.ripples.push({ ...this.bobber, t: 0 });
          this.shake = 0.2;
          sfx.bite();
          this.setPhase('bite');
        }
        break;
      case 'bite':
        if (this.phaseT > this.current!.biteWindow) this.fail('missed');
        break;
      case 'fight':
        this.updateFight(dt);
        break;
      case 'fail':
        if (this.phaseT > (this.tourney ? 1.8 : 3.2)) this.toIdle();
        break;
    }
  }

  private updateFight(dt: number) {
    const c = this.current!;
    const f = this.fish;

    if (c.runChance > 0) {
      f.stateT -= dt;
      if (f.stateT <= 0) {
        if (f.state === 'tire') {
          f.state = 'warn';
          sfx.alert();
          f.stateT = 0.42;
        } else if (f.state === 'warn') {
          f.state = 'run';
          sfx.splash(0.6);
          f.stateT = rand(0.9, 1.8) * (0.5 + c.runChance) * (0.3 + 0.7 * f.stamina);
          f.dir = pick([-1, 1]);
          f.targetLx = c.junk ? f.lx : clamp(f.lx + f.dir * rand(0.3, 0.8), -0.9, 0.9);
          if (Math.random() < 0.7) this.fishTalk(c.lines.fight);
        } else {
          f.state = 'tire';
          f.stateT = rand(1.0, 2.2) * (1.35 - c.runChance);
          f.targetLx = f.lx * 0.5;
        }
      }
    } else if (!this.fishSay && Math.random() < dt * 0.35) {
      this.fishTalk(c.lines.fight, 1.6);
    }

    const running = f.state === 'run';
    if (this.held) {
      if (running) {
        this.tension += c.power * LINES[this.save.line].tough * dt;
      } else {
        const rest = c.junk ? 0.68 : 0.5;
        this.tension += (rest - this.tension) * Math.min(1, 2.4 * dt);
        f.stamina = Math.max(0, f.stamina - dt / (4 + c.heft * 4));
      }
      f.d -= ((REEL_SPEED * REELS[this.save.reel].speed) / (0.75 + c.heft)) * (running ? 0.2 : 1) * dt;
    } else {
      this.tension -= (running ? 0.45 : 0.8) * dt;
      if (running) f.d += c.runSpeed * dt;
    }
    this.tension = Math.max(0, this.tension);
    f.lx += (f.targetLx - f.lx) * Math.min(1, (running ? 1.8 : 0.6) * dt);

    const p = project(this.L, f.lx, f.d);
    if (running) {
      this.splashAcc += dt * 26;
      while (this.splashAcc > 1) {
        this.splashAcc -= 1;
        this.splash(p.x, p.y, 1, p.s);
      }
      if (this.held) this.shake = Math.max(this.shake, 0.25);
    }

    // Slack only matters for things that can swim away.
    if (!c.junk) {
      if (this.tension < SLACK_LEVEL) this.slackT += dt;
      else this.slackT = Math.max(0, this.slackT - dt * 2);
    }

    // Reel clicks: steady when winding, a fast whine when the fish strips line.
    this.tickT -= dt;
    if (this.tickT <= 0 && (this.held || running)) {
      const stripping = running && !this.held;
      sfx.tick(stripping);
      this.tickT = stripping ? 0.04 : running ? 0.17 : 0.075;
    }
    this.beepT -= dt;
    if (this.tension > RED_LEVEL && this.beepT <= 0) {
      sfx.warn();
      this.beepT = 0.16;
    }

    this.warnCooldown -= dt;
    if (this.warnCooldown <= 0) {
      if (this.tension > 0.86) {
        this.say(BUDDY.tense, 1.8);
        this.warnCooldown = 5;
      } else if (this.slackT > 0.7) {
        this.say(BUDDY.loose, 1.8);
        this.warnCooldown = 5;
      }
    }

    if (this.tension >= 1) this.fail('snap');
    else if (this.slackT > SLACK_LIMIT) this.fail('slack');
    else if (f.d > 1.08) this.fail('spooled');
    else if (f.d <= 0.03) this.win();
  }
}
