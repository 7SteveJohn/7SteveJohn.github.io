/* ============================================================
   首屏 = 全屏粒子封面 · 实时粒子引擎（仿 igloo.inc 的 cinematic 做法）
   移植自粒子特效 demo（fx-demo.html）的实时舞台：画布铺满整个 hero，
   三个产品各自从粒子字里成形、连续变形（整簇翻转的 morph），全实时渲染。
   文案浮在画布上；光标路过推开粒子、视角随手轻倾、空白处点一下起冲击波。
   闸门：滚进视口 + 标签页前台才跑；减少动效用户只留静态封面。
   性能：DPR≤1.5；fps 看门狗先降泛光、再降粒子数（8000→4000→3000）。
   注意：本文件由 port-engine.py 从 fx-demo.html 生成，别手改——改源再重跑。
   ============================================================ */
(function(){
"use strict";
"use strict";
var host = document.querySelector('.hero-stage');
if(!host) return;
var RM = window.matchMedia('(prefers-reduced-motion: reduce)');
var poster = host.querySelector('.morph-poster');
var cv = document.createElement('canvas');
cv.setAttribute('aria-hidden', 'true');
cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;';
var ctx = cv.getContext('2d', {alpha:false});
var W=0,H=0,CX=0,CY=0,DPR=1;

/* ---------- 产品内容：每段形状/爆法/保持动作都不一样 ---------- */
var PROD = [
  { word:'FLUXION', name:'Fluxion', color:'#7fd8ff', accent2:'#a78bfa',
    forms:['word','blocks','gpu','robot'], morph:'swarm',
    burst:'radial', swirlR:3.10, swirlDir: 1,
    logic:'零件 → 显卡 → 机甲',
    desc:'把系统优化和帧生成合成一个程序，不用在几个工具之间来回切。' },
  { word:'FILEBUTLER', name:'FileButler', color:'#ffcf8a', accent2:'#ff8fb1',
    forms:['word','slabs','truck','cabinet'], morph:'panel',
    burst:'rings', swirlR:3.35, swirlDir:-1,
    logic:'文件堆 → 装车 → 归档',
    desc:'按自己写的规则批量整理文件，规则是文本，能改能存。' },
  { word:'NETOPS', name:'NetOps Handbook', color:'#9dffc8', accent2:'#7fd8ff',
    forms:['word','rack','tower','dish'], morph:'bloom',
    burst:'spiral', swirlR:3.00, swirlDir: 1,
    logic:'机柜 → 铁塔 → 天线',
    desc:'网络运维的辅助教材：58 个知识模块、25 个排障案例、392 条命令练习。' }
];

/* ---------- 时间轴：每章 = 粒子字 + 三个形态，靠"变形"互相切过去 ---------- */
var BEAT = 1.55;                // 每个形态一拍
var BEAT_LAST = 2.55;           // 每章最后一拍（留出炸开 + 漩涡）
var NFORM = 4;                  // 每章形态数（含粒子字）
var SEG = BEAT*3 + BEAT_LAST;   // 每章 7.2s
var LOOP = SEG*3;
var MORPH = 0.60;               // 每拍前 0.6s 用来变形，剩下时间保持
var BURST_AT = 1.30;            // 最后一拍里从第几秒炸开
var CL = 14;
/* ── 实体金属渲染（2026-09-24）────────────────────────────────────────
   参考 ILM 做 TF4 transformium 的做法：把金属几何体"实例化"到粒子点上并让它旋转。
   碎片是实体——有朝向、受光面亮背光面暗、堆叠时互相遮挡——所以才读作金属。
   之前全程用加法混合画小发光点，密集处叠成白光团，只会读成"霓虹雾"。 */
var NLIT = 8;                         // 金属片预渲染的明暗档数
var LIGHT = [0.42, 0.66, 0.62];       // 主光方向（视空间）：左上偏前                    // 每簇粒子数：变形时整簇一起翻转，像装甲片

/* ---------- 尺寸 ---------- */
var vig=null;
function resize(){
  DPR = Math.min(window.devicePixelRatio||1, 1.5);
  W = Math.max(2, host.clientWidth); H = Math.max(2, host.clientHeight);
  cv.width = Math.round(W*DPR); cv.height = Math.round(H*DPR);
  ctx.setTransform(DPR,0,0,DPR,0,0);
  CX = W/2; CY = H*0.72;   // 舞台中心压到下 2/3，构图照 igloo：字在上、戏在下
  vig = null;
  // 全屏封面：以短边为基准放大场景，主体大而不过界（S0 = 短边 x 0.26）
  var bf = Math.max(0.50, Math.min(W/820, H/580, 1.90));
  FIT = (Math.min(W,H)*0.26)*CAMZ/980;
  SZ  = Math.pow(bf, 0.45)/FIT;    // 尺寸补偿：场景放大时别把粒子一起吹胀
  jitK = 1/Math.max(1, FIT/bf);    // 放大场景时抖动同比收敛，边缘不被抖散
  FOCAL = 980*FIT; S0 = FOCAL/CAMZ;
  setupLayers();
  setupBg();
}
function vignette(){
  if(vig) return vig;
  var g = ctx.createRadialGradient(CX,CY,Math.min(W,H)*0.42,CX,CY,Math.max(W,H)*0.88);
  g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(1,'rgba(3,6,14,0.28)');
  vig = g; return g;
}

/* ---------- 离屏图层：粒子层 + 两级降采样泛光 ---------- */
var pC=document.createElement('canvas'), pX=pC.getContext('2d');
var b1=document.createElement('canvas'), b1X=b1.getContext('2d');
var b2=document.createElement('canvas'), b2X=b2.getContext('2d');
var bgC=document.createElement('canvas'), bgX=bgC.getContext('2d');
var BGS=0.5;      // 背景按半分辨率画：极光本来就是软的，省 4 倍填充
function setupLayers(){
  pC.width=cv.width; pC.height=cv.height;
  var w1=Math.max(2,Math.round(cv.width/6)), h1=Math.max(2,Math.round(cv.height/6));
  b1.width=w1; b1.height=h1;
  b2.width=Math.max(2,w1>>1); b2.height=Math.max(2,h1>>1);
  pX.setTransform(DPR,0,0,DPR,0,0);
  pX.imageSmoothingEnabled=true;
  b1X.imageSmoothingEnabled=true; b2X.imageSmoothingEnabled=true;
}

/* ---------- 背景层：深蓝底 + 漂浮极光 + 斜向光带（整屏铺满） ---------- */
function setupBg(){
  bgC.width  = Math.max(2, Math.round(cv.width*BGS));
  bgC.height = Math.max(2, Math.round(cv.height*BGS));
  bgX.setTransform(DPR*BGS,0,0,DPR*BGS,0,0);
  bgX.imageSmoothingEnabled=true;
}
function shadeRGB(c,k){ return [Math.round(c[0]*k), Math.round(c[1]*k), Math.round(c[2]*k)]; }
function drawBg(a){
  var p0=PROD[cur], c0=hexRGB(p0.color), c1=hexRGB(p0.accent2||p0.color);
  bgX.setTransform(1,0,0,1,0,0);
  bgX.globalCompositeOperation='source-over'; bgX.globalAlpha=1;
  bgX.clearRect(0,0,bgC.width,bgC.height);
  bgX.setTransform(DPR*BGS,0,0,DPR*BGS,0,0);
    // 底色跟着产品走：屏幕中心带当前产品的色相，越往外越冷越暗
  var ctr=shadeRGB(c0,0.34*opt.bg), mid=shadeRGB(c0,0.17*opt.bg);
  var gb=bgX.createRadialGradient(CX,CY*0.86,0,CX,CY,Math.max(W,H)*0.95);
  gb.addColorStop(0,   'rgb('+ctr[0]+','+ctr[1]+','+ctr[2]+')');
  gb.addColorStop(0.42,'rgb('+mid[0]+','+mid[1]+','+mid[2]+')');
  gb.addColorStop(0.74,'#101a2c');
  gb.addColorStop(1,   '#0b1222');
  bgX.fillStyle=gb; bgX.fillRect(0,0,W,H);
  if(opt.aura){
    bgX.globalCompositeOperation='lighter';
    var R=Math.max(W,H)*0.62;
    for(var i=0;i<3;i++){
      var ph=time*(0.045+i*0.016)+i*2.2;
      var bx=W*(0.5+0.38*Math.cos(ph*0.9+i*1.3)), by=H*(0.5+0.33*Math.sin(ph*0.77+i*1.9));
      var cc=(i===1)?c1:c0, amp=((i===1)?0.105:0.088)*opt.bg;
      var g=bgX.createRadialGradient(bx,by,0,bx,by,R);
      g.addColorStop(0,   'rgba('+cc[0]+','+cc[1]+','+cc[2]+','+amp+')');
      g.addColorStop(0.55,'rgba('+cc[0]+','+cc[1]+','+cc[2]+','+(amp*0.30)+')');
      g.addColorStop(1,   'rgba('+cc[0]+','+cc[1]+','+cc[2]+',0)');
      bgX.fillStyle=g; bgX.fillRect(bx-R,by-R,R*2,R*2);
    }
    var LM=Math.max(W,H)*1.10, wd=LM*0.17;
    for(var k=0;k<2;k++){
      var kk=(k?c0:c1), t0=Math.sin(time*(0.10+k*0.05)+k*1.7)*0.5+0.5;
      var bx2=(-0.35+t0*1.7)*W, by2=H*(k?0.80:0.20);
      bgX.save(); bgX.translate(bx2,by2); bgX.rotate(k?0.62:-0.62);
      var lg=bgX.createLinearGradient(-wd,0,wd,0);
      lg.addColorStop(0,  'rgba('+kk[0]+','+kk[1]+','+kk[2]+',0)');
      lg.addColorStop(0.5,'rgba('+kk[0]+','+kk[1]+','+kk[2]+','+((k?0.072:0.054)*opt.bg)+')');
      lg.addColorStop(1,  'rgba('+kk[0]+','+kk[1]+','+kk[2]+',0)');
      bgX.fillStyle=lg; bgX.fillRect(-wd,-LM*0.75,wd*2,LM*1.5);
      bgX.restore();
    }
    bgX.globalCompositeOperation='source-over';
  }
  ctx.globalCompositeOperation='source-over';
  ctx.globalAlpha=a; ctx.drawImage(bgC,0,0,W,H); ctx.globalAlpha=1;
}

/* ---------- 精灵 ---------- */
function sprite(r,g,b){
  var c=document.createElement('canvas'); c.width=c.height=32;
  var x=c.getContext('2d'), gr=x.createRadialGradient(16,16,0,16,16,16);
  gr.addColorStop(0,'rgba('+r+','+g+','+b+',0.94)');
  gr.addColorStop(0.32,'rgba('+r+','+g+','+b+',0.38)');
  gr.addColorStop(1,'rgba('+r+','+g+','+b+',0)');
  x.fillStyle=gr; x.fillRect(0,0,32,32); return c;
}
function hexRGB(h){ return [parseInt(h.substr(1,2),16),parseInt(h.substr(3,2),16),parseInt(h.substr(5,2),16)]; }
function toRGB(v){ return (v instanceof Array) ? v : hexRGB(v); }   // 允许直接喂 [r,g,b]
function mixHex(h1,h2,t){
  var a=toRGB(h1), b=toRGB(h2);
  return [Math.round(a[0]+(b[0]-a[0])*t), Math.round(a[1]+(b[1]-a[1])*t), Math.round(a[2]+(b[2]-a[2])*t)];
}
var SHELLSET=[];      // 每段一套跟随产品色的粒子色阶（远暗近亮）
for(var pi=0; pi<PROD.length; pi++){
  var set=[], pcol=PROD[pi].color;
  for(var si=0; si<6; si++){
    var st=si/5, cc=mixHex(mixHex(pcol,'#16233d',0.34),'#ffffff',0.58*st);
    set.push(sprite(cc[0],cc[1],cc[2]));
  }
  SHELLSET.push(set);
}
var TSPR={};
function textSprite(hex){ if(!TSPR[hex]){ var c=hexRGB(hex); TSPR[hex]=sprite(c[0],c[1],c[2]); } return TSPR[hex]; }

/* ---------- 形态表：每个形态的保持动作 + 配什么外壳 ---------- */
var FORMTAB = {
  word:   { hold:'sway',    glass:null },          // 字不能用 drift：转过去就是镜像
  blocks: { hold:'tilt',    glass:null },          // 料盘是扁的，drift 转 90° 就看不见了
  tower:  { hold:'pulse',   glass:{hx:0.72,hy:1.98,hz:0.72} },
  city:   { hold:'drift',   glass:{hx:1.78,hy:1.16,hz:0.48} },
  truck:  { hold:'wobble',  glass:{hx:2.12,hy:0.88,hz:0.80} },
  robot:  { hold:'pulse',   glass:{hx:0.90,hy:1.26,hz:0.34} },
  gpu:    { hold:'wobble',  glass:{hx:1.32,hy:0.78,hz:0.26} },
  cabinet:{ hold:'pulse', glass:{hx:0.78,hy:0.84,hz:0.44} },
  rack:   { hold:'counter', glass:{hx:0.94,hy:1.10,hz:0.62} },
  jet:    { hold:'drift',   glass:{hx:1.74,hy:0.80,hz:1.72} },
  dish:   { hold:'counter', glass:{sph:1.44} },
  sphere: { hold:'pulse',   glass:{sph:1.48} },
  diamond:{ hold:'pulse',   glass:{oct:1.58} },
  cube:   { hold:'wobble',  glass:{hx:1.62,hy:1.10,hz:1.10} },
  slabs:  { hold:'counter', glass:{slabs:1} },
  grid:   { hold:'counter', glass:{hx:1.52,hy:1.52,hz:1.52} }
};

/* ---------- 方块粒子：带金属面与亮边的小片子，4 个朝向换着用 ---------- */
var QROT=[0,0.26,-0.26,0.55];
function quadSprite(rot,r,g,b){
  var c=document.createElement('canvas'); c.width=c.height=32;
  var x=c.getContext('2d');
  x.translate(16,16); x.rotate(rot);
  var w=11.0, h=8.6;
  var gr=x.createLinearGradient(-w,-h,w,h);
  gr.addColorStop(0,   'rgba('+r+','+g+','+b+',0.95)');
  gr.addColorStop(0.55,'rgba('+r+','+g+','+b+',0.50)');
  gr.addColorStop(1,   'rgba('+r+','+g+','+b+',0.24)');
  x.fillStyle=gr; x.fillRect(-w,-h,w*2,h*2);
  x.strokeStyle='rgba(255,255,255,0.78)'; x.lineWidth=1.5; x.strokeRect(-w,-h,w*2,h*2);
  return c;
}

/* ---------- 金属碎片：同一色相预渲染 NLIT 档明暗，画时按法线挑档 ----------
   每片是有朝向的实体小钢板：受光面亮、背光面暗、边缘有高光。
   0 档几乎只剩深灰轮廓，NLIT-1 档接近白色反光。 */
var MTC = {};
function metalSprite(k, r, g, b){
  var c=document.createElement('canvas'); c.width=c.height=32;
  var x=c.getContext('2d');
  x.translate(16,16); x.rotate((k&1)?-0.40:0.22);
  var w=(k&2)?10.6:10.0, h=(k&4)?7.4:8.1;
  var lit=k/(NLIT-1);
  var sK=0.26+0.74*lit, hi=0.46*lit;
  function ch(v){ var o=Math.round(v*sK+255*hi); return o>255?255:o; }
  var dr=Math.round(r*0.13), dg=Math.round(g*0.15), db=Math.round(b*0.21);
  var gr=x.createLinearGradient(-w,-h,w,h);
  gr.addColorStop(0,   'rgb('+ch(r)+','+ch(g)+','+ch(b)+')');
  gr.addColorStop(0.58,'rgb('+Math.round((ch(r)+dr)/2)+','+Math.round((ch(g)+dg)/2)+','+Math.round((ch(b)+db)/2)+')');
  gr.addColorStop(1,   'rgb('+dr+','+dg+','+db+')');
  x.fillStyle=gr; x.fillRect(-w,-h,w*2,h*2);
  x.strokeStyle='rgba(255,255,255,'+(0.07+0.66*lit).toFixed(3)+')';
  x.lineWidth=1.2; x.strokeRect(-w,-h,w*2,h*2);
  return c;
}
function metalSet(hex){
  if(!MTC[hex]){ var c=toRGB(hex), a=[];
    for(var k=0;k<NLIT;k++) a.push(metalSprite(k, c[0],c[1],c[2]));
    MTC[hex]=a;
  }
  return MTC[hex];
}
var FORM_CN={word:'粒子字',blocks:'零件堆',tower:'塔楼',city:'城市',truck:'货车',
  robot:'机器人',jet:'飞机',dish:'天线',sphere:'球体',diamond:'八面体',
  cube:'方块',slabs:'三层板',grid:'晶格',
  gpu:'显卡',cabinet:'文件柜',rack:'机柜'};
var BQC={};
function blockSet(hex){
  if(!BQC[hex]){ var c=toRGB(hex), arr=[];
    for(var j=0;j<4;j++) arr.push(quadSprite(QROT[j], c[0],c[1],c[2]));
    BQC[hex]=arr;
  }
  return BQC[hex];
}
var BQSHELL=[];                       // 每段一套方块色阶
for(var bi=0; bi<PROD.length; bi++){
  var bcol=mixHex(mixHex(PROD[bi].color,'#16233d',0.30),'#ffffff',0.30), bs=[];
  for(var bj=0;bj<4;bj++) bs.push(quadSprite(QROT[bj], bcol[0],bcol[1],bcol[2]));
  BQSHELL.push(bs);
}
var BQDUST=[];                        // 尘埃的方块也是暗的，不抢戏
for(var di2=0; di2<PROD.length; di2++){
  var dcl=mixHex(PROD[di2].color,'#1a2440',0.62), da=[];
  for(var dj2=0; dj2<4; dj2++) da.push(quadSprite(QROT[dj2], dcl[0],dcl[1],dcl[2]));
  BQDUST.push(da);
}
/* 三套金属色阶：[0]外壳钢件 [1]内芯亮件 [2]暗尘埃 */
var METALSET=[];
for(var mi=0; mi<PROD.length; mi++){
  METALSET.push([
    metalSet(mixHex(PROD[mi].color,'#e8eef7',0.40)),
    metalSet(mixHex(PROD[mi].color,'#ffffff',0.66)),
    metalSet(mixHex(PROD[mi].color,'#1c2540',0.72))
  ]);
}

/* ---------- 粒子组（含"可被鼠标推的"偏移层 ox/oy/oz） ---------- */
function Group(n){
  this.n=n; var f=function(){return new Float32Array(n);};
  this.x=f();this.y=f();this.z=f();this.vx=f();this.vy=f();this.vz=f();
  this.sx=f();this.sy=f();this.sz=f();this.tx=f();this.ty=f();this.tz=f();
  this.d=f();this.s=f();
  this.ox=f();this.oy=f();this.oz=f();this.vox=f();this.voy=f();this.voz=f();
  // 每粒子一个固定的局部法线：变形时随所属簇的旋转矩阵一起转，明暗就跟着"翻"
  this.nx=f();this.ny=f();this.nz=f();
  for(var q3=0;q3<n;q3++){
    var tz3=Math.random()*2-1, ta3=Math.random()*6.2832, rr3=Math.sqrt(1-tz3*tz3);
    this.nx[q3]=rr3*Math.cos(ta3); this.ny[q3]=tz3; this.nz[q3]=rr3*Math.sin(ta3);
  }
  // 变形用：每粒子的弧线方向 / 幅度 / 错峰延迟 + 所属簇
  this.ax=f();this.ay=f();this.az=f();this.am=f();this.pd=f();this.cd=f();
  // 每簇：目标质心 + 一个固定旋转矩阵（飞行中整簇翻一下，到位时正好转回来）
  this.nc=Math.max(1,Math.ceil(n/CL));
  this.cn=f(); this.ccx=f(); this.ccy=f(); this.ccz=f();
  this.cR=new Float32Array(this.nc*9);
  for(var q=0;q<this.nc;q++){ this.cR[q*9]=1; this.cR[q*9+4]=1; this.cR[q*9+8]=1; }
}
function realloc(o,n){                       // 只增减数量，绝不重置位置
  var g=new Group(n), m=Math.min(n,o.n), i;
  var K=['x','y','z','vx','vy','vz','tx','ty','tz','sx','sy','sz','d','s','ox','oy','oz','vox','voy','voz',
         'ax','ay','az','am','pd','cd','nx','ny','nz'];
  for(i=0;i<m;i++) for(var k=0;k<K.length;k++) g[K[k]][i]=o[K[k]][i];
  var mc=Math.min(g.nc,o.nc);                       // 簇数据也搬过去，缩放时不会闪一下
  for(i=0;i<mc;i++){
    g.cn[i]=o.cn[i]; g.ccx[i]=o.ccx[i]; g.ccy[i]=o.ccy[i]; g.ccz[i]=o.ccz[i];
    for(var q2=0;q2<9;q2++) g.cR[i*9+q2]=o.cR[i*9+q2];
  }
  for(i=m;i<n;i++){
    var th=Math.random()*6.2832, ph=Math.acos(Math.random()*2-1), r=3.4+Math.random()*3.8;
    g.x[i]=r*Math.sin(ph)*Math.cos(th); g.y[i]=r*Math.cos(ph)*0.75; g.z[i]=r*Math.sin(ph)*Math.sin(th);
    g.tx[i]=g.x[i]; g.ty[i]=g.y[i]; g.tz[i]=g.z[i]; g.d[i]=Math.random(); g.s[i]=Math.random();
    var tz4=Math.random()*2-1, ta4=Math.random()*6.2832, rr4=Math.sqrt(1-tz4*tz4);
    g.nx[i]=rr4*Math.cos(ta4); g.ny[i]=tz4; g.nz[i]=rr4*Math.sin(ta4);
  }
  return g;
}
Group.prototype.scatter=function(r0,r1){
  for(var i=0;i<this.n;i++){
    var th=Math.random()*6.2832, ph=Math.acos(Math.random()*2-1), r=r0+Math.random()*(r1-r0);
    this.x[i]=r*Math.sin(ph)*Math.cos(th);
    this.y[i]=r*Math.cos(ph)*0.75;
    this.z[i]=r*Math.sin(ph)*Math.sin(th);
    this.vx[i]=this.vy[i]=this.vz[i]=0;
    this.d[i]=Math.random(); this.s[i]=Math.random();
  }
};
Group.prototype.capture=function(){ for(var i=0;i<this.n;i++){ this.sx[i]=this.x[i]; this.sy[i]=this.y[i]; this.sz[i]=this.z[i];
  this.vx[i]=0; this.vy[i]=0; this.vz[i]=0; } };

/* ---------- 三种凝聚形状 ---------- */
var BOX={hx:1.62,hy:1.10,hz:1.10};
function edgeBias(u,v){ if(Math.random()<0.58){ if(Math.random()<0.5) u=(u<0?-1:1); else v=(v<0?-1:1); } return [u,v]; }

function fillBox(g){                                    // 一整块冰砖
  var a=[BOX.hy*BOX.hz,BOX.hy*BOX.hz,BOX.hx*BOX.hz,BOX.hx*BOX.hz,BOX.hx*BOX.hy,BOX.hx*BOX.hy];
  var tot=0,k; for(k=0;k<6;k++) tot+=a[k];
  for(var i=0;i<g.n;i++){
    var r=Math.random()*tot,f=0; while(r>a[f]&&f<5){ r-=a[f]; f++; }
    var u=Math.random()*2-1, v=Math.random()*2-1, e=edgeBias(u,v); u=e[0]; v=e[1];
    var x,y,z;
    if(f===0){x=BOX.hx;y=u*BOX.hy;z=v*BOX.hz;}
    else if(f===1){x=-BOX.hx;y=u*BOX.hy;z=v*BOX.hz;}
    else if(f===2){y=BOX.hy;x=u*BOX.hx;z=v*BOX.hz;}
    else if(f===3){y=-BOX.hy;x=u*BOX.hx;z=v*BOX.hz;}
    else if(f===4){z=BOX.hz;x=u*BOX.hx;y=v*BOX.hy;}
    else{z=-BOX.hz;x=u*BOX.hx;y=v*BOX.hy;}
    g.tx[i]=x; g.ty[i]=y; g.tz[i]=z; g.d[i]=Math.random();
  }
}
var SLAB_Y=[-0.66,0,0.66], SLAB={hx:1.58,hy:0.075,hz:1.03};
function fillSlabs(g){                                  // 三片叠起来的薄板（会反向转）
  for(var i=0;i<g.n;i++){
    var k=(Math.random()*3)|0, sy=SLAB_Y[k];
    var u=Math.random()*2-1, v=Math.random()*2-1, e=edgeBias(u,v); u=e[0]; v=e[1];
    var x,y,z;
    if(Math.random()<0.5){ y=sy+SLAB.hy; } else { y=sy-SLAB.hy; }
    if(Math.random()<0.45){ x=u*SLAB.hx; z=(v<0?-1:1)*SLAB.hz; }
    else { x=(u<0?-1:1)*SLAB.hx; z=v*SLAB.hz; }
    if(Math.random()<0.30){ y=sy+(Math.random()<0.5?SLAB.hy:-SLAB.hy); }
    g.tx[i]=x; g.ty[i]=y; g.tz[i]=z; g.d[i]=Math.random();
  }
}
var GRID={step:0.9, half:1.35};
function fillGrid(g){                                   // 3x3x3 晶格（网络节点的感觉）
  for(var i=0;i<g.n;i++){
    var x,y,z;
    if(Math.random()<0.26){                             // 交点处加密
      var s=GRID.step;
      x=((Math.random()*3|0)-1)*s; y=((Math.random()*3|0)-1)*s; z=((Math.random()*3|0)-1)*s;
    } else {
      var ax=(Math.random()*3)|0, u=((Math.random()*3|0)-1)*GRID.step, v=((Math.random()*3|0)-1)*GRID.step;
      var p=(Math.random()*2-1)*GRID.half;
      if(ax===0){ x=p; y=u; z=v; } else if(ax===1){ x=u; y=p; z=v; } else { x=u; y=v; z=p; }
    }
    g.tx[i]=x; g.ty[i]=y; g.tz[i]=z; g.d[i]=Math.random();
  }
}
/* ---------- 形态库：能互相变形的各种物件（建筑 / 载具 / 几何体） ---------- */
var OCTA_V=[[1.5,0,0],[-1.5,0,0],[0,1.55,0],[0,-1.55,0],[0,0,1.5],[0,0,-1.5]];
var OCTA_E=[[0,2],[0,3],[0,4],[0,5],[1,2],[1,3],[1,4],[1,5],[2,4],[2,5],[3,4],[3,5]];

function fillTower(g){                     // 摩天楼：楼层带 + 屋顶设备 + 塔尖
  var hx=0.56, hz=0.56, hy=1.72, FLOOR=24;
  for(var i=0;i<g.n;i++){
    var r=Math.random(), x,y,z;
    if(r<0.055){                           // 塔尖天线
      x=(Math.random()-0.5)*0.05; z=(Math.random()-0.5)*0.05;
      y=hy+0.06+Math.random()*0.62;
    } else if(r<0.13){                     // 屋顶设备层
      x=(Math.random()*2-1)*hx*1.2; z=(Math.random()*2-1)*hz*1.2;
      y=hy+0.05+Math.random()*0.16;
    } else {
      var band=Math.random()<0.62;
      y = band ? (-hy+(Math.floor(Math.random()*FLOOR)+0.5)/FLOOR*hy*2) : (-hy+Math.random()*hy*2);
      var e=Math.random();
      if(e<0.46){ x=hx; z=(Math.random()*2-1)*hz; }
      else if(e<0.92){ z=hz; x=(Math.random()*2-1)*hx; }
      else { x=(Math.random()*2-1)*hx*0.85; z=(Math.random()*2-1)*hz*0.85; }
      x+=(Math.random()-0.5)*0.02; z+=(Math.random()-0.5)*0.02;
    }
    g.tx[i]=x; g.ty[i]=y; g.tz[i]=z; g.d[i]=Math.random();
  }
}

function fillTruck(g){                     // 载具：厢式货车 —— 后长后高，前头驾驶室压低
  var cx=-0.575, cy=0.25, hx=1.48, hy=0.47, hz=0.74;
  for(var i=0;i<g.n;i++){
    var r=Math.random(), x,y,z;
    if(r<0.20){                            // 四个轮子
      var wx=(Math.random()<0.5?-1:1)*1.02, wz=(Math.random()<0.5?-1:1)*0.60;
      var a=Math.random()*6.2832, rr=0.40*(0.74+Math.random()*0.26);
      x=wx+Math.cos(a)*rr; y=-0.62+Math.sin(a)*rr; z=wz;
    } else if(r<0.30){                     // 底盘大梁
      x=(Math.random()*2-1)*1.45; z=(Math.random()*2-1)*0.58; y=-0.30+(Math.random()-0.5)*0.06;
    } else if(r<0.78){                     // 车厢：四壁 + 顶
      var e=Math.random();
      if(e<0.34){ x=cx+(Math.random()*2-1)*hx; z=(Math.random()<0.5?-1:1)*hz; y=cy+(Math.random()*2-1)*hy; }
      else if(e<0.68){ y=cy+hy; x=cx+(Math.random()*2-1)*hx; z=(Math.random()*2-1)*hz; }
      else if(e<0.86){ x=cx-(Math.random()<0.5?-1:1)*hx; y=cy+(Math.random()*2-1)*hy; z=(Math.random()*2-1)*hz; }
      else { x=cx+(Math.random()*2-1)*hx; y=cy+(Math.random()*2-1)*hy; z=(Math.random()*2-1)*hz; }
    } else {                               // 驾驶室：车顶往前压
      var t=Math.random();
      x=0.42+t*0.76; z=(Math.random()<0.5?-1:1)*0.66;
      y=-0.22+Math.random()*(0.46*(1-0.38*t));      // 车顶往前压，比车厢矮一截
      if(Math.random()<0.22) z=(Math.random()*2-1)*0.66;
      if(Math.random()<0.30){ x=0.42+Math.random()*0.76; }
    }
    g.tx[i]=x; g.ty[i]=y; g.tz[i]=z; g.d[i]=Math.random();
  }
}

function fillDish(g){                      // 卫星天线：斜朝上的抛物面 + 馈源 + 底座
  var tilt=-0.52, ct=Math.cos(tilt), st=Math.sin(tilt);
  for(var i=0;i<g.n;i++){
    var r=Math.random(), lx,ly,lz;
    if(r<0.62){                            // 抛物面
      var a=Math.random()*6.2832, rr=Math.sqrt(Math.random())*1.24;
      lx=Math.cos(a)*rr; lz=Math.sin(a)*rr; ly=rr*rr*0.34;
    } else if(r<0.78){                     // 馈源臂
      ly=0.22+Math.random()*0.92; lx=(Math.random()-0.5)*0.10; lz=(Math.random()-0.5)*0.10;
    } else {                               // 底座
      var a2=Math.random()*6.2832, rr2=0.32+Math.random()*0.24;
      lx=Math.cos(a2)*rr2; lz=Math.sin(a2)*rr2; ly=-1.16+Math.random()*0.14;
    }
    g.tx[i]=lx; g.ty[i]=ly*ct-lz*st; g.tz[i]=ly*st+lz*ct; g.d[i]=Math.random();
  }
}

function fillSphere(g){                    // 球壳（斐波那契均匀布点，不会两极堆叠）
  var N=g.n, ga=Math.PI*(3-Math.sqrt(5));
  for(var i=0;i<N;i++){
    var yy=1-(i/((N-1)||1))*2, rr=Math.sqrt(Math.max(0,1-yy*yy)), th=ga*i;
    var R=1.44*(0.985+Math.random()*0.03);
    g.tx[i]=Math.cos(th)*rr*R; g.ty[i]=yy*R*0.94; g.tz[i]=Math.sin(th)*rr*R;
    g.d[i]=Math.random();
  }
}

function fillOcta(g){                      // 八面体（只铺在 12 条棱上，棱角分明）
  for(var i=0;i<g.n;i++){
    var e=OCTA_E[(Math.random()*OCTA_E.length)|0], a=OCTA_V[e[0]], b=OCTA_V[e[1]], t=Math.random();
    g.tx[i]=a[0]+(b[0]-a[0])*t + (Math.random()-0.5)*0.06;
    g.ty[i]=a[1]+(b[1]-a[1])*t + (Math.random()-0.5)*0.06;
    g.tz[i]=a[2]+(b[2]-a[2])*t + (Math.random()-0.5)*0.06;
    g.d[i]=Math.random();
  }
}

function fillBlocks(g){                    // 零件堆：板 / 块 / 圆盘混着摊在料盘上 —— 等着拼成显卡
  // 逐件显式摆位：类型 0=长方板 1=方块 2=圆盘(风扇/垫片)；x y 位置；a b c 半尺寸；rot 绕 Y 的倾角
  var PT=[
    [0,-1.01, 0.39, 0.166,0.086,0.030,  0.12],
    [2,-0.35, 0.40, 0.142,0.142,0.034,  0.00],
    [1, 0.32, 0.36, 0.110,0.104,0.072,  0.20],
    [0, 1.01, 0.40, 0.148,0.076,0.028, -0.14],
    [0,-0.97,-0.39, 0.130,0.084,0.032, -0.09],
    [1,-0.31,-0.36, 0.101,0.097,0.058,  0.16],
    [2, 0.36,-0.40, 0.134,0.134,0.032,  0.00],
    [0, 1.03,-0.36, 0.156,0.082,0.030,  0.10]
  ];
  var NP=PT.length;
  for(var i=0;i<g.n;i++){
    var p0=PT[(Math.random()*NP)|0];
    var typ=p0[0], cx=p0[1], cy=p0[2], a=p0[3], b=p0[4], c=p0[5], rot=p0[6];
    var u,v,w;
    if(typ===2){                            // 圆盘：圆环 + 轴心 —— 一眼是风扇/垫片
      var ang=Math.random()*6.2832, rad=a*(0.86+Math.random()*0.14);
      if(Math.random()<0.24) rad=a*(0.18+Math.random()*0.18);
      u=Math.cos(ang)*rad; v=Math.sin(ang)*rad; w=(Math.random()<0.5?-1:1)*c;
    } else if(Math.random()<0.88){           // 板/块：八成压在 12 条棱上，轮廓立得住
      var ax=(Math.random()*3)|0, t=(Math.random()*2-1);
      if(ax===0){ u=t*a; v=(Math.random()<0.5?-1:1)*b; w=(Math.random()<0.5?-1:1)*c; }
      else if(ax===1){ v=t*b; u=(Math.random()<0.5?-1:1)*a; w=(Math.random()<0.5?-1:1)*c; }
      else { w=t*c; u=(Math.random()<0.5?-1:1)*a; v=(Math.random()<0.5?-1:1)*b; }
    } else {                                // 一成铺面，给一点体积感
      u=(Math.random()*2-1)*a; v=(Math.random()*2-1)*b; w=(Math.random()*2-1)*c;
    }
    var ca=Math.cos(rot), sa=Math.sin(rot);
    g.tx[i]=cx + u*ca - w*sa;
    g.ty[i]=cy + v;
    g.tz[i]=u*sa + w*ca;
    g.d[i]=Math.random();
  }
}

function fillCity(g){                      // 城市天际线：五栋高低不同的楼 + 屋顶天线
  var GS=-1.10;                            // 地面高度
  var BL=[[-1.30,0.40,0.34,1.18],[-0.62,0.26,0.30,0.62],
          [ 0.02,0.48,0.40,1.92],[ 0.74,0.30,0.32,0.92],[ 1.32,0.22,0.26,0.48]];
  var wt=[], tot=0, k;
  for(k=0;k<BL.length;k++){ var wk=BL[k][3]*(BL[k][1]+BL[k][2]); wt.push(wk); tot+=wk; }
  for(var i=0;i<g.n;i++){
    var r=Math.random()*tot, b=0;
    while(r>wt[b] && b<BL.length-1){ r-=wt[b]; b++; }
    var B=BL[b], cx=B[0], hx=B[1], hz=B[2], hgt=B[3];
    var r2=Math.random(), x,y,z;
    if(r2<0.13){                           // 屋顶
      x=cx+(Math.random()*2-1)*hx; z=(Math.random()*2-1)*hz; y=GS+hgt;
    } else if(r2<0.19){                    // 屋顶天线
      x=cx+(Math.random()-0.5)*0.06; z=(Math.random()-0.5)*0.06;
      y=GS+hgt+Math.random()*0.30;
    } else {                               // 楼身：楼层带 + 四壁
      var band=Math.random()<0.55;
      y = band ? GS+(Math.floor(Math.random()*8)+0.5)/8*hgt : GS+Math.random()*hgt;
      var e=Math.random();
      if(e<0.42){ x=cx+hx; z=(Math.random()*2-1)*hz; }
      else if(e<0.84){ z=hz; x=cx+(Math.random()*2-1)*hx; }
      else { x=cx+(Math.random()*2-1)*hx; z=(Math.random()*2-1)*hz; }
    }
    g.tx[i]=x; g.ty[i]=y; g.tz[i]=z; g.d[i]=Math.random();
  }
}

function fillRobot(g){                     // 人形机器人：头 / 躯干 / 双臂 / 双腿
  var P=[[ 0.00, 0.98, 0.00, 0.19,0.16,0.17,0.06],   // 头
         [ 0.00, 0.78, 0.00, 0.08,0.06,0.09,0.02],   // 脖子
         [ 0.00, 0.40, 0.00, 0.44,0.30,0.26,0.20],   // 胸
         [ 0.00, 0.06, 0.00, 0.25,0.11,0.20,0.06],   // 腰（收进去，剪影才有腰线）
         [-0.60, 0.58, 0.00, 0.17,0.12,0.19,0.07],   // 左肩甲
         [ 0.60, 0.58, 0.00, 0.17,0.12,0.19,0.07],   // 右肩甲
         [-0.74,-0.06, 0.00, 0.11,0.32,0.12,0.09],   // 左臂（往外挪，和胸之间留缝）
         [ 0.74,-0.06, 0.00, 0.11,0.32,0.12,0.09],   // 右臂
         [ 0.00,-0.24, 0.00, 0.30,0.13,0.21,0.06],   // 胯
         [-0.30,-0.72, 0.00, 0.16,0.35,0.15,0.13],   // 左腿
         [ 0.30,-0.72, 0.00, 0.16,0.35,0.15,0.13],   // 右腿
         [-0.30,-1.12, 0.00, 0.18,0.06,0.22,0.04],   // 左脚
         [ 0.30,-1.12, 0.00, 0.18,0.06,0.22,0.04]];  // 右脚
  var tot=0,k; for(k=0;k<P.length;k++) tot+=P[k][6];
  for(var i=0;i<g.n;i++){
    var r=Math.random()*tot, j=0;
    while(r>P[j][6] && j<P.length-1){ r-=P[j][6]; j++; }
    var Q=P[j], e=Math.random(), x,y,z;
    if(e<0.62){ x=Q[0]+(Math.random()<0.5?-1:1)*Q[3]; y=Q[1]+(Math.random()*2-1)*Q[4]; z=(Math.random()*2-1)*Q[5]; }
    else if(e<0.86){ y=Q[1]+(Math.random()<0.5?-1:1)*Q[4]; x=Q[0]+(Math.random()*2-1)*Q[3]; z=(Math.random()*2-1)*Q[5]; }
    else { z=(Math.random()<0.5?-1:1)*Q[5]; x=Q[0]+(Math.random()*2-1)*Q[3]; y=Q[1]+(Math.random()*2-1)*Q[4]; }
    g.tx[i]=x; g.ty[i]=y; g.tz[i]=z; g.d[i]=Math.random();
  }
}

function fillJet(g){                       // 喷气机：机身 + 后掠主翼 + 尾翼 + 座舱
  for(var i=0;i<g.n;i++){
    var r=Math.random(), x,y,z;
    if(r<0.40){                            // 机身
      x=(Math.random()*2-1)*1.62;
      var rr=0.24*(1-Math.abs(x)/1.9*0.45), a=Math.random()*6.2832;
      y=Math.cos(a)*rr; z=Math.sin(a)*rr*0.9;
      if(Math.random()<0.22){ y*=0.4; z*=0.4; }
    } else if(r<0.76){                     // 主翼（后掠）
      var t=Math.random(), sgn=Math.random()<0.5?-1:1;
      x=0.30-t*1.15; y=-0.06+(Math.random()-0.5)*0.07; z=sgn*(0.16+t*1.42);
      if(Math.random()<0.16) y+=(Math.random()-0.5)*0.10;
    } else if(r<0.90){                     // 尾翼
      var sg=Math.random()<0.5?-1:1;
      if(Math.random()<0.5){ x=-1.05+(Math.random()-0.5)*0.40; y=0.08+Math.random()*0.62; z=(Math.random()-0.5)*0.06; }
      else { x=-1.15+(Math.random()-0.5)*0.30; y=0.05+(Math.random()-0.5)*0.06; z=sg*(0.10+Math.random()*0.52); }
    } else {                               // 座舱 / 发动机
      if(Math.random()<0.45){ x=0.72+(Math.random()-0.5)*0.30; y=0.24+(Math.random()-0.5)*0.10; z=(Math.random()-0.5)*0.22; }
      else { var s3=Math.random()<0.5?-1:1, a3=Math.random()*6.2832, r3=0.17*(0.7+Math.random()*0.3);
        x=-0.95+(Math.random()-0.5)*0.24; y=Math.cos(a3)*r3*0.20; z=s3*0.32+Math.sin(a3)*r3*0.60; }
    }
    g.tx[i]=x; g.ty[i]=y; g.tz[i]=z; g.d[i]=Math.random();
  }
}

/* ---------- 三个新形态：都是"同一台机器的另一个形态"，不是各不相干的物件 ---------- */

function fillGpu(g){                       // 显卡：竖起来的长卡 —— PCB + 散热罩 + 双风扇
  var hx=1.10, hy=0.60, hz=0.12;
  for(var i=0;i<g.n;i++){
    var r=Math.random(), x,y,z;
    if(r<0.34){                            // 散热罩外壳：四个边 + 前后
      var e=Math.random();
      if(e<0.34){ x=(Math.random()<0.5?-1:1)*hx; y=(Math.random()*2-1)*hy; z=(Math.random()*2-1)*hz; }
      else if(e<0.68){ y=(Math.random()<0.5?-1:1)*hy; x=(Math.random()*2-1)*hx; z=(Math.random()*2-1)*hz; }
      else { z=(Math.random()<0.5?-1:1)*hz; x=(Math.random()*2-1)*hx; y=(Math.random()*2-1)*hy; }
    } else if(r<0.68){                     // 两个风扇：圆环 + 辐条 + 轴心，贴在正面
      var sgn=(Math.random()<0.5?-1:1), a=Math.random()*6.2832;
      var rr=0.25*(0.86+Math.random()*0.16);
      x=sgn*0.52+Math.cos(a)*rr; y=0.02+Math.sin(a)*rr; z=hz+0.05+(Math.random()-0.5)*0.02;
      if(Math.random()<0.16){ x=sgn*0.52+Math.cos(a)*rr*0.34; y=0.02+Math.sin(a)*rr*0.34; }
    } else if(r<0.82){                     // 顶部热管 / 供电条
      x=(Math.random()*2-1)*hx*0.96; y=hy+0.10+Math.random()*0.07; z=(Math.random()*2-1)*hz*0.9;
    } else {                               // 背板 PCB：整片铺开
      x=(Math.random()*2-1)*hx*0.97; y=(Math.random()*2-1)*hy*0.92; z=-hz-0.04+(Math.random()-0.5)*0.03;
    }
    g.tx[i]=x; g.ty[i]=y; g.tz[i]=z; g.d[i]=Math.random();
  }
}

function fillCabinet(g){                   // 文件柜：三层抽屉 + 横把手 —— 缝要留空，才看得出是柜子
  var hx=0.62, hy=0.72, hz=0.30, LN=3, H=hy*2/LN;
  for(var i=0;i<g.n;i++){
    var r=Math.random(), x,y,z;
    var k=(Math.random()*LN)|0, yc=hy-(k+0.5)*H;
    if(r<0.34){                            // 外框：立柱 + 顶底 + 侧板，不铺背板
      var e=Math.random();
      if(e<0.42){ x=(Math.random()<0.5?-1:1)*hx; y=(Math.random()*2-1)*hy; z=(Math.random()*2-1)*hz; }
      else if(e<0.72){ y=(Math.random()<0.5?-1:1)*hy; x=(Math.random()*2-1)*hx; z=(Math.random()*2-1)*hz; }
      else { z=(Math.random()<0.5?-1:1)*hz; x=(Math.random()<0.5?-1:1)*hx; y=(Math.random()*2-1)*hy; }
    } else if(r<0.80){                     // 抽屉面板：居中一片，上下留缝
      x=(Math.random()*2-1)*hx*0.88; y=yc+(Math.random()*2-1)*(H*0.30); z=hz+0.02+(Math.random()-0.5)*0.015;
    } else {                               // 把手：横条，露在面板外
      x=(Math.random()*2-1)*0.20; y=yc; z=hz+0.10+(Math.random()-0.5)*0.02;
    }
    g.tx[i]=x; g.ty[i]=y; g.tz[i]=z; g.d[i]=Math.random();
  }
}

function fillRack(g){                      // 服务器机柜：四柱 + 六层机架单元
  var hx=0.72, hy=0.90, hz=0.42, UNIT=6, U=hy*2/UNIT;
  for(var i=0;i<g.n;i++){
    var r=Math.random(), x,y,z;
    var k=(Math.random()*UNIT)|0, yc=hy-(k+0.5)*U;
    if(r<0.34){                            // 四根立柱
      x=(Math.random()<0.5?-1:1)*hx; z=(Math.random()<0.5?-1:1)*hz; y=(Math.random()*2-1)*hy;
    } else if(r<0.46){                     // 顶板 / 底座
      y=(Math.random()<0.5?-1:1)*hy; x=(Math.random()*2-1)*hx; z=(Math.random()*2-1)*hz;
    } else if(r<0.88){                     // 机架单元：前面一层层横板
      x=(Math.random()*2-1)*hx*0.94; y=yc+(Math.random()*2-1)*(U*0.26); z=hz*0.70+(Math.random()-0.5)*0.07;
    } else {                               // 后面板 / 走线
      x=(Math.random()*2-1)*hx*0.90; y=(Math.random()*2-1)*hy*0.96; z=-hz*0.80+(Math.random()-0.5)*0.05;
    }
    g.tx[i]=x; g.ty[i]=y; g.tz[i]=z; g.d[i]=Math.random();
  }
}

function fillForm(g, form, scale){         // 统一入口
  if(form==='word') fillText(g, PROD[cur].word);
  else if(form==='blocks') fillBlocks(g);
  else if(form==='tower') fillTower(g);
  else if(form==='city') fillCity(g);
  else if(form==='truck') fillTruck(g);
  else if(form==='robot') fillRobot(g);
  else if(form==='jet') fillJet(g);
  else if(form==='dish') fillDish(g);
  else if(form==='sphere') fillSphere(g);
  else if(form==='diamond') fillOcta(g);
  else if(form==='slabs') fillSlabs(g);
  else if(form==='grid') fillGrid(g);
  else if(form==='gpu') fillGpu(g);
  else if(form==='cabinet') fillCabinet(g);
  else if(form==='rack') fillRack(g);
  else fillBox(g);
  if(scale && scale!==1){ for(var i=0;i<g.n;i++){ g.tx[i]*=scale; g.ty[i]*=scale; g.tz[i]*=scale; } }
}

/* ---------- 文字点云（栅格化结果缓存，变形时不再反复建 canvas） ---------- */
var CW_=460, CH_=110, TXT_CACHE={};
function textPoints(word){
  if(TXT_CACHE[word]) return TXT_CACHE[word];
  var c=document.createElement('canvas');
  c.width=CW_; c.height=CH_;
  var x2=c.getContext('2d'), size=74;
  x2.font='700 '+size+'px "Segoe UI",system-ui,sans-serif';
  var mw=x2.measureText(word).width;
  if(mw>CW_-24){ size=Math.floor(size*(CW_-24)/mw); x2.font='700 '+size+'px "Segoe UI",system-ui,sans-serif'; }
  x2.fillStyle='#fff'; x2.textAlign='center'; x2.textBaseline='middle';
  x2.fillText(word, CW_/2, CH_/2);
  var data=x2.getImageData(0,0,CW_,CH_).data, pts=[];
  for(var y=0;y<CH_;y+=2) for(var x=0;x<CW_;x+=2){
    if(data[(y*CW_+x)*4+3]>140) pts.push(x,y);
  }
  TXT_CACHE[word]=pts;
  return pts;
}
function fillText(g, word){
  var pts=textPoints(word), m=pts.length/2;
  if(!m){ for(var q=0;q<g.n;q++){ g.tx[q]=0;g.ty[q]=0;g.tz[q]=0; } return; }
  var WID=2.62, HGT=0.62;
  for(var i=0;i<g.n;i++){
    var j=(i%m)*2;
    g.tx[i]=(pts[j]/CW_-0.5)*WID + (Math.random()-0.5)*0.012;
    g.ty[i]=-(pts[j+1]/CH_-0.5)*HGT + (Math.random()-0.5)*0.012;
    g.tz[i]=(Math.random()-0.5)*0.10;
    g.d[i]=Math.random();
  }
}

/* ---------- 运动 ---------- */
var time=0;
function easeOut(x){ return 1-Math.pow(1-x,3); }
function easeInOut(x){ return x<0.5 ? 4*x*x*x : 1-Math.pow(-2*x+2,3)/2; }

/* ---------- 变形引擎：整簇"翻着"从旧形态飞到新形态（变形金刚那套） ---------- */
function rotMat(cR,o,ang){                 // 随机轴 + 定角 的旋转矩阵
  var th=Math.random()*6.2832, ph=Math.acos(Math.random()*2-1);
  var x=Math.sin(ph)*Math.cos(th), y=Math.cos(ph), z=Math.sin(ph)*Math.sin(th);
  var ca=Math.cos(ang), sa=Math.sin(ang), t=1-ca;
  cR[o]  =ca+x*x*t;   cR[o+1]=x*y*t-z*sa; cR[o+2]=x*z*t+y*sa;
  cR[o+3]=y*x*t+z*sa; cR[o+4]=ca+y*y*t;   cR[o+5]=y*z*t-x*sa;
  cR[o+6]=z*x*t-y*sa; cR[o+7]=z*y*t+x*sa; cR[o+8]=ca+z*z*t;
}

function prepareMorph(g, form, scale, style){
  g.capture();                             // 起点 = 当前位置，同时清掉上一轮残速
  fillForm(g, form, scale);
  var nc=g.nc, i, c;
  for(c=0;c<nc;c++){ g.cn[c]=0; g.ccx[c]=0; g.ccy[c]=0; g.ccz[c]=0; }
  for(i=0;i<g.n;i++){
    c=(i/CL)|0; if(c>=nc) c=nc-1;
    g.cd[i]=c;
    g.ccx[c]+=g.tx[i]; g.ccy[c]+=g.ty[i]; g.ccz[c]+=g.tz[i]; g.cn[c]++;
    // 弧线方向与幅度：三个产品给三种"性格"
    var th=Math.random()*6.2832, ph=Math.acos(Math.random()*2-1);
    var ux=Math.sin(ph)*Math.cos(th), uy=Math.cos(ph), uz=Math.sin(ph)*Math.sin(th);
    if(style==='bloom'){                   // 先炸开再长回来
      var L=Math.sqrt(g.tx[i]*g.tx[i]+g.ty[i]*g.ty[i]+g.tz[i]*g.tz[i])||1;
      ux=g.tx[i]/L+(Math.random()-0.5)*0.5; uy=g.ty[i]/L+(Math.random()-0.5)*0.5; uz=g.tz[i]/L+(Math.random()-0.5)*0.5;
      g.am[i]=0.30+Math.random()*0.95;
    } else if(style==='panel'){            // 装甲片：小弧，主要靠整簇翻转
      g.am[i]=0.12+Math.random()*0.42;
    } else {                               // 蜂群：随机散弧
      g.am[i]=0.20+Math.random()*0.78;
    }
    var ul=Math.sqrt(ux*ux+uy*uy+uz*uz)||1;
    g.ax[i]=ux/ul; g.ay[i]=uy/ul; g.az[i]=uz/ul;
    g.pd[i]=Math.random()*0.24;            // 错峰启程，像零件分批飞过去
  }
  for(c=0;c<nc;c++){
    var q=g.cn[c]||1; g.ccx[c]/=q; g.ccy[c]/=q; g.ccz[c]/=q;
    rotMat(g.cR, c*9, (Math.random()<0.5?-1:1)*(0.55+Math.random()*1.25));
  }
}

function morph(g, p){
  for(var i=0;i<g.n;i++){
    var dl=g.pd[i], k=(p-dl)/(1-dl); if(k<0)k=0; else if(k>1)k=1;
    var e=easeInOut(k), bel=4*k*(1-k);     // bel 是 0→1→0 的钟形，两端正好归零
    var bg=bel*g.am[i];
    var x=g.sx[i]+(g.tx[i]-g.sx[i])*e + g.ax[i]*bg;
    var y=g.sy[i]+(g.ty[i]-g.sy[i])*e + g.ay[i]*bg;
    var z=g.sz[i]+(g.tz[i]-g.sz[i])*e + g.az[i]*bg;
    if(bel>0.02){                          // 所属那簇整体翻一下，到位时正好转回来
      var c=g.cd[i], o=c*9;
      var u=g.tx[i]-g.ccx[c], v=g.ty[i]-g.ccy[c], w=g.tz[i]-g.ccz[c];
      var rx=g.cR[o]*u+g.cR[o+1]*v+g.cR[o+2]*w;
      var ry=g.cR[o+3]*u+g.cR[o+4]*v+g.cR[o+5]*w;
      var rz=g.cR[o+6]*u+g.cR[o+7]*v+g.cR[o+8]*w;
      x+=(rx-u)*bel; y+=(ry-v)*bel; z+=(rz-w)*bel;
    }
    g.x[i]=x; g.y[i]=y; g.z[i]=z;
  }
}

var jitK=1;   // 缩放补偿：zoom 放大 k 倍时抖动缩到 1/k，边缘才不会被抖散
function jit(i,g,k){ return Math.sin(time*1.0+k*g.s[i]*6.28)*0.030*jitK; }

function hold(g,style,hb,dir){
  var sg=(dir<0?-1:1);
  for(var i=0;i<g.n;i++){
    var tx=g.tx[i], ty=g.ty[i], tz=g.tz[i], px,py,pz;
    if(style==='counter'){                        // 三层反向转
      var a0=sg*time*0.60, a1=-sg*time*0.85, a2=sg*time*1.10;
      var ca,sa;
      if(ty>0.33){ ca=Math.cos(a2); sa=Math.sin(a2); }
      else if(ty<-0.33){ ca=Math.cos(a0); sa=Math.sin(a0); }
      else { ca=Math.cos(a1); sa=Math.sin(a1); }
      px=tx*ca-tz*sa + jit(i,g,1.0);
      pz=tx*sa+tz*ca + jit(i,g,0.8);
      py=ty + jit(i,g,1.3);
    } else if(style==='pulse'){                   // 整体呼吸
      var kk=1+Math.sin(time*1.15)*0.06;
      px=tx*kk + jit(i,g,1.0);
      py=ty*kk + jit(i,g,1.3);
      pz=tz*kk + jit(i,g,0.8);
    } else if(style==='sway'){                    // 正反摆：只在 ±23° 内转，粒子字不会翻到背面变镜像
      var asw=Math.sin(time*0.55)*0.40, csw=Math.cos(asw), ssw=Math.sin(asw);
      px=tx*csw-tz*ssw + jit(i,g,1.0);
      pz=tx*ssw+tz*csw + jit(i,g,0.8);
      py=ty + jit(i,g,1.3);
    } else if(style==='tilt'){                   // 大幅摆动（±52°）：扁平形状既立体又不会被转成一根线
      var atl=Math.sin(time*0.42)*0.92, ctl=Math.cos(atl), stl=Math.sin(atl);
      px=tx*ctl-tz*stl + jit(i,g,1.0);
      pz=tx*stl+tz*ctl + jit(i,g,0.8);
      py=ty + jit(i,g,1.3);
    } else if(style==='drift'){                   // 整体慢慢转：悬浮装甲片的悬停感
      var ad=sg*time*0.24, cdr=Math.cos(ad), sdr=Math.sin(ad);
      px=tx*cdr-tz*sdr + jit(i,g,1.0);
      pz=tx*sdr+tz*cdr + jit(i,g,0.8);
      py=ty + jit(i,g,1.3);
    } else {                                      // 轻微抖动
      px=tx + jit(i,g,1.0);
      py=ty + jit(i,g,1.3);
      pz=tz + jit(i,g,0.8);
    }
    g.x[i]=g.x[i]+(px-g.x[i])*hb;
    g.y[i]=g.y[i]+(py-g.y[i])*hb;
    g.z[i]=g.z[i]+(pz-g.z[i])*hb;
  }
}

function integrate(g,dt,swirlK,dragK,swirlR,dir){
  var drag=Math.pow(dragK||0.95,dt*60);
  for(var i=0;i<g.n;i++){
    var x=g.x[i],y=g.y[i],z=g.z[i],vx=g.vx[i],vy=g.vy[i],vz=g.vz[i],s=g.s[i]*6.2832;
    vx+=Math.sin(y*1.3+time*0.8+s)*0.85*dt;
    vy+=Math.sin(z*1.1+time*0.7+s*1.7)*0.85*dt;
    vz+=Math.sin(x*1.5+time*0.9+s*2.3)*0.85*dt;
    if(swirlK>0){
      var r=Math.sqrt(x*x+z*z)||1e-4, pull=(swirlR-r)*0.9*swirlK;
      vx+=(x/r)*pull*dt; vz+=(z/r)*pull*dt;
      vx+=-z*0.7*dir*swirlK*dt; vz+=x*0.7*dir*swirlK*dt;
      vy+=-y*0.85*swirlK*dt;
    }
    vx*=drag; vy*=drag; vz*=drag;
    g.vx[i]=vx; g.vy[i]=vy; g.vz[i]=vz;
    g.x[i]=x+vx*dt; g.y[i]=y+vy*dt; g.z[i]=z+vz*dt;
  }
}

function burst(g,style,pw){
  var pm = style==='rings' ? 0.72 : (style==='spiral' ? 0.68 : 1.0);
  var P = pw*pm;
  for(var i=0;i<g.n;i++){
    var x=g.x[i],y=g.y[i],z=g.z[i], sp=P*(0.75+Math.random()*1.05);
    if(style==='rings'){                        // 平面外扩 + 三层各自上下摊开
      var rx=Math.sqrt(x*x+z*z)||1e-4;
      g.vx[i]=x/rx*sp*1.05 + (Math.random()-0.5)*0.35;
      g.vz[i]=z/rx*sp*1.05 + (Math.random()-0.5)*0.35;
      g.vy[i]=y*4.00*pm + (Math.random()-0.5)*0.45;
    } else if(style==='spiral'){                // 旋臂：切向为主
      var L2=Math.sqrt(x*x+y*y+z*z)||1e-4;
      g.vx[i]=x/L2*sp*0.50 - z*1.30*pm + (Math.random()-0.5)*0.45;
      g.vy[i]=y/L2*sp*0.40 + (Math.random()-0.5)*0.80 + 0.26;
      g.vz[i]=z/L2*sp*0.50 + x*1.30*pm + (Math.random()-0.5)*0.45;
    } else {                                    // 径向爆开
      var L=Math.sqrt(x*x+y*y+z*z)||1e-4;
      g.vx[i]=x/L*sp*1.25 - z*0.55 + (Math.random()-0.5)*0.8;
      g.vy[i]=y/L*sp*0.85 + (Math.random()-0.5)*1.1 + 0.45;
      g.vz[i]=z/L*sp*1.25 + x*0.55 + (Math.random()-0.5)*0.8;
    }
  }
}

function rms(g){
  var s=0; for(var i=0;i<g.n;i++){ var x=g.x[i],y=g.y[i],z=g.z[i]; s+=x*x+y*y+z*z; }
  return Math.sqrt(s/g.n);
}
function rmsOff(g){
  var s=0; for(var i=0;i<g.n;i++){ var x=g.ox[i],y=g.oy[i],z=g.oz[i]; s+=x*x+y*y+z*z; }
  return Math.sqrt(s/g.n);
}
function offInfo(g){
  var mx=0,n=0; for(var i=0;i<g.n;i++){
    var o=Math.sqrt(g.ox[i]*g.ox[i]+g.oy[i]*g.oy[i]+g.oz[i]*g.oz[i]);
    if(o>mx)mx=o; if(o>0.5)n++;
  }
  return [mx,n];
}

/* ---------- 鼠标：推开 / 冲击波 ---------- */
var mouse3={x:99,y:99,tx:99,ty:99,on:false,px:-99,py:-99,has:false};
var waves=[];
var trail=[];
var MOUSE_R=2.60, MOUSE_R2=MOUSE_R*MOUSE_R, MOUSE_STR=125, SPRING=30, OFF_LIM=3.00;

function mouseForce(g,dt){
  var damp=Math.pow(0.90,dt*60);
  var Mx=mouse3.x, My=mouse3.y, mode=(mouse3.on&&opt.force!=='off')?opt.force:'off';
  var on = mode!=='off';
  for(var i=0;i<g.n;i++){
    var ex=g.x[i]+g.ox[i], ey=g.y[i]+g.oy[i], ez=g.z[i]+g.oz[i];
    if(on){
      var dx=ex-Mx, dy=ey-My, d2=dx*dx+dy*dy+ez*ez;
      if(d2<MOUSE_R2){
        var d=Math.sqrt(d2)||1e-3, k=1-d/MOUSE_R, f=k*k*MOUSE_STR;
        var sgn = mode==='push' ? 1 : -0.95;
        if(mode==='pull' && d<0.50) sgn = (0.50-d)/0.50*1.8;   // 芯里反过来顶，免得全挤成一个点
        g.vox[i]+=dx/d*f*sgn*dt; g.voy[i]+=dy/d*f*sgn*dt; g.voz[i]+=ez/d*f*sgn*dt;
        g.vox[i]+=-ez*2.4*k*sgn*dt; g.voz[i]+=dx*2.4*k*sgn*dt;  // 绕光标带一点旋转
      }
    }
    // 回弹（弹簧）
    g.vox[i]+=-g.ox[i]*SPRING*dt; g.voy[i]+=-g.oy[i]*SPRING*dt; g.voz[i]+=-g.oz[i]*SPRING*dt;
    g.vox[i]*=damp; g.voy[i]*=damp; g.voz[i]*=damp;
    var ox=g.ox[i]+g.vox[i]*dt, oy=g.oy[i]+g.voy[i]*dt, oz=g.oz[i]+g.voz[i]*dt;
    if(ox>OFF_LIM)ox=OFF_LIM; else if(ox<-OFF_LIM)ox=-OFF_LIM;
    if(oy>OFF_LIM)oy=OFF_LIM; else if(oy<-OFF_LIM)oy=-OFF_LIM;
    if(oz>OFF_LIM)oz=OFF_LIM; else if(oz<-OFF_LIM)oz=-OFF_LIM;
    g.ox[i]=ox; g.oy[i]=oy; g.oz[i]=oz;
  }
}

function waveForce(g,dt){
  if(!opt.wave) return;
  for(var w=0;w<waves.length;w++){
    var wv=waves[w], rr=0.28+wv.t*6.2, thick=0.45, pw=19;
    for(var i=0;i<g.n;i++){
      var dx=g.x[i]+g.ox[i]-wv.x, dy=g.y[i]+g.oy[i]-wv.y, dz=g.z[i]+g.oz[i];
      var d=Math.sqrt(dx*dx+dy*dy+dz*dz)||1e-3;
      var band=1-Math.abs(d-rr)/thick;
      if(band>0){
        var f=band*band*pw;
        g.vox[i]+=dx/d*f*dt; g.voy[i]+=dy/d*f*dt; g.voz[i]+=dz/d*f*dt;
      }
    }
  }
}
function spawnWave(wx,wy){
  if(waves.length>3) waves.shift();
  waves.push({x:wx,y:wy,t:0});
  // 中心先来一发瞬时冲量，手感更"炸"
  var pw=13;
  [shell,text].forEach(function(g){
    var p2=(g===text)?pw*0.8:pw;
    for(var i=0;i<g.n;i++){
      var dx=g.x[i]+g.ox[i]-wx, dy=g.y[i]+g.oy[i]-wy, dz=g.z[i]+g.oz[i];
      var d=Math.sqrt(dx*dx+dy*dy+dz*dz)||1e-3;
      if(d<2.2){ var f=(1-d/2.2); f=f*f*p2; g.vox[i]+=dx/d*f; g.voy[i]+=dy/d*f; g.voz[i]+=dz/d*f; }
    }
  });
}

/* ---------- 场景状态 ---------- */
var shell=new Group(8000), text=new Group(2400), dust=new Group(680);
shell.scatter(3.4,7.6); text.scatter(2.2,5.4); dust.scatter(3.4,8.0);
var DUSTSET=[];   // 尘埃也跟着产品的色调走
for(var dj=0; dj<PROD.length; dj++){
  var dcv=mixHex(PROD[dj].color,'#18233c',0.55); DUSTSET.push(sprite(dcv[0],dcv[1],dcv[2]));
}
var tt=0, cur=-1, shattered=false, flash=0, glassA=0, spinPhase=0, N_SHELL=8000;
var curForm=-1, beatNow=0;

/* ── 手动变形状态机（2026-09-24）──────────────────────────────────────
   用户反馈"自动变形没有交互感，感觉就只是在放 ppt"。所以默认 opt.auto=false：
   相位不再由 tt 自己往前走，而是由交互驱动 ——
     点画面 / 空格 / →   : 先炸开，再重组成下一个形态
     右键 / ←  / ↑       : 上一个形态
     按住拖动            : 转视角（松手停在那个角度）
     滚轮                : 下一个 / 上一个形态（Shift+滚轮 = 换产品）
     1 / 2 / 3 / Tab     : 换产品      A : 切回自动播放      F : 全屏
   状态机只负责"造"出一个 local（段内时间），后面的 beat / bl / mp / shellMode
   推导全部原样复用 —— 所以自动播放那条路径一行没改，勾上"自动播放"就回去了。 */
var mBeat=0, mNext=1, mMode='hold', mT=0, holdT=0, fdShown=-1;
var BURST_DUR=0.30;
var HOLD_SPAN = BEAT - MORPH - 0.02;   // 保持相位必须钉在本拍内，否则推导出的 beat 会漂到下一个形态
var camYaw=0, camPitch=0, camYawT=0, camPitchT=0;

function triggerForm(d){
  if(mMode==='burst') return;                 // 正在炸开，忽略叠进来的命令
  mNext = (mBeat + ((d<0)?-1:1) + 4) % 4;
  mMode = 'burst'; mT = 0; shattered = false; // 交给既有的 shellMode==='free' 分支去放炸开
}
function manualLocal(dt){
  if(mMode==='burst'){
    mT += dt;
    if(mT>=BURST_DUR){ mBeat=mNext; mMode='morph'; mT=0; }
    return mBeat*BEAT + MORPH + HOLD_SPAN;   // 先维持旧形态的"保持"相位
  }
  if(mMode==='morph'){
    mT += dt;
    if(mT>=MORPH){ mMode='hold'; holdT=0; return mBeat*BEAT + MORPH; }
    return mBeat*BEAT + mT;
  }
  holdT = Math.min(HOLD_SPAN, holdT+dt);
  return mBeat*BEAT + MORPH + holdT;
}

var opt={trail:true,glow:true,glass:false,spin:false,text:false,slow:false,paused:false,
         force:'push',wave:true,cursor:true,bloom:true,dof:true,streak:true,
         dust:true,sweep:true,trailS:true,reverse:false,aura:true,bg:1,block:true,mat:'solid',auto:true};

var FPS=0;   // 最近一次统计的帧率，给看门狗和探针用
function enterProduct(i){
  cur=i; curForm=i*10; beatNow=0;
  mBeat=0; mNext=1; mMode='hold'; mT=0; holdT=0; fdShown=-1; shattered=false;
  var f=PROD[i].forms[0];
  prepareMorph(shell, f, 1.00, PROD[i].morph);   // 外壳：主形态
  prepareMorph(text,  f, 0.54, PROD[i].morph);   // 内芯：同一形态的小一号
  shattered=false; glassA=0;
}

/* ---------- 冰壳：每个产品用的盒子不一样 ---------- */
var FOCAL=980, CAMZ=9.0, S0=FOCAL/CAMZ, FIT=1, SZ=1;
var CORN=[[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]];
var FACE=[[4,5,6,7],[0,1,2,3],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7]];
var EDGE=[[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];

function boxesForSlabs(){
  var a0=time*0.60, a1=-time*0.85, a2=time*1.10;
  return [{hx:SLAB.hx+0.02,hy:SLAB.hy,hz:SLAB.hz+0.02,y:SLAB_Y[0],ry:a0},
          {hx:SLAB.hx+0.02,hy:SLAB.hy,hz:SLAB.hz+0.02,y:SLAB_Y[1],ry:a1},
          {hx:SLAB.hx+0.02,hy:SLAB.hy,hz:SLAB.hz+0.02,y:SLAB_Y[2],ry:a2}];
}

function proj3(x,y,z,yaw,pitch){            // 单点投影（球 / 八面体线框用）
  var cy_=Math.cos(yaw),sy_=Math.sin(yaw),cp_=Math.cos(pitch),sp_=Math.sin(pitch);
  var x1=x*cy_+z*sy_, z1=-x*sy_+z*cy_;
  var y1=y*cp_-z1*sp_, z2=y*sp_+z1*cp_;
  var zz=z2+CAMZ, s=FOCAL/zz;
  return [CX+x1*s, CY-y1*s, zz];
}

function drawGlassSphere(r,yaw,pitch,a){    // 球形护罩：经纬线
  ctx.globalCompositeOperation='source-over';
  var LAT=6, LON=9, SEGP=22, i, s, t, ph, rr, yy, p;
  ctx.lineWidth=0.9;
  for(i=1;i<=LAT;i++){
    ph=Math.PI*i/(LAT+1); yy=Math.cos(ph)*r; rr=Math.sin(ph)*r;
    ctx.beginPath();
    for(s=0;s<=SEGP;s++){ t=s/SEGP*6.2832; p=proj3(Math.cos(t)*rr, yy, Math.sin(t)*rr, yaw, pitch);
      if(s===0) ctx.moveTo(p[0],p[1]); else ctx.lineTo(p[0],p[1]); }
    ctx.strokeStyle='rgba(198,230,255,'+(0.085*a)+')'; ctx.stroke();
  }
  for(i=0;i<LON;i++){
    t=i/LON*6.2832;
    ctx.beginPath();
    for(s=0;s<=14;s++){ ph=Math.PI*s/14;
      p=proj3(Math.sin(ph)*Math.cos(t)*r, Math.cos(ph)*r, Math.sin(ph)*Math.sin(t)*r, yaw, pitch);
      if(s===0) ctx.moveTo(p[0],p[1]); else ctx.lineTo(p[0],p[1]); }
    ctx.strokeStyle='rgba(198,230,255,'+(0.085*a)+')'; ctx.stroke();
  }
}

function drawGlassOcta(r,yaw,pitch,a){      // 八面体线框
  ctx.globalCompositeOperation='source-over';
  var pr=[], i, k=r/1.5;
  for(i=0;i<OCTA_V.length;i++) pr.push(proj3(OCTA_V[i][0]*k, OCTA_V[i][1]*k, OCTA_V[i][2]*k, yaw, pitch));
  for(i=0;i<OCTA_E.length;i++){
    var e=OCTA_E[i], q1=pr[e[0]], q2=pr[e[1]];
    var nn=1-((q1[2]+q2[2])/2-CAMZ+1.6)/3.2; nn=nn<0?0:(nn>1?1:nn);
    ctx.beginPath(); ctx.moveTo(q1[0],q1[1]); ctx.lineTo(q2[0],q2[1]);
    ctx.strokeStyle='rgba(226,242,255,'+(0.14+0.40*nn)*a+')';
    ctx.lineWidth=0.8+1.0*nn; ctx.stroke();
  }
}

function drawGlassFor(form,yaw,pitch,a){     // 形态自带的外壳
  if(a<=0.004) return;
  var gl=FORMTAB[form] && FORMTAB[form].glass;
  if(!gl) return;
  if(gl.sph) drawGlassSphere(gl.sph,yaw,pitch,a);
  else if(gl.oct) drawGlassOcta(gl.oct,yaw,pitch,a);
  else if(gl.slabs) drawGlass(boxesForSlabs(),yaw,pitch,a);
  else drawGlass([{hx:gl.hx,hy:gl.hy,hz:gl.hz,y:0,ry:0}],yaw,pitch,a);
}

var faces=[];   // 复用的面缓冲，避免每帧新建
function drawGlass(boxes,yaw,pitch,a){
  if(a<=0.004) return;
  var cy_=Math.cos(yaw),sy_=Math.sin(yaw),cp_=Math.cos(pitch),sp_=Math.sin(pitch);
  faces.length=0;
  var corners=[];
  for(var b=0;b<boxes.length;b++){
    var bx=boxes[b], cb=Math.cos(bx.ry||0), sb=Math.sin(bx.ry||0), pr=[];
    for(var i=0;i<8;i++){
      var c=CORN[i], x=c[0]*bx.hx, y=c[1]*bx.hy+(bx.y||0), z=c[2]*bx.hz;
      var x0=x*cb-z*sb, z0=x*sb+z*cb;
      var x1=x0*cy_+z0*sy_, z1=-x0*sy_+z0*cy_;
      var y1=y*cp_-z1*sp_, z2=y*sp_+z1*cp_;
      var zz=z2+CAMZ, s=FOCAL/zz;
      pr.push([CX+x1*s, CY-y1*s, zz]);
    }
    corners.push(pr);
    for(var f=0;f<6;f++){
      var q=FACE[f];
      faces.push({p:[pr[q[0]],pr[q[1]],pr[q[2]],pr[q[3]]],
                  zz:(pr[q[0]][2]+pr[q[1]][2]+pr[q[2]][2]+pr[q[3]][2])/4});
    }
  }
  faces.sort(function(u,v){ return v.zz-u.zz; });      // 远面先画
  ctx.globalCompositeOperation='source-over';
  for(var k=0;k<faces.length;k++){
    var fa=faces[k], P=fa.p;
    var mnx=1e9,mny=1e9,mxx=-1e9,mxy=-1e9;
    for(var m=0;m<4;m++){
      var px=P[m][0], py=P[m][1];
      if(px<mnx)mnx=px; if(px>mxx)mxx=px; if(py<mny)mny=py; if(py>mxy)mxy=py;
    }
    var near=1-(fa.zz-CAMZ+1.6)/3.2; near=near<0?0:(near>1?1:near);
    ctx.beginPath();
    ctx.moveTo(P[0][0],P[0][1]);
    for(var n2=1;n2<4;n2++) ctx.lineTo(P[n2][0],P[n2][1]);
    ctx.closePath();
    var g2=ctx.createLinearGradient(mnx,mny,mxx,mxy);
    g2.addColorStop(0,   'rgba(228,244,255,'+(0.026+0.040*near)*a+')');
    g2.addColorStop(0.55,'rgba(150,200,255,'+(0.008+0.016*near)*a+')');
    g2.addColorStop(1,   'rgba(120,170,255,'+(0.024+0.032*near)*a+')');
    ctx.fillStyle=g2; ctx.fill();
    if(opt.sweep && k===faces.length-1){      // 最近那面扫过一道流光
      var sw=0.5+Math.sin(time*0.55)*0.40;
      var sg=ctx.createLinearGradient(mnx,mny,mxx,mxy);
      sg.addColorStop(Math.max(0,sw-0.16),'rgba(255,255,255,0)');
      sg.addColorStop(sw,'rgba(236,248,255,'+(0.11*a)+')');
      sg.addColorStop(Math.min(1,sw+0.16),'rgba(255,255,255,0)');
      ctx.fillStyle=sg; ctx.fill();
    }
    ctx.strokeStyle='rgba(200,230,255,'+(0.09+0.11*near)*a+')';
    ctx.lineWidth=1; ctx.stroke();
  }
  for(var bb=0;bb<corners.length;bb++){
    var pr2=corners[bb];
    for(var e=0;e<12;e++){
      var a1=EDGE[e][0], a2=EDGE[e][1];
      var zz2=(pr2[a1][2]+pr2[a2][2])/2;
      var nn=1-(zz2-CAMZ+1.6)/3.2; nn=nn<0?0:(nn>1?1:nn);
      ctx.beginPath(); ctx.moveTo(pr2[a1][0],pr2[a1][1]); ctx.lineTo(pr2[a2][0],pr2[a2][1]);
      ctx.strokeStyle='rgba(226,242,255,'+(0.16+0.42*nn)*a+')';
      ctx.lineWidth=0.8+1.1*nn; ctx.stroke();
    }
  }
}

/* ---------- 画家算法：深度分桶 + 计数排序（全部预分配，帧内零 GC） ---------- */
var NB = 64, ZMIN = 1.2, ZSPAN = 15.0;
var _ord=new Int32Array(0), _key=new Int32Array(0), _px=new Float32Array(0), _py=new Float32Array(0),
    _rr=new Float32Array(0), _al=new Float32Array(0), _lv=new Uint8Array(0),
    _cnt=new Int32Array(NB+1), _pos=new Int32Array(NB);
function ensureSort(n){
  if(_ord.length < n){
    _ord=new Int32Array(n); _key=new Int32Array(n);
    _px=new Float32Array(n); _py=new Float32Array(n);
    _rr=new Float32Array(n); _al=new Float32Array(n); _lv=new Uint8Array(n);
  }
}

function drawGroup(c2, g, sp, rot, alpha, sizeBase, blk, lvl){
  var cy_=rot[0],sy_=rot[1],cp_=rot[2],sp_=rot[3];
  c2.lineCap='round';

  /* ── 实体金属路径（默认）：碎片有朝向、有明暗、互相遮挡 ──
     ① 投影 + 按"簇旋转矩阵 × 粒子法线"挑预渲染明暗档
     ② 深度分桶计数排序（画家算法），从远到近以 source-over 画 → 近处碎片真正盖住远处
     ③ 再叠一层稀疏镜面火花，保持"活着"的感觉 */
  if(opt.mat==='solid'){
    var n=g.n, i, j;
    ensureSort(n);
    for(j=0;j<=NB;j++) _cnt[j]=0;
    for(i=0;i<n;i++){
      var x=g.x[i]+g.ox[i], y=g.y[i]+g.oy[i], z=g.z[i]+g.oz[i];
      var x1=x*cy_+z*sy_, z1=-x*sy_+z*cy_;
      var y1=y*cp_-z1*sp_, z2=y*sp_+z1*cp_;
      var zz=z2+CAMZ;
      if(zz<1.2){ _lv[i]=255; continue; }
      var s=FOCAL/zz;
      var ppx=CX+x1*s, ppy=CY-y1*s;
      _px[i]=ppx; _py[i]=ppy;
      if(ppx<-44||ppx>W+44||ppy<-44||ppy>H+44){ _lv[i]=255; continue; }
      var t=(10.9-zz)/3.8; t=t<0?0:(t>1?1:t);
      var dof = opt.dof ? Math.abs(zz-CAMZ)/3.6 : 0; if(dof>1) dof=1;
      // 金属碎片是硬边的：离焦只轻微放松，不能像发光点那样糊成一团
      var rr=sizeBase*(s/110)*SZ*(1+dof*0.32); if(rr<1.2) rr=1.2; else if(rr>8.4) rr=8.4;
      var aa=alpha*(0.50+0.50*t)/((1+dof*0.30)*(1+dof*0.30)); aa*=1.22;
      if(aa>1) aa=1;
      if(aa<=0.012){ _lv[i]=255; continue; }
      var o=(i/CL)|0, m=o*9;
      var n0x=g.nx[i], n0y=g.ny[i], n0z=g.nz[i];
      var rnx=n0x*g.cR[m  ]+n0y*g.cR[m+1]+n0z*g.cR[m+2];
      var rny=n0x*g.cR[m+3]+n0y*g.cR[m+4]+n0z*g.cR[m+5];
      var rnz=n0x*g.cR[m+6]+n0y*g.cR[m+7]+n0z*g.cR[m+8];
      var lit=rnx*LIGHT[0]+rny*LIGHT[1]+rnz*LIGHT[2];
      lit=0.26+0.74*(lit*0.5+0.5);
      var lv=(lit*(NLIT-1)+0.5)|0; if(lv<0) lv=0; else if(lv>NLIT-1) lv=NLIT-1;
      _lv[i]=lv; _rr[i]=rr; _al[i]=aa;
      var bk=((zz-ZMIN)/ZSPAN*NB)|0; if(bk<0) bk=0; else if(bk>=NB) bk=NB-1;
      _key[i]=bk; _cnt[bk+1]++;
    }
    for(j=1;j<=NB;j++) _cnt[j]+=_cnt[j-1];
    for(j=0;j<NB;j++) _pos[j]=_cnt[j];
    for(i=0;i<n;i++){ if(_lv[i]===255) continue; _ord[_pos[_key[i]]++]=i; }
    var set=(METALSET[cur] && METALSET[cur][lvl]) ? METALSET[cur][lvl] : METALSET[0][0];
    c2.globalCompositeOperation='source-over';
    for(j=NB-1;j>=0;j--){                       // 桶号越大 = 越近，所以倒着画
      for(var q2=_cnt[j]; q2<_cnt[j+1]; q2++){
        i=_ord[q2];
        var im=set[_lv[i]], r2=_rr[i];
        c2.globalAlpha=_al[i];
        c2.drawImage(im, _px[i]-r2, _py[i]-r2, r2*2, r2*2);
      }
    }
    c2.globalCompositeOperation='lighter';
    var spk=set[NLIT-1];
    for(i=0;i<n;i+=7){                          // 只给七分之一的碎片加镜面火花，成本可控
      if(_lv[i]===255 || _al[i]<0.22) continue;
      var r3=_rr[i]*0.60;
      c2.globalAlpha=_al[i]*0.26;
      c2.drawImage(spk, _px[i]-r3, _py[i]-r3, r3*2, r3*2);
    }
    c2.globalAlpha=1;
    return;
  }

  /* ── 旧路径：自发光粒子（发光叠加），保留以便对比 ── */
  var useBlk = (opt.block && blk) ? blk : null;
  c2.globalCompositeOperation = opt.glow?'lighter':'source-over';
  c2.strokeStyle='rgba(220,238,255,1)';
  for(var i2=0;i2<g.n;i2++){
    var x=g.x[i2]+g.ox[i2], y=g.y[i2]+g.oy[i2], z=g.z[i2]+g.oz[i2];
    var x1=x*cy_+z*sy_, z1=-x*sy_+z*cy_;
    var y1=y*cp_-z1*sp_, z2=y*sp_+z1*cp_;
    var zz=z2+CAMZ; if(zz<1.2) continue;
    var s=FOCAL/zz;
    var px=CX+x1*s, py=CY-y1*s;
    if(px<-60||px>W+60||py<-60||py>H+60) continue;
    var t=(10.9-zz)/3.8; t=t<0?0:(t>1?1:t);
    var img = useBlk ? useBlk[(((i2>>2)+((i2/CL)|0))&3)] : (sp.length===1?sp[0]:sp[(t*5+0.5)|0]);
    var dof = opt.dof ? Math.abs(zz-CAMZ)/3.6 : 0; if(dof>1) dof=1;
    var r=sizeBase*(s/110)*SZ*(1+dof*0.80); if(r<0.55) r=0.55; else if(r>7.0) r=7.0;
    var a=alpha*(0.40+0.60*t)/((1+dof*0.8)*(1+dof*0.8));
    if(useBlk) a*=0.86;
    if(a<=0.012) continue;
    c2.globalAlpha=a;
    c2.drawImage(img, px-r, py-r, r*2, r*2);
    if(opt.streak){
      var vx=g.vx[i2], vy=g.vy[i2], vz=g.vz[i2];
      var spd=Math.sqrt(vx*vx+vy*vy+vz*vz);
      if(spd>0.75){
        var vz1=-vx*sy_+vz*cy_;
        var vx1=vx*cy_+vz*sy_, vy1=vy*cp_-vz1*sp_;
        var k=0.040*s*Math.min(2.6,spd/1.6);
        c2.globalAlpha=a*0.50*Math.min(1,spd*0.55);
        c2.lineWidth=r*1.15;
        c2.beginPath(); c2.moveTo(px,py); c2.lineTo(px-vx1*k, py+vy1*k); c2.stroke();
      }
    }
  }
  c2.globalAlpha=1;
}

function drawCore(a){
  if(a<=0.01) return;
  ctx.globalCompositeOperation='lighter';
  var cc=hexRGB(PROD[cur].color), R2=Math.min(W,H)*0.46;
  var g=ctx.createRadialGradient(CX,CY,0,CX,CY,R2);
  g.addColorStop(0,'rgba('+cc[0]+','+cc[1]+','+cc[2]+','+(0.16*a)+')');
  g.addColorStop(1,'rgba('+cc[0]+','+cc[1]+','+cc[2]+',0)');
  ctx.fillStyle=g; ctx.fillRect(CX-R2,CY-R2,R2*2,R2*2);
}
function drawCursorGlow(){
  if(!opt.cursor||!mouse3.on) return;
  ctx.globalCompositeOperation='lighter';
  var rr=64+Math.sin(time*3.1)*6;
  var g=ctx.createRadialGradient(mouse3.px,mouse3.py,0,mouse3.px,mouse3.py,rr);
  g.addColorStop(0,'rgba(190,225,255,0.20)');
  g.addColorStop(0.45,'rgba(140,195,255,0.07)');
  g.addColorStop(1,'rgba(140,195,255,0)');
  ctx.fillStyle=g; ctx.beginPath(); ctx.arc(mouse3.px,mouse3.py,rr,0,6.2832); ctx.fill();
}
function drawWaves(){
  if(!opt.wave||!waves.length) return;
  ctx.globalCompositeOperation='lighter';
  for(var w=0;w<waves.length;w++){
    var wv=waves[w], rr=(0.28+wv.t*6.2)*S0, fade=Math.max(0,1-wv.t/0.8);
    ctx.beginPath(); ctx.arc(wv.x*S0+CX, CY-wv.y*S0, rr, 0, 6.2832);
    ctx.strokeStyle='rgba(200,232,255,'+(0.35*fade*fade)+')';
    ctx.lineWidth=1.5+3*fade; ctx.stroke();
  }
}

/* ---------- 主循环 ---------- */
var last=performance.now(), fpsAcc=0, fpsN=0, slowFrames=0;
// 是否持续排帧由底部 gate() 决定：滚进视口 + 标签页前台才跑
function frame(now){
  if(running) requestAnimationFrame(frame);
  var dt=(now-last)/1000; last=now;
  if(dt>0.06) dt=0.06;
  var raw=dt;
  if(opt.slow) dt*=0.35;
  // 手动模式：tt 不再自己往前走（否则产品和拍都会定时偷换），但 time 要继续走，场景才是活的
  if(!opt.paused){ if(opt.auto) tt+=dt*(opt.reverse?-1:1); time+=dt; }
  if(!isFinite(tt)) tt=0;                        // 外部把 tt 写坏时不至于整条动画卡死

  var ttw=((tt%LOOP)+LOOP)%LOOP;
  var idx=Math.floor(ttw/SEG)%PROD.length;
  if(idx!==cur) enterProduct(idx);
  var local=ttw-Math.floor(ttw/SEG)*SEG;
  if(!opt.auto) local = manualLocal(opt.paused?0:dt);   // 手动模式：相位由交互状态机给
  var p=PROD[cur];

  // 鼠标世界坐标（屏幕像素 → z=0 平面），做点平滑
  mouse3.x += (mouse3.tx-mouse3.x)*Math.min(1,dt*14);
  mouse3.y += (mouse3.ty-mouse3.y)*Math.min(1,dt*14);
  if(opt.paused){ mouse3.x=mouse3.tx; mouse3.y=mouse3.ty; }

  // 拍内：前三拍等长，最后一拍拉长，用来放"炸开 + 漩涡"
  var lastBeat = local >= BEAT*3;
  var beat = lastBeat ? 3 : Math.floor(local/BEAT);
  var bl   = lastBeat ? (local-BEAT*3) : (local-beat*BEAT);
  var form = p.forms[beat];
  var ff   = FORMTAB[form] || FORMTAB.cube;
  var mp   = Math.min(1, bl/MORPH);              // 变形进度 0→1
  var bId  = cur*10+beat;
  if(bId!==curForm){                             // 换形态：重新铺一遍目标
    curForm=bId; beatNow=beat;
    prepareMorph(shell, form, 1.00, p.morph);
    prepareMorph(text,  form, 0.54, p.morph);
    shattered=false;
  }

  var shellMode, swirlK=0;
  if(lastBeat && bl>=BURST_AT){ shellMode='free'; swirlK=easeOut(Math.min(1,(bl-BURST_AT)/1.15)); }
  else if(mp<1) shellMode='morph';
  else shellMode='hold';
  if(!opt.auto){                                  // 手动模式：节奏由交互决定，不走定时炸开
    if(mMode==='burst'){ shellMode='free'; swirlK=0.55*easeOut(Math.min(1,mT/BURST_DUR)); }
    else if(mMode==='morph') shellMode='morph';
    else shellMode='hold';
  }

  if(shellMode==='free'&&!shattered){ shattered=true; burst(shell,p.burst,2.9); burst(text,p.burst,2.1); flash=0.075; }
  var fbl=bl-BURST_AT;
  var dk = fbl<0.55 ? 0.930 : (fbl<1.35 ? 0.972 : 0.955);

  // 变形结束 → 保持，用 0.25s 顺进去（drift / pulse 这类整体运动都靠这一步才不会跳）
  var hb=Math.min(1,Math.max(0,bl-MORPH)/0.25); hb=hb*hb*(3-2*hb);

  if(!opt.paused){
    if(shellMode==='morph') morph(shell, mp);
    else if(shellMode==='hold') hold(shell, ff.hold, hb, 1);
    else integrate(shell,dt,swirlK*0.9,dk,p.swirlR,p.swirlDir);

    if(shellMode==='morph') morph(text, mp);
    else if(shellMode==='hold') hold(text, ff.hold, hb, -1);   // 内芯反向转，层次更清楚
    else integrate(text,dt,swirlK*0.55,dk,p.swirlR,p.swirlDir);
  } else {
    if(shellMode==='morph'){ morph(shell, mp); morph(text, mp); }
  }
  if(opt.dust) integrate(dust, dt, 0, 0.945, 1, 1);   // 尘埃：只有缓慢乱流，不进漩涡

  // 鼠标力场 + 冲击波（独立于上面的运动模式，所以任何阶段都能被推）
  mouseForce(shell,dt); mouseForce(text,dt); if(opt.dust) mouseForce(dust,dt);
  if(waves.length){ waveForce(shell,dt); waveForce(text,dt); if(opt.dust) waveForce(dust,dt); }
  for(var wi=waves.length-1;wi>=0;wi--){ waves[wi].t+=dt; if(waves[wi].t>0.8) waves.splice(wi,1); }
  for(var ti=trail.length-1;ti>=0;ti--){ trail[ti].t+=dt; if(trail[ti].t>0.9) trail.splice(ti,1); }

  // 冰壳：这个形态配了外壳才有
  var target = (ff.glass && shellMode!=='free') ? (mp>0.55?1:0) : 0;
  glassA += (target-glassA)*Math.min(1,dt*(shellMode==='free'?14:6));
  if(!opt.glass) glassA=0;

  // 相机：鼠标带更多倾斜
  var mx=mouseX-0.5, my=mouseY-0.5;
  if(opt.spin) spinPhase+=dt*0.42;
  camYaw += (camYawT-camYaw)*Math.min(1,dt*9);      // 拖动后的角度会停住，不会自己弹回
  camPitch += (camPitchT-camPitch)*Math.min(1,dt*9);
  var yaw = Math.sin(time*0.24)*0.42 + mx*0.80 + spinPhase + camYaw;
  var pitch = Math.sin(time*0.19)*0.13 - my*0.42 + camPitch;

  drawBg(opt.trail?0.22:1);

  var rot=[Math.cos(yaw),Math.sin(yaw),Math.cos(pitch),Math.sin(pitch)];
  drawGlassFor(form,yaw,pitch,glassA);
  drawCore(0.42+glassA*0.58);
  drawWaves();
  drawCursorGlow();

  // 粒子先画进离屏层，才能单独做泛光
  pX.setTransform(1,0,0,1,0,0);
  pX.clearRect(0,0,pC.width,pC.height);
  pX.setTransform(DPR,0,0,DPR,0,0);
  if(opt.dust) drawGroup(pX, dust, [DUSTSET[cur]], rot, 0.30, 0.90, BQDUST[cur], 2);
  if(opt.text) drawGroup(pX, text, [textSprite(p.color)], rot, 1.00, 1.95, blockSet(p.color), 1);
  drawGroup(pX, shell, SHELLSET[cur], rot, 0.62, 1.55, BQSHELL[cur], 0);
  if(opt.trailS && trail.length){                       // 光标尾迹
    pX.globalCompositeOperation='lighter';
    var tSpr=textSprite(p.color);
    for(var tk=0;tk<trail.length;tk++){
      var tp=trail[tk], lf=1-tp.t/0.9, trr=2+10*lf;
      pX.globalAlpha=0.32*lf*lf;
      pX.drawImage(tSpr, tp.px-trr, tp.py-trr, trr*2, trr*2);
    }
    pX.globalAlpha=1;
  }

  if(opt.bloom){
    b1X.clearRect(0,0,b1.width,b1.height);
    b1X.drawImage(pC,0,0,b1.width,b1.height);
    b2X.clearRect(0,0,b2.width,b2.height);
    b2X.drawImage(b1,0,0,b2.width,b2.height);
    var bl1=opt.mat==='solid'?0.42:0.88, bl2=opt.mat==='solid'?0.30:0.62;
    ctx.globalCompositeOperation='lighter'; ctx.globalAlpha=bl1;
    ctx.drawImage(b1,0,0,W,H);
    ctx.globalAlpha=bl2; ctx.drawImage(b2,0,0,W,H);
  }
  // 实体金属层必须走 source-over：加法混合会把暗面也加亮，金属立刻又变回雾
  ctx.globalCompositeOperation = (opt.mat==='solid') ? 'source-over' : (opt.glow?'lighter':'source-over');
  ctx.globalAlpha=1;
  ctx.drawImage(pC,0,0,W,H);

  if(flash>0.002){
    ctx.globalCompositeOperation='lighter';
    ctx.fillStyle='rgba(190,220,255,'+flash+')'; ctx.fillRect(0,0,W,H);
    flash*=Math.pow(0.02,dt);
  }
  ctx.globalCompositeOperation='source-over'; ctx.globalAlpha=1;
  ctx.fillStyle=vignette(); ctx.fillRect(0,0,W,H);


  fpsAcc+=raw; fpsN++;
  if(fpsAcc>0.5){ var f=fpsN/fpsAcc; FPS=f;
    if(f<28 && opt.bloom && slowFrames>2){ opt.bloom=false; slowFrames=0; }   // 先牺牲泛光，最省
    else if(f<22 && N_SHELL>3000){
      slowFrames++;
      if(slowFrames>3){ setN(N_SHELL>8000?8000:(N_SHELL>4000?4000:3000)); slowFrames=0; }
    } else slowFrames=0;
    fpsAcc=0; fpsN=0; }
}

/* ---------- 交互 ---------- */
var mouseX=0.5,mouseY=0.5;
function toWorld(cx,cy){
  mouse3.tx=(cx-CX)/S0; mouse3.ty=-(cy-CY)/S0;
  mouse3.px=cx; mouse3.py=cy; mouse3.on=true;
  var lt=trail.length?trail[trail.length-1]:null;
  if(!lt || Math.abs(cx-lt.px)+Math.abs(cy-lt.py)>7){
    if(trail.length>16) trail.shift();
    trail.push({px:cx,py:cy,t:0});
  }
}
function pickProduct(i){
  enterProduct(((i%PROD.length)+PROD.length)%PROD.length);
  tt=cur*SEG+0.001;
}
var stage = host.parentElement;            // 画布 pointer-events:none，事件挂在整个 hero 上
stage.addEventListener('pointermove',function(e){
  var r=cv.getBoundingClientRect();
  var cx=e.clientX-r.left, cy2=e.clientY-r.top;
  toWorld(cx,cy2);
  mouseX=0.5+(cx/W-0.5)*0.7; mouseY=0.5+(cy2/H-0.5)*0.7;
});
stage.addEventListener('pointerleave',function(){ mouse3.on=false; mouseX=0.5; mouseY=0.5; });
stage.addEventListener('pointerdown',function(e){
  if(e.target.closest('a,button')) return;   // 别抢 CTA 的点击
  var r=cv.getBoundingClientRect();
  toWorld(e.clientX-r.left, e.clientY-r.top);
  spawnWave(mouse3.tx,mouse3.ty);            // 点一下 = 冲击波，手感反馈
});

function setN(n){ shell=realloc(shell,n); N_SHELL=n; }

/* ---------- 启动：滚进视口才跑；标签页切走就停 ---------- */
resize();
if(host.clientWidth<720) setN(4000);          // 手机直降粒子数
else setN(6000);                            // 桌面留一档余量，别把首屏帧率吃满
enterProduct(0);
var inView=false, running=false, optedIn=false;
function gate(){
  var want = inView && !document.hidden && (optedIn || !RM.matches);
  if(want===running) return;
  running = want;
  if(running){
    if(!cv.parentNode) host.appendChild(cv);   // 开跑才挂画布：没启动时不遮住静态封面
    last = performance.now();
    host.classList.add('playing');            // 引擎出画面，封面淡出（CSS 过渡）
    requestAnimationFrame(frame);
  }
}
if('IntersectionObserver' in window){
  new IntersectionObserver(function(es){ inView = es[0].isIntersecting; gate(); }, {threshold:0.05}).observe(host);
} else { inView = true; }
document.addEventListener('visibilitychange', gate);
window.addEventListener('resize', resize);
if(window.ResizeObserver) new ResizeObserver(function(){ resize(); }).observe(host);
if(RM.matches){
  // 减少动效：默认留静态封面，但给一枚播放按钮——想看的人自己开
  var pb=document.createElement('button');
  pb.className='morph-play'; pb.type='button'; pb.textContent='▶ 播放粒子动画';
  pb.addEventListener('click', function(){ pb.remove(); optedIn=true; inView=true; gate(); });
  host.parentElement.appendChild(pb);
} else {
  gate();
}

// 供自动化验证（测试脚本用，页面本身不依赖）
window.__FX={
  state:function(){ return {idx:cur, local:+(tt-Math.floor(tt/SEG)*SEG).toFixed(2),
    n:N_SHELL, fps:+FPS.toFixed(1), running:running, bloom:!!opt.bloom,
    form:PROD[cur].forms[beatNow], beat:beatNow, fit:+FIT.toFixed(2), w:W, h:H }; },
  seek:function(i,l){
    if(i!==cur) enterProduct(i);
    tt=i*SEG+(l||0);
    // 冻结采样用：hold 在暂停时不走，得手动把粒子铺到该相位的落点
    var lb=Math.min(3, Math.floor((l||0)/BEAT)), off=(l||0)-lb*BEAT;
    prepareMorph(shell, PROD[cur].forms[lb], 1.00, PROD[cur].morph);
    prepareMorph(text,  PROD[cur].forms[lb], 0.54, PROD[cur].morph);
    var mp0=Math.min(1, off/MORPH);
    morph(shell,mp0); morph(text,mp0);
    curForm=cur*10+lb; beatNow=lb;
  },
  pick:function(i){ pickProduct(i); },
  pause:function(v){ opt.paused=!!v; },
  setN:function(n){ setN(n|0); }
};

})();
