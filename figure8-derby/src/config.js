// Central tuning. Tweak here to change game feel.

export const WORLD = {
  trackScale: 90,      // lemniscate 'a' — overall size of the 8
  roadHalfWidth: 13,   // drivable half-width on each side of centerline
  splineSamples: 480,  // resolution of centerline sampling
  groundColor: 0x2e5d34,
  roadColor: 0x2b2b30,
  lineColor: 0xf2d64b,
};

// Arcade physics feel (per-second rates unless noted).
export const PHYS = {
  gravity: 0,
  grip: 6.5,           // how fast lateral velocity is killed (higher = less drift)
  drag: 0.55,          // rolling drag on forward speed
  brakeDrag: 2.6,      // extra drag when braking
  maxTurn: 2.4,        // rad/s at full steer, full speed
  turnSpeedRef: 22,    // speed at which steering reaches full authority
  lowSpeedTurn: 0.35,  // fraction of turn authority retained near standstill
  offRoadDrag: 3.2,    // extra drag off the road (the "grass")
  offRoadPush: 9,      // force nudging you back onto the road
  collisionDamage: 0.9,// damage per unit of impact impulse
  restitution: 0.35,   // bounciness of car-vs-car hits
};

// Vehicle classes — the asymmetry that makes the derby interesting.
export const CLASSES = {
  trailer: {
    name: 'Pop-up Trailer', mass: 0.7, accel: 34, topSpeed: 46, grip: 0.8,
    health: 65, size: [2.3, 2.0, 5.2], color: 0xe4572e, roof: 0xffe1c4,
    desc: 'Glass cannon — darty and fast, but folds on a solid hit.',
  },
  rv: {
    name: 'RV', mass: 1.0, accel: 28, topSpeed: 40, grip: 1.0,
    health: 100, size: [2.7, 2.9, 6.6], color: 0xf4f1ea, roof: 0xd8d3c6,
    desc: 'The all-rounder. Balanced and forgiving.',
  },
  boxtruck: {
    name: 'Box Truck', mass: 1.3, accel: 24, topSpeed: 37, grip: 1.15,
    health: 140, size: [2.8, 3.1, 6.9], color: 0x3a7ca5, roof: 0x2f6690,
    desc: 'Sturdy bruiser. Trades zip for staying power.',
  },
  bus: {
    name: 'School Bus', mass: 1.7, accel: 20, topSpeed: 34, grip: 1.3,
    health: 190, size: [3.0, 3.2, 8.4], color: 0xf6c445, roof: 0xe0a800,
    desc: 'Wrecking ball. Slow to spin up, brutal on contact.',
  },
};

export const RACE = {
  fieldSize: 6,        // total vehicles in a race (incl. player)
  countdownSecs: 3,
  aiAggression: 0.55,  // 0 = pure racing line, 1 = actively hunts nearest rival
};
