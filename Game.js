import * as THREE from 'three';
import { InputManager } from './InputManager.js';
import { SaveManager } from './SaveManager.js';
import { Renderer } from '../engine/Renderer.js';
import { PhysicsManager } from '../engine/PhysicsManager.js';
import { WorldManager } from '../world/WorldManager.js';
import { PlayerController } from '../player/PlayerController.js';
import { CameraController } from '../camera/CameraController.js';
import { VehicleManager } from '../vehicle/VehicleManager.js';
import { NPCManager } from '../npc/NPCManager.js';
import { PoliceAI } from '../police/PoliceAI.js';
import { CombatManager } from '../combat/CombatManager.js';
import { MissionManager } from '../mission/MissionManager.js';
import { EconomyManager } from '../economy/EconomyManager.js';
import { WeatherManager } from '../world/WeatherManager.js';
import { TimeManager } from '../world/TimeManager.js';
import { AudioManager } from '../audio/AudioManager.js';
import { UIManager } from '../ui/UIManager.js';

export const GAME_STATE = { MENU: 'MENU', LOADING: 'LOADING', PLAYING: 'PLAYING', PAUSED: 'PAUSED', PHONE: 'PHONE', MAP: 'MAP' };

export class Game {
  constructor() {
    this.state = GAME_STATE.MENU;
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.clock = new THREE.Clock();
    this.lastTime = 0;
    this.paused = false;

    this.renderer = null;
    this.physics = null;
    this.world = null;
    this.player = null;
    this.camera = null;
    this.vehicles = null;
    this.npcs = null;
    this.police = null;
    this.combat = null;
    this.missions = null;
    this.economy = null;
    this.weather = null;
    this.time = null;
    this.audio = null;
    this.ui = null;
    this.input = null;
    this.save = null;

    this.entities = [];
    this.animationId = null;
  }

  async init() {
    this.showLoading(0);
    this.renderer = new Renderer(document.getElementById('game-canvas'), this.width, this.height);
    await this.renderer.init();
    this.showLoading(15);

    this.physics = new PhysicsManager();
    await this.physics.init();
    this.showLoading(30);

    this.input = new InputManager();
    this.save = new SaveManager();
    this.audio = new AudioManager(this.renderer.camera);
    this.time = new TimeManager();
    this.weather = new WeatherManager(this.renderer.scene, this.renderer.renderer);
    await this.weather.init();
    this.economy = new EconomyManager(this.save);
    this.missions = new MissionManager(this);
    this.world = new WorldManager(this.renderer.scene, this.physics, this);
    await this.world.init();
    this.showLoading(55);

    this.player = new PlayerController(this.physics, this.renderer.camera, this);
    await this.player.init();
    this.showLoading(70);

    this.camera = new CameraController(this.renderer.camera, this.player, this);
    this.vehicles = new VehicleManager(this.physics, this.renderer.scene, this.player, this);
    this.npcs = new NPCManager(this.physics, this.renderer.scene, this.world, this);
    this.police = new PoliceAI(this, this.physics, this.player, this.npcs, this.vehicles);
    this.npcs.game = this;
    this.combat = new CombatManager(this.physics, this.player, this.police, this);
    this.ui = new UIManager(this);
    window.gameUI = this.ui;

    this.missions.setGame(this);
    this.economy.setGame(this);

    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyP' || e.code === 'Escape') {
        if (this.state === GAME_STATE.PLAYING || this.state === GAME_STATE.PAUSED) this.togglePause();
      } else if (e.code === 'KeyM') {
        if (this.state === GAME_STATE.PLAYING || this.state === GAME_STATE.MAP) this.toggleMap();
      } else if (e.code === 'KeyI') {
        if (this.state === GAME_STATE.PLAYING || this.state === GAME_STATE.PHONE) this.togglePhone();
      } else if (e.code === 'KeyG' && this.state === GAME_STATE.PLAYING) {
        this.notify('GPS: توجه إلى العلامة على الخريطة');
      }
    });

    window.addEventListener('resize', () => this.onResize());
    this.showLoading(90);
    await new Promise((r) => setTimeout(r, 400));
    this.showLoading(100);

    document.getElementById('loading-screen').classList.add('hidden');
    this.state = GAME_STATE.MENU;
    this.ui.showMainMenu();
    this.loop();
  }

  showLoading(p) {
    const bar = document.querySelector('#loading-screen .bar');
    const txt = document.getElementById('loading-text');
    if (bar) bar.style.width = p + '%';
    if (txt && p < 100) txt.textContent = 'جاري تحميل عالم اللعبة... ' + p + '%';
  }

  startNewGame() {
    this.state = GAME_STATE.PLAYING;
    this.paused = false;
    this.ui.hideMainMenu();
    this.ui.showHUD();
    this.input.capturePointer();
    this.audio.start();
    this.player.spawn(this.world.spawnPoint);
    this.ui.updateHUD();
    this.ui.updateMoney();
    this.ui.updateWanted(0);
    this.ui.updateWeapon(this.combat.weapons[this.combat.currentWeapon]);
    this.ui.updateAmmo(this.combat.weapons[this.combat.currentWeapon]);
    this.missions.startTutorial();
  }

  continueGame() {
    const data = this.save.load();
    if (!data) { this.startNewGame(); return; }
    this.state = GAME_STATE.PLAYING;
    this.paused = false;
    this.ui.hideMainMenu();
    this.ui.showHUD();
    this.input.capturePointer();
    this.audio.start();
    this.economy.load(data.economy);
    this.player.load(data.player);
    this.world.load(data.world);
    this.missions.load(data.missions);
    this.ui.notify('تم تحميل اللعبة');
    this.player.spawn(data.player.position || this.world.spawnPoint);
  }

  togglePause() {
    if (this.state === GAME_STATE.PLAYING) {
      this.state = GAME_STATE.PAUSED;
      this.paused = true;
      this.input.releasePointer();
      this.ui.showPauseMenu();
    } else if (this.state === GAME_STATE.PAUSED) {
      this.state = GAME_STATE.PLAYING;
      this.paused = false;
      this.input.capturePointer();
      this.ui.hidePauseMenu();
    }
  }

  togglePhone() {
    if (this.state === GAME_STATE.PLAYING) {
      this.state = GAME_STATE.PHONE;
      this.paused = true;
      this.input.releasePointer();
      this.ui.showPhone();
    } else if (this.state === GAME_STATE.PHONE) {
      this.state = GAME_STATE.PLAYING;
      this.paused = false;
      this.input.capturePointer();
      this.ui.hidePhone();
    }
  }

  toggleMap() {
    if (this.state === GAME_STATE.PLAYING) {
      this.state = GAME_STATE.MAP;
      this.paused = true;
      this.input.releasePointer();
      this.ui.showMap();
    } else if (this.state === GAME_STATE.MAP) {
      this.state = GAME_STATE.PLAYING;
      this.paused = false;
      this.input.capturePointer();
      this.ui.hideMap();
    }
  }

  onResize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.renderer.onResize(this.width, this.height);
    this.camera.onResize(this.width, this.height);
  }

  loop() {
    const dt = Math.min(this.clock.getDelta(), 0.1);
    const now = performance.now();

    if (this.state === GAME_STATE.PLAYING && !this.paused) {
      this.physics.step(dt);
      this.input.update(dt);
      this.player.update(dt);
      this.camera.update(dt);
      this.vehicles.update(dt);
      this.npcs.update(dt);
      this.police.update(dt);
      this.combat.update(dt);
      this.missions.update(dt);
      this.economy.update(dt);
      this.weather.update(dt);
      this.time.update(dt);
      this.audio.update(dt, this.player);
      this.world.update(dt);
      this.ui.update(dt);
    }

    this.input.endFrame();
    this.renderer.render(this.camera.camera, this.state !== GAME_STATE.MENU && this.state !== GAME_STATE.LOADING);
    this.animationId = requestAnimationFrame(() => this.loop());
  }

  notify(msg) { this.ui.notify(msg); }

  dispose() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    this.renderer.dispose();
    this.physics.dispose();
  }
}