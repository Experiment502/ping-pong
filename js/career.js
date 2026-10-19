'use strict';
// ==================== 冠軍之路（生涯模式）：存檔、球具、比賽 ====================
// 會用到 game.js 的 S、DIFF、GEAR、openToss、startGame、show、$、crowd；地圖部分在 world.js

const SAVE_KEY = 'fingertipPong.career.v1';

// ---------- 球具：數據照 JOOLA 官網的規格表（名稱是自創的，註解是對應的型號） ----------
// 底板 https://joola.tw/blade-specifications/ ：速度、控制度、精準性、硬度、彈性度（1～5 分）
// 膠皮 https://joola.tw/rubber-specifications/ ：速度（3～11）、旋轉（5～11）、彈道（3.5～10）、精準性（4～10.5）、硬度
// 等級照 JOOLA：入門（Progressive）→ 性能（Performance）→ 職業（Professional）→ 頂級（Premium），特殊（Precision）跟性能一起開放
// 價格、耐久度（dur）表上沒有，照等級訂；next 是「強化」可以升級成哪一款（同系列）
const GEAR_TIERS = {
  prog: { name: '入門', open: () => true },
  perf: { name: '性能', open: () => save.story.principal, lock: '打敗校長後開放' },
  prec: { name: '特殊', open: () => save.story.principal, lock: '打敗校長後開放' },
  pro:  { name: '職業', open: () => save.unlocked >= 1, lock: '開放地區比賽後' },
  prem: { name: '頂級', open: () => save.unlocked >= 2, lock: '開放全國比賽後' },
};
// 強化的價錢：新款的價錢扣掉舊款六成（最少 100）
const upCost = (from, to) => Math.max(100, Math.round((to.price - from.price * 0.6) / 10) * 10);
const BLADES = {
  // 入門
  b_sprout_all:    { name: '新芽·全能', tier: 'prog', spd: 2, ctl: 4, acc: 3.5, hard: 2.5, flex: 3.5, ply: '5 層純木', dur: 70, price: 250, next: ['b_classic_all'], desc: '最便宜的入門底板，好控制' },        // Challenger All
  b_sprout_off:    { name: '新芽·攻擊', tier: 'prog', spd: 3, ctl: 4, acc: 3.5, hard: 3, flex: 3, ply: 'Limba 面材', dur: 70, price: 400, next: ['b_classic_off'], desc: '入門攻擊型，速度和控制兼顧' },          // Challenger Off
  b_sprout_carbon: { name: '新芽·碳', tier: 'prog', spd: 4, ctl: 2.5, acc: 2.5, hard: 4.5, flex: 1.5, ply: '3K 碳纖維', dur: 60, price: 600, next: ['b_classic_carbon'], desc: '加了碳纖維，入門裡最快的' },     // Challenger Carbon
  b_practice:      { name: '練習拍', tier: 'prog', spd: 2, ctl: 4, acc: 4, hard: 2.5, flex: 3.5, ply: '5 層純木', dur: 40, price: 0, hidden: true, desc: '商店老闆送的練習用球拍' },  // Challenger All Jr.
  // 性能
  b_classic_all:    { name: '經典·全能', tier: 'perf', spd: 2, ctl: 5, acc: 4.5, hard: 2, flex: 4, ply: 'Koto 面材．5 層純木', dur: 100, price: 900, next: ['b_hinoki5'], desc: '控制滿分，削球、防守最穩' },          // Classic All
  b_classic_off:    { name: '經典·攻擊', tier: 'perf', spd: 3.5, ctl: 4, acc: 4, hard: 3, flex: 3.5, ply: 'Koto 面材．5 層純木', dur: 100, price: 1100, next: ['b_hinoki_carbon'], desc: 'Koto 面材質地硬，適合拉上旋' },  // Classic Off
  b_classic_carbon: { name: '經典·碳', tier: 'perf', spd: 4, ctl: 2.5, acc: 3, hard: 4.5, flex: 1.5, ply: 'Koto 面材．3K 碳纖維', dur: 90, price: 1400, next: ['b_light_carbon'], desc: '碳纖維底板，球速快、手感硬' },  // Classic Carbon
  // 特殊
  b_wall: { name: '鐵壁', tier: 'prec', spd: 1.5, ctl: 5, acc: 4.5, hard: 2, flex: 4, ply: '大拍面．防守專用', dur: 120, price: 1200, desc: '拍面特別大的防守底板，適合配長顆粒膠' },   // CWX Defender
  // 職業
  b_hinoki5:       { name: '檜木五夾', tier: 'pro', spd: 3, ctl: 4.5, acc: 4.5, hard: 3, flex: 2.5, ply: 'Hinoki 面材．5 層純木', dur: 130, price: 3000, next: ['b_hinoki_pbo'], desc: 'Hinoki 軟中帶彈，吃球深、好製造旋轉' },  // Xylo 5
  b_hinoki_carbon: { name: '檜心·碳', tier: 'pro', spd: 4, ctl: 4.5, acc: 4, hard: 3.5, flex: 2, ply: 'Hinoki 面材．3K 碳纖維', dur: 130, price: 4000, next: ['b_trio'], desc: '碳纖維的速度，加上 Hinoki 的手感' },     // Rossi Emotion
  b_light_carbon:  { name: '輕碳·疾', tier: 'pro', spd: 5, ctl: 3.5, acc: 3.5, hard: 4, flex: 2, ply: 'Hinoki 面材．KL 碳纖維', dur: 120, price: 4500, next: ['b_aurora'], desc: '重量輕的碳纖維，速度滿分' },          // Santoru KL-C Inner
  // 頂級
  b_hinoki_pbo: { name: '檜韻 PBO', tier: 'prem', spd: 4, ctl: 4.5, acc: 4, hard: 3, flex: 2, ply: 'Hinoki 面材．PBO 碳纖維', dur: 170, price: 9000, desc: 'PBO 纖維甜區大，手感柔軟' },               // Nobilis PBO-C
  b_trio:       { name: '三重奏 X3', tier: 'prem', spd: 4, ctl: 4.5, acc: 5, hard: 3.5, flex: 2.5, ply: 'Limba 面材．X3 複合纖維', dur: 170, price: 12000, desc: '兩種纖維交錯編織，精準度滿分' },        // Vyzaryz Trinity
  b_aurora:     { name: '極光 PBO', tier: 'prem', spd: 5, ctl: 4.5, acc: 4.5, hard: 3, flex: 2.5, ply: 'Koto 面材．超級 PBO 纖維', dur: 180, price: 15000, desc: '速度和控制都頂尖的冠軍底板' },      // Vyzaryz Hybrid
};
const RUBBERS = {
  // 入門
  r_vigor:     { name: '元氣', tier: 'prog', spd: 5, spin: 7.5, arc: 7.5, acc: 8, hard: '中', price: 300, next: ['r_vigor450'], desc: '入門裡最快的膠皮，各方面平均' },        // Energy
  r_feather:   { name: '輕羽', tier: 'prog', spd: 3.5, spin: 7, arc: 7.5, acc: 8.5, hard: '軟', price: 300, next: ['r_feather_p'], desc: '軟海綿，好控制、不容易失誤' },        // Samba
  r_feather_p: { name: '輕羽＋', tier: 'prog', spd: 4, spin: 7.5, arc: 9.5, acc: 9, hard: '軟', price: 500, next: ['r_feather_ice'], desc: '彈道很高，過網很安全' },               // Samba+
  // 性能
  r_vigor450:   { name: '元氣 450', tier: 'perf', spd: 7, spin: 7.5, arc: 7.5, acc: 7.5, hard: '中', price: 900, next: ['r_vigor48'], desc: '速度加快，彈道和控制還是很平均' },     // Maxxx 450
  r_feather_ice: { name: '輕羽·冰', tier: 'perf', spd: 6, spin: 9, arc: 8.5, acc: 9, hard: '軟+', price: 1200, next: ['r_feather_max'], desc: '軟中帶旋轉，控制和旋轉都好' },  // Rhyzen Ice
  r_whirl:      { name: '旋風', tier: 'perf', spd: 6, spin: 8.5, arc: 7.5, acc: 8, hard: '中', price: 900, next: ['r_whirl_fire'], desc: '摩擦力強，容易製造旋轉' },             // Rhyzen CMD
  r_whirl_fire: { name: '旋風·火', tier: 'perf', spd: 8, spin: 9, arc: 6.5, acc: 8.5, hard: '中+', price: 1500, next: ['r_whirl_zg'], desc: '旋轉加上速度的攻擊膠皮' },     // Rhyzen Fire
  r_blast:      { name: '爆裂', tier: 'perf', spd: 7.5, spin: 7.5, arc: 4.5, acc: 4, hard: '硬', price: 800, next: ['r_blast500'], desc: '硬海綿球速快，但彈道低、不好控制' },   // X-Plode
  r_blast500:   { name: '爆裂 500', tier: 'perf', spd: 8.5, spin: 7.5, arc: 5, acc: 5, hard: '硬+', price: 1300, next: ['r_blast_pro'], desc: '超硬海綿，速度更快' },          // Maxxx 500
  // 特殊
  r_spike:   { name: '刺蝟（長顆粒）', tier: 'prec', type: 'long', spd: 3, spin: 9, arc: 6, acc: 9, hard: '硬', price: 1000, desc: '長顆粒膠：自己不太能製造旋轉，但會把對手的旋轉反轉回去' },  // CWX
  r_gold_soft: { name: '金弦·柔', tier: 'prec', spd: 7, spin: 9, arc: 8.5, acc: 8.5, hard: '軟', price: 1200, next: ['r_gold_ps'], desc: '高摩擦膠面加軟海綿，旋轉強又好控制' },  // Tango Ultra
  // 職業
  r_vigor48:  { name: '元氣 48', tier: 'pro', spd: 8.5, spin: 9, arc: 7.5, acc: 9, hard: '中+', price: 3000, next: ['r_vigor_max'], desc: '職業選手愛用的平均型膠皮' },          // Rhyzer 48
  r_whirl_zg: { name: '旋風 ZG', tier: 'pro', spd: 8.5, spin: 11, arc: 7, acc: 8.5, hard: '硬+', price: 3500, next: ['r_whirl_max'], desc: '旋轉滿分，超硬海綿撐住強力摩擦' },   // Rhyzen ZGR
  r_gold_ps:  { name: '金弦 PS', tier: 'pro', spd: 8, spin: 10, arc: 7.5, acc: 8.5, hard: '硬', price: 3000, next: ['r_gold'], desc: '高摩擦膠面，旋轉和速度兼顧' },             // Golden Tango PS
  r_gold:     { name: '金弦', tier: 'pro', spd: 7, spin: 11, arc: 6, acc: 8, hard: '硬', price: 3800, desc: '最強摩擦的膠面，旋轉滿分' },                                       // Golden Tango
  r_blast_pro: { name: '爆裂 Pro', tier: 'pro', spd: 9.5, spin: 9, arc: 3.5, acc: 7, hard: '硬', price: 3500, next: ['r_blast_max'], desc: '彈道很低、很平，球又快又直' },   // Rhyzer Pro 50
  // 頂級
  r_vigor_max:   { name: '元氣·極', tier: 'prem', spd: 10, spin: 10, arc: 7.5, acc: 10.5, hard: '中+', price: 9000, desc: '頂級全能膠皮，速度、旋轉、精準都頂尖' },  // Dynaryz ACC
  r_feather_max: { name: '輕羽·極', tier: 'prem', spd: 8, spin: 10, arc: 8.5, acc: 10.5, hard: '中', price: 8000, desc: '頂級控制型膠皮，精準度最高' },              // Dynaryz CMD
  r_whirl_max:   { name: '旋風·極', tier: 'prem', spd: 10, spin: 10.5, arc: 7.5, acc: 10, hard: '硬', price: 9500, desc: '頂級旋轉膠皮，旋轉和速度都頂尖' },           // Dynaryz ZGR
  r_blast_max:   { name: '爆裂·極', tier: 'prem', spd: 11, spin: 10, arc: 5.5, acc: 8, hard: '硬', price: 10000, desc: '速度最快的膠皮，世界頂尖的攻擊力' },          // Dynaryz AGR
};
const ITEMS = {
  tape: { name: '修補膠帶', heal: 30, price: 80, desc: '比賽中也能用，球拍耐久 +30' },
  kit:  { name: '球拍保養組', heal: 80, price: 250, desc: '比賽中也能用，球拍耐久 +80' },
};
const STARTERS = [
  { name: '速度型', blade: 'b_sprout_carbon', rubber: 'r_blast', desc: '碳纖維底板加上硬海綿膠皮。球速最快，但彈道低、容易掛網，落點也不穩。' },
  { name: '控制型', blade: 'b_sprout_all', rubber: 'r_feather', desc: '純木底板加上軟海綿。球比較慢，但落點穩、不容易失誤，最適合新手。' },
  { name: '旋轉型', blade: 'b_sprout_off', rubber: 'r_whirl', desc: '摩擦力強的膠皮，打出的拉球、切球更難接。' },
];
// 舊版存檔的球具換成新的
const OLD_GEAR = {
  b_gale: 'b_sprout_carbon', b_guard: 'b_sprout_all', b_whirl: 'b_sprout_off', b_basic: 'b_sprout_all', b_wood: 'b_classic_all',
  b_carbon: 'b_classic_carbon', b_alc: 'b_hinoki_carbon', b_pro: 'b_aurora',
  r_gale: 'r_vigor', r_guard: 'r_feather', r_tacky: 'r_gold_soft', r_tension: 'r_blast', r_balance: 'r_vigor48', r_pro: 'r_vigor_max',
};

// 換算成遊戲的 1～10 分（5 是標準）
const HARDNESS = ['軟', '軟+', '中', '中+', '硬', '硬+'];
const lin = (v, a, b) => 1 + (v - a) * 9 / (b - a);   // 表上 a～b 換成 1～10
function bladeScore(b) { return { spd: b.spd * 2, ctl: b.ctl * 2, sweet: b.acc * 2, flex: b.flex * 2 }; }
function rubberScore(u) { return { spd: lin(u.spd, 3, 11), spin: lin(u.spin, 5, 11), arc: lin(u.arc, 3.5, 10), ctl: lin(u.acc, 4, 10.5) }; }
// 球拍的數值：速度看底板和膠皮、旋轉看膠皮（底板彈性好的吃球深，加一點）、控制看底板控制度和膠皮精準性、甜區看底板精準性
function gearStats(r) {
  const b = bladeScore(BLADES[r.blade]), u = rubberScore(RUBBERS[r.rubber]);
  return { spd: (b.spd + u.spd) / 2, spin: u.spin * 0.8 + b.flex * 0.2, ctl: (b.ctl + u.ctl) / 2, sweet: b.sweet, arc: u.arc,
    hard: HARDNESS.indexOf(RUBBERS[r.rubber].hard), long: RUBBERS[r.rubber].type === 'long' };
}
// 換成比賽裡的效果（給 game.js 的 GEAR）
function gearMods(st) {
  return {
    T: 1 - 0.03 * (st.spd - 5),            // 速度：球飛得比較快
    pow: 1 + 0.06 * (st.spd - 5) - 0.015 * (st.arc - 5),   // 速度：對手比較難接；彈道高的球比較好接
    spin: 1 + 0.07 * (st.spin - 5),        // 旋轉：打出的旋轉更強
    err: Math.max(0.5, 1 - 0.07 * (st.ctl - 5)),   // 控制：落點偏差、掛網比較少
    radius: 1 + 0.035 * (st.sweet - 5),    // 甜區：擊球判定範圍
    perfect: 1 + 0.08 * (st.sweet - 5),    // 甜區：PERFECT 的範圍
    net: Math.max(0.6, 1 - 0.05 * (st.arc - 5)),   // 彈道：彈道高比較不會掛網
    clear: 0.004 * (st.arc - 5),           // 彈道：過網高度
    recv: 0.85 + 0.05 * st.hard,           // 硬度：軟海綿接旋轉球比較不受影響，硬的反之
    long: st.long,                         // 長顆粒：把對手的旋轉反轉回去
  };
}

// ---------- 對手打法：決定各種球路出現的機率 ----------
const STYLES = {
  allround:  { name: '全能型', tip: '各種球路都會打，穩穩接就好。', p: { lob: 0.06, short: 0.08, loop: 0.08, chop: 0.08, side: 0.06 } },
  chopper:   { name: '削球手', tip: '很會切下旋（藍色殘影），要往上撈或往下切回去。', p: { lob: 0.03, short: 0.18, loop: 0.02, chop: 0.40, side: 0.03 } },
  looper:    { name: '拉球手', tip: '愛拉強烈上旋（橘紅殘影），橫向平著打最穩。', p: { lob: 0.02, short: 0.05, loop: 0.40, chop: 0.03, side: 0.05 }, speed: 0.92 },
  lobber:    { name: '高球手', tip: '一直放高球，等球落下來再打。', p: { lob: 0.40, short: 0.05, loop: 0.05, chop: 0.05, side: 0.03 } },
  spinner:   { name: '側旋怪', tip: '側旋很多（綠色殘影），瞄準時往反方向修正。', p: { lob: 0.04, short: 0.06, loop: 0.06, chop: 0.06, side: 0.38 } },
  speedster: { name: '快攻手', tip: '球速很快，手指要提早準備。', p: { lob: 0.02, short: 0.06, loop: 0.12, chop: 0.03, side: 0.04 }, speed: 0.82 },
};

// ---------- 賽事（在市區中心的市立體育館報名）：每一級的關鍵賽奪冠，就解鎖下一級 ----------
const op = (name, char, style, str) => ({ name, char, style, str });
const EVENT_TIERS = [
  { name: '校際賽', events: [
    { id: 'c1', name: '校際友誼賽', fee: 0, prize: 300, second: 100, bestOf: 1,
      ops: [op('大同國小 阿明', 'male', 'allround', 0.10), op('和平國小 小琪', 'female', 'lobber', 0.15)] },
    { id: 'c2', name: '校際盃', fee: 50, prize: 600, second: 200, bestOf: 1, key: true,
      ops: [op('中山國小 小美', 'female', 'allround', 0.20), op('信義國小 阿凱', 'male', 'chopper', 0.26), op('仁愛國小 阿哲', 'male', 'looper', 0.33)] },
  ] },
  { name: '地區比賽', events: [
    { id: 't1', name: '市長盃', fee: 150, prize: 1500, second: 500, bestOf: 1,
      ops: [op('新竹代表 張同學', 'male', 'speedster', 0.35), op('台中代表 李同學', 'female', 'spinner', 0.40), op('彰化代表 黃隊長', 'male', 'allround', 0.46)] },
    { id: 't2', name: '區域錦標賽', fee: 300, prize: 3000, second: 1000, bestOf: 1, key: true,
      ops: [op('吳學姊', 'female', 'chopper', 0.44), op('蔡選手', 'male', 'looper', 0.50), op('周大俠', 'male', 'speedster', 0.56)] },
  ] },
  { name: '全國比賽', events: [
    { id: 'n1', name: '全國公開賽', fee: 600, prize: 6000, second: 2000, bestOf: 3,
      ops: [op('劉國手', 'male', 'spinner', 0.58), op('許選手', 'female', 'looper', 0.64), op('鄭隊長', 'male', 'chopper', 0.70)] },
    { id: 'n2', name: '全國錦標賽', fee: 1000, prize: 10000, second: 3500, bestOf: 3, key: true,
      ops: [op('謝選手', 'female', 'speedster', 0.69), op('楊教頭', 'male', 'lobber', 0.75), op('江天王', 'male', 'allround', 0.80)] },
  ] },
  { name: '亞洲區比賽', events: [
    { id: 'i1', name: '亞洲青少年盃', fee: 2000, prize: 20000, second: 7000, bestOf: 3,
      ops: [op('佐藤（日本）', 'male', 'looper', 0.77), op('金敏智（韓國）', 'female', 'speedster', 0.83), op('陳龍（中國）', 'male', 'allround', 0.88)] },
    { id: 'i2', name: '亞洲錦標賽', fee: 4000, prize: 50000, second: 15000, bestOf: 3, key: true,
      ops: [op('拉吉（印度）', 'male', 'spinner', 0.86), op('美咲（日本）', 'female', 'chopper', 0.91), op('王浩（中國）', 'male', 'allround', 0.96)] },
  ] },
];

// 主選單選的難度會調整所有對手的強度：簡單變弱、困難變強
const CAREER_LEVEL = { easy: t => t * 0.7, normal: t => t, hard: t => t + (1 - t) * 0.4 };

// 對手的強度在「簡單」和「困難」之間內插，打法決定球路
function buildAI(o) {
  const lvl = CAREER_LEVEL[menuSnapshot && menuSnapshot.diff] || CAREER_LEVEL.normal;
  const e = DIFF.easy, h = DIFF.hard, t = lvl(o.str), st = STYLES[o.style];
  const L = (a, b) => a + (b - a) * t;
  return {
    label: o.name, T: L(e.T, h.T) * (st.speed || 1), aimX: L(e.aimX, h.aimX), aiSpeed: L(e.aiSpeed, h.aiSpeed),
    react: L(e.react, h.react), miss: L(e.miss, h.miss), missPow: L(e.missPow, h.missPow), spinMiss: L(e.spinMiss, h.spinMiss),
    p: Object.assign({}, st.p, { edge: L(e.p.edge, h.p.edge), cord: L(e.p.cord, h.p.cord), err: L(e.p.err, h.p.err) }),
  };
}

// ---------- 存檔（存在這支手機的瀏覽器裡） ----------
let save = null;
function newSave(char) {
  return { v: 3, char, money: 200, rackets: [], racket: 0, rubbers: [], items: { tape: 0, kit: 0 },
    unlocked: 0, cleared: {}, wins: 0, losses: 0, titles: 0, earned: 0, run: null, champion: false,
    story: { racket: false, principal: false }, beaten: {}, pos: Object.assign({}, WORLD_SPAWN), mapv: WORLD_MAP_VERSION };
}
function loadSave() {
  let s = null;
  try { const t = localStorage.getItem(SAVE_KEY); s = t ? JSON.parse(t) : null; } catch (e) { s = null; }
  const up = id => OLD_GEAR[id] || id;
  if (s && (s.v || 1) < 2) {   // 第一版（只有選單）的存檔：球具換成球拍，劇情當作已經完成
    s.rackets = (s.blades || []).map(b => ({ blade: up(b), rubber: up(s.rubber), dur: BLADES[up(b)] ? BLADES[up(b)].dur : 60 }))
      .filter(r => BLADES[r.blade] && RUBBERS[r.rubber]);
    s.racket = Math.max(0, (s.blades || []).indexOf(s.blade));
    s.items = { tape: 0, kit: 0 };
    s.story = { racket: s.rackets.length > 0, principal: true };
    s.beaten = {}; s.pos = Object.assign({}, WORLD_SPAWN); s.v = 2;
    delete s.blades; delete s.blade; delete s.rubber;
  }
  if (s && s.v < 3) {   // 第二版：球具換成照 JOOLA 數據的新款
    s.rackets = s.rackets.map(r => ({ blade: up(r.blade), rubber: up(r.rubber), dur: r.dur })).filter(r => BLADES[r.blade] && RUBBERS[r.rubber]);
    for (const r of s.rackets) r.dur = Math.min(r.dur, BLADES[r.blade].dur);
    s.rubbers = [...new Set(s.rubbers.map(up))].filter(id => RUBBERS[id]);
    s.racket = Math.min(s.racket, Math.max(0, s.rackets.length - 1));
    s.v = 3;
  }
  return s;
}
function writeSave() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* 無痕模式等存不了就算了 */ } }

// ---------- 球拍與耐久度 ----------
const curRacket = () => (save && save.rackets.length ? save.rackets[Math.min(save.racket, save.rackets.length - 1)] : null);
const hasRacket = () => !!curRacket();
const maxDur = r => BLADES[r.blade].dur;
const racketName = r => `${BLADES[r.blade].name} ＋ ${RUBBERS[r.rubber].name}`;
function applyGear() { const r = curRacket(); GEAR = r ? gearMods(gearStats(r)) : NEUTRAL_GEAR; }
function repairAll() { for (const r of save.rackets) r.dur = maxDur(r); writeSave(); }
function addRacket(blade, rubber) {
  save.rackets.push({ blade, rubber, dur: BLADES[blade].dur });
  save.racket = save.rackets.length - 1;
  if (!save.rubbers.includes(rubber)) save.rubbers.push(rubber);
}

// 比賽中每一分都會磨損球拍（失分磨損比較多）；回傳 true 表示所有球拍都壞了，這場直接輸
function careerOnPoint(winner) {
  const r = curRacket();
  if (!r) return true;
  r.dur -= winner === 'player' ? 1 : 2;
  if (r.dur > 0) return false;
  const name = BLADES[r.blade].name;
  save.rackets.splice(save.rackets.indexOf(r), 1);
  if (!save.rackets.length) { showMsg('球拍壞掉了！', '沒有球拍可以換了…', '#ff6b6b', 2); return true; }
  save.racket = save.rackets.reduce((best, x, i, a) => (x.dur > a[best].dur ? i : best), 0);
  applyGear();
  showMsg(`${name} 壞掉了！`, '換上 ' + BLADES[curRacket().blade].name, '#ffb347', 1.8);
  return false;
}
// 比賽畫面左上角顯示目前球拍的耐久度
function careerHudInfo() {
  const r = curRacket();
  return r ? { name: BLADES[r.blade].name, dur: Math.max(0, r.dur), max: maxDur(r) } : null;
}
// 暫停選單裡的「修理道具」按鈕
function careerPauseItems() {
  const box = $('pauseItems');
  if (!S.careerMatch || !save) { box.innerHTML = ''; return; }
  const r = curRacket();
  box.innerHTML = Object.entries(ITEMS).map(([id, it]) =>
    `<button data-item="${id}"${save.items[id] && r && r.dur < maxDur(r) ? '' : ' disabled'}>🧰 ${it.name} ×${save.items[id]}（+${it.heal}）</button>`).join('')
    + (r ? `<div class="sub">目前球拍：${BLADES[r.blade].name}　耐久 ${r.dur} / ${maxDur(r)}</div>` : '');
}
$('pauseItems').addEventListener('click', e => {
  const b = e.target.closest('[data-item]');
  if (!b || b.disabled) return;
  useItem(b.dataset.item);
  careerPauseItems();
});
function useItem(id) {
  const r = curRacket();
  if (!r || !save.items[id]) return false;
  save.items[id]--;
  r.dur = Math.min(maxDur(r), r.dur + ITEMS[id].heal);
  writeSave();
  return true;
}

// ---------- 畫面狀態與共用小工具 ----------
const ui = { view: 'hub', pickStarter: null, shopTab: 'racket', evT: 0, evE: 0, result: null, confirmReset: false, msg: '' };
let menuSnapshot = null;   // 進入生涯前主選單的設定，離開時還原

const money = n => '$' + Number(n).toLocaleString();
const stars = s => { const n = Math.max(1, Math.min(5, Math.round(1 + s * 4))); return '★'.repeat(n) + '☆'.repeat(5 - n); };
const portrait = c => `assets/${c}_portrait.png`;
function bars(rows) {
  return rows.map(([k, v]) => `<div class="stat"><span>${k}</span><i><b style="width:${v * 10}%"></b></i><span>${Number.isInteger(v) ? v : v.toFixed(1)}</span></div>`).join('');
}
// 長條是換算後的遊戲分數（1～10），下面一行是規格表上的原始數字
const tierTag = x => `<span class="tag">${GEAR_TIERS[x.tier].name}</span>`;
const bladeBars = b => { const sc = bladeScore(b); return bars([['速度', sc.spd], ['控制', sc.ctl], ['甜區', sc.sweet], ['彈性', sc.flex]])
  + `<div class="sub spec">規格（1～5）：速度 ${b.spd}．控制 ${b.ctl}．精準 ${b.acc}．硬度 ${b.hard}．彈性 ${b.flex}．${b.ply}</div>`; };
const rubberBars = u => { const sc = rubberScore(u); return bars([['速度', sc.spd], ['旋轉', sc.spin], ['彈道', sc.arc], ['控制', sc.ctl]])
  + `<div class="sub spec">規格：速度 ${u.spd}．旋轉 ${u.spin}．彈道 ${u.arc}．精準 ${u.acc}．硬度 ${u.hard}${u.type === 'long' ? '．長顆粒' : ''}</div>`; };
const racketBars = r => { const st = gearStats(r); return bars([['速度', st.spd], ['旋轉', st.spin], ['控制', st.ctl], ['甜區', st.sweet], ['彈道', st.arc]]); };
const durBar = r => `<div class="stat dur"><span>耐久</span><i><b style="width:${100 * r.dur / maxDur(r)}%"></b></i><span>${r.dur}/${maxDur(r)}</span></div>`;
const curEvent = () => EVENT_TIERS[save.run.t].events[save.run.e];
const roundName = (ev, i) => (i === ev.ops.length - 1 ? '決賽' : `第 ${i + 1} 輪`);
const formatName = n => (n === 1 ? '1 局 11 分' : n === 3 ? '三戰兩勝' : n === 5 ? '五戰三勝' : `${n} 局`);
const itemsText = () => Object.entries(ITEMS).map(([id, it]) => `${it.name} ×${save.items[id]}`).join('．');

// ---------- 各個畫面 ----------
const VIEWS = {
  intro() {   // 角色在主選單已經選好了
    return `<h1>🏆 冠軍之路</h1>
      <p class="lead">你是光明國小的學生。今天，是你第一次上桌球課的日子……<br>從學校開始，一路打到地區、全國、亞洲，成為真正的球王！</p>
      <div class="cards chars2"><div class="card pick"><img src="${portrait(S.char)}" alt=""><h3>${S.char === 'male' ? '男生' : '女生'}</h3></div></div>
      <div class="cbtns"><button class="main" data-act="begin">開始故事</button>
      <button data-act="exit">返回</button></div>`;
  },

  starter() {
    const starters = STARTERS.map((st, i) => {
      const r = { blade: st.blade, rubber: st.rubber, dur: BLADES[st.blade].dur };
      return `<button class="card${ui.pickStarter === i ? ' sel' : ''}" data-act="pickStarter" data-arg="${i}">
        <h3>${st.name}</h3><div class="sub">${racketName(r)}</div>${racketBars(r)}${durBar(r)}<div class="sub">${st.desc}</div></button>`;
    }).join('');
    return `<h1>🏓 選擇你的第一支球拍</h1>
      <p class="lead">陳教練：「這三支球拍，挑一支你喜歡的吧！」</p>
      <div class="cards">${starters}</div>
      <div class="cbtns"><button class="main" data-act="takeStarter"${ui.pickStarter != null ? '' : ' disabled'}>就決定是這支了！</button></div>`;
  },

  hub() {
    const r = curRacket();
    const reset = ui.confirmReset
      ? `<div class="warn">確定要刪除所有進度，重新開始嗎？<div class="cbtns"><button class="danger" data-act="resetYes">刪除，重新開始</button><button data-act="resetNo">取消</button></div></div>`
      : `<button class="danger small" data-act="reset">重新開始</button>`;
    return `<h1>☰ 選單</h1>
      <div class="cbar"><span class="money">💰 ${money(save.money)}</span><span>戰績 ${save.wins} 勝 ${save.losses} 敗</span>
        <span>冠軍 ${save.titles} 次</span>${save.story.principal ? `<span>賽事：${EVENT_TIERS[save.unlocked].name}</span>` : ''}</div>
      ${ui.msg ? `<div class="note">${ui.msg}</div>` : ''}
      ${r ? `<div class="card wide"><h3>🏓 使用中：${racketName(r)}</h3>${racketBars(r)}${durBar(r)}
        <div class="sub">共有 ${save.rackets.length} 支球拍．${itemsText()}</div></div>`
        : `<div class="note">你還沒有球拍。${save.story.racket ? '去市區中心的商店買一支吧！' : '去學校一樓走廊盡頭的桌球體育館找陳教練吧！'}</div>`}
      ${save.run ? `<div class="note">你在「${curEvent().name}」打到${roundName(curEvent(), save.run.round)}了，回市立體育館繼續比賽吧！</div>` : ''}
      <div class="cbtns"><button class="main" data-act="world">▶ 回到地圖</button>
        ${r ? '<button data-act="gear">🎒 我的球具</button>' : ''}<button data-act="practice">🎯 練習模式</button><button data-act="saveNow">💾 存檔</button></div>
      <div class="cbtns"><button data-act="exit">↩ 回主選單</button>${reset}</div>`;
  },

  events() {
    const tiers = EVENT_TIERS.map((tier, ti) => {
      const locked = ti > save.unlocked;
      const evs = tier.events.map((ev, ei) => {
        const n = save.cleared[ev.id] || 0;
        const status = locked ? `🔒 在「${EVENT_TIERS[ti - 1].events.find(x => x.key).name}」奪冠後解鎖`
          : n ? `✅ 已奪冠 ${n} 次` : ev.key ? `⭐ 關鍵賽：奪冠解鎖下一級` : '';
        return `<button class="card${locked ? ' locked' : ''}" data-act="event" data-arg="${ti},${ei}"${locked ? ' disabled' : ''}>
          <h3>${ev.name}</h3><div class="sub">${ev.ops.length} 輪．每場${formatName(ev.bestOf)}</div>
          <div>報名費 ${ev.fee ? money(ev.fee) : '免費'}．冠軍 ${money(ev.prize)}．亞軍 ${money(ev.second)}</div>
          ${status ? `<div class="sub">${status}</div>` : ''}</button>`;
      }).join('');
      return `<div class="tier"><h2>${tier.name}</h2><div class="cards">${evs}</div></div>`;
    }).join('');
    return `<h1>🏟️ 市立體育館</h1><div class="cbar"><span class="money">💰 ${money(save.money)}</span></div>
      ${tiers}<div class="cbtns"><button data-act="world">離開體育館</button></div>`;
  },

  event() {
    const ev = EVENT_TIERS[ui.evT].events[ui.evE];
    const ops = ev.ops.map((o, i) => `<div class="card opp"><img src="${oppPortrait(o.char)}" alt="">
      <div><div class="sub">${roundName(ev, i)}</div><h3>${o.name}</h3>
      <div><span class="tag">${STYLES[o.style].name}</span><span class="stars">${stars(o.str)}</span></div>
      <div class="sub">${STYLES[o.style].tip}</div></div></div>`).join('');
    const can = !save.run && save.money >= ev.fee && hasRacket();
    const note = !hasRacket() ? '你沒有球拍，先去商店買一支吧。'
      : save.money < ev.fee ? '💰 獎金不夠，先去打報名費比較便宜或免費的比賽吧。' : '';
    return `<h1>${ev.name}</h1>
      <div class="cbar"><span>報名費 ${ev.fee ? money(ev.fee) : '免費'}</span><span>冠軍 ${money(ev.prize)}</span>
        <span>亞軍 ${money(ev.second)}</span><span>每場${formatName(ev.bestOf)}</span><span class="money">💰 ${money(save.money)}</span></div>
      <div class="cards">${ops}</div>
      ${note ? `<div class="note">${note}</div>` : ''}
      <div class="cbtns"><button class="main" data-act="enter"${can ? '' : ' disabled'}>報名參加${ev.fee ? `（${money(ev.fee)}）` : ''}</button>
        <button data-act="events">返回</button></div>`;
  },

  round() {
    const ev = curEvent(), o = ev.ops[save.run.round], r = curRacket();
    return `<h1>${ev.name}．${roundName(ev, save.run.round)}</h1>
      <div class="card opp big"><img src="${oppPortrait(o.char)}" alt="">
        <div><h3>VS ${o.name}</h3><div><span class="tag">${STYLES[o.style].name}</span><span class="stars">${stars(o.str)}</span></div>
        <div class="sub">${STYLES[o.style].tip}</div><div class="sub">賽制：${formatName(ev.bestOf)}</div>
        ${r ? `<div class="sub">使用球拍：${racketName(r)}（耐久 ${r.dur}/${maxDur(r)}）</div>` : ''}</div></div>
      ${r ? '' : '<div class="note">你沒有球拍了，先去商店買一支再回來比賽。</div>'}
      <div class="cbtns"><button class="main" data-act="play"${r ? '' : ' disabled'}>開始比賽</button>
        <button data-act="world">先離開</button><button class="danger" data-act="giveup">放棄這個比賽（報名費不退）</button></div>`;
  },

  result() {
    const r = ui.result;
    const score = r.forfeit ? '' : `<div class="bigscore">${r.score}</div>`;
    const broken = r.broken ? '<div class="note">💥 你的球拍全部壞掉了，只好先去市區中心的商店……</div>' : '';
    if (r.kind === 'advance') {
      const ev = curEvent(), o = ev.ops[save.run.round];
      return `<h1>🎉 勝利！</h1>${score}<p class="lead">晉級${roundName(ev, save.run.round)}，下一位對手：${o.name}（${STYLES[o.style].name}）</p>
        <div class="cbtns"><button class="main" data-act="round">下一輪</button><button data-act="world">先離開體育館</button></div>`;
    }
    if (r.kind === 'champion') {
      return `<h1>🏆 ${r.event} 冠軍！</h1>${score}<p class="lead">獲得冠軍獎金 <span class="money">${money(r.prize)}</span></p>
        ${r.unlocked ? `<div class="note">🔓 解鎖新的賽事：${r.unlocked}！</div>` : ''}
        ${r.world ? `<div class="note">👑 你成為亞洲冠軍了！下一站是世界舞台……（出國比賽之後開放）</div>` : ''}
        <div class="cbtns"><button class="main" data-act="world">回到地圖</button></div>`;
    }
    return `<h1>${r.forfeit ? '比賽結束' : '落敗…'}</h1>${score}${broken}
      <p class="lead">${r.prize ? `拿到亞軍獎金 <span class="money">${money(r.prize)}</span>，下次一定能拿冠軍！` : '這次被淘汰了，報名費沒了。調整球具再挑戰吧！'}</p>
      <div class="cbtns"><button class="main" data-act="world">回到地圖</button></div>`;
  },

  shop() {
    const tab = ui.shopTab;
    // 商品照等級排；還沒開放的等級顯示解鎖條件
    const order = Object.keys(GEAR_TIERS), sorted = o => Object.entries(o).filter(([, x]) => x.price > 0 && !x.hidden)
      .sort((a, b) => order.indexOf(a[1].tier) - order.indexOf(b[1].tier) || a[1].price - b[1].price);
    const buyBtn = (id, x) => !GEAR_TIERS[x.tier].open() ? `<button disabled>🔒 ${GEAR_TIERS[x.tier].lock}</button>`
      : `<button class="buy" data-act="buy" data-arg="${id}"${save.money >= x.price ? '' : ' disabled'}>購買 ${money(x.price)}</button>`;
    let items = '';
    if (tab === 'racket') {
      items = sorted(BLADES).map(([id, b]) => `<div class="card"><h3>${tierTag(b)}${b.name}</h3>
        <div class="sub">${b.desc}</div>${bladeBars(b)}<div class="sub">耐久度 ${b.dur}</div>${buyBtn(id, b)}</div>`).join('');
    } else if (tab === 'rubber') {
      items = sorted(RUBBERS).map(([id, u]) => `<div class="card"><h3>${tierTag(u)}${u.name}</h3><div class="sub">${u.desc}</div>${rubberBars(u)}
        ${save.rubbers.includes(id) ? '<button disabled>已擁有</button>' : buyBtn(id, u)}</div>`).join('');
    } else if (tab === 'enhance') {
      const r = curRacket();
      const up = (kind, from, ids, table, barsOf) => (ids || []).map(id => {
        const to = table[id], cost = upCost(from, to);
        const btn = !GEAR_TIERS[to.tier].open() ? `<button disabled>🔒 ${GEAR_TIERS[to.tier].lock}</button>`
          : `<button class="buy" data-act="enhance" data-arg="${kind}:${id}"${save.money >= cost ? '' : ' disabled'}>強化 ${money(cost)}</button>`;
        return `<div class="card"><h3>${from.name} → ${tierTag(to)}${to.name}</h3><div class="sub">${to.desc}</div>${barsOf(to)}${btn}</div>`;
      }).join('');
      items = !r ? '<div class="note">你還沒有球拍。</div>'
        : (up('b', BLADES[r.blade], BLADES[r.blade].next, BLADES, b => bladeBars(b) + `<div class="sub">耐久度 ${b.dur}（強化後修到全滿）</div>`)
          || `<div class="note">底板「${BLADES[r.blade].name}」已經是這個系列最高階了。</div>`)
        + (up('r', RUBBERS[r.rubber], RUBBERS[r.rubber].next, RUBBERS, rubberBars)
          || `<div class="note">膠皮「${RUBBERS[r.rubber].name}」已經是這個系列最高階了。</div>`);
    } else {
      items = Object.entries(ITEMS).map(([id, it]) => `<div class="card"><h3>${it.name}</h3><div class="sub">${it.desc}</div>
        <div class="sub">持有 ${save.items[id]} 個</div>
        <button class="buy" data-act="buy" data-arg="${id}"${save.money >= it.price ? '' : ' disabled'}>購買 ${money(it.price)}</button></div>`).join('');
    }
    const r = curRacket();
    const tip = { racket: '新底板會先裝上你目前用的膠皮，可以在「我的球具」換。', rubber: '買了膠皮會自動換到正在用的球拍上，舊膠皮也會留著。',
      enhance: `把使用中的球拍（${r ? racketName(r) : '沒有'}）升級成同系列更高階的款式，舊的折價六成抵用。`,
      item: '修理道具在比賽中按暫停就能使用。去恢復中心修理是免費的。' }[tab];
    return `<h1>🛒 商店</h1><div class="cbar"><span class="money">💰 ${money(save.money)}</span><span>${itemsText()}</span></div>
      <div class="cbtns tabs">${[['racket', '底板'], ['rubber', '膠皮'], ['enhance', '強化'], ['item', '修理道具']].map(([k, n]) =>
        `<button class="${tab === k ? 'sel' : ''}" data-act="tab" data-arg="${k}">${n}</button>`).join('')}</div>
      <p class="sub center">${tip}</p>
      ${ui.msg ? `<div class="note">${ui.msg}</div>` : ''}
      <div class="cards">${items}</div><div class="cbtns"><button data-act="world">離開商店</button></div>`;
  },

  gear() {
    const rackets = save.rackets.map((r, i) => `<button class="card${save.racket === i ? ' sel' : ''}" data-act="useRacket" data-arg="${i}">
      <h3>${BLADES[r.blade].name}${save.racket === i ? '（使用中）' : ''}</h3><div class="sub">膠皮：${RUBBERS[r.rubber].name}</div>
      ${racketBars(r)}${durBar(r)}</button>`).join('');
    const cur = curRacket();
    const rubbers = save.rubbers.map(id => `<button class="card${cur && cur.rubber === id ? ' sel' : ''}" data-act="useRubber" data-arg="${id}">
      <h3>${RUBBERS[id].name}${cur && cur.rubber === id ? '（裝在使用中的球拍）' : ''}</h3>${rubberBars(RUBBERS[id])}</button>`).join('');
    const items = Object.entries(ITEMS).map(([id, it]) =>
      `<button data-act="useItem" data-arg="${id}"${save.items[id] && cur && cur.dur < maxDur(cur) ? '' : ' disabled'}>🧰 用${it.name}（+${it.heal}）×${save.items[id]}</button>`).join('');
    return `<h1>🎒 我的球具</h1>
      ${ui.msg ? `<div class="note">${ui.msg}</div>` : ''}
      <h2>球拍（點一下換成這支）</h2><div class="cards">${rackets}</div>
      <h2>膠皮（點一下裝到使用中的球拍）</h2><div class="cards">${rubbers}</div>
      <h2>修理道具</h2><div class="cbtns">${items}</div>
      <div class="cbtns"><button data-act="hub">返回</button></div>`;
  },
};

function careerShow(view) {
  if (view) ui.view = view;
  if (ui.view !== 'hub') ui.confirmReset = false;
  $('careerBox').innerHTML = VIEWS[ui.view]();
  show('careerOv', true);
  $('careerOv').scrollTop = 0;
}
function careerHide() { show('careerOv', false); }

// ---------- 按鈕動作 ----------
const ACTS = {
  begin() {
    save = newSave(S.char); writeSave();
    careerHide();
    worldEnter(true);
  },
  pickStarter(i) { ui.pickStarter = +i; careerShow(); },
  takeStarter() {
    const st = STARTERS[ui.pickStarter];
    addRacket(st.blade, st.rubber);
    save.story.racket = true; writeSave();
    careerHide();
    worldResume();
    worldSay([`陳教練：「${st.name}嗎？不錯的選擇！」`, '陳教練：「頭上有桌球圖示的人都想找人比賽，走過去點一下畫面就能跟他比。球拍用久了會磨損，隨時回來找我保養。」'],
      () => worldCheckSight(), '陳教練');
  },
  exit: careerClose,
  world() { ui.msg = ''; careerHide(); worldResume(); },
  hub() { ui.msg = ''; careerShow('hub'); },
  practice() { ui.msg = ''; careerHide(); openPractice('career'); },
  saveNow() { worldSavePos(); writeSave(); ui.msg = '💾 已經存檔了！'; careerShow('hub'); },
  events() { careerShow('events'); },
  event(arg) { [ui.evT, ui.evE] = arg.split(',').map(Number); careerShow('event'); },
  enter() {
    const ev = EVENT_TIERS[ui.evT].events[ui.evE];
    if (save.run || save.money < ev.fee || !hasRacket()) return;
    save.money -= ev.fee;
    save.run = { t: ui.evT, e: ui.evE, round: 0 };
    writeSave();
    careerShow('round');
  },
  round() { careerShow('round'); },
  play() {
    const ev = curEvent();
    careerStartBattle({ kind: 'tournament', op: ev.ops[save.run.round], bestOf: ev.bestOf, toss: true });
  },
  giveup() { save.run = null; writeSave(); careerHide(); worldResume(); worldSay(['你放棄了這個比賽。']); },
  tab(t) { ui.shopTab = t; ui.msg = ''; careerShow(); },
  buy(id) {
    if (BLADES[id]) {
      const b = BLADES[id];
      if (save.money < b.price) return;
      save.money -= b.price;
      const r = curRacket();
      if (!GEAR_TIERS[b.tier].open()) return;
      addRacket(id, r ? r.rubber : (save.rubbers[0] || 'r_feather'));
      ui.msg = `買了「${b.name}」，已經換上了！`;
    } else if (RUBBERS[id]) {
      const u = RUBBERS[id];
      if (save.money < u.price || save.rubbers.includes(id) || !GEAR_TIERS[u.tier].open()) return;
      save.money -= u.price; save.rubbers.push(id);
      if (curRacket()) curRacket().rubber = id;
      ui.msg = `買了「${u.name}」，已經裝到球拍上了！`;
    } else if (ITEMS[id]) {
      const it = ITEMS[id];
      if (save.money < it.price) return;
      save.money -= it.price; save.items[id]++;
      ui.msg = `買了一個「${it.name}」。`;
    }
    writeSave();
    careerShow();
  },
  // 強化：「b:底板」或「r:膠皮」，把使用中球拍的底板或膠皮升級成同系列的下一款
  enhance(arg) {
    const [kind, id] = arg.split(':'), r = curRacket();
    if (!r) return;
    const table = kind === 'b' ? BLADES : RUBBERS, from = table[kind === 'b' ? r.blade : r.rubber], to = table[id];
    const cost = upCost(from, to);
    if (!(from.next || []).includes(id) || !GEAR_TIERS[to.tier].open() || save.money < cost) return;
    save.money -= cost;
    if (kind === 'b') { r.blade = id; r.dur = maxDur(r); }
    else {
      const old = r.rubber; r.rubber = id;
      if (!save.rackets.some(x => x.rubber === old)) save.rubbers = save.rubbers.filter(x => x !== old);   // 舊膠皮換掉了
      if (!save.rubbers.includes(id)) save.rubbers.push(id);
    }
    ui.msg = `「${from.name}」強化成「${to.name}」了！`;
    writeSave(); careerShow();
  },
  gear() { ui.msg = ''; careerShow('gear'); },
  useRacket(i) { save.racket = +i; writeSave(); careerShow(); },
  useRubber(id) { const r = curRacket(); if (r) { r.rubber = id; writeSave(); } careerShow(); },
  useItem(id) { if (useItem(id)) ui.msg = `用了${ITEMS[id].name}，耐久度恢復了！`; careerShow(); },
  reset() { ui.confirmReset = true; careerShow(); },
  resetNo() { ui.confirmReset = false; careerShow(); },
  resetYes() {
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* 忽略 */ }
    save = null; ui.confirmReset = false; ui.pickStarter = null; ui.msg = '';
    worldExit();
    careerShow('intro');
  },
};
$('careerBox').addEventListener('click', e => {
  const b = e.target.closest('[data-act]');
  if (!b || b.disabled) return;
  ACTS[b.dataset.act](b.dataset.arg);
});

// ---------- 進入 / 離開生涯 ----------
function careerOpen() {
  initAudio();
  menuSnapshot = { diff: S.diff, bestOf: S.bestOf, practice: S.practice, char: S.char };
  save = loadSave();
  if (save && save.char !== S.char) { save.char = S.char; writeSave(); }   // 用主選單選的角色
  ui.msg = '';
  show('menuOv', false);
  if (save) worldEnter(false); else careerShow('intro');
}
function careerClose() {
  worldExit();
  if (menuSnapshot) Object.assign(S, menuSnapshot);
  Object.assign(S, { mode: 'menu', careerMatch: false, oppChar: null, oppName: null, ps: 0, as: 0, pg: 0, ag: 0, game: 1 });
  GEAR = NEUTRAL_GEAR;
  careerHide(); menuHome();
}

// ---------- 開始比賽：路人挑戰（直接開打）或體育館賽事（先猜球） ----------
function careerStartBattle(cfg) {
  if (!hasRacket()) return;
  DIFF.career = buildAI(cfg.op);
  Object.assign(S, { diff: 'career', bestOf: cfg.bestOf, pts: cfg.pts || 11, practice: false, char: save.char,
    oppChar: cfg.op.char, oppName: cfg.op.name, careerMatch: true, careerKind: cfg.kind, careerTrainer: cfg.trainer || null });
  applyGear();
  careerHide();
  worldHideUI();
  if (cfg.toss) openToss();
  else startGame(Math.random() < 0.5 ? 'player' : 'ai');
}

// 比賽結束（game.js 呼叫）
function careerMatchEnd(won, forfeit) {
  S.careerMatch = false;
  const broken = !hasRacket();
  if (won) save.wins++; else save.losses++;
  if (S.careerKind === 'trainer') { trainerMatchEnd(won, forfeit, broken); return; }
  const ev = curEvent(), last = save.run.round === ev.ops.length - 1;
  const r = { score: S.pg + ' - ' + S.ag, forfeit, broken };
  if (won && !last) {
    save.run.round++;
    r.kind = 'advance';
  } else if (won) {
    r.kind = 'champion'; r.event = ev.name; r.prize = ev.prize;
    save.money += ev.prize; save.earned += ev.prize; save.titles++;
    save.cleared[ev.id] = (save.cleared[ev.id] || 0) + 1;
    if (ev.key && save.run.t === save.unlocked && save.unlocked < EVENT_TIERS.length - 1) {
      save.unlocked++; r.unlocked = EVENT_TIERS[save.unlocked].name;
    }
    if (ev.key && save.run.t === EVENT_TIERS.length - 1) { r.world = !save.champion; save.champion = true; }
    save.run = null;
  } else {
    r.kind = 'lose';
    r.prize = last && !forfeit ? ev.second : 0;
    save.money += r.prize; save.earned += r.prize;
    save.run = null;
  }
  writeSave();
  ui.result = r; ui.msg = '';
  if (broken) worldGoToShop(false);
  careerShow('result');
}

// 路人挑戰的結果：贏了拿獎金，輸了要付錢
function trainerMatchEnd(won, forfeit, broken) {
  const t = S.careerTrainer;
  const lines = [];
  if (won) {
    save.beaten[t.id] = true;
    save.money += t.prize; save.earned += t.prize;
    lines.push(`${t.name}：「${t.after}」`, `你贏了！獲得 ${money(t.prize)} 獎金。`);
    if (t.id === 'boss_pri') {
      save.story.principal = true;
      lines.push('🔓 校際賽開放報名了！去市區中心的「市立體育館」報名吧！');
    }
  } else {
    const pay = Math.min(save.money, t.prize);
    save.money -= pay;
    lines.push(forfeit ? '你中途放棄了比賽……' : `你輸給了${t.name}……`, pay ? `付給對手 ${money(pay)}。` : '還好你身上沒有錢可以付……');
  }
  writeSave();
  worldResume();
  if (broken) worldSay(lines.concat(['你的球拍全部壞掉了！只好先去市區中心的商店……']), () => worldGoToShop(true));
  else worldSay(lines, () => worldCheckSight());
}

