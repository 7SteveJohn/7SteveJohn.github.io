// MonolithField.js · 极简黑曜石天光虚空 (Minimal Monolith Void)
// 极致克制与减法：完全不设任何复杂线条与几何体，仅留一束电影级深空微天光静谧呼吸。
import * as THREE from 'three';

const VERT = /* glsl */`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const FRAG = /* glsl */`
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform vec2 uRes;
  uniform vec2 uCursor;
  uniform float uBass;
  uniform float uBeat;
  uniform float uDark;

  // 极轻量胶片微颗粒
  float grain(vec2 uv, float t) {
    return fract(sin(dot(uv + t * 0.001, vec2(12.9898, 78.233))) * 43758.5453);
  }

  void main() {
    vec2 uv = (gl_FragCoord.xy * 2.0 - uRes) / min(uRes.x, uRes.y);
    
    // 天顶光源 (Celestial Horizon Beam)
    vec2 lightOrigin = vec2(0.0, 1.4);
    float dLight = length(uv - lightOrigin);
    
    // 柔和体积光锥
    float beam = exp(-dLight * 1.25) * 0.9;
    // 随低频柔和呼吸
    beam *= (1.0 + uBass * 0.28 + uBeat * 0.15);

    // 鼠标微量扰动光心
    vec2 m = (uCursor * 2.0 - uRes) / min(uRes.x, uRes.y);
    float dMouse = length(uv - m);
    float mouseGlow = exp(-dMouse * 2.2) * 0.08;

    // 暗色模式底色 (宇宙黑曜石 #060911)
    vec3 colBaseDark = vec3(0.024, 0.035, 0.067);
    vec3 colBeamDark = vec3(0.15, 0.38, 0.65); // 电光冷青天光
    vec3 colDeepDark = vec3(0.012, 0.018, 0.032);
    
    vec3 darkCol = mix(colDeepDark, colBaseDark, clamp(uv.y * 0.5 + 0.5, 0.0, 1.0));
    darkCol += colBeamDark * beam * 0.45;
    darkCol += vec3(0.0, 0.55, 0.85) * mouseGlow;

    // 亮色模式底色 (晨曦纯净白底 #f8fafc)
    vec3 colBaseLight = vec3(0.975, 0.982, 0.995);
    vec3 colBeamLight = vec3(0.10, 0.52, 0.92); // 晨曦纯净天光
    float beamEnergy = pow(beam, 1.4) * (0.32 + uBass * 0.45 + uBeat * 0.2);
    vec3 lightCol = mix(colBaseLight, colBeamLight, clamp(beamEnergy, 0.0, 0.55));

    vec3 finalCol = mix(lightCol, darkCol, uDark);

    // 0.8% 细腻胶片颗粒质感
    float g = (grain(gl_FragCoord.xy, uTime) - 0.5) * 0.018;
    finalCol += vec3(g);

    gl_FragColor = vec4(finalCol, 1.0);
  }
`;

export class MonolithField {
  constructor(scene) {
    this.scene = scene;
    const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
    this.uDark = isDark ? 1.0 : 0.0;
    this.geo = new THREE.PlaneGeometry(2, 2);
    this.mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: {
        uTime: { value: 0 },
        uRes: { value: new THREE.Vector2(innerWidth, innerHeight) },
        uCursor: { value: new THREE.Vector2(innerWidth * 0.5, innerHeight * 0.5) },
        uBass: { value: 0 },
        uBeat: { value: 0 },
        uDark: { value: this.uDark },
      },
      depthWrite: false,
      depthTest: false,
    });
    this.mesh = new THREE.Mesh(this.geo, this.mat);
    this.mesh.frustumCulled = false;
    this.scene.add(this.mesh);
  }

  setRes(w, h) {
    this.mat.uniforms.uRes.value.set(w, h);
  }

  onBeat(strength = 0.5) {
    this.mat.uniforms.uBeat.value = strength;
  }

  kick(x, y) {}

  update(sceneT, audio, interaction, dtMs) {
    this.mat.uniforms.uTime.value = sceneT;
    const isDark = document.documentElement.classList.contains('dark');
    this.uDark += ((isDark ? 1.0 : 0.0) - this.uDark) * 0.08;
    this.mat.uniforms.uDark.value = this.uDark;

    if (audio) {
      this.mat.uniforms.uBass.value = audio.bass || 0;
    }
    if (interaction && interaction.mouse) {
      const mx = (interaction.mouse.x * 0.5 + 0.5) * innerWidth;
      const my = (interaction.mouse.y * 0.5 + 0.5) * innerHeight;
      this.mat.uniforms.uCursor.value.set(mx, my);
    }
    this.mat.uniforms.uBeat.value *= 0.94;
  }

  dispose() {
    this.scene.remove(this.mesh);
    this.geo.dispose();
    this.mat.dispose();
  }
}
