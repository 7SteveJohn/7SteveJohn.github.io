// MountainLayer · Z=-3 / -2.4：远山 + 近山 alpha 剪影，遮挡关系与天然视差
import * as THREE from 'three';

function makePlane(cfg, tex, z, widthAspect) {
  const dist = cfg.camera.zPos - z;
  const viewH = 2 * dist * Math.tan(THREE.MathUtils.degToRad(cfg.camera.fov / 2));
  // 山体平面占视口底部 ~52%（贴图 ridge 在贴图内偏上），宽 ×1.5 留视差余量
  const h = viewH * 0.52;
  const w = Math.max(viewH * widthAspect * 1.5, h * (2048 / 560));
  const geo = new THREE.PlaneGeometry(w, h);
  tex.colorSpace = THREE.SRGBColorSpace;   // MeshBasicMaterial 走标准管线，会正确编码
  const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
    map: tex, alphaTest: 0.5, transparent: false, depthWrite: false  // 剪影一刀切，拒绝半透明直边
  }));
  mesh.position.z = z;
  mesh.position.y = -viewH / 2 + h / 2;   // 贴视口底
  return mesh;
}

export class MountainLayer {
  constructor(scene, cfg, texFar, texNear) {
    this.cfg = cfg;
    this.far = makePlane(cfg, texFar, cfg.layers.mountainFarZ, innerWidth / innerHeight);
    this.near = makePlane(cfg, texNear, cfg.layers.mountainNearZ, innerWidth / innerHeight);
    this.far.renderOrder = 1;
    this.near.renderOrder = 2;
    scene.add(this.far, this.near);
  }
  update() { /* 山体静止：真实感来自克制，视差由相机运动天然产生 */ }
}
