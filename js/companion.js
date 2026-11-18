/**
 * 看板娘 7steve · 交互系统、场景联动与快捷操作丸栏 (companion.js)
 * ------------------------------------------------------------
 * 设计目标（融合方案 1 安静陪读伴侣 + 方案 3 极客快捷工具丸栏）：
 * 1. 简历镜像守卫：/(^|\.)pages\.dev$/ 自动跳过挂载，保持对外简历版纯净。
 * 2. 状态记忆与响应式：桌面端默认展开（支持收起为 42px <7> 猫耳徽标并停帧 0% CPU）；
 *    移动端 (< 768px) 默认收起为猫耳徽标绝不遮挡正文，轻点展开紧凑舞台 + 顶部快捷丸栏。
 * 3. 多部位触控反馈：摸头 (head)、全息板 (pad)、连戳抗议 (body 5s 内 >=3 次晕眩抗议)。
 * 4. 博客场景联动：时段问候、札签拆包 (sj:pack-open)、闪签翻牌 (sj:card-flip)、
 *    音乐伴读律动 (#cosmos-audio / #music-audio)、代码片段复制反馈 (copy)。
 */
(function () {
  'use strict';

  // 1. 简历镜像守卫（与旧版 live2d.js 契约一致）
  if (/(^|\.)pages\.dev$/.test(location.hostname)) {
    console.info('[companion] 简历镜像（pages.dev）不挂载看板娘');
    return;
  }

  // 站点配置显式关闭守卫
  if (window.SITE_CONFIG && window.SITE_CONFIG.companion === false) {
    return;
  }

  // 防止重复挂载
  if (document.getElementById('sj-companion')) return;

  const STORAGE_KEY = 'sj.companionState';
  const root = document.documentElement;
  const mobileMQ = window.matchMedia ? window.matchMedia('(max-width: 767px)') : { matches: false };

  function readSavedState() {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      return (v === 'mini' || v === 'open') ? v : null;
    } catch (_) {
      return null;
    }
  }

  function writeSavedState(state) {
    try {
      localStorage.setItem(STORAGE_KEY, state);
    } catch (_) { /* 隐私模式静默跳过 */ }
  }

  // 初始展开策略：移动端 (< 768px) 默认收起不挡阅读；桌面端除非用户显式收起过，默认展开
  const saved = readSavedState();
  let currentState = mobileMQ.matches ? 'mini' : (saved === 'mini' ? 'mini' : 'open');

  // ---------------- 台词库（契合 7steve 极客少女设定，严格控制字数防孤字折行） ----------------
  const LINES = {
    head: [
      '收到摸头信号，核心温度直降 2℃ 啦～',
      '轻点揉呀，头顶呆毛的弹簧阻尼要乱啦～',
      '猫耳耳机亮青光，本地守护进程状态极佳！',
      '摸摸头解压成功，祝你接下来的构建全绿～'
    ],
    pad: [
      '全息板回归测试跑完：42/42 全绿，零联网！',
      '正在盯端侧显存账本，帧生成时间抖动很稳～',
      '全息小屏连着本地 RAG 索引，秒搜就靠它～',
      '推了推黑框眼镜，静态包与离线缓存校验全绿。'
    ],
    bodyGentle: [
      '突然戳我一下，差点把刚调通的参数碰偏了～',
      '深蓝连帽卫衣是写码标配，保暖还防奇葩 Bug～',
      '想切主题或搜手记，悬停点我上方快捷栏就行～'
    ],
    bodyDizzy: [
      '别连戳啦！眼镜晃歪了，手抖敲错命令怎么办！',
      '晕乎乎……5 秒连戳三下，触发防抖熔断保护啦！'
    ],
    packOpen: [
      '撕封手气不错，看看藏了哪几札～',
      '补充包拆封啦，轻点卡背翻牌～'
    ],
    musicOn: [
      '耳机切入伴读频段，推理场脉冲跟着律动啦～',
      '放首歌歇口气吧，播过的曲目断网也能复播～'
    ]
  };

  const cursors = Object.create(null);
  function pickLine(group) {
    const arr = LINES[group];
    if (!arr || !arr.length) return '';
    const idx = cursors[group] || 0;
    cursors[group] = (idx + 1) % arr.length;
    return arr[idx];
  }

  function getTimeGreeting() {
    const h = new Date().getHours();
    if (h < 5) return '夜深了别熬太晚，保存好工程早点休息吧～';
    if (h < 9) return '早安！猫耳耳机满电就绪，今天也是零报错～';
    if (h < 12) return '上午好，敲代码前先倒杯水，保持思路清爽。';
    if (h < 14) return '午好，记得按时吃饭，端侧推理也要补能量～';
    if (h < 18) return '下午好，本地工具与开发手记都在这儿，随便逛～';
    if (h < 23) return '晚上好，今天折腾的工程跑通了吗？';
    return '快零点了，提交完工程早点歇着呀～';
  }

  // ---------------- 构建 DOM 结构 ----------------
  const wrap = document.createElement('aside');
  wrap.id = 'sj-companion';
  wrap.className = 'sj-companion' + (currentState === 'mini' ? ' is-mini' : '');
  wrap.setAttribute('aria-label', '看板娘 7steve 交互伴侣');

  wrap.innerHTML = [
    '<div class="sjc-bubble" id="sjc-bubble" role="status" aria-live="polite" aria-hidden="true">',
    '  <span class="sjc-bubble-text" id="sjc-bubble-text"></span>',
    '</div>',
    '<div class="sjc-stage" id="sjc-stage"></div>',
    '<button type="button" class="sjc-mob-fold" id="sjc-mob-fold" aria-label="收起看板娘" title="收起看板娘">−</button>',
    '<nav class="sjc-dock" id="sjc-dock" aria-label="7steve 快捷操作栏">',
    '  <button type="button" class="sjc-pill" data-sjc-action="music" aria-pressed="false" title="播放 / 暂停背景音乐">',
    '    <span class="sjc-pill-ico" aria-hidden="true">♫</span><span class="sjc-pill-lbl">音乐</span>',
    '  </button>',
    '  <button type="button" class="sjc-pill" data-sjc-action="theme" title="切换明暗主题">',
    '    <span class="sjc-pill-ico" data-sjc-theme-ico aria-hidden="true">☾</span><span class="sjc-pill-lbl">主题</span>',
    '  </button>',
    '  <button type="button" class="sjc-pill" data-sjc-action="search" title="站内搜索 (⌘K)">',
    '    <span class="sjc-pill-ico" aria-hidden="true">⌘</span><span class="sjc-pill-lbl">搜索</span>',
    '  </button>',
    '  <button type="button" class="sjc-pill" data-sjc-action="top" title="平滑回到顶部">',
    '    <span class="sjc-pill-ico" aria-hidden="true">↑</span><span class="sjc-pill-lbl">顶部</span>',
    '  </button>',
    '  <button type="button" class="sjc-pill sjc-pill--collapse" data-sjc-action="collapse" title="收起看板娘">',
    '    <span class="sjc-pill-ico" aria-hidden="true">−</span><span class="sjc-pill-lbl">收起</span>',
    '  </button>',
    '</nav>',
    '<button type="button" class="sjc-mini" id="sjc-mini" aria-label="唤醒看板娘 7steve" title="唤醒看板娘 7steve">',
    '  <svg class="sjc-mini-ears" viewBox="0 0 36 36" fill="none" aria-hidden="true">',
    '    <path d="M6.5 23.5C6.5 16.2 11.6 10.8 18 10.8C24.4 10.8 29.5 16.2 29.5 23.5" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" opacity="0.52"/>',
    '    <path d="M6.6 17.8L8.3 6.8L15.7 12.2" stroke="currentColor" stroke-width="1.75" stroke-linejoin="round"/>',
    '    <polygon points="9.3,9.2 8.4,15.2 13.5,12.4" class="sjc-mini-neon"/>',
    '    <path d="M29.4 17.8L27.7 6.8L20.3 12.2" stroke="currentColor" stroke-width="1.75" stroke-linejoin="round"/>',
    '    <polygon points="26.7,9.2 27.6,15.2 22.5,12.4" class="sjc-mini-neon"/>',
    '  </svg>',
    '  <span class="sjc-mini-code">&lt;7&gt;</span>',
    '  <span class="sjc-mini-tip" aria-hidden="true">唤醒看板娘 7steve</span>',
    '</button>'
  ].join('\n');

  document.body.appendChild(wrap);
  root.classList.add('has-companion');
  root.classList.toggle('sjc-is-mini', currentState === 'mini');

  const bubbleEl = wrap.querySelector('#sjc-bubble');
  const bubbleTextEl = wrap.querySelector('#sjc-bubble-text');
  const stageEl = wrap.querySelector('#sjc-stage');
  const dockEl = wrap.querySelector('#sjc-dock');
  const miniBtn = wrap.querySelector('#sjc-mini');
  const musicPill = wrap.querySelector('[data-sjc-action="music"]');
  const themeIcoEl = wrap.querySelector('[data-sjc-theme-ico]');
  const themePill = wrap.querySelector('[data-sjc-action="theme"]');

  // ---------------- 气泡控制（带环境冷却，主动交互零延迟破除冷却） ----------------
  let bubbleTimer = 0;
  let lastAmbientBubbleAt = 0;

  function hideBubble() {
    if (bubbleTimer) {
      clearTimeout(bubbleTimer);
      bubbleTimer = 0;
    }
    bubbleEl.classList.remove('is-visible');
    bubbleEl.setAttribute('aria-hidden', 'true');
  }

  function say(text, opts) {
    if (!text || currentState === 'mini') return false;
    const o = opts || {};
    const now = performance.now();
    const cooldown = typeof o.cooldown === 'number' ? o.cooldown : 2600;
    if (!o.force && lastAmbientBubbleAt > 0 && (now - lastAmbientBubbleAt) < cooldown) {
      return false;
    }
    if (!o.force) lastAmbientBubbleAt = now;

    bubbleTextEl.textContent = text;
    bubbleEl.classList.add('is-visible');
    bubbleEl.setAttribute('aria-hidden', 'false');

    if (bubbleTimer) clearTimeout(bubbleTimer);
    const hold = typeof o.duration === 'number' ? o.duration : 3800;
    bubbleTimer = setTimeout(hideBubble, hold);
    return true;
  }

  // ---------------- 挂载 Live2D Cubism 5 WebGL2 真立绘适配器 (CompanionAvatar) ----------------
  let avatar = null;
  let bodyTapTimes = [];
  let lastZoneTapTs = 0;
  let dockHoverTimer = 0;
  let mobileDockTimer = 0;
  let dockOpenScrollY = window.scrollY || 0;

  function isNarrowScreen() {
    return Boolean(mobileMQ && mobileMQ.matches);
  }

  function summonMobileDock(holdMs) {
    if (currentState === 'mini' || !isNarrowScreen()) return;
    if (mobileDockTimer) clearTimeout(mobileDockTimer);
    dockOpenScrollY = window.scrollY || 0;
    wrap.classList.add('is-dock-open');
    mobileDockTimer = setTimeout(() => {
      mobileDockTimer = 0;
      wrap.classList.remove('is-dock-open');
    }, typeof holdMs === 'number' ? holdMs : 4800);
  }

  function dismissMobileDock() {
    if (mobileDockTimer) {
      clearTimeout(mobileDockTimer);
      mobileDockTimer = 0;
    }
    if (isNarrowScreen()) {
      wrap.classList.remove('is-dock-open');
    }
  }

  function openDockGrace() {
    if (currentState === 'mini' || isNarrowScreen()) return;
    if (dockHoverTimer) {
      clearTimeout(dockHoverTimer);
      dockHoverTimer = 0;
    }
    wrap.classList.add('is-dock-open');
  }

  function closeDockGrace() {
    if (isNarrowScreen()) return;
    if (dockHoverTimer) clearTimeout(dockHoverTimer);
    dockHoverTimer = setTimeout(() => {
      dockHoverTimer = 0;
      wrap.classList.remove('is-dock-open');
    }, 180);
  }

  stageEl.addEventListener('pointerover', openDockGrace, { passive: true });
  stageEl.addEventListener('pointerout', closeDockGrace, { passive: true });
  dockEl.addEventListener('pointerenter', openDockGrace, { passive: true });
  dockEl.addEventListener('pointerleave', closeDockGrace, { passive: true });
  dockEl.addEventListener('pointerdown', () => {
    if (isNarrowScreen()) summonMobileDock(5200);
  }, { passive: true });

  window.addEventListener('scroll', () => {
    if (isNarrowScreen() && wrap.classList.contains('is-dock-open')) {
      if (Math.abs((window.scrollY || 0) - dockOpenScrollY) > 18) {
        dismissMobileDock();
      }
    }
  }, { passive: true });

  document.addEventListener('pointerdown', (e) => {
    if (isNarrowScreen() && wrap.classList.contains('is-dock-open')) {
      if (!wrap.contains(e.target)) {
        dismissMobileDock();
      }
    }
  }, { passive: true });

  const mobFoldBtn = wrap.querySelector('#sjc-mob-fold');
  if (mobFoldBtn) {
    mobFoldBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      setCompanionState('mini', true);
    });
  }

  function safeExpr(name, durationMs) {
    if (!avatar || typeof avatar.setExpression !== 'function') return;
    try { avatar.setExpression(name, durationMs); } catch (_) {}
  }

  function safeImpulse(vec) {
    if (!avatar || typeof avatar.impulse !== 'function') return;
    try { avatar.impulse(vec); } catch (_) {}
  }

  function safeAction(name, opts) {
    if (!avatar || typeof avatar.playAction !== 'function') return;
    try { avatar.playAction(name, opts); } catch (_) {}
  }

  function safeMusic(playing) {
    if (!avatar || typeof avatar.setMusicPlaying !== 'function') return;
    try { avatar.setMusicPlaying(Boolean(playing)); } catch (_) {}
  }

  function safePaused(paused) {
    if (!avatar || typeof avatar.setPaused !== 'function') return;
    try { avatar.setPaused(Boolean(paused)); } catch (_) {}
  }

  function handleZoneTap(zone) {
    if (currentState === 'mini') return;
    const now = performance.now();
    lastZoneTapTs = now;
    summonMobileDock(4800);

    if (zone === 'head') {
      safeExpr(Math.random() < 0.55 ? 'happy' : 'wink', 3200);
      safeImpulse({ y: 5, tilt: -4 });
      say(pickLine('head'), { force: true, duration: 3800 });
      return;
    }

    if (zone === 'pad') {
      safeExpr('focus', 3400);
      safeImpulse({ y: -3, tilt: 2 });
      say(pickLine('pad'), { force: true, duration: 3900 });
      return;
    }

    // 默认按 'body' 处理：5000ms 内连戳 >= 3 次触发晕眩摇晃抗议
    bodyTapTimes = bodyTapTimes.filter((t) => now - t < 5000);
    bodyTapTimes.push(now);

    if (bodyTapTimes.length >= 3) {
      bodyTapTimes = [];
      safeExpr('dizzy', 3600);
      safeImpulse({ x: 12, tilt: 9 });
      say(pickLine('bodyDizzy'), { force: true, duration: 4000 });
    } else {
      safeExpr('shy', 2800);
      safeImpulse({ y: -4, tilt: 3 });
      say(pickLine('bodyGentle'), { force: true, duration: 3500 });
    }
  }

  // 若脚本直接对 stageEl 派发合成点击，提供与 34% 猫耳头部 / 右下全息板一致的坐标映射
  stageEl.addEventListener('click', (e) => {
    if (currentState === 'mini') return;
    if (performance.now() - lastZoneTapTs < 90) return;
    const r = stageEl.getBoundingClientRect();
    if (!r.height) return;
    const relY = (e.clientY - r.top) / r.height;
    const relX = (e.clientX - r.left) / r.width;
    if (relY < 0.34) handleZoneTap('head');
    else if (relY >= 0.56 && relX >= 0.45) handleZoneTap('pad');
    else handleZoneTap('body');
  });

  let greetedOnce = false;

  function mountAvatarIfReady(retriesLeft) {
    if (avatar) return;
    if (window.CompanionAvatar && typeof window.CompanionAvatar.mount === 'function') {
      try {
        avatar = window.CompanionAvatar.mount(stageEl, {
          onZoneTap: (zone) => handleZoneTap(zone)
        });
      } catch (err) {
        console.warn('[companion] CompanionAvatar.mount 异常：', err);
        return;
      }
      safeMusic(isAnyAudioPlaying());
      safePaused(currentState === 'mini');
      if (currentState === 'open' && !greetedOnce) {
        greetedOnce = true;
        setTimeout(() => {
          if (currentState === 'open') {
            safeExpr('smile', 2600);
            safeAction('wave', { amp: 0.95 });
            say(getTimeGreeting(), { force: true, duration: 4200 });
          }
        }, 520);
      }
      return;
    }
    if (retriesLeft > 0) {
      setTimeout(() => mountAvatarIfReady(retriesLeft - 1), 120);
    }
  }

  // ---------------- 展开 / 收起状态切换 ----------------
  function setCompanionState(nextState, persist) {
    const target = nextState === 'mini' ? 'mini' : 'open';
    const changed = currentState !== target;
    currentState = target;
    if (persist) writeSavedState(target);

    const isMini = target === 'mini';
    wrap.classList.toggle('is-mini', isMini);
    root.classList.toggle('sjc-is-mini', isMini);

    if (isMini) {
      if (dockHoverTimer) {
        clearTimeout(dockHoverTimer);
        dockHoverTimer = 0;
      }
      if (mobileDockTimer) {
        clearTimeout(mobileDockTimer);
        mobileDockTimer = 0;
      }
      wrap.classList.remove('is-dock-open');
      hideBubble();
      safePaused(true);
    } else {
      if (!avatar) mountAvatarIfReady(25);
      safePaused(false);
      safeMusic(isAnyAudioPlaying());
      summonMobileDock(5200);
      if (changed) {
        safeExpr('happy', 2600);
        safeImpulse({ y: -4, tilt: -3 });
        if (!greetedOnce) {
          greetedOnce = true;
          say(getTimeGreeting(), { force: true, duration: 4000 });
        } else {
          say('7steve 上线，本地守护已就绪～', { force: true, duration: 3200 });
        }
      }
    }
  }

  // 视口从桌面缩窄至手机宽度时自动收起为徽标，防止窄窗遮挡阅读
  if (mobileMQ && typeof mobileMQ.addEventListener === 'function') {
    mobileMQ.addEventListener('change', (ev) => {
      if (ev.matches && currentState === 'open') {
        setCompanionState('mini', false);
      }
    });
  }

  miniBtn.addEventListener('click', () => {
    setCompanionState('open', true);
  });

  // ---------------- 主题图标 100% 同步 ----------------
  function syncThemePill() {
    const isDark = root.classList.contains('dark');
    if (themeIcoEl) themeIcoEl.textContent = isDark ? '☀' : '☾';
    if (themePill) {
      const label = isDark ? '切换到晨曦浅色主题' : '切换到极夜深色主题';
      themePill.title = label;
      themePill.setAttribute('aria-label', label);
    }
  }
  syncThemePill();

  if (typeof MutationObserver === 'function') {
    const themeObserver = new MutationObserver(syncThemePill);
    themeObserver.observe(root, { attributes: true, attributeFilter: ['class'] });
  }

  // ---------------- 音乐播放状态同步与控制 (#cosmos-audio + #music-audio) ----------------
  let lastMusicBubbleAt = 0;

  function getAudioNodes() {
    return [
      document.getElementById('cosmos-audio'),
      document.getElementById('music-audio')
    ].filter(Boolean);
  }

  function isAnyAudioPlaying() {
    return getAudioNodes().some((el) => (!el.paused && !el.ended) || Boolean(el._sjcSynthPlaying));
  }

  function updateMusicUI(triggerBubble) {
    const playing = isAnyAudioPlaying();
    safeMusic(playing);
    if (musicPill) {
      musicPill.classList.toggle('is-active', playing);
      musicPill.setAttribute('aria-pressed', String(playing));
    }
    if (triggerBubble && playing && currentState === 'open') {
      const now = performance.now();
      if (now - lastMusicBubbleAt > 5000) {
        lastMusicBubbleAt = now;
        safeExpr('happy', 2600);
        say(pickLine('musicOn'), { cooldown: 1200, duration: 3800 });
      }
    }
  }

  function bindAudioElement(el) {
    if (!el || el._sjcBound) return;
    el._sjcBound = true;
    el.addEventListener('play', (e) => {
      if (!e.isTrusted) el._sjcSynthPlaying = true;
      updateMusicUI(true);
    });
    const onStop = () => {
      el._sjcSynthPlaying = false;
      updateMusicUI(false);
    };
    el.addEventListener('pause', onStop);
    el.addEventListener('ended', onStop);
    el.addEventListener('error', onStop);
  }

  getAudioNodes().forEach(bindAudioElement);

  function toggleSiteMusic() {
    const cosmosAudio = document.getElementById('cosmos-audio');
    if (cosmosAudio && ((!cosmosAudio.paused && !cosmosAudio.ended) || cosmosAudio._sjcSynthPlaying)) {
      cosmosAudio._sjcSynthPlaying = false;
      cosmosAudio.pause();
      updateMusicUI(false);
      return;
    }
    if (window.__MUSIC && typeof window.__MUSIC.togglePlay === 'function') {
      window.__MUSIC.togglePlay();
      return;
    }
    const playBtn = document.getElementById('music-play') || document.getElementById('cosmos-enter');
    if (playBtn) {
      playBtn.click();
      return;
    }
    if (cosmosAudio) {
      if (cosmosAudio.paused) cosmosAudio.play().catch(() => {});
      else cosmosAudio.pause();
    }
  }

  // ---------------- 快捷操作丸栏事件委托 ----------------
  dockEl.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-sjc-action]');
    if (!btn) return;
    e.stopPropagation();
    const action = btn.getAttribute('data-sjc-action');

    if (action === 'music') {
      toggleSiteMusic();
      return;
    }

    if (action === 'theme') {
      const wasDark = root.classList.contains('dark');
      const headerToggle = document.getElementById('theme-toggle');
      if (headerToggle) {
        headerToggle.click();
      } else {
        const nextDark = root.classList.toggle('dark');
        const meta = document.querySelector('meta[name="color-scheme"]');
        if (meta) meta.content = nextDark ? 'dark' : 'light';
        try { localStorage.setItem('sj.theme', nextDark ? 'dark' : 'light'); } catch (_) {}
        syncThemePill();
      }
      safeExpr('wink', 2200);
      safeAction('ear_peek', { amp: 0.95 });
      safeImpulse({ y: -2, tilt: wasDark ? -2 : 2 });
      say(wasDark ? '切回晨曦白昼，视野清爽通透～' : '切到极夜深空，护眼写码更稳～', {
        force: true,
        duration: 3000
      });
      return;
    }

    if (action === 'search') {
      const searchBtn = document.getElementById('search-open');
      if (searchBtn) searchBtn.click();
      safeExpr('focus', 2200);
      return;
    }

    if (action === 'top') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      safeExpr('happy', 2200);
      safeAction('stretch', { amp: 0.95 });
      safeImpulse({ y: -5, tilt: -2 });
      return;
    }

    if (action === 'collapse') {
      setCompanionState('mini', true);
    }
  });

  // ---------------- 场景事件钩子 (Option 1) ----------------
  let lastPackOpenAt = 0;
  let lastFoilAt = 0;
  let lastFoilBubbleAt = 0;
  let lastStdFlipBubbleAt = 0;
  let lastCopyAt = 0;

  // 1) 札签补充包撕封 (sj:pack-open)
  window.addEventListener('sj:pack-open', (e) => {
    if (currentState === 'mini') return;
    const now = performance.now();
    safeExpr('focus', 2200);
    safeImpulse({ y: -3, tilt: -2 });
    if (now - lastPackOpenAt > 3000) {
      lastPackOpenAt = now;
      const cat = e && e.detail && e.detail.category ? String(e.detail.category) : '';
      const line = cursors.packOpen
        ? (cat ? `拆开「${cat}」卷宗，轻点翻牌揭晓～` : pickLine('packOpen'))
        : pickLine('packOpen');
      say(line, { force: true, duration: 3600 });
    }
  });

  // 2) 典藏札签翻牌 (sj:card-flip)
  window.addEventListener('sj:card-flip', (e) => {
    if (currentState === 'mini') return;
    const detail = (e && e.detail) || {};
    const now = performance.now();

    if (detail.rarity === 'foil') {
      lastFoilAt = now;
      safeExpr('happy', 3200);
      safeAction('cheer', { amp: 1.0 });
      safeImpulse({ y: -5, tilt: -3 });
      if (now - lastFoilBubbleAt > 1200) {
        lastFoilBubbleAt = now;
        say('哇，翻出深研闪签了！这篇是硬核长文～', { force: true, duration: 4400 });
      }
      return;
    }

    // 普通札签：若刚触发过闪签庆祝则不覆盖表情，保持闪签惊喜感
    if (now - lastFoilAt > 2600) {
      safeExpr('wink', 1900);
      safeImpulse({ y: -2, tilt: 1.5 });
      if (now - lastStdFlipBubbleAt > 8500) {
        lastStdFlipBubbleAt = now;
        say('翻开新札签啦，再点即可展卷～', { cooldown: 2000, duration: 3200 });
      }
    }
  });

  // 3) 代码或文本复制联动 (document copy + 代码块一键复制按钮)
  function triggerCopyReaction() {
    if (currentState === 'mini') return;
    const now = performance.now();
    if (now - lastCopyAt < 1800) return;
    lastCopyAt = now;
    safeExpr('wink', 2600);
    safeAction('typing', { amp: 0.92 });
    safeImpulse({ y: -2, tilt: 2 });
    say('代码片段拷走啦，回本地跑跑看～', { force: true, duration: 3600 });
  }

  document.addEventListener('copy', triggerCopyReaction);
  document.addEventListener('click', (e) => {
    if (e.target && e.target.closest && e.target.closest('.code-copy-btn')) {
      triggerCopyReaction();
    }
  });

  // 启动挂载：仅在展开态挂载重型 Live2D（移动端默认 mini 态不消耗首屏流量，点击 <7> 时按需秒载）
  if (currentState === 'open') {
    mountAvatarIfReady(25);
  }
  updateMusicUI(false);

  // 暴露轻量调试与验收句柄
  window.__SJ_COMPANION = {
    getState: () => currentState,
    setState: (s) => setCompanionState(s, true),
    say: (t, o) => say(t, Object.assign({ force: true }, o || {})),
    getAvatar: () => avatar
  };
})();
