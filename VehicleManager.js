import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class VehicleManager {
  constructor(physics, scene, player, game) {
    this.physics = physics;
    this.scene = scene;
    this.player = player;
    this.game = game;
    this.vehicles = [];
    this.traffic = [];
    this.tempV = new THREE.Vector3();
  }

  async init() {
    this.spawnTraffic();
  }

  spawnTraffic() {
    const positions = [
      [-200, 0, -200], [200, 0, 200], [-400, 0, 100], [400, 0, -100],
      [-600, 0, 0], [600, 0, 0], [0, 0, -500], [0, 0, 500],
    ];
    positions.forEach((p, i) => this.spawnCar(p[0], p[1], p[2], i % 2 === 0 ? 0xff4444 : 0x4444ff));
  }

  spawnCar(x, y, z, color = 0x888888) {
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.6 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 4), bodyMat);
    body.position.y = 0.9;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.9, 1.6), new THREE.MeshStandardMaterial({ color: 0x222222 }));
    cabin.position.set(0, 1.45, 0);
    cabin.castShadow = true;
    group.add(cabin);

    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    const wheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.7, 16);
    const wheelPos = [[-1.1, 0.6, 1.6], [1.1, 0.6, 1.6], [-1.1, 0.6, -1.6], [1.1, 0.6, -1.6]];
    wheelPos.forEach((p) => {
      const w = new THREE.Mesh(wheelGeo, wheelMat);
      w.position.set(p[0], p[1], p[2]);
      w.rotation.x = Math.PI / 2;
      w.castShadow = true;
      group.add(w);
    });

    group.position.set(x, y, z);
    this.scene.add(group);

    const shape = new CANNON.Box(new CANNON.Vec3(1, 0.5, 2));
    const bodyPhys = new CANNON.Body({ mass: 900, shape, linearDamping: 0.3, angularDamping: 0.6 });
    bodyPhys.position.set(x, y + 1, z);
    this.physics.addBody(bodyPhys, group);

    const veh = {
      mesh: group,
      body: bodyPhys,
      color,
      speed: 0,
      maxSpeed: 40,
      fuel: 100,
      driver: null,
      engineOn: false,
      headlights: [],
      brakeLights: [],
      lastInput: { forward: 0, steer: 0, brake: false },
    };
    this.vehicles.push(veh);
    this.traffic.push(veh);
    return veh;
  }

  getNearestVehicle(pos, radius) {
    let nearest = null;
    let best = radius;
    for (const v of this.vehicles) {
      if (v.driver) continue;
      const d = v.body.position.distanceTo(pos);
      if (d < best) { best = d; nearest = v; }
    }
    return nearest;
  }

  update(dt) {
    this.traffic.forEach((v) => this.updateTraffic(v, dt));
    this.vehicles.forEach((v) => {
      if (v.driver === this.player && this.player.inVehicle === v) this.updatePlayerVehicle(v, dt);
      this.syncMesh(v);
    });
  }

  updateTraffic(v, dt) {
    const target = new THREE.Vector3(Math.sin(v.body.position.x * 0.001 + Date.now() * 0.001) * 300, 0, Math.cos(v.body.position.z * 0.001) * 300);
    const dir = target.clone().sub(v.body.position).normalize();
    const force = dir.multiplyScalar(600);
    v.body.applyForce(force, v.body.position);
    v.body.velocity.x = THREE.MathUtils.lerp(v.body.velocity.x, force.x * 0.005, 0.05);
    v.body.velocity.z = THREE.MathUtils.lerp(v.body.velocity.z, force.z * 0.005, 0.05);
    const speed = Math.sqrt(v.body.velocity.x ** 2 + v.body.velocity.z ** 2);
    v.mesh.lookAt(v.body.position.clone().add(dir));
  }

  updatePlayerVehicle(v, dt) {
    const input = this.game.input;
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(v.mesh.quaternion);
    forward.y = 0; forward.normalize();

    let engineForce = 0;
    if (input.isPressed('KeyW')) engineForce = 1200;
    if (input.isPressed('KeyS')) engineForce = -700;
    if (engineForce !== 0) v.body.applyForce(forward.multiplyScalar(engineForce), v.body.position);

    const steer = (input.isPressed('KeyA') ? 1 : 0) - (input.isPressed('KeyD') ? 1 : 0);
    const steerForce = new CANNON.Vec3(0, 0, steer * 300);
    v.body.applyTorque(steerForce);

    if (input.isPressed('Space')) {
      v.body.velocity.x *= 0.9;
      v.body.velocity.z *= 0.9;
    }

    const speed = Math.sqrt(v.body.velocity.x ** 2 + v.body.velocity.z ** 2);
    v.speed = speed;
    if (speed > 0.5) v.mesh.lookAt(v.body.position.clone().add(v.body.velocity.clone().normalize().multiplyScalar(3)));
  }

  syncMesh(v) {
    v.mesh.position.copy(v.body.position);
    v.mesh.quaternion.copy(v.body.quaternion);
    if (v.headlights) v.headlights.forEach((l) => { l.visible = v.engineOn; });
  }
}