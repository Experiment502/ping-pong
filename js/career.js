'use strict';
// ==================== 球王之路（生涯模式） ====================
// 會用到 game.js 的 S、DIFF、GEAR、openToss、show、$、crowd 等

const SAVE_KEY = 'fingertipPong.career.v1';

// ---------- 球具（數值 1～10，5 是標準） ----------
// 底板：速度、控制、甜區；膠皮：速度、旋轉、控制
const BLADES = {
  b_gale:   { name: '疾風', spd: 7, ctl: 3, sweet: 4, price: 0, desc: '輕巧的攻擊型底板，球速快' },
  b_guard:  { name: '穩守', spd: 4, ctl: 7, sweet: 7, price: 0, desc: '厚實的底板，甜區大、好控制' },
  b_whirl:  { name: '迴旋', spd: 5, ctl: 5, sweet: 5, price: 0, desc: '彈性好、吃球深，容易製造旋轉' },
  b_wood:   { name: '五夾·木心', spd: 5, ctl: 8, sweet: 8, price: 1200, desc: '純木五夾，手感紮實、非常穩定' },
  b_carbon: { name: '碳纖·雷光', spd: 9, ctl: 4, sweet: 5, price: 1500, desc: '加了碳纖維，球速爆發' },
  b_alc:    { name: '芳碳·流星', spd: 8, ctl: 6, sweet: 7, price: 4000, desc: '芳碳纖維，速度和手感兼顧' },
  b_pro:    { name: '冠軍·龍王', spd: 9, ctl: 8, sweet: 9, price: 12000, desc: '世界冠軍用的頂級底板' },
};
const RUBBERS = {
  r_gale:    { name: '疾風膠', spd: 6, spin: 4, ctl: 4, price: 0, desc: '彈性好的入門攻擊膠皮' },
  r_guard:   { name: '穩守膠', spd: 4, spin: 4, ctl: 7, price: 0, desc: '軟硬適中，好控制' },
  r_whirl:   { name: '迴旋膠', spd: 5, spin: 8, ctl: 4, price: 0, desc: '摩擦力強，容易製造旋轉' },
  r_tacky:   { name: '黏性·霸旋', spd: 5, spin: 9, ctl: 5, price: 900, desc: '黏性膠皮，旋轉超強' },
  r_tension: { name: '張力·狂速', spd: 9, spin: 6, ctl: 4, price: 1200, desc: '內能膠皮，球速快但不好控制' },
  r_balance: { name: '均衡·風神', spd: 7, spin: 7, ctl: 7, price: 3000, desc: '各方面都很平均的高級膠皮' },
  r_pro:     { name: '國手·天極', spd: 9, spin: 9, ctl: 8, price: 9000, desc: '國手專用的頂級膠皮' },
};
const STARTERS = [
  { name: '速度型', blade: 'b_gale', rubber: 'r_gale', desc: '球速快、對手難接，但落點比較不穩。' },
  { name: '控制型', blade: 'b_guard', rubber: 'r_guard', desc: '甜區大、落點穩，最適合新手。' },
  { name: '旋轉型', blade: 'b_whirl', rubber: 'r_whirl', desc: '旋轉強，打出的拉球、切球更難接。' },
];

// 整支球拍的數值：速度看底板和膠皮、旋轉看膠皮、控制兩者平均、甜區看底板
function gearStats(bladeId, rubberId) {
  const b = BLADES[bladeId], r = RUBBERS[rubberId];
  return { spd: b.spd * 0.6 + r.spd * 0.4, spin: r.spin, ctl: (b.ctl + r.ctl) / 2, sweet: b.sweet };
}
// 換成比賽裡的效果（給 game.js 的 GEAR）
function gearMods(st) {
  return {
    T: 1 - 0.03 * (st.spd - 5),            // 速度：球飛得比較快
    pow: 1 + 0.06 * (st.spd - 5),          // 速度：對手比較難接
    spin: 1 + 0.07 * (st.spin - 5),        // 旋轉：打出的旋轉更強
    err: Math.max(0.5, 1 - 0.07 * (st.ctl - 5)),   // 控制：落點偏差、掛網比較少
    radius: 1 + 0.035 * (st.sweet - 5),    // 甜區：擊球判定範圍
    perfect: 1 + 0.08 * (st.sweet - 5),    // 甜區：PERFECT 的範圍
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

// ---------- 賽事：每一級的最後一場是「關鍵賽」，奪冠才會解鎖下一級 ----------
// ops：每一輪的對手（char 決定外觀，str 是強度 0～1）
const op = (name, char, style, str) => ({ name, char, style, str });
const EVENT_TIERS = [
  { name: '社區比賽', events: [
    { id: 'c1', name: '社區友誼賽', fee: 0, prize: 300, second: 100, bestOf: 1,
      ops: [op('阿明', 'male', 'allround', 0.05), op('林阿姨', 'female', 'lobber', 0.12)] },
    { id: 'c2', name: '里民盃', fee: 50, prize: 600, second: 200, bestOf: 1, key: true,
      ops: [op('小美', 'female', 'allround', 0.15), op('王伯伯', 'male', 'chopper', 0.22), op('陳教練', 'male', 'looper', 0.3)] },
  ] },
  { name: '縣市賽', events: [
    { id: 't1', name: '市長盃', fee: 150, prize: 1500, second: 500, bestOf: 1,
      ops: [op('張同學', 'male', 'speedster', 0.32), op('李小姐', 'female', 'spinner', 0.38), op('黃隊長', 'male', 'allround', 0.45)] },
    { id: 't2', name: '縣市錦標賽', fee: 300, prize: 3000, second: 1000, bestOf: 1, key: true,
      ops: [op('吳學姊', 'female', 'chopper', 0.42), op('蔡選手', 'male', 'looper', 0.5), op('周大俠', 'male', 'speedster', 0.55)] },
  ] },
  { name: '全國賽', events: [
    { id: 'n1', name: '全國公開賽', fee: 600, prize: 6000, second: 2000, bestOf: 3,
      ops: [op('劉國手', 'male', 'spinner', 0.57), op('許選手', 'female', 'looper', 0.63), op('鄭隊長', 'male', 'chopper', 0.7)] },
    { id: 'n2', name: '全國錦標賽', fee: 1000, prize: 10000, second: 3500, bestOf: 3, key: true,
      ops: [op('謝選手', 'female', 'speedster', 0.68), op('楊教頭', 'male', 'lobber', 0.74), op('江天王', 'male', 'allround', 0.8)] },
  ] },
  { name: '國際對抗賽', events: [
    { id: 'i1', name: '亞洲盃', fee: 2000, prize: 20000, second: 7000, bestOf: 3,
      ops: [op('佐藤（日本）', 'male', 'looper', 0.76), op('金敏智（韓國）', 'female', 'speedster', 0.82), op('陳龍（中國）', 'male', 'allround', 0.88)] },
    { id: 'i2', name: '世界盃', fee: 4000, prize: 50000, second: 15000, bestOf: 3, key: true,
      ops: [op('漢斯（德國）', 'male', 'looper', 0.86), op('艾瑪（瑞典）', 'female', 'chopper', 0.92), op('雷歐（世界球王）', 'male', 'allround', 1.0)] },
  ] },
];

// 對手的強度在「簡單」和「困難」之間內插，打法決定球路
function buildAI(o) {
  const e = DIFF.easy, h = DIFF.hard, t = o.str, st = STYLES[o.style];
  const L = (a, b) => a + (b - a) * t;
  return {
    label: o.name, T: L(e.T, h.T) * (st.speed || 1), aimX: L(e.aimX, h.aimX), aiSpeed: L(e.aiSpeed, h.aiSpeed),
    react: L(e.react, h.react), miss: L(e.miss, h.miss), missPow: L(e.missPow, h.missPow), spinMiss: L(e.spinMiss, h.spinMiss),
    p: Object.assign({}, st.p, { edge: L(e.p.edge, h.p.edge), cord: L(e.p.cord, h.p.cord), err: L(e.p.err, h.p.err) }),
  };
}

// ---------- 存檔（存在這支手機的瀏覽器裡） ----------
let save = null;
function loadSave() { try { const t = localStorage.getItem(SAVE_KEY); return t ? JSON.parse(t) : null; } catch (e) { return null; } }
function writeSave() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* 無痕模式等存不了就算了 */ } }
function newSave(char, starter) {
  const st = STARTERS[starter];
  return { v: 1, char, money: 200, blade: st.blade, rubber: st.rubber, blades: [st.blade], rubbers: [st.rubber],
    unlocked: 0, cleared: {}, wins: 0, losses: 0, titles: 0, earned: 0, run: null, champion: false };
}

// ---------- 畫面狀態 ----------
const ui = { view: 'hub', pickChar: null, pickStarter: null, shopTab: 'blade', evT: 0, evE: 0, result: null, confirmReset: false, msg: '' };
let menuSnapshot = null;   // 進入生涯前主選單的設定，離開時還原

const money = n => '$' + Number(n).toLocaleString();
const stars = s => { const n = Math.max(1, Math.min(5, Math.round(1 + s * 4))); return '★'.repeat(n) + '☆'.repeat(5 - n); };
const portrait = c => `assets/${c}_portrait.png`;
function bars(rows) {
  return rows.map(([k, v]) => `<div class="stat"><span>${k}</span><i><b style="width:${v * 10}%"></b></i><span>${Number.isInteger(v) ? v : v.toFixed(1)}</span></div>`).join('');
}
const bladeBars = b => bars([['速度', b.spd], ['控制', b.ctl], ['甜區', b.sweet]]);
const rubberBars = r => bars([['速度', r.spd], ['旋轉', r.spin], ['控制', r.ctl]]);
const racketBars = (bl, rb) => { const st = gearStats(bl, rb); return bars([['速度', st.spd], ['旋轉', st.spin], ['控制', st.ctl], ['甜區', st.sweet]]); };
const curEvent = () => EVENT_TIERS[save.run.t].events[save.run.e];
const roundName = (ev, i) => (i === ev.ops.length - 1 ? '決賽' : `第 ${i + 1} 輪`);
const formatName = n => (n === 1 ? '1 局 11 分' : n === 3 ? '三戰兩勝' : n === 5 ? '五戰三勝' : `${n} 局`);

// ---------- 各個畫面 ----------
const VIEWS = {
  intro() {
    const chars = ['male', 'female'].map(c => `
      <button class="card pick${ui.pickChar === c ? ' sel' : ''}" data-act="pickChar" data-arg="${c}">
        <img src="${portrait(c)}" alt=""><h3>${c === 'male' ? '男選手' : '女選手'}</h3></button>`).join('');
    const starters = STARTERS.map((st, i) => `
      <button class="card${ui.pickStarter === i ? ' sel' : ''}" data-act="pickStarter" data-arg="${i}">
        <h3>${st.name}</h3><div class="sub">${BLADES[st.blade].name} ＋ ${RUBBERS[st.rubber].name}</div>
        ${racketBars(st.blade, st.rubber)}<div class="sub">${st.desc}</div></button>`).join('');
    const ready = ui.pickChar && ui.pickStarter != null;
    return `<h1>🏆 球王之路</h1>
      <p class="lead">從社區比賽開始，一路打到國際對抗賽。打贏比賽拿獎金、買更好的球具，成為世界球王！</p>
      <h2>1. 選擇你的角色</h2><div class="cards chars2">${chars}</div>
      <h2>2. 選擇新手球拍</h2><div class="cards">${starters}</div>
      <div class="cbtns"><button class="main" data-act="begin"${ready ? '' : ' disabled'}>開始生涯</button>
      <button data-act="exit">返回</button></div>`;
  },

  hub() {
    const tierName = EVENT_TIERS[save.unlocked].name;
    const run = save.run ? curEvent() : null;
    const reset = ui.confirmReset
      ? `<div class="warn">確定要刪除所有生涯進度嗎？<div class="cbtns"><button class="danger" data-act="resetYes">刪除，重新開始</button><button data-act="resetNo">取消</button></div></div>`
      : `<button class="danger small" data-act="reset">重新開始生涯</button>`;
    return `<h1>🏆 球王之路</h1>
      <div class="cbar"><span class="money">💰 ${money(save.money)}</span><span>戰績 ${save.wins} 勝 ${save.losses} 敗</span>
        <span>冠軍 ${save.titles} 次</span><span>目前：${tierName}${save.champion ? '．👑 世界球王' : ''}</span></div>
      ${ui.msg ? `<div class="note">${ui.msg}</div>` : ''}
      <div class="card wide"><h3>🏓 我的球拍：${BLADES[save.blade].name} ＋ ${RUBBERS[save.rubber].name}</h3>${racketBars(save.blade, save.rubber)}</div>
      ${run ? `<button class="main" data-act="resume">▶ 繼續比賽：${run.name} ${roundName(run, save.run.round)}</button>` : ''}
      <div class="cbtns"><button class="main" data-act="events">🏟️ 參加比賽</button>
        <button data-act="shop">🛒 球具店</button><button data-act="gear">🎒 我的球具</button></div>
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
    return `<h1>🏟️ 參加比賽</h1><div class="cbar"><span class="money">💰 ${money(save.money)}</span></div>
      ${tiers}<div class="cbtns"><button data-act="hub">返回</button></div>`;
  },

  event() {
    const ev = EVENT_TIERS[ui.evT].events[ui.evE];
    const ops = ev.ops.map((o, i) => `<div class="card opp"><img src="${portrait(o.char)}" alt="">
      <div><div class="sub">${roundName(ev, i)}</div><h3>${o.name}</h3>
      <div><span class="tag">${STYLES[o.style].name}</span><span class="stars">${stars(o.str)}</span></div>
      <div class="sub">${STYLES[o.style].tip}</div></div></div>`).join('');
    const busy = !!save.run;
    const can = !busy && save.money >= ev.fee;
    const note = busy ? `你還有一場「${curEvent().name}」沒打完，先回生涯主畫面繼續或放棄。`
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
    const ev = curEvent(), o = ev.ops[save.run.round];
    return `<h1>${ev.name}．${roundName(ev, save.run.round)}</h1>
      <div class="card opp big"><img src="${portrait(o.char)}" alt="">
        <div><h3>VS ${o.name}</h3><div><span class="tag">${STYLES[o.style].name}</span><span class="stars">${stars(o.str)}</span></div>
        <div class="sub">${STYLES[o.style].tip}</div><div class="sub">賽制：${formatName(ev.bestOf)}</div>
        <div class="sub">使用球拍：${BLADES[save.blade].name} ＋ ${RUBBERS[save.rubber].name}</div></div></div>
      <div class="cbtns"><button class="main" data-act="play">開始比賽</button>
        <button data-act="hub">先回主畫面</button><button class="danger" data-act="giveup">放棄這個比賽（報名費不退）</button></div>`;
  },

  result() {
    const r = ui.result;
    const score = r.forfeit ? '' : `<div class="bigscore">${r.score}</div>`;
    if (r.kind === 'advance') {
      const ev = curEvent(), o = ev.ops[save.run.round];
      return `<h1>🎉 勝利！</h1>${score}<p class="lead">晉級${roundName(ev, save.run.round)}，下一位對手：${o.name}（${STYLES[o.style].name}）</p>
        <div class="cbtns"><button class="main" data-act="round">下一輪</button><button data-act="hub">先回主畫面</button></div>`;
    }
    if (r.kind === 'champion') {
      return `<h1>🏆 ${r.event} 冠軍！</h1>${score}<p class="lead">獲得冠軍獎金 <span class="money">${money(r.prize)}</span></p>
        ${r.unlocked ? `<div class="note">🔓 解鎖新的賽事：${r.unlocked}！</div>` : ''}
        ${r.world ? `<div class="note">👑 恭喜！你打敗了世界球王，成為新的世界球王！</div>` : ''}
        <div class="cbtns"><button class="main" data-act="hub">回到生涯</button></div>`;
    }
    return `<h1>${r.forfeit ? '你棄權了' : '落敗…'}</h1>${score}
      <p class="lead">${r.prize ? `拿到亞軍獎金 <span class="money">${money(r.prize)}</span>，下次一定能拿冠軍！` : '這次被淘汰了，報名費沒了。調整球具或換個比賽再挑戰吧！'}</p>
      <div class="cbtns"><button class="main" data-act="hub">回到生涯</button></div>`;
  },

  shop() {
    const isBlade = ui.shopTab === 'blade';
    const list = isBlade ? BLADES : RUBBERS, owned = isBlade ? save.blades : save.rubbers;
    const items = Object.entries(list).filter(([, it]) => it.price > 0).map(([id, it]) => {
      const has = owned.includes(id), can = save.money >= it.price;
      return `<div class="card"><h3>${it.name}</h3><div class="sub">${it.desc}</div>${isBlade ? bladeBars(it) : rubberBars(it)}
        ${has ? `<button disabled>已擁有</button>`
          : `<button class="buy" data-act="buy" data-arg="${id}"${can ? '' : ' disabled'}>購買 ${money(it.price)}</button>`}</div>`;
    }).join('');
    return `<h1>🛒 球具店</h1><div class="cbar"><span class="money">💰 ${money(save.money)}</span></div>
      <div class="cbtns tabs"><button class="${isBlade ? 'sel' : ''}" data-act="tab" data-arg="blade">底板</button>
        <button class="${isBlade ? '' : 'sel'}" data-act="tab" data-arg="rubber">膠皮</button></div>
      <p class="sub center">${isBlade ? '底板決定球速、穩定度（控制）和甜區大小。' : '膠皮決定旋轉強度和控球。'}買了會自動裝上。</p>
      ${ui.msg ? `<div class="note">${ui.msg}</div>` : ''}
      <div class="cards">${items}</div><div class="cbtns"><button data-act="hub">返回</button></div>`;
  },

  gear() {
    const blades = save.blades.map(id => `<button class="card${save.blade === id ? ' sel' : ''}" data-act="useBlade" data-arg="${id}">
      <h3>${BLADES[id].name}${save.blade === id ? '（使用中）' : ''}</h3>${bladeBars(BLADES[id])}</button>`).join('');
    const rubbers = save.rubbers.map(id => `<button class="card${save.rubber === id ? ' sel' : ''}" data-act="useRubber" data-arg="${id}">
      <h3>${RUBBERS[id].name}${save.rubber === id ? '（使用中）' : ''}</h3>${rubberBars(RUBBERS[id])}</button>`).join('');
    return `<h1>🎒 我的球具</h1>
      <div class="card wide"><h3>目前的球拍：${BLADES[save.blade].name} ＋ ${RUBBERS[save.rubber].name}</h3>${racketBars(save.blade, save.rubber)}</div>
      <h2>底板</h2><div class="cards">${blades}</div><h2>膠皮</h2><div class="cards">${rubbers}</div>
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

// ---------- 按鈕動作 ----------
const ACTS = {
  pickChar(c) { ui.pickChar = c; careerShow(); },
  pickStarter(i) { ui.pickStarter = +i; careerShow(); },
  begin() {
    save = newSave(ui.pickChar, ui.pickStarter); writeSave();
    ui.msg = '歡迎來到球王之路！先從「社區友誼賽」開始吧，它是免費的。';
    careerShow('hub');
  },
  exit: careerClose,
  hub() { ui.msg = ''; careerShow('hub'); },
  events() { careerShow('events'); },
  event(arg) { [ui.evT, ui.evE] = arg.split(',').map(Number); careerShow('event'); },
  enter() {
    const ev = EVENT_TIERS[ui.evT].events[ui.evE];
    if (save.run || save.money < ev.fee) return;
    save.money -= ev.fee;
    save.run = { t: ui.evT, e: ui.evE, round: 0 };
    writeSave();
    careerShow('round');
  },
  resume() { careerShow('round'); },
  round() { careerShow('round'); },
  play: startCareerMatch,
  giveup() { save.run = null; writeSave(); ui.msg = '已放棄比賽。'; careerShow('hub'); },
  shop() { ui.msg = ''; careerShow('shop'); },
  tab(t) { ui.shopTab = t; ui.msg = ''; careerShow(); },
  buy(id) {
    const isBlade = ui.shopTab === 'blade', it = (isBlade ? BLADES : RUBBERS)[id];
    const owned = isBlade ? save.blades : save.rubbers;
    if (owned.includes(id) || save.money < it.price) return;
    save.money -= it.price; owned.push(id);
    if (isBlade) save.blade = id; else save.rubber = id;
    writeSave();
    ui.msg = `買了「${it.name}」，已經裝上了！`;
    careerShow();
  },
  gear() { careerShow('gear'); },
  useBlade(id) { save.blade = id; writeSave(); careerShow(); },
  useRubber(id) { save.rubber = id; writeSave(); careerShow(); },
  reset() { ui.confirmReset = true; careerShow(); },
  resetNo() { ui.confirmReset = false; careerShow(); },
  resetYes() {
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* 忽略 */ }
    save = null; ui.confirmReset = false; ui.pickChar = null; ui.pickStarter = null; ui.msg = '';
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
  ui.msg = '';
  show('menuOv', false);
  careerShow(save ? 'hub' : 'intro');
}
function careerClose() {
  if (menuSnapshot) Object.assign(S, menuSnapshot);
  Object.assign(S, { mode: 'menu', careerMatch: false, oppChar: null, oppName: null, ps: 0, as: 0, pg: 0, ag: 0, game: 1 });
  GEAR = NEUTRAL_GEAR;
  show('careerOv', false); show('menuOv', true);
}

// 開始這一輪：設定對手、球具、賽制，然後進入猜球
function startCareerMatch() {
  const ev = curEvent(), o = ev.ops[save.run.round];
  DIFF.career = buildAI(o);
  Object.assign(S, { diff: 'career', bestOf: ev.bestOf, practice: false, char: save.char,
    oppChar: o.char, oppName: o.name, careerMatch: true });
  GEAR = gearMods(gearStats(save.blade, save.rubber));
  show('careerOv', false);
  openToss();
}

// 比賽結束（game.js 呼叫）：晉級、奪冠或淘汰
function careerMatchEnd(won, forfeit) {
  S.careerMatch = false;
  const ev = curEvent(), last = save.run.round === ev.ops.length - 1;
  const r = { score: S.pg + ' - ' + S.ag, forfeit };
  if (won) save.wins++; else save.losses++;
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
  careerShow('result');
}

$('careerBtn').addEventListener('click', careerOpen);
