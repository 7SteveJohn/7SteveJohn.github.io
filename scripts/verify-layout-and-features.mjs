/**
 * 自动化功能与布局防截断深度验收套件
 * ----------------------------------------------------
 * 验证目标：
 * 1. 旗舰产品卡片垂直排版防截断：768px~900px 标准屏下一卡自洽呈现，按钮不被切断
 * 2. 归档页（archive.html）时间河卡片全面清退“无用小框”，纯净内联排版（分类 · 日期 · 时长）
 * 3. 滚动浮现（.reveal）平滑度调优与阈值优化
 * 4. 全局搜索快捷键：Ctrl+K / ⌘K 呼出顶栏搜索框并居中聚焦，Esc 退出
 * 5. 网盘下载“提取码自动复制 + 右上角微弱 Toast 提示”
 * 6. 长文阅读弹窗：顶部常驻栏底部流动微光阅读进度条（Reading Progress）
 * 7. 代码块增强：微语言徽标与复制成功状态反馈（✓ 已复制）
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { devRequire as require } from './_dev-require.mjs';

const { chromium } = require('playwright-core');
const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon'
};

function createStaticServer() {
  return http.createServer((req, res) => {
    let reqPath = decodeURIComponent(req.url.split('?')[0]);
    if (reqPath === '/') reqPath = '/index.html';
    const filePath = path.join(ROOT, reqPath.replace(/^\//, ''));
    if (!filePath.startsWith(ROOT)) {
      res.writeHead(403);
      return res.end('Forbidden');
    }
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end('Not Found');
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, {
        'Content-Type': MIME[ext] || 'application/octet-stream',
        'Cache-Control': 'no-cache'
      });
      res.end(data);
    });
  });
}

const checks = [];
function check(pass, name, detail = '') {
  checks.push({ pass, name, detail });
  const mark = pass ? '✓ PASS' : '✗ FAIL';
  console.log(`${mark}  ${name}${detail ? ' → ' + detail : ''}`);
}

async function run() {
  const server = createStaticServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const BASE = `http://127.0.0.1:${port}/`;
  console.log(`\n========================================`);
  console.log(`启动本地验收服务器：${BASE}`);
  console.log(`========================================\n`);

  const browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true
  });

  try {
    const context = await browser.newContext({
      permissions: ['clipboard-read', 'clipboard-write'],
      viewport: { width: 1440, height: 900 }
    });
    const page = await context.newPage();

    // 收集控制台错误与未捕获异常
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));

    // ----------------------------------------------------
    // 测试项 1: 首页加载与控制台无报错
    // ----------------------------------------------------
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    check(pageErrors.length === 0, '首页加载且无任何 pageerror 异常', pageErrors.join(' | ') || '0 errors');

    // ----------------------------------------------------
    // 测试项 2: 旗舰产品卡片垂直排版防截断验证 (768px 与 900px 屏幕)
    // ----------------------------------------------------
    // 768px 高度测试
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.waitForTimeout(300);

    const cardsInfo = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('#products > article.bento-card')];
      return cards.map((c) => {
        const cs = window.getComputedStyle(c);
        const rect = c.getBoundingClientRect();
        const video = c.querySelector('.cover-video');
        const videoCs = video ? window.getComputedStyle(video) : null;
        const btnGroup = c.querySelector('.flex.items-center.gap-3') || c.querySelector('[data-link="download"]')?.parentElement;
        return {
          id: c.dataset.projectId,
          height: rect.height,
          paddingTop: cs.paddingTop,
          paddingBottom: cs.paddingBottom,
          marginBottom: cs.marginBottom,
          videoMaxHeight: videoCs ? videoCs.maxHeight : null,
          hasButtons: !!btnGroup,
        };
      });
    });

    check(cardsInfo.length >= 4, '成功获取到全部旗舰产品卡片规格信息', `${cardsInfo.length} 张卡`);
    for (const info of cardsInfo) {
      check(info.height <= 550, `产品卡片 [${info.id}] 高度紧凑 (${Math.round(info.height)}px <= 550px)，适宜 768px 单屏完整自洽呈现`);
      check(info.videoMaxHeight === '255px', `产品卡片 [${info.id}] 视频视窗最大高度精准收敛为 255px`, info.videoMaxHeight);
    }

    // 验证卡片一屏呈现，滚动定位后操作栏绝不被下边缘截断
    for (let i = 0; i < cardsInfo.length; i++) {
      const isClipped = await page.evaluate((idx) => {
        const card = document.querySelectorAll('#products > article.bento-card')[idx];
        card.scrollIntoView({ block: 'center', inline: 'nearest' });
        const r = card.getBoundingClientRect();
        const vh = window.innerHeight;
        // 卡片底部在视口内（或最多超出 20px 容差）
        return r.bottom > vh + 10;
      }, i);
      check(!isClipped, `居中滚动时产品卡片 #${i + 1} 底部及按钮栏完整可见，未被视口下边缘切断`);
    }

    // ----------------------------------------------------
    // 测试项 3: 全局搜索快捷键 Ctrl+K / ⌘K 与 Esc 退出
    // ----------------------------------------------------
    const searchBefore = await page.evaluate(() => {
      const p = document.getElementById('search-palette');
      return p ? p.classList.contains('hidden') : null;
    });
    check(searchBefore === true, '初始状态下搜索命令面板处于隐藏状态');

    // 触发 Ctrl+K
    await page.keyboard.press('Control+k');
    await page.waitForTimeout(300);

    const searchAfterCtrlK = await page.evaluate(() => {
      const p = document.getElementById('search-palette');
      const input = document.getElementById('search-input');
      return {
        isOpen: p && !p.classList.contains('hidden'),
        isInputFocused: document.activeElement === input
      };
    });
    check(searchAfterCtrlK.isOpen, '按 Ctrl+K 成功呼出顶栏搜索框命令面板');
    check(searchAfterCtrlK.isInputFocused, '呼出后搜索输入框自动获得焦点');

    // 触发 Esc
    await page.keyboard.press('Escape');
    await page.waitForTimeout(350);

    const searchAfterEsc = await page.evaluate(() => {
      const p = document.getElementById('search-palette');
      return p && (p.classList.contains('hidden') || p.classList.contains('is-closing'));
    });
    check(searchAfterEsc, '按 Esc 键成功关闭搜索命令面板');

    // ----------------------------------------------------
    // 测试项 4: 网盘下载“提取码自动复制 + 极轻量右上角 Toast 提示”
    // ----------------------------------------------------
    const toastResult = await page.evaluate(async () => {
      const dlBtn = document.querySelector('#products article [data-copy-pwd]');
      if (!dlBtn) return { found: false };
      const expectedPwd = dlBtn.dataset.copyPwd;
      // 触发点击
      dlBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      // 检查 toast 元素
      const toast = document.getElementById('sj-toast');
      const cs = toast ? window.getComputedStyle(toast) : null;
      return {
        found: true,
        expectedPwd,
        hasToast: !!toast,
        toastText: toast ? toast.textContent : '',
        isShown: toast ? toast.classList.contains('is-show') : false,
        isTopRight: toast ? toast.classList.contains('toast-top-right') : false,
        position: cs ? { top: cs.top, right: cs.right } : null
      };
    });

    check(toastResult.found, '产品卡片下载按钮挂载有 data-copy-pwd 属性', toastResult.expectedPwd);
    check(toastResult.isShown, '点击下载按钮后立即触发了 Toast 提示');
    check(toastResult.isTopRight, 'Toast 采用了 .toast-top-right 右上角微弱优雅浮层排版');
    check(toastResult.toastText.includes(toastResult.expectedPwd), `Toast 内容包含提取码 (${toastResult.toastText})`);

    // ----------------------------------------------------
    // 测试项 5: 长文阅读弹窗 - 顶部常驻栏流动阅读进度条与代码块徽标反馈
    // ----------------------------------------------------
    await page.evaluate(() => {
      // 找一篇含代码块的文章（如 filebutler-local-rag）
      window.openArticleModal('filebutler-local-rag');
    });
    await page.waitForTimeout(600);

    const modalCheck = await page.evaluate(() => {
      const modal = document.getElementById('article-modal');
      const content = document.getElementById('article-modal-content');
      const progress = document.getElementById('article-progress');
      const preList = [...content.querySelectorAll('pre')];
      const badges = [...content.querySelectorAll('.code-lang-badge')];
      const copyBtns = [...content.querySelectorAll('.code-copy-btn')];

      return {
        isModalOpen: modal && !modal.classList.contains('hidden'),
        hasProgressBar: !!progress,
        initialProgressWidth: progress ? progress.style.width : null,
        preCount: preList.length,
        badgeCount: badges.length,
        badgeTexts: badges.map((b) => b.textContent),
        copyBtnCount: copyBtns.length,
      };
    });

    check(modalCheck.isModalOpen, '成功打开长文阅读弹窗');
    check(modalCheck.hasProgressBar, '文章常驻顶栏包含 #article-progress 阅读进度条');
    check(modalCheck.initialProgressWidth === '0%', '打开初始阶段阅读进度条复位为 0%', modalCheck.initialProgressWidth);
    check(modalCheck.badgeCount > 0, `正文代码块包含微语言徽标 (${modalCheck.badgeTexts.join(', ')})`);
    check(modalCheck.copyBtnCount > 0, `代码块挂载有独立复制按钮 (${modalCheck.copyBtnCount} 个)`);

    // 测试滚动时阅读进度条流动更新
    const progressAfterScroll = await page.evaluate(() => {
      const content = document.getElementById('article-modal-content');
      content.scrollTop = 450;
      content.dispatchEvent(new Event('scroll'));
      const progress = document.getElementById('article-progress');
      return progress ? progress.style.width : null;
    });
    check(parseFloat(progressAfterScroll) > 0, `滚动正文后进度条实时流动更新宽度`, progressAfterScroll);

    // 测试代码块点击复制状态反馈
    const copyFeedback = await page.evaluate(async () => {
      const btn = document.querySelector('#article-modal-content .code-copy-btn');
      if (!btn) return null;
      btn.click();
      await new Promise((r) => setTimeout(r, 50));
      return {
        text: btn.textContent,
        isCopiedClass: btn.classList.contains('is-copied')
      };
    });
    check(copyFeedback && copyFeedback.text.includes('✓ 已复制'), '点击代码块复制按钮立即呈现「✓ 已复制」反馈状态', copyFeedback?.text);
    check(copyFeedback && copyFeedback.isCopiedClass, '复制按钮被赋予 .is-copied 专属高亮样式');

    // 测试长代码横向滚动时徽标与复制按钮牢牢固定不偏移
    const scrollPinCheck = await page.evaluate(async () => {
      const wrap = document.querySelector('#article-modal-content .code-wrap');
      const pre = wrap ? wrap.querySelector('pre') : null;
      const btn = wrap ? wrap.querySelector('.code-copy-btn') : null;
      const badge = wrap ? wrap.querySelector('.code-lang-badge') : null;
      if (!wrap || !pre || !btn || !badge) return null;

      const btnInitialX = btn.getBoundingClientRect().x;
      const badgeInitialX = badge.getBoundingClientRect().x;

      // 制造超长行并横向滚动 200px
      const code = pre.querySelector('code');
      const originalText = code.innerText;
      code.innerText = 'SELECT ' + 'x'.repeat(400) + ' FROM dual;';
      pre.scrollLeft = 200;
      await new Promise((r) => setTimeout(r, 60));

      const btnScrolledX = btn.getBoundingClientRect().x;
      const badgeScrolledX = badge.getBoundingClientRect().x;

      // 还原
      code.innerText = originalText;
      pre.scrollLeft = 0;

      return {
        hasWrap: true,
        btnDiff: Math.abs(btnScrolledX - btnInitialX),
        badgeDiff: Math.abs(badgeScrolledX - badgeInitialX)
      };
    });
    check(scrollPinCheck && scrollPinCheck.hasWrap, '代码块外层成功装配 .code-wrap 定位包裹层');
    check(
      scrollPinCheck && scrollPinCheck.btnDiff < 1 && scrollPinCheck.badgeDiff < 1,
      '代码横向滚动时微语言徽标与复制按钮牢牢固定在右上/左上角，未随滚动条位移',
      `btnDiff: ${scrollPinCheck?.btnDiff}px, badgeDiff: ${scrollPinCheck?.badgeDiff}px`
    );

    // 测试文章弹窗中呼出搜索面板时，按下 Esc 只关闭搜索面板而不连带关闭底层文章弹窗
    await page.keyboard.press('Control+k');
    await page.waitForTimeout(300);
    const searchOpenOverModal = await page.evaluate(() => {
      const sp = document.getElementById('search-palette');
      const am = document.getElementById('article-modal');
      return !sp.classList.contains('hidden') && !am.classList.contains('hidden');
    });
    check(searchOpenOverModal, '在文章阅读弹窗中可成功呼出搜索面板');

    // 按 Esc 退出搜索
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    const modalSurvivesEscape = await page.evaluate(() => {
      const sp = document.getElementById('search-palette');
      const am = document.getElementById('article-modal');
      return sp.classList.contains('hidden') && !am.classList.contains('hidden');
    });
    check(modalSurvivesEscape, '按 Esc 仅关闭搜索面板，底层文章阅读弹窗完好保留');

    // 关闭文章弹窗
    await page.evaluate(() => {
      const btn = document.querySelector('[data-close-modal="article"]');
      if (btn) btn.click();
    });
    await page.waitForTimeout(300);

    // ----------------------------------------------------
    // 测试项 6: 归档页（archive.html）时间河卡片全面清退“无用小框”与顶栏搜索按钮
    // ----------------------------------------------------
    await page.goto(`${BASE}archive.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);

    const arcCheck = await page.evaluate(() => {
      const pills = [...document.querySelectorAll('.arc-pill')];
      const metas = [...document.querySelectorAll('.arc-meta')];
      const seps = [...document.querySelectorAll('.arc-sep')];
      const searchBtn = document.getElementById('search-open');
      const inlineScripts = [...document.querySelectorAll('script')].map(s => s.textContent || '');
      const has3DTiltScript = inlineScripts.some(t => t.includes('init3DArchiveTilt'));

      const firstPill = pills[0];
      const cs = firstPill ? window.getComputedStyle(firstPill) : null;

      return {
        pillCount: pills.length,
        metaCount: metas.length,
        sepCount: seps.length,
        borderWidth: cs ? cs.borderWidth : null,
        borderStyle: cs ? cs.borderStyle : null,
        backgroundColor: cs ? cs.backgroundColor : null,
        firstMetaText: metas[0] ? metas[0].innerText.replace(/\s+/g, ' ').trim() : '',
        hasSearchBtn: !!searchBtn,
        searchBtnHref: searchBtn ? searchBtn.getAttribute('href') : null,
        has3DTiltScript
      };
    });

    check(arcCheck.pillCount > 0, `归档页成功渲染 ${arcCheck.pillCount} 个条目分类`);
    check(
      arcCheck.borderStyle === 'none' || arcCheck.borderWidth === '0px',
      '彻底拔除 .arc-pill 边框 (无用小框清退)',
      `${arcCheck.borderStyle} ${arcCheck.borderWidth}`
    );
    check(
      arcCheck.backgroundColor === 'rgba(0, 0, 0, 0)' || arcCheck.backgroundColor === 'transparent',
      '彻底拔除 .arc-pill 背景底色，完全透明内联融合',
      arcCheck.backgroundColor
    );
    check(
      arcCheck.sepCount > 0,
      '引入优雅的分隔小圆点 .arc-sep',
      `${arcCheck.sepCount} 个小圆点`
    );
    check(
      /·/.test(arcCheck.firstMetaText),
      '归档条目元信息呈现高级纯净内联排版（分类 · 日期 · 时长）',
      arcCheck.firstMetaText
    );
    check(arcCheck.hasSearchBtn && arcCheck.searchBtnHref === 'index.html?search=1', '归档页顶栏包含直通站内搜索按钮');
    check(!arcCheck.has3DTiltScript, '归档页彻底清退遗留 inline 3D tilt 脚本与轮询定时器');

    // ----------------------------------------------------
    // 测试项 7: 照片墙页（gallery.html）顶栏搜索按钮与清退 3D tilt 验证
    // ----------------------------------------------------
    await page.goto(`${BASE}gallery.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);
    const galCheck = await page.evaluate(() => {
      const searchBtn = document.getElementById('search-open');
      const inlineScripts = [...document.querySelectorAll('script')].map(s => s.textContent || '');
      const has3DTiltScript = inlineScripts.some(t => t.includes('init3DGalleryTilt'));
      return {
        hasSearchBtn: !!searchBtn,
        searchBtnHref: searchBtn ? searchBtn.getAttribute('href') : null,
        has3DTiltScript
      };
    });
    check(galCheck.hasSearchBtn && galCheck.searchBtnHref === 'index.html?search=1', '照片墙页顶栏包含直通站内搜索按钮');
    check(!galCheck.has3DTiltScript, '照片墙页彻底清退遗留 inline 3D tilt 脚本与轮询定时器');

    // ----------------------------------------------------
    // 测试项 8: 次级页面按 Ctrl+K 快捷跳转首页拉起搜索并自动聚焦
    // ----------------------------------------------------
    await page.keyboard.press('Control+k');
    await page.waitForTimeout(900);
    const redirectedUrl = page.url();
    check(
      redirectedUrl.includes('index.html'),
      '在次级页按下 Ctrl+K 成功自动无缝重定向至首页',
      redirectedUrl
    );

    const searchActiveAfterRedirect = await page.evaluate(() => {
      const sp = document.getElementById('search-palette');
      const inp = document.getElementById('search-input');
      return sp && !sp.classList.contains('hidden') && document.activeElement === inp;
    });
    check(searchActiveAfterRedirect, '重定向至首页后搜索命令面板自动打开且输入框已聚焦');

    console.log(`\n========================================`);
    const allPass = checks.every((c) => c.pass);
    const passCount = checks.filter((c) => c.pass).length;
    console.log(`验收结果：${passCount} / ${checks.length} 通过`);
    console.log(`========================================\n`);

    if (!allPass) {
      process.exit(1);
    }
  } finally {
    await browser.close();
    server.close();
  }
}

run().catch((err) => {
  console.error('验收套件运行异常：', err);
  process.exit(1);
});
