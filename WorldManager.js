import * as THREE from 'three';
import * as CANNON from 'cannon-es';

const BUILDING_STYLES = [
  { color: 0xdddddd, roof: 0xaaaaaa },
  { color: 0xeeeeee, roof: 0x888888 },
  { color: 0xcccccc, roof: 0x666666 },
  { color: 0xaaaaaa, roof: 0x444444 },
  { color: 0x888888, roof: 0x222222 },
];

export class WorldManager {
  constructor(scene, physics, game) {
    this.scene = scene;
    this.physics = physics;
    this.game = game;
    this.spawnPoint = new THREE.Vector3(0, 1, 0);
    this.buildings = [];
    this.roads = [];
    this.props = [];
    this.chunkSize = 200;
    this.loadedChunks = new Set();
    this.citySize = 1200;
  }

  async init() {
    this.createGround();
    this.createRoads();
    this.generateCity();
    this.createStreetLights();
    this.createProps();
  }

  createGround() {
    const geo = new THREE.PlaneGeometry(4000, 4000, 64, 64);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshStandardMaterial({ color: 0x2d3a2e, roughness: 1 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    this.scene.add(mesh);

    const body = new CANNON.Body({ mass: 0, shape: new CANNON.Plane(), material: new CANNON.Material() });
    body.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    this.physics.addBody(body);
  }

  createRoads() {
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.8 });
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    const makeRoad = (x, z, w, d, rot = 0) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, 0.1, d), roadMat);
      mesh.position.set(x, 0.06, z);
      mesh.rotation.y = rot;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
      this.roads.push(mesh);
    };

    // Main grid
    for (let i = -6; i <= 6; i++) {
      makeRoad(0, i * 180, 60, 4000);
      makeRoad(i * 180, 0, 4000, 60);
    }
    // Highways
    makeRoad(0, -540, 100, 4000);
    makeRoad(0, 540, 100, 4000);
    makeRoad(-540, 0, 4000, 100);
    makeRoad(540, 0, 4000, 100);
  }

  generateCity() {
    const block = 180;
    const half = this.citySize / 2;
    for (let x = -half; x < half; x += block) {
      for (let z = -half; z < half; z += block) {
        if (Math.abs(x) < 70 && Math.abs(z) < 70) continue; // center plaza
        const style = BUILDING_STYLES[Math.floor(Math.random() * BUILDING_STYLES.length)];
        const w = 40 + Math.random() * 60;
        const d = 40 + Math.random() * 60;
        const h = 10 + Math.random() * 180;
        this.addBuilding(x + block / 2, z + block / 2, w, d, h, style);
      }
    }
    // Center plaza fountain
    const fountain = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 1, 32), new THREE.MeshStandardMaterial({ color: 0x888888 }));
    base.position.y = 0.5;
    const water = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 0.2, 32), new THREE.MeshStandardMaterial({ color: 0x22aaff }));
    water.position.y = 1.0;
    fountain.add(base, water);
    fountain.position.set(0, 0, 0);
    this.scene.add(fountain);
  }

  addBuilding(x, z, w, d, h, style) {
    const group = new THREE.Group();
    const bodyGeo = new THREE.BoxGeometry(w, h, d);
    const bodyMat = new THREE.MeshStandardMaterial({ color: style.color, roughness: 0.7, metalness: 0.1 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = h / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    const roofGeo = new THREE.BoxGeometry(w * 1.05, 4, d * 1.05);
    const roof = new THREE.Mesh(roofGeo, new THREE.MeshStandardMaterial({ color: style.roof }));
    roof.position.y = h / 2 + 2;
    roof.castShadow = true;
    roof.receiveShadow = true;
    group.add(roof);

    // Windows
    const winMat = new THREE.MeshBasicMaterial({ color: 0x112244 });
    const rows = Math.floor(h / 6);
    for (let r = 0; r < rows; r++) {
      const yy = -h / 2 + 2 + r * 5.5;
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          const win = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 0.1), winMat);
          win.position.set(sx * (w / 2 - 1.5), yy, sz * (d / 2 + 0.06));
          win.rotation.y = sz === 1 ? 0 : Math.PI;
          group.add(win);
        }
      }
      for (const sz of [-1, 1]) {
        for (const sx of [-1, 1]) {
          const win = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2, 2), winMat);
          win.position.set(sx * (w / 2 + 0.06), yy, sz * (d / 2 - 1.5));
          win.rotation.y = sx === 1 ? Math.PI / 2 : -Math.PI / 2;
          group.add(win);
        }
      }
    }

    group.position.set(x, 0, z);
    this.scene.add(group);
    this.buildings.push(group);

    const bodyPhys = new CANNON.Body({ mass: 0, shape: new CANNON.Box(new CANNON.Vec3(w / 2, h / 2, d / 2)) });
    bodyPhys.position.set(x, h / 2, z);
    this.physics.addBody(bodyPhys);
  }

  createStreetLights() {
    const spacing = 80;
    for (let i = -6; i <= 6; i++) {
      for (const side of [-1, 1]) {
        this.addStreetLight(i * spacing * 2, side * 35, i % 2 === 0);
        this.addStreetLight(side * 35, i * spacing * 2, i % 2 === 0);
      }
    }
  }

  addStreetLight(x, z, withLight = true) {
    const group = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 8, 8), new THREE.MeshStandardMaterial({ color: 0x333333 }));
    pole.position.y = 4;
    group.add(pole);
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.6, 0.4, 8), new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0xffeb3b, emissiveIntensity: 0.4 }));
    lamp.position.set(0, 8, 0);
    group.add(lamp);
    if (withLight) {
      const light = new THREE.PointLight(0xfff5e1, 0.5, 22, 2);
      light.position.set(0, 8.2, 0);
      light.castShadow = false;
      group.add(light);
    }
    group.position.set(x, 0, z);
    this.scene.add(group);
    this.props.push(group);
  }

  createProps() {
    // Trees around edges
    for (let i = 0; i < 120; i++) {
      const ang = Math.random() * Math.PI * 2;
      const r = 500 + Math.random() * 100;
      const x = Math.cos(ang) * r;
      const z = Math.sin(ang) * r;
      this.addTree(x, z);
    }
  }

  addTree(x, z) {
    const group = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 3, 8), new THREE.MeshStandardMaterial({ color: 0x3d2b1f }));
    trunk.position.y = 1.5;
    group.add(trunk);
    const leaves = new THREE.Mesh(new THREE.ConeGeometry(2.5, 5, 8), new THREE.MeshStandardMaterial({ color: 0x2d5a27 }));
    leaves.position.y = 5;
    group.add(leaves);
    group.position.set(x, 0, z);
    this.scene.add(group);
    this.props.push(group);
  }

  update(dt) {
    const time = this.game.time;
    if (time) {
      const hour = time.hour;
      const night = hour < 6 || hour > 20;
      const intensity = night ? 0.35 : 0.05;
      this.rendererDirLight(intensity, night);
    }
  }

  rendererDirLight(intensity, night) {
    const r = this.game.renderer;
    r.dirLight.intensity = night ? 0.25 : 1.0;
    r.dirLight.color.setHex(night ? 0x222244 : 0xffffff);
    r.hemi.intensity = night ? 0.15 : 0.6;
    r.hemi.color.setHex(night ? 0x111a2b : 0x87ceeb);
    r.scene.background.setHex(night ? 0x05070a : 0x87ceeb);
    r.scene.fog.color.setHex(night ? 0x05070a : 0x87ceeb);
  }

  load(data) { /* placeholder for future chunk loading */ }
}