import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class CombatManager {
  constructor(physics, player, police, game) {
    this.physics = physics;
    this.player = player;
    this.police = police;
    this.game = game;
    this.weapons = [
      { name: 'م kuk', damage: 15, range: 2.5, fireRate: 0.6, ammo: 999, type: 'melee' },
      { name: 'مسدس', damage: 35, range: 80, fireRate: 0.3, ammo: 18, type: 'pistol', mag: 18 },
      { name: 'بندقية shotgun', damage: 70, range: 40, fireRate: 0.9, ammo: 10, type: 'shotgun', mag: 10 },
      { name: 'بندقية اقتحام', damage: 45, range: 120, fireRate: 0.12, ammo: 60, type: 'rifle', mag: 60 },
      { name: 'قناصة', damage: 120, range: 300, fireRate: 1.5, ammo: 10, type: 'sniper', mag: 10 },
    ];
    this.currentWeapon = 0;
    this.lastShot = 0;
    this.isAiming = false;
    this.raycaster = new THREE.Raycaster();
  }

  update(dt) {
    const input = this.game.input;
    if (this.player.inVehicle) return;

    if (input.wasPressed('Tab')) {
      this.currentWeapon = (this.currentWeapon + 1) % this.weapons.length;
      this.game.ui.updateWeapon(this.weapons[this.currentWeapon]);
      this.game.notify(`السلاح: ${this.weapons[this.currentWeapon].name}`);
    }

    if (input.isPressed('MOUSE2')) this.isAiming = true;
    else this.isAiming = false;

    if (input.wasPressed('MOUSE0')) this.shoot();

    if (input.wasPressed('KeyR')) this.reload();

    this.updateCrosshair();
  }

  updateCrosshair() {
    const cross = document.getElementById('crosshair');
    if (!cross) return;
    if (this.isAiming) {
      cross.style.width = '12px'; cross.style.height = '12px';
      cross.style.borderColor = '#4ade80';
      cross.style.background = 'radial-gradient(circle, rgba(74,222,128,0.4) 0%, transparent 70%)';
    } else {
      cross.style.width = '24px'; cross.style.height = '24px';
      cross.style.borderColor = 'rgba(255,255,255,0.6)';
      cross.style.background = 'radial-gradient(circle, rgba(179,0,0,0.5) 0%, transparent 70%)';
    }
  }

  shoot() {
    const wp = this.weapons[this.currentWeapon];
    const now = Date.now();
    if (now - this.lastShot < wp.fireRate * 1000) return;
    if (wp.type !== 'melee' && wp.ammo <= 0) { this.reload(); return; }
    this.lastShot = now;

    const cam = this.game.renderer.camera;
    const center = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
    const origin = cam.position.clone();
    this.raycaster.set(origin, center);
    const hits = this.raycaster.intersectObjects(this.game.renderer.scene.children, true);
    let hit = null;
    for (const h of hits) {
      const ud = h.object.userData;
      if (ud && ud.hittable && ud.entity !== this.game.player) { hit = h; break; }
    }

    if (hit) {
      const ent = hit.object.userData.entity;
      if (ent && ent.takeDamage) ent.takeDamage(wp.damage);
      if (ent === this.game.player || (ent && ent.pedestrian)) {
        this.police.checkCrime('shoot');
      }
      this.createImpact(hit.point);
    }

    if (wp.type !== 'melee') wp.ammo--;
    this.game.ui.updateAmmo(wp);
    this.game.audio.playWeapon(wp.type);
  }

  reload() {
    const wp = this.weapons[this.currentWeapon];
    if (wp.type !== 'melee' && wp.ammo < wp.mag) {
      wp.ammo = wp.mag;
      this.game.ui.updateAmmo(wp);
      this.game.notify('تم إعادة التحميل');
    }
  }

  createImpact(pos) {
    const sph = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffaa00 }));
    sph.position.copy(pos);
    this.game.renderer.scene.add(sph);
    setTimeout(() => this.game.renderer.scene.remove(sph), 400);
  }
}