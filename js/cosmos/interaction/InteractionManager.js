// InteractionManager（IGLOO 式场景版）：mouse target+damping（禁止直接跟随）、
// scroll 视差、Raycaster → 星尘/雾原平面世界坐标
import * as THREE from 'three';

export class InteractionManager {
  constructor(cfg, camera, dom) {
    this.cfg = cfg;
    this.camera = camera;
    this.mouse = { x: 0, y: 0 };          // damped 当前值
    this.target = { x: 0, y: 0 };         // 鼠标归一化 -1..1
    this.hasMouse = false;
    this.scroll = 0; this.scrollTarget = 0;
    this.mouseWorld = new THREE.Vector3(1e9, 1e9, 0);   // 星尘平面世界坐标
    this._ray = new THREE.Raycaster();
    this._ndc = new THREE.Vector2();

    addEventListener('pointermove', (e) => {
      this.target.x = (e.clientX / innerWidth) * 2 - 1;
      this.target.y = -(e.clientY / innerHeight) * 2 + 1;
      this.hasMouse = true;
    }, { passive: true });
    addEventListener('pointerleave', () => { this.hasMouse = false; });
    addEventListener('scroll', () => {
      this.scrollTarget = Math.min(1.5, scrollY / Math.max(1, innerHeight));
    }, { passive: true });
  }
  update(dtMs, starZ) {
    const d = this.cfg.camera.damping;
    const k = 1 - Math.pow(1 - d, Math.min(dtMs, 100) / 16.7);   // 帧率无关 damping
    this.mouse.x += (this.target.x - this.mouse.x) * k;
    this.mouse.y += (this.target.y - this.mouse.y) * k;
    this.scroll += (this.scrollTarget - this.scroll) * k;

    if (this.hasMouse) {
      this._ndc.set(this.target.x, this.target.y);
      this._ray.setFromCamera(this._ndc, this.camera);
      // 星尘世界坐标：射线与 z=starZ 平面求交
      const o = this._ray.ray.origin, dir = this._ray.ray.direction;
      const t = (starZ - o.z) / dir.z;
      if (isFinite(t) && t > 0) {
        this.mouseWorld.set(o.x + dir.x * t, o.y + dir.y * t, starZ);
      }
    }
  }
  // 点击拾取：星层平面世界坐标
  pick(e, starZ) {
    this._ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    this._ray.setFromCamera(this._ndc, this.camera);
    const o = this._ray.ray.origin, dir = this._ray.ray.direction;
    const t = (starZ - o.z) / dir.z;
    if (isFinite(t) && t > 0) return new THREE.Vector3(o.x + dir.x * t, o.y + dir.y * t, starZ);
    return null;
  }
}
