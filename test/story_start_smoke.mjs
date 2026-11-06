// Run: node test/story_start_smoke.mjs
// Opening story: Mom before leaving, no racket on the way, the first lesson with Han Yu, and spins learned later.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const root=new URL('../',import.meta.url), elements=new Map(), frames=[];
let time=0;
function element(id) {
  if (!elements.has(id)) {
    const classes=new Set(['hidden']);
    elements.set(id, {style:{},dataset:{},width:220,height:240,textContent:'',innerHTML:'',
      classList:{add(c){classes.add(c);},remove(c){classes.delete(c);},contains(c){return classes.has(c);},toggle(c,on){if(on)classes.add(c);else classes.delete(c);}},
      addEventListener(){},getContext:()=>new Proxy({},{get:(t,k)=>k==='measureText'?s=>({width:String(s).length*8}):k.startsWith?.('create')?()=>({addColorStop(){}}):()=>{}}),
      querySelectorAll:()=>[],getBoundingClientRect:()=>({left:0,top:0,width:400,height:720}),
    });
  }
  return elements.get(id);
}
const storage=new Map();
const sandbox=vm.createContext({
  console,URLSearchParams,navigator:{},location:{search:''},performance:{now:()=>time},
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
  for(let i=0;i<count;i++) { const fn=frames.shift(); assert(fn,'Game animation loop stopped'); time+=1000/60; fn(time); }
}
const api=vm.runInContext(`({S,world,ball,get save(){return save;},ACTS,STARTERS,lessonDue,
  newGame(){S.char='male';ui.view='intro';ACTS.begin();},
  // Stand next to someone, face them and tap.
  talkTo(name){
    const n=world.npcs.find(n=>n.d.name===name||n.d.id===name);
    const [dir,[dx,dy]]=Object.entries(DIRV).find(([d,[dx,dy]])=>!blocked(n.x-dx,n.y-dy)&&!world.m.warpAt[(n.x-dx)+','+(n.y-dy)]);
    Object.assign(world,{x:n.x-dx,y:n.y-dy,dir,moving:false});pressA();
  },
  readAll(){const seen=[];while(world.dialog&&!world.dialog.choice){seen.push(world.dialog.lines[world.dialog.i]);dialogNext();}return seen;},
  answer:answerAsk,loadMap,tryStep,arrive,
  swing(dirY){S.phase='rally';Object.assign(ball,{x:0,y:1,z:-1,vx:0,vy:0,vz:0,top:0,side:0});playerShot(.7,0,dirY,0,0,0);return {top:ball.top,side:ball.side};},
  aiKinds(){const d=DIFF[S.diff]=Object.assign({},DIFF.hard,{p:{loop:.25,chop:.25,short:.2,side:.25}});const seen=new Set();for(let i=0;i<200;i++){aiShot(false);seen.add(S.lastKind);}return [...seen];},
  matchOver(won){S.pg=won?1:0;S.ag=won?0:1;matchOver();},
})`,sandbox);
const {S,world}=api;

// New game: wake up upstairs, Mom stops you at the front door until you talk to her.
api.newGame();
assert.equal(world.id,15,'New game must start in the bedroom');
api.readAll();
api.loadMap(2,6,10,'down'); api.tryStep('down'); api.arrive();
assert.equal(world.id,2); assert(api.readAll()[0].includes('等一下'),'Mom must call you back');
api.talkTo('媽媽');
assert(api.readAll().some(l=>l.includes('爸爸')&&l.includes('比賽')),'Mom must mention Dad\'s match');
assert(api.save.story.mom);
api.loadMap(2,6,10,'down'); api.tryStep('down'); api.arrive();
assert(world.fade,'After talking to Mom you can leave');
world.fade=null;

// No racket yet: nobody on the way starts a match.
api.loadMap(1,10,14,'left'); api.talkTo('n1');
assert.equal(S.mode,'world'); assert(api.readAll()[0].includes('沒有球拍'),'Trainers must not battle before the lesson');

// PE class: the coach hands out a racket, then the first match against Han Yu is a short tutorial.
api.loadMap(8,4,4,'up'); api.talkTo('桌球陳教練'); api.readAll();
api.ACTS.pickStarter(1); api.ACTS.takeStarter();
const lesson=api.readAll();
assert(lesson.some(l=>l.includes('平擊')),'The coach must teach the flat drive first');
assert(lesson.some(l=>l.includes('韓宇')),'Han Yu must be the tutorial opponent');
tick(90);
assert.equal(S.mode,'play','Tutorial match must start'); assert.equal(S.oppName,'勁敵 韓宇');
assert(S.careerTutorial); assert.equal(S.pts,5,'Tutorial is a 5-point game');

// Only flat drives at first, for both sides.
for (const dirY of [-1,1]) {
  const {top}=api.swing(dirY);
  assert(top<=0.25 && top>=-0.15,'Unlearned topspin/backspin must come out flat');
}
assert.equal(api.swing(0).side<=0.35,true,'Unlearned sidespin must come out flat');
assert.deepEqual(api.aiKinds(),['drive'],'Opponents must only use spins you know');

// Losing the tutorial costs nothing; winning it later counts as beating Han Yu.
const money=api.save.money;
api.matchOver(false);
assert.equal(api.save.money,money,'Losing the tutorial must be free');
assert(!api.save.beaten.rival1); api.readAll();

// Beating the three teachers unlocks a backspin lesson with the coach.
Object.assign(api.save.beaten,{t_lin:true,pe:true,h3:true});
assert.equal(api.lessonDue().key,'chop');
api.loadMap(8,4,4,'up'); api.talkTo('桌球陳教練'); api.readAll();
api.answer(true); tick(5);
assert(S.practice && S.lesson==='chop','Backspin lesson must start');
S.prHits=2; S.lastShotSpin='chop';
// Three successful backspin shots finish the lesson and return to the gym.
vm.runInContext("practiceResult(true,'out')",sandbox);
assert(S.lessonDone);
tick(200);
assert.equal(S.mode,'world','Lesson must return to the map');
assert(api.save.skills.chop,'Backspin must be learned');
assert(api.readAll().some(l=>l.includes('下旋切球')));
S.careerMatch=true;
assert(api.swing(1).top< -0.3,'Learned backspin must come out as backspin');
assert(api.swing(-1).top<=0.25,'Topspin is still locked');
S.careerMatch=false;
console.log('PASS: Mom stops you at the door, no battles before class, Han Yu tutorial, flat-only start and the backspin lesson.');
