// Run: node test/world_maps_smoke.mjs
// Uses the real movement/warp functions; stubs only DOM, image loading and audio.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const root = new URL('../', import.meta.url);
const element = {addEventListener() {}, style: {}, classList: {add() {}, remove() {}}};
const sandbox = vm.createContext({
  Image: class {}, $: () => element, cv: element, window: element,
  playSfx: () => () => {}, writeSave() {}, hasRacket: () => false,
  save: {story: {mom: true, racket: false}, beaten: {}}, console,
});
for (const name of ['js/maps.js', 'js/world.js']) {
  vm.runInContext(fs.readFileSync(new URL(name, root), 'utf8'), sandbox, {filename: name});
}
const api = vm.runInContext('({world, maps: WORLD_MAPS, spawn: WORLD_SPAWN, loadMap, tryStep, arrive, updateFade, worldGoToShop, save})', sandbox);
const {world, maps} = api;
assert(!maps[19], 'School exterior must be merged into the field map');
const campus=maps[9];
const school=campus.objects.find(o=>o.kind==='building' && o.name==='教學樓');
const field=campus.art.surfaces.find(s=>s.tile==='schoolyard');
assert(school && field && school.y+school.h<=field.y, 'School must stand north of the field on the same map');
assert(campus.trainers.some(p=>p.id==='pe'), 'PE teacher must remain on campus');
assert(campus.warps.some(w=>w.to===7), 'Campus must lead directly into the first-floor corridor');
assert(maps[1].objects.some(o=>o.name?.includes('大同路58巷3號')), 'Home must use the requested address');
assert(maps[11].objects.some(o=>o.name==='龍元宮'), 'Temple must be the city landmark');
for (const [from,to,dir] of [[1,5,'left'],[5,10,'up'],[10,18,'left'],[10,11,'up']]) {
  assert(maps[from].warps.some(w=>w.to===to && w.dir===dir), `Incorrect Longtan geography: ${from} to ${to}`);
}
const directions = [['left',-1,0],['right',1,0],['up',0,-1],['down',0,1]];
function routeTo(warp) {
  const start = `${world.x},${world.y}`;
  const paths = new Map([[start, []]]), queue = [[world.x, world.y]];
  for (let i = 0; i < queue.length; i++) {
    const [x,y] = queue[i], path = paths.get(`${x},${y}`);
    if (x === warp.x && y === warp.y) return path;
    for (const [dir,dx,dy] of directions) {
      const xx=x+dx, yy=y+dy, key=`${xx},${yy}`;
      if (xx<0 || yy<0 || xx>=world.m.w || yy>=world.m.h || paths.has(key) || world.m.solid[yy][xx]) continue;
      if (world.npcs.some(p=>p.x===xx && p.y===yy)) continue;
      if (world.m.warps.some(w=>w.x===xx && w.y===yy) && (xx!==warp.x || yy!==warp.y)) continue;
      paths.set(key, [...path, dir]); queue.push([xx,yy]);
    }
  }
  return null;
}
let steps = 0, transitions = 0;
function walk(warp, path) {
  assert(path?.length, `No walking route in ${world.m.name} to ${warp.to}`);
  for (const dir of path) {
    api.tryStep(dir);
    assert(world.moving, `Movement blocked in ${world.m.name}: ${dir}`);
    api.arrive(); steps++;
  }
  assert(world.fade, 'Exit did not trigger a transition');
  api.updateFade(.2); api.updateFade(.2);
  assert.equal(world.id, warp.to);
  assert.equal(world.x, warp.tx); assert.equal(world.y, warp.ty);
  assert.equal(world.dir, warp.dir);
  assert(!world.m.solid[world.y][world.x], 'Arrival is solid');
  transitions++;
}
// Leaving home before talking to Mom: she calls you back and you stay in the living room.
api.save.story.mom = false;
api.loadMap(2, 6, 10, 'down');
api.tryStep('down'); api.arrive();
assert(!world.fade && world.id === 2 && world.x === 6 && world.y === 10, 'Mom must stop you at the front door');
assert(world.dialog?.lines[0].includes('等一下'), 'Mom must call you back');
world.dialog = null; api.save.story.mom = true;
api.loadMap(api.spawn.map, api.spawn.x, api.spawn.y, api.spawn.dir);
for (const target of [2,1,5,10,18,10,5,9,7,8,7,21,7,20,6,20,7,9,5,10,11,12,11,13,11,14]) {
  const candidates = world.m.warps.filter(w=>w.to===target).map(w=>[w,routeTo(w)]).filter(([,p])=>p?.length);
  assert(candidates.length, `Cannot reach map ${target} from ${world.id}`);
  walk(...candidates[0]);
}
// Water blocks walking, while the east-bank bridge reaches the lake island continuously.
api.loadMap(18,14,3,'down');
api.tryStep('down');
assert(!world.moving, 'Player can walk into the lake');
api.loadMap(18,25,21,'left');
const islandPath=routeTo({x:15,y:21});
assert(islandPath?.length, 'Island is not accessible by bridge');
for (const dir of islandPath) {
  api.tryStep(dir); assert(world.moving, 'Bridge path blocked'); api.arrive(); steps++;
  assert.equal(world.id,18); assert(!world.fade, 'Bridge unexpectedly changes maps');
}
// Exercise every individual portal, including optional homes and both stairs.
for (const [id,m] of Object.entries(maps)) {
  const occupied = new Set([...m.npcs,...m.trainers,...m.warps].map(p=>`${p.x},${p.y}`));
  let start;
  for (let y=2; y<m.h-1 && !start; y++) for (let x=1; x<m.w-1; x++) {
    if (m.rows[y][x]==='.' && !occupied.has(`${x},${y}`)) {start=[x,y];break;}
  }
  assert(start, `No free starting tile in ${id}`);
  for (const warp of m.warps) {
    api.loadMap(Number(id),...start,'down');
    walk(warp,routeTo(warp));
  }
}
api.worldGoToShop(false);
assert.equal(world.id,13);
assert(!world.m.solid[world.y][world.x], 'Broken-racket recovery lands in furniture');
const portals=Object.values(maps).reduce((n,m)=>n+m.warps.length,0);
console.log(`PASS: story route, all ${portals} portals, and shop recovery (${transitions} transitions, ${steps} real movement steps).`);
