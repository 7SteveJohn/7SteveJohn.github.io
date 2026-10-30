import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const OUT_DIR = path.join(ROOT, 'assets/images/covers');

fs.mkdirSync(OUT_DIR, { recursive: true });

function createSvg({ num, titleEn, titleCn, tag, accent1, accent2, motif }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" width="100%" height="100%">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#070913"/>
      <stop offset="50%" stop-color="#0c1122"/>
      <stop offset="100%" stop-color="#05070e"/>
    </linearGradient>
    <linearGradient id="glow" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${accent1}" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="${accent2}" stop-opacity="0.4"/>
    </linearGradient>
    <radialGradient id="spot" cx="80%" cy="20%" r="60%">
      <stop offset="0%" stop-color="${accent1}" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="#070913" stop-opacity="0"/>
    </radialGradient>
    <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
      <path d="M 32 0 L 0 0 0 32" fill="none" stroke="rgba(255, 255, 255, 0.04)" stroke-width="1"/>
    </pattern>
  </defs>

  <!-- Background -->
  <rect width="640" height="360" fill="url(#bg)"/>
  <rect width="640" height="360" fill="url(#spot)"/>
  <rect width="640" height="360" fill="url(#grid)"/>

  <!-- Geometric Motif -->
  <g opacity="0.6">
    ${motif}
  </g>

  <!-- Top Badge -->
  <g transform="translate(40, 42)">
    <rect width="130" height="24" rx="12" fill="rgba(255, 255, 255, 0.06)" stroke="rgba(255, 255, 255, 0.12)" stroke-width="1"/>
    <circle cx="14" cy="12" r="3" fill="${accent1}"/>
    <text x="26" y="16" fill="#94a3b8" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10.5" font-weight="600" letter-spacing="1.2">${tag}</text>
  </g>

  <!-- Big Number -->
  <text x="590" y="70" text-anchor="end" fill="url(#glow)" font-family="Inter, -apple-system, sans-serif" font-size="44" font-weight="800" letter-spacing="-1">${num}</text>

  <!-- Content Group -->
  <g transform="translate(40, 230)">
    <!-- English Subtitle -->
    <text x="0" y="0" fill="${accent1}" font-family="Inter, -apple-system, sans-serif" font-size="12" font-weight="700" letter-spacing="2.5" opacity="0.9">${titleEn.toUpperCase()}</text>
    <!-- Chinese Main Title -->
    <text x="0" y="38" fill="#f8fafc" font-family="-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif" font-size="25" font-weight="700" letter-spacing="0.5">${titleCn}</text>
    <!-- Decorative underline -->
    <rect x="0" y="58" width="48" height="3" rx="1.5" fill="url(#glow)"/>
    <rect x="54" y="58" width="12" height="3" rx="1.5" fill="rgba(255,255,255,0.2)"/>
  </g>
</svg>`;
}

const COVERS = [
  // AI 系列 7 篇
  {
    file: 'ai-01-token.svg',
    num: '01',
    tag: 'AI SERIES',
    titleEn: 'Token & Context Window',
    titleCn: '一、Token 是什么',
    accent1: '#38bdf8',
    accent2: '#6366f1',
    motif: `
      <g stroke="rgba(56, 189, 248, 0.18)" fill="none" stroke-width="1.5">
        <rect x="420" y="110" width="70" height="28" rx="6" fill="rgba(56, 189, 248, 0.08)"/>
        <rect x="500" y="110" width="80" height="28" rx="6" fill="rgba(99, 102, 241, 0.12)"/>
        <rect x="380" y="148" width="90" height="28" rx="6" fill="rgba(99, 102, 241, 0.08)"/>
        <rect x="480" y="148" width="60" height="28" rx="6" fill="rgba(56, 189, 248, 0.12)"/>
        <circle cx="510" cy="130" r="80" stroke-dasharray="4 6"/>
      </g>`
  },
  {
    file: 'ai-02-training.svg',
    num: '02',
    tag: 'AI SERIES',
    titleEn: 'Pretrain to Alignment',
    titleCn: '二、大模型是怎么炼成的',
    accent1: '#34d399',
    accent2: '#0284c7',
    motif: `
      <g stroke="rgba(52, 211, 153, 0.2)" fill="none" stroke-width="1.5">
        <path d="M 380 180 Q 460 100 560 150 T 620 120"/>
        <circle cx="430" cy="140" r="14" fill="rgba(52, 211, 153, 0.1)"/>
        <circle cx="510" cy="125" r="18" fill="rgba(2, 132, 199, 0.15)"/>
        <circle cx="580" cy="135" r="12" fill="rgba(52, 211, 153, 0.1)"/>
        <line x1="430" y1="140" x2="510" y2="125"/>
        <line x1="510" y1="125" x2="580" y2="135"/>
      </g>`
  },
  {
    file: 'ai-03-learning.svg',
    num: '03',
    tag: 'AI SERIES',
    titleEn: 'Four Learning Paths',
    titleCn: '三、学 AI 要不要先啃高数',
    accent1: '#fbbf24',
    accent2: '#f97316',
    motif: `
      <g stroke="rgba(251, 191, 36, 0.2)" fill="none" stroke-width="1.5">
        <path d="M 400 190 L 460 140 L 530 155 L 600 100"/>
        <path d="M 400 190 L 480 175 L 560 120" stroke-dasharray="3 4"/>
        <circle cx="460" cy="140" r="4" fill="#fbbf24"/>
        <circle cx="530" cy="155" r="4" fill="#f97316"/>
        <circle cx="600" cy="100" r="5" fill="#fbbf24"/>
      </g>`
  },
  {
    file: 'ai-04-agent.svg',
    num: '04',
    tag: 'AI SERIES',
    titleEn: 'Agent Capability Boundary',
    titleCn: '四、Agent 为什么会翻车',
    accent1: '#f43f5e',
    accent2: '#a855f7',
    motif: `
      <g stroke="rgba(244, 63, 94, 0.2)" fill="none" stroke-width="1.5">
        <circle cx="500" cy="135" r="55" stroke-dasharray="6 4"/>
        <circle cx="500" cy="135" r="30" stroke="rgba(168, 85, 247, 0.3)"/>
        <path d="M 470 135 L 530 135"/>
        <path d="M 500 105 L 500 165"/>
        <polygon points="500,80 540,150 460,150" stroke="rgba(244, 63, 94, 0.3)"/>
      </g>`
  },
  {
    file: 'ai-05-china.svg',
    num: '05',
    tag: 'AI SERIES',
    titleEn: 'Strengths & Bottlenecks',
    titleCn: '五、中国 AI 的长板与短板',
    accent1: '#f87171',
    accent2: '#fbbf24',
    motif: `
      <g stroke="rgba(248, 113, 113, 0.2)" fill="none" stroke-width="1.5">
        <rect x="420" y="90" width="75" height="75" rx="8" transform="rotate(45 457 127)"/>
        <rect x="495" y="90" width="75" height="75" rx="8" transform="rotate(45 532 127)" stroke="rgba(251, 191, 36, 0.25)"/>
      </g>`
  },
  {
    file: 'ai-06-jobs.svg',
    num: '06',
    tag: 'AI SERIES',
    titleEn: 'Job Roles Evolution',
    titleCn: '六、AI 会抢走谁的饭碗',
    accent1: '#2dd4bf',
    accent2: '#3b82f6',
    motif: `
      <g stroke="rgba(45, 212, 191, 0.2)" fill="none" stroke-width="1.5">
        <rect x="420" y="100" width="50" height="60" rx="4"/>
        <rect x="480" y="120" width="50" height="60" rx="4"/>
        <rect x="540" y="85" width="50" height="60" rx="4"/>
        <line x1="400" y1="170" x2="600" y2="170"/>
      </g>`
  },
  {
    file: 'ai-07-frontier.svg',
    num: '07',
    tag: 'AI SERIES',
    titleEn: 'Compute, Embodied & Ethics',
    titleCn: '七、AI 的下一程',
    accent1: '#c084fc',
    accent2: '#38bdf8',
    motif: `
      <g stroke="rgba(192, 132, 252, 0.2)" fill="none" stroke-width="1.5">
        <ellipse cx="510" cy="130" rx="70" ry="30" transform="rotate(-20 510 130)"/>
        <ellipse cx="510" cy="130" rx="70" ry="30" transform="rotate(40 510 130)"/>
        <circle cx="510" cy="130" r="16" fill="rgba(192, 132, 252, 0.2)"/>
      </g>`
  },
  // 技术手记与游戏手记
  {
    file: 'cover-prompt-optimizer.svg',
    num: 'PROMPT',
    tag: 'TOOL DEVLOG',
    titleEn: 'Rules Engine & Linting',
    titleCn: '纯本地提示词优化器',
    accent1: '#4ade80',
    accent2: '#38bdf8',
    motif: `
      <g stroke="rgba(74, 222, 128, 0.2)" fill="none" stroke-width="1.5">
        <path d="M 430 110 L 410 135 L 430 160"/>
        <path d="M 550 110 L 570 135 L 550 160"/>
        <line x1="470" y1="165" x2="510" y2="105"/>
      </g>`
  },
  {
    file: 'cover-pixel-narrative.svg',
    num: 'RMMZ',
    tag: 'GAME DEVLOG',
    titleEn: '2D Pixel Narrative Pipeline',
    titleCn: '像素叙事游戏开发手记',
    accent1: '#e879f9',
    accent2: '#fbbf24',
    motif: `
      <g stroke="rgba(232, 121, 249, 0.2)" fill="none" stroke-width="1.5">
        <rect x="420" y="90" width="36" height="36"/>
        <rect x="456" y="90" width="36" height="36" fill="rgba(232, 121, 249, 0.1)"/>
        <rect x="492" y="90" width="36" height="36"/>
        <rect x="420" y="126" width="36" height="36" fill="rgba(251, 191, 36, 0.1)"/>
        <rect x="456" y="126" width="36" height="36"/>
        <rect x="492" y="126" width="36" height="36" fill="rgba(232, 121, 249, 0.1)"/>
      </g>`
  },
  {
    file: 'cover-video-reading.svg',
    num: 'VLM',
    tag: 'PIPELINE',
    titleEn: 'Multimodal Video Analysis',
    titleCn: '本地视频阅读工作流',
    accent1: '#06b6d4',
    accent2: '#60a5fa',
    motif: `
      <g stroke="rgba(6, 182, 212, 0.2)" fill="none" stroke-width="1.5">
        <rect x="410" y="100" width="160" height="90" rx="8"/>
        <polygon points="480,130 505,145 480,160" fill="rgba(6, 182, 212, 0.3)"/>
        <line x1="410" y1="120" x2="570" y2="120" stroke-dasharray="2 3"/>
      </g>`
  },
  {
    file: 'cover-abysswalker.svg',
    num: 'ROGUELIKE',
    tag: 'WEB GAME',
    titleEn: '60KB Zero-Dependency Dungeon',
    titleCn: '纯前端 60KB 矢量 Roguelike',
    accent1: '#fb923c',
    accent2: '#f43f5e',
    motif: `
      <g stroke="rgba(251, 146, 60, 0.25)" fill="none" stroke-width="1.5">
        <polygon points="500,85 550,115 550,165 500,195 450,165 450,115"/>
        <polygon points="500,105 530,125 530,155 500,175 470,155 470,125" fill="rgba(251, 146, 60, 0.1)"/>
      </g>`
  },
  {
    file: 'cover-flashing.svg',
    num: 'FASTBOOT',
    tag: 'ANDROID DEVLOG',
    titleEn: 'AVB Trust Chain & Bootloader',
    titleCn: '刷机与信任链验证',
    accent1: '#38bdf8',
    accent2: '#a855f7',
    motif: `
      <g stroke="rgba(56, 189, 248, 0.2)" fill="none" stroke-width="1.5">
        <circle cx="500" cy="135" r="45"/>
        <path d="M 485 135 L 495 145 L 515 125" stroke-width="2.5" stroke="#38bdf8"/>
        <rect x="475" y="105" width="50" height="60" rx="6" stroke-dasharray="3 3"/>
      </g>`
  },
  {
    file: 'cover-local-llm.svg',
    num: '8GB VRAM',
    tag: 'LOCAL LLM',
    titleEn: 'Quantization & Memory Budget',
    titleCn: '8GB 显存跑本地大模型',
    accent1: '#a78bfa',
    accent2: '#ec4899',
    motif: `
      <g stroke="rgba(167, 139, 250, 0.2)" fill="none" stroke-width="1.5">
        <rect x="420" y="100" width="140" height="70" rx="6"/>
        <rect x="430" y="110" width="70" height="50" rx="4" fill="rgba(167, 139, 250, 0.2)"/>
        <rect x="510" y="110" width="40" height="50" rx="4" fill="rgba(236, 72, 153, 0.15)"/>
      </g>`
  },
  {
    file: 'cover-comfyui.svg',
    num: 'COMFYUI',
    tag: 'AIGC WORKFLOW',
    titleEn: 'Node-Based Generation Pipeline',
    titleCn: 'ComfyUI 工作流实践',
    accent1: '#f43f5e',
    accent2: '#8b5cf6',
    motif: `
      <g stroke="rgba(244, 63, 94, 0.25)" fill="none" stroke-width="1.5">
        <rect x="410" y="95" width="60" height="40" rx="4" fill="rgba(244, 63, 94, 0.1)"/>
        <rect x="510" y="95" width="60" height="40" rx="4" fill="rgba(139, 92, 246, 0.1)"/>
        <rect x="460" y="150" width="60" height="40" rx="4" fill="rgba(56, 189, 248, 0.1)"/>
        <path d="M 470 115 L 510 115" stroke="#f43f5e"/>
        <path d="M 440 135 L 460 170" stroke="#8b5cf6"/>
        <path d="M 540 135 L 520 170" stroke="#38bdf8"/>
      </g>`
  },
  {
    file: 'cover-ollama.svg',
    num: 'OLLAMA',
    tag: 'VRAM TUNING',
    titleEn: 'Context Window & Memory Pacing',
    titleCn: 'Ollama 显存适配实战',
    accent1: '#06b6d4',
    accent2: '#10b981',
    motif: `
      <g stroke="rgba(6, 182, 212, 0.25)" fill="none" stroke-width="1.5">
        <circle cx="500" cy="135" r="45"/>
        <path d="M 500 90 A 45 45 0 0 1 545 135" stroke="#06b6d4" stroke-width="3"/>
        <line x1="500" y1="135" x2="530" y2="120" stroke="#10b981" stroke-width="2"/>
        <circle cx="500" cy="135" r="4" fill="#06b6d4"/>
      </g>`
  },
  {
    file: 'cover-root-hiding.svg',
    num: 'MAGISK',
    tag: 'SYSTEM INTEGRITY',
    titleEn: 'Three-Layer Protection Mechanism',
    titleCn: 'root 藏不住的原因',
    accent1: '#10b981',
    accent2: '#3b82f6',
    motif: `
      <g stroke="rgba(16, 185, 129, 0.25)" fill="none" stroke-width="1.5">
        <path d="M 500 85 L 545 105 L 545 145 C 545 175 500 195 500 195 C 500 195 455 175 455 145 L 455 105 Z"/>
        <path d="M 500 105 L 530 118 L 530 145 C 530 165 500 180 500 180 C 500 180 470 165 470 145 L 470 118 Z" fill="rgba(16, 185, 129, 0.1)"/>
      </g>`
  },
  {
    file: 'cover-two-years-flashing.svg',
    num: '2 YEARS',
    tag: 'RETROSPECTIVE',
    titleEn: 'K60 Pro to Legion Y700',
    titleCn: '两年刷机记：设备与折腾',
    accent1: '#f59e0b',
    accent2: '#ef4444',
    motif: `
      <g stroke="rgba(245, 158, 11, 0.25)" fill="none" stroke-width="1.5">
        <rect x="440" y="85" width="45" height="85" rx="6"/>
        <rect x="495" y="105" width="70" height="75" rx="6"/>
        <line x1="430" y1="185" x2="575" y2="185" stroke="rgba(245, 158, 11, 0.4)"/>
        <circle cx="462" cy="185" r="3" fill="#f59e0b"/>
        <circle cx="530" cy="185" r="3" fill="#ef4444"/>
      </g>`
  }
];

let count = 0;
for (const item of COVERS) {
  const svg = createSvg(item);
  fs.writeFileSync(path.join(OUT_DIR, item.file), svg, 'utf8');
  count++;
}

console.log(`✓ Generated ${count} beautiful SVG covers in assets/images/covers/`);
