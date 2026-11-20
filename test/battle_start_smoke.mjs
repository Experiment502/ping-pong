// Run: node test/battle_start_smoke.mjs
// Loads the real game scripts. Only browser APIs are replaced; game flow and rendering execute.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const root=new URL('../',import.meta.url), elements=new Map(), frames=[];
let time=0, battleDraws=0;
const battleRegions=new Set();
function context2d() {
  return new Proxy({}, {get(target,key) {
    if (key in target) return target[key];
    if (key==='measureText') return text=>({width:String(text).length*8});
    if (key==='createLinearGradient' || key==='createRadialGradient') return ()=>({addColorStop() {}});
    if (key==='drawImage') return (image,...args)=>{
      assert(args.every(Number.isFinite),'Invalid draw coordinates');
      if (image.src==='assets/battle.png') {
        battleDraws++; battleRegions.add(args.slice(0,4).join(','));
      }
    };
    return ()=>{};
  }});
}
function element(id) {
  if (!elements.has(id)) {
    const classes=new Set(['hidden']);
    elements.set(id, {style:{},dataset:{},width:220,height:240,textContent:'',innerHTML:'',
      classList:{add(c){classes.add(c);},remove(c){classes.delete(c);},contains(c){return classes.has(c);},toggle(c,on){if(on)classes.add(c);else classes.delete(c);}},
      addEventListener(){},getContext:()=>context2d(),querySelectorAll:()=>[],getBoundingClientRect:()=>({left:0,top:0,width:400,height:720}),
    });
  }
  return elements.get(id);
}
const storage=new Map();
const sandbox=vm.createContext({
  console,URLSearchParams,location:{search:''},performance:{now:()=>time},
  Image:class {complete=true;naturalWidth=4096;naturalHeight=4096;},
  document:{getElementById:element,createElement:()=>element(Symbol()),querySelectorAll:()=>[],addEventListener(){},documentElement:{},body:{dataset:{}}},
  window:{innerWidth:400,innerHeight:720,devicePixelRatio:1,addEventListener(){}},
  localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)},
  requestAnimationFrame:fn=>frames.push(fn),setTimeout(){},setInterval(){},
});
for (const file of ['battle','game','maps','career','chars','world']) {
  vm.runInContext(fs.readFileSync(new URL(`js/${file}.js`,root),'utf8'),sandbox,{filename:`js/${file}.js`});
}
function tick(count) {
  for(let i=0;i<count;i++) {
    assert(frames.length,'Game animation loop stopped');
    const fn=frames.shift();time+=1000/60;fn(time);
  }
}
const api=vm.runInContext(`({S,world,ball,battle:BATTLE,maps:WORLD_MAPS,oppChar,startGame,careerStartBattle,matchOver,pickToss,
  setup(mid,id) {
    save=newSave('male'); const starter=STARTERS[1]; addRacket(starter.blade,starter.rubber); save.story.racket=true;
    save.beaten={t_lin:true,pe:true,h3:true,boss_dir:true};delete save.beaten[id];
    worldEnter(false);loadMap(mid,1,4,'down');
    const n=world.npcs.find(n=>n.d.id===id);
    const adjacent=Object.entries(DIRV).find(([dir,[dx,dy]])=>!blocked(n.x-dx,n.y-dy) && !world.m.warpAt[(n.x-dx)+','+(n.y-dy)]);
    if(!adjacent)throw new Error('Cannot approach '+id);
    const [dir,[dx,dy]]=adjacent; Object.assign(world,{x:n.x-dx,y:n.y-dy,dir,moving:false});
    pressA();
    if(!world.dialog)throw new Error('No trainer dialogue');
    if(world.dialog.choice) answerAsk(true); else while(world.dialog) dialogNext();
  },
  aiServe(){startGame('ai');},
  win(){S.pg=1;S.ag=0;matchOver();},
  tournament(){careerStartBattle({kind:'tournament',op:EVENT_TIERS[0].events[0].ops[0],bestOf:1,toss:true});}
})`,sandbox);
let trainers=0;
const png=fs.readFileSync(new URL(api.battle.img,root));
const atlasWidth=png.readUInt32BE(16), atlasHeight=png.readUInt32BE(20);
for(const [role,animations] of Object.entries(api.battle.spr)) for(const [action,cells] of Object.entries(animations)) {
  assert(cells.length,`${role}: empty ${action} animation`);
  assert(Number.isFinite(api.battle.pad[role][action]),`${role}: invalid paddle position`);
  for(const [x,y,w,h,center] of cells) {
    assert([x,y,w,h,center].every(Number.isFinite) && w>0 && h>0,`${role}: invalid frame`);
    assert(x>=0 && y>=0 && x+w<=atlasWidth && y+h<=atlasHeight,`${role}: frame outside image`);
  }
}
assert(api.battle.spr.grandma,'Grandma battle sprites are missing');
assert.notDeepEqual(api.battle.spr.grandma.idle,api.battle.spr['15_female_referee'].idle,'Grandma shares referee frames');
assert.equal(api.battle.portrait.grandma,'assets/portraits/grandma.png');
for (const [mid,map] of Object.entries(api.maps)) for (const trainer of map.trainers) {
  api.setup(Number(mid),trainer.id);
  battleDraws=0;
  battleRegions.clear();
  // Includes the flash transition, the first battle frame, and the following animation frames.
  tick(90);
  assert.equal(api.S.mode,'play',`${trainer.name}: did not enter match`);
  assert.equal(api.S.oppName,trainer.name);
  assert(api.battle.spr[api.oppChar()],`${trainer.name}: missing battle animation`);
  assert.equal(api.oppChar(),trainer.sprite,`${trainer.name}: wrong character image`);
  const expectedRegions=new Set(Object.values(api.battle.spr[trainer.sprite]).flat().map(f=>f.slice(0,4).join(',')));
  assert([...battleRegions].every(region=>expectedRegions.has(region)),`${trainer.name}: drew another character's frames`);
  assert(battleDraws>0,`${trainer.name}: opponent was not drawn`);
  assert(!element('pause').classList.contains('hidden'),'Match controls not shown');
  if(trainers<2) {
    api.aiServe();tick(360);
    assert(api.S.ps+api.S.as>0,'No point could be played');
  }
  api.win();
  assert.equal(api.S.mode,'world','Match did not return to map');
  assert(!element('worldUI').classList.contains('hidden'),'Map controls not restored');
  tick(2);
  trainers++;
}
api.careerStartBattle({kind:'trainer',op:{name:'Missing sprite',sprite:'not-built',char:'female',style:'allround',str:.1},bestOf:1});
tick(90);
assert.equal(api.oppChar(),'female','Unavailable sprite has no safe fallback');
api.careerStartBattle({kind:'trainer',op:{name:'Existing sprite',sprite:'female',char:'male',style:'allround',str:.1},bestOf:1});
tick(90);
assert.equal(api.oppChar(),'female','Available custom battle sprite was ignored');
api.tournament();tick(240);api.pickToss('L');tick(120);
assert(!element('tossOv').classList.contains('hidden'),'Tournament toss not shown');
api.startGame('ai');tick(180);assert.equal(api.S.mode,'play');
for(const char of ['male','female']) {
  api.S.careerMatch=false;api.S.char=char;api.startGame('ai');tick(90);
  assert.notEqual(api.oppChar(),char,'Direct match opponent incorrect');
}
console.log(`PASS: ${trainers} trainer conversations → matches → map return; points played, tournament toss and both direct-match characters.`);
