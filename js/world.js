'use strict';
// ==================== 地圖：走路、建築、路人挑戰（寶可夢式） ====================
// 地圖資料在 maps.js；存檔、球具、比賽在 career.js

const TILE = 16;
const SPEED = 4.5;   // 每秒走幾格
const DIRV = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };
const TEACHER_IDS = Object.values(WORLD_MAPS).flatMap(m => m.trainers.filter(t => t.teacher).map(t => t.id));

const mapImgs = {};   // 地圖背景圖片（assets/maps/）
function mapImg(id) {
  if (!mapImgs[id]) { mapImgs[id] = new Image(); mapImgs[id].src = WORLD_MAPS[id].img; }
  return mapImgs[id];
}
const world = {
  id: 0, m: null, x: 0, y: 0, dir: 'down', moving: false, fx: 0, fy: 0, t: 0, step: 0, turnT: 0,
  npcs: [], lock: false, dialog: null, cut: null, fade: null, flash: null, banner: 0, paused: true,
  steps: 0, bump: 0, pendingShop: false, time: 0, calm: null,
};

// ---------- 音效 ----------
const wsfx = {
  bang: playSfx(t => { tone(t, 990, 990, 0.07, 0.18, 'square'); tone(t + 0.08, 1480, 1480, 0.12, 0.18, 'square'); }),
  bump: playSfx(t => tone(t, 140, 90, 0.06, 0.12, 'triangle')),
  door: playSfx(t => noise(t, 0.12, 'bandpass', 900, 1, 0.12, 0.03)),
  heal: playSfx(t => [523, 659, 784, 1047].forEach((f, i) => tone(t + i * 0.12, f, f, 0.14, 0.15, 'triangle'))),
};

// ---------- 地圖準備：哪些格子不能走、哪裡有門 ----------
// rows 裡 '.' 可以走、其他不能走；門口和出入口一定可以走
function prepMap(id) {
  const m = WORLD_MAPS[id];
  if (m.solid) return m;
  m.solid = m.rows.map(r => [...r].map(ch => ch !== '.'));
  m.objAt = {}; m.doors = {}; m.warpAt = {};
  for (const o of m.objects) {
    for (let y = o.y; y < o.y + o.h; y++) for (let x = o.x; x < o.x + o.w; x++) m.objAt[x + ',' + y] = o;
    if (o.door) { m.doors[o.door.join(',')] = o; m.solid[o.door[1]][o.door[0]] = false; }
  }
  for (const w of m.warps) { m.warpAt[w.x + ',' + w.y] = w; m.solid[w.y][w.x] = false; }
  return m;
}
// 存檔的位置站不了（例如地圖改過）就找最近能站的格子
function freeSpot(id, x, y) {
  const m = prepMap(id);
  const ok = (a, b) => a >= 0 && b >= 0 && a < m.w && b < m.h && !m.solid[b][a];
  for (let r = 0; r < 40; r++) {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (ok(x + dx, y + dy)) return [x + dx, y + dy];
  }
  return [WORLD_SPAWN.x, WORLD_SPAWN.y];
}

function loadMap(id, x, y, dir) {
  const m = prepMap(id);
  Object.assign(world, { id, m, x, y, dir, moving: false, fx: x, fy: y, t: 0, turnT: 0, cut: null, calm: null });
  world.npcs = m.trainers.map(t => ({ type: 'trainer', d: t, x: t.x, y: t.y, dir: t.dir, sp: t.sprite, pal: palette(t.name, t.char, t) }))
    .concat(m.npcs.map(n => ({ type: 'npc', d: n, x: n.x, y: n.y, dir: n.dir, sp: n.sprite, pal: palette(n.name, n.char, n) })));
  mapImg(id);
  for (const w of m.warps) mapImg(w.to);   // 先載入隔壁地圖的圖片
  world.banner = 2.2;
  worldSavePos();
}
function worldSavePos() {
  if (save && world.m) save.pos = { map: world.id, x: world.x, y: world.y, dir: world.dir };
}
const npcAt = (x, y) => world.npcs.find(n => n.x === x && n.y === y);
function blocked(x, y) {
  const m = world.m;
  return x < 0 || y < 0 || x >= m.w || y >= m.h || m.solid[y][x] || !!npcAt(x, y);
}

// ---------- 進入 / 離開地圖模式 ----------
function worldShowUI() { show('worldUI', true); }
function worldHideUI() { show('worldUI', false); padDir = null; }
function worldEnter(isNew) {
  S.mode = 'world';
  Object.assign(world, { paused: false, lock: false, cut: null, fade: null, flash: null, dialog: null });
  const p = save.pos && WORLD_MAPS[save.pos.map] ? save.pos : WORLD_SPAWN;
  const [x, y] = freeSpot(p.map, p.x, p.y);
  loadMap(p.map, x, y, p.dir);
  show('pause', false); show('menuOv', false); careerHide(); worldShowUI();
  if (isNew) {
    worldSay(['媽媽：「早安！今天是你第一次上桌球課的日子喔！」',
      '媽媽：「學校在東邊。到了學校，走廊中間那扇門就是桌球教室。」',
      '（用左下的方向鍵走路，按 A 可以跟人說話、調查東西，右上的 ☰ 是選單）']);
  } else if (!hasRacket() && save.story.racket) {
    worldSay(['你沒有球拍了，去市區中心的商店買一支吧。']);
  }
}
function worldResume() {
  S.mode = 'world';
  Object.assign(S, { careerMatch: false, oppName: null, oppChar: null });
  Object.assign(world, { paused: false, lock: false, cut: null, flash: null });
  show('pause', false); show('tossOv', false); show('overOv', false); careerHide(); worldShowUI();
  if (world.pendingShop) { world.pendingShop = false; shopArrival(); }
}
function worldExit() {
  if (save) { worldSavePos(); writeSave(); }
  world.paused = true;
  worldHideUI();
  $('dlg').classList.add('hidden'); world.dialog = null;
}

// ---------- 對話框 ----------
function worldSay(lines, done) {
  world.dialog = { lines: lines.slice(), i: 0, done };
  $('dlgText').textContent = lines[0];
  $('dlg').classList.remove('hidden');
}
function dialogNext() {
  const d = world.dialog;
  if (!d) return;
  d.i++;
  if (d.i < d.lines.length) { $('dlgText').textContent = d.lines[d.i]; return; }
  world.dialog = null;
  $('dlg').classList.add('hidden');
  if (d.done) d.done();
}

// ---------- 更新 ----------
function updateWorld(dt) {
  world.time += dt;
  world.banner = Math.max(0, world.banner - dt);
  world.bump = Math.max(0, world.bump - dt);
  if (world.fade) { updateFade(dt); return; }
  if (world.flash) {
    world.flash.t += dt;
    if (world.flash.t > 0.7) { const n = world.flash.n; world.flash = null; beginTrainerBattle(n); }
    return;
  }
  if (world.cut) { updateCut(dt); return; }
  if (world.paused || world.dialog || world.lock) return;
  if (world.moving) {
    world.t += dt * SPEED / cellOf();
    if (world.t >= 1) { world.t = 1; arrive(); }
    if (world.moving) return;
  }
  const d = heldDir();
  if (!d) { world.turnT = 0; return; }
  if (d !== world.dir) { world.dir = d; world.turnT = 0.08; return; }
  if (world.turnT > 0) { world.turnT -= dt; return; }
  tryStep(d);
}
function tryStep(d) {
  const [dx, dy] = DIRV[d], nx = world.x + dx, ny = world.y + dy;
  if (blocked(nx, ny)) { if (!world.bump) { wsfx.bump(); world.bump = 0.35; } return; }
  Object.assign(world, { fx: world.x, fy: world.y, x: nx, y: ny, moving: true, t: 0, step: world.step ^ 1 });
}
function arrive() {
  world.moving = false; world.steps++;
  const k = world.x + ',' + world.y, m = world.m;
  const w = m.warpAt[k];
  if (w) { startWarp(w); return; }
  const door = m.doors[k];
  if (door && door.role === 'arena') { enterArena(); return; }
  if (worldCheckSight()) return;
  if (world.steps % 15 === 0) { worldSavePos(); writeSave(); }
}

// 換地圖（進出門、走到地圖邊）：畫面先變暗再變亮
function startWarp(w) { world.fade = { t: 0, w, out: true }; wsfx.door(); }
function updateFade(dt) {
  const f = world.fade;
  f.t += dt;
  if (f.out && f.t >= 0.18) {
    loadMap(f.w.to, f.w.tx, f.w.ty, f.w.dir);
    writeSave();
    f.out = false; f.t = 0;
  } else if (!f.out && f.t >= 0.18) {
    world.fade = null;
    worldCheckSight();
  }
}

// ---------- 路人：看到你就來挑戰 ----------
function teacherWins() { return TEACHER_IDS.filter(id => save.beaten[id]).length; }
function reqMet(t) {
  if (!hasRacket()) return false;
  if (t.req === 'teachers3') return teacherWins() >= 3;
  if (t.req === 'director') return !!save.beaten.boss_dir;
  return true;
}
function worldCheckSight() {
  if (!save || world.lock || world.moving || world.dialog || world.paused) return false;
  for (const n of world.npcs) {
    if (n.type !== 'trainer' || save.beaten[n.d.id] || !reqMet(n.d) || n.d.id === world.calm) continue;
    const [dx, dy] = DIRV[n.dir];
    for (let i = 1; i <= n.d.range; i++) {
      const x = n.x + dx * i, y = n.y + dy * i;
      if (x === world.x && y === world.y) { startEncounter(n); return true; }
      if (x < 0 || y < 0 || x >= world.m.w || y >= world.m.h || world.m.solid[y][x] || npcAt(x, y)) break;
    }
  }
  return false;
}
function startEncounter(n) {
  world.lock = true;
  world.cut = { n, phase: 'bang', t: 0 };
  wsfx.bang();
}
function updateCut(dt) {
  const c = world.cut, n = c.n;
  c.t += dt;
  if (c.phase === 'bang') { if (c.t > 0.75) c.phase = 'walk'; return; }
  if (n.moving) { n.t += dt * SPEED / cellOf(); if (n.t >= 1) n.moving = false; return; }
  if (Math.abs(n.x - world.x) + Math.abs(n.y - world.y) > 1) {   // 走到你面前
    const [dx, dy] = DIRV[n.dir];
    Object.assign(n, { fx: n.x, fy: n.y, x: n.x + dx, y: n.y + dy, moving: true, t: 0, step: (n.step || 0) ^ 1 });
    return;
  }
  world.cut = null;
  world.dir = OPPOSITE[n.dir];
  worldSay([`${n.d.name}：「${n.d.intro}」`], () => startTrainerBattle(n));
}
function startTrainerBattle(n) { world.lock = true; world.flash = { t: 0, n }; }
function beginTrainerBattle(n) {
  const t = n.d;
  world.calm = t.id;   // 比完之後，這個人在你離開這張地圖之前不會再衝過來（想再比可以按 A 找他）
  careerStartBattle({ kind: 'trainer', op: { name: t.name, char: t.char, style: t.style, str: t.str }, bestOf: 1, trainer: t });
}

// ---------- 按 A：說話、調查 ----------
function pressA() {
  if (world.paused) return;
  if (world.dialog) { dialogNext(); return; }
  if (world.lock || world.moving || world.fade || world.cut || world.flash) return;
  const [dx, dy] = DIRV[world.dir], fx = world.x + dx, fy = world.y + dy;
  let n = npcAt(fx, fy);
  const o = world.m.objAt[fx + ',' + fy];
  if (!n && o && o.kind === 'counter') n = npcAt(fx + dx, fy + dy);   // 隔著櫃檯說話
  if (n) { talk(n); return; }
  if (o) interactObj(o);
}
const quote = (name, lines) => lines.map(l => `${name}：「${l}」`);
function talk(n) {
  n.dir = OPPOSITE[world.dir];
  const d = n.d;
  if (n.type === 'trainer') {
    if (save.beaten[d.id]) return worldSay([`${d.name}：「${d.after}」`]);
    if (!hasRacket()) return worldSay([`${d.name}：「你沒有球拍耶，${save.story.racket ? '先去市區中心的商店買一支吧！' : '先去學校的桌球教室上課吧！'}」`]);
    if (!reqMet(d)) return worldSay([d.blocked || `${d.name}：「……」`]);
    return worldSay([`${d.name}：「${d.intro}」`], () => startTrainerBattle(n));
  }
  if (d.role === 'mom') {
    worldSavePos(); writeSave();
    return worldSay(quote(d.name, d.lines).concat(['（進度已經存檔了）']));
  }
  if (d.role === 'coach') return coachTalk();
  if (d.role === 'nurse') return nurseTalk();
  if (d.role === 'arena') return openArena(false);
  if (d.role === 'clerk') return worldSay(['店長：「歡迎光臨！要買什麼呢？」'], openShop);
  return worldSay(quote(d.name, d.lines));
}
function interactObj(o) {
  if (o.enter) return startWarp(o.enter);          // 按 A 走進去（例如門朝下的商店）
  if (o.role === 'arena') return openArena(false);
  if (o.role === 'save') { worldSavePos(); writeSave(); return worldSay([o.text || '休息一下……進度已經存檔了！']); }
  if (o.text) return worldSay([o.text]);
  if (o.locked) return worldSay([`${o.name}的門鎖著。`]);
  if (o.name) worldSay([`這裡是${o.name}。`]);
}
function coachTalk() {
  if (!save.story.racket) {
    return worldSay(['陳教練：「你就是新來的同學吧？歡迎來到桌球教室！」', '陳教練：「上課的第一件事，就是挑一支自己的球拍。」'],
      () => { world.paused = true; worldHideUI(); ui.pickStarter = null; careerShow('starter'); });
  }
  if (!hasRacket()) return worldSay(['陳教練：「你的球拍呢？壞掉了？去市區中心的商店買一支吧。」']);
  repairAll(); wsfx.heal();
  worldSay(['陳教練：「球拍拿來，我幫你保養一下。」', '……所有球拍的耐久度都恢復了！']);
}
function nurseTalk() {
  if (!save.rackets.length) return worldSay(['恢復中心的姊姊：「你身上沒有球拍喔，去隔壁的商店看看吧！」']);
  worldSay(['恢復中心的姊姊：「歡迎光臨恢復中心！我幫你把球拍修好吧！」'], () => {
    repairAll(); wsfx.heal(); worldSavePos(); writeSave();
    worldSay(['……叮叮叮♪', '恢復中心的姊姊：「球拍都修好了！歡迎再來！」']);
  });
}
function openShop() { world.paused = true; worldHideUI(); ui.shopTab = hasRacket() ? 'item' : 'racket'; ui.msg = ''; careerShow('shop'); }
function enterArena() { openArena(true); }
function openArena(fromDoor) {
  if (!save.story.principal) {
    return worldSay(['報名櫃檯 小姐：「要先在學校打敗校長，代表學校出賽，才能報名比賽喔。」'], fromDoor ? () => stepBack() : null);
  }
  if (fromDoor) stepBack(true);
  world.paused = true; worldHideUI(); ui.msg = '';
  careerShow(save.run ? 'round' : 'events');
}
function stepBack(silent) {   // 從門口退一步（面向外面）
  world.y += 1; world.fy = world.y; world.dir = 'down';
  if (!silent) worldCheckSight();
}

// 所有球拍都壞了：被送到市區中心的商店
function worldGoToShop(now) {
  loadMap(13, 6, 4, 'up');
  worldSavePos(); writeSave();
  if (now) shopArrival(); else world.pendingShop = true;
}
function shopArrival() {
  if (hasRacket()) return worldSay(['店長：「歡迎光臨！」']);
  if (save.money >= BLADES.b_basic.price) return worldSay(['店長：「你的球拍全部壞掉了啊？挑一支新的吧！」'], openShop);
  addRacket('b_practice', save.rubbers[0] || 'r_guard'); writeSave();
  worldSay(['店長：「球拍壞了，錢又不夠嗎？」', '店長：「這支練習拍先送你用吧！要加油喔！」', '得到了「練習拍」！']);
}

// ---------- 操作：虛擬方向鍵、A 鍵、鍵盤 ----------
let padDir = null, padId = null;
const keysHeld = {};
let lastKey = null;
const KEYDIR = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right' };
function heldDir() {
  if (padDir) return padDir;
  if (lastKey && keysHeld[lastKey]) return lastKey;
  return Object.keys(keysHeld).find(k => keysHeld[k]) || null;
}
const dpad = $('dpad');
function padFrom(e) {
  const r = dpad.getBoundingClientRect();
  const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
  if (Math.hypot(dx, dy) < r.width * 0.1) return null;
  return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
}
function markPad() { dpad.querySelectorAll('[data-d]').forEach(el => el.classList.toggle('on', el.dataset.d === padDir)); }
dpad.addEventListener('pointerdown', e => {
  e.preventDefault(); initAudio();
  padId = e.pointerId; dpad.setPointerCapture(e.pointerId);
  padDir = padFrom(e); markPad();
});
dpad.addEventListener('pointermove', e => { if (e.pointerId === padId) { padDir = padFrom(e); markPad(); } });
const padEnd = e => { if (e.pointerId === padId) { padDir = null; padId = null; markPad(); } };
dpad.addEventListener('pointerup', padEnd);
dpad.addEventListener('pointercancel', padEnd);
$('btnA').addEventListener('pointerdown', e => { e.preventDefault(); initAudio(); pressA(); });
$('dlg').addEventListener('pointerdown', e => { e.preventDefault(); pressA(); });
$('btnMenu').addEventListener('click', openWorldMenu);
function openWorldMenu() {
  if (world.paused || world.dialog || world.lock || world.fade || world.moving) return;
  worldSavePos(); writeSave();
  world.paused = true; worldHideUI(); ui.msg = '';
  careerShow('hub');
}
window.addEventListener('keydown', e => {
  if (S.mode !== 'world') return;
  const d = KEYDIR[e.key];
  if (d) { keysHeld[d] = true; lastKey = d; e.preventDefault(); return; }
  if (e.key === 'z' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!e.repeat) pressA(); }
  if (e.key === 'Escape' || e.key === 'm') openWorldMenu();
});
window.addEventListener('keyup', e => { const d = KEYDIR[e.key]; if (d) keysHeld[d] = false; });

// ---------- 畫面 ----------
// 地圖格子的大小（cell = 0.5 是半格地圖）：畫面上一格多大、每秒走幾格
const cellOf = () => (world.m && world.m.cell) || 1;
const CT = () => TILE * cellOf();
// 人物畫在哪裡：回傳一個 16x16 的框的左上角，人物的腳站在格子底部中間
function personPx(o) {
  const x = o.moving ? o.fx + (o.x - o.fx) * o.t : o.x, y = o.moving ? o.fy + (o.y - o.fy) * o.t : o.y;
  return { x: Math.round((x + 0.5) * CT() - 8), y: Math.round((y + 1) * CT() - 16) };
}
function drawWorld(dt) {
  updateWorld(dt);
  const m = world.m;
  if (!m) return;
  // 每格在畫面上多大：室外看得到約 10.5 格，室內盡量整個房間都看得到
  const view = m.inside ? Math.max(7, m.h * cellOf()) : 10.5;
  const k = Math.min(W, H) / (TILE * view);
  const vw = W / k, vh = H / k, mw = m.w * CT(), mh = m.h * CT();
  const p = personPx(world);
  const camX = mw <= vw ? (mw - vw) / 2 : clamp(p.x + 8 - vw / 2, 0, mw - vw);
  const camY = mh <= vh ? (mh - vh) / 2 : clamp(p.y + 8 - vh / 2, 0, mh - vh);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.fillStyle = '#05070d'; ctx.fillRect(0, 0, W, H);
  ctx.setTransform(DPR * k, 0, 0, DPR * k, -camX * DPR * k, -camY * DPR * k);
  const img = mapImg(world.id);
  if (img.complete && img.naturalWidth) {
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, mw, mw * img.naturalHeight / img.naturalWidth);   // 圖片寬度剛好對齊地圖的格數
  }
  const ents = world.npcs.map(n => Object.assign({ n }, personPx(n))).concat([Object.assign({ me: true }, p)]);
  ents.sort((a, b) => a.y - b.y);
  for (const e of ents) {
    const o = e.me ? world : e.n;
    const walking = o.moving && o.t < 0.5;
    const frame = walking ? (o.step ? 1 : 2) : 0;
    const key = e.me ? (save && save.char === 'female' ? 'player_f' : 'player_m') : o.sp;
    if (!drawSprite(ctx, e.x, e.y, o.dir, frame, key)) drawPerson(ctx, e.x, e.y, o.dir, frame, e.me ? playerPal() : o.pal);
  }
  if (world.cut && world.cut.phase === 'bang') {
    const q = personPx(world.cut.n), bob = Math.round(Math.min(1, world.cut.t * 6) * 3);
    drawBang(ctx, q.x + 8, q.y - SPRITE_H + 9 - bob);
  }
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (world.flash) {
    ctx.fillStyle = Math.floor(world.flash.t * 10) % 2 ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, W, H);
  }
  if (world.fade) {
    const a = world.fade.out ? world.fade.t / 0.18 : 1 - world.fade.t / 0.18;
    ctx.fillStyle = `rgba(0,0,0,${clamp(a, 0, 1)})`; ctx.fillRect(0, 0, W, H);
  }
  drawWorldHUD();
}
function drawWorldHUD() {
  ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  ctx.font = 'bold 15px system-ui, sans-serif';
  const txt = '💰 ' + money(save ? save.money : 0);
  const w = ctx.measureText(txt).width + 20;
  ctx.fillStyle = 'rgba(8,12,28,0.7)'; roundRect(ctx, 10, 10, w, 30, 8); ctx.fill();
  ctx.fillStyle = '#ffd166'; ctx.fillText(txt, 20, 25);
  if (world.banner > 0 && world.m) {
    ctx.globalAlpha = clamp(world.banner * 2, 0, 1);
    ctx.font = 'bold 17px system-ui, sans-serif'; ctx.textAlign = 'center';
    const bw = ctx.measureText(world.m.name).width + 40;
    ctx.fillStyle = 'rgba(8,12,28,0.8)'; roundRect(ctx, W / 2 - bw / 2, 12, bw, 34, 8); ctx.fill();
    ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.fillText(world.m.name, W / 2, 29);
    ctx.globalAlpha = 1;
  }
}
function drawBang(c, x, y) {
  c.fillStyle = '#1a1a1a'; c.fillRect(x - 5, y - 9, 10, 12);
  c.fillStyle = '#ffffff'; c.fillRect(x - 4, y - 8, 8, 10);
  c.fillStyle = '#e53935'; c.fillRect(x - 1, y - 7, 2, 5); c.fillRect(x - 1, y - 1, 2, 2);
}

// ---------- 人物：用 assets/chars.png 的走路圖（js/chars.js 記錄位置），還沒載入時用程式畫的小人 ----------
const charImg = new Image();
charImg.src = 'assets/chars.png';
const SPRITE_H = 26;   // 角色在地圖上有多高（一格是 16）
function drawSprite(c, x, y, dir, frame, key) {
  const sh = typeof CHAR_SHEETS !== 'undefined' && CHAR_SHEETS[key];
  if (!sh || !charImg.complete || !charImg.naturalWidth) return false;
  const s = SPRITE_H / CHAR_CELL.h, w = CHAR_CELL.w * s;
  c.fillStyle = 'rgba(0,0,0,0.25)';
  c.beginPath(); c.ellipse(x + 8, y + 14.5, 5.5, 2.2, 0, 0, Math.PI * 2); c.fill();
  c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
  const col = frame === 0 ? 1 : frame === 1 ? 0 : 2;   // 原圖中間那格是站姿，左右兩格是跨步
  c.drawImage(charImg, sh.x + col * CHAR_CELL.w, sh.y + sh.dirs[dir] * CHAR_CELL.h, CHAR_CELL.w, CHAR_CELL.h,
    x + 8 - w / 2, y + 16 - SPRITE_H + 1, w, SPRITE_H);
  return true;
}

const PAL_HAIR = ['#3a2416', '#5a3418', '#1d1d1d', '#7a4a24', '#2a1f3a'];
const PAL_SHIRT = ['#d94a3d', '#3a7be0', '#f2c14e', '#4bbf73', '#8e5bd6', '#f08a3c', '#56c2e6', '#e85d9e'];
function palette(name, char, d) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) | 0;
  h = Math.abs(h);
  const p = { hair: PAL_HAIR[h % PAL_HAIR.length], shirt: PAL_SHIRT[(h >> 3) % PAL_SHIRT.length], pants: '#2a3048',
    skin: ['#f1c39b', '#e6b08a', '#f6d0ae'][(h >> 6) % 3], female: char === 'female', cap: null };
  if (/阿伯|阿嬤|校長|主任|老師|教練/.test(name)) p.hair = /阿嬤|阿伯/.test(name) ? '#cfcfcf' : '#2a2a2a';
  if (/老師|主任/.test(name)) p.shirt = '#6a7f99';
  if (/校長/.test(name)) { p.shirt = '#4a4f5a'; p.pants = '#3a3f4a'; }
  if (/教練/.test(name)) { p.shirt = '#2a4fb5'; p.pants = '#2a4fb5'; }
  if (d && d.role === 'nurse') { p.shirt = '#f48fb1'; p.cap = '#ffffff'; }
  if (d && d.role === 'clerk') p.shirt = '#3aa35a';
  if (/外送|警衛/.test(name)) p.cap = /外送/.test(name) ? '#e53935' : '#2a3a6a';
  if (/阿翔/.test(name)) { p.shirt = '#e8562a'; p.hair = '#1d1d1d'; }
  return p;
}
function playerPal() {
  return save && save.char === 'female'
    ? { hair: '#5a3418', shirt: '#b52a35', pants: '#1a1d2b', skin: '#f1c39b', female: true }
    : { hair: '#4a2e1a', shirt: '#1f4fb5', pants: '#1a1d2b', skin: '#f1c39b', female: false };
}
function drawPerson(c, x, y, dir, frame, p) {
  const R = (dx, dy, w, h, col) => { c.fillStyle = col; c.fillRect(x + dx, y + dy, w, h); };
  const by = frame ? -1 : 0, ol = '#1b1420';
  c.fillStyle = 'rgba(0,0,0,0.25)'; c.beginPath(); c.ellipse(x + 8, y + 14, 6, 2.5, 0, 0, Math.PI * 2); c.fill();
  // 腳
  const lu = frame === 1 ? -1 : 0, ru = frame === 2 ? -1 : 0;
  if (dir === 'left' || dir === 'right') {
    R(5, 10 + lu + by, 3, 4, p.pants); R(8, 10 + ru + by, 3, 4, p.pants);
    R(5, 13 + lu, 3, 2, ol); R(8, 13 + ru, 3, 2, ol);
  } else {
    R(4, 10 + by, 3, 4 + lu, p.pants); R(9, 10 + by, 3, 4 + ru, p.pants);
    R(4, 13 + lu, 3, 2, ol); R(9, 13 + ru, 3, 2, ol);
  }
  // 身體
  const yb = by;
  R(3, 2 + yb, 10, 9, ol); R(4, 3 + yb, 8, 7, p.shirt);
  R(4, 8 + yb, 8, 2, shade(p.shirt));
  if (dir === 'left' || dir === 'right') {
    const ax = dir === 'left' ? 9 : 5;
    R(ax, 4 + yb, 2, 5, shade(p.shirt)); R(ax, 9 + yb, 2, 1, p.skin);
  } else {
    R(2, 4 + yb, 2, 5, p.shirt); R(12, 4 + yb, 2, 5, p.shirt);
    R(2, 9 + yb, 2, 1, p.skin); R(12, 9 + yb, 2, 1, p.skin);
  }
  // 頭
  const hy = -7 + yb;
  R(3, hy - 1, 10, 10, ol);
  R(4, hy, 8, 8, p.skin);
  if (dir === 'up') {
    R(4, hy, 8, 8, p.hair);
    if (p.female) R(7, hy + 6, 2, 5, p.hair);
  } else if (dir === 'down') {
    R(4, hy, 8, 3, p.hair); R(4, hy + 3, 1, 3, p.hair); R(11, hy + 3, 1, 3, p.hair);
    R(5, hy + 4, 1, 2, ol); R(10, hy + 4, 1, 2, ol);
    if (p.female) { R(12, hy + 2, 2, 5, p.hair); R(2, hy + 2, 2, 5, p.hair); }
  } else {
    const f = dir === 'left';
    R(4, hy, 8, 3, p.hair);
    R(f ? 8 : 4, hy + 3, 4, 4, p.hair);
    R(f ? 5 : 10, hy + 4, 1, 2, ol);
    if (p.female) R(f ? 11 : 2, hy + 2, 3, 5, p.hair);
  }
  if (p.cap) { R(3, hy - 1, 10, 3, p.cap); if (dir === 'down') R(4, hy + 2, 8, 1, shade(p.cap)); }
}
function shade(hex) {
  const n = parseInt(hex.slice(1), 16);
  const f = v => Math.max(0, Math.round(v * 0.75)).toString(16).padStart(2, '0');
  return '#' + f(n >> 16) + f((n >> 8) & 255) + f(n & 255);
}
