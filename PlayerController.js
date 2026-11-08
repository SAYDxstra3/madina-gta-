import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class PlayerController {
  constructor(physics, camera, game) {
    this.physics = physics;
    this.camera = camera;
    this.game = game;
    this.mesh = null;
    this.body = null;
    this.cameraRig = null;
    this.height = 1.7;
    this.speed = 5.5;
    this.sprintSpeed = 9.5;
    this.velocity = new THREE.Vector3();
    this.grounded = false;
    this.health = 100;
    this.armor = 0;
    this.inVehicle = null;
    this.controlsEnabled = false;
    this.animTime = 0;
    this.limbs = {};
  }

  async init() {
    this.createCharacter();
    const shape = new CANNON.Cylinder(0.35, 0.35, this.height, 12);
    this.body = new CANNON.Body({ mass: 70, shape, linearDamping: 0.4, allowSleep: false, material: new CANNON.Material('player') });
    this.body.position.copy(this.game.world.spawnPoint);
    this.body.position.y += 2;
    this.body.fixedRotation = true;
    this.physics.addBody(this.body, this.mesh);
  }

  createCharacter() {
    const group = new THREE.Group();
    const skin = 0xe0ac7c;
    const cloth = 0x223355;

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.3), new THREE.MeshStandardMaterial({ color: cloth }));
    torso.position.y = 0.85;
    group.add(torso);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.32, 0.32), new THREE.MeshStandardMaterial({ color: skin }));
    head.position.y = 1.55;
    group.add(head);

    const lArm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.6, 0.18), new THREE.MeshStandardMaterial({ color: skin }));
    lArm.position.set(-0.34, 1.0, 0);
    group.add(lArm);
    const rArm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.6, 0.18), new THREE.MeshStandardMaterial({ color: skin }));
    rArm.position.set(0.34, 1.0, 0);
    group.add(rArm);

    const lLeg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.8, 0.22), new THREE.MeshStandardMaterial({ color: 0x222222 }));
    lLeg.position.set(-0.16, 0.3, 0);
    group.add(lLeg);
    const rLeg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.8, 0.22), new THREE.MeshStandardMaterial({ color: 0x222222 }));
    rLeg.position.set(0.16, 0.3, 0);
    group.add(rLeg);

    group.traverse((c) => {
      if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; c.userData.hittable = true; c.userData.entity = this; }
    });
    group.userData = { hittable: true, entity: this };
    this.mesh = group;
    this.limbs = { torso, head, lArm, rArm, lLeg, rLeg };
    this.game.renderer.scene.add(group);
  }

  spawn(pos) {
    this.body.position.set(pos.x, pos.y + 2, pos.z);
    this.body.velocity.set(0, 0, 0);
    this.body.angularVelocity.set(0, 0, 0);
    this.mesh.position.copy(this.body.position);
    this.mesh.quaternion.copy(this.body.quaternion);
    if (this.game.camera) this.game.camera.setTarget(this.mesh, 'player');
    this.controlsEnabled = true;
    this.inVehicle = null;
  }

  load(data) {
    this.health = data.health || 100;
    this.armor = data.armor || 0;
  }

  update(dt) {
    if (!this.controlsEnabled || !this.body || this.game.paused) return;
    if (this.inVehicle) return;

    const input = this.game.input;
    const cam = this.game.renderer.camera;
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
    forward.y = 0; forward.normalize();
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(cam.quaternion);
    right.y = 0; right.normalize();

    const move = new THREE.Vector3();
    if (input.isPressed('KeyW')) move.add(forward);
    if (input.isPressed('KeyS')) move.sub(forward);
    if (input.isPressed('KeyD')) move.add(right);
    if (input.isPressed('KeyA')) move.sub(right);
    if (move.length() > 0) move.normalize();

    const run = input.isPressed('ShiftLeft') || input.isPressed('ShiftRight');
    const targetSpeed = run ? this.sprintSpeed : this.speed;
    const force = move.multiplyScalar(targetSpeed * 40);

    this.body.applyForce(force, this.body.position);
    this.body.velocity.x = THREE.MathUtils.lerp(this.body.velocity.x, force.x, 0.25);
    this.body.velocity.z = THREE.MathUtils.lerp(this.body.velocity.z, force.z, 0.25);
    this.body.velocity.y = this.body.velocity.y;

    const flatSpeed = Math.sqrt(this.body.velocity.x ** 2 + this.body.velocity.z ** 2);
    this.grounded = Math.abs(this.body.velocity.y) < 0.1;

    if (flatSpeed > 0.3) {
      this.animTime += dt * (flatSpeed / targetSpeed) * 12;
      this.mesh.lookAt(this.mesh.position.clone().add(move));
    }

    // Jump
    if (input.wasPressed('Space') && this.grounded) {
      this.body.applyForce(new CANNON.Vec3(0, 320, 0), this.body.position);
    }

    // Crouch
    const crouch = input.isPressed('KeyC');
    this.mesh.scale.y = crouch ? 0.55 : 1;
    this.mesh.position.y = this.body.position.y + (this.height / 2) * this.mesh.scale.y;

    // Interact / Enter vehicle
    if (input.wasPressed('KeyE')) {
      const veh = this.game.vehicles.getNearestVehicle(this.mesh.position, 6);
      if (veh && !this.inVehicle) {
        this.enterVehicle(veh);
      } else if (this.inVehicle) {
        this.exitVehicle();
      }
    }

    // Sync mesh
    this.mesh.position.copy(this.body.position);
    this.mesh.position.y += (this.height / 2) * this.mesh.scale.y;
    this.mesh.quaternion.copy(this.body.quaternion);

    this.animateLimbs(dt, flatSpeed, crouch);
  }

  animateLimbs(dt, speed, crouch) {
    const t = this.animTime;
    const walk = speed > 0.5 ? Math.sin(t * 8) * 0.4 : 0;
    const { lLeg, rLeg, lArm, rArm, torso } = this.limbs;
    if (lLeg) lLeg.rotation.x = walk;
    if (rLeg) rLeg.rotation.x = -walk;
    if (lArm) lArm.rotation.x = -walk * 0.6;
    if (rArm) rArm.rotation.x = walk * 0.6;
    if (torso) torso.rotation.x = crouch ? 0.2 : 0;
  }

  enterVehicle(vehicle) {
    this.inVehicle = vehicle;
    this.controlsEnabled = false;
    this.mesh.visible = false;
    this.game.camera.setTarget(vehicle.mesh, 'vehicle');
    vehicle.driver = this;
    this.game.notify('تم ركوب المركبة');
  }

  exitVehicle() {
    if (!this.inVehicle) return;
    const v = this.inVehicle;
    this.inVehicle.driver = null;
    this.inVehicle = null;
    this.controlsEnabled = true;
    this.mesh.visible = true;
    this.mesh.position.copy(v.mesh.position).add(new THREE.Vector3(3, 0, 0));
    this.body.position.copy(this.mesh.position);
    this.body.velocity.set(0, 0, 0);
    this.game.camera.setTarget(this.mesh, 'player');
    this.game.notify('تم مغادرة المركبة');
  }

  takeDamage(amount) {
    let dmg = amount;
    if (this.armor > 0) {
      const absorb = Math.min(this.armor, dmg);
      this.armor -= absorb;
      dmg -= absorb;
    }
    this.health = Math.max(0, this.health - dmg);
    this.game.ui.updateHUD();
    if (this.health <= 0) this.die();
  }

  die() {
    this.controlsEnabled = false;
    this.game.notify('لقد ومضت');
    setTimeout(() => {
      this.health = 100;
      this.armor = 0;
      this.controlsEnabled = true;
      this.spawn(this.game.world.spawnPoint);
      this.game.notify('لقد انتعشت');
    }, 2500);
  }
}