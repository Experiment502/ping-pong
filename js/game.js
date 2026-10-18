'use strict';
const cv = document.getElementById('c');
const ctx = cv.getContext('2d');
let W = 0, H = 0, DPR = 1;

// 像素畫面：場景先畫在低解析度畫布，再放大
const lo = document.createElement('canvas'), g = lo.getContext('2d');
const bgLayer = document.createElement('canvas');
const tableLayer = document.createElement('canvas');
const netLayer = document.createElement('canvas');
let LW = 0, LH = 0, PX = 2;   // PX = 每個像素點佔幾個 CSS px

// ---------- 世界常數（公尺、秒） ----------
const TW = 1.525, HW = TW / 2, TL = 2.74, TT = 0.76;
const NETZ = TL / 2, NETTOP = TT + 0.1525, NETHW = HW + 0.1525;
const BR = 0.02, VBR = 0.04, G = 9.8;
const FONT = "'Press Start 2P', 'Microsoft JhengHei', 'PingFang TC', monospace";

const params = new URLSearchParams(location.search);
const BOT = params.has('bot');

// 球具對擊球的影響（1 = 標準）。T：球飛行時間、pow：對手接球難度、spin：旋轉強度、
// err：落點偏差與掛網、radius：擊球判定範圍、perfect：PERFECT 的範圍。生涯模式會依球拍設定
const NEUTRAL_GEAR = { T: 1, pow: 1, spin: 1, err: 1, radius: 1, perfect: 1, net: 1, clear: 0, recv: 1, long: false };
let GEAR = NEUTRAL_GEAR;

const DIFF = {
  // p：對手回球的球路機率（吊高球、短球、擦邊、擦網、失誤、上旋拉球、下旋切球、側旋），其餘是帶一點上旋的平擊
  // spinMiss：玩家打出旋轉球時，對手多出來的失誤率（乘上旋轉強度）
  easy:   { label: '簡單', T: 1.00, aimX: 0.35, aiSpeed: 1.6, react: 0.25, miss: 0.10, missPow: 0.30, spinMiss: 0.15,
            p: { lob: 0.10, short: 0.06, edge: 0.02, cord: 0.02, err: 0.10, loop: 0.04, chop: 0.08, side: 0.05 } },
  normal: { label: '普通', T: 0.90, aimX: 0.42, aiSpeed: 2.1, react: 0.18, miss: 0.08, missPow: 0.25, spinMiss: 0.12,
            p: { lob: 0.08, short: 0.08, edge: 0.02, cord: 0.02, err: 0.08, loop: 0.06, chop: 0.10, side: 0.06 } },
  hard:   { label: '困難', T: 0.64, aimX: 0.62, aiSpeed: 3.2, react: 0.08, miss: 0.02, missPow: 0.10, spinMiss: 0.05,
            p: { lob: 0.05, short: 0.14, edge: 0.06, cord: 0.04, err: 0.03, loop: 0.16, chop: 0.14, side: 0.10 } },
};

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);
const other = s => (s === 'player' ? 'ai' : 'player');

// ---------- 對手的圖（js/battle.js，由 tools/build_chars.py --battle 產生） ----------
// SPR[男或女][動作] = 每一格 [x, y, w, h, 身體中心 x]；padOff(動作) = 球拍在身體中心左右幾像素（圖上像素）
const sheet = new Image();
sheet.src = BATTLE.img;
const SPR = BATTLE.spr;
const padOff = anim => BATTLE.pad[oppChar()][anim];
// 對手的頭像：有新圖就用新圖，沒有就用舊的
const oppPortrait = c => BATTLE.portrait[c] || `assets/${c}_portrait.png`;
const MPP = 1.3 / 106;           // 角色圖每像素 = 幾公尺（男對手站著 106 像素高）
const OPP_Z = TL + 0.7, OPP_FEET = 0.32;   // 對手站的位置（下半身被球桌擋住）

// ---------- 攝影機（低解析度座標） ----------
const cam = { x: 0, y: 1.27, z: -1.35, sin: 0, cos: 1, f: 300, cx: 0, cy: 0 };

function view(x, y, z) {
  const dx = x - cam.x, dy = y - cam.y, dz = z - cam.z;
  return { x: dx, y: dy * cam.cos + dz * cam.sin, z: dz * cam.cos - dy * cam.sin };
}
function proj(x, y, z) {
  const v = view(x, y, z);
  if (v.z < 0.05) return null;
  return { x: cam.cx + cam.f * v.x / v.z, y: cam.cy - cam.f * v.y / v.z, s: cam.f / v.z };
}

function setupCamera() {
  const portrait = LH > LW * 1.1;
  const pitch = 0.159;
  cam.sin = Math.sin(pitch); cam.cos = Math.cos(pitch);
  cam.f = Math.min(LW * 0.9, LH * 1.6);
  cam.cx = LW / 2;
  const v = view(0, TT, 0);
  cam.cy = LH * (portrait ? 0.74 : 0.87) + cam.f * v.y / v.z;   // 球桌近端放在畫面下方
}

function resize() {
  DPR = Math.min(3, window.devicePixelRatio || 1);
  W = window.innerWidth; H = window.innerHeight;
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  PX = Math.max(1.5, Math.min(W, H) / 210);
  LW = Math.ceil(W / PX); LH = Math.ceil(H / PX);
  for (const c of [lo, bgLayer, tableLayer, netLayer]) { c.width = LW; c.height = LH; }
  setupCamera();
  buildBackground(); buildTable(); buildNet();
  placePauseButton();
}

// ---------- 音效（全部用 Web Audio 即時合成，不需要音檔） ----------
let AC = null, master = null, noiseBuf = null, crowdGain = null, crowdLevel = 0;
function initAudio() {
  if (!AC) {
    try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = null; return; }
    master = AC.createGain(); master.gain.value = S.sound ? 1 : 0; master.connect(AC.destination);
    noiseBuf = AC.createBuffer(1, AC.sampleRate * 2, AC.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    startCrowdBed();
  }
  if (AC.state === 'suspended') AC.resume();
}
// 一小段經過濾波的雜訊（擊球聲的「啪」、掌聲、觀眾聲都是用這個做的）
function noise(t, dur, type, freq, Q, vol, attack) {
  attack = attack || 0.002;
  const src = AC.createBufferSource(), f = AC.createBiquadFilter(), gn = AC.createGain();
  src.buffer = noiseBuf; f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = Q;
  gn.gain.setValueAtTime(0.0001, t);
  gn.gain.exponentialRampToValueAtTime(Math.max(vol, 0.0002), t + attack);
  gn.gain.exponentialRampToValueAtTime(0.0001, t + attack + dur);
  src.connect(f); f.connect(gn); gn.connect(master);
  src.start(t, Math.random() * 1.5); src.stop(t + attack + dur + 0.05);
}
// 一個音高往下掉的短音（拍子、桌板的共鳴）
function tone(t, f0, f1, dur, vol, type) {
  const o = AC.createOscillator(), gn = AC.createGain();
  o.type = type || 'sine';
  o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  gn.gain.setValueAtTime(Math.max(vol, 0.0002), t); gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(gn); gn.connect(master);
  o.start(t); o.stop(t + dur + 0.02);
}
const playSfx = fn => (...a) => { if (AC) fn(AC.currentTime, ...a); };
const distVol = z => clamp(1.2 - z / TL * 0.8, 0.25, 1);   // 對面的聲音小一點
const sfx = {
  // 擊球：膠皮的「啵」加上木頭拍身的共鳴，揮得越用力越清脆
  paddle: playSfx((t, z, power) => {
    const v = distVol(z), pw = power == null ? 0.5 : power;
    noise(t, 0.025, 'bandpass', 2400 + pw * 1600, 1.4, 0.55 * v);
    tone(t, 1250 + pw * 350, 800, 0.045, 0.3 * v, 'triangle');
    tone(t, 240, 140, 0.05, 0.22 * v);
  }),
  // 落桌：清脆的「答」加上桌板低沉的共鳴
  table: playSfx((t, z) => {
    const v = distVol(z);
    noise(t, 0.018, 'bandpass', 3400, 2.5, 0.35 * v);
    tone(t, 1150, 900, 0.06, 0.28 * v);
    tone(t, 300, 190, 0.08, 0.25 * v);
  }),
  net: playSfx(t => { noise(t, 0.16, 'lowpass', 1000, 0.7, 0.3); tone(t, 170, 110, 0.12, 0.12, 'triangle'); }),
  cord: playSfx(t => { noise(t, 0.04, 'bandpass', 1800, 3, 0.3); noise(t + 0.05, 0.1, 'lowpass', 900, 0.7, 0.18); }),
  edge: playSfx(t => { noise(t, 0.012, 'highpass', 3500, 0.7, 0.5); tone(t, 1900, 1500, 0.03, 0.2, 'triangle'); }),
  floor: playSfx(t => { noise(t, 0.02, 'bandpass', 2200, 2, 0.12); tone(t, 650, 480, 0.06, 0.1); }),
};

// 觀眾背景聲：一直在播的低聲交談，比賽中才調大
function startCrowdBed() {
  crowdGain = AC.createGain(); crowdGain.gain.value = 0; crowdGain.connect(master);
  for (const [freq, q, vol] of [[350, 0.8, 0.05], [900, 1.2, 0.025]]) {
    const src = AC.createBufferSource(), f = AC.createBiquadFilter(), gn = AC.createGain();
    src.buffer = noiseBuf; src.loop = true; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    gn.gain.value = vol;
    const lfo = AC.createOscillator(), lg = AC.createGain();   // 音量慢慢起伏，聽起來比較像人聲
    lfo.frequency.value = 0.13 + Math.random() * 0.1; lg.gain.value = vol * 0.5;
    lfo.connect(lg); lg.connect(gn.gain); lfo.start();
    src.connect(f); f.connect(gn); gn.connect(crowdGain); src.start();
  }
}
function setCrowd(level) {
  if (!AC || !crowdGain || level === crowdLevel) return;
  crowdLevel = level;
  crowdGain.gain.setTargetAtTime(level, AC.currentTime, 0.4);
}
// 掌聲：很多短促、音色不同的拍手聲
function applause(strength, dur) {
  if (!AC) return;
  const t0 = AC.currentTime, n = Math.round(dur * (30 + 50 * strength));
  for (let i = 0; i < n; i++) {
    const k = Math.pow(Math.random(), 1.7);
    noise(t0 + 0.05 + k * dur, rand(0.006, 0.016), 'bandpass', rand(900, 2800), 1.6,
      (0.04 + 0.07 * strength) * (1 - k) * rand(0.4, 1));
  }
}
// 一群人的「喔～」：濾波器頻率往上是歡呼、往下是惋惜
function roar(strength, dur, f0, f1) {
  if (!AC) return;
  const t = AC.currentTime;
  for (const [mul, q, v] of [[1, 1.4, 1], [2.3, 2.5, 0.5]]) {
    const src = AC.createBufferSource(), f = AC.createBiquadFilter(), gn = AC.createGain();
    src.buffer = noiseBuf; src.loop = true; f.type = 'bandpass'; f.Q.value = q;
    f.frequency.setValueAtTime(f0 * mul, t); f.frequency.linearRampToValueAtTime(f1 * mul, t + dur * 0.6);
    gn.gain.setValueAtTime(0.0001, t);
    gn.gain.exponentialRampToValueAtTime(0.12 * strength * v, t + dur * 0.25);
    gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(gn); gn.connect(master);
    src.start(t, Math.random()); src.stop(t + dur + 0.05);
  }
}
const crowd = {
  cheer: st => { roar(st, 1.4 + st, 520, 820); applause(st, 1.6 + 1.2 * st); },   // 你得分：歡呼＋掌聲
  aww: () => { roar(0.2, 0.5, 420, 420); applause(0.35, 1.3); },                  // 你失分：觀眾替對手禮貌性鼓掌
  ooh: () => roar(0.35, 0.8, 450, 750),                                           // 擦網、擦邊：驚呼
};

// ---------- 遊戲狀態 ----------
const S = {
  mode: 'menu',          // menu | play | pause | over
  diff: 'normal', char: 'male', hand: 'right', bestOf: 3, sound: true,
  practice: false, prKind: 'random', prHits: 0, prTotal: 0, streak: 0, bestStreak: 0, lastKind: 'drive', rally: 0,
  phase: 'serveWait',    // serveWait | toss | aiServe | rally | pointOver
  ps: 0, as: 0, pg: 0, ag: 0, game: 1, firstServer: 'player', server: 'player', games: [],
  timer: 0, lastHitter: null, bounces: 0, netted: false, lastPower: 0.5,
  msg: '', sub: '', msgColor: '#fff', msgT: 0,
};
const oppChar = () => S.oppChar || (S.char === 'male' ? 'female' : 'male');
// top：上旋(+) / 下旋(-)，side：側旋（往 +x 或 -x 彎），範圍 -1 ~ 1
const ball = { x: 0, y: 1, z: 0, vx: 0, vy: 0, vz: 0, top: 0, side: 0, visible: false };
const ai = { x: 0, y: 1.0, z: TL + 0.25, attempted: false, react: 0 };
const opp = { bx: 0.37, anim: 'idle', frame: 0, t: 0, hitT: -1, vs: 0, lastX: 0 };
const trail = [], marks = [], popups = [];
const botLog = [], botShots = {}, botRecv = [];

const E_TABLE = 0.88;   // 一般落桌的反彈係數；b.e 可以指定下一次落桌用的係數
const TOPA = 6, SIDEA = 1.8;   // 旋轉造成的加速度：上旋往下壓、下旋往上飄、側旋往旁邊彎

// 落桌反彈：上旋往前衝、彈得較低；下旋減速；側旋往旁邊跳。之後旋轉減弱
function bounce(b, e) {
  b.vy = -b.vy * e * (b.top > 0 ? 1 - 0.25 * b.top : 1);
  b.vx = b.vx * 0.97 + b.side * 0.6;
  b.vz = b.vz * 0.97 * (b.top < 0 ? 1 + 0.45 * b.top : 1) + Math.sign(b.vz) * Math.max(0, b.top) * 1.2;
  b.top *= 0.6; b.side *= 0.6;
}

function integrate(b, h) {
  const pz = b.z, py = b.y;
  b.vy -= (G + TOPA * b.top) * h;
  b.vx += SIDEA * b.side * h;
  b.x += b.vx * h; b.y += b.vy * h; b.z += b.vz * h;
  if ((pz - NETZ) * (b.z - NETZ) < 0 && b.y < NETTOP + BR && b.y > TT && Math.abs(b.x) < NETHW) {
    if (b.y > NETTOP + BR - 0.022 && Math.random() < 0.6) {   // 擦到網子上緣，球翻過去掉在網前
      b.vz *= 0.35; b.vx *= 0.5; b.vy = 0.7 + Math.random() * 0.6;
      return 'cord';
    }
    b.z = pz; b.vz = -b.vz * 0.15; b.vx *= 0.4; b.vy = Math.min(b.vy, 0) * 0.3; b.top = 0; b.side = 0;
    return 'net';
  }
  if (b.vy < 0 && b.y - BR <= TT && py - BR >= TT - 1e-6) {
    const ax = Math.abs(b.x);
    const onTable = ax <= HW && b.z >= 0 && b.z <= TL;
    const nearEdge = ax <= HW + BR && b.z >= -BR && b.z <= TL + BR &&
      (ax >= HW - 0.01 || b.z <= 0.01 || b.z >= TL - 0.01);
    if ((onTable || nearEdge) && -b.vy < 0.5) { b.y = TT + BR; b.vy = 0; return null; }   // 在桌面上滾動
    if (nearEdge) {   // 擦邊：球貼著桌邊彈開，又低又快
      b.y = TT + BR; b.vy = -b.vy * 0.25; b.e = null; b.top *= 0.5; b.side *= 0.5;
      if (ax >= HW - 0.01) b.vx += Math.sign(b.x) * 0.8;
      return 'edge';
    }
    if (onTable) {
      b.y = TT + BR;
      bounce(b, b.e != null ? b.e : E_TABLE); b.e = null;
      return 'table';
    }
  }
  if (b.y < BR && b.vy < 0) {
    b.y = BR; b.vy = -b.vy * 0.55; b.vx *= 0.85; b.vz *= 0.85; b.top = 0; b.side = 0;
    return 'floor';
  }
  return null;
}

// 讓球飛 T 秒後落在 (tx, tz)，並確保過網時比網子高 clear 公尺；回傳實際飛行時間
// 旋轉（ball.top / ball.side）要先設定好，這裡會把旋轉造成的彎曲算進去
function hitBall(tx, tz, T, clear) {
  const ty = TT + BR, gE = G + TOPA * ball.top;
  for (let i = 0; i < 12; i++) {
    const vz = (tz - ball.z) / T, vy = (ty - ball.y + 0.5 * gE * T * T) / T;
    const tn = (NETZ - ball.z) / vz;
    const yn = ball.y + vy * tn - 0.5 * gE * tn * tn;
    if (yn > NETTOP + BR + clear) break;
    T *= 1.08;
  }
  ball.vx = (tx - ball.x) / T - 0.5 * SIDEA * ball.side * T;
  ball.vz = (tz - ball.z) / T;
  ball.vy = (ty - ball.y + 0.5 * gE * T * T) / T;
  ball.e = null;
  return T;
}

// 讓球在 tn 秒後打到網子所在平面的高度 yNet（用來做擦網或掛網）
function hitNet(x, yNet, tn) {
  const gE = G + TOPA * ball.top;
  ball.vx = (x - ball.x) / tn - 0.5 * SIDEA * ball.side * tn;
  ball.vz = (NETZ - ball.z) / tn;
  ball.vy = (yNet - ball.y + 0.5 * gE * tn * tn) / tn;
  ball.e = null;
}

// 調整下一次落桌的反彈，讓球到玩家擊球點（底線後 0.2 公尺）時只比桌面高 h
function lowBounce(tz, T, h) {
  const c = { vx: ball.vx + SIDEA * ball.side * T, vy: ball.vy - (G + TOPA * ball.top) * T, vz: ball.vz,
    top: ball.top, side: ball.side };
  bounce(c, 1);   // 先用反彈係數 1 算出落桌後的速度，再按比例找出需要的係數
  const t2 = Math.max(0.05, (tz + 0.2) / Math.abs(c.vz));
  const vyUp = (h + 0.5 * (G + TOPA * c.top) * t2 * t2) / t2;
  ball.e = clamp(vyUp / c.vy, 0.3, 0.92);
}

// 旋轉的名稱與顏色（球的殘影也用同樣的顏色）
function spinInfo(top, side) {
  if (top > 0.45) return { name: '上旋拉球', rgb: '255,140,80', css: '#ff8c50' };
  if (top < -0.3) return { name: '下旋切球', rgb: '110,170,255', css: '#6eaaff' };
  if (Math.abs(side) > 0.35) return { name: '側旋', rgb: '130,240,130', css: '#82f082' };
  return null;
}

function popAtBall(text, color) {
  const p = proj(ball.x, ball.y, ball.z);
  if (p) popups.push({ text, x: p.x * PX, y: p.y * PX + 30, t: 0, color });
}

function playerShot(power, dirX, dirY, offset, sx, sy) {
  const inTop = ball.top, inSide = ball.side;   // 來球的旋轉
  // 揮拍方向決定旋轉：往上滑 = 上旋拉球，往下滑 = 下旋切球，橫著滑 = 帶側旋
  const up = -dirY;
  let top = clamp(clamp(up * 1.25, -1, 1) * (0.5 + 0.5 * power) * GEAR.spin, -1, 1);
  let side = clamp(dirX * 0.6 * Math.max(0, 1 - 2 * Math.abs(up)) * GEAR.spin, -1, 1);
  // 長顆粒膠：自己製造的旋轉很弱，主要是把來球的旋轉反轉回去（對手的上旋變成下旋）
  if (GEAR.long) { top = clamp(top * 0.2 - inTop * 0.7, -1, 1); side = clamp(side * 0.2 - inSide * 0.5, -1, 1); }
  let tz = top < 0 ? 1.8 + 0.5 * power : 1.95 + 0.6 * power;
  let tx = dirX * 0.5 + ball.x * 0.1;
  const err = (0.04 + offset * offset * 0.22) * GEAR.err;
  tx += rand(-err, err); tz += rand(-err, err);
  const T = (0.98 - 0.46 * power) * (1 - 0.15 * Math.max(0, top)) * (1 + 0.3 * Math.max(0, -top)) * GEAR.T;
  let clear = 0.03 + GEAR.clear;
  // 接旋轉球：下旋平著打容易掛網；上旋往上撈會飛太遠、往下切會彈太高；側旋會讓回球往旁邊偏
  // 膠皮硬度（GEAR.recv）：軟海綿受來球旋轉的影響比較小；長顆粒膠接下旋不容易掛網
  const rv = GEAR.long ? 0.4 : GEAR.recv;
  let spinNet = 0;
  if (inTop < 0) spinNet = -inTop * 0.35 * (1 - Math.abs(top)) * rv;
  if (inTop > 0 && top > 0.2) tz += inTop * top * 0.45 * rv;
  if (inTop > 0 && top < -0.2) { tz += inTop * -top * 0.3 * rv; clear += inTop * 0.3 * rv; }
  tx += inSide * 0.3 * rv;
  // 打偏、揮太慢、球已經掉到桌面以下、或用錯方法接下旋，都比較容易掛網；膠皮彈道高（GEAR.net 小）比較不會掛網
  const pNet = (0.03 + offset * offset * 0.25 * GEAR.err + (power < 0.12 ? 0.12 : 0) + (ball.y < TT ? 0.06 : 0) + spinNet) * GEAR.net;
  ball.top = top; ball.side = side;
  const r = Math.random();
  if (r < pNet) hitNet(tx * 0.9, NETTOP - rand(0.02, 0.08), T * 0.5);
  else if (r < pNet + 0.04) hitNet(tx * 0.9, NETTOP + BR - 0.012, T * 0.5);
  else hitBall(tx, tz, T, clear);
  S.lastHitter = 'player'; S.bounces = 0; S.netted = false; S.edged = false; S.lastPower = power * GEAR.pow; S.phase = 'rally';
  S.lastSpin = Math.abs(top) + Math.abs(side);
  ai.attempted = false; ai.react = DIFF[S.diff].react;
  const perfect = offset < 0.3 * GEAR.perfect, good = offset < 0.65;
  popups.push({ text: perfect ? 'PERFECT!' : good ? 'GOOD' : 'OK', x: sx, y: sy, t: 0,
    color: perfect ? '#ffd166' : good ? '#9be7ff' : '#ccc' });
  const si = spinInfo(top, side);
  if (si) popups.push({ text: si.name, x: sx, y: sy + 26, t: 0, color: si.css });
  paddle.kick = 1;
  S.rally++;
  sfx.paddle(0, power);
  if (navigator.vibrate) { try { navigator.vibrate(18); } catch (e) { /* 不支援就略過 */ } }
}

// force：指定球路（練習模式用）
function aiShot(serve, force) {
  const d = DIFF[S.diff];
  const T0 = d.T * rand(0.9, 1.1) * (serve ? 1.15 : 1);
  let tx = rand(-1, 1) * d.aimX * (serve ? 0.6 : 1);
  let kind = 'drive';
  if (force) kind = force;
  else if (!serve) {
    let r = Math.random();
    for (const k in d.p) { if (r < d.p[k]) { kind = k; break; } r -= d.p[k]; }
  }
  // 先決定旋轉 [上旋/下旋, 側旋]，軌跡計算會把旋轉算進去
  const SPIN = {
    loop: [rand(0.8, 1), rand(-0.15, 0.15)],
    chop: [-rand(0.6, 1), rand(-0.15, 0.15)],
    short: [-rand(0.5, 0.9), 0],
    side: [rand(0, 0.3), (Math.random() < 0.5 ? -1 : 1) * rand(0.7, 1)],
    lob: [rand(0.2, 0.4), 0],
  };
  [ball.top, ball.side] = SPIN[kind] || [rand(0.15, 0.4), rand(-0.2, 0.2)];
  if (kind === 'err') {   // 失誤：掛網、打出邊線或打太長
    const q = Math.random();
    if (q < 0.4) hitNet(tx * 0.8, NETTOP - rand(0.02, 0.08), T0 * 0.55);
    else if (q < 0.7) hitBall((Math.random() < 0.5 ? -1 : 1) * (HW + rand(0.05, 0.3)), rand(0.3, 0.9), T0, 0.03);
    else hitBall(tx, -rand(0.1, 0.4), T0, 0.03);
  } else if (kind === 'cord') {
    hitNet(tx * 0.8, NETTOP + BR - 0.012, T0 * 0.55);
  } else if (kind === 'lob') {
    hitBall(tx, rand(0.2, 0.6), rand(1.15, 1.35), 0.1);
  } else if (kind === 'short') {   // 短球：帶下旋落在網前，第二跳還在桌上
    hitBall(tx * 0.8, rand(0.95, 1.15), T0 * rand(1.0, 1.15), 0.03);
    ball.e = rand(0.4, 0.55);
  } else if (kind === 'loop') {   // 上旋拉球：又快又往下壓，落桌後往前衝
    const tz = rand(0.15, 0.5);
    const T = hitBall(tx, tz, T0 * 0.9, 0.03);
    lowBounce(tz, T, rand(0.1, 0.25));
  } else if (kind === 'chop') {   // 下旋切球：慢、飄，落桌後減速、彈得低
    const tz = rand(0.2, 0.7);
    const T = hitBall(tx, tz, T0 * 1.2, 0.03);
    lowBounce(tz, T, rand(0.08, 0.2));
  } else {   // 平擊、側旋（含擦邊）：落桌後彈得低
    let tz = rand(0.15, 0.75);
    if (kind === 'edge') {
      if (Math.random() < 0.5) tx = (tx < 0 ? -1 : 1) * (HW - 0.003);
      else tz = 0.004;
    }
    const T = hitBall(tx, tz, T0, 0.03);
    lowBounce(tz, T, rand(0.1, 0.3));
  }
  if (BOT) botShots[kind] = (botShots[kind] || 0) + 1;
  const si = spinInfo(ball.top, ball.side);
  if (si && kind !== 'err' && kind !== 'cord') popAtBall(kind === 'short' ? '下旋短球' : si.name, si.css);
  S.lastHitter = 'ai'; S.bounces = 0; S.netted = false; S.edged = false; S.phase = 'rally';
  S.lastKind = kind; S.rally++;
  oppSwing();
  sfx.paddle(ball.z, 0.6);
}

function aiHitReady(b) {
  return b.vz > 0 && (b.z >= TL + 0.12 || (b.vy < 0 && b.y < TT + 0.3 && b.z > NETZ + 0.12));
}

function predictAIHit() {
  const b = { x: ball.x, y: ball.y, z: ball.z, vx: ball.vx, vy: ball.vy, vz: ball.vz, top: ball.top, side: ball.side, e: ball.e };
  let bounced = S.bounces === 1;
  for (let i = 0; i < 360; i++) {
    const ev = integrate(b, 1 / 120);
    if (ev === 'table') { if (b.z > NETZ && !bounced) bounced = true; else return null; }
    if (ev === 'floor' || ev === 'net') return null;
    if (bounced && aiHitReady(b)) return { x: b.x, y: b.y };
  }
  return null;
}

function updateAI(dt) {
  const d = DIFF[S.diff];
  let tx, ty = 1.0;
  if (S.phase === 'aiServe') { tx = ai.x; }
  else if (S.phase === 'rally' && S.lastHitter === 'player' && !ai.attempted) {
    ai.react -= dt;
    if (ai.react > 0) { tx = ai.x; ty = ai.y; }
    else { const p = predictAIHit(); if (p) { tx = p.x; ty = p.y; } else { tx = ball.x; } }
  } else { tx = ball.visible ? ball.x * 0.4 : 0; }
  tx = clamp(tx, -1.6, 1.6); ty = clamp(ty, 0.8, 1.6);
  const sp = d.aiSpeed * dt;
  ai.x += clamp(tx - ai.x, -sp, sp);
  ai.y += (ty - ai.y) * Math.min(1, dt * 8);

  if (S.phase === 'rally' && S.lastHitter === 'player' && S.bounces === 1 && !ai.attempted && aiHitReady(ball)) {
    ai.attempted = true;
    const reach = Math.abs(ai.x - ball.x) < 0.26 && ball.y > TT - 0.1;
    const missChance = d.miss + d.missPow * S.lastPower + (Math.abs(ball.x) > HW ? 0.12 : 0) + (S.edged ? 0.6 : 0)
      + d.spinMiss * (S.lastSpin || 0);
    if (reach && Math.random() > missChance) aiShot(false);
    else oppSwing();   // 揮空
  }
}

// ---------- 對手動畫 ----------
function oppSwing() {
  opp.anim = ball.x >= opp.bx ? 'fore' : 'back';
  opp.hitT = 0.075; opp.frame = 1;
}
function updateOpp(dt) {
  const vx = (ai.x - opp.lastX) / Math.max(dt, 1e-3);
  opp.lastX = ai.x;
  opp.vs += (vx - opp.vs) * Math.min(1, dt * 10);
  opp.t += dt;
  const frames = SPR[oppChar()];
  if (opp.hitT >= 0) {
    opp.hitT += dt;
    const f = Math.floor(opp.hitT / 0.075);
    if (f >= frames[opp.anim].length) { opp.hitT = -1; opp.anim = 'idle'; opp.t = 0; }
    else opp.frame = f;
  }
  if (opp.hitT < 0) {
    const moving = Math.abs(opp.vs) > 0.3;
    const anim = moving ? (opp.vs > 0 ? 'moveR' : 'moveL') : 'idle';
    if (anim !== opp.anim) { opp.anim = anim; opp.t = 0; }
    opp.frame = Math.floor(opp.t * (moving ? 10 : 6)) % frames[anim].length;
  }
  const target = ai.x - padOff(opp.anim) * MPP * 0.75;
  opp.bx = clamp(opp.bx + (target - opp.bx) * Math.min(1, dt * 7), -2, 2);
}

// ---------- 規則 ----------
const MSG_WIN = { out: '對手出界', net: '對手掛網', own: '對手失誤', miss: '對手沒接到' };
const MSG_LOSE = { out: '你打出界了', net: '你掛網了', own: '打到自己這邊了', miss: '沒接到球' };

// 一局打到幾分：平常 11 分，生涯模式跟路人比賽只打 5 分
const gamePts = () => (S.careerMatch && S.pts) || 11;
function nextServer() {
  const t = S.ps + S.as, deuce = gamePts() - 1;
  const k = S.ps >= deuce && S.as >= deuce ? t : Math.floor(t / 2);
  return k % 2 === 0 ? S.firstServer : other(S.firstServer);
}
const isGameOver = () => (S.ps >= gamePts() || S.as >= gamePts()) && Math.abs(S.ps - S.as) >= 2;

function showMsg(msg, sub, color, t) { S.msg = msg; S.sub = sub; S.msgColor = color; S.msgT = t || 1.4; }

function point(winner, kind) {
  // 生涯模式：每一分都會磨損球拍，全部壞掉就直接輸
  if (S.careerMatch && careerOnPoint(winner)) {
    S.mode = 'over'; ball.visible = false; show('pause', false);
    careerMatchEnd(false, true);
    return;
  }
  if (S.practice) {
    if (winner === 'player' && S.lastHitter === 'ai') { S.phase = 'pointOver'; S.timer = 0.6; return; }   // 發球機的球沒進，重發
    practiceResult(winner === 'player', kind);
    return;
  }
  if (winner === 'player') { S.ps++; showMsg('得分！', MSG_WIN[kind], '#5dff9a'); }
  else { S.as++; showMsg('失分', MSG_LOSE[kind], '#ff6b6b'); }
  if (BOT) botLog.push(winner[0] + ':' + kind);
  if (isGameOver()) {
    const won = S.ps > S.as;
    showMsg(won ? '拿下這局！' : '輸掉這局', S.ps + ' - ' + S.as, won ? '#ffd166' : '#ff6b6b', 1.6);
    if (won) crowd.cheer(1); else crowd.aww();
  } else {
    // 對打越久，得分時歡呼越大聲
    if (winner === 'player') crowd.cheer(clamp(0.45 + S.rally * 0.06, 0.45, 1)); else crowd.aww();
    S.server = nextServer();
  }
  S.phase = 'pointOver'; S.timer = 1.6;
}

// 練習模式：球落在對手那半邊就算成功
function practiceResult(ok, kind) {
  S.prTotal++;
  if (ok) {
    S.prHits++; S.streak++; S.bestStreak = Math.max(S.bestStreak, S.streak);
    showMsg('好球！', '連續 ' + S.streak + ' 球', '#5dff9a', 0.9);
    if (S.streak % 10 === 0) crowd.cheer(0.7);
  } else {
    S.streak = 0;
    showMsg('失誤', MSG_LOSE[kind], '#ff6b6b', 0.9);
  }
  S.phase = 'pointOver'; S.timer = 1.0;
}
const PR_KINDS = ['drive', 'loop', 'chop', 'side', 'short', 'lob'];
const practiceKind = () => (S.prKind === 'random' ? PR_KINDS[(Math.random() * PR_KINDS.length) | 0] : S.prKind);
const PR_TIPS = {
  drive: '平擊：從球的旁邊往中間滑', loop: '上旋：橫向平著打最穩', chop: '下旋：往上撈或往下切回去',
  side: '側旋：瞄準時往反方向修正', short: '短球：直接在桌子上方打', lob: '吊高球：等球落下來再打',
};

function endOfPoint() {
  if (S.practice) { S.phase = 'serveWait'; S.timer = 0.3; return; }
  if (!isGameOver()) { S.phase = 'serveWait'; S.timer = 0.4; return; }
  if (S.ps > S.as) S.pg++; else S.ag++;
  S.games.push(S.ps + '-' + S.as);
  const need = Math.ceil(S.bestOf / 2);   // 要贏幾局才算贏得比賽
  if (S.pg === need || S.ag === need) { matchOver(); return; }
  S.game++; S.ps = 0; S.as = 0;
  S.firstServer = other(S.firstServer); S.server = S.firstServer;
  showMsg('GAME ' + S.game, '局數 ' + S.pg + ' - ' + S.ag, '#ffd166', 1.8);
  S.phase = 'serveWait'; S.timer = 1.8;
}

function ruleTable(side) {
  const hitter = S.lastHitter;
  if (side === hitter) { point(other(hitter), S.netted ? 'net' : 'own'); return; }
  if (S.bounces === 0) {
    S.bounces = 1;
    if (S.practice && hitter === 'player') practiceResult(true);
  } else point(hitter, 'miss');
}
function ruleOut() {
  const hitter = S.lastHitter;
  if (S.bounces === 0) point(other(hitter), S.netted ? 'net' : 'out');
  else point(hitter, 'miss');
}

function onEvent(ev) {
  if (ev === 'table' || ev === 'edge') {
    if (ev === 'edge') { sfx.edge(); if (S.phase === 'rally') { S.edged = true; popAtBall('擦邊!', '#ffb347'); crowd.ooh(); } }
    else sfx.table(ball.z);
    marks.push({ x: ball.x, z: ball.z, t: 0 });
    if (S.phase === 'rally') ruleTable(ball.z < NETZ ? 'player' : 'ai');
  } else if (ev === 'cord') {
    sfx.cord();
    if (S.phase === 'rally') { popAtBall('擦網!', '#ffb347'); crowd.ooh(); }
  } else if (ev === 'net') {
    sfx.net();
    if (S.phase === 'rally') S.netted = true;
  } else if (ev === 'floor') {
    sfx.floor();
    if (S.phase === 'rally') ruleOut();
  }
}

function startServe() {
  ball.visible = true; trail.length = 0; S.rally = 0;
  if (S.server === 'player') {
    Object.assign(ball, { x: 0.15, y: TT + 0.12, z: -0.15, vx: 0, vy: 2.7, vz: 0, top: 0, side: 0, e: null });
    S.phase = 'toss';
  } else {
    S.phase = 'aiServe'; S.timer = S.practice ? 0.6 : 0.9; ball.top = 0; ball.side = 0;
  }
}

// ---------- 觸控 ----------
const tp = { on: false, id: null, x: 0, y: 0, lx: 0, ly: 0, hist: [], trail: [] };

cv.addEventListener('pointerdown', e => {
  initAudio();
  e.preventDefault();
  if (tp.on) return;
  const now = performance.now();
  Object.assign(tp, { on: true, id: e.pointerId, x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY });
  tp.hist = [{ x: e.clientX, y: e.clientY, t: now }];
  tp.trail = [{ x: e.clientX, y: e.clientY, t: now }];
});
cv.addEventListener('pointermove', e => {
  if (!tp.on || e.pointerId !== tp.id) return;
  e.preventDefault();
  const now = performance.now();
  tp.x = e.clientX; tp.y = e.clientY;
  tp.hist.push({ x: tp.x, y: tp.y, t: now });
  tp.trail.push({ x: tp.x, y: tp.y, t: now });
});
const pointerEnd = e => { if (e.pointerId === tp.id) { tp.on = false; tp.id = null; } };
cv.addEventListener('pointerup', pointerEnd);
cv.addEventListener('pointercancel', pointerEnd);
cv.addEventListener('contextmenu', e => e.preventDefault());

function swipeVel() {
  const now = performance.now(), h = tp.hist;
  while (h.length > 2 && now - h[0].t > 120) h.shift();
  if (h.length < 2) return { x: 0, y: 0 };
  const a = h[0], b = h[h.length - 1];
  if (now - b.t > 80) return { x: 0, y: 0 };
  const dt = Math.max(0.016, (b.t - a.t) / 1000);
  return { x: (b.x - a.x) / dt, y: (b.y - a.y) / dt };
}

function distSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
  const t = l2 ? clamp(((px - ax) * dx + (py - ay) * dy) / l2, 0, 1) : 0;
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
}

const hitRadius = () => Math.max(38, Math.min(W, H) * 0.1) * GEAR.radius;   // CSS px，等於畫面上球拍的大小

function canPlayerHit() {
  if (S.phase === 'toss') return true;
  // 彈到自己這邊後，在桌子上方（短球）或底線後都可以打
  return S.phase === 'rally' && S.lastHitter === 'ai' && S.bounces === 1 && ball.z < NETZ - 0.05 && ball.z > -0.6;
}

function checkPlayerHit() {
  if (!ball.visible || !canPlayerHit()) return;
  if (BOT) {
    if ((S.phase === 'toss' && ball.vy < 0) || (S.phase === 'rally' && (ball.z < 0.15 || (ball.vy < 0 && ball.y < TT + 0.06)))) {
      if (S.phase === 'rally') botRecv.push(Math.round((ball.y - TT) * 100));
      playerShot(rand(0.3, 0.9), rand(-0.8, 0.8), rand(-0.5, 0.5), rand(0, 0.7), W / 2, H / 2);
    }
    return;
  }
  if (!tp.on) return;
  const bp = proj(ball.x, ball.y, ball.z);
  if (!bp) return;
  const v = swipeVel(), sp = Math.hypot(v.x, v.y), m = Math.min(W, H);
  if (sp < 0.35 * m) return;
  const bx = bp.x * PX, by = bp.y * PX;
  const R = hitRadius() + VBR * bp.s * PX;
  const d = distSeg(bx, by, tp.lx, tp.ly, tp.x, tp.y);
  if (d > R) return;
  playerShot(clamp((sp - 0.35 * m) / (3.0 * m), 0, 1), v.x / sp, v.y / sp, d / R, bx, by);
}

// ---------- 更新 ----------
const paddle = { x: 0, y: 0, kick: 0, init: false };

function update(dt) {
  S.msgT -= dt;
  for (const m of marks) m.t += dt;
  while (marks.length && marks[0].t > 0.6) marks.shift();
  for (const p of popups) p.t += dt;
  while (popups.length && popups[0].t > 0.8) popups.shift();

  if (S.phase === 'serveWait') {
    ball.visible = false;
    S.timer -= dt;
    if (S.timer <= 0) startServe();
  } else if (S.phase === 'aiServe') {
    Object.assign(ball, { x: ai.x, y: 1.05 + Math.abs(Math.sin(S.timer * 7)) * 0.12, z: ai.z - 0.1, vx: 0, vy: 0, vz: 0 });
    S.timer -= dt;
    if (S.timer <= 0) { if (S.practice) aiShot(false, practiceKind()); else aiShot(true); }
  } else {
    const n = 6, h = dt / n;
    for (let i = 0; i < n; i++) {
      const ev = integrate(ball, h);
      if (ev) onEvent(ev);
    }
    if (S.phase === 'rally' && (ball.z < -2.2 || ball.z > TL + 2.2 || Math.abs(ball.x) > 3)) ruleOut();
    if (S.phase === 'toss' && ball.y < TT - 0.05 && ball.vy < 0) { S.phase = 'serveWait'; S.timer = 0.5; }
    if (S.phase === 'pointOver') {
      S.timer -= dt;
      if (S.timer <= 0) endOfPoint();
    }
  }

  updateAI(dt);
  checkPlayerHit();
  tp.lx = tp.x; tp.ly = tp.y;

  if (ball.visible) { trail.push([ball.x, ball.y, ball.z]); if (trail.length > 6) trail.shift(); }
  if (BOT) document.title = 'bot ' + S.pg + '-' + S.ag + ' ' + S.ps + ':' + S.as;
}

// ---------- 繪圖工具（畫在低解析度畫布上） ----------
let D = g;   // 目前要畫的畫布
function poly(pts, fill, stroke, lw) {
  D.beginPath();
  for (let i = 0; i < pts.length; i++) {
    const q = proj(pts[i][0], pts[i][1], pts[i][2]);
    if (!q) return;
    if (i) D.lineTo(q.x, q.y); else D.moveTo(q.x, q.y);
  }
  D.closePath();
  if (fill) { D.fillStyle = fill; D.fill(); }
  if (stroke) { D.strokeStyle = stroke; D.lineWidth = lw || 1; D.stroke(); }
}
function line3(a, b, color, w, minW) {
  const p = proj(a[0], a[1], a[2]), q = proj(b[0], b[1], b[2]);
  if (!p || !q) return;
  D.strokeStyle = color;
  D.lineWidth = Math.max(minW || 1, w * (p.s + q.s) / 2);
  D.lineCap = 'butt';
  D.beginPath(); D.moveTo(p.x, p.y); D.lineTo(q.x, q.y); D.stroke();
}
function circle(c, x, y, r, fill) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fillStyle = fill; c.fill(); }
function roundRect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}
function mulberry(seed) {
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

// ---------- 場館背景（只在尺寸改變時重畫） ----------
const SZ = TL + 7, TIERS = 18, RISE = 0.45, DEP = 0.6, SXS = 5.5, BZ = TL + 2.3, BX = 3.6, NEAR = -0.85;
const SHIRTS = ['#e64a3c', '#3a7be0', '#f2c14e', '#4bbf73', '#e7e7e7', '#8e5bd6', '#f08a3c', '#2d2d2d', '#56c2e6', '#d94f8c'];
const SKINS = ['#f3c9a0', '#e0ac7e', '#c68a5e', '#8d5a3b', '#f7d7b8'];
const HAIRS = ['#2a1a10', '#4a2e1a', '#111111', '#6b4a2a', '#c9a35a'];

function person(rng, x, y, z) {
  const p = proj(x, y, z);
  if (!p || p.x < -20 || p.x > LW + 20) return;
  const s = p.s;
  const tw = Math.max(2, Math.round(0.34 * s)), th = Math.max(2, Math.round(0.42 * s));
  const hr = Math.max(1, Math.round(0.1 * s));
  const px = Math.round(p.x), py = Math.round(p.y);
  D.fillStyle = SHIRTS[(rng() * SHIRTS.length) | 0];
  D.fillRect(px - (tw >> 1), py - th, tw, th);
  D.fillStyle = SKINS[(rng() * SKINS.length) | 0];
  D.fillRect(px - hr, py - th - hr * 2 - 1, hr * 2, hr * 2);
  D.fillStyle = HAIRS[(rng() * HAIRS.length) | 0];
  D.fillRect(px - hr, py - th - hr * 2 - 1, hr * 2, Math.max(1, Math.round(hr * 0.7)));
}

function emblem(cx, plane, y0) {
  // 看板上的球拍圖示（plane: 給 (u, v) 回傳世界座標）
  const pts = [];
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2;
    pts.push(plane(cx - 0.05 + Math.cos(a) * 0.16, y0 + 0.43 + Math.sin(a) * 0.17));
  }
  poly(pts, '#5f95f0');
  poly([plane(cx + 0.03, y0 + 0.3), plane(cx + 0.11, y0 + 0.33), plane(cx + 0.22, y0 + 0.14), plane(cx + 0.15, y0 + 0.11)], '#5f95f0');
}

function barrierRun(plane, u0, u1) {
  for (let u = u0; u < u1 - 0.01; u += 1.2) {
    const ua = u, ub = Math.min(u1, u + 1.2);
    poly([plane(ua, 0), plane(ub, 0), plane(ub, 0.75), plane(ua, 0.75)], '#1e4cb0');
    poly([plane(ua, 0.66), plane(ub, 0.66), plane(ub, 0.75), plane(ua, 0.75)], '#3e72e3');
    poly([plane(ua, 0), plane(ub, 0), plane(ub, 0.06), plane(ua, 0.06)], '#13306f');
    poly([plane(ub - 0.03, 0), plane(ub, 0), plane(ub, 0.75), plane(ub - 0.03, 0.75)], '#10275c');
    if (ub - ua > 0.8) emblem((ua + ub) / 2, plane, 0);
  }
}

function buildBackground() {
  D = bgLayer.getContext('2d');
  const rng = mulberry(7);
  const sky = D.createLinearGradient(0, 0, 0, LH);
  sky.addColorStop(0, '#0c1120'); sky.addColorStop(1, '#1a2340');
  D.fillStyle = sky; D.fillRect(0, 0, LW, LH);

  // 天花板燈
  const backZ = SZ + TIERS * DEP;
  const CEIL = 0.6 + TIERS * RISE + 1.5;
  poly([[-20, 0, backZ], [20, 0, backZ], [20, CEIL, backZ], [-20, CEIL, backZ]], '#121a2e');
  for (let z = 6; z < backZ; z += 4) {
    for (let x = -9; x <= 9; x += 4.5) {
      const p = proj(x, CEIL, z);
      if (!p) continue;
      const gl = D.createRadialGradient(p.x, p.y, 0, p.x, p.y, 1.6 * p.s);
      gl.addColorStop(0, 'rgba(255,240,200,0.22)'); gl.addColorStop(1, 'rgba(255,240,200,0)');
      D.fillStyle = gl; D.fillRect(p.x - 1.6 * p.s, p.y - 1.6 * p.s, 3.2 * p.s, 3.2 * p.s);
      poly([[x - 0.35, CEIL, z], [x + 0.35, CEIL, z], [x + 0.35, CEIL, z + 0.15], [x - 0.35, CEIL, z + 0.15]], '#fff8e0');
    }
  }

  // 後方看台（遠的先畫）
  for (let k = TIERS - 1; k >= 0; k--) {
    const z = SZ + k * DEP, y = 0.6 + k * RISE;
    poly([[-14, y - RISE, z], [14, y - RISE, z], [14, y, z], [-14, y, z]], '#171f35');
    poly([[-14, y, z], [14, y, z], [14, y, z + DEP], [-14, y, z + DEP]], '#222b45');
    poly([[-14, y, z + 0.32], [14, y, z + 0.32], [14, y + 0.24, z + 0.32], [-14, y + 0.24, z + 0.32]], '#2a4b9c');
    for (const ax of [-3.2, 3.2]) {   // 走道階梯
      poly([[ax - 0.45, y - 0.01, z], [ax + 0.45, y - 0.01, z], [ax + 0.45, y + 0.3, z + 0.01], [ax - 0.45, y + 0.3, z + 0.01]], '#39445f');
    }
    for (let x = -13.5; x <= 13.5; x += 0.5) {
      if (Math.abs(Math.abs(x) - 3.2) < 0.55 || rng() > 0.85) { rng(); rng(); rng(); continue; }
      person(rng, x + (rng() - 0.5) * 0.12, y + 0.05, z + 0.4);
    }
  }
  // 兩側看台
  for (const sd of [-1, 1]) {
    for (let k = TIERS - 1; k >= 0; k--) {
      const x = sd * (SXS + k * DEP), y = 0.6 + k * RISE;
      poly([[x, y - RISE, NEAR], [x, y - RISE, SZ], [x, y, SZ], [x, y, NEAR]], '#171f35');
      poly([[x, y, NEAR], [x, y, SZ], [x + sd * DEP, y, SZ], [x + sd * DEP, y, NEAR]], '#222b45');
      poly([[x + sd * 0.32, y, NEAR], [x + sd * 0.32, y, SZ], [x + sd * 0.32, y + 0.24, SZ], [x + sd * 0.32, y + 0.24, NEAR]], '#2a4b9c');
      for (let z = SZ - 0.3; z > NEAR + 0.6; z -= 0.5) {
        if (rng() > 0.85) { rng(); rng(); rng(); continue; }
        person(rng, x + sd * 0.4, y + 0.05, z + (rng() - 0.5) * 0.1);
      }
    }
  }
  // 讓看台暗一點
  D.fillStyle = 'rgba(8,12,30,0.45)'; D.fillRect(0, 0, LW, LH);

  // 木地板
  poly([[-SXS, 0, NEAR], [SXS, 0, NEAR], [SXS, 0, SZ], [-SXS, 0, SZ]], '#b8773f');
  const woods = ['#c4834a', '#b9783f', '#cd8d52', '#b06f39', '#c88a4e'];
  for (let x = -SXS; x < SXS; x += 0.22) {
    let z = NEAR + rng() * 0.5;
    poly([[x, 0, NEAR], [x + 0.22, 0, NEAR], [x + 0.22, 0, z], [x, 0, z]], woods[(rng() * 5) | 0]);
    while (z < SZ) {
      const z2 = Math.min(SZ, z + 1.5 + rng() * 2);
      poly([[x, 0, z], [x + 0.22, 0, z], [x + 0.22, 0, z2], [x, 0, z2]], woods[(rng() * 5) | 0]);
      z = z2;
    }
    line3([x, 0, NEAR], [x, 0, SZ], 'rgba(90,50,20,0.35)', 0.004);
  }
  // 看台前牆
  poly([[-SXS, 0, SZ], [SXS, 0, SZ], [SXS, 0.6, SZ], [-SXS, 0.6, SZ]], '#141b30');
  poly([[-SXS, 0.42, SZ], [SXS, 0.42, SZ], [SXS, 0.48, SZ], [-SXS, 0.48, SZ]], '#2f6be0');
  for (const sd of [-1, 1]) poly([[sd * SXS, 0, NEAR], [sd * SXS, 0, SZ], [sd * SXS, 0.6, SZ], [sd * SXS, 0.6, NEAR]], '#141b30');

  // 擋板
  barrierRun((u, v) => [u, v, BZ], -BX, BX);
  barrierRun((u, v) => [-BX, v, BZ - u], 0, BZ - NEAR);
  barrierRun((u, v) => [BX, v, BZ - u], 0, BZ - NEAR);
  D = g;
}

function buildTable() {
  D = tableLayer.getContext('2d');
  D.clearRect(0, 0, LW, LH);
  // 桌腳與底架
  for (const [x, z] of [[-(HW - 0.15), TL - 0.3], [HW - 0.15, TL - 0.3], [-(HW - 0.15), 0.3], [HW - 0.15, 0.3]]) {
    line3([x, 0, z], [x, TT - 0.05, z], '#141c33', 0.06, 2);
  }
  line3([-(HW - 0.15), 0.25, 0.3], [HW - 0.15, 0.25, 0.3], '#141c33', 0.04, 2);
  // 桌面
  const near = proj(0, TT, 0), far = proj(0, TT, TL);
  const grd = D.createLinearGradient(0, far.y, 0, near.y);
  grd.addColorStop(0, '#3d7ad8'); grd.addColorStop(1, '#2459bf');
  poly([[-HW, TT, 0], [HW, TT, 0], [HW, TT, TL], [-HW, TT, TL]], grd);
  const L = 0.024, white = '#f4f6ff';
  poly([[-HW, TT, 0], [HW, TT, 0], [HW, TT, L], [-HW, TT, L]], white);
  poly([[-HW, TT, TL - L], [HW, TT, TL - L], [HW, TT, TL], [-HW, TT, TL]], white);
  poly([[-HW, TT, 0], [-HW + L, TT, 0], [-HW + L, TT, TL], [-HW, TT, TL]], white);
  poly([[HW - L, TT, 0], [HW, TT, 0], [HW, TT, TL], [HW - L, TT, TL]], white);
  poly([[-0.004, TT, 0], [0.004, TT, 0], [0.004, TT, TL], [-0.004, TT, TL]], white);
  line3([0, TT, L], [0, TT, TL - L], 'rgba(244,246,255,0.7)', 0.003, 1);
  // 近端桌邊
  poly([[-HW, TT, 0], [HW, TT, 0], [HW, TT - 0.05, 0], [-HW, TT - 0.05, 0]], '#0f2a66');
  poly([[-HW, TT - 0.05, 0], [HW, TT - 0.05, 0], [HW, TT - 0.065, 0.02], [-HW, TT - 0.065, 0.02]], '#0a1c45');
  D = g;
}

function buildNet() {
  D = netLayer.getContext('2d');
  D.clearRect(0, 0, LW, LH);
  poly([[-NETHW, TT, NETZ], [NETHW, TT, NETZ], [NETHW, NETTOP, NETZ], [-NETHW, NETTOP, NETZ]], 'rgba(12,22,58,0.55)');
  for (let x = -NETHW; x <= NETHW + 1e-6; x += 0.03) line3([x, TT, NETZ], [x, NETTOP, NETZ], 'rgba(170,190,235,0.45)', 0.002, 1);
  for (let y = TT + 0.02; y < NETTOP; y += 0.03) line3([-NETHW, y, NETZ], [NETHW, y, NETZ], 'rgba(170,190,235,0.45)', 0.002, 1);
  poly([[-NETHW, NETTOP - 0.018, NETZ], [NETHW, NETTOP - 0.018, NETZ], [NETHW, NETTOP, NETZ], [-NETHW, NETTOP, NETZ]], '#ffffff');
  for (const sd of [-1, 1]) {
    poly([[sd * NETHW - 0.02, TT - 0.04, NETZ], [sd * NETHW + 0.02, TT - 0.04, NETZ], [sd * NETHW + 0.02, NETTOP + 0.01, NETZ], [sd * NETHW - 0.02, NETTOP + 0.01, NETZ]], '#2a55c0');
  }
  D = g;
}

// ---------- 每一格的動態物件 ----------
function drawOpponent() {
  if (!sheet.complete || !sheet.naturalWidth) return;
  const set = SPR[oppChar()][opp.anim];
  const fr = set[Math.min(opp.frame, set.length - 1)];
  const p = proj(opp.bx, OPP_FEET, OPP_Z), edge = proj(0, TT, TL);
  if (!p || !edge) return;
  const k = MPP * p.s;
  g.save();
  g.beginPath(); g.rect(0, 0, LW, Math.round(edge.y) + 1); g.clip();
  g.drawImage(sheet, fr[0], fr[1], fr[2], fr[3],
    Math.round(p.x - fr[4] * k), Math.round(p.y - fr[3] * k), Math.round(fr[2] * k), Math.round(fr[3] * k));
  g.restore();
}

function drawShadow(onTable) {
  if (!ball.visible) return;
  const over = Math.abs(ball.x) <= HW && ball.z >= 0 && ball.z <= TL && ball.y >= TT;
  if (over !== onTable) return;
  const gy = over ? TT : 0;
  const p = proj(ball.x, gy, ball.z);
  if (!p) return;
  const hgt = ball.y - gy;
  const r = Math.max(1.5, VBR * p.s * (1 + hgt * 0.3));
  g.fillStyle = `rgba(5,15,45,${clamp(0.55 - hgt * 0.35, 0.15, 0.55)})`;
  g.beginPath(); g.ellipse(p.x, p.y, r, r * 0.45, 0, 0, Math.PI * 2); g.fill();
}

function drawMarks() {
  for (const m of marks) {
    const p = proj(m.x, TT, m.z);
    if (!p) continue;
    const k = m.t / 0.6, r = (0.03 + k * 0.07) * p.s;
    g.strokeStyle = `rgba(255,255,255,${0.6 * (1 - k)})`;
    g.lineWidth = 1;
    g.beginPath(); g.ellipse(p.x, p.y, r, r * 0.4, 0, 0, Math.PI * 2); g.stroke();
  }
}

function drawBall() {
  if (!ball.visible) return;
  const si = spinInfo(ball.top, ball.side);
  const rgb = si ? si.rgb : '255,255,255', a0 = si ? 0.3 : 0.08, da = si ? 0.09 : 0.05;
  for (let i = 0; i < trail.length - 1; i++) {
    const q = proj(...trail[i]);
    if (!q) continue;
    circle(g, q.x, q.y, Math.max(1.5, VBR * q.s * 0.9), `rgba(${rgb},${a0 + i * da})`);
  }
  const p = proj(ball.x, ball.y, ball.z);
  if (!p) return;
  const r = Math.max(2, VBR * p.s);
  circle(g, p.x, p.y, r, '#d9dde8');
  circle(g, p.x - r * 0.15, p.y - r * 0.15, r * 0.82, '#ffffff');
  const spin = Math.abs(ball.top) > Math.abs(ball.side) ? ball.top : ball.side;
  if (r >= 3.5 && Math.abs(spin) > 0.1) {   // 旋轉的球上畫一條會轉的線
    const a = performance.now() / 1000 * spin * 25;
    g.strokeStyle = si ? si.css : 'rgba(140,150,180,0.9)';
    g.lineWidth = Math.max(1, r * 0.22);
    g.beginPath(); g.moveTo(p.x - Math.cos(a) * r * 0.7, p.y - Math.sin(a) * r * 0.7);
    g.lineTo(p.x + Math.cos(a) * r * 0.7, p.y + Math.sin(a) * r * 0.7); g.stroke();
  }
  if (r > 4) circle(g, p.x - r * 0.35, p.y - r * 0.35, r * 0.25, '#ffffff');
}

// 第一人稱的球拍（右手握把朝右下，左手朝左下）
function drawPaddle(dt) {
  const R = hitRadius() / PX, side = S.hand === 'left' ? -1 : 1;
  const rest = { x: LW * (0.5 + side * 0.24), y: LH * 0.8 };
  if (!paddle.init) { paddle.x = rest.x; paddle.y = rest.y; paddle.init = true; }
  if (tp.on && S.mode === 'play') { paddle.x = tp.x / PX; paddle.y = tp.y / PX; }
  else { const k = Math.min(1, dt * 10); paddle.x += (rest.x - paddle.x) * k; paddle.y += (rest.y - paddle.y) * k; }
  paddle.kick = Math.max(0, paddle.kick - dt * 6);
  const P = { x: paddle.x, y: paddle.y - paddle.kick * R * 0.15 };
  const grip = { x: LW * (0.5 + side * 0.48), y: LH + R * 3 };
  let dx = grip.x - P.x, dy = grip.y - P.y;
  const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L;
  const nx = -dy, ny = dx;
  const at = t => ({ x: P.x + dx * R * t, y: P.y + dy * R * t });
  const quad = (t0, w0, t1, w1, color) => {
    const a = at(t0), b = at(t1);
    g.beginPath();
    g.moveTo(a.x + nx * w0, a.y + ny * w0); g.lineTo(b.x + nx * w1, b.y + ny * w1);
    g.lineTo(b.x - nx * w1, b.y - ny * w1); g.lineTo(a.x - nx * w0, a.y - ny * w0);
    g.closePath(); g.fillStyle = color; g.fill();
  };
  // 握把
  quad(0.8, R * 0.17, 2.05, R * 0.2, '#2a1608');
  quad(0.8, R * 0.13, 2.0, R * 0.16, '#c99055');
  quad(0.8, R * 0.04, 2.0, R * 0.05, '#e0ad72');
  quad(1.85, R * 0.16, 2.0, R * 0.16, '#7a4a22');
  // 拍面
  const ang = Math.atan2(dy, dx) - Math.PI / 2;
  g.save(); g.translate(P.x, P.y); g.rotate(ang); g.scale(side, 1);
  g.beginPath(); g.ellipse(R * 0.08, 0, R * 0.95, R * 1.05, 0, 0, Math.PI * 2); g.fillStyle = '#5a3218'; g.fill();
  g.beginPath(); g.ellipse(0, 0, R * 0.95, R * 1.05, 0, 0, Math.PI * 2); g.fillStyle = '#1a0a0a'; g.fill();
  g.beginPath(); g.ellipse(0, 0, R * 0.9, R * 1.0, 0, 0, Math.PI * 2); g.fillStyle = '#8e1c1c'; g.fill();
  g.beginPath(); g.ellipse(-R * 0.03, -R * 0.03, R * 0.84, R * 0.94, 0, 0, Math.PI * 2); g.fillStyle = '#d22d2d'; g.fill();
  g.beginPath(); g.ellipse(-R * 0.3, -R * 0.35, R * 0.38, R * 0.3, -0.6, 0, Math.PI * 2); g.fillStyle = 'rgba(255,120,100,0.35)'; g.fill();
  g.restore();
}

function drawSwipeTrail() {
  const now = performance.now();
  while (tp.trail.length && now - tp.trail[0].t > 200) tp.trail.shift();
  g.lineCap = 'round';
  for (let i = 1; i < tp.trail.length; i++) {
    const a = tp.trail[i - 1], b = tp.trail[i], k = 1 - (now - b.t) / 200;
    g.strokeStyle = `rgba(255,255,255,${0.35 * k})`;
    g.lineWidth = 2 + 5 * k;
    g.beginPath(); g.moveTo(a.x / PX, a.y / PX); g.lineTo(b.x / PX, b.y / PX); g.stroke();
  }
}

// ---------- HUD（高解析度） ----------
const hudU = () => clamp(Math.min(W / 560, H / 330), 0.55, 1.5);
function centerBox() { const u = hudU(); return { x: W / 2 - 50 * u, y: 8 * u, w: 100 * u, h: 42 * u }; }
function placePauseButton() {
  const b = centerBox(), el = document.getElementById('pause');
  Object.assign(el.style, { left: b.x + 'px', top: b.y + 'px', width: b.w + 'px', height: b.h + 'px' });
}

function scoreBox(x, y, w, h, u, fill, border, label, score, serving, scoreLeft) {
  ctx.fillStyle = '#05080f'; ctx.fillRect(x - 2 * u, y - 2 * u, w + 4 * u, h + 4 * u);
  ctx.fillStyle = border; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = fill; ctx.fillRect(x + 3 * u, y + 3 * u, w - 6 * u, h - 6 * u);
  const sw = 40 * u, sx = scoreLeft ? x + 3 * u : x + w - 3 * u - sw;
  ctx.fillStyle = '#0a1226'; ctx.fillRect(sx, y + 3 * u, sw, h - 6 * u);
  ctx.fillStyle = border; ctx.fillRect(scoreLeft ? sx + sw : sx - 2 * u, y + 3 * u, 2 * u, h - 6 * u);
  ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
  ctx.fillStyle = '#fff'; ctx.font = `${Math.round(18 * u * Math.min(1, 2.2 / String(score).length))}px ${FONT}`;
  ctx.fillText(String(score), sx + sw / 2, y + h / 2 + u);
  const lx = scoreLeft ? x + 3 * u + sw + (w - sw - 6 * u) / 2 : x + 3 * u + (w - sw - 6 * u) / 2;
  ctx.font = `${Math.round(8 * u)}px ${FONT}`;
  ctx.fillText(label, lx, y + h / 2 - 5 * u);
  if (serving) {
    circle(ctx, lx, y + h / 2 + 9 * u, 3.2 * u, '#ffffff');
  }
}

function drawHUD() {
  const u = hudU(), b = centerBox(), bw = 150 * u, pad = 8 * u;
  const playing = S.mode !== 'menu', pr = S.practice && playing;
  if (pr) {
    scoreBox(pad, b.y, bw, b.h, u, '#173a8f', '#5d8cff', 'SUCCESS', S.prHits + '/' + S.prTotal, false, false);
    scoreBox(W - pad - bw, b.y, bw, b.h, u, '#1d5a3a', '#5ddf9a', 'STREAK', S.streak, false, true);
  } else {
    scoreBox(pad, b.y, bw, b.h, u, '#173a8f', '#5d8cff', 'PLAYER', S.ps, playing && S.server === 'player', false);
    scoreBox(W - pad - bw, b.y, bw, b.h, u, '#6e1420', '#ff5b5b', S.oppName || 'COMPUTER', S.as, playing && S.server === 'ai', true);
  }
  if (S.careerMatch) {   // 生涯模式：球拍耐久度
    const r = careerHudInfo();
    if (r) {
      const x = pad, y = b.y + b.h + 8 * u, w2 = bw, k = r.dur / r.max;
      ctx.fillStyle = 'rgba(5,8,20,0.75)'; ctx.fillRect(x, y, w2, 20 * u);
      ctx.fillStyle = '#26305a'; ctx.fillRect(x + 4 * u, y + 13 * u, w2 - 8 * u, 4 * u);
      ctx.fillStyle = k > 0.5 ? '#5ddf9a' : k > 0.25 ? '#ffd166' : '#ff5b5b';
      ctx.fillRect(x + 4 * u, y + 13 * u, (w2 - 8 * u) * k, 4 * u);
      ctx.fillStyle = '#e8ecff'; ctx.font = `bold ${Math.round(10 * u)}px system-ui, sans-serif`; ctx.textAlign = 'left';
      ctx.fillText(`🏓 ${r.name}  ${r.dur}/${r.max}`, x + 4 * u, y + 7 * u);
    }
  }
  ctx.fillStyle = '#05080f'; ctx.fillRect(b.x - 2 * u, b.y - 2 * u, b.w + 4 * u, b.h + 4 * u);
  ctx.fillStyle = '#34405e'; ctx.fillRect(b.x, b.y, b.w, b.h);
  ctx.fillStyle = '#0f1730'; ctx.fillRect(b.x + 2 * u, b.y + 2 * u, b.w - 4 * u, b.h - 4 * u);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#e8ecff';
  ctx.font = `${Math.round(8 * u)}px ${FONT}`;
  ctx.fillText(pr ? 'PRACTICE' : 'GAME ' + S.game, W / 2, b.y + 14 * u);
  ctx.fillStyle = '#9fb0d8';
  ctx.fillText(pr ? 'BEST ' + S.bestStreak : S.pg + ' - ' + S.ag, W / 2, b.y + 29 * u);
  if (S.mode === 'play') {   // 暫停圖示
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fillRect(b.x + b.w - 11 * u, b.y + 6 * u, 2 * u, 6 * u);
    ctx.fillRect(b.x + b.w - 7 * u, b.y + 6 * u, 2 * u, 6 * u);
  }

  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const p of popups) {
    ctx.globalAlpha = clamp(1 - p.t / 0.8, 0, 1);
    ctx.font = `bold ${Math.round(13 * u)}px ${FONT}`;
    const py = p.y - 40 - p.t * 50;
    ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(3, 4 * u); ctx.strokeStyle = '#000';
    ctx.strokeText(p.text, p.x, py);
    ctx.fillStyle = p.color; ctx.fillText(p.text, p.x, py);
  }
  ctx.globalAlpha = 1;

  if (S.msgT > 0) {
    ctx.globalAlpha = clamp(S.msgT * 2, 0, 1);
    const my = H * 0.36;
    ctx.font = `bold ${Math.round(26 * u)}px ${FONT}`;
    ctx.fillStyle = '#000'; ctx.fillText(S.msg, W / 2 + 3, my + 3);
    ctx.fillStyle = S.msgColor; ctx.fillText(S.msg, W / 2, my);
    ctx.font = `bold ${Math.round(14 * u)}px ${FONT}`;
    ctx.fillStyle = '#000'; ctx.fillText(S.sub, W / 2 + 2, my + 34 * u + 2);
    ctx.fillStyle = '#fff'; ctx.fillText(S.sub, W / 2, my + 34 * u);
    ctx.globalAlpha = 1;
  }

  let hint = '';
  if (S.mode === 'play') {
    if (S.phase === 'toss') hint = '發球！手指從旁邊往中間滑過球';
    else if (S.practice) { if (S.phase === 'rally' && S.lastHitter === 'ai') hint = PR_TIPS[S.lastKind] || ''; }
    else if (S.game === 1 && S.ps + S.as < 3 && S.phase === 'rally' && S.lastHitter === 'ai') hint = '球從哪邊來，就點那一側往中間滑';
  }
  if (hint) {
    ctx.font = `bold ${Math.round(13 * u)}px ${FONT}`;
    const tw = ctx.measureText(hint).width + 24;
    const hy = H - 30 * u;
    ctx.fillStyle = 'rgba(5,8,20,0.75)'; ctx.fillRect(W / 2 - tw / 2, hy - 14 * u, tw, 28 * u);
    ctx.fillStyle = '#ffd166'; ctx.fillText(hint, W / 2, hy);
  }
}

function draw(dt) {
  g.imageSmoothingEnabled = false;
  g.drawImage(bgLayer, 0, 0);
  drawShadow(false);
  const ballFirst = ball.y < TT && ball.z > 0;
  if (ballFirst) drawBall();
  drawOpponent();
  g.drawImage(tableLayer, 0, 0);
  drawShadow(true);
  drawMarks();
  const nearBall = !ballFirst && ball.z < 0.6;
  if (!ballFirst && ball.z >= NETZ) drawBall();
  g.drawImage(netLayer, 0, 0);
  if (!ballFirst && !nearBall && ball.z < NETZ) drawBall();
  drawSwipeTrail();
  drawPaddle(dt);
  if (nearBall) drawBall();   // 靠近時畫在球拍上面，才看得到球

  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(lo, 0, 0, LW * PX, LH * PX);
  drawHUD();
}

// ---------- 介面 ----------
const $ = id => document.getElementById(id);
const show = (id, on) => $(id).classList.toggle('hidden', !on);

// ---------- 主選單：模式 → 難度 → 角色 → 慣用手 →（直接比賽）局數 ----------
let menuMode = 'match';
const MODE_NAME = { match: '🏓 直接比賽', career: '🏆 冠軍之路' };
const MENU_STEPS = ['stepMode', 'stepDiff', 'stepChar', 'stepHand', 'stepBestOf'];
function menuStep(id) {
  MENU_STEPS.forEach(x => show(x, x === id));
  document.querySelectorAll('.stepMode').forEach(x => { x.textContent = MODE_NAME[menuMode]; });
  show('charNote', menuMode !== 'career');   // 冠軍之路的對手每場都不一樣
  $('menuOv').scrollTop = 0;
}
function menuHome() { menuStep('stepMode'); show('menuOv', true); }
// 每一步「返回」上一步
const MENU_BACK = { stepDiff: 'stepMode', stepChar: 'stepDiff', stepHand: 'stepChar', stepBestOf: 'stepHand' };
document.querySelectorAll('.backBtn').forEach(b => {
  b.addEventListener('click', () => menuStep(MENU_BACK[b.closest('.step').id]));
});
// 點一個選項：標記選取，然後進到下一步（最後一步就直接開始）
function menuChoice(sel, apply, next) {
  document.querySelectorAll(sel).forEach(b => {
    b.addEventListener('click', () => {
      apply(b);
      document.querySelectorAll(sel).forEach(x => x.classList.toggle('sel', x === b));
      next();
    });
  });
}
menuChoice('#modes button', b => { menuMode = b.dataset.m; S.practice = false; }, () => menuStep('stepDiff'));
menuChoice('#diffs button', b => { S.diff = b.dataset.d; }, () => menuStep('stepChar'));
menuChoice('.char', b => { S.char = b.dataset.c; }, () => menuStep('stepHand'));
menuChoice('#hands button', b => { S.hand = b.dataset.h; paddle.init = false; }, () => {
  if (menuMode === 'career') careerOpen();
  else menuStep('stepBestOf');
});
menuChoice('#bestOf button', b => { S.bestOf = Number(b.dataset.n); }, openToss);

// ---------- 練習模式：從直接比賽的暫停選單（那場比賽就結束）或冠軍之路的 ☰ 選單（用自己的球拍、不會磨損）進入 ----------
// S.prFrom：'match' 或 'career'，結束練習時回到那裡
function openPractice(from) {
  S.prFrom = from;
  $('prNote').textContent = from === 'career' ? '用你現在的球拍練習，球拍不會磨損。' : '選好球路後，目前這場比賽會結束，改成練習。';
  show('pauseOv', false); show('practiceOv', true);
}
$('prBack').addEventListener('click', () => {
  show('practiceOv', false);
  if (S.prFrom === 'career') careerShow('hub'); else show('pauseOv', true);
});
menuChoice('#prKinds button', b => { S.prKind = b.dataset.k; }, () => {
  show('practiceOv', false);
  S.practice = true;
  if (S.prFrom === 'career') { careerHide(); S.diff = 'normal'; }
  startGame();
  if (S.prFrom === 'career') applyGear();   // 冠軍之路：用自己的球拍
});
$('practiceBtn').addEventListener('click', () => openPractice('match'));
function endPractice() {
  S.practice = false; ball.visible = false;
  show('pauseOv', false); show('pause', false);
  if (S.prFrom === 'career') { S.mode = 'world'; GEAR = NEUTRAL_GEAR; careerShow('hub'); return; }   // 回到 ☰ 選單
  S.mode = 'menu'; menuHome();
}
document.querySelectorAll('.soundBtn').forEach(b => {
  b.addEventListener('click', () => {
    S.sound = !S.sound;
    initAudio();
    if (master) master.gain.setTargetAtTime(S.sound ? 1 : 0, AC.currentTime, 0.05);
    document.querySelectorAll('.soundBtn').forEach(x => { x.textContent = S.sound ? '🔊 音效：開' : '🔇 音效：關'; });
  });
});

// first：第一局誰先發球（猜球決定），沒給就是玩家先發
function startGame(first) {
  initAudio();
  const fs = first === 'ai' ? 'ai' : 'player';
  Object.assign(S, { mode: 'play', phase: 'serveWait', timer: 1.2, ps: 0, as: 0, pg: 0, ag: 0, game: 1, games: [],
    firstServer: fs, server: fs, msgT: 0, lastHitter: null,
    prHits: 0, prTotal: 0, streak: 0, bestStreak: 0, rally: 0 });
  if (!S.careerMatch) { GEAR = NEUTRAL_GEAR; S.oppChar = null; S.oppName = null; }
  $('quitBtn').textContent = S.careerMatch ? '棄權（這場算輸）' : S.practice ? '結束練習' : '回主選單';
  if (S.practice) { S.firstServer = 'ai'; S.server = 'ai'; }   // 練習模式一直由對手送球
  else showMsg(fs === 'player' ? '你先發球' : '對手先發球', 'GAME 1', '#ffd166', 1.4);
  Object.assign(ai, { x: 0, y: 1.0, attempted: false });
  ball.visible = false;
  show('menuOv', false); show('overOv', false); show('pauseOv', false); show('tossOv', false); show('pause', true);
  toss.phase = 'off';
  const el = document.documentElement;
  if (!BOT && el.requestFullscreen && !document.fullscreenElement) el.requestFullscreen().catch(() => {});
}

function matchOver() {
  S.mode = 'over';
  ball.visible = false;
  const won = S.pg > S.ag;
  if (S.careerMatch) { show('pause', false); if (won) crowd.cheer(1); careerMatchEnd(won, false); return; }
  $('goImg').src = won ? 'assets/' + S.char + '_portrait.png' : oppPortrait(oppChar());
  $('goTitle').textContent = won ? '🏆 你贏了這場比賽！' : '對手贏了，再接再厲！';
  $('goScore').textContent = S.pg + ' - ' + S.ag;
  $('goSub').textContent = '各局比分：' + S.games.join('、');
  show('overOv', true); show('pause', false);
  if (won) crowd.cheer(1);
  if (BOT) document.body.dataset.result = JSON.stringify({ pg: S.pg, ag: S.ag, games: S.games, shots: botShots, recv: botRecv, log: botLog });
}

function toMenu() {
  if (S.practice) { endPractice(); return; }
  if (S.careerMatch) {   // 生涯比賽中途離開＝棄權
    S.mode = 'over'; ball.visible = false;
    show('pauseOv', false); show('pause', false);
    careerMatchEnd(false, true);
    return;
  }
  S.mode = 'menu'; ball.visible = false;
  Object.assign(S, { ps: 0, as: 0, pg: 0, ag: 0, game: 1 });
  show('pauseOv', false); show('overOv', false); show('pause', false); menuHome();
}

// ---------- 猜球：裁判藏球的動畫，猜對的人決定先發球或先接發球 ----------
const refImg = new Image();
refImg.src = 'assets/referee.png';
// 裁判圖（assets/referee.png）的切格：位置、頭頂與頭的中心（對齊用）、手的位置
const REF = {
  idle0: { x: 2, y: 2, w: 88, h: 155, headTop: 0, headCx: 43.2 },
  idle1: { x: 92, y: 2, w: 88, h: 155, headTop: 0, headCx: 43.2 },
  idle2: { x: 182, y: 2, w: 88, h: 156, headTop: 0, headCx: 43.3 },
  idle3: { x: 272, y: 2, w: 89, h: 156, headTop: 0, headCx: 43.7 },
  timeout: { x: 363, y: 2, w: 115, h: 162, headTop: 0, headCx: 56.9, ball: [57.4, 60] },
  gameend: { x: 480, y: 2, w: 139, h: 162, headTop: 12, headCx: 68.8, palmL: [13.0, 23.8], palmR: [125.5, 24.2] },
  gameend_fist: { x: 621, y: 2, w: 139, h: 162, headTop: 12, headCx: 68.8 },
};
const TV = { HEAD: 40, CX: 110, DESK: 135 };   // 動畫畫布上：裁判頭頂的 y、頭的中心 x、桌面的 y
const tcv = $('tossCv'), tctx = tcv.getContext('2d');
const toss = { phase: 'off', t: 0, pick: null };
const TOSS_TEXT = { idle: '裁判準備猜球…', show: '裁判拿起球給你看…', hide: '把球藏起來…', fists: '球在哪一隻手裡？點左邊或右邊', shake: '打開手…' };
let tossBall = 'L', tossFirst = 'player';

function tossPhase(p) {
  toss.phase = p; toss.t = 0;
  if (TOSS_TEXT[p]) $('tossText').textContent = TOSS_TEXT[p];
  document.querySelectorAll('.hand').forEach(h => { h.disabled = p !== 'fists'; });
}
// 每一格更新：坐著 → 拿球給你看 → 藏到桌子下 → 舉起兩個拳頭 →（你猜）→ 搖一搖 → 打開
function updateToss(dt) {
  if (toss.phase === 'off') return;
  toss.t += dt;
  const t = toss.t;
  if (toss.phase === 'idle' && t > 1.0) tossPhase('show');
  else if (toss.phase === 'show' && t > 1.2) tossPhase('hide');
  else if (toss.phase === 'hide' && t > 1.3) tossPhase('fists');
  else if (toss.phase === 'shake' && t > 0.7) { tossPhase('reveal'); revealToss(); }
  drawToss();
}
function refPoint(name, pt) { const f = REF[name]; return [TV.CX - f.headCx + pt[0], TV.HEAD - f.headTop + pt[1]]; }
function drawTossBall(x, y, r) {
  circle(tctx, x, y, r + 1, '#151b2b');
  circle(tctx, x, y, r, '#d9dde8');
  circle(tctx, x - r * 0.15, y - r * 0.15, r * 0.8, '#ffffff');
}
function drawUmpireDesk() {
  const c = tctx, x = 14, y = TV.DESK, w = 192, h = tcv.height - TV.DESK - 2;
  c.fillStyle = '#0a1122'; c.fillRect(x - 2, y - 2, w + 4, h + 4);
  c.fillStyle = '#4068c4'; c.fillRect(x, y, w, 5);
  c.fillStyle = '#1c2f6a'; c.fillRect(x, y + 5, w, h - 5);
  c.fillStyle = '#22397e'; c.fillRect(x + 6, y + 11, w - 12, h - 17);
  // 桌子前面的翻牌計分板
  let cx = TV.CX - 32;
  c.font = '10px ' + FONT; c.textAlign = 'center'; c.textBaseline = 'middle';
  for (const [col, cw] of [['#c8282e', 22], ['#e8c22a', 16], ['#2a4fc4', 22]]) {
    c.fillStyle = '#0a0a12'; c.fillRect(cx - 1, y + 15, cw + 2, 26);
    c.fillStyle = col; c.fillRect(cx, y + 16, cw, 24);
    c.fillStyle = '#ffffff'; c.fillText('0', cx + cw / 2, y + 29);
    cx += cw + 3;
  }
}
function drawToss() {
  const c = tctx, t = toss.t;
  c.clearRect(0, 0, tcv.width, tcv.height);
  c.imageSmoothingEnabled = false;
  const gl = c.createRadialGradient(TV.CX, 85, 10, TV.CX, 85, 120);
  gl.addColorStop(0, 'rgba(120,150,255,0.28)'); gl.addColorStop(1, 'rgba(120,150,255,0)');
  c.fillStyle = gl; c.fillRect(0, 0, tcv.width, tcv.height);
  if (refImg.complete && refImg.naturalWidth) {
    let name = 'idle0', ox = 0, oy = 0;
    if (toss.phase === 'idle') name = 'idle' + (Math.floor(t * 5) % 4);
    else if (toss.phase === 'show') name = 'timeout';
    else if (toss.phase === 'hide') { name = 'idle' + (Math.floor(t * 12) % 4); ox = Math.round(Math.sin(t * 30) * 2); }
    else if (toss.phase === 'fists') { name = 'gameend_fist'; oy = Math.round(Math.sin(t * 4) * 1.5); }
    else if (toss.phase === 'shake') { name = 'gameend_fist'; ox = Math.round(Math.sin(t * 45) * 3); }
    else if (toss.phase === 'reveal') name = 'gameend';
    const f = REF[name];
    c.drawImage(refImg, f.x, f.y, f.w, f.h, Math.round(TV.CX - f.headCx + ox), Math.round(TV.HEAD - f.headTop + oy), f.w, f.h);
    if (toss.phase === 'show') {   // 球拿在胸前
      const [bx, by] = refPoint('timeout', REF.timeout.ball);
      drawTossBall(bx, by - Math.abs(Math.sin(t * 4)) * 3, 6);
    }
    if (toss.phase === 'reveal') {   // 打開手：球在其中一隻手上，你選的那隻手畫圈
      const [bx, by] = refPoint('gameend', tossBall === 'L' ? REF.gameend.palmL : REF.gameend.palmR);
      drawTossBall(bx, by, 7);
      const [px, py] = refPoint('gameend', toss.pick === 'L' ? REF.gameend.palmL : REF.gameend.palmR);
      c.strokeStyle = toss.pick === tossBall ? '#5ddf9a' : '#ff5b5b'; c.lineWidth = 2;
      c.beginPath(); c.arc(px, py, 19, 0, Math.PI * 2); c.stroke();
    }
  }
  drawUmpireDesk();
}

function openToss() {
  if (S.practice || BOT) { startGame(); return; }
  initAudio();
  tossBall = Math.random() < 0.5 ? 'L' : 'R';
  toss.pick = null;
  show('tossHands', true); show('tossChoice', false); show('tossGo', false);
  show('menuOv', false); show('overOv', false); show('tossOv', true);
  tossPhase('idle');
}
function pickToss(side) {
  if (toss.phase !== 'fists') return;
  toss.pick = side;
  tossPhase('shake');
}
function revealToss() {
  show('tossHands', false);
  if (toss.pick === tossBall) {
    $('tossText').textContent = '猜對了！你要先發球，還是先接發球？';
    show('tossChoice', true);
  } else {
    tossFirst = Math.random() < 0.5 ? 'ai' : 'player';
    $('tossText').textContent = '猜錯了…對手選擇' + (tossFirst === 'ai' ? '先發球。' : '先接發球，由你先發球。');
    show('tossGo', true);
  }
}
document.querySelectorAll('.hand').forEach(b => b.addEventListener('click', () => pickToss(b.dataset.h)));
tcv.addEventListener('click', e => {   // 也可以直接點畫面上的拳頭
  const r = tcv.getBoundingClientRect();
  pickToss(e.clientX - r.left < r.width / 2 ? 'L' : 'R');
});
document.querySelectorAll('#tossChoice button').forEach(b => b.addEventListener('click', () => startGame(b.dataset.f)));
$('tossGo').addEventListener('click', () => startGame(tossFirst));
$('tossBack').addEventListener('click', () => {
  toss.phase = 'off'; show('tossOv', false);
  if (S.careerMatch) { S.careerMatch = false; careerShow('round'); } else show('menuOv', true);   // 回到剛才選局數的那一步
});

$('againBtn').addEventListener('click', openToss);
$('menuBtn').addEventListener('click', toMenu);
$('quitBtn').addEventListener('click', toMenu);
// 遊戲說明：從主選單或暫停畫面打開，關掉後回到原本的畫面
let helpFrom = 'menuOv';
document.querySelectorAll('.helpBtn').forEach(b => {
  b.addEventListener('click', () => {
    helpFrom = S.mode === 'pause' ? 'pauseOv' : 'menuOv';
    show(helpFrom, false); show('helpOv', true);
    $('helpOv').scrollTop = 0;
  });
});
$('helpClose').addEventListener('click', () => { show('helpOv', false); show(helpFrom, true); });
function openPause() {
  S.mode = 'pause'; show('pauseOv', true);
  show('practiceBtn', !S.careerMatch && !S.practice);   // 直接比賽才能從這裡改成練習
  if (typeof careerPauseItems === 'function') careerPauseItems();
}
$('pause').addEventListener('click', () => { if (S.mode === 'play') openPause(); });
$('resumeBtn').addEventListener('click', () => { S.mode = 'play'; show('pauseOv', false); last = performance.now(); });
document.addEventListener('visibilitychange', () => {
  if (document.hidden && S.mode === 'play') openPause();
});
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 200));
resize();

// ---------- 主迴圈 ----------
let last = performance.now();
function frame(t) {
  const dt = Math.min(0.033, Math.max(0, (t - last) / 1000));
  last = t;
  if (S.mode === 'play') update(dt);
  setCrowd(S.mode === 'play' ? (S.practice ? 0.35 : 1) : 0);
  updateOpp(dt);
  updateToss(dt);
  if (S.mode === 'world') drawWorld(dt); else draw(dt);
  requestAnimationFrame(frame);
}
if (BOT || params.has('auto')) startGame();
requestAnimationFrame(frame);
// 測試用：?bot=1 時以固定步長快速自動對打，不依賴畫面更新
if (BOT) setInterval(() => { for (let i = 0; i < 120 && S.mode === 'play'; i++) update(1 / 60); }, 10);
