export class WeatherManager {
  constructor(scene, renderer) {
    this.scene = scene;
    this.renderer = renderer;
    this.weather = 'sunny';
    this.particles = null;
    this.intensity = 0;
  }

  async init() {
    const geo = new THREE.BufferGeometry();
    const count = 4000;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i += 3) {
      pos[i] = (Math.random() - 0.5) * 400;
      pos[i + 1] = Math.random() * 200;
      pos[i + 2] = (Math.random() - 0.5) * 400;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ color: 0xaaeeff, size: 0.15, transparent: true, opacity: 0 });
    this.particles = new THREE.Points(geo, mat);
    this.scene.add(this.particles);
  }

  update(dt) {
    if (!this.particles) return;
    const target = this.weather === 'rain' || this.weather === 'storm' ? 0.6 : 0;
    this.intensity = THREE.MathUtils.lerp(this.intensity, target, dt * 0.5);
    this.particles.material.opacity = this.intensity;
    if (this.particles.geometry.attributes.position) {
      const pos = this.particles.geometry.attributes.position;
      for (let i = 1; i < pos.count * 3; i += 3) {
        pos.array[i] -= dt * 12;
        if (pos.array[i] < 0) pos.array[i] = 200;
      }
      pos.needsUpdate = true;
    }
  }

  set(weather) { this.weather = weather; }
}