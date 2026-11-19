import { spotById } from './spots';
import { clamp } from './util';

export interface Look {
  kind: 'fish' | 'boot' | 'turtle' | 'cart' | 'can' | 'phone' | 'duck' | 'bottle' | 'watch';
  body: string;
  belly: string;
  fin: string;
  /** Length divided by height: higher is longer and skinnier. */
  stretch: number;
  stripes?: string;
  spots?: string;
  /** A stripe of colour running nose to tail. */
  band?: string;
  scales?: string;
  hat?: boolean;
  whiskers?: boolean;
  teeth?: boolean;
  bigEye?: boolean;
  brow?: 'angry' | 'worried' | 'smug' | 'tired' | 'calm' | 'shifty' | 'diva';
}

export interface Catch {
  id: string;
  name: string;
  look: Look;
  /** An object rather than a creature: no shadow, can't swim off. */
  junk?: boolean;
  /** What it sounds like when it "talks". Fish babble by default. */
  voice?: 'squelch' | 'squeak' | 'ring' | 'clank' | 'tick';
  minLb: number;
  maxLb: number;
  coinPerLb: number;
  /** Fixed value, for things that are not sold by the pound. */
  flatCoins?: number;
  /** How fast tension climbs if you reel while it runs (per second). */
  power: number;
  /** How fast it strips line when you let it run (lake-lengths per second). */
  runSpeed: number;
  /** Dead weight: slows the reel. */
  heft: number;
  /** 0..1, how much of the fight it spends running (or, for junk, snagging). */
  runChance: number;
  /** Preferred cast distance band, 0 (pier) to 1 (far side). */
  band: [number, number];
  rarity: number;
  /** Spots it lives at. Missing means everywhere. */
  spots?: string[];
  /** Seconds you get to tap once it bites. */
  biteWindow: number;
  desc: string;
  lines: { bite: string[]; fight: string[]; escape: string[]; caught: string[] };
  /** What Earl has to say about this one in particular. */
  buddy: string[];
}

export const CATALOG: Catch[] = [
  {
    id: 'bluegill',
    name: 'Bluegill',
    look: {
      kind: 'fish',
      body: '#5b8fd6',
      belly: '#f2c14e',
      fin: '#3d6bb0',
      stretch: 1.5,
      stripes: 'rgba(30,50,110,0.35)',
      brow: 'worried',
    },
    minLb: 0.3,
    maxLb: 1.4,
    coinPerLb: 8,
    power: 0.45,
    runSpeed: 0.07,
    heft: 0.1,
    runChance: 0.5,
    band: [0, 0.45],
    rarity: 10,
    biteWindow: 1.2,
    desc: 'Small, round and permanently anxious. Bites first, panics later.',
    lines: {
      bite: ['Oh no. Oh no no no.', 'Why is the worm PULLING?'],
      fight: [
        'I have a FAMILY!',
        "It's my first day!",
        'Mom said never eat sky-worms!',
        'I want to speak to the lake manager!',
        'This is NOT in my horoscope!',
      ],
      escape: ["I'm telling EVERYONE about this!", 'Never again. Until tomorrow.'],
      caught: ['Please. I owe people money.', 'Is this going on my record?'],
    },
    buddy: ["It's shaking. You monster.", 'That is bait with ambitions.'],
  },
  {
    id: 'perch',
    name: 'Yellow Perch',
    look: {
      kind: 'fish',
      body: '#d9b93a',
      belly: '#f6efc2',
      fin: '#e0712b',
      stretch: 2.1,
      stripes: 'rgba(60,70,20,0.55)',
      brow: 'shifty',
    },
    minLb: 0.4,
    maxLb: 1.8,
    coinPerLb: 9,
    power: 0.6,
    runSpeed: 0.09,
    heft: 0.15,
    runChance: 0.5,
    band: [0.1, 0.55],
    rarity: 8,
    biteWindow: 1.1,
    desc: 'Striped, twitchy and certain the bobber is watching. Runs a newsletter.',
    lines: {
      bite: ['The worm is bugged. I KNEW it.', 'This is exactly what THEY want.'],
      fight: [
        'The bobber is a surveillance drone!',
        'Wake up, sheeple! I mean fishple!',
        'The pier is an inside job!',
        'Who do you WORK for?!',
        'Birds are not real! Ask the heron!',
      ],
      escape: ["You'll never silence the truth!", "I'm going off the grid. The weed bed."],
      caught: [
        'Fine. But ask yourself who PAYS for the lake.',
        'This goes all the way to the top. Of the water.',
      ],
    },
    buddy: ["He's got a point about the bobber.", "No eye contact. He'll start on the moon."],
  },
  {
    id: 'crappie',
    name: 'Crappie',
    look: {
      kind: 'fish',
      body: '#c9d2c0',
      belly: '#f4f4ea',
      fin: '#8a9a80',
      stretch: 1.8,
      spots: 'rgba(40,60,40,0.55)',
      brow: 'tired',
    },
    minLb: 0.5,
    maxLb: 2.2,
    coinPerLb: 9,
    power: 0.55,
    runSpeed: 0.08,
    heft: 0.2,
    runChance: 0.4,
    band: [0.15, 0.65],
    rarity: 8,
    biteWindow: 1.1,
    desc: "It's pronounced CROP-ee. It would like you to know that. Repeatedly.",
    lines: {
      bite: ["It's pronounced CROP-ee.", 'Oh good. A hook. Fits the week.'],
      fight: [
        'Go ahead. Make the joke.',
        "I've heard them ALL, pal.",
        "My therapist says it's just a name.",
        'Real original, hook guy.',
        'My cousin is a Bass. Nobody laughs at HIM.',
      ],
      escape: ['Still better than being a boot.', 'Finally, something went right.'],
      caught: ['Crappie day for me. There. I said it.', 'Just spell it right on the plaque.'],
    },
    buddy: ['Say the name. Go on. Say it.', 'CROP-ee. Sure, pal. Sure.'],
  },
  {
    id: 'bass',
    name: 'Largemouth Bass',
    look: {
      kind: 'fish',
      body: '#5d8a3a',
      belly: '#e9efc4',
      fin: '#3f6426',
      stretch: 2.3,
      stripes: 'rgba(20,50,20,0.35)',
      brow: 'smug',
    },
    minLb: 1.5,
    maxLb: 8,
    coinPerLb: 10,
    power: 0.8,
    runSpeed: 0.12,
    heft: 0.45,
    runChance: 0.55,
    band: [0.3, 0.85],
    rarity: 6,
    biteWindow: 1.0,
    desc: 'All mouth, mostly muscle. Has never once skipped fin day.',
    lines: {
      bite: ['Free protein!', "Sup. I'll take that."],
      fight: [
        'You call that reeling, bro?',
        'I bench three bluegills!',
        'Feel the BURN!',
        'One more rep! One more rep!',
        'Do you even lift, land-guy?',
      ],
      escape: ['Never skip fin day!', 'Too swole to hold, bro.'],
      caught: ["Bro. Don't tell the guys.", 'I was on a rest day.'],
    },
    buddy: ["He's flexing. Don't look.", 'Now THAT is a fish. Technically.'],
  },
  {
    id: 'trout',
    name: 'Rainbow Trout',
    look: {
      kind: 'fish',
      body: '#7fa3a0',
      belly: '#f1ece2',
      fin: '#6a8f8c',
      stretch: 2.8,
      band: 'rgba(238,110,150,0.75)',
      spots: 'rgba(30,40,40,0.6)',
      brow: 'diva',
    },
    minLb: 1,
    maxLb: 6,
    coinPerLb: 13,
    power: 0.85,
    runSpeed: 0.14,
    heft: 0.3,
    runChance: 0.6,
    band: [0.35, 0.8],
    rarity: 4.5,
    biteWindow: 0.9,
    desc: 'Shimmery, dramatic and extremely online for something with no thumbs.',
    lines: {
      bite: ['Ooh, is this sponsored?', 'Trying the viral worm, you guys!'],
      fight: [
        'Not the face! NOT the face!',
        'This is my BAD side!',
        'I have forty followers!',
        'Unsubscribe! UNSUBSCRIBE!',
        'My brand is ruined!',
      ],
      escape: ['Blocked and reported.', 'Like and subscribe, loser!'],
      caught: ['At least tag me.', 'No photos without my glam team.'],
    },
    buddy: ['Forty followers. Thirty-eight are minnows.', "Get its good side. It'll tell you which."],
  },
  {
    id: 'carp',
    name: 'Common Carp',
    look: {
      kind: 'fish',
      body: '#b98c4a',
      belly: '#f0deb0',
      fin: '#c9683a',
      stretch: 2.0,
      scales: 'rgba(90,60,20,0.4)',
      whiskers: true,
      brow: 'calm',
    },
    minLb: 4,
    maxLb: 20,
    coinPerLb: 6,
    power: 0.55,
    runSpeed: 0.08,
    heft: 1.0,
    runChance: 0.3,
    band: [0.4, 0.9],
    rarity: 4,
    biteWindow: 1.2,
    desc: 'Enormous, unbothered and deeply at peace. Fights like a wet sofa.',
    lines: {
      bite: ['The hook finds us all, man.', 'Mmm. Sky snack.'],
      fight: [
        'I am one with the line.',
        "You can't rush the river, friend.",
        'Whoa. Heavy vibes up there.',
        'Breathe in... bubble out...',
      ],
      escape: ['The carp abides.', 'Letting go is the real catch.'],
      caught: ['The journey was inside you all along.', 'Namaste on the bottom next time.'],
    },
    buddy: ['Like reeling in a beanbag chair.', 'Calmest thing in the lake. Still outweighs you.'],
  },
  {
    id: 'walleye',
    name: 'Walleye',
    look: {
      kind: 'fish',
      body: '#8a8a4e',
      belly: '#ecead0',
      fin: '#6b6b3a',
      stretch: 3.0,
      spots: 'rgba(50,50,20,0.45)',
      bigEye: true,
      brow: 'worried',
    },
    minLb: 2,
    maxLb: 10,
    coinPerLb: 12,
    power: 0.75,
    runSpeed: 0.11,
    heft: 0.5,
    runChance: 0.5,
    band: [0.55, 1],
    rarity: 3.5,
    biteWindow: 0.85,
    desc: 'Eyes like dinner plates and it has not slept in years. Do not ask how it is.',
    lines: {
      bite: ['Is it morning? Is it EVER morning?', "I'll eat anything. I've been up since March."],
      fight: [
        "I haven't blinked since 1998!",
        'So. Much. Coffee.',
        'I can see SOUNDS!',
        'Sleep is for the bass!',
      ],
      escape: ['Back to staring at nothing!', "Can't stop. Won't sleep."],
      caught: ['Is this a dream? Please say yes.', 'Finally. A lie-down.'],
    },
    buddy: ['Those eyes follow you around the pier.', 'Somebody get that fish a nap.'],
  },
  {
    id: 'catfish',
    name: 'Sir Whiskers',
    look: {
      kind: 'fish',
      body: '#6f6a7d',
      belly: '#d9d2c6',
      fin: '#4f4b5c',
      stretch: 2.7,
      whiskers: true,
      hat: true,
      brow: 'smug',
    },
    minLb: 3,
    maxLb: 14,
    coinPerLb: 9,
    power: 0.7,
    runSpeed: 0.1,
    heft: 0.9,
    runChance: 0.45,
    band: [0.45, 1],
    rarity: 3.5,
    biteWindow: 1.0,
    desc: 'A channel catfish of considerable breeding. The hat stays on.',
    lines: {
      bite: ['I say, is this complimentary?', 'Ah. The lunch trolley.'],
      fight: [
        'Unhand me, you ruffian!',
        'Mind the hat. MIND THE HAT.',
        'This is most irregular!',
        'I shall summon my solicitor!',
      ],
      escape: ['Good DAY to you, sir.', 'One simply does not get caught.'],
      caught: ['I shall be writing a strongly worded letter.', 'Do be gentle. It is a rental hat.'],
    },
    buddy: ['Fancier than both of us combined.', 'Do NOT touch the hat.'],
  },
  {
    id: 'pike',
    name: 'Northern Pike',
    look: {
      kind: 'fish',
      body: '#4c7a5a',
      belly: '#dfe6b8',
      fin: '#b5522e',
      stretch: 3.6,
      spots: 'rgba(230,240,170,0.7)',
      teeth: true,
      brow: 'angry',
    },
    minLb: 4,
    maxLb: 18,
    coinPerLb: 12,
    power: 0.95,
    runSpeed: 0.13,
    heft: 0.7,
    runChance: 0.6,
    band: [0.65, 1],
    rarity: 2,
    biteWindow: 0.75,
    desc: 'Long, toothy and convinced the lake is rightfully theirs. Monologues.',
    lines: {
      bite: ['At last, we meet.', 'You DARE dangle that at ME?'],
      fight: [
        'Fool! I have eaten bigger hooks than you!',
        'The lake will be MINE!',
        'You cannot comprehend my teeth!',
        'Every pier falls eventually!',
      ],
      escape: ['We shall meet again, land-ape.', 'Tell the others what you saw.'],
      caught: ['Curses. Foiled by a bucket hat.', 'This changes nothing. NOTHING.'],
    },
    buddy: ["It's still monologuing. Cooler. Now.", 'Count your fingers. Count them again.'],
  },
  {
    id: 'turtle',
    name: 'Grumpy Snapper',
    look: { kind: 'turtle', body: '#55663a', belly: '#c9b97a', fin: '#7d9455', stretch: 1.5 },
    minLb: 5,
    maxLb: 25,
    coinPerLb: 5,
    power: 0.9,
    runSpeed: 0.05,
    heft: 1.1,
    runChance: 0.35,
    band: [0, 0.5],
    rarity: 1.8,
    biteWindow: 1.3,
    desc: 'Not a fish, and not happy about it. Has had opinions on everything since 1921.',
    lines: {
      bite: ["Who's dangling things on MY lake?!", 'In my day worms were FREE.'],
      fight: [
        'Get off my lake!',
        'I was here before this pier!',
        "I'm a hundred and four and I'll outlast you!",
        'You kids and your fishing rods!',
      ],
      escape: ['And STAY out!', "I'm writing to the council!"],
      caught: ['Put me down. I have soup to be suspicious of.', 'This never happened in the Cretaceous.'],
    },
    buddy: ['Mind your fingers. He minds everything else.', 'Not a fish. Do not tell him that.'],
  },
  {
    id: 'boot',
    name: 'Old Boot',
    junk: true,
    voice: 'squelch',
    look: { kind: 'boot', body: '#7a5230', belly: '#5a3a20', fin: '#3a2616', stretch: 1.3 },
    minLb: 1.1,
    maxLb: 3.5,
    coinPerLb: 1,
    power: 0,
    runSpeed: 0,
    heft: 1.2,
    runChance: 0,
    band: [0, 1],
    rarity: 2,
    biteWindow: 1.8,
    desc: 'Size 11, left foot, full of lake. Somewhere a man is hopping.',
    lines: {
      bite: ['...'],
      fight: ['(squelch)', '(ominous sloshing)', '(gloop)'],
      escape: ['(sinks with dignity)'],
      caught: ['(smells exactly how you would expect)'],
    },
    buddy: ['Fresh boot. Just needs lemon.', 'Trophy footwear. Mount it over the fireplace.'],
  },
  {
    id: 'can',
    name: 'Tin Can',
    junk: true,
    voice: 'clank',
    look: { kind: 'can', body: '#aeb7c0', belly: '#c0392b', fin: '#7d8791', stretch: 1 },
    minLb: 0.1,
    maxLb: 0.4,
    coinPerLb: 1,
    flatCoins: 2,
    power: 0,
    runSpeed: 0,
    heft: 0.1,
    runChance: 0,
    band: [0, 1],
    rarity: 2.2,
    biteWindow: 1.8,
    desc: 'Beans, allegedly. Best before a date that predates you.',
    lines: {
      bite: ['(tink)'],
      fight: ['(tink tink)', '(rattle)', '(hollow bonk)'],
      escape: ['(glug)'],
      caught: ['(the beans expired in 1987)'],
    },
    buddy: ['Dinner is served. Do not eat it.', 'Vintage. A fine year for beans.'],
  },
  {
    id: 'duck',
    name: 'Rubber Duck',
    junk: true,
    voice: 'squeak',
    look: { kind: 'duck', body: '#ffd23f', belly: '#f5b915', fin: '#f08a24', stretch: 1 },
    minLb: 0.1,
    maxLb: 0.2,
    coinPerLb: 1,
    flatCoins: 6,
    power: 0,
    runSpeed: 0,
    heft: 0,
    runChance: 0,
    band: [0, 0.6],
    rarity: 1.2,
    biteWindow: 1.8,
    desc: 'Lost at sea since bath time. Has seen things. Will only say squeak.',
    lines: {
      bite: ['Squeak?'],
      fight: ['Squeak!', 'SQUEAK!', 'squeak squeak'],
      escape: ['...squeak.'],
      caught: ['Squeak.'],
    },
    buddy: [
      'Finally, something at your skill level.',
      "It didn't even fight. It felt sorry for you.",
    ],
  },
  {
    id: 'cart',
    name: 'Shopping Cart',
    junk: true,
    voice: 'clank',
    look: { kind: 'cart', body: '#9aa3ad', belly: '#c0392b', fin: '#3d444c', stretch: 1 },
    minLb: 28,
    maxLb: 40,
    coinPerLb: 1,
    power: 0.7,
    runSpeed: 0,
    heft: 1.5,
    // It does not run, it snags on the bottom: same cure, let go.
    runChance: 0.3,
    band: [0.3, 1],
    rarity: 1,
    biteWindow: 1.8,
    desc: 'One wobbly wheel, zero groceries. The nearest store is eleven miles away.',
    lines: {
      bite: ['(clunk)'],
      fight: ['(CLANG)', '(one wheel squeaks)', '(rattle rattle)', '(snagged on a log)'],
      escape: ['(rolls back down)'],
      caught: ['(still has the wobbly wheel)'],
    },
    buddy: ['Great. Now catch a supermarket.', 'Thirty pounds of regret. Nice.'],
  },
  {
    id: 'phone',
    name: "Mermaid's Phone",
    junk: true,
    voice: 'ring',
    look: { kind: 'phone', body: '#f4a6c8', belly: '#10243a', fin: '#3aa76d', stretch: 1 },
    minLb: 0.4,
    maxLb: 0.5,
    coinPerLb: 1,
    flatCoins: 90,
    power: 0,
    runSpeed: 0,
    heft: 0.15,
    runChance: 0,
    band: [0.5, 1],
    rarity: 0.5,
    biteWindow: 1.8,
    desc: 'Waterproof, obviously. 37 missed calls from Dad and a cracked shell case.',
    lines: {
      bite: ['(bzzt bzzt)'],
      fight: ['(ring ring)', '(37 missed calls)', '(bzzt)'],
      escape: ['(goes to voicemail)'],
      caught: ['(Dad is calling. Again.)'],
    },
    buddy: [
      "Don't answer it. Her dad has a trident.",
      'Worth a fortune. Finders keepers, sea-weepers.',
    ],
  },

  // ---------- Boat only ----------
  {
    id: 'gar',
    name: 'Longnose Gar',
    look: {
      kind: 'fish',
      body: '#7a8a55',
      belly: '#e8e2b8',
      fin: '#5f6e3e',
      stretch: 4.4,
      spots: 'rgba(40,40,20,0.5)',
      teeth: true,
      brow: 'tired',
    },
    minLb: 2,
    maxLb: 12,
    coinPerLb: 12,
    power: 0.85,
    runSpeed: 0.13,
    heft: 0.4,
    runChance: 0.6,
    band: [0, 0.6],
    rarity: 3,
    spots: ['cove'],
    biteWindow: 0.8,
    desc: 'Was in this lake before it was cool. By about a hundred million years.',
    lines: {
      bite: ['I ate worms before worms were mainstream.', 'Ugh. Fine. I guess.'],
      fight: [
        "You've probably never heard of the Jurassic.",
        'Rods are SO overplayed.',
        'I liked this lake before the pier.',
        'The dinosaurs were total sellouts.',
        'This hook is very derivative.',
      ],
      escape: ['Too mainstream for me.', "I'll be in the reeds. You wouldn't get it."],
      caught: ["I'm only here ironically.", 'Getting caught is so Cretaceous.'],
    },
    buddy: [
      "A hundred million years old and still hasn't bought a comb.",
      "Don't ask about the dinosaurs. He knew them, apparently.",
    ],
  },
  {
    id: 'sturgeon',
    name: 'Lake Sturgeon',
    look: {
      kind: 'fish',
      body: '#7c7466',
      belly: '#d8d0bf',
      fin: '#5e574c',
      stretch: 3.6,
      scales: 'rgba(60,50,40,0.45)',
      whiskers: true,
      brow: 'smug',
    },
    minLb: 15,
    maxLb: 60,
    coinPerLb: 5,
    power: 0.8,
    runSpeed: 0.07,
    heft: 1.4,
    runChance: 0.35,
    band: [0.45, 1],
    rarity: 2.6,
    spots: ['dropoff'],
    biteWindow: 1.1,
    desc: 'Huge, ancient and hosts a late-night radio show from the bottom of the lake.',
    lines: {
      bite: ['Mmm. We have a caller on line one.', "You're listening to Bottom FM."],
      fight: [
        'Smooth sounds from the bottom of the lake...',
        'Coming up next: you, losing.',
        'This one goes out to all the lonely worms.',
        'Keep those requests coming, baby.',
      ],
      escape: ['This has been Bottom FM. Goodnight, lake.', "And that's the hour, folks."],
      caught: ["We'll be right back after these messages.", 'Dedicate this one to my mama.'],
    },
    buddy: ['Is he... narrating?', "Smoothest voice on the lake. Don't make eye contact."],
  },
  {
    id: 'muskie',
    name: 'Muskie',
    look: {
      kind: 'fish',
      body: '#9aa06a',
      belly: '#eeead0',
      fin: '#a6552c',
      stretch: 3.8,
      stripes: 'rgba(50,60,30,0.45)',
      teeth: true,
      brow: 'tired',
    },
    minLb: 8,
    maxLb: 30,
    coinPerLb: 14,
    power: 1.0,
    runSpeed: 0.15,
    heft: 0.7,
    runChance: 0.65,
    band: [0.4, 1],
    rarity: 1.6,
    spots: ['stumps'],
    biteWindow: 0.7,
    desc: 'The fish of ten thousand casts. Brooding, toothy, writes poetry about stumps.',
    lines: {
      bite: ['Finally. Someone worthy of my sorrow.', 'You found me. How tragic.'],
      fight: [
        'You cannot catch what is already lost!',
        'My pain is deeper than this lake!',
        'I wrote a poem about this hook!',
        'Nobody understands the stumps like I do!',
      ],
      escape: ['Ten thousand casts, darling. Ten thousand.', 'I return to the void. The void is damp.'],
      caught: ['Fine. Write it in your little book.', 'Tell the stumps I loved them.'],
    },
    buddy: [
      "Thirty years I've fished for one of those. I hate you.",
      'Ten thousand casts, they say. You did it in a lot fewer. Rude.',
    ],
  },
  {
    id: 'bottle',
    name: 'Message in a Bottle',
    junk: true,
    voice: 'clank',
    look: { kind: 'bottle', body: '#7fc4a8', belly: '#f3e6c4', fin: '#8a5a2b', stretch: 1 },
    minLb: 0.6,
    maxLb: 1,
    coinPerLb: 1,
    flatCoins: 40,
    power: 0,
    runSpeed: 0,
    heft: 0.1,
    runChance: 0,
    band: [0, 1],
    rarity: 1,
    spots: ['cove', 'dropoff', 'stumps'],
    biteWindow: 1.8,
    desc: "The note inside reads: 'Stranded on an island. Please feed my cat.' Postmarked 1974.",
    lines: {
      bite: ['(clink)'],
      fight: ['(slosh)', '(paper rustles)', '(clink clink)'],
      escape: ['(drifts off toward someone else)'],
      caught: ["(P.S. the cat's name is Gerald)"],
    },
    buddy: [
      'Somebody needs rescuing. Not our problem. We are fishing.',
      "Don't read it out loud. It's probably about feelings.",
    ],
  },
  {
    id: 'rolex',
    name: "Gary's Rolex",
    junk: true,
    voice: 'tick',
    look: { kind: 'watch', body: '#e2b23c', belly: '#f6efd9', fin: '#1f2a36', stretch: 1 },
    minLb: 0.3,
    maxLb: 0.4,
    coinPerLb: 1,
    flatCoins: 250,
    power: 0,
    runSpeed: 0,
    heft: 0.05,
    runChance: 0,
    band: [0.4, 1],
    rarity: 0.3,
    biteWindow: 1.8,
    desc: "Solid gold, waterproof to 100 metres, engraved 'To Gary, from Gary'. Still runs four minutes fast.",
    lines: {
      bite: ['(tick tick tick)'],
      fight: ['(tick tick)', '(glints expensively)', '(still four minutes fast)'],
      escape: ["(sinks back down, along with Gary's dignity)"],
      caught: ['(It is 10:10. It is always 10:10.)'],
    },
    buddy: [
      "Gary's been looking for that since the 2009 derby. We are not telling Gary.",
      'Gary says it is real. Gary also says he was a fighter pilot.',
      "Finders keepers. Gary owes me forty bucks anyway.",
    ],
  },
];

/** How much more (or less) often something bites on a given lure. */
function lureBoost(c: Catch, lure: string): number {
  switch (lure) {
    case 'cheese':
      return ['catfish', 'carp', 'turtle', 'sturgeon'].includes(c.id) ? 3 : 1;
    case 'spoon':
      return c.junk ? 1 : c.maxLb >= 6 ? 2 : c.maxLb < 3 ? 0.4 : 1;
    case 'magnet':
      return c.junk ? 4 : 1;
    default:
      return 1;
  }
}

/** Picks what is on the hook, favouring species that like this cast distance and spot. */
export function pickCatch(d: number, lure = 'worm', spot = 'pier', favor?: string): Catch {
  const boost = spotById(spot).boost;
  const weights = CATALOG.map((c) => {
    if (c.spots && !c.spots.includes(spot)) return 0;
    const [a, b] = c.band;
    const off = d < a ? a - d : d > b ? d - b : 0;
    // Whatever Earl has you hunting turns up twice as often.
    const wanted = c.id === favor ? 2 : 1;
    return c.rarity * clamp(1 - off * 4, 0.04, 1) * lureBoost(c, lure) * (boost[c.id] ?? 1) * wanted;
  });
  let r = Math.random() * weights.reduce((s, w) => s + w, 0);
  for (let i = 0; i < CATALOG.length; i++) {
    r -= weights[i];
    if (r <= 0) return CATALOG[i];
  }
  return CATALOG[0];
}

/** Skewed toward the small end so a big one feels like an event. */
export function rollWeight(c: Catch, lure = 'worm'): number {
  const t = Math.pow(Math.random(), lure === 'spoon' ? 1.1 : 1.8);
  return Math.round((c.minLb + (c.maxLb - c.minLb) * t) * 10) / 10;
}

export function coinsFor(c: Catch, weight: number): number {
  return c.flatCoins ?? Math.max(1, Math.round(weight * c.coinPerLb));
}
