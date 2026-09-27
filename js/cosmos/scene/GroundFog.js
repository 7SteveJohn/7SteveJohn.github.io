// GroundFog · 雾原地面层（IGLOO 式场景替换版，替代旧 WaterLayer）
// 3 层雾带铺满底部，不同速度漂移；Bass 让最前层变浓（音频律动保留，幅度克制）
// z 在 0.6~1.1（水面旧位），星尘 z=1.5 在雾前面飘
import * as THREE from 'three';

function fogTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(128, 64, 8, 128, 64, 120);
  grad.addColorStop(0, 'rgba(255,255,255,0.95)');
  grad.addColorStop(0.45, 'rgba(255,255,255,0.45)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.save();
  g.translate(128, 64); g.scale(2.4, 0.5); g.translate(-128, -64);
  g.fillStyle = grad;
  g.fillRect(-40, -80, 340, 290);
  g.restore();
  return new THREE.CanvasTexture(c);
}

export class GroundFog {
  constructor(scene, cfg) {
    this.cfg = cfg;
    const viewH0 = 2 * cfg.camera.zPos * Math.tan(THREE.MathUtils.degToRad(cfg.camera.fov / 2));
    const aspect = innerWidth / innerHeight;
    this.layers = [];
    const L = [
      { z: 0.6, hF: 0.20, o: 0.16, col: 0x2b3c55, sp: 0.040, amp: 1.4, ph: 0.0 },
      { z: 0.85, hF: 0.26, o: 0.24, col: 0x364a66, sp: 0.028, amp: 1.9, ph: 2.1 },
      { z: 1.10, hF: 0.34, o: 0.30, col: 0x3e5474, sp: 0.019, amp: 2.5, ph: 4.2 }
    ];
    const tex = fogTexture();
    for (const l of L) {
      const dist = cfg.camera.zPos - l.z;
      const viewH = 2 * dist * Math.tan(THREE.MathUtils.degToRad(cfg.camera.fov / 2));
      const h = viewH * l.hF;
      const w = viewH * aspect * 2.0;
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(w, h),
        new THREE.MeshBasicMaterial({
          map: tex, transparent: true, opacity: l.o, depthWrite: false,
          color: l.col, blending: THREE.NormalBlending
        })
      );
      mesh.position.set(0, -viewH / 2 + h * 0.30, l.z);
      mesh.renderOrder = 3;
      mesh.userData = { baseO: l.o, sp: l.sp, amp: l.amp, ph: l.ph };
      this.layers.push(mesh);
      scene.add(mesh);
    }
    this.viewH0 = viewH0;
  }
  update(t, bass) {
    for (const m of this.layers) {
      const u = m.userData;
      m.position.x = Math.sin(t * u.sp + u.ph) * u.amp;
      m.material.opacity = u.baseO + Math.sin(t * 0.10 + u.ph) * 0.04 + bass * 0.10;
    }
  }
  fitAspect(aspect) {
    for (const m of this.layers) {
      const dist = this.cfg.camera.zPos - m.position.z;
      const viewH = 2 * dist * Math.tan(THREE.MathUtils.degToRad(this.cfg.camera.fov / 2));
      m.scale.x = Math.max(1, viewH * aspect * 2.0 / (viewH * 2.0));
    }
  }
}
