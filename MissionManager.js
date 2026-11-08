export class MissionManager {
  constructor(game) {
    this.game = game;
    this.missions = [];
    this.active = null;
    this.index = 0;
  }

  setGame(game) { this.game = game; }

  startTutorial() {
    this.active = {
      id: 'tutorial_1',
      title: 'المهمة التدريبية',
      desc: 'اذهب إلى العلامة الخضراء وتعرف على المدينة.',
      objective: 'استكشف المدينة',
      done: false,
    };
    this.game.ui.showMission(this.active);
    this.game.notify('بدأت المهمة التدريبية');
  }

  update(dt) {
    if (!this.active || this.active.done) return;
    const p = this.game.player;
    if (!p.body) return;
    const d = p.body.position.distanceTo(this.game.world.spawnPoint);
    if (d < 10 && !this.active.done) {
      this.active.done = true;
      this.game.economy.addCash(500);
      this.game.ui.hideMission();
      this.game.notify('اكتملت المهمة التدريبية +$500');
    }
  }

  load(data) {
    if (data) this.active = data.active || null;
  }
}