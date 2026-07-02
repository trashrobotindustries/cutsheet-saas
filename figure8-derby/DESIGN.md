# Figure-8 Derby — Design & Tech Roadmap

A multiplayer online **figure-8 demolition-derby race**. Racers (RVs, trailers, school
buses, box trucks) run laps on a figure-8 track. Because the loop crosses itself in the
middle, cross-traffic collisions are *inevitable* — the last vehicle still running wins.
Fun-first, chaotic, arcade physics in the spirit of **Twisted Metal 2 / Carmageddon** —
not photoreal, just satisfying to smash.

> **Repo note:** This project is unrelated to the `cutsheet-saas` repo it was
> bootstrapped in. It is fully self-contained under `figure8-derby/` and is meant to be
> extracted into its own repo (see README "Extract into its own repo").

---

## 1. Design pillars

1. **The crossover is the game.** The X in the 8 forces T-bone collisions. Everything —
   track shape, spawn order, AI aggression, camera — should sell that moment.
2. **Weight matters.** A school bus shrugs off a hit that wrecks a pop-up trailer. Class
   asymmetry (heavy/slow vs light/nimble) is the core strategic knob.
3. **Read it in one glance.** Chase-cam "flying behind the RV" framing, big readable HUD,
   instantly obvious who's wrecked and who's left.
4. **Pick-up-and-play.** Two inputs (steer, gas/brake). Works on keyboard and touch.
   A round is short (60–120s) so the loss sting is small and the rematch is instant.

## 2. Core loop

Pick class → countdown → race the 8 → collisions at the crossover thin the field →
**last truck running wins** → results → rematch.

## 3. Vehicle classes (asymmetry table — tune in `src/config.js`)

| Class        | Mass | Accel | Top speed | Grip   | Health | Feel                          |
|--------------|------|-------|-----------|--------|--------|-------------------------------|
| Pop-up Trailer | low  | high  | high    | low    | low    | Glass cannon, darty, fragile  |
| RV           | med  | med   | med       | med    | med    | The all-rounder (player dflt) |
| Box Truck    | med+ | med   | med-      | med+   | high   | Sturdy bruiser                |
| School Bus   | high | low   | low       | high   | v.high | Wrecking ball, hard to stop   |

**Race modes:** single-class (fair) or **mixed-class** (chaotic, the fun default).

## 4. Tech stack

- **Rendering:** Three.js (WebGL). Vendored locally in `vendor/` — no runtime CDN.
- **Physics:** custom arcade model (`src/vehicle.js`). Deliberately *not* a rigid-body
  sim — tuned arcade feel beats realism for this genre. If we later want stacking/rollovers
  we can swap to **Rapier** (wasm) behind the same interface.
- **Prototype delivery:** static ES modules, any static server. See README.
- **Later — proper build:** migrate to **Vite + React Three Fiber** for HMR, asset
  pipeline, and component structure once multiplayer lands.

## 5. Multiplayer architecture (phase 3 — not in prototype)

- **Authoritative server** (Node). Recommend **Colyseus** (room/state-sync framework) or a
  thin custom WebSocket server. Never trust the client with collision/health outcomes.
- **Model:** server simulates at a fixed tick (e.g. 30 Hz), broadcasts snapshots; clients
  render with interpolation + local input prediction for the player car.
- **Netcode plan:** input messages up (throttle/steer + seq), snapshot down (positions,
  headings, health, wrecked flags). Reconcile player prediction against server state.
- **Scale:** 6–12 racers per room feels right for one crossover. Matchmaking = simple
  lobby → fill room → start. Regions later.
- **Anti-cheat:** all impacts/damage computed server-side; client only sends intent.

## 6. Art / asset pipeline (parked — see `PIPELINE.md` for the full note)

Concept + texture art via **Flux (through local ComfyUI)** or **Magnific**; motion/trailer
shots via **Higgsfield**. The "master computer-control of Magnific/Higgsfield to use the
unlimited plans" idea is captured as an automation task in `PIPELINE.md` — **parked**, not
a blocker for gameplay. 3D models can start as stylized box primitives (prototype already
does this) and graduate to low-poly GLTF meshes textured with Flux/Magnific output.

## 7. Milestones

- **M0 — Prototype (this commit):** figure-8 track, one driveable class, chase cam, arcade
  physics, AI ramming opponents, collision + damage, last-standing win, keyboard + touch.
  *Goal: prove the core loop is fun.* ✅
- **M1 — Game feel:** all 4 classes selectable, class-select screen, smoke/spark FX, sound,
  screen shake on impact, better track dressing (stands, barriers, banners).
- **M2 — Single-player meta:** multiple tracks, AI difficulty, brackets/championship,
  results screen, damage model (parts falling off, handling degradation).
- **M3 — Multiplayer:** authoritative server, lobby/matchmaking, 6–12 players, spectator
  cam for wrecked players, interpolation + prediction.
- **M4 — Content & polish:** GLTF vehicle models w/ Flux/Magnific textures, mobile UX pass,
  progression/cosmetics, ranked play.

## 8. Open questions

- Respawn or permadeath-per-round? (Prototype = permadeath; it's cleaner.)
- Laps-then-derby, or pure survival? (Prototype = pure survival + free driving.)
- Monetization later: cosmetics-only, no pay-to-win on class stats.
</invoke>
