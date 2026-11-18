/** Places you can fish. The pier is free; everything else needs the boat. */

export const BOAT = {
  name: 'Knot Working',
  desc: "Earl's cousin's bass boat. Glitter paint, one working seat, mostly floats.",
  price: 600,
};

export interface Spot {
  id: string;
  name: string;
  /** Short name for tight spaces like the journal facts row. */
  short: string;
  blurb: string;
  boat: boolean;
  /** Multiplies how often each catch bites here. Missing ids are 1. */
  boost: Record<string, number>;
  /** Where it sits on the map, 0..1 across and down the lake drawing. */
  mapX: number;
  mapY: number;
  water: [string, string, string];
  /** Far bank colours: hills, trees. */
  bank: [string, string];
}

export const SPOTS: Spot[] = [
  {
    id: 'pier',
    name: 'The Pier',
    short: 'Pier',
    blurb: 'Where it all began. Splinters included.',
    boat: false,
    boost: {},
    mapX: 0.5,
    mapY: 0.9,
    water: ['#a6e0ee', '#46a9d3', '#1c6f9f'],
    bank: ['#7dbb78', '#3f7d4a'],
  },
  {
    id: 'cove',
    name: 'Lily Pad Cove',
    short: 'Cove',
    blurb: 'Shallow, weedy and warm. Bass, snappers, and something prehistoric.',
    boat: true,
    boost: { bluegill: 1.6, perch: 1.2, bass: 1.8, turtle: 2, duck: 2, walleye: 0.3, pike: 0.4, cart: 0.3 },
    mapX: 0.2,
    mapY: 0.52,
    water: ['#bfe6c9', '#5fb59a', '#2a7d6b'],
    bank: ['#8cc46e', '#4d8a3e'],
  },
  {
    id: 'dropoff',
    name: 'The Drop-Off',
    short: 'Drop-Off',
    blurb: 'Where the bottom falls away. Big, slow, deep things live down there.',
    boat: true,
    boost: { walleye: 2, catfish: 2, carp: 1.5, crappie: 1.4, bluegill: 0.4, perch: 0.6, turtle: 0.3 },
    mapX: 0.6,
    mapY: 0.42,
    water: ['#8fc9e0', '#2a7fb3', '#0f4470'],
    bank: ['#6aa370', '#2f6a42'],
  },
  {
    id: 'stumps',
    name: 'Stump Field',
    short: 'Stumps',
    blurb: 'A drowned forest. Snags, pike, shopping carts, and the fish of ten thousand casts.',
    boat: true,
    boost: { pike: 2, bass: 1.5, crappie: 1.5, cart: 2.5, boot: 2, trout: 0.5 },
    mapX: 0.76,
    mapY: 0.14,
    water: ['#b4d4c8', '#5a9488', '#2c5d58'],
    bank: ['#8a9a62', '#4f6a3a'],
  },
];

export function spotById(id: string): Spot {
  return SPOTS.find((s) => s.id === id) ?? SPOTS[0];
}
