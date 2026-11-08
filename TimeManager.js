export class TimeManager {
  constructor() {
    this.hour = 12;
    this.minute = 0;
    this.day = 1;
    this.speed = 0.02;
  }

  update(dt) {
    this.minute += dt * this.speed * 60;
    if (this.minute >= 60) { this.minute = 0; this.hour = (this.hour + 1) % 24; if (this.hour === 0) this.day++; }
  }

  getTimeString() {
    const h = Math.floor(this.hour).toString().padStart(2, '0');
    const m = Math.floor(this.minute).toString().padStart(2, '0');
    return `${h}:${m}`;
  }
}