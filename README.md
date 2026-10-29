# Hypertrophy 365 · Athlete edition (V3.4)

48-week athlete program: Hypertrophy → Strength → Power blocks × 4, each 3 loading weeks
+ 1 deload. No Foundation block. Warm-ups, cool-downs, buy-ins and finishers built in.

## What changed in 3.4
- **Warm-ups, conditioning, and cool-downs change every week.** Lifts don't.
  - Warm-ups take one drill per body area (for example hips, ankles, adductors, glutes, trunk on Lower A),
    rotating weekly. About 30–38 different drills per day across the year.
  - Cool-downs take one stretch per area plus a breathing drill, rotating weekly.
  - Conditioning keeps its style per day and block (Power = short sprints, Strength = intervals or heavy
    sled/carry work, Hypertrophy = primers), but the workout changes weekly. Days sharing a style
    never get the same workout in the same week. Deload weeks rotate four easy options.
  - Back and knee modes still filter everything (no rower, ski erg, swings, slams, or floor sandbags in
    back mode; no deep knee bending in knee mode), and warm-ups skip drills the rehab block already covers.
  - Selection is fixed by week, so revisiting an old week shows what you did.

## What changed in 3.3
- **Injury modes (home screen).** Low back and Knees toggles.
  - Back mode: hinges become heavy hip thrusts, lunges become single-leg leg press, hack squats
    become leg press, floor carries start from boxes, twisting becomes anti-twisting, rower and
    ski erg become the bike. Daily back rehab block (curl-ups, side planks, bird dogs, cat-camel).
    Back pain check each session. Trap bar, row, and ruck tests are skipped.
  - Knee mode: no hack squats or lunges, limited leg-press depth, leg extensions become isometric holds,
    impact held at step 2. Knee rehab block (Spanish squat isometrics, band knee extensions, step-downs).
    Leg press test is skipped.
  - Mode off: that joint gets a short prehab block instead.
  - After 6 pain scores in a row at 2 or lower, the home screen suggests trying the mode off.
- **More variety.** Most exercises have four versions, one per 12-week cycle (139 exercises across the year).
  Conditioning alternates between two options per block.

## What changed in 3.2
- **Foundation removed.** The program starts at Hypertrophy in week 1 and runs 48 weeks.
- **Logging fields match the exercise.** Box jumps log box height (in), broad jumps and bounds
  log distance (in), med ball work logs ball weight, sleds log sled load, holds log seconds,
  weighted pull-ups and dips log added weight, dumbbell and single-leg work say per dumbbell / per leg.
  Exercises with nothing worth logging (pogo hops, battle ropes, dead bugs) show no fields.
- **Tests moved.** Baseline in week 1, then weeks 12, 24, 36, 48. Each lift test replaces that day's main lift.

## What changed in 3.1
- **Impact steps.** Five steps from "No impact" to "Running". Your knee scores decide when
  jumps, landings, and running come back. The app never moves you up on its own.
- **Test log.** Added (schedule updated in 3.2).
- **Exercise labels.** A, B, C are single lifts done one at a time. A1/A2 is a superset:
  one set of A1, straight to A2, then rest. The rest timer starts after the second exercise only.
- **Spine rules updated.** No barbell back squat or conventional barbell deadlift.
  Barbell RDL (Hypertrophy and Power blocks), trap bar deadlift (Strength blocks),
  overhead reverse lunges, and rotational work are in.

## Deploy (same URL keeps your data)
1. Open the current app, Settings, Export backup, and save it to Files.
2. Unzip this project.
3. In your GitHub repo for this app, replace the files with these and commit.
4. Vercel redeploys on its own. Keep the same Vercel URL so your logs carry over.
   (Storage keys are unchanged. An old "knee mode on" save becomes impact step 1.
   Week numbers now mean different blocks, so if you logged weeks under 3.1, start over at week 1.)
5. New project instead? Vercel → Add New → Project → import → Deploy, then Safari → Share →
   Add to Home Screen, and restore your backup in Settings.

## Files
- src/program.js: all training content, impact steps, gate rules, tests
- src/App.jsx: the app
- src/index.css: styling

## Storage keys
h365v3_week, h365v3_log, h365v3_settings, h365v3_tests
