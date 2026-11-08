export class PoliceAI {
  constructor(game, physics, player, npcs, vehicles) {
    this.game = game;
    this.physics = physics;
    this.player = player;
    this.npcs = npcs;
    this.vehicles = vehicles;
    this.wantedLevel = 0;
    this.wantedTimer = 0;
    this.policeUnits = [];
  }

  update(dt) {
    if (this.wantedLevel > 0) {
      this.wantedTimer += dt;
      if (this.wantedTimer > 4) {
        this.wantedTimer = 0;
        this.reduceWanted(0.05);
      }
      this.game.ui.updateWanted(this.wantedLevel);
    } else {
      this.game.ui.updateWanted(0);
    }
    this.policeUnits.forEach((u) => {
      if (!u.active) return;
      const dir = this.player.body.position.clone().sub(u.body.position).normalize();
      u.body.applyForce(dir.multiplyScalar(60), u.body.position);
      u.mesh.position.copy(u.body.position);
      u.mesh.position.y += 0.6;
      u.mesh.lookAt(this.player.body.position);
    });
  }

  increaseWanted(amount = 1) {
    this.wantedLevel = Math.min(6, this.wantedLevel + amount);
    this.game.notify(`مستوى المطلوب: ${this.wantedLevel}`);
    this.spawnPolice();
  }

  reduceWanted(amount) {
    this.wantedLevel = Math.max(0, this.wantedLevel - amount);
    if (this.wantedLevel === 0) this.game.notify('انتهى पी追و البوليس'.replace('पी追و', 'المطاردة'));
  }

  spawnPolice() {
    const count = Math.min(2 + Math.floor(this.wantedLevel / 2), 6);
    while (this.policeUnits.length < count) {
      const x = this.player.body.position.x + (Math.random() - 0.5) * 100;
      const z = this.player.body.position.z + (Math.random() - 0.5) * 100;
      const group = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.3), new THREE.MeshStandardMaterial({ color: 0x0000aa }));
      body.position.y = 0.85;
      group.add(body);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), new THREE.MeshStandardMaterial({ color: 0xffffff }));
      head.position.y = 1.6;
      group.add(head);
      group.position.set(x, 0, z);
      group.userData = { hittable: true, police: true, entity: null };
      this.game.renderer.scene.add(group);

      const shape = new CANNON.Cylinder(0.2, 0.2, 1.2, 8);
      const phy = new CANNON.Body({ mass: 70, shape });
      phy.position.set(x, 1, z);
      this.physics.addBody(phy, group);

      const pu = { mesh: group, body: phy, active: true };
      pu.takeDamage = (dmg) => { this.increaseWanted(1); };
      group.userData.entity = pu;
      group.traverse((c) => { c.userData.hittable = true; c.userData.entity = pu; });
      this.policeUnits.push(pu);
    }
  }

  checkCrime(type) {
    const near = this.vehicles.traffic.some((v) => v.body.position.distanceTo(this.player.body.position) < 30);
    if (near && Math.random() < 0.3) this.increaseWanted(1);
  }
}