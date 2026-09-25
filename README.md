# Hypertrophy 365 · Athlete edition (V3)

52-week athlete program: Foundation, then Hypertrophy → Strength → Power blocks,
each 3 loading weeks + 1 deload. Built-in warm-ups, cool-downs, buy-ins and finishers.
Low-back safe. Knee mode on by default.

## Deploy (replace V2)
1. Open the V2 app, export a backup, and save it to Files. (V3 uses new storage keys, so V2 data isn't imported.)
2. Unzip this project.
3. In GitHub, open the V2 repo and replace its files with these (or create a new repo).
4. Commit. Vercel redeploys automatically if the repo is already linked. For a new repo: Vercel → Add New → Project → import → Deploy.
5. Open the Vercel URL in Safari → Share → Add to Home Screen.
6. Delete the old home screen icon if you made a new project.

## Files
- src/program.js — all training content: blocks, sets/reps, exercises, warm-ups, cool-downs, conditioning
- src/App.jsx — the app
- src/index.css — styling

## Storage keys
h365v3_week, h365v3_log, h365v3_settings
