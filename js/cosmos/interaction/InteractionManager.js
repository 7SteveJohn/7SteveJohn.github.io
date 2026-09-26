// InteractionManager（规格书 §4/§9）：mouse target+damping（禁止直接跟随）、
// scroll 视差、Raycaster → 水面 UV、星尘世界坐标
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
    this.waterUV = new THREE.Vector2(0.5, 0.5);
    this.waterActive = false;
    this._ray = new THREE.Raycaster();
    this._ndc = new THREE.Vector2();
    this._lastMove = 0;

    addEventListener('pointermove', (e) => {
      this.target.x = (e.clientX / innerWidth) * 2 - 1;
      this.target.y = -(e.clientY / innerHeight) * 2 + 1;
      this.hasMouse = true;
      this._lastMove = performance.now();
    }, { passive: true });
    addEventListener('pointerleave', () => { this.hasMouse = false; });
    addEventListener('scroll', () => {
      this.scrollTarget = Math.min(1.5, scrollY / Math.max(1, innerHeight));
    }, { passive: true });
  }
  // waterMesh 传入做 Raycaster；无命中时 waterActive=false
  update(dtMs, waterMesh, starZ) {
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
      // 水面 UV
      const hit = this._ray.intersectObject(waterMesh, false);
      if (hit.length && hit[0].uv) {
        this.waterUV.copy(hit[0].uv);
        this.waterActive = performance.now() - this._lastMove < 120;
      } else {
        this.waterActive = false;
      }
    } else {
      this.waterActive = false;
    }
  }
  // 点击拾取：返回 {uv}（水面命中）或 {world}（星层平面命中）或 null
  pick(e, waterMesh, starZ) {
    this._ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    this._ray.setFromCamera(this._ndc, this.camera);
    const hit = this._ray.intersectObject(waterMesh, false);
    if (hit.length && hit[0].uv) return { uv: hit[0].uv.clone() };
    const o = this._ray.ray.origin, dir = this._ray.ray.direction;
    const t = (starZ - o.z) / dir.z;
    if (isFinite(t) && t > 0) return { world: new THREE.Vector3(o.x + dir.x * t, o.y + dir.y * t, starZ) };
    return null;
  }
}
