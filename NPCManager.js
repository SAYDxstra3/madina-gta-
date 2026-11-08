import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class NPCManager {
  constructor(physics, scene, world, game) {
    this.physics = physics;
    this.scene = scene;
    this.world = world;
    this.game = game;
    this.npcs = [];
  }

  async init() {
    for (let i = 0; i < 16; i++) {
      const x = (Math.random() - 0.5) * 800;
      const z = (Math.random() - 0.5) * 800;
      this.spawnPedestrian(x, z);
    }
  }

  spawnPedestrian(x, z) {
    const group = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.3), new THREE.MeshStandardMaterial({ color: 0xaaaaaa }));
    body.position.y = 0.85;
    group.add(body);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), new THREE.MeshStandardMaterial({ color: 0xe0ac7c }));
    head.position.y = 1.6;
    group.add(head);
    group.position.set(x, 0, z);
    group.userData = { hittable: true, pedestrian: true, entity: null };
    this.scene.add(group);

    const shape = new CANNON.Cylinder(0.2, 0.2, 1.2, 8);
    const phy = new CANNON.Body({ mass: 10, shape, linearDamping: 0.6 });
    phy.position.set(x, 1, z);
    this.physics.addBody(phy, group);

    const npc = { mesh: group, body: phy, state: 'walk', target: new THREE.Vector3(x, 0, z), timer: Math.random() * 5 };
    npc.takeDamage = (dmg) => {
      this.game.notify('أصيب أحد المارة');
      if (this.game.police) this.game.police.increaseWanted(1);
    };
    group.userData.entity = npc;
    group.traverse((c) => { c.userData.hittable = true; c.userData.entity = npc; });
    this.npcs.push(npc);
  }

  update(dt) {
    this.npcs.forEach((n) => {
      if (n.state === 'walk') {
        n.timer -= dt;
        if (n.timer <= 0) {
          n.target.set((Math.random() - 0.5) * 100, 0, (Math.random() - 0.5) * 100);
          n.target.add(this.game.player.mesh.position);
          n.timer = 3 + Math.random() * 5;
        }
        const dir = n.target.clone().sub(n.body.position).normalize();
        n.body.applyForce(dir.multiplyScalar(8), n.body.position);
        if (n.body.position.distanceTo(n.target) < 2) n.state = 'idle';
        n.mesh.lookAt(n.body.position.clone().add(dir.multiplyScalar(2)));
      } else {
        n.timer -= dt;
        if (n.timer <= 0) n.state = 'walk';
      }
      n.mesh.position.copy(n.body.position);
      n.mesh.position.y += 0.6;
      n.mesh.quaternion.copy(n.body.quaternion);

      const playerDist = n.body.position.distanceTo(this.game.player.body.position);
      if (playerDist < 4) {
        const away = n.body.position.clone().sub(this.game.player.body.position).normalize();
        n.body.applyForce(away.multiplyScalar(15), n.body.position);
      }
    });
  }
}