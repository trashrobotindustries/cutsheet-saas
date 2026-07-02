# Art / Asset Pipeline — PARKED NOTE

This captures the "how do we make the art" idea so it isn't lost. **None of this blocks
gameplay** — the prototype ships with stylized primitive vehicles and procedural track.

## Tools in play

- **Flux via local ComfyUI** — primary generator for concept art, vehicle skins/decals,
  track textures, UI art. Local = free/unlimited, reproducible via saved workflows.
- **Magnific** — upscaling + "reimagine" detail passes on Flux output (paid, has an
  unlimited tier).
- **Higgsfield** — motion / cinematic shots (trailers, key art, promo), also has an
  unlimited tier.

## The "computer control for unlimited plans" idea

Goal: drive Magnific and Higgsfield through **computer-use automation** (browser
automation / an agent controlling the UI) so we can batch through their *unlimited*
subscription plans instead of paying per-generation API costs.

**Status: PARKED.** Reasons to treat carefully before building:
- Automating a paid SaaS UI may conflict with its Terms of Service — check first.
- Both tools may expose real APIs on higher tiers; an official API beats UI automation.
- Higher ROI right now is *gameplay*, not asset volume.

**When we pick it up:** spike a small computer-use agent (Playwright or the Claude
computer-use tooling) that (1) logs in, (2) submits a prompt/image, (3) polls for the
result, (4) downloads to an assets folder with structured filenames. Keep it behind a
`tools/asset-gen/` CLI so the game repo never depends on it.

## Practical asset path (no automation needed to start)

1. Prototype: primitives (done).
2. Flux/ComfyUI: generate low-poly-friendly texture atlases + decal sheets locally.
3. Model vehicles low-poly (Blender), export GLTF, texture with Flux atlases.
4. Magnific/Higgsfield only for marketing art initially — not per-asset in-game.
