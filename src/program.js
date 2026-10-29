// ─── HYPERTROPHY 365 · ATHLETE (V3.4) ───────────────────────────────────────
// 48 weeks = 12 four-week blocks. Every block: 3 loading weeks + 1 deload.
// Block order: (Hypertrophy → Strength → Power) × 4. No Foundation block.
// Spine rules: no barbell back squat, no conventional barbell deadlift.
// Exercise choices rotate every 12 weeks (4 cycles). Warm-ups, cool-downs, and conditioning rotate every week.
// Injury modes:
//   Back mode — removes spinal loading and loaded rotation, adds a daily back rehab block.
//   Knee mode — removes deep knee bending and lunges, holds impact at step 2, adds knee rehab.
//   Either mode off — that joint gets a short prehab block instead.
// Return-to-impact ladder (5 steps): knee scores decide when jumps and running return.
// Tests: baseline in week 1, then the deload at the end of every Power block (weeks 12, 24, 36, 48).
// Labels: A, B, C = one exercise at a time. A1/A2 = superset (ss: true marks the first of a pair).

export const BLOCK_SEQ = ["H", "S", "P", "H", "S", "P", "H", "S", "P", "H", "S", "P"];
export const TOTAL_WEEKS = BLOCK_SEQ.length * 4; // 48

export const BLOCK_INFO = {
  H: { name: "Hypertrophy", color: "#D4A64A", goal: "Build muscle. Moderate loads, more sets, reps taken close to failure." },
  S: { name: "Strength", color: "#C9483E", goal: "Heavier compound lifts for 4–6 reps with long rest. Accessories stay moderate." },
  P: { name: "Power", color: "#4FA3C7", goal: "Move fast. Explosive work first while fresh, then moderate loads lifted with maximum speed." },
};
export const DELOAD_COLOR = "#7FA58A";

// Week 1 is the baseline. The rest are the deloads that end each Power block,
// when fatigue is lowest and you're closest to peak.
export const TEST_WEEKS = [1, 12, 24, 36, 48];

export function weekInfo(w) {
  const blockIdx = Math.floor((w - 1) / 4);
  const type = BLOCK_SEQ[blockIdx];
  const wib = ((w - 1) % 4) + 1; // week in block 1–4
  const deload = wib === 4;
  const cycle = Math.floor(blockIdx / 3); // 0–3, each 12 weeks
  return { w, blockIdx, type, wib, deload, cycle, test: TEST_WEEKS.includes(w) };
}

// ─── RETURN-TO-IMPACT LADDER ────────────────────────────────────────────────
export const LADDER = [
  {
    name: "No impact",
    goal: "Sled pushes, heavy isometric holds, bike and rower. Nothing that lands.",
    adds: "Where you start.",
  },
  {
    name: "Loaded walking",
    goal: "Incline walking or a light ruck on the Athletic day. Still nothing that lands.",
    adds: "Athletic-day conditioning becomes an incline walk or ruck. Knee check appears on that day too.",
  },
  {
    name: "Small hops",
    goal: "A few small, quiet hops. Low height, low volume.",
    adds: "Pogo hops in the Lower A power slot, skater hops in Lower B. Leg extensions go back to normal reps.",
  },
  {
    name: "Jumps and landings",
    goal: "Box jumps, broad jumps, and lateral bounds with stuck landings.",
    adds: "Full power work on both lower days. Athletic day becomes hard incline intervals.",
  },
  {
    name: "Running",
    goal: "Run/walk intervals, then continuous easy running, then strides.",
    adds: "Athletic-day conditioning becomes a running progression that builds week by week.",
  },
];

// To move up: the last 6 knee scores since entering the step are all 2 or lower,
// and at least 3 weeks have passed. Two scores of 4+ in a row suggests a step back.
export const GATE = { sessions: 6, maxScore: 2, minWeeks: 3, flare: 4 };

// Knee mode holds you at step 2 (Loaded walking) or lower, whatever step you've earned.
export const KNEE_MODE_MAX_STAGE = 1;
export const effectiveStage = (settings) =>
  settings.knee ? Math.min(settings.stage, KNEE_MODE_MAX_STAGE) : settings.stage;

const ORDER = ["A", "B", "C", "D", "E"];

function scoresFor(log, key) {
  const out = [];
  for (let w = 1; w <= TOTAL_WEEKS; w++) {
    for (const d of ORDER) {
      const v = log[`w${w}_${d}`]?.[key];
      if (v != null) out.push({ w, d, v });
    }
  }
  return out;
}
export const kneeScores = (log) => scoresFor(log, "knee");
export const backScores = (log) => scoresFor(log, "back");

export function gateStatus(log, settings, week) {
  const { stage, stageSince } = settings;
  const scores = kneeScores(log).filter((s) => s.w >= stageSince && s.w <= week);
  let streak = 0;
  for (let i = scores.length - 1; i >= 0 && scores[i].v <= GATE.maxScore; i--) streak++;
  const weeksIn = Math.max(0, week - stageSince);
  const flare = scores.length >= 2 && scores.slice(-2).every((s) => s.v >= GATE.flare);
  const earned = stage < LADDER.length - 1 && streak >= GATE.sessions && weeksIn >= GATE.minWeeks;
  return {
    stage, scores, streak, weeksIn,
    heldByKnee: !!settings.knee && stage >= KNEE_MODE_MAX_STAGE,
    canAdvance: earned && !settings.knee,
    shouldStepBack: stage > 0 && flare,
  };
}

// ─── PRESCRIPTIONS ──────────────────────────────────────────────────────────
const RX = {
  H: {
    power: { sets: 3, reps: "3", rest: 90 },
    main: { sets: 4, reps: "8–10", rpe: ["7", "8", "8.5"], rest: 120 },
    sec: { sets: 3, reps: "10–12", rpe: ["7.5", "8", "9"], rest: 90 },
    acc: { sets: 3, reps: "12–15", rpe: ["8", "8.5", "9"], rest: 60 },
  },
  S: {
    power: { sets: 4, reps: "3", rest: 90 },
    main: { sets: 5, reps: "4–6", rpe: ["7.5", "8", "9"], rest: 180, cue: "Heavy, but every rep clean. Leave 1–2 in the tank." },
    sec: { sets: 4, reps: "6–8", rpe: ["7.5", "8", "8.5"], rest: 120 },
    acc: { sets: 3, reps: "10–12", rpe: ["8", "8", "8.5"], rest: 75 },
  },
  P: {
    power: { sets: 5, reps: "3", rest: 120 },
    main: { sets: 4, reps: "3–5", rpe: ["7", "7", "7.5"], rest: 150, cue: "Load around 75% of your 5-rep weight. Lower under control, lift as fast as possible." },
    sec: { sets: 3, reps: "6–8", rpe: ["7.5", "8", "8"], rest: 90 },
    acc: { sets: 2, reps: "10–12", rpe: ["8", "8", "8"], rest: 60 },
  },
};

const DELOAD_RX = {
  power: { sets: 2, reps: "3", rest: 90 },
  main: { sets: 2, reps: "8", rpe: "5–6", rest: 90, cue: "Use 60–70% of last week's weight. Practice, not training." },
  sec: { sets: 2, reps: "10", rpe: "5–6", rest: 75 },
  acc: { sets: 1, reps: "12–15", rpe: "6", rest: 60 },
};

export function prescription(tier, info, poorSleep, override = {}) {
  let base;
  if (tier === "core") {
    base = { sets: info.deload ? 2 : 3, reps: "", rpe: "", rest: 45 };
  } else if (info.deload) {
    base = { ...DELOAD_RX[tier] };
  } else {
    const r = RX[info.type][tier];
    if (!r) return null;
    base = { ...r, rpe: r.rpe ? r.rpe[info.wib - 1] : "" };
  }
  if (tier === "power") base.rpe = info.deload ? "Easy, crisp" : "Max intent — stop the set if speed drops";

  const out = { ...base, ...override };
  if (info.deload && override.sets) out.sets = Math.max(1, Math.ceil(override.sets / 2));

  if (poorSleep && !info.deload && ["power", "main", "sec"].includes(tier)) {
    out.sets = Math.max(2, out.sets - 1);
    if (tier !== "power") out.rpe = "7 max";
    out.poor = true;
  }
  return out;
}

// ─── DAYS ───────────────────────────────────────────────────────────────────
export const DAYS = {
  A: { title: "Lower A", sub: "Knee-dominant legs and lower-body power", dow: 1, lower: true },
  B: { title: "Upper A", sub: "Horizontal push and pull, upper-body power", dow: 2, lower: false },
  C: { title: "Athletic", sub: "Arms, delts, carries, knee health, conditioning", dow: 3, lower: false },
  D: { title: "Lower B", sub: "Hip-dominant legs and lower-body power", dow: 4, lower: true },
  E: { title: "Upper B", sub: "Vertical push and pull, rotational power", dow: 5, lower: false },
};
export const DOW_TO_DAY = { 1: "A", 2: "B", 3: "C", 4: "D", 5: "E" };

// Exercise fields:
//  n: string, array (one per 12-week cycle, wraps if shorter), or (info) => string
//  tier: power | main | sec | acc | core
//  stages: array of overrides by impact step (power slots); finalStage = first step with the full exercise
//  low: overrides used while the impact step is below 2 (leg extension isometrics)
//  lower: true → larger load jumps; reps/sets: fixed overrides; note: coaching cue
const pick = (arr, info) => arr[info.cycle % arr.length];

const lungeFor = (info) => {
  if (info.type === "S") return pick(["Step-up (DBs, knee-height box)", "Rear-foot elevated split squat (DBs)"], info);
  if (info.type === "P") return pick(["Overhead reverse lunge (barbell or plate)", "Lateral lunge (DB goblet)"], info);
  return pick(["Reverse lunge (DBs)", "Overhead reverse lunge (barbell or plate)", "Rear-foot elevated split squat (DBs)", "Walking lunge (DBs)"], info);
};
const hingeFor = (info) => {
  if (info.type === "S") return "Trap bar deadlift (high handles)";
  if (info.type === "P") return pick(["Barbell RDL", "Trap bar RDL"], info);
  return pick(["Barbell RDL", "Trap bar RDL", "Barbell RDL (2-sec pause below knee)", "Trap bar RDL"], info);
};

const EX = {
  A: [
    {
      tier: "power", finalStage: 3,
      stages: [
        { n: "Sled push sprint, 15 yd", note: "Drive as fast as possible, walk back, repeat. No landing, so the knees only see pushing." },
        { n: "Sled push sprint, 15 yd", note: "Drive as fast as possible, walk back, repeat. No landing, so the knees only see pushing." },
        { n: "Pogo hops (low, quiet feet)", reps: "10", sets: 3, note: "Small and stiff, like a bouncing ball. Stop the set when the landings get loud." },
        { n: ["Box jump (step down)", "Seated box jump"], note: "Full reset between reps. Land softly and step down — never jump down." },
        { n: ["Box jump (step down)", "Seated box jump"], note: "Full reset between reps. Land softly and step down — never jump down." },
      ],
    },
    { tier: "main", n: ["Hack squat", "Leg press", "Pause hack squat (2 s at bottom)", "Leg press (1¼ reps)"], lower: true, note: "Depth you can own without knee pain above 3/10. Knees track over toes." },
    { tier: "sec", n: lungeFor, lower: true, repsSuffix: " /leg", note: "Drive through the whole foot. Overhead versions: ribs down, glutes tight, and drop the weight if your lower back arches." },
    {
      tier: "acc", n: ["Leg extension (3-sec lowering)", "Leg extension (1¼ reps)", "Leg extension (pause at top)", "Single-leg leg extension"],
      low: { n: "Leg extension isometric hold", reps: "45 s hold, heavy", sets: 5, note: "Hold at about 60° of knee bend, heavy enough to feel it by 30 s. Isometrics calm an irritated patellar tendon." },
      note: "Slow and controlled. Stop short of full lockout if the knee complains.",
    },
    { tier: "acc", ss: true, n: ["Seated leg curl", "Lying leg curl", "Single-leg lying leg curl", "Seated leg curl (3-sec lowering)"], note: "Pause one second at full contraction." },
    { tier: "acc", n: ["Seated calf raise", "Standing calf raise", "Leg press calf raise", "Single-leg DB calf raise"], note: "Two-second stretch at the bottom." },
    { tier: "core", ss: true, n: ["Pallof press", "Half-kneeling Pallof press", "Tall-kneeling Pallof press", "Pallof press with overhead reach"], reps: "10 /side" },
    { tier: "core", n: ["Dead bug", "Dead bug (band pullover)", "Dead bug (heel taps)", "Dead bug"], reps: "8 /side" },
  ],
  B: [
    { tier: "power", n: ["Med ball chest pass (to wall)", "Plyo push-up (hands on bench)", "Med ball chest pass (half-kneeling)", "Plyo push-up (hands on bench)"], reps: "4", note: "Throw or push as hard as possible. Full reset each rep." },
    { tier: "main", n: ["Barbell bench press", "DB bench press", "Barbell bench press (2-sec pause)", "Close-grip bench press"], note: "Feet planted, shoulder blades pinned." },
    { tier: "sec", ss: true, n: ["Chest-supported T-bar row", "Seal row", "Chest-supported DB row", "Seated cable row (neutral grip)"], note: "Chest on the pad, or sit tall. Pull with the elbows." },
    { tier: "sec", n: ["Incline DB press", "Weighted dip", "Machine incline press", "Weighted dip"], note: "Dips: stop at upper arm parallel to the floor." },
    { tier: "acc", ss: true, n: ["Face pull", "Reverse pec deck", "Prone Y-raise (incline bench)", "Face pull"], note: "Shoulder health — don't skip these." },
    { tier: "acc", n: ["Rope triceps pushdown", "Overhead cable triceps extension", "Single-arm cable pushdown", "Cable cross-body triceps extension"] },
    { tier: "core", n: ["Standing cable chop", "Half-kneeling cable lift", "Standing cable chop", "Half-kneeling cable lift"], reps: "10 /side" },
  ],
  C: [
    { tier: "power", n: ["Battle rope power waves", "Battle rope alternating slams", "Battle rope outside circles", "Battle rope alternating slams"], reps: "10 s", note: "All-out for 10 seconds, rest 50." },
    { tier: "acc", ss: true, n: ["Preacher curl", "Hammer curl", "Bayesian cable curl", "Cable curl"], sets: 3, reps: "10–12" },
    { tier: "acc", n: ["EZ-bar skull crusher", "Dip machine", "DB skull crusher", "Machine triceps extension"], sets: 3, reps: "10–12" },
    { tier: "acc", ss: true, n: ["Machine lateral raise", "Cable Y-raise", "DB lateral raise", "Machine lateral raise"], sets: 3, reps: "12–15" },
    { tier: "acc", n: ["Rear delt cable fly", "Band pull-apart", "Chest-supported rear delt raise", "Rear delt cable fly"], sets: 3, reps: "15–20" },
    { tier: "acc", n: ["Farmer's carry", "Trap bar carry (lift from the floor, brace first)", "Farmer's carry", "Front-rack KB carry"], sets: 4, reps: "40 yd", note: "Heavy. Tall posture, braced trunk. Job-specific grip and trunk work." },
    { tier: "acc", n: "Backward sled drag", sets: 4, reps: "30 yd", note: "Knee health: all quad, no lowering phase, very knee-friendly. Moderate weight." },
    { tier: "acc", n: ["Wrist roller", "Plate pinch hold", "Dead hang (max time)", "Plate pinch hold"], sets: 3, reps: "Up and down" },
    { tier: "core", n: ["Hanging knee raise", "Side plank", "Ab wheel rollout (from knees, short range)", "Side plank"], reps: "10–12" },
  ],
  D: [
    {
      tier: "power", finalStage: 3,
      stages: [
        { n: "Speed hip thrust (band + light bar)", note: "Fast up, one-second squeeze, controlled down." },
        { n: "Speed hip thrust (band + light bar)", note: "Fast up, one-second squeeze, controlled down." },
        { n: "Skater hops (small, stick)", reps: "6 /side", sets: 3, note: "Short lateral hops. Stick each landing for a full second, then reset." },
        { n: ["Broad jump (stick the landing)", "Lateral bound (stick)"], note: "Stick every landing for a full second, then reset." },
        { n: ["Broad jump (stick the landing)", "Lateral bound (stick)"], note: "Stick every landing for a full second, then reset." },
      ],
    },
    { tier: "main", n: hingeFor, lower: true, note: "Hinge, don't squat. Keep the load close to your legs, brace before you pull, and reset fully on every rep. Trap bar: high handles." },
    { tier: "sec", n: ["Barbell hip thrust", "Smith machine hip thrust", "B-stance hip thrust (barbell)", "Barbell glute bridge (2-sec pause)"], lower: true, note: "Chin tucked, ribs down. Lockout comes from glutes, not low back." },
    { tier: "sec", ss: true, n: ["DB single-leg RDL (light, controlled)", "Cable pull-through", "Kickstand RDL (DB)", "Cable pull-through"], note: "Stop the moment your back wants to round. This is a hamstring stretch, not a lift." },
    { tier: "sec", n: ["Leg press (feet high and wide)", "Goblet box squat", "Hack squat (feet high)", "Goblet box squat"], lower: true, note: "Feet high shifts work to hips and off the knees." },
    { tier: "acc", ss: true, n: ["45° back extension (bodyweight, glute bias)", "Nordic curl (eccentric only, assisted)"], note: "Pain-free range only." },
    { tier: "acc", n: ["Hip adduction machine", "Copenhagen plank (short lever)", "Hip abduction machine", "Copenhagen plank (short lever)"] },
    { tier: "core", ss: true, n: "Suitcase carry", reps: "30 yd /side" },
    { tier: "core", n: "Side plank", reps: "30 s /side" },
  ],
  E: [
    { tier: "power", n: ["Standing rotational med ball throw (to wall)", "Med ball scoop toss (standing)", "Half-kneeling rotational med ball throw", "Med ball scoop toss (standing)"], reps: "4 /side", note: "Turn through the hips, then the trunk. Throw hard into a wall." },
    { tier: "main", n: ["Weighted pull-up", "Weighted chin-up", "Weighted neutral-grip pull-up", "Weighted pull-up"], note: "Full hang at the bottom, chest to bar at the top. Bodyweight only if the reps won't come." },
    { tier: "sec", ss: true, n: ["Seated DB shoulder press", "Half-kneeling landmine press", "Machine shoulder press", "Seated DB Arnold press"], note: "Back supported or kneeling — no standing barbell press." },
    { tier: "sec", n: ["Neutral-grip lat pulldown", "Single-arm lat pulldown", "Wide-grip lat pulldown", "Single-arm lat pulldown"] },
    { tier: "acc", ss: true, n: ["Cable lateral raise", "Lean-away DB lateral raise"] },
    { tier: "acc", n: ["Incline DB curl", "EZ-bar curl", "Spider curl (EZ bar)", "Hammer curl"] },
    { tier: "core", ss: true, n: ["Landmine rotation", "Half-kneeling cable lift"], reps: "8 /side" },
    { tier: "core", n: "Bird dog with 3-sec pause", reps: "6 /side" },
  ],
};

// ─── INJURY-MODE SWAPS ──────────────────────────────────────────────────────
// By exercise name. Knee swaps run first, then back swaps, so when both modes are
// on, an exercise ends up safe for both. A swap keeps the slot's tier, sets, and pairing.
const many = (names, swap) => Object.fromEntries(names.map((n) => [n, swap]));

const LUNGES = [
  "Reverse lunge (DBs)", "Overhead reverse lunge (barbell or plate)", "Rear-foot elevated split squat (DBs)",
  "Walking lunge (DBs)", "Step-up (DBs, knee-height box)", "Lateral lunge (DB goblet)",
];

const KNEE_SWAP = {
  ...many(["Hack squat", "Pause hack squat (2 s at bottom)", "Leg press", "Leg press (1¼ reps)"], {
    n: "Leg press (limited depth, 3-sec lowering)",
    note: "Stop at about 90° of knee bend, or above the depth where the knee complains. Slow lowering loads the tendon without the bounce.",
  }),
  ...many(LUNGES, {
    n: "Low box step-up (DBs, 6–8 in)",
    note: "Low box, slow on the way down. Drive through the whole foot of the top leg.",
  }),
  "Goblet box squat": { n: "Goblet box squat (high box, above parallel)", note: "Sit back to a box set just above parallel. Stand without rocking." },
  "Hack squat (feet high)": { n: "Leg press (feet high and wide)", note: "Feet high shifts work to hips and off the knees." },
};

const BACK_SWAP = {
  // Axial load: the weight rests on your shoulders or hangs from your hands while you stand.
  ...many(["Hack squat", "Pause hack squat (2 s at bottom)"], {
    n: "Leg press", note: "Back flat on the pad. Stop before your hips curl off it at the bottom.",
  }),
  "Hack squat (feet high)": { n: "Leg press (feet high and wide)", note: "Back flat on the pad. Stop before your hips curl off it." },
  ...many(LUNGES, {
    n: "Single-leg leg press", note: "Single-leg work with the spine unloaded. Stop before your hips curl off the pad.",
  }),
  "Low box step-up (DBs, 6–8 in)": {
    n: "Single-leg leg press (limited depth)", note: "Spine unloaded and knee kept above 90°. Stop before your hips curl off the pad.",
  },
  "Standing calf raise": { n: "Leg press calf raise" },
  // Hinges
  ...many(["Barbell RDL", "Trap bar RDL", "Barbell RDL (2-sec pause below knee)", "Trap bar deadlift (high handles)"], {
    n: "Barbell hip thrust (heavy, main lift)",
    note: "Takes the hinge's place while back mode is on. Ribs down, chin tucked, lockout from the glutes, not by arching.",
  }),
  ...many(["Barbell hip thrust", "Smith machine hip thrust", "B-stance hip thrust (barbell)", "Barbell glute bridge (2-sec pause)"], {
    n: "Single-leg hip thrust (DB on hip)", note: "The heavy hip thrust is your main lift now, so this one is single-leg and lighter.",
  }),
  ...many(["DB single-leg RDL (light, controlled)", "Cable pull-through", "Kickstand RDL (DB)"], {
    n: "Stability ball leg curl", note: "Hips up, ribs down. Hamstrings without a hinge.",
  }),
  ...many(["Goblet box squat", "Goblet box squat (high box, above parallel)"], {
    n: "Leg press (feet high and wide)", note: "Back flat on the pad. Feet high shifts work to the hips.",
  }),
  "45° back extension (bodyweight, glute bias)": {
    n: "Glute bridge march", note: "Hold the bridge and lift one foot at a time. Hips stay level.",
  },
  // Loaded rotation and flexion
  ...many(["Standing cable chop", "Half-kneeling cable lift", "Landmine rotation"], {
    n: "Half-kneeling Pallof press", note: "Resist the cable. Nothing twists.",
  }),
  ...many(["Standing rotational med ball throw (to wall)", "Med ball scoop toss (standing)", "Half-kneeling rotational med ball throw"], {
    n: "Med ball chest pass (half-kneeling)", reps: "4", note: "Power from the chest and arms while the trunk stays still.",
  }),
  ...many(["Hanging knee raise", "Ab wheel rollout (from knees, short range)"], {
    n: "Dead bug (heel taps)", note: "Low back stays down the whole time.",
  }),
  // The back rehab block already has side planks and bird dogs, so these change.
  "Side plank": { n: "Pallof press iso hold", note: "Arms straight out, hold still. The rehab block covers side planks." },
  "Bird dog with 3-sec pause": { n: "Dead bug (band pullover)", note: "The rehab block covers bird dogs." },
  // Carries from the floor, and rows that bend the spine
  ...many(["Farmer's carry", "Trap bar carry (lift from the floor, brace first)"], {
    n: "Farmer's carry (moderate, pick up from boxes)",
    note: "Lift from knee-height boxes so you skip the floor. Moderate weight, tall posture.",
  }),
  "Seated cable row (neutral grip)": { n: "Chest-supported DB row", note: "Chest on the pad, so the low back does nothing." },
};

function applySwaps(item, { back, knee }) {
  let cur = item;
  const why = new Set();
  for (let i = 0; i < 3; i++) {
    let changed = false;
    if (knee && KNEE_SWAP[cur.name]) { cur = { ...cur, ...KNEE_SWAP[cur.name], name: KNEE_SWAP[cur.name].n }; why.add("knee"); changed = true; }
    if (back && BACK_SWAP[cur.name]) { cur = { ...cur, ...BACK_SWAP[cur.name], name: BACK_SWAP[cur.name].n }; why.add("back"); changed = true; }
    if (!changed) break;
  }
  return { ...cur, swapWhy: [...why] };
}

// ─── WHAT TO LOG ────────────────────────────────────────────────────────────
// Each field stores under a key: w = a load, r = reps, h = box height,
// d = jump distance, t = hold time. Load suggestions only appear for w + r.
const F = {
  w: { key: "w", label: "Weight", unit: "lb" },
  perDb: { key: "w", label: "Weight per dumbbell", unit: "lb" },
  oneDb: { key: "w", label: "Dumbbell weight", unit: "lb" },
  perHand: { key: "w", label: "Weight per hand", unit: "lb" },
  oneHand: { key: "w", label: "Weight (one hand)", unit: "lb" },
  added: { key: "w", label: "Added weight", unit: "lb" },
  bar: { key: "w", label: "Bar weight", unit: "lb" },
  onBar: { key: "w", label: "Weight on the bar", unit: "lb" },
  stack: { key: "w", label: "Stack weight", unit: "lb" },
  ball: { key: "w", label: "Ball weight", unit: "lb" },
  sled: { key: "w", label: "Sled load", unit: "lb" },
  plate: { key: "w", label: "Plate weight", unit: "lb" },
  r: { key: "r", label: "Top-set reps", unit: "reps" },
  rOnly: { key: "r", label: "Best set reps", unit: "reps" },
  rLeg: { key: "r", label: "Reps per leg", unit: "reps" },
  rArm: { key: "r", label: "Reps per arm", unit: "reps" },
  h: { key: "h", label: "Box height", unit: "in" },
  jump: { key: "d", label: "Best jump", unit: "in" },
  bound: { key: "d", label: "Best bound", unit: "in" },
  t: { key: "t", label: "Hold time", unit: "s" },
  tSide: { key: "t", label: "Hold per side", unit: "s" },
};
const DEFAULT_METRIC = [F.w, F.r];

// By exercise name. Anything not listed: weight + reps for lifts, nothing for power and core.
// reps here overrides the block prescription (for holds); suffix labels per-leg / per-arm work.
const legDb = { fields: [F.perDb, F.rLeg] };
const perLeg = (load) => ({ fields: [load, F.rLeg], suffix: " /leg" });
const perArm = (load) => ({ fields: [load, F.rArm], suffix: " /arm" });

export const METRICS = {
  // power
  "Sled push sprint, 15 yd": { fields: [F.sled] },
  "Box jump (step down)": { fields: [F.h] },
  "Seated box jump": { fields: [F.h] },
  "Broad jump (stick the landing)": { fields: [F.jump] },
  "Lateral bound (stick)": { fields: [F.bound] },
  "Speed hip thrust (band + light bar)": { fields: [F.bar] },
  "Med ball chest pass (to wall)": { fields: [F.ball] },
  "Med ball chest pass (half-kneeling)": { fields: [F.ball] },
  "Standing rotational med ball throw (to wall)": { fields: [F.ball] },
  "Half-kneeling rotational med ball throw": { fields: [F.ball] },
  "Med ball scoop toss (standing)": { fields: [F.ball] },
  // lower: lunges and single-leg
  "Reverse lunge (DBs)": legDb,
  "Walking lunge (DBs)": legDb,
  "Rear-foot elevated split squat (DBs)": legDb,
  "Step-up (DBs, knee-height box)": legDb,
  "Low box step-up (DBs, 6–8 in)": legDb,
  "Lateral lunge (DB goblet)": { fields: [F.oneDb, F.rLeg] },
  "Overhead reverse lunge (barbell or plate)": { fields: [F.w, F.rLeg] },
  "Single-leg leg press": perLeg(F.w),
  "Single-leg leg press (limited depth)": perLeg(F.w),
  "Single-leg leg extension": perLeg(F.w),
  "Single-leg lying leg curl": perLeg(F.w),
  "Single-leg DB calf raise": perLeg(F.oneDb),
  "Leg extension isometric hold": { fields: [F.w, F.t] },
  // lower: hips and hamstrings
  "DB single-leg RDL (light, controlled)": perLeg(F.oneDb),
  "Kickstand RDL (DB)": perLeg(F.oneDb),
  "B-stance hip thrust (barbell)": perLeg(F.w),
  "Single-leg hip thrust (DB on hip)": perLeg(F.oneDb),
  "Stability ball leg curl": { fields: [F.rOnly] },
  "Goblet box squat": { fields: [F.oneDb, F.r] },
  "Goblet box squat (high box, above parallel)": { fields: [F.oneDb, F.r] },
  "45° back extension (bodyweight, glute bias)": { fields: [F.added, F.r] },
  "Glute bridge march": { fields: [], reps: "8 /side, 3-sec hold" },
  "Nordic curl (eccentric only, assisted)": { fields: [F.rOnly], reps: "4–6" },
  "Copenhagen plank (short lever)": { fields: [F.tSide], reps: "20–30 s /side" },
  // upper
  "DB bench press": { fields: [F.perDb, F.r] },
  "Incline DB press": { fields: [F.perDb, F.r] },
  "Chest-supported DB row": { fields: [F.perDb, F.r] },
  "Prone Y-raise (incline bench)": { fields: [F.perDb, F.r] },
  "Weighted dip": { fields: [F.added, F.r] },
  "Weighted pull-up": { fields: [F.added, F.r] },
  "Weighted chin-up": { fields: [F.added, F.r] },
  "Weighted neutral-grip pull-up": { fields: [F.added, F.r] },
  "Seated DB shoulder press": { fields: [F.perDb, F.r] },
  "Seated DB Arnold press": { fields: [F.perDb, F.r] },
  "Half-kneeling landmine press": perArm(F.onBar),
  "Single-arm lat pulldown": perArm(F.w),
  "Single-arm cable pushdown": perArm(F.w),
  "Bayesian cable curl": perArm(F.w),
  "Lean-away DB lateral raise": perArm(F.oneDb),
  "DB lateral raise": { fields: [F.perDb, F.r] },
  "Chest-supported rear delt raise": { fields: [F.perDb, F.r] },
  "DB skull crusher": { fields: [F.perDb, F.r] },
  "Hammer curl": { fields: [F.perDb, F.r] },
  "Incline DB curl": { fields: [F.perDb, F.r] },
  "Band pull-apart": { fields: [F.rOnly] },
  // athletic day
  "Farmer's carry": { fields: [F.perHand] },
  "Farmer's carry (moderate, pick up from boxes)": { fields: [F.perHand] },
  "Front-rack KB carry": { fields: [F.perHand] },
  "Trap bar carry (lift from the floor, brace first)": { fields: [F.w] },
  "Backward sled drag": { fields: [F.sled] },
  "Wrist roller": { fields: [F.plate] },
  "Plate pinch hold": { fields: [F.plate, F.t], reps: "20–30 s" },
  "Dead hang (max time)": { fields: [F.t], reps: "Max hold" },
  // core
  "Pallof press": { fields: [F.stack] },
  "Half-kneeling Pallof press": { fields: [F.stack], reps: "10 /side" },
  "Tall-kneeling Pallof press": { fields: [F.stack] },
  "Pallof press with overhead reach": { fields: [F.stack] },
  "Pallof press iso hold": { fields: [F.stack], reps: "20 s hold /side" },
  "Standing cable chop": { fields: [F.stack] },
  "Half-kneeling cable lift": { fields: [F.stack] },
  "Landmine rotation": { fields: [F.onBar] },
  "Suitcase carry": { fields: [F.oneHand] },
  "Hanging knee raise": { fields: [], reps: "10–12" },
  "Ab wheel rollout (from knees, short range)": { fields: [], reps: "8–10" },
  "Dead bug (heel taps)": { fields: [], reps: "8 /side" },
  "Dead bug (band pullover)": { fields: [], reps: "8 /side" },
  "Side plank": { fields: [], reps: "30 s /side" },
};

function resolveName(n, info) {
  if (typeof n === "function") return n(info);
  if (Array.isArray(n)) return pick(n, info);
  return n;
}

const TIER_ORDER = { power: 0, main: 1, sec: 1, acc: 2, core: 3 };

// modes: { back, knee }. stage should already be the effective stage (knee mode caps it).
export function exercisesFor(dayId, info, stage, { dropMain = false, back = false, knee = false } = {}) {
  const list = EX[dayId]
    .filter((e) => !(dropMain && e.tier === "main")) // a lift test replaces the main lift
    .map((e) => {
      let src = e;
      let impactSwap = false;
      if (e.stages) {
        src = { ...e, ...e.stages[Math.min(stage, e.stages.length - 1)] };
        impactSwap = stage < e.finalStage;
      } else if (e.low && stage < 2) {
        src = { ...e, ...e.low };
        impactSwap = true;
      }
      const swapped = applySwaps({ ...src, name: resolveName(src.n, info) }, { back, knee });
      const swapWhy = impactSwap ? [...swapped.swapWhy, "impact"] : swapped.swapWhy;
      const spec = METRICS[swapped.name];
      const metric = spec ? spec.fields : swapped.tier === "power" || swapped.tier === "core" ? [] : DEFAULT_METRIC;
      return {
        ...swapped, swapWhy, swap: swapWhy.length > 0, metric,
        reps: spec?.reps ?? swapped.reps,
        repsSuffix: spec?.suffix ?? src.repsSuffix,
      };
    })
    .sort((a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier]); // stable: matches on-screen order

  // A, B, C for single lifts. A1/A2 for a superset pair (ss marks the first of the pair).
  let letter = 0;
  for (let i = 0; i < list.length; i++) {
    const L = String.fromCharCode(65 + letter++);
    if (list[i].ss && list[i + 1]) {
      list[i].label = `${L}1`; list[i].ssRole = "first";
      list[i + 1].label = `${L}2`; list[i + 1].ssRole = "second";
      i++;
    } else {
      list[i].label = L;
    }
  }
  return list;
}

// ─── JOINT PREP: PREHAB (mode off) OR REHAB (mode on) ───────────────────────
// Goes right after the warm-up. Rehab doesn't deload: it's the point of the mode.
const PREHAB_BACK = {
  A: [["90/90 breathing, ribs down", "5 slow breaths"]],
  B: [["Cat-camel", "8 slow reps, small range"]],
  C: [["McGill curl-up", "1 × 5, 10-sec holds"]],
  D: [["Hip hinge drill with dowel", "10 reps. Dowel stays on head, upper back, and tailbone."]],
  E: [["Cat-camel", "8 slow reps, small range"]],
};
const PREHAB_KNEE = {
  A: [["Spanish squat hold (band)", "2 × 30 s"], ["Terminal knee extension (band)", "2 × 15 /side"]],
  C: [["Tibialis raise", "2 × 15"]],
  D: [["Single-leg balance, eyes closed", "2 × 30 s /side"], ["Tibialis raise", "2 × 15"]],
};
const REHAB_BACK_CORE = [
  ["McGill curl-up", "10-sec holds: 5, then 3, then 1. One knee bent, hands under your low back, head and shoulders barely lift."],
  ["Side plank (knees or feet)", "10-sec holds: 5, 3, 1 per side. Knees if feet hurts."],
  ["Bird dog", "10-sec holds: 5, 3, 1 per side. Reach long, don't lift high."],
  ["Cat-camel", "8 slow reps, small range, no pain"],
];
const REHAB_BACK_EXTRA = {
  A: [["Hip hinge drill with dowel", "10 reps. Dowel stays on head, upper back, and tailbone."]],
  D: [["Hip hinge drill with dowel", "10 reps. Dowel stays on head, upper back, and tailbone."]],
};
const REHAB_KNEE = {
  A: [
    ["Spanish squat isometric (band)", "5 × 45 s, 2 min rest. Hard effort, knee pain 3/10 or less."],
    ["Terminal knee extension (band)", "3 × 15 /side"],
    ["Lateral step-down (4–6 in box)", "3 × 8 /side, 3-sec lowering"],
    ["Tibialis raise", "2 × 15"],
  ],
  C: [
    ["Spanish squat isometric (band)", "3 × 45 s, 2 min rest"],
    ["Terminal knee extension (band)", "3 × 15 /side"],
    ["Tibialis raise", "2 × 15"],
  ],
  D: [
    ["Spanish squat isometric (band)", "5 × 45 s, 2 min rest. Hard effort, knee pain 3/10 or less."],
    ["Terminal knee extension (band)", "3 × 15 /side"],
    ["Lateral step-down (4–6 in box)", "3 × 8 /side, 3-sec lowering"],
  ],
  B: [["Spanish squat isometric (band)", "3 × 45 s, 2 min rest"]],
  E: [["Spanish squat isometric (band)", "3 × 45 s, 2 min rest"]],
};

const toItems = (rows) => rows.map(([n, d]) => ({ n, d }));

export function jointPrepFor(dayId, { back = false, knee = false } = {}) {
  const groups = [];
  groups.push(back
    ? {
      id: "back", mode: true, title: "Back rehab",
      sub: "Back mode is on. Do this every training day, and on rest days if you can. Short holds, no pain.",
      items: toItems([...REHAB_BACK_CORE, ...(REHAB_BACK_EXTRA[dayId] || [])]),
    }
    : { id: "back", mode: false, title: "Back prehab", sub: "Maintenance. A couple of minutes.", items: toItems(PREHAB_BACK[dayId]) });
  const kneeRows = knee ? REHAB_KNEE[dayId] : PREHAB_KNEE[dayId];
  if (kneeRows) {
    groups.push(knee
      ? { id: "knee", mode: true, title: "Knee rehab", sub: "Knee mode is on. Isometrics first: they tend to settle a sore tendon for the session.", items: toItems(kneeRows) }
      : { id: "knee", mode: false, title: "Knee prehab", sub: "Maintenance for the tendon and ankle.", items: toItems(kneeRows) });
  }
  return groups;
}

// ─── ROTATION HELPERS ───────────────────────────────────────────────────────
// Warm-ups, cool-downs, and conditioning change every week. The lifts don't.
// Selection is fixed by week number, so going back to an old week shows what you did.
// Item tags: spine → left out in back mode. knee → left out in knee mode.
const DAY_INDEX = { A: 0, B: 1, C: 2, D: 3, E: 4 };

const allowed = (item, { back = false, knee = false } = {}) => !(back && item.spine) && !(knee && item.knee);

// Takes `count` items in a row from the pool, starting at a point that moves every week.
// Days that share a pool start at different points, so the same week doesn't repeat itself.
function rotate(pool, count, week, offset, modes) {
  const list = pool.filter((it) => allowed(it, modes));
  if (list.length <= count) return list;
  const start = (week * count + offset) % list.length;
  return Array.from({ length: count }, (_, i) => list[(start + i) % list.length]);
}

const it = (n, d, tags = {}) => ({ n, d, ...tags });

// ─── WARM-UPS ───────────────────────────────────────────────────────────────
// "Side plank, short" and "Side plank (knees or feet)" are the same drill for this purpose.
const drillKey = (n) => n.toLowerCase().replace(/[^a-z\s-]/g, " ").split(/\s+/).filter(Boolean).slice(0, 2).join(" ");

// Pools are grouped by body area. Each session takes one item from each area it needs,
// so every warm-up and cool-down still covers the right joints, just with different drills.
const RAISE = [
  it("Easy bike", "5 min, build to a light sweat"),
  it("Rower, easy", "5 min, build to a light sweat", { spine: true }),
  it("Incline treadmill walk", "5 min at 6–10% incline, brisk"),
  it("Ski erg, easy", "4 min, smooth strokes", { spine: true }),
  it("Bike with pickups", "5 min easy, with a 10 s pickup each minute"),
  it("Backward sled drag, light", "4 × 20 yd, walk back"),
  it("Shadowboxing", "3 min, feet planted, loose hands, easy pace"),
  it("Assault bike, arms and legs", "4 min easy"),
];

const W = {
  hip: [
    it("90/90 hip switches", "8 /side"),
    it("Supported hip airplane", "5 /side"),
    it("World's greatest stretch", "5 /side, slow"),
    it("Spiderman step with reach", "5 /side"),
    it("Half-kneeling hip flexor stretch with reach", "5 /side, 3-sec hold"),
    it("Frog stretch rock-back", "10 slow reps"),
  ],
  ankle: [
    it("Ankle rocks, knee over toe", "10 /side"),
    it("Banded ankle mobilization", "10 /side, band pulling the ankle back"),
    it("Calf raise with 2-sec stretch at the bottom", "15, off a step"),
    it("Tibialis raise against a wall", "15"),
    it("Half-kneeling ankle rocks with a dowel", "10 /side"),
  ],
  hamstring: [
    it("Hamstring sweep", "8 /side"),
    it("Leg swings, front and side", "10 each way /side"),
    it("Inchworm, short walkout", "5", { spine: true }),
    it("Standing toe-touch to squat, hands on a bench", "8, slow", { spine: true, knee: true }),
    it("Supine active straight-leg raise", "8 /side"),
    it("Hip hinge drill with dowel", "10. Dowel stays on head, upper back, and tailbone."),
  ],
  adductor: [
    it("Adductor rock-back", "10 /side"),
    it("Cossack shift, shallow", "6 /side, only as deep as is comfortable", { knee: true }),
    it("Side-lying adductor raise", "10 /side"),
    it("Standing wide-stance side shift", "8 /side"),
    it("Deep squat hold to a rack", "2 × 30 s, holding on", { knee: true }),
  ],
  glute: [
    it("Glute bridge", "12"),
    it("Glute bridge with 3-sec hold", "10"),
    it("Lateral band walk", "15 /side"),
    it("Monster walk (band at knees)", "15 steps forward, 15 back"),
    it("Single-leg glute bridge", "8 /side"),
    it("Banded clamshell", "15 /side"),
    it("Side-lying hip abduction", "12 /side"),
  ],
  trunk: [
    it("Dead bug", "6 /side"),
    it("Bird dog", "6 /side"),
    it("Front plank with shoulder taps", "10 /side"),
    it("Bear hold", "2 × 20 s, knees an inch off the floor"),
    it("Side plank, short", "2 × 15 s /side"),
  ],
  tspine: [
    it("Thoracic open book", "8 /side"),
    it("Quadruped T-spine rotation", "8 /side"),
    it("Foam roller T-spine extension", "6 slow reps at 3 spots"),
    it("Thread the needle", "6 /side"),
    it("Half-kneeling T-spine rotation with a dowel", "8 /side"),
  ],
  shoulder: [
    it("Band dislocate", "10"),
    it("Wall slide", "10"),
    it("Prone swimmers", "8"),
    it("Arm circles, small to big", "20 each way"),
    it("Band lat stretch", "30 s /side"),
    it("Child's pose with side reach", "30 s /side"),
  ],
  scap: [
    it("Scap push-up", "12"),
    it("Scap pull-up", "8"),
    it("Serratus wall slide with band", "10"),
    it("Dead hang", "2 × 20 s"),
    it("Bear crawl, slow", "2 × 15 yd"),
  ],
  cuff: [
    it("Band external rotation", "15 /side"),
    it("Cuban rotation, light DBs", "10"),
    it("Prone Y-T-W", "6 each"),
    it("Side-lying external rotation, light DB", "12 /side"),
    it("Band 90/90 external rotation", "12 /side"),
  ],
  pull: [
    it("Band pull-apart", "20"),
    it("Band face pull", "15"),
    it("Band overhead pull-apart", "15"),
    it("Band pull-apart, palms up", "20"),
    it("Band straight-arm pulldown", "15"),
  ],
  forearm: [
    it("Wrist circles and forearm rocks", "30 s"),
    it("Towel wring", "30 s each way"),
    it("Finger extensions with a band", "20"),
    it("Wrist flexor and extensor stretch", "20 s each"),
    it("Plate pinch, light", "2 × 15 s"),
  ],
};

// One item from each area, in this order.
const WARM_PLAN = {
  A: [RAISE, W.hip, W.ankle, W.adductor, W.glute, W.trunk],
  D: [RAISE, W.hip, W.hamstring, W.adductor, W.glute, W.trunk],
  B: [RAISE, W.tspine, W.shoulder, W.scap, W.cuff, W.pull],
  E: [RAISE, W.tspine, W.shoulder, W.scap, W.cuff, W.pull],
  C: [RAISE, W.hip, W.shoulder, W.forearm, W.glute],
};

export function warmupFor(dayId, info, stage, { back = false, knee = false } = {}) {
  const modes = { back, knee };
  // Don't repeat anything the rehab or prehab block already covers today.
  const covered = new Set(jointPrepFor(dayId, modes).flatMap((g) => g.items.map((x) => drillKey(x.n))));
  const offset = DAY_INDEX[dayId] * 2;
  const list = [];
  for (const pool of WARM_PLAN[dayId]) {
    const usable = pool.filter((x) => !covered.has(drillKey(x.n)) && !list.some((y) => drillKey(y.n) === drillKey(x.n)));
    rotate(usable, 1, info.w, offset, modes).forEach(({ n, d }) => list.push({ n, d }));
  }
  if (info.type === "P" && !info.deload) {
    if (DAYS[dayId].lower) {
      list.push(stage < 2 ? { n: "Sled march", d: "2 × 15 yd, primes the legs without landings" } : { n: "Low pogo hops", d: "2 × 10, quiet feet" });
    } else if (dayId !== "C") {
      list.push({ n: "Primer throws", d: back ? "2 × 3 half-kneeling chest passes at 70% effort" : "2 × 3 med ball throws at 70% effort" });
    }
  }
  if (dayId !== "C") list.push({ n: "Ramp-up sets", d: "3 lighter sets of the first main lift: ~50%, 70%, 85% of working weight" });
  return list;
}

// ─── COOL-DOWNS ─────────────────────────────────────────────────────────────
const C = {
  hipflexor: [
    it("Half-kneeling hip flexor stretch", "2 × 40 s /side"),
    it("Kneeling hip flexor stretch with side bend", "40 s /side"),
    it("Couch stretch", "40 s /side", { knee: true }),
    it("Standing hip flexor stretch, foot on a bench behind you", "40 s /side"),
  ],
  quad: [
    it("Side-lying quad stretch", "2 × 40 s /side"),
    it("Standing quad stretch at a wall", "40 s /side"),
    it("Prone quad stretch with a strap", "40 s /side"),
  ],
  calf: [
    it("Wall calf stretch", "45 s /side"),
    it("Bent-knee wall calf stretch", "40 s /side"),
    it("Downward dog calf pedal", "45 s"),
    it("Calf stretch off a step", "40 s /side"),
  ],
  glute: [
    it("Supine figure-4", "45 s /side"),
    it("Pigeon stretch", "45 s /side"),
    it("Seated figure-4 on a bench", "40 s /side"),
    it("Supine knee-to-opposite-shoulder", "40 s /side"),
  ],
  hamstring: [
    it("Supine hamstring strap stretch", "2 × 40 s /side"),
    it("Standing hamstring stretch, foot on a bench", "40 s /side"),
    it("Seated forward fold", "60 s, easy", { spine: true }),
    it("Doorway hamstring stretch, leg up the frame", "45 s /side"),
  ],
  adductor: [
    it("Adductor rock-back", "10 /side"),
    it("Butterfly stretch", "60 s"),
    it("Frog stretch", "60 s"),
    it("Supine straddle against a wall", "60 s"),
  ],
  lowback: [
    it("Child's pose", "60 s"),
    it("Supine twist", "30 s /side", { spine: true }),
    it("Knees to chest, rocking gently", "45 s"),
    it("Crocodile lie, belly down", "60 s"),
  ],
  pec: [
    it("Doorway pec stretch", "2 × 40 s /side"),
    it("Corner pec stretch, both arms", "45 s"),
    it("Prone pec stretch, arm out to the side", "40 s /side"),
    it("Foam roller lying chest opener", "90 s"),
  ],
  shoulder: [
    it("Cross-body shoulder stretch", "40 s /side"),
    it("Sleeper stretch", "30 s /side"),
    it("Behind-back towel stretch", "30 s"),
    it("Floor angel", "10 slow reps"),
  ],
  triceps: [
    it("Overhead triceps stretch", "30 s /side"),
    it("Overhead triceps stretch with a towel", "30 s /side"),
    it("Kneeling triceps stretch on a bench", "40 s"),
  ],
  tspine: [
    it("Thread the needle", "6 /side"),
    it("Thoracic open book", "6 /side, slow"),
    it("Foam roller T-spine extension", "60 s"),
  ],
  lat: [
    it("Kneeling lat stretch on bench", "2 × 40 s"),
    it("Doorway lat stretch", "40 s /side"),
    it("Puppy pose", "45 s"),
    it("Child's pose with side reach", "30 s /side"),
  ],
  biceps: [
    it("Biceps wall stretch", "30 s /side"),
    it("Seated biceps stretch, hands behind you", "40 s"),
    it("Doorway biceps stretch, thumb down", "30 s /side"),
  ],
  neck: [
    it("Upper trap stretch", "30 s /side"),
    it("Levator scap stretch", "30 s /side"),
    it("Chin tucks", "10 slow reps"),
  ],
  hang: [
    it("Dead hang, relaxed", "2 × 20 s"),
    it("Sleeper stretch", "30 s /side"),
    it("Cross-body shoulder stretch", "40 s /side"),
  ],
  forearm: [
    it("Forearm flexor and extensor stretch", "30 s each"),
    it("Prayer and reverse prayer stretch", "30 s each"),
    it("Kneeling wrist stretch, fingers back", "30 s"),
  ],
};

const BREATH = [
  it("90/90 breathing", "2 min, long exhales"),
  it("Box breathing", "2 min: 4 in, 4 hold, 4 out, 4 hold"),
  it("Legs up the wall, nasal breathing", "2 min"),
  it("Crocodile breathing", "2 min, belly into the floor"),
  it("Physiological sigh", "5 reps: two sniffs in, one long breath out"),
];

const COOL_PLAN = {
  A: [C.hipflexor, C.quad, C.calf, C.glute, BREATH],
  D: [C.hamstring, C.adductor, C.glute, C.lowback, BREATH],
  B: [C.pec, C.shoulder, C.triceps, C.tspine, BREATH],
  E: [C.lat, C.biceps, C.neck, C.hang, BREATH],
  C: [C.forearm, C.pec, C.lat, C.quad, BREATH],
};

export function cooldownFor(dayId, { back = false, knee = false, week = 1 } = {}) {
  const modes = { back, knee };
  const offset = DAY_INDEX[dayId];
  const list = [];
  for (const pool of COOL_PLAN[dayId]) {
    const usable = pool.filter((x) => !list.some((y) => y.n === x.n));
    rotate(usable, 1, week, offset, modes).forEach(({ n, d }) => list.push({ n, d }));
  }
  if (back) list.push({ n: "Easy walk", d: "5–10 min. Walking usually eases a sore back more than lying still." });
  return list;
}

// ─── CONDITIONING (buy-in = before lifting, finisher = after) ───────────────
// Each day and block type uses one style. The specific workout changes every week.
// Power blocks never use buy-ins: explosive work needs you fresh.
// spine: left out in back mode. back: replacement text in back mode.
// {m} in text becomes "bike or rower" normally, "bike" in back mode.
const STYLE = {
  primer: { kind: "Buy-in", note: "Hard but sustainable. It's a primer, not the workout." },
  alactic: { kind: "Finisher", note: "All-out, then full recovery. If the last rep is clearly slower than the first, stop." },
  intervals: { kind: "Finisher" },
  grind: { kind: "Finisher", note: "Heavy and steady. You should finish tired, not wrecked." },
  aerobic: { kind: "Finisher", note: "Conversational pace the whole time. If you can't talk in full sentences, slow down." },
  tempo: { kind: "Finisher" },
};

const PLAN = {
  A: { H: "primer", S: "grind", P: "alactic" },
  B: { H: "primer", S: "intervals", P: "alactic" },
  C: { H: "aerobic", S: "tempo", P: "aerobic" },
  D: { H: "grind", S: "grind", P: "alactic" },
  E: { H: "primer", S: "intervals", P: "alactic" },
};

const MET_POOL = {
  primer: [
    { title: "6-minute EMOM", work: "Odd minutes: 12/10 cal ski erg. Even minutes: 20 s battle rope waves.",
      back: { work: "Odd minutes: 15 cal bike. Even minutes: 20 s battle rope waves." } },
    { title: "Bike and sled", work: "4 rounds: 60 s bike at a hard pace, 20 yd sled push, rest 30 s." },
    { title: "8-minute AMRAP", work: "10 cal bike, 20 yd sled push, 10 band pull-aparts." },
    { title: "10-minute EMOM", work: "Odd minutes: 15 cal bike. Even minutes: 40 yd suitcase carry, switch hands each round." },
    { title: "Drag AMRAP", work: "8 minutes: 12 cal bike, 20 yd backward sled drag, 10 band pull-aparts." },
    { title: "Row and crawl EMOM", work: "8 minutes. Odd: 12/10 cal row. Even: 20 yd bear crawl.", spine: true },
    { title: "Bike and box", work: "8 minutes alternating: 1 min hard bike, 1 min shadowboxing (feet planted)." },
    { title: "Med ball EMOM", work: "8 minutes. Odd: 8 med ball chest passes to a wall. Even: 12 cal bike." },
    { title: "Ski and swing", work: "3 rounds: 300 m ski erg, 15 KB swings, rest 45 s.", spine: true },
  ],
  alactic: [
    { title: "Bike sprints", work: "8 × 8 s all-out assault bike, 52 s easy spin." },
    { title: "Sled sprints", work: "6 × 15 yd max speed, walk back is your rest." },
    { title: "Long bike sprints", work: "6 × 12 s all-out, 48 s easy." },
    { title: "Rope sprints", work: "8 × 10 s all-out rope waves, 50 s rest." },
    { title: "Row sprints", work: "6 × 15 s all-out row, 45 s easy.", spine: true },
    { title: "Ski sprints", work: "6 × 10 s all-out ski erg, 50 s easy.", spine: true },
    { title: "Drag sprints", work: "5 × 20 yd backward sled drag, as fast as possible, walk back rest." },
    { title: "Dead-stop bike starts", work: "8 × 6 s max effort from a dead stop, 54 s easy." },
    { title: "Med ball slams", work: "6 × 5 slams as hard as possible, 60 s rest.", spine: true },
  ],
  intervals: [
    { title: "Bike intervals", work: "10 × 10 s max effort, 50 s easy." },
    { title: "Rope intervals", work: "8 × 20 s battle rope waves, 40 s rest." },
    { title: "Ski intervals", work: "6 × 30 s hard, 60 s easy.", spine: true },
    { title: "Rope and bike", work: "5 rounds: 20 s rope waves, 40 s easy bike, then 60 s rest." },
    { title: "Row intervals", work: "4 × 250 m hard row, 90 s rest.", spine: true },
    { title: "Long bike intervals", work: "4 rounds: 45 s hard bike, 75 s easy." },
    { title: "Sled ladder", work: "Sled push 10, 20, 30, 20, 10 yd. Walk back between, rest 60 s at the top." },
    { title: "Bike and hang", work: "5 rounds: 15 cal bike, 20 s dead hang, rest 60 s." },
  ],
  grind: [
    { title: "Heavy sled push", work: "6 × 20 yd, heavy. Walk back is your rest." },
    { title: "Bike and drag", work: "4 rounds: 30 s hard bike, 30 yd backward sled drag, rest 60 s." },
    { title: "Drag and ropes", work: "5 rounds: 30 yd backward sled drag, 20 s rope waves, rest 60 s." },
    { title: "Carry and drag", work: "4 rounds: 40 yd farmer's carry, 30 yd backward sled drag, rest 60 s.",
      back: { work: "4 rounds: 40 yd farmer's carry (moderate, picked up from boxes), 30 yd backward sled drag, rest 60 s." } },
    { title: "Carry and ski", work: "4 rounds: 40 yd farmer's carry, 12 cal ski erg, rest 60 s.",
      back: { title: "Carry and bike", work: "4 rounds: 40 yd farmer's carry (moderate, from boxes), 15 cal bike, rest 60 s." } },
    { title: "Sled and bike", work: "4 rounds: 20 yd sled push, 12 cal bike, rest 60 s." },
    { title: "Sandbag and bike", work: "4 rounds: 40 yd sandbag bear-hug carry, 12 cal bike, rest 60 s.", spine: true },
    { title: "Suitcase and sled", work: "4 rounds: 30 yd suitcase carry each hand, 20 yd sled push, rest 60 s." },
    { title: "Carry medley", work: "4 rounds: 40 yd farmer's carry, 40 yd front-rack KB carry, rest 60 s.",
      back: { work: "4 rounds: 40 yd farmer's carry (moderate, from boxes), 40 yd front-rack KB carry, rest 60 s." } },
  ],
  aerobic: [
    { title: "Zone 2", work: "20 min easy on the {m}, or a light ruck walk.",
      back: { work: "20 min easy on the bike, or an incline walk with no pack." } },
    { title: "Aerobic intervals", work: "4 rounds: 4 min steady, 1 min easy. {M}." },
    { title: "Machine mix", work: "25 min easy: 10 min bike, 10 min rower, 5 min ski erg.",
      back: { work: "25 min easy: 15 min bike, 10 min incline walk." } },
    { title: "Bike with pickups", work: "20 min easy bike, with a 30 s pickup every 4 minutes." },
    { title: "Outdoor walk", work: "30 min brisk walk, breathing through your nose the whole time." },
    { title: "Three machines", work: "3 × 8 min easy: bike, rower, ski erg. Switch machines without stopping.",
      back: { work: "3 × 8 min easy: bike, incline walk, bike. Switch without stopping." } },
    { title: "Bike and box", work: "20 min alternating 2 min easy bike, 2 min easy shadowboxing (feet planted)." },
  ],
  tempo: [
    { title: "Tempo intervals", work: "5 rounds: 3 min moderately hard, 2 min easy. {M}." },
    { title: "Threshold intervals", work: "3 rounds: 5 min hard but steady, 2 min easy. {M}." },
    { title: "Fours", work: "4 rounds: 4 min at the hardest pace you can hold for all 4, 2 min easy. {M}." },
    { title: "Tens", work: "2 × 10 min steady-hard, 3 min easy between. {M}." },
    { title: "Twos", work: "6 rounds: 2 min hard, 1 min easy. {M}." },
  ],
};

const DELOAD_MET = [
  { title: "Easy flush", work: "10–15 min Zone 2 on the {m}. Nothing hard this week." },
  { title: "Easy walk", work: "15–20 min brisk walk, outside if you can. Nothing hard this week." },
  { title: "Easy spin", work: "12 min easy bike, legs only, nasal breathing. Nothing hard this week." },
  { title: "Easy mix", work: "5 min bike, 5 min incline walk, 5 min bike, all easy. Nothing hard this week." },
];

function fillMachine(o, back) {
  const m = back ? "bike" : "bike or rower";
  return { ...o, work: o.work.replace("{m}", m).replace("{M}", m.charAt(0).toUpperCase() + m.slice(1)) };
}

function pickMet(pool, info, dayId, back) {
  const usable = pool.filter((o) => !(back && o.spine));
  // Days sharing a style this week start at different points, so no two match.
  const sharing = Object.keys(PLAN).filter((d) => PLAN[d][info.type] === PLAN[dayId][info.type]);
  const rank = Math.max(0, sharing.indexOf(dayId));
  const o = usable[(info.w + rank) % usable.length];
  const { back: alt, spine, ...base } = o;
  return fillMachine(back && alt ? { ...base, ...alt } : base, back);
}

// Running progression for the last impact step. weeksIn = weeks since entering the step.
function runWork(weeksIn) {
  const note = "Easy means you could talk. Flat and soft if you can: grass, track, or treadmill. If the knee reaches 3/10 during or after, stop and log it.";
  if (weeksIn < 2) return { title: "Run/walk intervals", work: "6 rounds: 1 min easy jog, 1 min walk.", note };
  if (weeksIn < 4) return { title: "Longer run/walk", work: "5 rounds: 2 min easy jog, 1 min walk.", note };
  if (weeksIn < 6) return { title: "Easy run", work: "20 min continuous easy jog.", note };
  return { title: "Run with strides", work: "15 min easy jog, then 6 × 15 s strides at about 80% effort, walking 45 s between.", note };
}

export function metconFor(dayId, info, stage = 0, weeksIn = 0, { back = false } = {}) {
  if (info.deload) {
    const usable = DELOAD_MET;
    const o = usable[(info.w + DAY_INDEX[dayId]) % usable.length];
    return { kind: "Finisher", ...fillMachine(o, back) };
  }
  if (dayId === "C" && stage >= 1) {
    if (stage === 1) {
      return back
        ? { kind: "Finisher", title: "Incline walk", work: "25 min at 8–10% incline on a treadmill, no pack. Conversational pace.", note: "Back mode is on, so no pack until it's off." }
        : { kind: "Finisher", title: "Incline walk or ruck", work: "25 min at 8–10% incline on a treadmill, or a brisk ruck with 20–30 lb. Conversational pace.", note: "Same pack weight every time so progress is real." };
    }
    if (stage === 2) {
      return { kind: "Finisher", title: back ? "Incline walk, hard finish" : "Incline walk or ruck, hard finish", work: `30 min${back ? ", no pack" : ""}, with the last 5 minutes at the hardest pace you can hold without running.` };
    }
    if (stage === 3) {
      return { kind: "Finisher", title: "Hill intervals, walking", work: "5 rounds: 3 min hard incline walk (10–12%), 2 min easy." };
    }
    return { kind: "Finisher", ...runWork(weeksIn) };
  }
  const styleKey = PLAN[dayId][info.type];
  const style = STYLE[styleKey];
  const o = pickMet(MET_POOL[styleKey], info, dayId, back);
  return { kind: style.kind, note: style.note, ...o };
}

// ─── TESTS ──────────────────────────────────────────────────────────────────
// better: "up" (higher is better), "down" (lower is better), null (just track it)
// skipIf: the injury mode that rules the test out. A skipped test leaves a gap, not a bad number.
export const TESTS = [
  { id: "leg", replacesMain: true, skipIf: "knee", name: "Leg press, 5-rep max", unit: "lb", kind: "num", better: "up", day: "A",
    how: "Same foot position and depth every test. Work up to the heaviest set of 5 clean reps where you could have done at most 1 more. Skip it if the knee is above 3/10." },
  { id: "bench", replacesMain: true, name: "Bench press, 5-rep max", unit: "lb", kind: "num", better: "up", day: "B",
    how: "Use a spotter or safeties. Work up to the heaviest set of 5 clean reps, with at most 1 more in the tank." },
  { id: "row", skipIf: "back", name: "500 m row", unit: "m:ss", kind: "time", better: "down", day: "C",
    how: "Same damper setting every test. Warm up, then one all-out 500 m. Log the time." },
  { id: "tdl", replacesMain: true, skipIf: "back", name: "Trap bar deadlift, 5-rep max", unit: "lb", kind: "num", better: "up", day: "D",
    how: "High handles, brace before every pull, reset fully each rep. Stop the set if your back rounds. Heaviest clean 5 with at most 1 more in the tank." },
  { id: "pull", replacesMain: true, name: "Pull-ups, max reps", unit: "reps", kind: "num", better: "up", day: "E",
    how: "Bodyweight only. Full hang to chin over bar, no kipping. Stop at the first rep that breaks form." },
  { id: "ruck", skipIf: "back", name: "2-mile ruck", unit: "m:ss", kind: "time", better: "down", day: "SAT",
    how: "Saturday. Flat route or treadmill at 0%, walking only. Same pack weight every test." },
  { id: "ruckLb", skipIf: "back", name: "Ruck pack weight", unit: "lb", kind: "num", better: null, day: "SAT",
    how: "Weigh the pack and log it so the ruck times compare fairly." },
  { id: "bw", name: "Body weight", unit: "lb", kind: "num", better: null, day: "ANY",
    how: "Morning, after the bathroom, before food. Average 3 mornings that week if you can." },
  { id: "waist", name: "Waist at navel", unit: "in", kind: "num", better: null, day: "ANY",
    how: "Relaxed, tape level at the navel, same spot every time. Strength up with waist flat is the recomposition you want." },
];

export const testSkipped = (t, settings) => !!(t.skipIf && settings[t.skipIf]);

// ─── TIME FORMAT ────────────────────────────────────────────────────────────
export function parseTime(s) {
  if (s == null) return null;
  const str = String(s).trim();
  if (!str) return null;
  const m = str.match(/^(\d+):([0-5]?\d(?:\.\d+)?)$/);
  if (m) return Number(m[1]) * 60 + Number(m[2]);
  const n = Number(str);
  return Number.isFinite(n) ? n : null;
}
export function fmtTime(sec) {
  const total = Math.round(sec);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

// ─── LOAD SUGGESTION ────────────────────────────────────────────────────────
export function repRange(reps) {
  if (!reps) return null;
  const m = String(reps).match(/(\d+)\s*[–-]\s*(\d+)/);
  if (m) return [Number(m[1]), Number(m[2])];
  const s = String(reps).match(/^(\d+)(\s|$)/);
  if (s) return [Number(s[1]), Number(s[1])];
  return null;
}

export function suggestLoad(last, reps, lower) {
  if (!last || !last.w) return null;
  const range = repRange(reps);
  const w = Number(last.w);
  const r = Number(last.r);
  if (!range || !w) return null;
  const step = lower ? 10 : 5;
  if (r >= range[1]) return `Try ${w + step} lb`;
  if (r && r < range[0]) return `Hold ${w} lb or drop 5–10%`;
  return `Stay at ${w} lb, add a rep`;
}
