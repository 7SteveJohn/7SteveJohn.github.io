/**
 * 开发/验收脚本共用依赖解析（2026-10-01 体检 SEC-1）：
 * playwright-core 等验收依赖不在仓库内。优先解析 WorkBuddy 工作区（本机开发环境），
 * 找不到则回退脚本自身目录的 node_modules（通用环境）——用 os.homedir() 在运行时推导，
 * 不在仓库里硬编码任何本机用户路径。
 */
import { createRequire } from 'module';
import { existsSync } from 'node:fs';
import os from 'node:os';

// 基准文件本身无需存在——createRequire 只用它向上查找 node_modules
const wbWorkspace = os.homedir().replace(/\\/g, '/') + '/.workbuddy/binaries/node/workspace';
export const devRequire = createRequire(existsSync(wbWorkspace) ? wbWorkspace + '/index.js' : import.meta.url);
