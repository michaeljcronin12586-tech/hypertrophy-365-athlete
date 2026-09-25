// ─── HYPERTROPHY 365 · ATHLETE (V3) ─────────────────────────────────────────
// 52 weeks = 13 four-week blocks. Every block: 3 loading weeks + 1 deload.
// Block order: Foundation → (Hypertrophy → Strength → Power) × 4
// Low-back safe: no barbell back/front squat, deadlifts, good mornings,
// standing barbell OHP, Olympic lifts, or ballistic spinal flexion.
// Knee mode (default on): no jumps/landings; tendon isometrics added.

export const BLOCK_SEQ = ["F", "H", "S", "P", "H", "S", "P", "H", "S", "P", "H", "S", "P"];

export const BLOCK_INFO = {
  F: { name: "Foundation", color: "#8FA3B8", goal: "Rebuild joint and tendon tolerance after the old program. Moderate loads, slow lowering, no jumping." },
  H: { name: "Hypertrophy", color: "#D4A64A", goal: "Build muscle. Moderate loads, more sets, reps taken close to failure." },
  S: { name: "Strength", color: "#C9483E", goal: "Heavier compound lifts for 4–6 reps with long rest. Accessories stay moderate." },
  P: { name: "Power", color: "#4FA3C7", goal: "Move fast. Explosive work first while fresh, then moderate loads lifted with maximum speed." },
};
export const DELOAD_COLOR = "#7FA58A";

export function weekInfo(w) {
  const blockIdx = Math.floor((w - 1) / 4);
  const type = BLOCK_SEQ[blockIdx];
  const wib = ((w - 1) % 4) + 1; // week in block 1–4
  const deload = wib === 4;
  const cycle = blockIdx === 0 ? 0 : Math.floor((blockIdx - 1) / 3); // 0–3
  return { w, blockIdx, type, wib, deload, cycle, variant: cycle % 2 };
}

// ─── PRESCRIPTIONS ──────────────────────────────────────────────────────────
const RX = {
  F: {
    power: null,
    main: { sets: 3, reps: "10–12", rpe: ["6", "6.5", "7"], rest: 120, cue: "3-sec lowering on every rep" },
    sec: { sets: 3, reps: "10–12", rpe: ["6", "7", "7"], rest: 90 },
    acc: { sets: 2, reps: "12–15", rpe: ["7", "7", "8"], rest: 60 },
  },
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
  C: { title: "Athletic", sub: "Arms, delts, carries, knee health, aerobic base", dow: 3, lower: false },
  D: { title: "Lower B", sub: "Hip-dominant legs and lower-body power", dow: 4, lower: true },
  E: { title: "Upper B", sub: "Vertical push and pull, upper-body power", dow: 5, lower: false },
};
export const DOW_TO_DAY = { 1: "A", 2: "B", 3: "C", 4: "D", 5: "E" };

// Exercise fields:
//  n: [variant A, variant B] (alternates by 12-week cycle) or a string
//  tier: power | main | sec | acc | core
//  knee: replacement when knee mode is on; kneeReps: reps for that replacement
//  lower: true → larger load jumps; reps/sets: fixed overrides; note: coaching cue
const EX = {
  A: [
    { tier: "power", n: ["Box jump (step down)", "Seated box jump"], knee: "Sled push sprint, 15 yd", note: "Full reset between reps. Land softly and step down — never jump down.", kneeNote: "Drive as fast as possible for 15 yd, walk back, repeat. No landing, so the knees only see pushing." },
    { tier: "main", n: ["Hack squat", "Leg press"], lower: true, note: "Depth you can own without knee pain above 3/10. Knees track over toes." },
    { tier: "sec", n: ["Reverse lunge (DBs)", "Step-up (DBs, knee-height box)"], lower: true, repsSuffix: " /leg", note: "Drive through the whole foot. Reverse lunges are easier on the knees than forward lunges." },
    { tier: "acc", n: ["Seated leg curl", "Lying leg curl"], note: "Pause one second at full contraction." },
    { tier: "acc", n: ["Leg extension (3-sec lowering)", "Leg extension (1¼ reps)"], knee: "Leg extension isometric hold", kneeReps: "45 s hold, heavy", kneeSets: 5, note: "Slow and controlled. Stop short of full lockout if the knee complains.", kneeNote: "Hold at about 60° of knee bend, heavy enough to feel it by 30 s. Isometrics calm an irritated patellar tendon." },
    { tier: "acc", n: ["Seated calf raise", "Standing calf raise"], note: "Two-second stretch at the bottom." },
    { tier: "core", n: "Pallof press", reps: "10 /side" },
    { tier: "core", n: "Dead bug", reps: "8 /side" },
  ],
  B: [
    { tier: "power", n: ["Med ball chest pass (to wall)", "Plyo push-up (hands on bench)"], reps: "4", note: "Throw or push as hard as possible. Full reset each rep." },
    { tier: "main", n: ["Barbell bench press", "DB bench press"], note: "Feet planted, shoulder blades pinned. Skip the big arch if your back complains." },
    { tier: "sec", n: ["Chest-supported T-bar row", "Seal row"], note: "Chest stays on the pad — no low-back load." },
    { tier: "sec", n: ["Incline DB press", "Weighted dip"], note: "Dips: stop at upper arm parallel to the floor." },
    { tier: "acc", n: ["Face pull", "Reverse pec deck"], note: "Shoulder health — don't skip these." },
    { tier: "acc", n: ["Rope triceps pushdown", "Overhead cable triceps extension"] },
    { tier: "core", n: "Half-kneeling cable chop", reps: "10 /side" },
  ],
  C: [
    { tier: "power", n: ["Battle rope power waves", "Battle rope alternating slams"], reps: "10 s", note: "All-out for 10 seconds, rest 50." },
    { tier: "acc", n: ["Machine lateral raise", "Cable Y-raise"], sets: 3, reps: "12–15" },
    { tier: "acc", n: ["Preacher curl", "Hammer curl"], sets: 3, reps: "10–12" },
    { tier: "acc", n: ["EZ-bar skull crusher", "Dip machine"], sets: 3, reps: "10–12" },
    { tier: "acc", n: ["Rear delt cable fly", "Band pull-apart"], sets: 3, reps: "15–20" },
    { tier: "acc", n: "Backward sled drag", sets: 4, reps: "30 yd", note: "Knee health: all quad, no lowering phase, very knee-friendly. Moderate weight." },
    { tier: "acc", n: ["Farmer's carry", "Trap bar carry (lift from rack pins)"], sets: 4, reps: "40 yd", note: "Heavy. Tall posture, braced trunk. Job-specific grip and trunk work." },
    { tier: "acc", n: ["Wrist roller", "Plate pinch hold"], sets: 3, reps: "Up and down" },
    { tier: "core", n: ["Hanging knee raise", "Side plank"], reps: "10–12 / 30 s side" },
  ],
  D: [
    { tier: "power", n: ["Broad jump (stick the landing)", "Lateral bound (stick)"], knee: "Speed hip thrust (band + light bar)", note: "Stick every landing for a full second, then reset.", kneeNote: "Fast up, one-second squeeze, controlled down." },
    { tier: "main", n: ["Barbell hip thrust", "Smith machine hip thrust"], lower: true, note: "Chin tucked, ribs down. Lockout comes from glutes, not low back." },
    { tier: "sec", n: ["DB single-leg RDL (light, controlled)", "Cable pull-through"], note: "Stop the moment your back wants to round. This is a hamstring stretch, not a lift." },
    { tier: "sec", n: ["Leg press (feet high and wide)", "Goblet box squat"], lower: true, note: "Feet high shifts work to hips and off the knees." },
    { tier: "acc", n: ["45° back extension (bodyweight, glute bias)", "Nordic curl (eccentric only, assisted)"], note: "Pain-free range only." },
    { tier: "acc", n: ["Hip adduction machine", "Copenhagen plank (short lever)"] },
    { tier: "core", n: "Suitcase carry", reps: "30 yd /side" },
    { tier: "core", n: "Side plank", reps: "30 s /side" },
  ],
  E: [
    { tier: "power", n: ["Half-kneeling rotational med ball throw", "Seated overhead med ball throw"], reps: "4 /side", note: "Kneeling limits low-back rotation. Throw hard into a wall." },
    { tier: "main", n: ["Weighted pull-up", "Weighted chin-up"], note: "Full hang at the bottom, chest to bar at the top. Bodyweight only if the reps won't come." },
    { tier: "sec", n: ["Seated DB shoulder press", "Half-kneeling landmine press"], note: "Back supported or kneeling — no standing barbell press." },
    { tier: "sec", n: ["Neutral-grip lat pulldown", "Single-arm lat pulldown"] },
    { tier: "acc", n: ["Cable lateral raise", "Lean-away DB lateral raise"] },
    { tier: "acc", n: ["Incline DB curl", "EZ-bar curl"] },
    { tier: "core", n: "Bird dog with 3-sec pause", reps: "6 /side" },
  ],
};

export function exercisesFor(dayId, info, kneeMode) {
  return EX[dayId].map((e) => {
    let name = Array.isArray(e.n) ? e.n[info.variant] : e.n;
    let reps = e.reps;
    let sets = e.sets;
    let kneeSwap = false;
    if (kneeMode && e.knee) {
      name = e.knee;
      kneeSwap = true;
      if (e.kneeReps) reps = e.kneeReps;
      if (e.kneeSets) sets = e.kneeSets;
    }
    return { ...e, name, reps, sets, kneeSwap, note: kneeSwap ? e.kneeNote : e.note };
  }).filter((e) => !(e.tier === "power" && info.type === "F"));
}

// ─── WARM-UPS ───────────────────────────────────────────────────────────────
const WARM = {
  A: [
    ["Easy bike", "5 min, build to a light sweat"],
    ["90/90 hip switches", "8 /side"],
    ["Ankle rocks, knee over toe", "10 /side"],
    ["Spanish squat or wall-sit hold", "2 × 30 s — patellar tendon prep"],
    ["Band terminal knee extension", "15 /side"],
    ["Glute bridge", "12"],
  ],
  B: [
    ["Rower or ski erg", "5 min easy"],
    ["Band pull-apart", "20"],
    ["Scap push-up", "12"],
    ["Thoracic open book", "8 /side"],
    ["Band external rotation", "15 /side"],
    ["Band dislocate", "10"],
  ],
  C: [
    ["Easy bike or row", "5 min"],
    ["Arm circles into band pull-aparts", "20 each"],
    ["Wrist circles and forearm rocks", "30 s"],
    ["Lateral band walk", "15 /side"],
    ["Bird dog", "6 /side"],
  ],
  D: [
    ["Easy bike", "5 min"],
    ["Cat-cow, pain-free range", "8"],
    ["Dead bug", "6 /side"],
    ["Supported hip airplane", "5 /side"],
    ["Hamstring sweep", "8 /side"],
    ["Glute bridge with 3-sec hold", "10"],
  ],
  E: [
    ["Rower or ski erg", "5 min easy"],
    ["Dead hang", "2 × 20 s"],
    ["Wall slide", "10"],
    ["Prone Y-T-W", "6 each"],
    ["Band lat stretch", "30 s /side"],
    ["Band overhead pull-apart", "15"],
  ],
};

export function warmupFor(dayId, info, kneeMode) {
  const list = WARM[dayId].map(([n, d]) => ({ n, d }));
  if (info.type === "P" && !info.deload) {
    if (DAYS[dayId].lower) {
      list.push(kneeMode ? { n: "Sled march", d: "2 × 15 yd, primes the legs without landings" } : { n: "Low pogo hops", d: "2 × 10, quiet feet" });
    } else if (dayId !== "C") {
      list.push({ n: "Primer throws", d: "2 × 3 med ball throws at 70% effort" });
    }
  }
  if (dayId !== "C") list.push({ n: "Ramp-up sets", d: "3 lighter sets of the first main lift: ~50%, 70%, 85% of working weight" });
  return list;
}

// ─── COOL-DOWNS ─────────────────────────────────────────────────────────────
const COOL = {
  A: [
    ["Half-kneeling hip flexor stretch", "2 × 40 s /side"],
    ["Side-lying quad stretch", "2 × 40 s /side — easier on the knee than a couch stretch"],
    ["Wall calf stretch", "45 s /side"],
    ["Supine figure-4", "45 s /side"],
    ["Legs up the wall, slow nasal breathing", "2 min"],
  ],
  B: [
    ["Doorway pec stretch", "2 × 40 s /side"],
    ["Cross-body shoulder stretch", "40 s /side"],
    ["Overhead triceps stretch", "30 s /side"],
    ["Thread the needle", "6 /side"],
    ["Box breathing", "2 min"],
  ],
  C: [
    ["Forearm flexor and extensor stretch", "30 s each"],
    ["Doorway pec stretch", "40 s /side"],
    ["Kneeling lat stretch on bench", "40 s"],
    ["Side-lying quad stretch", "40 s /side"],
    ["90/90 breathing", "2 min"],
  ],
  D: [
    ["Supine hamstring strap stretch", "2 × 40 s /side"],
    ["Supine figure-4", "45 s /side"],
    ["Adductor rock-back", "10 /side"],
    ["Half-kneeling hip flexor stretch", "40 s /side"],
    ["Child's pose", "60 s"],
  ],
  E: [
    ["Kneeling lat stretch on bench", "2 × 40 s"],
    ["Biceps wall stretch", "30 s /side"],
    ["Upper trap stretch", "30 s /side"],
    ["Sleeper stretch", "30 s /side"],
    ["Child's pose with side reach", "30 s /side"],
  ],
};
export const cooldownFor = (dayId) => COOL[dayId].map(([n, d]) => ({ n, d }));

// ─── CONDITIONING (buy-in = before lifting, finisher = after) ───────────────
// Power blocks never use buy-ins: explosive work needs you fresh.
// Nothing here involves jumping, so knee mode doesn't change it.
const MET = {
  A: {
    F: { kind: "Finisher", title: "Zone 2 flush", work: "12 min ski erg or rower at a pace where you could hold a conversation" },
    H: { kind: "Buy-in", title: "6-minute EMOM", work: "Odd minutes: 12/10 cal ski erg. Even minutes: 20 s battle rope waves.", note: "Hard but sustainable. It's a primer, not the workout." },
    S: { kind: "Finisher", title: "Sled push", work: "6 × 20 yd, heavy. Walk back is your rest." },
    P: { kind: "Finisher", title: "Alactic sprints", work: "8 × 8 s all-out assault bike, 52 s easy spin" },
  },
  B: {
    F: { kind: "Finisher", title: "Zone 2 flush", work: "12 min bike, conversational pace" },
    H: { kind: "Buy-in", title: "8-minute AMRAP", work: "10 cal bike, 20 yd sled push, 10 band pull-aparts" },
    S: { kind: "Finisher", title: "Bike intervals", work: "10 × 10 s max effort, 50 s easy" },
    P: { kind: "Finisher", title: "Sled sprints", work: "5 × 15 yd max speed, full walk-back rest" },
  },
  C: {
    F: { kind: "Finisher", title: "Aerobic base", work: "20 min Zone 2 — bike, rower, or light ruck walk" },
    H: { kind: "Finisher", title: "Aerobic base", work: "20 min Zone 2 — bike, rower, or light ruck walk" },
    S: { kind: "Finisher", title: "Tempo intervals", work: "5 rounds: 3 min moderately hard, 2 min easy (bike or rower)" },
    P: { kind: "Finisher", title: "Aerobic base", work: "20 min Zone 2 — bike, rower, or light ruck walk" },
  },
  D: {
    F: { kind: "Finisher", title: "Zone 2 flush", work: "12 min bike, conversational pace" },
    H: { kind: "Finisher", title: "Carry and ski", work: "4 rounds: 40 yd farmer's carry, 12 cal ski erg, rest 60 s" },
    S: { kind: "Finisher", title: "Drag and ropes", work: "5 rounds: 30 yd backward sled drag, 20 s rope waves, rest 60 s" },
    P: { kind: "Finisher", title: "Row sprints", work: "6 × 15 s hard, 45 s easy" },
  },
  E: {
    F: { kind: "Finisher", title: "Zone 2 flush", work: "12 min rower, conversational pace" },
    H: { kind: "Buy-in", title: "10-minute EMOM", work: "Odd minutes: 15 cal bike. Even minutes: 40 yd suitcase carry, switch hands each round." },
    S: { kind: "Finisher", title: "Ski intervals", work: "6 × 30 s hard, 60 s easy" },
    P: { kind: "Finisher", title: "Bike sprints", work: "6 × 12 s all-out, 48 s easy" },
  },
};

export function metconFor(dayId, info) {
  if (info.deload) return { kind: "Finisher", title: "Easy flush", work: "10–15 min Zone 2 on any machine. Nothing hard this week." };
  return MET[dayId][info.type];
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
