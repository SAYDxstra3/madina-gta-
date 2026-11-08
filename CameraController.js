import * as THREE from 'three';

export class CameraController {
  constructor(camera, player, game) {
    this.camera = camera;
    this.player = player;
    this.game = game;
    this.mode = 'third';
    this.yaw = 0;
    this.pitch = 0;
    this.target = null;
    this.offset = new THREE.Vector3(0, 2, 5);
    this.smooth = 8;
  }

  setTarget(target, mode = 'third') {
    this.target = target;
    this.mode = mode;
    if (mode === 'vehicle') {
      this.offset.set(0, 2.5, 7);
    } else {
      this.offset.set(0, 1.6, 5);
    }
  }

  onResize(w, h) {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  update(dt) {
    if (!this.target || this.game.paused) return;
    const input = this.game.input;

    if (input.mouse.locked && this.game.state === 'PLAYING') {
      const d = input.getMouseDelta();
      this.yaw -= d.x * 0.0025;
      this.pitch -= d.y * 0.0025;
      this.pitch = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, this.pitch));
    }

    const pos = this.target.position.clone();
    if (this.mode === 'vehicle') {
      pos.y += 1.2;
    } else {
      pos.y += 1.45;
    }

    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ'));
    const offsetWorld = this.offset.clone().applyQuaternion(q);
    const desired = pos.clone().add(offsetWorld);

    this.camera.position.lerp(desired, dt * this.smooth);
    this.camera.lookAt(pos);
  }
}