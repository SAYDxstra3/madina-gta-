export class InputManager {
  constructor() {
    this.keys = {};
    this.mouse = { x: 0, y: 0, deltaX: 0, deltaY: 0, locked: false };
    this.gamepad = null;
    this.justPressed = new Set();
    this.justReleased = new Set();

    this.onKeyDown = (e) => { this.keys[e.code] = true; this.justPressed.add(e.code); this.justReleased.delete(e.code); };
    this.onKeyUp = (e) => { this.keys[e.code] = false; this.justReleased.add(e.code); this.justPressed.delete(e.code); };
    this.onMouseMove = (e) => {
      if (this.mouse.locked) {
        this.mouse.deltaX += e.movementX;
        this.mouse.deltaY += e.movementY;
      } else {
        this.mouse.x = e.clientX;
        this.mouse.y = e.clientY;
      }
    };
    this.onMouseDown = (e) => { this.keys['MOUSE' + e.button] = true; this.justPressed.add('MOUSE' + e.button); };
    this.onMouseUp = (e) => { this.keys['MOUSE' + e.button] = false; this.justReleased.add('MOUSE' + e.button); };
    this.onContext = (e) => e.preventDefault();

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('contextmenu', this.onContext);
  }

  capturePointer() {
    const canvas = document.getElementById('game-canvas');
    canvas.requestPointerLock().catch(() => {});
  }

  releasePointer() {
    document.exitPointerLock();
  }

  update(dt) {
    if (document.pointerLockElement === document.getElementById('game-canvas')) {
      this.mouse.locked = true;
    } else {
      this.mouse.locked = false;
    }
    const gp = navigator.getGamepads ? navigator.getGamepads()[0] : null;
    if (gp) this.gamepad = gp;
  }

  endFrame() {
    this.mouse.deltaX = 0;
    this.mouse.deltaY = 0;
    this.justPressed.clear();
    this.justReleased.clear();
  }

  isPressed(code) { return !!this.keys[code]; }
  wasPressed(code) { return this.justPressed.has(code); }
  wasReleased(code) { return this.justReleased.has(code); }

  getMouseDelta() { return { x: this.mouse.deltaX, y: this.mouse.deltaY }; }
}