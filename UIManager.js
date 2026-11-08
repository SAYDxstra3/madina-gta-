export class UIManager {
  constructor(game) {
    this.game = game;
    this.el = (id) => document.getElementById(id);
  }

  showMainMenu() {
    this.el('main-menu').classList.remove('hidden');
    this.hasSave().then((has) => {
      const btn = this.el('btn-continue');
      if (btn) btn.disabled = !has;
    });
    this.el('btn-new-game').onclick = () => this.game.startNewGame();
    this.el('btn-continue').onclick = () => this.game.continueGame();
    this.el('btn-load').onclick = async () => { const list = await this.game.save.list(); if (list.length) this.game.continueGame(); else this.notify('لا توجد ألعاب محفوظة'); };
    this.el('btn-settings').onclick = () => this.notify('الإعدادات قيد التطوير');
    this.el('btn-controls').onclick = () => this.showControls();
    this.el('btn-credits').onclick = () => this.notify('MADINA - استوديو التطوير المفتوح');
  }

  hideMainMenu() { this.el('main-menu').classList.add('hidden'); }

  showPauseMenu() { this.el('pause-menu').classList.remove('hidden'); this.bindPause(); }
  hidePauseMenu() { this.el('pause-menu').classList.add('hidden'); }

  bindPause() {
    this.el('btn-resume').onclick = () => this.game.togglePause();
    this.el('btn-settings-pause').onclick = () => this.notify('الإعدادات قيد التطوير');
    this.el('btn-save').onclick = async () => {
      const data = {
        player: { position: this.game.player.body.position.clone(), health: this.game.player.health, armor: this.game.player.armor },
        economy: { cash: this.game.economy.cash, bank: this.game.economy.bank, inventory: this.game.economy.inventory },
        world: {},
        missions: { active: this.game.missions.active },
      };
      await this.game.save.save('main', data);
      this.notify('تم حفظ اللعبة');
    };
    this.el('btn-main-menu').onclick = () => {
      this.game.state = 'MENU';
      this.game.paused = true;
      this.game.input.releasePointer();
      this.hidePauseMenu();
      this.hideHUD();
      this.showMainMenu();
    };
  }

  showHUD() { this.el('hud').classList.remove('hidden'); }
  hideHUD() { this.el('hud').classList.add('hidden'); }

  showPhone() { this.el('phone').classList.remove('hidden'); this.bindPhone(); }
  hidePhone() { this.el('phone').classList.add('hidden'); }

  showMap() {
    this.el('full-map').classList.remove('hidden');
    this.bindMap();
    this.renderMap();
  }
  hideMap() { this.el('full-map').classList.add('hidden'); }

  bindPhone() {
    const back = this.el('phone-back');
    const close = this.el('phone-close');
    back.onclick = () => this.game.notify('الرجوع');
    close.onclick = () => this.game.togglePhone();
    const apps = this.el('phone-apps').querySelectorAll('.app');
    apps.forEach((a) => {
      a.onclick = () => {
        const app = a.dataset.app;
        const content = this.el('phone-content');
        content.innerHTML = '';
        if (app === 'banking') {
          content.innerHTML = `<div class="empty">الرصيد النقدي: $${this.game.economy.cash}<br>الرصيد البنكي: $${this.game.economy.bank}</div>
            <div style="margin-top:1rem"><button onclick="window.gameUI.deposit()">إيداع</button> <button onclick="window.gameUI.withdraw()">سحب</button></div>`;
        } else if (app === 'gps') {
          content.innerHTML = '<div class="empty">تفعيل نظام تحديد المواقع globale...</div>';
        } else if (app === 'missions') {
          const m = this.game.missions.active;
          content.innerHTML = m ? `<div><strong>${m.title}</strong><br>${m.desc}</div>` : '<div class="empty">لا مهام نشطة</div>';
        } else {
          content.innerHTML = `<div class="empty">تطبيق ${app}</div>`;
        }
      };
    });
  }

  bindMap() {
    this.el('map-close').onclick = () => this.game.toggleMap();
  }

  deposit() {
    const amt = parseFloat(prompt('مبلغ الإيداع:'));
    if (!isNaN(amt)) this.game.economy.deposit(amt);
  }
  withdraw() {
    const amt = parseFloat(prompt('مبلغ السحب:'));
    if (!isNaN(amt)) this.game.economy.withdraw(amt);
  }

  renderMap() {
    const canvas = this.el('map-canvas');
    const ctx = canvas.getContext('2d');
    const w = canvas.clientWidth || 600;
    const h = canvas.clientHeight || 400;
    canvas.width = w; canvas.height = h;
    ctx.fillStyle = '#0b1016'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, Math.min(w, h) / 2 - 20, 0, Math.PI * 2);
    ctx.stroke();
    const p = this.game.player.body.position;
    const px = w / 2 + (p.x / 1200) * (Math.min(w, h) / 2 - 30);
    const py = h / 2 - (p.z / 1200) * (Math.min(w, h) / 2 - 30);
    ctx.fillStyle = '#b30000';
    ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI * 2); ctx.fill();
  }

  showControls() {
    const txt = 'WASD: الحركة\nالفأرة: الكاميرا\nShift: جري\nSpace: قفزة\nC: انحناء\nE: ركوب/خروج مركبة\nF: خروج مركبة\nR: إعادة تحميل\nزر الأيسر: إطلاق النار\nزر الأيمن: تصويب\nTab: تبديل السلاح\nM: الخريطة\nP أو Esc: توقف\nG: GPS\nI: المخزون';
    alert(txt);
  }

  loadGame() { this.game.continueGame(); }

  showMission(m) {
    const el = this.el('mission-text');
    el.classList.remove('hidden');
    this.el('mission-title').textContent = m.title;
    this.el('mission-desc').textContent = m.desc;
  }
  hideMission() { this.el('mission-text').classList.add('hidden'); }

  notify(msg) {
    const el = this.el('notification');
    el.textContent = msg;
    el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 2500);
  }

  updateHUD() {
    const p = this.game.player;
    this.el('health-fill').style.width = Math.max(0, p.health) + '%';
    this.el('armor-fill').style.width = Math.max(0, p.armor) + '%';
    this.updateMoney();
  }

  updateMoney() { this.el('money-display').textContent = '$' + this.game.economy.cash; }

  updateWeapon(w) { this.el('weapon-display').textContent = w.name; }
  updateAmmo(w) { this.el('ammo-display').textContent = w.type === 'melee' ? '∞' : (w.ammo + ' / ' + w.mag); }

  updateWanted(lvl) {
    const el = this.el('wanted-display');
    el.textContent = 'المطلوب: ' + '★'.repeat(lvl) + (lvl === 0 ? '' : '');
    el.style.color = lvl >= 4 ? '#f87171' : lvl >= 2 ? '#fb923c' : '#4ade80';
  }

  updateVehicleInfo(show, speed, fuel) {
    const el = this.el('vehicle-info');
    el.classList.toggle('hidden', !show);
    if (show) {
      this.el('vehicle-speed').textContent = Math.floor(speed) + ' كم/س';
      this.el('vehicle-fuel').textContent = Math.floor(fuel) + '%';
    }
  }

  update(dt) {
    const p = this.game.player;
    if (p.inVehicle) {
      this.updateVehicleInfo(true, p.inVehicle.speed || 0, p.inVehicle.fuel || 100);
    } else {
      this.updateVehicleInfo(false, 0, 0);
    }
  }

  async hasSave() {
    try {
      const list = await this.game.save.list();
      return list.length > 0;
    } catch (e) { return false; }
  }
}