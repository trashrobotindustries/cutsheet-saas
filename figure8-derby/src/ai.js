import { RACE } from './config.js';

// Simple but effective AI: follow the racing line with a lookahead target,
// full throttle, and — per aggression — bias steering toward the nearest rival.
// The figure-8 crossover does most of the "make them crash" work for free.
export class AIController {
  constructor(vehicle, track) {
    this.v = vehicle;
    this.track = track;
    this.lookahead = 26 + Math.random() * 10;
    this.aggression = RACE.aiAggression * (0.7 + Math.random() * 0.6);
  }

  update(dt, allVehicles) {
    const v = this.v;
    if (v.wrecked) { v.applyInput({ throttle: 0, steer: 0 }); return; }

    // target a point ahead on the centerline
    const near = this.track.nearest(v.x, v.z, v.trackHint);
    const aheadIdx = near.index + Math.round(this.lookahead);
    const target = this.track.sampleAt(aheadIdx);
    let tx = target.x, tz = target.z;

    // aggression: nudge target toward nearest living rival if close
    let best = null, bestD = 55 * 55;
    for (const o of allVehicles) {
      if (o === v || o.wrecked) continue;
      const d = (o.x - v.x) ** 2 + (o.z - v.z) ** 2;
      if (d < bestD) { bestD = d; best = o; }
    }
    if (best && this.aggression > 0.2) {
      tx = tx * (1 - this.aggression) + best.x * this.aggression;
      tz = tz * (1 - this.aggression) + best.z * this.aggression;
    }

    // steer toward target: signed angle between heading and desired direction
    const desired = Math.atan2(tx - v.x, tz - v.z);
    let diff = desired - v.h;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const steer = Math.max(-1, Math.min(1, diff * 1.6));

    // ease off the gas in hard turns so they don't spin out constantly
    const throttle = 1 - Math.min(0.5, Math.abs(steer) * 0.5);
    v.applyInput({ throttle, steer });
  }
}
