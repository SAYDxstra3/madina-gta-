import * as CANNON from 'cannon-es';

export class PhysicsManager {
  constructor() {
    this.world = null;
    this.bodies = new Map();
  }

  async init() {
    this.world = new CANNON.World();
    this.world.gravity.set(0, -9.82, 0);
    this.world.broadphase = new CANNON.SAPBroadphase(this.world);
    this.world.solver.iterations = 10;
    this.world.solver.tolerance = 0.001;
    this.world.allowSleep = true;

    const groundMat = new CANNON.Material('ground');
    const playerMat = new CANNON.Material('player');
    const vehicleMat = new CANNON.Material('vehicle');
    const groundGround = new CANNON.ContactMaterial(groundMat, groundMat, { friction: 0.8, restitution: 0.1 });
    const playerGround = new CANNON.ContactMaterial(playerMat, groundMat, { friction: 0.9, restitution: 0.0 });
    const vehicleGround = new CANNON.ContactMaterial(vehicleMat, groundMat, { friction: 0.9, restitution: 0.1 });
    this.world.addContactMaterial(groundGround);
    this.world.addContactMaterial(playerGround);
    this.world.addContactMaterial(vehicleGround);
  }

  step(dt) {
    this.world.step(1 / 60, dt, 3);
    for (const [mesh, body] of this.bodies) {
      if (mesh && body) {
        mesh.position.copy(body.position);
        mesh.quaternion.copy(body.quaternion);
        if (mesh.userData.onPhysicsUpdate) mesh.userData.onPhysicsUpdate(body);
      }
    }
  }

  addBody(body, mesh = null) {
    this.world.addBody(body);
    if (mesh) this.bodies.set(mesh, body);
    return body;
  }

  removeBody(body, mesh = null) {
    this.world.removeBody(body);
    if (mesh) this.bodies.delete(mesh);
  }

  raycast(from, to, result) {
    this.world.raycast(from, to, { skipBackfaces: true }, result);
  }

  dispose() {
    this.world = null;
    this.bodies.clear();
  }
}