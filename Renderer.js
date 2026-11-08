import * as THREE from 'three';

export class Renderer {
  constructor(canvas, width, height) {
    this.canvas = canvas;
    this.width = width;
    this.height = height;
    this.renderer = null;
    this.scene = null;
    this.camera = null;
  }

  async init() {
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);
    this.scene.fog = new THREE.FogExp2(0x87ceeb, 0.0015);

    this.camera = new THREE.PerspectiveCamera(60, this.width / this.height, 0.1, 2000);
    this.camera.position.set(0, 5, 10);

    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambient);

    this.dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    this.dirLight.position.set(50, 100, 30);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 2048;
    this.dirLight.shadow.mapSize.height = 2048;
    this.dirLight.shadow.camera.near = 0.5;
    this.dirLight.shadow.camera.far = 500;
    this.dirLight.shadow.camera.left = -200;
    this.dirLight.shadow.camera.right = 200;
    this.dirLight.shadow.camera.top = 200;
    this.dirLight.shadow.camera.bottom = -200;
    this.scene.add(this.dirLight);

    this.hemi = new THREE.HemisphereLight(0x87ceeb, 0x111122, 0.6);
    this.scene.add(this.hemi);
  }

  onResize(width, height) {
    this.width = width;
    this.height = height;
    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  render(camera, enable) {
    if (!enable) return;
    this.renderer.render(this.scene, camera);
  }

  dispose() {
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }
}