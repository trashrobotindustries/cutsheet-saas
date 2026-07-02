# Figure-8 Derby 🏁💥

A browser-based **figure-8 demolition-derby racer**. Race RVs, school buses, box trucks
and trailers around a figure-8 track — because the loop crosses itself in the middle,
everyone eventually collides. **Last truck still running wins.** Arcade physics in the
spirit of Twisted Metal 2 / Carmageddon: fun over realism.

Built with **Three.js** (vendored locally — no build step, no CDN, no install to play).

> This project is standalone and unrelated to whatever repo it was bootstrapped in.
> See "Extract into its own repo" below.

## Play it locally

Any static file server works (ES modules need `http://`, not `file://`):

```bash
cd figure8-derby
npm run dev            # -> http://localhost:5173
# or:
python3 -m http.server 5173
```

Then open the URL. Pick a class, race, and try to be the last one running.

**Controls:** `W/A/S/D` or arrow keys to drive · on-screen pads on touch devices ·
`R` to rematch.

## What's here (M0 prototype)

- Figure-8 track (lemniscate centerline) with barriers and a marked crossover.
- Chase "flying behind the RV" camera.
- Four vehicle classes with real stat asymmetry (`src/config.js`).
- Custom arcade physics: acceleration, drift, grip, off-road penalty.
- Collision + damage model — heavier rigs hit harder; wrecks become obstacles.
- AI opponents that follow the racing line and get aggressive near rivals.
- Last-truck-standing win/lose, HUD, keyboard + touch, mobile-responsive.

## Project layout

```
index.html        # entry — HUD, menu, touch pads, importmap
src/config.js     # ALL tuning: physics feel + vehicle class stats
src/track.js      # figure-8 geometry + nearest-point lookup
src/vehicle.js    # arcade physics + collision resolution
src/ai.js         # opponent driver
src/input.js      # keyboard + touch -> throttle/steer
src/main.js       # renderer, scene, game states, loop
vendor/           # vendored three.module.js (no CDN)
DESIGN.md         # full design + tech roadmap (multiplayer, milestones)
PIPELINE.md       # parked note on the Flux/ComfyUI/Magnific/Higgsfield art pipeline
```

## Tuning the feel

Everything that affects how it plays lives in `src/config.js` — `PHYS` for the driving
model (grip, drag, turn rate) and `CLASSES` for per-vehicle mass/accel/health. Change a
number, reload, feel the difference.

## Roadmap

See [`DESIGN.md`](./DESIGN.md). Short version: M0 prototype (this) → game feel & FX →
single-player meta → **online multiplayer** (authoritative server, 6–12 players) → GLTF
art + polish.

## Extract into its own repo

This folder is self-contained. To move it to a dedicated `figure8-derby` repo:

```bash
# from inside this folder
git init && git add . && git commit -m "Figure-8 Derby: initial prototype"
git branch -M main
git remote add origin git@github.com:<you>/figure8-derby.git
git push -u origin main
```
