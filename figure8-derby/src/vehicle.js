import * as THREE from 'three';
import { PHYS, WORLD } from './config.js';

// One vehicle: stylized primitive mesh + arcade physics in the XZ plane.
// heading h: forward = (sin h, cos h), right = (cos h, -sin h).
export class Vehicle {
  constructor(scene, cls, opts = {}) {
    this.cls = cls;
    this.scene = scene;
    this.isPlayer = !!opts.isPlayer;
    this.mass = cls.mass;
    this.maxHealth = cls.health;
    this.health = cls.health;
    this.radius = cls.size[2] * 0.5;   // collision circle from length
    this.wrecked = false;

    // state
    this.x = opts.x || 0;
    this.z = opts.z || 0;
    this.h = opts.h || 0;
    this.vx = 0; this.vz = 0;
    this.forwardSpeed = 0;
    this.trackHint = opts.trackHint ?? -1;

    this.input = { throttle: 0, steer: 0 };
    this.mesh = this._buildMesh(cls);
    this._sync();
    scene.add(this.mesh);
  }

  _buildMesh(cls) {
    const [w, hgt, len] = cls.size;
    const g = new THREE.Group();

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(w, hgt * 0.55, len),
      new THREE.MeshStandardMaterial({ color: cls.color, roughness: 0.6, metalness: 0.1 })
    );
    body.position.y = hgt * 0.35;
    body.castShadow = true;
    g.add(body);

    const cab = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.92, hgt * 0.5, len * 0.55),
      new THREE.MeshStandardMaterial({ color: cls.roof, roughness: 0.5 })
    );
    cab.position.set(0, hgt * 0.78, len * 0.08);
    cab.castShadow = true;
    g.add(cab);

    // windshield hint (front = +z)
    const glass = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.8, hgt * 0.3, 0.2),
      new THREE.MeshStandardMaterial({ color: 0x223, roughness: 0.2, metalness: 0.4 })
    );
    glass.position.set(0, hgt * 0.78, len * 0.34);
    g.add(glass);

    // wheels
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111, roughness: 0.9 });
    const wr = Math.min(0.55, hgt * 0.22);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(wr, wr, 0.4, 12), wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(sx * w * 0.52, wr, sz * len * 0.34);
      g.add(wheel);
    }

    this.body = body;
    this._baseColor = new THREE.Color(cls.color);
    return g;
  }

  applyInput(input) { this.input = input; }

  update(dt, track) {
    if (!this.wrecked) {
      const cls = this.cls;
      // forward / lateral decomposition
      const fx = Math.sin(this.h), fz = Math.cos(this.h);
      const rx = Math.cos(this.h), rz = -Math.sin(this.h);
      let fwd = this.vx * fx + this.vz * fz;
      let lat = this.vx * rx + this.vz * rz;

      // engine
      const th = this.input.throttle;
      if (th >= 0) {
        fwd += th * cls.accel * dt;
      } else {
        // braking, then reverse
        if (fwd > 0) fwd += th * cls.accel * PHYS.brakeDrag * dt;
        else fwd += th * cls.accel * 0.5 * dt;
      }
      // clamp top speed
      const top = cls.topSpeed;
      if (fwd > top) fwd = top;
      if (fwd < -top * 0.4) fwd = -top * 0.4;

      // grip kills lateral velocity (scaled by class grip)
      lat *= Math.max(0, 1 - PHYS.grip * cls.grip * dt);
      // rolling drag
      fwd *= Math.max(0, 1 - PHYS.drag * dt);

      // steering authority scales with speed but never fully zero
      const speedFrac = Math.min(1, Math.abs(fwd) / PHYS.turnSpeedRef);
      const authority = PHYS.lowSpeedTurn + (1 - PHYS.lowSpeedTurn) * speedFrac;
      const dir = fwd >= 0 ? 1 : -1;
      this.h += this.input.steer * PHYS.maxTurn * authority * dir * dt;

      // recompose velocity
      const nfx = Math.sin(this.h), nfz = Math.cos(this.h);
      const nrx = Math.cos(this.h), nrz = -Math.sin(this.h);
      this.vx = nfx * fwd + nrx * lat;
      this.vz = nfz * fwd + nrz * lat;
      this.forwardSpeed = fwd;

      // integrate
      this.x += this.vx * dt;
      this.z += this.vz * dt;

      // off-road penalty
      const near = track.nearest(this.x, this.z, this.trackHint);
      this.trackHint = near.index;
      if (Math.abs(near.offset) > track.halfWidth) {
        this.vx *= Math.max(0, 1 - PHYS.offRoadDrag * dt);
        this.vz *= Math.max(0, 1 - PHYS.offRoadDrag * dt);
        // push back toward road
        const over = Math.abs(near.offset) - track.halfWidth;
        const nx = -near.point.tz, nz = near.point.tx; // left normal
        const sign = near.offset > 0 ? -1 : 1;
        this.vx += nx * sign * PHYS.offRoadPush * Math.min(1, over / 6) * dt;
        this.vz += nz * sign * PHYS.offRoadPush * Math.min(1, over / 6) * dt;
      }
    } else {
      // wrecked: coast to a stop
      this.vx *= Math.max(0, 1 - 2.5 * dt);
      this.vz *= Math.max(0, 1 - 2.5 * dt);
      this.x += this.vx * dt;
      this.z += this.vz * dt;
    }
    this._sync();
  }

  takeDamage(amount) {
    if (this.wrecked) return;
    this.health -= amount;
    // flash toward red on hit
    const hurt = 1 - Math.max(0, this.health) / this.maxHealth;
    this.body.material.color.copy(this._baseColor).lerp(new THREE.Color(0x552222), hurt * 0.8);
    if (this.health <= 0) this._wreck();
  }

  _wreck() {
    this.wrecked = true;
    this.health = 0;
    this.input = { throttle: 0, steer: 0 };
    this.body.material.color.set(0x333030);
    this.mesh.rotation.z = (Math.random() - 0.5) * 0.4;
    this.mesh.position.y = -0.2;
  }

  get speedKmh() { return Math.abs(this.forwardSpeed) * 3.6; }

  _sync() {
    this.mesh.position.x = this.x;
    this.mesh.position.z = this.z;
    if (!this.wrecked) this.mesh.rotation.y = this.h;
  }

  dispose() { this.scene.remove(this.mesh); }
}

// Resolve elastic-ish collisions between all vehicle pairs (circle model).
export function resolveCollisions(vehicles) {
  for (let i = 0; i < vehicles.length; i++) {
    for (let j = i + 1; j < vehicles.length; j++) {
      const a = vehicles[i], b = vehicles[j];
      let dx = b.x - a.x, dz = b.z - a.z;
      let dist = Math.hypot(dx, dz);
      const minDist = a.radius + b.radius;
      if (dist === 0) { dx = 0.01; dist = 0.01; }
      if (dist >= minDist) continue;

      const nx = dx / dist, nz = dz / dist;
      const overlap = minDist - dist;

      // positional separation (weighted by inverse mass)
      const invA = a.wrecked ? 0.15 : 1 / a.mass;
      const invB = b.wrecked ? 0.15 : 1 / b.mass;
      const invSum = invA + invB;
      a.x -= nx * overlap * (invA / invSum);
      a.z -= nz * overlap * (invA / invSum);
      b.x += nx * overlap * (invB / invSum);
      b.z += nz * overlap * (invB / invSum);

      // relative velocity along normal
      const rvx = b.vx - a.vx, rvz = b.vz - a.vz;
      const velAlong = rvx * nx + rvz * nz;
      if (velAlong > 0) continue; // separating already

      const jImp = -(1 + PHYS.restitution) * velAlong / invSum;
      const ix = jImp * nx, iz = jImp * nz;
      a.vx -= ix * invA; a.vz -= iz * invA;
      b.vx += ix * invB; b.vz += iz * invB;

      // damage proportional to impact impulse; heavier attacker hurts more
      const impact = Math.abs(jImp);
      a.takeDamage(impact * PHYS.collisionDamage * (b.mass / a.mass) * 0.5);
      b.takeDamage(impact * PHYS.collisionDamage * (a.mass / b.mass) * 0.5);
      a._lastImpact = b._lastImpact = impact;
    }
  }
}
