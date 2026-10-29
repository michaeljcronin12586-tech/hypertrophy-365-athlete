import { useState, useEffect, useRef, useCallback } from "react";
import {
  BLOCK_SEQ, BLOCK_INFO, DELOAD_COLOR, DAYS, DOW_TO_DAY, TEST_WEEKS, TESTS, LADDER, GATE, TOTAL_WEEKS,
  weekInfo, prescription, exercisesFor, warmupFor, cooldownFor, metconFor, suggestLoad,
  gateStatus, kneeScores, backScores, parseTime, fmtTime,
  effectiveStage, jointPrepFor, testSkipped, KNEE_MODE_MAX_STAGE,
} from "./program";

// ─── STORAGE (same keys as V3, so existing logs carry over) ────────────────
const K = { week: "h365v3_week", log: "h365v3_log", settings: "h365v3_settings", tests: "h365v3_tests" };
function load(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v == null ? fallback : JSON.parse(v);
  } catch { return fallback; }
}
function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage full or blocked */ }
}

// Settings: impact step plus the two injury modes.
// Very old saves had a knee-mode switch. Turned on = step 1, turned off = step 3.
const DEFAULT_SETTINGS = { stage: 0, stageSince: 1, back: false, backSince: null, knee: false, kneeSince: null };
function migrateSettings(s) {
  if (!s) return { ...DEFAULT_SETTINGS };
  if (typeof s.stage === "number") {
    return {
      ...DEFAULT_SETTINGS, stage: s.stage, stageSince: s.stageSince || 1,
      back: !!s.back, backSince: s.backSince ?? null, knee: !!s.knee, kneeSince: s.kneeSince ?? null,
    };
  }
  if (s.kneeMode === false) return { ...DEFAULT_SETTINGS, stage: 2 };
  return { ...DEFAULT_SETTINGS };
}

const MODE_TEXT = {
  back: {
    label: "Low back",
    on: "No hinges, lunges, standing loads on the spine, loaded twisting, rower, or ski erg. Back rehab every session.",
    off: "Off. Each session has a short back prehab block.",
  },
  knee: {
    label: "Knees",
    on: "No hack squats or lunges, limited depth, impact held at step 2. Knee rehab every session.",
    off: "Off. Lower days and the Athletic day have a short knee prehab block.",
  },
};
const SWAP_WHY = { back: "back mode", knee: "knee mode", impact: "your current impact step" };

// Last 6 scores since the mode went on, all 2 or lower → suggest trying it off.
function readyToEaseOff(scores, since) {
  const recent = scores.filter((x) => x.w >= (since || 1)).slice(-6);
  return recent.length >= 6 && recent.every((x) => x.v <= 2);
}

const TIER_LABEL = { power: "Power", main: "Main lift", sec: "Secondary", acc: "Accessory", core: "Core" };
const DOW_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.max(0, s % 60)).padStart(2, "0")}`;
const dayKey = (w, d) => `w${w}_${d}`;
const dayLabel = (d) => (DAYS[d] ? DAYS[d].title : d === "SAT" ? "Saturday" : "Any morning");

function blockColor(info) { return info.deload ? DELOAD_COLOR : BLOCK_INFO[info.type].color; }
function blockLabel(info) {
  return info.deload ? `${BLOCK_INFO[info.type].name} deload` : `${BLOCK_INFO[info.type].name}, week ${info.wib} of 3`;
}

function findLast(log, name, week, dayId, key) {
  if (!key) return null;
  for (let w = week; w >= 1; w--) {
    for (const d of Object.keys(DAYS)) {
      if (w === week && d === dayId) continue;
      const e = log[dayKey(w, d)]?.ex?.[name];
      if (e && e[key]) return { ...e, week: w };
    }
  }
  return null;
}

function stageSummary(gate, settings) {
  if (settings.knee) {
    return gate.stage > KNEE_MODE_MAX_STAGE
      ? `Knee mode is holding you at step ${KNEE_MODE_MAX_STAGE + 1}. You've earned step ${gate.stage + 1}.`
      : "Knee mode is on, so moving up is paused";
  }
  if (gate.canAdvance) return "Ready to move up";
  if (gate.shouldStepBack) return "Knee flared. Consider stepping back one step";
  if (gate.stage === LADDER.length - 1) return "Final step. Keep knee scores at 3 or lower";
  return `${Math.min(gate.streak, GATE.sessions)} of ${GATE.sessions} clean sessions, ${Math.min(gate.weeksIn, GATE.minWeeks)} of ${GATE.minWeeks} weeks`;
}

// ─── APP ────────────────────────────────────────────────────────────────────
export default function App() {
  const [week, setWeek] = useState(() => Math.min(TOTAL_WEEKS, Math.max(1, load(K.week, 1))));
  const [log, setLog] = useState(() => load(K.log, {}));
  const [settings, setSettings] = useState(() => migrateSettings(load(K.settings, null)));
  const [tests, setTests] = useState(() => load(K.tests, {}));
  const [view, setView] = useState("home");
  const [active, setActive] = useState(null); // { dayId, week }
  const [timer, setTimer] = useState(null);   // { end, total, label }
  const audioRef = useRef(null);

  useEffect(() => save(K.week, week), [week]);
  useEffect(() => save(K.log, log), [log]);
  useEffect(() => save(K.settings, settings), [settings]);
  useEffect(() => save(K.tests, tests), [tests]);
  useEffect(() => { window.scrollTo(0, 0); }, [view, active]);

  const updateDay = useCallback((key, fn) => {
    setLog((prev) => ({ ...prev, [key]: fn(prev[key] || { ex: {} }) }));
  }, []);

  const startRest = useCallback((seconds, label) => {
    try {
      if (!audioRef.current) audioRef.current = new (window.AudioContext || window.webkitAudioContext)();
      if (audioRef.current.state === "suspended") audioRef.current.resume();
    } catch { /* no audio */ }
    setTimer({ end: Date.now() + seconds * 1000, total: seconds, label });
  }, []);

  const openDay = (dayId, w) => { setActive({ dayId, week: w }); setView("day"); };
  const home = () => setView("home");

  let screen;
  if (view === "day" && active) {
    screen = (
      <DayView
        dayId={active.dayId} week={active.week} log={log} settings={settings}
        updateDay={updateDay} startRest={startRest}
        onBack={home} onOpenTests={() => setView("tests")}
      />
    );
  } else if (view === "settings") {
    screen = <Settings settings={settings} setSettings={setSettings} setWeek={setWeek} setLog={setLog} setTests={setTests} log={log} tests={tests} week={week} onBack={home} setView={setView} />;
  } else if (view === "progress") {
    screen = <Progress log={log} week={week} onBack={home} />;
  } else if (view === "tests") {
    screen = <Tests tests={tests} setTests={setTests} week={week} settings={settings} onBack={home} />;
  } else if (view === "impact") {
    screen = <Impact settings={settings} setSettings={setSettings} log={log} week={week} onBack={home} />;
  } else {
    screen = <Home week={week} setWeek={setWeek} log={log} settings={settings} setSettings={setSettings} openDay={openDay} setView={setView} />;
  }

  return (
    <div className="app">
      {screen}
      {timer && <RestTimer timer={timer} audio={audioRef} onDone={() => setTimer(null)} />}
    </div>
  );
}

// ─── HOME ───────────────────────────────────────────────────────────────────
function Home({ week, setWeek, log, settings, setSettings, openDay, setView }) {
  const info = weekInfo(week);
  const color = blockColor(info);
  const gate = gateStatus(log, settings, week);
  const shown = effectiveStage(settings);
  const days = [1, 2, 3, 4, 5, 6, 0];
  const offDay = TESTS.filter((t) => (t.day === "SAT" || t.day === "ANY") && t.id !== "ruckLb");

  return (
    <>
      <header className="topbar">
        <div className="brand">
          <span className="brand-name">Hypertrophy 365</span>
          <span className="brand-sub">Athlete edition</span>
        </div>
        <div className="topbar-actions">
          <button className="ghost" onClick={() => setView("settings")}>Settings</button>
        </div>
      </header>

      <main className="page">
        <YearStrip week={week} setWeek={setWeek} log={log} />

        <section className="block-card" style={{ "--c": color }}>
          <div className="week-nav">
            <button className="nav-btn" aria-label="Previous week" disabled={week === 1} onClick={() => setWeek(Math.max(1, week - 1))}>‹</button>
            <div className="week-center">
              <div className="week-num">Week {week}</div>
              <div className="week-of">of {TOTAL_WEEKS}</div>
            </div>
            <button className="nav-btn" aria-label="Next week" disabled={week === TOTAL_WEEKS} onClick={() => setWeek(Math.min(TOTAL_WEEKS, week + 1))}>›</button>
          </div>
          <h1 className="block-name">{info.deload ? "Deload week" : BLOCK_INFO[info.type].name}</h1>
          <p className="block-meta">
            {info.deload ? `End of the ${BLOCK_INFO[info.type].name.toLowerCase()} block` : `Week ${info.wib} of 3, then a deload`}
          </p>
          <p className="block-goal">
            {info.deload
              ? "Half the sets, 60–70% of last week's loads, easy conditioning only. This week is where last block's work turns into progress."
              : BLOCK_INFO[info.type].goal}
          </p>
        </section>

        {info.test && (
          <section className="test-card" style={{ "--c": color }}>
            <h2 className="section-title">Test week</h2>
            <p className="section-sub">
              {info.deload
                ? "Each test sits on a training day. Do it after the warm-up, then only the deload work."
                : "Baseline week. Each lift test replaces that day's main lift. Do it after the warm-up, then the rest of the session."}
            </p>
            <ul className="test-days">
              {[...TESTS.filter((t) => DAYS[t.day]), ...offDay].map((t) => {
                const skip = testSkipped(t, settings);
                return (
                  <li key={t.id} className={skip ? "skipped" : ""}>
                    <span>{dayLabel(t.day)}</span>
                    <span>{t.name}{skip ? ` (skip: ${t.skipIf} mode)` : ""}</span>
                  </li>
                );
              })}
            </ul>
            <button className="solid" onClick={() => setView("tests")}>Open test log</button>
          </section>
        )}

        <InjuryModes settings={settings} setSettings={setSettings} log={log} week={week} />

        <button className={`stage-card ${gate.canAdvance ? "ready" : ""}`} style={{ "--c": color }} onClick={() => setView("impact")}>
          <span className="stage-top">
            <span className="stage-name">Impact step {shown + 1} of {LADDER.length}: {LADDER[shown].name}</span>
            <span className="stage-open">Open</span>
          </span>
          <span className="steps" aria-hidden="true">
            {LADDER.map((_, i) => <i key={i} className={`step ${i <= shown ? "on" : ""} ${settings.knee && i > shown && i <= gate.stage ? "held" : ""}`} />)}
          </span>
          <span className="stage-sub">{stageSummary(gate, settings)}</span>
        </button>

        <ul className="day-list">
          {days.map((dow) => {
            const dayId = DOW_TO_DAY[dow];
            if (!dayId) {
              return (
                <li key={dow} className="day-row rest">
                  <span className="dow">{DOW_NAMES[dow]}</span>
                  <span className="day-body">
                    <span className="day-title">Rest</span>
                    <span className="day-sub">
                      {dow === 6
                        ? info.test ? "Test day for the 2-mile ruck. Skip Tactical Ops this week." : "Best slot for Tactical Ops if you're doing one"
                        : "Full rest. Walk, stretch, sleep in."}
                    </span>
                  </span>
                </li>
              );
            }
            const d = DAYS[dayId];
            const done = log[dayKey(week, dayId)]?.done;
            return (
              <li key={dow}>
                <button className={`day-row ${done ? "done" : ""}`} onClick={() => openDay(dayId, week)} style={{ "--c": color }}>
                  <span className="dow">{DOW_NAMES[dow]}</span>
                  <span className="day-body">
                    <span className="day-title">{d.title}</span>
                    <span className="day-sub">{d.sub}</span>
                  </span>
                  <span className="day-status" aria-label={done ? "Completed" : "Not started"}>{done ? "✓" : ""}</span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="tools">
          <button className="solid" onClick={() => setView("tests")}>Test log</button>
          <button className="solid" onClick={() => setView("progress")}>Progress</button>
        </div>
      </main>
    </>
  );
}

function InjuryModes({ settings, setSettings, log, week }) {
  const setMode = (key, on) => setSettings({ ...settings, [key]: on, [`${key}Since`]: on ? week : null });
  const hint = {
    back: settings.back && readyToEaseOff(backScores(log), settings.backSince),
    knee: settings.knee && readyToEaseOff(kneeScores(log), settings.kneeSince),
  };
  return (
    <section className="modes-card" aria-label="Injury modes">
      <h2 className="section-title">Injury modes</h2>
      <p className="section-sub">Turn one on during a flare-up. It swaps exercises and adds rehab work to every session.</p>
      {["back", "knee"].map((key) => (
        <div className={`mode-row ${settings[key] ? "on" : ""}`} key={key}>
          <Toggle label={MODE_TEXT[key].label} on={settings[key]} onChange={(v) => setMode(key, v)} />
          <p className="mode-desc">
            {settings[key] ? MODE_TEXT[key].on : MODE_TEXT[key].off}
            {settings[key] && settings[`${key}Since`] ? ` On since week ${settings[`${key}Since`]}.` : ""}
          </p>
          {hint[key] && (
            <p className="mode-hint">Your last 6 {key} scores are all 2 or lower. You could try turning this off.</p>
          )}
        </div>
      ))}
    </section>
  );
}

function YearStrip({ week, setWeek, log }) {
  const blocks = BLOCK_SEQ.map((t, i) => i);
  const weekDone = (w) => Object.keys(DAYS).every((d) => log[dayKey(w, d)]?.done);
  return (
    <section className="year" aria-label={`${TOTAL_WEEKS}-week plan`}>
      <div className="year-grid">
        {blocks.map((b) => (
          <div className="year-col" key={b}>
            {[1, 2, 3, 4].map((wib) => {
              const w = b * 4 + wib;
              const info = weekInfo(w);
              const cls = ["cell", w === week ? "current" : "", w < week ? "past" : "", weekDone(w) ? "complete" : "", info.test ? "test" : ""].join(" ");
              return (
                <button key={w} className={cls} style={{ "--c": blockColor(info) }}
                  aria-label={`Week ${w}, ${blockLabel(info)}${info.test ? ", test week" : ""}`} onClick={() => setWeek(w)} />
              );
            })}
          </div>
        ))}
      </div>
      <div className="legend">
        {["H", "S", "P"].map((t) => (
          <span key={t}><i style={{ background: BLOCK_INFO[t].color }} />{BLOCK_INFO[t].name}</span>
        ))}
        <span><i style={{ background: DELOAD_COLOR }} />Deload</span>
        <span><i className="dot" />Test week</span>
      </div>
    </section>
  );
}

// ─── DAY VIEW ───────────────────────────────────────────────────────────────
function DayView({ dayId, week, log, settings, updateDay, startRest, onBack, onOpenTests }) {
  const info = weekInfo(week);
  const key = dayKey(week, dayId);
  const entry = log[key] || { ex: {} };
  const day = DAYS[dayId];
  const color = blockColor(info);
  const poor = !!entry.poor;
  const tops = !!entry.tops;
  const modes = { back: !!settings.back, knee: !!settings.knee };
  const stage = effectiveStage(settings);
  const weeksIn = Math.max(0, week - settings.stageSince);
  const kneeDay = day.lower || (dayId === "C" && (stage >= 1 || modes.knee));

  const dayTests = info.test ? TESTS.filter((t) => t.day === dayId) : [];
  const activeTests = dayTests.filter((t) => !testSkipped(t, settings));
  const testReplacesMain = activeTests.some((t) => t.replacesMain);
  const exs = exercisesFor(dayId, info, stage, { dropMain: testReplacesMain, ...modes });
  const warm = warmupFor(dayId, info, stage, modes);
  const joint = jointPrepFor(dayId, modes);
  const cool = cooldownFor(dayId, { ...modes, week });
  const met = metconFor(dayId, info, stage, weeksIn, modes);
  const jp = entry.jp || {};

  const set = (patch) => updateDay(key, (e) => ({ ...e, ...patch }));
  const setEx = (name, patch) => updateDay(key, (e) => ({ ...e, ex: { ...e.ex, [name]: { ...(e.ex?.[name] || {}), ...patch } } }));

  const group = (tiers) => exs.filter((e) => tiers.includes(e.tier));
  const power = group(["power"]);
  const main = group(["main", "sec"]);
  const acc = group(["acc"]);
  const core = group(["core"]);

  const rxFor = (e) => {
    const rx = prescription(e.tier, info, poor, { ...(e.sets ? { sets: e.sets } : {}), ...(e.reps ? { reps: e.reps } : {}) });
    if (!rx) return null;
    return { ...rx, reps: `${rx.reps}${e.repsSuffix && !e.reps ? e.repsSuffix : ""}` };
  };

  const renderEx = (e) => {
    const rx = rxFor(e);
    if (!rx) return null;
    const idx = exs.indexOf(e);
    const partner = e.ssRole === "first" ? exs[idx + 1] : e.ssRole === "second" ? exs[idx - 1] : null;
    const prx = partner ? rxFor(partner) : null;
    // In a superset, rest comes after the second exercise, and uses the longer of the two rests.
    const restSec = e.ssRole === "second" && prx ? Math.max(rx.rest, prx.rest) : rx.rest;
    return (
      <ExerciseCard key={e.name} ex={e} rx={{ ...rx, rest: restSec }} entry={entry.ex?.[e.name] || {}}
        last={findLast(log, e.name, week, dayId, e.metric[0]?.key)}
        partnerLabel={partner ? partner.label : null}
        onChange={(patch) => setEx(e.name, { ...patch, tier: e.tier })}
        onRest={() => startRest(restSec, e.name)} />
    );
  };

  const conditioning = (kind) => {
    if (met.kind !== kind) return null;
    if (tops) {
      return (
        <Section title={kind} tone="muted">
          <p className="note">Skipped. Tactical Ops is your conditioning today.</p>
        </Section>
      );
    }
    return (
      <Section title={kind === "Buy-in" ? "Buy-in" : "Finisher"} sub={kind === "Buy-in" ? "Before the lifting, after the warm-up" : "After the lifting"}>
        <div className="met">
          <div className="met-title">{met.title}</div>
          <p className="met-work">{met.work}</p>
          {met.note && <p className="note">{met.note}</p>}
        </div>
      </Section>
    );
  };

  return (
    <>
      <header className="topbar day-top" style={{ "--c": color }}>
        <button className="back" onClick={onBack} aria-label="Back to week">‹</button>
        <div className="day-head">
          <div className="day-head-title">{day.title}</div>
          <div className="day-head-sub">Week {week}. {blockLabel(info)}</div>
        </div>
      </header>

      <main className="page" style={{ "--c": color }}>
        <div className="toggles">
          <Toggle label="Slept under 6 hours" on={poor} onChange={(v) => set({ poor: v })} />
          <Toggle label="Doing Tactical Ops today" on={tops} onChange={(v) => set({ tops: v })} />
        </div>
        <p className="legend-note">A, B, C: one exercise at a time. A1 and A2: a superset. Do one set of A1, go straight to A2, then rest.</p>
        {poor && !info.deload && (
          <p className="banner">One fewer set on power, main, and secondary work. Cap effort at RPE 7. A short-sleep day is for maintaining, not chasing numbers.</p>
        )}
        {(modes.back || modes.knee) && (
          <p className="banner mode">
            {modes.back && modes.knee ? "Back mode and knee mode are on." : modes.back ? "Back mode is on." : "Knee mode is on."} Swapped exercises are marked, and rehab comes right after the warm-up.
          </p>
        )}
        {poor && activeTests.length > 0 && (
          <p className="banner warn">You slept under 6 hours. Move today's test to a rested day this week. Test numbers only mean something when conditions match.</p>
        )}

        <Section title="Warm-up" sub="About 10 minutes">
          <CheckList items={warm} checks={entry.wu || []} onToggle={(i) => {
            const wu = [...(entry.wu || [])]; wu[i] = !wu[i]; set({ wu });
          }} />
        </Section>

        {joint.map((g) => (
          <Section key={g.id} title={g.title} sub={g.sub} tone={g.mode ? "rehab" : ""}>
            <CheckList items={g.items} checks={g.items.map((it) => !!jp[`${g.id}:${it.n}`])} onToggle={(i) => {
              const k = `${g.id}:${g.items[i].n}`;
              set({ jp: { ...jp, [k]: !jp[k] } });
            }} />
          </Section>
        ))}

        {dayTests.length > 0 && (
          <Section title="Test" sub={activeTests.length ? "After the joint work, before anything else" : undefined}>
            {dayTests.map((t) => testSkipped(t, settings) ? (
              <div className="met skipped" key={t.id}>
                <div className="met-title">{t.name}: skip</div>
                <p className="met-work">{t.skipIf === "back" ? "Back" : "Knee"} mode is on. Leave it blank in the test log. A gap is better than a number that hurts you or doesn't compare.</p>
              </div>
            ) : (
              <div className="met" key={t.id}>
                <div className="met-title">{t.name}</div>
                <p className="met-work">{t.how}</p>
              </div>
            ))}
            {activeTests.length > 0 && (
              <>
                <p className="note">
                  {testReplacesMain ? "This test replaces today's main lift. " : ""}
                  {info.deload
                    ? "Log the result in the test log, then do only the deload work below. Skip anything that feels hard."
                    : "Log the result in the test log, then do the rest of the session below."}
                </p>
                <div className="btn-row"><button className="solid" onClick={onOpenTests}>Open test log</button></div>
              </>
            )}
          </Section>
        )}

        {conditioning("Buy-in")}

        {power.length > 0 && <Section title="Power" sub="First, while you're fresh. Full rest between sets.">{power.map(renderEx)}</Section>}
        {main.length > 0 && <Section title={dayId === "C" ? "Main work" : "Strength work"}>{main.map(renderEx)}</Section>}
        {acc.length > 0 && <Section title={dayId === "C" ? "Work" : "Accessories"}>{acc.map(renderEx)}</Section>}
        {core.length > 0 && <Section title="Core" sub={modes.back ? "Bracing and anti-rotation. Nothing twists under load while back mode is on." : "Bracing, anti-rotation, and rotation. Move from the hips and trunk, not by cranking the low back."}>{core.map(renderEx)}</Section>}

        {conditioning("Finisher")}

        <Section title="Cool-down" sub="Stretch what you just trained, about 8 minutes">
          <CheckList items={cool} checks={entry.cd || []} onToggle={(i) => {
            const cd = [...(entry.cd || [])]; cd[i] = !cd[i]; set({ cd });
          }} />
        </Section>

        {kneeDay && (
          <Section title="Knee check" sub="Pain during or after today's session, 0 is none. This score decides when impact work comes back.">
            <PainScale label="Knee pain" value={entry.knee} onChange={(v) => set({ knee: v })} />
            {entry.knee >= 4 && (
              <p className="banner warn">Above 3/10: {modes.knee ? "keep knee mode on" : "consider turning on knee mode"} and shorten depth on leg press. Two scores of 4 or higher in a row will suggest a step back. If it keeps coming back, get a PT or sports medicine doctor to look at it.</p>
            )}
          </Section>
        )}

        {modes.back && (
          <Section title="Back check" sub="Pain during or after today's session, 0 is none. Six scores of 2 or lower in a row and the home screen suggests trying back mode off.">
            <PainScale label="Back pain" value={entry.back} onChange={(v) => set({ back: v })} />
            {entry.back >= 4 && (
              <p className="banner warn">Above 3/10: keep back mode on and drop the load on anything that hurt. Pain down the leg, numbness, or weakness: stop and get it checked.</p>
            )}
          </Section>
        )}

        <button className={`complete ${entry.done ? "is-done" : ""}`} onClick={() => { set({ done: !entry.done }); if (!entry.done) onBack(); }}>
          {entry.done ? "Completed. Tap to undo" : "Mark session complete"}
        </button>
      </main>
    </>
  );
}

function ExerciseCard({ ex, rx, entry, last, partnerLabel, onChange, onRest }) {
  const sets = entry.sets || [];
  const fields = ex.metric || [];
  const keys = fields.map((f) => f.key);
  const loadAndReps = keys.includes("w") && keys.includes("r");
  const suggestion = loadAndReps && ["main", "sec", "acc"].includes(ex.tier) ? suggestLoad(last, rx.reps, ex.lower) : null;
  const lastText = last
    ? loadAndReps
      ? `${last.w} lb${last.r ? ` × ${last.r}` : ""}`
      : fields.filter((f) => last[f.key]).map((f) => `${last[f.key]} ${f.unit}`).join(", ")
    : "";
  const toggleSet = (i) => {
    const next = [...sets]; next[i] = !next[i];
    onChange({ sets: next });
    // First of a superset: no rest, go straight to the partner.
    if (next[i] && i < rx.sets - 1 && ex.ssRole !== "first") onRest();
  };
  const ssClass = ex.ssRole ? `ss-${ex.ssRole}` : "";
  return (
    <article className={`ex tier-${ex.tier} ${ssClass}`}>
      <div className="ex-head">
        <div className="ex-title">
          <span className="ex-label">{ex.label}</span>
          <h3 className="ex-name">{ex.name}</h3>
        </div>
        <span className="ex-tier">{TIER_LABEL[ex.tier]}</span>
      </div>
      <div className="chips">
        <span className="chip strong">{rx.sets} × {rx.reps}</span>
        {rx.rpe && <span className="chip">{ex.tier === "power" ? rx.rpe : `RPE ${rx.rpe}`}</span>}
        {ex.ssRole === "first"
          ? <span className="chip">Then {partnerLabel}, no rest</span>
          : <span className="chip">Rest {fmt(rx.rest)}{ex.ssRole === "second" ? ` after ${ex.label}` : ""}</span>}
      </div>
      {ex.ssRole === "first" && <p className="cue">Superset with {partnerLabel}. Do one set here, go straight to {partnerLabel}, then rest.</p>}
      {ex.ssRole === "second" && <p className="cue">Superset with {partnerLabel}. Rest after this set, then back to {partnerLabel}.</p>}
      {rx.cue && ex.tier === "main" && <p className="cue">{rx.cue}</p>}
      {ex.swap && <p className="note swap">Swapped for {ex.swapWhy.map((w) => SWAP_WHY[w]).join(" and ")}</p>}
      {ex.note && <p className="note">{ex.note}</p>}

      <div className="sets" role="group" aria-label="Sets completed">
        {Array.from({ length: rx.sets }, (_, i) => (
          <button key={i} className={`set ${sets[i] ? "on" : ""}`} onClick={() => toggleSet(i)} aria-pressed={!!sets[i]}>
            {sets[i] ? "✓" : i + 1}
          </button>
        ))}
        {ex.ssRole !== "first" && <button className="rest-btn" onClick={onRest}>Rest</button>}
      </div>

      {fields.length > 0 && (
        <div className="inputs">
          {fields.map((f) => (
            <label key={f.key}>
              <span>{f.label}</span>
              <input inputMode={f.key === "r" ? "numeric" : "decimal"} placeholder={f.unit}
                value={entry[f.key] || ""} onChange={(e) => onChange({ [f.key]: e.target.value })} />
            </label>
          ))}
        </div>
      )}
      {last && lastText && (
        <p className="last">
          Last time: {lastText} (week {last.week}){suggestion ? `. ${suggestion}.` : "."}
        </p>
      )}
    </article>
  );
}

function Section({ title, sub, children, tone }) {
  return (
    <section className={`section ${tone || ""}`}>
      <h2 className="section-title">{title}</h2>
      {sub && <p className="section-sub">{sub}</p>}
      {children}
    </section>
  );
}

function CheckList({ items, checks, onToggle }) {
  return (
    <ul className="checklist">
      {items.map((it, i) => (
        <li key={it.n}>
          <button className={`check ${checks[i] ? "on" : ""}`} onClick={() => onToggle(i)} aria-pressed={!!checks[i]}>
            <span className="box">{checks[i] ? "✓" : ""}</span>
            <span className="check-text">
              <span className="check-name">{it.n}</span>
              <span className="check-dose">{it.d}</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function Toggle({ label, on, onChange }) {
  return (
    <button className={`toggle ${on ? "on" : ""}`} role="switch" aria-checked={on} onClick={() => onChange(!on)}>
      <span className="track"><span className="thumb" /></span>
      <span>{label}</span>
    </button>
  );
}

function PainScale({ label, value, onChange }) {
  return (
    <div className="scale" role="group" aria-label={`${label} 0 to 10`}>
      {Array.from({ length: 11 }, (_, i) => (
        <button key={i} className={`scale-btn ${value === i ? "on" : ""} ${i >= 4 ? "high" : ""}`}
          aria-pressed={value === i} onClick={() => onChange(value === i ? null : i)}>{i}</button>
      ))}
    </div>
  );
}

// ─── REST TIMER ─────────────────────────────────────────────────────────────
function RestTimer({ timer, audio, onDone }) {
  const [now, setNow] = useState(Date.now());
  const fired = useRef(false);
  useEffect(() => {
    fired.current = false;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [timer]);

  const remaining = Math.ceil((timer.end - now) / 1000);
  useEffect(() => {
    if (remaining <= 0 && !fired.current) {
      fired.current = true;
      try { navigator.vibrate && navigator.vibrate([300, 150, 300]); } catch { /* unsupported */ }
      try {
        const ctx = audio.current;
        if (ctx) {
          [0, 0.3].forEach((t) => {
            const o = ctx.createOscillator(); const g = ctx.createGain();
            o.frequency.value = 880; o.connect(g); g.connect(ctx.destination);
            g.gain.setValueAtTime(0.25, ctx.currentTime + t);
            g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.25);
            o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.26);
          });
        }
      } catch { /* no audio */ }
      setTimeout(onDone, 1500);
    }
  }, [remaining, audio, onDone]);

  const pct = Math.max(0, Math.min(1, remaining / timer.total));
  return (
    <div className={`timer ${remaining <= 0 ? "done" : ""}`} role="timer" aria-live="polite">
      <div className="timer-bar" style={{ transform: `scaleX(${pct})` }} />
      <div className="timer-row">
        <div>
          <div className="timer-time">{remaining > 0 ? fmt(remaining) : "Go"}</div>
          <div className="timer-label">{timer.label}</div>
        </div>
        <button className="ghost" onClick={onDone}>{remaining > 0 ? "Skip" : "Close"}</button>
      </div>
    </div>
  );
}

// ─── IMPACT LADDER ──────────────────────────────────────────────────────────
function Impact({ settings, setSettings, log, week, onBack }) {
  const gate = gateStatus(log, settings, week);
  const { stage } = settings;
  const last = LADDER.length - 1;
  const stepUp = () => setSettings({ ...settings, stage: stage + 1, stageSince: week });
  const stepBack = () => setSettings({ ...settings, stage: stage - 1, stageSince: week });
  const recent = gate.scores.slice(-GATE.sessions);

  return (
    <>
      <header className="topbar">
        <button className="back" onClick={onBack} aria-label="Back">‹</button>
        <div className="day-head"><div className="day-head-title">Impact steps</div></div>
      </header>
      <main className="page">
        <Section title={`Step ${stage + 1} of ${LADDER.length}: ${LADDER[stage].name}`} sub={LADDER[stage].goal}>
          {stage < last ? (
            <ul className="req">
              <li className={gate.streak >= GATE.sessions ? "ok" : ""}>
                Knee score {GATE.maxScore} or lower, {GATE.sessions} sessions in a row: {Math.min(gate.streak, GATE.sessions)} of {GATE.sessions}
              </li>
              <li className={gate.weeksIn >= GATE.minWeeks ? "ok" : ""}>
                Weeks at this step: {Math.min(gate.weeksIn, GATE.minWeeks)} of {GATE.minWeeks}
              </li>
            </ul>
          ) : (
            <p className="note">Final step. Keep knee scores at 3 or lower. Two scores of 4 or higher in a row will suggest a step back.</p>
          )}
          {recent.length > 0 && (
            <p className="note">Recent knee scores since this step began: {recent.map((s) => s.v).join(", ")}</p>
          )}
          {settings.knee && (
            <p className="banner warn">
              Knee mode is on, so moving up is paused{gate.stage > KNEE_MODE_MAX_STAGE ? ` and sessions run at step ${KNEE_MODE_MAX_STAGE + 1}` : ""}. Turn it off on the home screen when the knee settles, and you pick up at the step you earned.
            </p>
          )}
          {gate.shouldStepBack && (
            <p className="banner warn">Your last two knee scores were {GATE.flare} or higher. Stepping back one step for a few weeks is the cheaper move than pushing through.</p>
          )}
          <div className="btn-row">
            {stage < last && (
              <button className="solid" disabled={!gate.canAdvance} onClick={stepUp}>
                Move up to {LADDER[stage + 1].name}
              </button>
            )}
            {stage > 0 && (
              <button className={gate.shouldStepBack ? "solid warn" : "outline"} onClick={stepBack}>
                Step back to {LADDER[stage - 1].name}
              </button>
            )}
          </div>
        </Section>

        <Section title="All five steps">
          <ol className="ladder">
            {LADDER.map((s, i) => (
              <li key={s.name} className={i === stage ? "cur" : i < stage ? "past" : ""}>
                <span className="ladder-mark">{i < stage ? "✓" : i + 1}</span>
                <span className="ladder-body">
                  <span className="ladder-name">{s.name}</span>
                  <span className="ladder-adds">{s.adds}</span>
                </span>
              </li>
            ))}
          </ol>
        </Section>

        <Section title="How the gate works">
          <div className="prose">
            <p>Log a knee score at the bottom of Lower A, Lower B, and (from step 2) the Athletic day. 0 is no pain, 10 is the worst.</p>
            <p>To move up, your last {GATE.sessions} scores since entering the step must all be {GATE.maxScore} or lower, and you need {GATE.minWeeks} weeks at the step. A score of 3 neither helps nor hurts.</p>
            <p>Two scores of {GATE.flare} or higher in a row suggests stepping back one step. The app never moves you up on its own.</p>
          </div>
        </Section>
      </main>
    </>
  );
}

// ─── TESTS ──────────────────────────────────────────────────────────────────
function testDelta(t, prev, curr) {
  let d;
  if (t.kind === "time") {
    const a = parseTime(prev), b = parseTime(curr);
    if (a == null || b == null) return null;
    d = b - a;
    if (d === 0) return { text: "no change", tone: "" };
    const good = t.better === "down" ? d < 0 : t.better === "up" ? d > 0 : null;
    return { text: `${d < 0 ? "−" : "+"}${fmtTime(Math.abs(d))}`, tone: good == null ? "" : good ? "good" : "bad" };
  }
  const a = Number(prev), b = Number(curr);
  if (!Number.isFinite(a) || !Number.isFinite(b) || prev === "" || curr === "") return null;
  d = Math.round((b - a) * 10) / 10;
  if (d === 0) return { text: "no change", tone: "" };
  const good = t.better === "up" ? d > 0 : t.better === "down" ? d < 0 : null;
  return { text: `${d > 0 ? "+" : "−"}${Math.abs(d)}`, tone: good == null ? "" : good ? "good" : "bad" };
}

function Tests({ tests, setTests, week, settings, onBack }) {
  const initial = TEST_WEEKS.includes(week) ? week : [...TEST_WEEKS].reverse().find((w) => w <= week) || TEST_WEEKS[0];
  const [tw, setTw] = useState(initial);
  const cur = tests[tw] || {};
  const setVal = (id, v) => setTests((prev) => ({ ...prev, [tw]: { ...(prev[tw] || {}), [id]: v } }));

  return (
    <>
      <header className="topbar">
        <button className="back" onClick={onBack} aria-label="Back">‹</button>
        <div className="day-head">
          <div className="day-head-title">Test log</div>
          <div className="day-head-sub">Baseline in week 1, then every 12 weeks</div>
        </div>
      </header>
      <main className="page">
        <div className="wk-chips" role="group" aria-label="Test week">
          {TEST_WEEKS.map((w) => (
            <button key={w} className={`wk-chip ${w === tw ? "on" : ""}`} onClick={() => setTw(w)}>Week {w}</button>
          ))}
        </div>

        <Section title={`Week ${tw} results`} sub="Leave a box empty if you skipped that test.">
          {TESTS.map((t) => (
            <div className="test-field" key={t.id}>
              <label htmlFor={`t-${t.id}`}>
                <span className="test-name">{t.name}</span>
                <span className="test-when">{testSkipped(t, settings) ? `Skip: ${t.skipIf} mode on` : dayLabel(t.day)}</span>
              </label>
              <input
                id={`t-${t.id}`}
                inputMode={t.kind === "time" ? "text" : "decimal"}
                placeholder={t.unit}
                value={cur[t.id] || ""}
                onChange={(e) => setVal(t.id, e.target.value)}
              />
              <p className="note">{t.how}</p>
            </div>
          ))}
        </Section>

        <Section title="History" sub="Change is measured against the previous test you logged.">
          {TESTS.map((t) => {
            const rows = TEST_WEEKS.filter((w) => tests[w]?.[t.id]).map((w) => ({ w, v: tests[w][t.id] }));
            return (
              <div className="hist" key={t.id}>
                <div className="hist-name">{t.name}</div>
                {rows.length === 0 ? (
                  <p className="note">No results yet.</p>
                ) : (
                  <ul>
                    {rows.map((r, i) => {
                      const dl = i > 0 ? testDelta(t, rows[i - 1].v, r.v) : null;
                      return (
                        <li key={r.w}>
                          <span>Week {r.w}</span>
                          <span>{r.v} {t.unit === "m:ss" ? "" : t.unit}{dl && <em className={dl.tone}> {dl.text}</em>}</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </Section>
      </main>
    </>
  );
}

// ─── PROGRESS ───────────────────────────────────────────────────────────────
function ScoreChart({ scores }) {
  return (
    <div className="knee-chart">
      <div className="knee-line" />
      {scores.map((k, i) => (
        <div key={i} className="knee-col" title={`Week ${k.w}: ${k.v}/10`}>
          <div className={`knee-bar ${k.v > 3 ? "high" : ""}`} style={{ height: `${Math.max(4, k.v * 10)}%` }} />
          <span>{k.w}</span>
        </div>
      ))}
    </div>
  );
}

function Progress({ log, week, onBack }) {
  const dayIds = Object.keys(DAYS);
  const due = week * dayIds.length;
  let done = 0;
  for (let w = 1; w <= week; w++) {
    for (const d of dayIds) if (log[dayKey(w, d)]?.done) done++;
  }

  const kneeRecent = kneeScores(log).slice(-16);
  const backRecent = backScores(log).slice(-16);

  const bests = {};
  Object.entries(log).forEach(([k, e]) => {
    const w = Number(k.split("_")[0].slice(1));
    Object.entries(e.ex || {}).forEach(([name, x]) => {
      if (x.tier !== "main" || !Number(x.w)) return;
      const cur = bests[name];
      if (!cur || Number(x.w) > cur.w) bests[name] = { w: Number(x.w), r: x.r, week: w };
    });
  });

  const poorDays = Object.values(log).filter((e) => e.poor).length;

  return (
    <>
      <header className="topbar">
        <button className="back" onClick={onBack} aria-label="Back">‹</button>
        <div className="day-head"><div className="day-head-title">Progress</div></div>
      </header>
      <main className="page">
        <Section title="Consistency">
          <p className="stat"><strong>{done}</strong> of {due} sessions completed through week {week}</p>
          <p className="stat"><strong>{poorDays}</strong> sessions logged on under 6 hours of sleep</p>
        </Section>

        <Section title="Knee scores" sub="Most recent 16 sessions. Bars above the line are over 3/10.">
          {kneeRecent.length === 0
            ? <p className="note">No scores yet. Log one at the bottom of Lower A or Lower B.</p>
            : <ScoreChart scores={kneeRecent} />}
        </Section>

        {backRecent.length > 0 && (
          <Section title="Back scores" sub="Logged while back mode is on. Most recent 16 sessions.">
            <ScoreChart scores={backRecent} />
          </Section>
        )}

        <Section title="Best main-lift weights">
          {Object.keys(bests).length === 0 ? (
            <p className="note">Log weight on a main lift and it shows up here.</p>
          ) : (
            <ul className="bests">
              {Object.entries(bests).map(([n, b]) => (
                <li key={n}><span>{n}</span><span>{b.w} lb{b.r ? ` × ${b.r}` : ""} <em>wk {b.week}</em></span></li>
              ))}
            </ul>
          )}
        </Section>
      </main>
    </>
  );
}

// ─── SETTINGS ───────────────────────────────────────────────────────────────
function Settings({ settings, setSettings, setWeek, setLog, setTests, log, tests, week, onBack, setView }) {
  const fileRef = useRef(null);
  const [msg, setMsg] = useState("");

  const exportData = () => {
    const data = JSON.stringify({ app: "h365v3", exported: new Date().toISOString(), week, log, settings, tests }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `h365-athlete-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setMsg("Backup file created. Save it to Files or iCloud.");
  };
  const importData = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const d = JSON.parse(r.result);
        if (d.app !== "h365v3") throw new Error("wrong app");
        if (d.log) setLog(d.log);
        if (d.week) setWeek(d.week);
        if (d.settings) setSettings(migrateSettings(d.settings));
        if (d.tests) setTests(d.tests);
        setMsg("Backup restored.");
      } catch { setMsg("That file isn't a Hypertrophy 365 Athlete backup. Nothing was changed."); }
    };
    r.readAsText(f);
  };
  const reset = () => {
    if (window.confirm("Erase every logged session and test, and return to week 1? Export a backup first if you want to keep it.")) {
      setLog({}); setTests({}); setSettings({ ...DEFAULT_SETTINGS }); setWeek(1); setMsg("All data erased.");
    }
  };

  return (
    <>
      <header className="topbar">
        <button className="back" onClick={onBack} aria-label="Back">‹</button>
        <div className="day-head"><div className="day-head-title">Settings</div></div>
      </header>
      <main className="page">
        <Section title="Impact step">
          <p className="stat"><strong>{settings.stage + 1}</strong> of {LADDER.length}: {LADDER[settings.stage].name}</p>
          <p className="note">Jumps, landings, and running come back in five steps, and your knee scores decide when. The gate and the step-back rule are explained on the next screen.</p>
          <div className="btn-row"><button className="solid" onClick={() => setView("impact")}>Open impact steps</button></div>
        </Section>

        <Section title="Injury modes">
          <InjuryModes settings={settings} setSettings={setSettings} log={log} week={week} />
          <div className="prose">
            <p>Back mode takes load off the spine. Hinges become hip thrusts, lunges become single-leg leg press, rows and carries come off the floor, twisting becomes anti-twisting, and rowers and ski ergs become the bike. A daily back rehab block (curl-ups, side planks, bird dogs, cat-camel) replaces the prehab. The trap bar deadlift, row, and ruck tests are skipped.</p>
            <p>Knee mode takes deep bending and lunges out, limits leg press depth, holds impact at step 2, and adds knee rehab (Spanish squat isometrics, band knee extensions, slow step-downs). The leg press test is skipped.</p>
            <p>Both modes can be on together. Every swap is marked on its card. Turn a mode off once six scores in a row are 2 or lower. The home screen will tell you.</p>
            <p>These modes manage a flare-up. They don't diagnose one. Pain down the leg, numbness, weakness, or anything that keeps getting worse needs a doctor or PT.</p>
          </div>
        </Section>

        <Section title="How the program works">
          <div className="prose">
            <p>The program runs 48 weeks in 4-week blocks: three loading weeks and one deload. It cycles Hypertrophy, Strength, and Power four times, starting at week 1. Most lifts have four versions, one per 12-week cycle, so you can track progress on them.</p>
            <p>Warm-ups, conditioning, and cool-downs change every week. Each day keeps its job (a lower-day warm-up still preps hips and ankles, a Power-block finisher is still short sprints), but the specific drills, stretches, and workouts rotate. Going back to an earlier week shows what you did that week.</p>
            <p>Each session runs warm-up, then a buy-in if there is one, then power, main lifts, accessories, core, finisher, and cool-down. Power work always comes first because speed disappears with fatigue, so power blocks never have buy-ins.</p>
            <p>No barbell back squats or conventional barbell deadlifts. Barbell RDLs, trap bar deadlifts, overhead lunges, and rotational work are in.</p>
            <p>Progress the weight when your top set reaches the top of the rep range at the listed RPE. The app suggests the next load from your last logged set: +5 lb for upper-body lifts, +10 lb for legs.</p>
            <p>Deload weeks are not optional. Take them even when you feel good. That's when the previous three weeks turn into strength.</p>
          </div>
        </Section>

        <Section title="Tests">
          <div className="prose">
            <p>Week 1 is your baseline. After that, tests fall in weeks 12, 24, 36, and 48, the deloads at the end of each Power block, when fatigue is lowest. Each lift test replaces that day's main lift.</p>
            <p>Strength tests are 5-rep maxes, not true one-rep maxes. Stop a set when form breaks, and skip any lower-body test when the knee is above 3/10.</p>
          </div>
        </Section>

        <Section title="Fitting in Tactical Ops">
          <div className="prose">
            <p>Two Tactical Ops sessions a week at most. Saturday is the best slot. Wednesday evening is the second choice. In test weeks, Saturday is the ruck test, so skip Tactical Ops that week.</p>
            <p>Avoid the day before Lower A or Lower B during Strength and Power blocks. On deload weeks, skip it or keep it easy.</p>
            <p>On any day you do one, switch on "Doing Tactical Ops today" so the in-app conditioning drops off.</p>
          </div>
        </Section>

        <Section title="Backup">
          <div className="btn-row">
            <button className="solid" onClick={exportData}>Export backup</button>
            <button className="solid" onClick={() => fileRef.current?.click()}>Restore backup</button>
            <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={importData} />
          </div>
          <button className="danger" onClick={reset}>Erase all data</button>
          {msg && <p className="note">{msg}</p>}
        </Section>
      </main>
    </>
  );
}
