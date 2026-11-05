// js/hero-cymatics.js · 首屏 3D 拓扑谐振核心 (Interactive Cymatics Core)
// 独立承载于 Hero 右侧展台，具备 3D 自由拖拽旋转、斐波那契球面点阵、声学驻波形变与实时音频律动共振。
import * as THREE from 'three';

export function initHeroCymatics(containerId = 'hero-3d-viewport') {
  const container = document.getElementById(containerId);
  if (!container) return;

  const w = container.clientWidth || 360;
  const h = container.clientHeight || 360;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
  camera.position.z = 4.8;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0); // 纯透明背景
  container.appendChild(renderer.domElement);

  // 1. 斐波那契黄金螺旋球面点阵 (2,400 粒子)
  const ptCount = 2400;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(ptCount * 3);
  const basePos = new Float32Array(ptCount * 3);
  const colors = new Float32Array(ptCount * 3);

  const cBlue = new THREE.Color(0x2563eb); // 皇家钴蓝
  const cCyan = new THREE.Color(0x06b6d4); // 高光天青
  const cDark = new THREE.Color(0x0f172a); // 矿石深灰

  for (let i = 0; i < ptCount; i++) {
    const phi = Math.acos(1 - 2 * (i + 0.5) / ptCount);
    const theta = Math.PI * (1 + Math.sqrt(5)) * (i + 0.5);
    const r = 1.75;

    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.sin(phi) * Math.sin(theta);
    const z = r * Math.cos(phi);

    pos[i * 3] = x;
    pos[i * 3 + 1] = y;
    pos[i * 3 + 2] = z;

    basePos[i * 3] = x;
    basePos[i * 3 + 1] = y;
    basePos[i * 3 + 2] = z;

    const mixRatio = (y / r + 1) * 0.5;
    const c = cBlue.clone().lerp(cCyan, mixRatio);
    if (Math.random() > 0.82) c.lerp(cDark, 0.4);

    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }

  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.PointsMaterial({
    size: 0.055,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
  });
  const pointSphere = new THREE.Points(geo, mat);
  scene.add(pointSphere);

  // 2. 内层微光二十面体线框 (Inner Geodesic Cage)
  const cageGeo = new THREE.IcosahedronGeometry(1.15, 2);
  const cageMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    wireframe: true,
    transparent: true,
    opacity: 0.35,
  });
  const cageMesh = new THREE.Mesh(cageGeo, cageMat);
  scene.add(cageMesh);

  // 3. 鼠标 / 触控交互：3D 阻尼自由旋转
  let isDragging = false;
  let prevX = 0, prevY = 0;
  let rotX = 0.2, rotY = -0.3;
  let velX = 0, velY = 0.003; // 轻微自转初速度
  let coreMode = 0; // 0: 晶格球面, 1: 环面双扭线

  container.addEventListener('pointerdown', (e) => {
    isDragging = true;
    prevX = e.clientX;
    prevY = e.clientY;
  });

  window.addEventListener('pointermove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - prevX;
    const dy = e.clientY - prevY;
    velY = dx * 0.007;
    velX = dy * 0.007;
    rotY += velY;
    rotX += velX;
    prevX = e.clientX;
    prevY = e.clientY;
  });

  window.addEventListener('pointerup', () => {
    isDragging = false;
  });

  // 控制按键绑定
  document.getElementById('btn-core-reset')?.addEventListener('click', () => {
    rotX = 0.2;
    rotY = 0;
    velX = 0;
    velY = 0.003;
  });

  document.getElementById('btn-core-mode')?.addEventListener('click', () => {
    coreMode = (coreMode + 1) % 2;
    const btn = document.getElementById('btn-core-mode');
    if (btn) btn.textContent = coreMode === 1 ? '切换: 环面形态' : '切换: 球面形态';
  });

  // 4. 主动画循环：声学生成波形与物理形变
  let frame = 0;
  let lastTime = performance.now();
  let fpsFrames = 0;
  let fpsTimer = performance.now();
  const fpsLabel = document.getElementById('core-fps');

  function animate() {
    requestAnimationFrame(animate);
    const now = performance.now();
    const dt = (now - lastTime) * 0.001;
    lastTime = now;
    frame += dt * 2.0;

    // FPS 计算
    fpsFrames++;
    if (now - fpsTimer >= 1000) {
      if (fpsLabel) fpsLabel.textContent = `${Math.round((fpsFrames * 1000) / (now - fpsTimer))} FPS`;
      fpsFrames = 0;
      fpsTimer = now;
    }

    // 旋转惯性与自动公转
    if (!isDragging) {
      velX *= 0.94;
      velY = velY * 0.94 + 0.002 * 0.06; // 维持优雅自转
      rotX += velX;
      rotY += velY;
    }

    pointSphere.rotation.x = rotX;
    pointSphere.rotation.y = rotY;
    cageMesh.rotation.x = -rotX * 0.7;
    cageMesh.rotation.y = rotY * 1.2;

    // 音频响应 (通过 window.__BEAT 或音乐播放器状态)
    const beat = window.__BEAT || { level: 0, mid: 0, treble: 0, rawBass: 0 };
    const bass = (beat.level || 0) * 1.5;
    const mid = (beat.mid || 0) * 1.2;

    // 点阵实时形态偏微分波形调制
    const pArr = geo.attributes.position.array;
    for (let i = 0; i < ptCount; i++) {
      const bx = basePos[i * 3];
      const by = basePos[i * 3 + 1];
      const bz = basePos[i * 3 + 2];

      if (coreMode === 0) {
        // 球面声学谐振 (Spherical Harmonics 6 阶驻波)
        const wave = Math.sin(bx * 4.2 + frame) * Math.cos(by * 4.2 + frame * 0.8) * Math.sin(bz * 4.2);
        const radiusGain = 1.0 + wave * (0.16 + bass * 0.35);
        pArr[i * 3] = bx * radiusGain;
        pArr[i * 3 + 1] = by * radiusGain;
        pArr[i * 3 + 2] = bz * radiusGain;
      } else {
        // 环面折叠 (Torus Knot 拓扑形态)
        const u = (i / ptCount) * Math.PI * 2 * 3 + frame * 0.5;
        const v = (i / ptCount) * Math.PI * 2 * 2;
        const tx = (1.5 + 0.5 * Math.cos(v)) * Math.cos(u);
        const ty = (1.5 + 0.5 * Math.cos(v)) * Math.sin(u);
        const tz = 0.5 * Math.sin(v);

        pArr[i * 3] += (tx - pArr[i * 3]) * 0.08;
        pArr[i * 3 + 1] += (ty - pArr[i * 3 + 1]) * 0.08;
        pArr[i * 3 + 2] += (tz - pArr[i * 3 + 2]) * 0.08;
      }
    }
    geo.attributes.position.needsUpdate = true;

    // 晶格随低音张合微脉冲
    const scale = 1.0 + bass * 0.12 + Math.sin(frame * 1.5) * 0.03;
    cageMesh.scale.set(scale, scale, scale);

    // 亮色 / 暗色模式颜色自适应
    const isDark = document.documentElement.classList.contains('dark');
    cageMat.color.setHex(isDark ? 0x38bdf8 : 0x0284c7);
    cageMat.opacity = isDark ? 0.35 : 0.25;

    renderer.render(scene, camera);
  }

  animate();

  // 5. 响应容器尺寸变化
  const ro = new ResizeObserver(() => {
    const rw = container.clientWidth;
    const rh = container.clientHeight;
    if (rw > 0 && rh > 0) {
      camera.aspect = rw / rh;
      camera.updateProjectionMatrix();
      renderer.setSize(rw, rh);
    }
  });
  ro.observe(container);
}
