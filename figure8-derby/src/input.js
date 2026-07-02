// Unified input -> { throttle: -1..1, steer: -1..1 }.
// Keyboard (WASD / arrows) + on-screen touch controls.
export class Input {
  constructor() {
    this.keys = {};
    this.touch = { throttle: 0, steer: 0 };
    window.addEventListener('keydown', (e) => { this.keys[e.code] = true; });
    window.addEventListener('keyup', (e) => { this.keys[e.code] = false; });
    this._wireTouch();
  }

  _wireTouch() {
    const bind = (id, onDown, onUp) => {
      const el = document.getElementById(id);
      if (!el) return;
      const down = (e) => { e.preventDefault(); onDown(); };
      const up = (e) => { e.preventDefault(); onUp(); };
      el.addEventListener('touchstart', down, { passive: false });
      el.addEventListener('touchend', up, { passive: false });
      el.addEventListener('touchcancel', up, { passive: false });
      el.addEventListener('mousedown', down);
      el.addEventListener('mouseup', up);
      el.addEventListener('mouseleave', up);
    };
    bind('btn-gas', () => this.touch.throttle = 1, () => this.touch.throttle = 0);
    bind('btn-brake', () => this.touch.throttle = -1, () => this.touch.throttle = 0);
    bind('btn-left', () => this.touch.steer = -1, () => this.touch.steer = 0);
    bind('btn-right', () => this.touch.steer = 1, () => this.touch.steer = 0);
  }

  read() {
    let throttle = this.touch.throttle;
    let steer = this.touch.steer;
    const k = this.keys;
    if (k['KeyW'] || k['ArrowUp']) throttle = 1;
    if (k['KeyS'] || k['ArrowDown']) throttle = -1;
    if (k['KeyA'] || k['ArrowLeft']) steer = -1;
    if (k['KeyD'] || k['ArrowRight']) steer = 1;
    return { throttle, steer };
  }

  get restart() { return !!this.keys['KeyR']; }
}
