// MountainLayer · Z=-3 / -2.4：远山 + 近山 alpha 剪影，遮挡关系与天然视差
// + 两层山间雾（IGLOO 式体积感）：半透明雾带在山与山、山与水之间缓慢漂移
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

// 雾带贴图：横向椭圆软渐变（白 → 透明），颜色由材质 tint
function fogTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(128, 64, 8, 128, 64, 120);
  grad.addColorStop(0, 'rgba(255,255,255,0.9)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0.38)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.save();
  g.translate(128, 64); g.scale(2.2, 0.55); g.translate(-128, -64);  // 压扁成横条雾带
  g.fillStyle = grad;
  g.fillRect(-40, -80, 340, 290);
  g.restore();
  return new THREE.CanvasTexture(c);
}

function makeFog(cfg, z, yOff, hFrac, color, opacity) {
  const dist = cfg.camera.zPos - z;
  const viewH = 2 * dist * Math.tan(THREE.MathUtils.degToRad(cfg.camera.fov / 2));
  const h = viewH * hFrac;
  const w = viewH * (innerWidth / innerHeight) * 1.8;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({
      map: fogTexture(), transparent: true, opacity, depthWrite: false,
      color, blending: THREE.NormalBlending
    })
  );
  mesh.position.set(0, -viewH / 2 + yOff, z);
  mesh.renderOrder = 3;   // 山(1/2)之后、水(4)之前
  return mesh;
}

export class MountainLayer {
  constructor(scene, cfg, texFar, texNear) {
    this.cfg = cfg;
    this.far = makePlane(cfg, texFar, cfg.layers.mountainFarZ, innerWidth / innerHeight);
    this.near = makePlane(cfg, texNear, cfg.layers.mountainNearZ, innerWidth / innerHeight);
    this.far.renderOrder = 1;
    this.near.renderOrder = 2;
    // 雾一：远山与近山之间；雾二：山根与水面交界（❗z=0.8 放到水面 z=0.5 之前，
    // 否则不透明水面写深度会把身后的雾整个挡掉——IGLOO 视频里雾就压在山水交界处）
    this.fogA = makeFog(cfg, 0.8, 0.12, 0.30, 0x3a4f6c, 0.26);
    this.fogB = makeFog(cfg, 0.9, 0.00, 0.20, 0x30415c, 0.20);
    scene.add(this.far, this.near, this.fogA, this.fogB);
  }
  update(t) {
    // 缓慢对漂：IGLOO 的雾是活的但不吵
    this.fogA.position.x = Math.sin(t * 0.045) * 0.9;
    this.fogB.position.x = Math.sin(t * 0.03 + 2.1) * -1.2;
    this.fogA.material.opacity = 0.30 + Math.sin(t * 0.11) * 0.05;
    this.fogB.material.opacity = 0.22 + Math.sin(t * 0.09 + 1.3) * 0.04;
  }
}
