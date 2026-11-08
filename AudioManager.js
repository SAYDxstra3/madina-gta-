import * as THREE from 'three';

export class AudioManager {
  constructor(camera) {
    this.camera = camera;
    this.ctx = null;
    this.listener = null;
    this.started = false;
    this.gain = null;
  }

  start() {
    if (this.started) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.listener = new THREE.AudioListener();
    this.camera.add(this.listener);
    this.gain = this.ctx.createGain();
    this.gain.connect(this.ctx.destination);
    this.gain.gain.value = 0.8;
    this.started = true;
  }

  update(dt, player) {}

  playWeapon(type) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type === 'shotgun' ? 'sawtooth' : 'square';
    osc.frequency.setValueAtTime(type === 'sniper' ? 220 : 440, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(type === 'sniper' ? 80 : 110, this.ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }
}