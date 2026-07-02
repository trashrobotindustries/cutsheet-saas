import * as THREE from 'three';
import { WORLD } from './config.js';

// Lemniscate of Bernoulli -> a proper figure-8 that crosses itself at the origin.
// Two passes through the center per lap = guaranteed cross-traffic.
function lemniscate(t, a) {
  const s = Math.sin(t), c = Math.cos(t);
  const d = 1 + s * s;
  const k = a * Math.SQRT2;
  return { x: (k * c) / d, z: (k * c * s) / d };
}

export class Track {
  constructor(scene) {
    this.scene = scene;
    this.a = WORLD.trackScale;
    this.halfWidth = WORLD.roadHalfWidth;
    this.samples = [];      // { x, z, tx, tz } tangent-normalized centerline points
    this._build();
  }

  _build() {
    const N = WORLD.splineSamples;
    const pts = [];
    for (let i = 0; i < N; i++) {
      const t = (i / N) * Math.PI * 2;
      pts.push(lemniscate(t, this.a));
    }
    // tangents (finite difference)
    for (let i = 0; i < N; i++) {
      const p = pts[i], n = pts[(i + 1) % N];
      let tx = n.x - p.x, tz = n.z - p.z;
      const len = Math.hypot(tx, tz) || 1;
      tx /= len; tz /= len;
      this.samples.push({ x: p.x, z: p.z, tx, tz });
    }

    // Ground
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(600, 600),
      new THREE.MeshStandardMaterial({ color: WORLD.groundColor, roughness: 1 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Road ribbon (triangle strip between left/right edges of the centerline)
    const hw = this.halfWidth;
    const posArr = [];
    const idx = [];
    for (let i = 0; i <= N; i++) {
      const s = this.samples[i % N];
      const nx = -s.tz, nz = s.tx; // left normal
      posArr.push(s.x + nx * hw, 0.02, s.z + nz * hw);
      posArr.push(s.x - nx * hw, 0.02, s.z - nz * hw);
    }
    for (let i = 0; i < N; i++) {
      const a = i * 2, b = i * 2 + 1, c = i * 2 + 2, d = i * 2 + 3;
      idx.push(a, b, c, b, d, c);
    }
    const roadGeo = new THREE.BufferGeometry();
    roadGeo.setAttribute('position', new THREE.Float32BufferAttribute(posArr, 3));
    roadGeo.setIndex(idx);
    roadGeo.computeVertexNormals();
    const road = new THREE.Mesh(
      roadGeo,
      new THREE.MeshStandardMaterial({ color: WORLD.roadColor, roughness: 0.95, side: THREE.DoubleSide })
    );
    road.receiveShadow = true;
    this.scene.add(road);

    // Center dashed line
    const lineMat = new THREE.MeshBasicMaterial({ color: WORLD.lineColor });
    for (let i = 0; i < N; i += 6) {
      const s = this.samples[i];
      const dash = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 2.2), lineMat);
      dash.position.set(s.x, 0.06, s.z);
      dash.rotation.y = Math.atan2(s.tx, s.tz);
      this.scene.add(dash);
    }

    // Edge barriers (visual + they mark the danger zone)
    this._buildBarriers(N, hw);

    // Highlight the crossover with a warning ring so its role is obvious
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(hw * 0.6, hw * 0.6 + 1.2, 48),
      new THREE.MeshBasicMaterial({ color: 0xff3b30, transparent: true, opacity: 0.35, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.07;
    this.scene.add(ring);
  }

  _buildBarriers(N, hw) {
    const mat = new THREE.MeshStandardMaterial({ color: 0xd23a2a, roughness: 0.8 });
    const matAlt = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.8 });
    for (let i = 0; i < N; i += 4) {
      const s = this.samples[i];
      const nx = -s.tz, nz = s.tx;
      for (const side of [1, -1]) {
        const post = new THREE.Mesh(
          new THREE.BoxGeometry(0.6, 1.1, 1.8),
          (i / 4) % 2 === 0 ? mat : matAlt
        );
        post.position.set(s.x + nx * hw * side * 1.06, 0.55, s.z + nz * hw * side * 1.06);
        post.rotation.y = Math.atan2(s.tx, s.tz);
        post.castShadow = true;
        this.scene.add(post);
      }
    }
  }

  // Nearest centerline sample -> lateral offset (signed) and heading of the track there.
  // Used for off-road detection and AI/spawn placement.
  nearest(x, z, hint = -1) {
    let best = -1, bestD = Infinity;
    const N = this.samples.length;
    // Search a window around the hint if provided, else brute force.
    if (hint >= 0) {
      for (let k = -30; k <= 30; k++) {
        const i = (hint + k + N) % N;
        const s = this.samples[i];
        const d = (s.x - x) ** 2 + (s.z - z) ** 2;
        if (d < bestD) { bestD = d; best = i; }
      }
      // fall through to a quick global check occasionally handled by caller
    } else {
      for (let i = 0; i < N; i++) {
        const s = this.samples[i];
        const d = (s.x - x) ** 2 + (s.z - z) ** 2;
        if (d < bestD) { bestD = d; best = i; }
      }
    }
    const s = this.samples[best];
    // signed lateral offset using left normal (nx,nz)
    const nx = -s.tz, nz = s.tx;
    const offset = (x - s.x) * nx + (z - s.z) * nz;
    return { index: best, point: s, offset, dist: Math.sqrt(bestD) };
  }

  sampleAt(index) { return this.samples[(index + this.samples.length) % this.samples.length]; }
}
