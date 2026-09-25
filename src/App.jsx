import { useState, useEffect, useRef, useCallback } from "react";
import {
  BLOCK_SEQ, BLOCK_INFO, DELOAD_COLOR, DAYS, DOW_TO_DAY, weekInfo, prescription,
  exercisesFor, warmupFor, cooldownFor, metconFor, suggestLoad,
} from "./program";

// ─── STORAGE (keys are new, so V2 data is left untouched) ──────────────────
const K = { week: "h365v3_week", log: "h365v3_log", settings: "h365v3_settings" };
function load(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v == null ? fallback : JSON.parse(v);
  } catch { return fallback; }
}
function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage full or blocked */ }
}

const TIER_LABEL = { power: "Power", main: "Main lift", sec: "Secondary", acc: "Accessory", core: "Core" };
const DOW_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.max(0, s % 60)).padStart(2, "0")}`;
const dayKey = (w, d) => `w${w}_${d}`;

function blockColor(info) { return info.deload ? DELOAD_COLOR : BLOCK_INFO[info.type].color; }
function blockLabel(info) {
  return info.deload ? `${BLOCK_INFO[info.type].name} deload` : `${BLOCK_INFO[info.type].name}, week ${info.wib} of 3`;
}

function findLast(log, name, week, dayId) {
  for (let w = week; w >= 1; w--) {
    for (const d of Object.keys(DAYS)) {
      if (w === week && d === dayId) continue;
      const e = log[dayKey(w, d)]?.ex?.[name];
      if (e && e.w) return { ...e, week: w };
    }
  }
  return null;
}

// ─── APP ────────────────────────────────────────────────────────────────────
export default function App() {
  const [week, setWeek] = useState(() => load(K.week, 1));
  const [log, setLog] = useState(() => load(K.log, {}));
  const [settings, setSettings] = useState(() => load(K.settings, { kneeMode: true }));
  const [view, setView] = useState("home");
  const [active, setActive] = useState(null); // { dayId, week }
  const [timer, setTimer] = useState(null);   // { end, total, label }
  const audioRef = useRef(null);

  useEffect(() => save(K.week, week), [week]);
  useEffect(() => save(K.log, log), [log]);
  useEffect(() => save(K.settings, settings), [settings]);
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

  let screen;
  if (view === "day" && active) {
    screen = (
      <DayView
        dayId={active.dayId} week={active.week} log={log} settings={settings}
        updateDay={updateDay} startRest={startRest}
        onBack={() => setView("home")}
      />
    );
  } else if (view === "settings") {
    screen = <Settings settings={settings} setSettings={setSettings} setWeek={setWeek} setLog={setLog} log={log} week={week} onBack={() => setView("home")} />;
  } else if (view === "progress") {
    screen = <Progress log={log} week={week} onBack={() => setView("home")} />;
  } else {
    screen = <Home week={week} setWeek={setWeek} log={log} settings={settings} openDay={openDay} setView={setView} />;
  }

  return (
    <div className="app">
      {screen}
      {timer && <RestTimer timer={timer} audio={audioRef} onDone={() => setTimer(null)} />}
    </div>
  );
}

// ─── HOME ───────────────────────────────────────────────────────────────────
function Home({ week, setWeek, log, settings, openDay, setView }) {
  const info = weekInfo(week);
  const color = blockColor(info);
  const days = [1, 2, 3, 4, 5, 6, 0];

  return (
    <>
      <header className="topbar">
        <div className="brand">
          <span className="brand-name">Hypertrophy 365</span>
          <span className="brand-sub">Athlete edition</span>
        </div>
        <div className="topbar-actions">
          <button className="ghost" onClick={() => setView("progress")}>Progress</button>
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
              <div className="week-of">of 52</div>
            </div>
            <button className="nav-btn" aria-label="Next week" disabled={week === 52} onClick={() => setWeek(Math.min(52, week + 1))}>›</button>
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
          {settings.kneeMode && <p className="knee-flag">Knee mode is on: no jumps, tendon holds added.</p>}
        </section>

        <ul className="day-list">
          {days.map((dow) => {
            const dayId = DOW_TO_DAY[dow];
            if (!dayId) {
              return (
                <li key={dow} className="day-row rest">
                  <span className="dow">{DOW_NAMES[dow]}</span>
                  <span className="day-body">
                    <span className="day-title">Rest</span>
                    <span className="day-sub">{dow === 6 ? "Best slot for Tactical Ops if you're doing one" : "Full rest. Walk, stretch, sleep in."}</span>
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
      </main>
    </>
  );
}

function YearStrip({ week, setWeek, log }) {
  const blocks = BLOCK_SEQ.map((t, i) => i);
  const weekDone = (w) => Object.keys(DAYS).every((d) => log[dayKey(w, d)]?.done);
  return (
    <section className="year" aria-label="52-week plan">
      <div className="year-grid">
        {blocks.map((b) => (
          <div className="year-col" key={b}>
            {[1, 2, 3, 4].map((wib) => {
              const w = b * 4 + wib;
              const info = weekInfo(w);
              const cls = ["cell", w === week ? "current" : "", w < week ? "past" : "", weekDone(w) ? "complete" : ""].join(" ");
              return (
                <button key={w} className={cls} style={{ "--c": blockColor(info) }}
                  aria-label={`Week ${w}, ${blockLabel(info)}`} onClick={() => setWeek(w)} />
              );
            })}
          </div>
        ))}
      </div>
      <div className="legend">
        {["F", "H", "S", "P"].map((t) => (
          <span key={t}><i style={{ background: BLOCK_INFO[t].color }} />{BLOCK_INFO[t].name}</span>
        ))}
        <span><i style={{ background: DELOAD_COLOR }} />Deload</span>
      </div>
    </section>
  );
}

// ─── DAY VIEW ───────────────────────────────────────────────────────────────
function DayView({ dayId, week, log, settings, updateDay, startRest, onBack }) {
  const info = weekInfo(week);
  const key = dayKey(week, dayId);
  const entry = log[key] || { ex: {} };
  const day = DAYS[dayId];
  const color = blockColor(info);
  const poor = !!entry.poor;
  const tops = !!entry.tops;

  const exs = exercisesFor(dayId, info, settings.kneeMode);
  const warm = warmupFor(dayId, info, settings.kneeMode);
  const cool = cooldownFor(dayId);
  const met = metconFor(dayId, info);

  const set = (patch) => updateDay(key, (e) => ({ ...e, ...patch }));
  const setEx = (name, patch) => updateDay(key, (e) => ({ ...e, ex: { ...e.ex, [name]: { ...(e.ex?.[name] || {}), ...patch } } }));

  const group = (tiers) => exs.filter((e) => tiers.includes(e.tier));
  const power = group(["power"]);
  const main = group(["main", "sec"]);
  const acc = group(["acc"]);
  const core = group(["core"]);

  const renderEx = (e) => {
    const rx = prescription(e.tier, info, poor, { ...(e.sets ? { sets: e.sets } : {}), ...(e.reps ? { reps: e.reps } : {}) });
    if (!rx) return null;
    const reps = `${rx.reps}${e.repsSuffix && !e.reps ? e.repsSuffix : ""}`;
    return (
      <ExerciseCard key={e.name} ex={e} rx={{ ...rx, reps }} entry={entry.ex?.[e.name] || {}}
        last={findLast(log, e.name, week, dayId)}
        onChange={(patch) => setEx(e.name, { ...patch, tier: e.tier })}
        onRest={() => startRest(rx.rest, e.name)} />
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
        {poor && !info.deload && (
          <p className="banner">One fewer set on power, main, and secondary work. Cap effort at RPE 7. A short-sleep day is for maintaining, not chasing numbers.</p>
        )}

        <Section title="Warm-up" sub="About 10 minutes">
          <CheckList items={warm} checks={entry.wu || []} onToggle={(i) => {
            const wu = [...(entry.wu || [])]; wu[i] = !wu[i]; set({ wu });
          }} />
        </Section>

        {conditioning("Buy-in")}

        {power.length > 0 && <Section title="Power" sub="First, while you're fresh. Full rest between sets.">{power.map(renderEx)}</Section>}
        {main.length > 0 && <Section title={dayId === "C" ? "Main work" : "Strength work"}>{main.map(renderEx)}</Section>}
        {acc.length > 0 && <Section title={dayId === "C" ? "Work" : "Accessories"}>{acc.map(renderEx)}</Section>}
        {core.length > 0 && <Section title="Core" sub="Anti-rotation and bracing. Spine stays neutral.">{core.map(renderEx)}</Section>}

        {conditioning("Finisher")}

        <Section title="Cool-down" sub="Stretch what you just trained, about 8 minutes">
          <CheckList items={cool} checks={entry.cd || []} onToggle={(i) => {
            const cd = [...(entry.cd || [])]; cd[i] = !cd[i]; set({ cd });
          }} />
        </Section>

        {day.lower && (
          <Section title="Knee check" sub="Pain during or after today's session, 0 is none">
            <div className="scale" role="group" aria-label="Knee pain 0 to 10">
              {Array.from({ length: 11 }, (_, i) => (
                <button key={i} className={`scale-btn ${entry.knee === i ? "on" : ""} ${i >= 4 ? "high" : ""}`}
                  onClick={() => set({ knee: entry.knee === i ? null : i })}>{i}</button>
              ))}
            </div>
            {entry.knee >= 4 && (
              <p className="banner warn">Above 3/10: keep knee mode on and shorten depth on leg press and hack squat. If it stays above 3 for two lower sessions in a row, get a PT or sports medicine doctor to look at it.</p>
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

function ExerciseCard({ ex, rx, entry, last, onChange, onRest }) {
  const sets = entry.sets || [];
  const loggable = ex.tier !== "core";
  const suggestion = ex.tier === "main" || ex.tier === "sec" || ex.tier === "acc" ? suggestLoad(last, rx.reps, ex.lower) : null;
  const toggleSet = (i) => {
    const next = [...sets]; next[i] = !next[i];
    onChange({ sets: next });
    if (next[i] && i < rx.sets - 1) onRest();
  };
  return (
    <article className={`ex tier-${ex.tier}`}>
      <div className="ex-head">
        <h3 className="ex-name">{ex.name}</h3>
        <span className="ex-tier">{TIER_LABEL[ex.tier]}</span>
      </div>
      <div className="chips">
        <span className="chip strong">{rx.sets} × {rx.reps}</span>
        {rx.rpe && <span className="chip">{ex.tier === "power" ? rx.rpe : `RPE ${rx.rpe}`}</span>}
        <span className="chip">Rest {fmt(rx.rest)}</span>
      </div>
      {rx.cue && ex.tier === "main" && <p className="cue">{rx.cue}</p>}
      {ex.kneeSwap && <p className="note swap">Knee-mode swap</p>}
      {ex.note && <p className="note">{ex.note}</p>}

      <div className="sets" role="group" aria-label="Sets completed">
        {Array.from({ length: rx.sets }, (_, i) => (
          <button key={i} className={`set ${sets[i] ? "on" : ""}`} onClick={() => toggleSet(i)} aria-pressed={!!sets[i]}>
            {sets[i] ? "✓" : i + 1}
          </button>
        ))}
        <button className="rest-btn" onClick={onRest}>Rest</button>
      </div>

      {loggable && (
        <div className="inputs">
          <label>
            <span>Weight</span>
            <input inputMode="decimal" placeholder="lb" value={entry.w || ""} onChange={(e) => onChange({ w: e.target.value })} />
          </label>
          <label>
            <span>Top-set reps</span>
            <input inputMode="numeric" placeholder="reps" value={entry.r || ""} onChange={(e) => onChange({ r: e.target.value })} />
          </label>
        </div>
      )}
      {last && (
        <p className="last">
          Last time: {last.w} lb{last.r ? ` × ${last.r}` : ""} (week {last.week}){suggestion ? `. ${suggestion}.` : "."}
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

// ─── PROGRESS ───────────────────────────────────────────────────────────────
function Progress({ log, week, onBack }) {
  const dayIds = Object.keys(DAYS);
  const due = week * dayIds.length;
  let done = 0;
  for (let w = 1; w <= week; w++) {
    for (const d of dayIds) if (log[dayKey(w, d)]?.done) done++;
  }

  const knee = [];
  for (let w = 1; w <= 52; w++) ["A", "D"].forEach((d) => {
    const v = log[dayKey(w, d)]?.knee;
    if (v != null) knee.push({ w, d, v });
  });
  const kneeRecent = knee.slice(-16);

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

        <Section title="Knee pain on lower days" sub="Most recent 16 sessions. Bars above the line are over 3/10.">
          {kneeRecent.length === 0 ? (
            <p className="note">No scores yet. Log one at the bottom of Lower A or Lower B.</p>
          ) : (
            <div className="knee-chart">
              <div className="knee-line" />
              {kneeRecent.map((k, i) => (
                <div key={i} className="knee-col" title={`Week ${k.w}: ${k.v}/10`}>
                  <div className={`knee-bar ${k.v > 3 ? "high" : ""}`} style={{ height: `${Math.max(4, k.v * 10)}%` }} />
                  <span>{k.w}</span>
                </div>
              ))}
            </div>
          )}
        </Section>

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
function Settings({ settings, setSettings, setWeek, setLog, log, week, onBack }) {
  const fileRef = useRef(null);
  const [msg, setMsg] = useState("");

  const exportData = () => {
    const data = JSON.stringify({ app: "h365v3", exported: new Date().toISOString(), week, log, settings }, null, 2);
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
        if (d.settings) setSettings(d.settings);
        setMsg("Backup restored.");
      } catch { setMsg("That file isn't a Hypertrophy 365 Athlete backup. Nothing was changed."); }
    };
    r.readAsText(f);
  };
  const reset = () => {
    if (window.confirm("Erase every logged session and return to week 1? Export a backup first if you want to keep it.")) {
      setLog({}); setWeek(1); setMsg("All data erased.");
    }
  };

  return (
    <>
      <header className="topbar">
        <button className="back" onClick={onBack} aria-label="Back">‹</button>
        <div className="day-head"><div className="day-head-title">Settings</div></div>
      </header>
      <main className="page">
        <Section title="Knee mode">
          <Toggle label="Knee mode" on={settings.kneeMode} onChange={(v) => setSettings({ ...settings, kneeMode: v })} />
          <p className="note">Swaps jumps and bounds for sled pushes and speed hip thrusts, and replaces dynamic leg extensions with heavy isometric holds. Turn it off only after three straight weeks of knee pain at 2/10 or lower.</p>
        </Section>

        <Section title="How the program works">
          <div className="prose">
            <p>The year runs in 4-week blocks: three loading weeks and one deload. After a 4-week Foundation block, it cycles Hypertrophy, Strength, and Power four times. Exercise choices rotate every 12 weeks.</p>
            <p>Each session runs warm-up, then a buy-in if there is one, then power, main lifts, accessories, core, finisher, and cool-down. Power work always comes first because speed disappears with fatigue, so power blocks never have buy-ins.</p>
            <p>Progress the weight when your top set reaches the top of the rep range at the listed RPE. The app suggests the next load from your last logged set: +5 lb for upper-body lifts, +10 lb for legs.</p>
            <p>Deload weeks are not optional. Take them even when you feel good. That's when the previous three weeks turn into strength.</p>
          </div>
        </Section>

        <Section title="Fitting in Tactical Ops">
          <div className="prose">
            <p>Two Tactical Ops sessions a week at most. Saturday is the best slot. Wednesday evening is the second choice.</p>
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
