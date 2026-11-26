// What's new, shown once on the first launch after an update.
//
// To announce an update: add a new entry at the TOP of this list with a fresh
// `id` (any string not used before; the date works well). Players who haven't
// seen that id get the "NEW UPDATES" card after they tap past the title screen.
// Keep it short: a headline and up to about four one-line notes.

export interface Update {
  id: string;
  title: string;
  notes: string[];
}

export const UPDATES: Update[] = [
  {
    id: '2026-11-25b',
    title: 'Earl Pulled Up a Seat',
    notes: [
      'Earl now sits on the dock and fishes right next to you.',
      "On the boat he's parked on his cooler. Obviously.",
      'His trash talk pops up right over his head.',
      "The orange bobber is his. Don't reel it in.",
    ],
  },
  {
    id: '2026-11-25',
    title: 'Hook, Line & Sinker!',
    notes: [
      'New name! Fishing Fly is now Hook, Line & Sinker.',
      'Two upbeat tunes: Bobber Bop and Sunfish Surf.',
      "Keep an eye out for Gary's Rolex. Rare, and worth a lot.",
      'This card! It shows up whenever something new lands.',
    ],
  },
];

const KEY = 'fishingfly.seenUpdate';

export const latestUpdate = (): Update | undefined => UPDATES[0];

export function seenUpdate(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function markUpdateSeen() {
  const u = latestUpdate();
  if (!u) return;
  try {
    localStorage.setItem(KEY, u.id);
  } catch {
    // Storage blocked: the card may show again next time, which is harmless.
  }
}
