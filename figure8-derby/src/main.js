import * as THREE from 'three';
import { WORLD, CLASSES, RACE } from './config.js';
import { Track } from './track.js';
import { Vehicle, resolveCollisions } from './vehicle.js';
import { AIController } from './ai.js';
import { Input } from './input.js';

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8fc0e8);
scene.fog = new THREE.Fog(0x8fc0e8, 200, 420);

const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
camera.position.set(0, 40, 80);

// lights
const sun = new THREE.DirectionalLight(0xffffff, 2.2);
sun.position.set(60, 120, 40);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -180; sun.shadow.camera.right = 180;
sun.shadow.camera.top = 180; sun.shadow.camera.bottom = -180;
sun.shadow.camera.far = 400;
scene.add(sun);
scene.add(new THREE.HemisphereLight(0xbfe0ff, 0x4a6b3a, 0.9));

const track = new Track(scene);
const input = new Input();

let vehicles = [];
let ais = [];
let player = null;
let state = 'menu';          // menu | countdown | racing | finished
let countdown = 0;
let camPos = new THREE.Vector3(0, 40, 80);
let camLook = new THREE.Vector3();

// ---------- HUD ----------
const hud = {
  menu: document.getElementById('menu'),
  hudBar: document.getElementById('hud'),
  center: document.getElementById('center-msg'),
  health: document.getElementById('health-fill'),
  speed: document.getElementById('speed'),
  alive: document.getElementById('alive'),
  status: document.getElementById('status'),
  touch: document.getElementById('touch'),
};

function setState(s) {
  state = s;
  hud.menu.style.display = s === 'menu' ? 'flex' : 'none';
  hud.hudBar.style.display = (s === 'racing' || s === 'countdown' || s === 'finished') ? 'flex' : 'none';
  hud.touch.style.display = (s === 'racing' || s === 'countdown') ? 'block' : 'none';
}

// ---------- Race setup ----------
function startRace(playerClassKey) {
  // clear
  for (const v of vehicles) v.dispose();
  vehicles = []; ais = [];

  const classKeys = Object.keys(CLASSES);
  const N = track.samples.length;
  const field = RACE.fieldSize;

  for (let i = 0; i < field; i++) {
    const idx = Math.round((i * N) / field) % N;
    const s = track.sampleAt(idx);
    const h = Math.atan2(s.tx, s.tz);
    const nx = -s.tz, nz = s.tx;
    const lane = (i % 2 === 0 ? 1 : -1) * 4.5;

    const isPlayer = i === 0;
    const key = isPlayer ? playerClassKey : classKeys[(i * 3 + 1) % classKeys.length];
    const v = new Vehicle(scene, CLASSES[key], {
      isPlayer,
      x: s.x + nx * lane,
      z: s.z + nz * lane,
      h,
      trackHint: idx,
    });
    vehicles.push(v);
    if (isPlayer) player = v;
    else ais.push(new AIController(v, track));
  }

  countdown = RACE.countdownSecs + 1;
  hud.status.textContent = '';
  setState('countdown');
  positionCameraBehind(player, 1);
}

function livingCount() { return vehicles.filter(v => !v.wrecked).length; }
function firstLiving() { return vehicles.find(v => !v.wrecked); }

// ---------- Camera ----------
function positionCameraBehind(v, blend) {
  const fx = Math.sin(v.h), fz = Math.cos(v.h);
  const dist = 14 + Math.min(10, Math.abs(v.forwardSpeed) * 0.35);
  const desired = new THREE.Vector3(v.x - fx * dist, 7.5, v.z - fz * dist);
  const look = new THREE.Vector3(v.x + fx * 6, 1.5, v.z + fz * 6);
  camPos.lerp(desired, blend);
  camLook.lerp(look, blend);
  camera.position.copy(camPos);
  camera.lookAt(camLook);
}

// ---------- Loop ----------
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;

  if (state === 'countdown') {
    countdown -= dt;
    const n = Math.ceil(countdown - 1);
    hud.center.textContent = n > 0 ? String(n) : 'GO!';
    hud.center.style.display = 'block';
    if (countdown <= 0) { hud.center.style.display = 'none'; setState('racing'); }
    // hold cars, just render + settle camera
    for (const v of vehicles) v._sync();
    positionCameraBehind(player, 0.12);
  } else if (state === 'racing') {
    // input
    if (!player.wrecked) player.applyInput(input.read());
    for (const ai of ais) ai.update(dt, vehicles);
    for (const v of vehicles) v.update(dt, track);
    resolveCollisions(vehicles);

    // camera: follow player, or spectate a survivor if wrecked
    const camTarget = !player.wrecked ? player : (firstLiving() || player);
    positionCameraBehind(camTarget, 0.12);

    // HUD
    const hp = Math.max(0, player.health) / player.maxHealth;
    hud.health.style.width = (hp * 100).toFixed(0) + '%';
    hud.health.style.background = hp > 0.5 ? '#4caf50' : hp > 0.25 ? '#ffb300' : '#e53935';
    hud.speed.textContent = Math.round(player.speedKmh) + ' km/h';
    hud.alive.textContent = livingCount() + ' left';
    hud.status.textContent = player.wrecked ? 'WRECKED — spectating' : '';

    if (livingCount() <= 1) finish();
  } else if (state === 'finished') {
    for (const v of vehicles) v.update(dt, track);
    const camTarget = firstLiving() || player;
    positionCameraBehind(camTarget, 0.06);
    if (input.restart) startRace(player.cls === CLASSES.rv ? 'rv' : keyOf(player.cls));
  }

  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

function keyOf(cls) {
  return Object.keys(CLASSES).find(k => CLASSES[k] === cls) || 'rv';
}

function finish() {
  setState('finished');
  const winner = firstLiving();
  hud.center.style.display = 'block';
  if (winner === player) {
    hud.center.innerHTML = '🏆 LAST TRUCK STANDING<br><span class="sub">YOU WIN — press R to rematch</span>';
  } else if (winner) {
    hud.center.innerHTML = `WRECKED<br><span class="sub">${winner.cls.name} took it — press R to rematch</span>`;
  } else {
    hud.center.innerHTML = 'TOTAL WIPEOUT<br><span class="sub">press R to rematch</span>';
  }
}

// ---------- Menu wiring ----------
function buildMenu() {
  const wrap = document.getElementById('class-list');
  for (const [key, cls] of Object.entries(CLASSES)) {
    const btn = document.createElement('button');
    btn.className = 'class-btn';
    btn.innerHTML = `<b>${cls.name}</b><span>${cls.desc}</span>` +
      `<div class="stats">HP ${cls.health} · SPD ${cls.topSpeed} · MASS ${cls.mass}</div>`;
    btn.onclick = () => startRace(key);
    wrap.appendChild(btn);
  }
}

// ---------- Resize ----------
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);

buildMenu();
resize();
setState('menu');
requestAnimationFrame(frame);
