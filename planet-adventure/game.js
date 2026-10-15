/* 게임: 플레이어, 전투, 몬스터, 보스, HUD, 구역 이동 */
(function(){
'use strict';
const {R,C,V3,clamp,renderer,scene,cam,orient,toN,arc,dirTo,moveAlong,stepOn,turnToward,pointAt,load,inst,findClip,ZONES,SOLID,rnd,PI,onPath}=W;
const $=id=>document.getElementById(id);
const S={zone:null,Z:null,world:null,cls:'warrior',running:false,kills:0,bossDead:false,t:0,ents:[],projs:[],fxs:[],decals:[],solids:[],portals:[],npcs:[],wells:[],mixers:[],lock:null,boss:null,switching:false,dead:false,sun:null,camPos:V3(0,6,8),camUp:V3(0,1,0),snap:true,talk:0};
const pl={n:V3(0,1,0),f:V3(0,0,-1),cf:V3(0,0,-1),hp:100,mhp:100,st:100,mst:100,stDelay:0,inv:0,roll:0,rollDir:V3(0,0,-1),atkT:0,atkFire:0,atkDone:true,atkKind:'',skCd:0,pitch:0.5,flash:0,ref:null,act:''};
const K={};const joy={x:0,y:0};
const tmpv=V3(0,0,0);
const any=n=>{const t=V3(0,0,0).crossVectors(n,V3(0,0,1));if(t.length()<1e-3)t.crossVectors(n,V3(1,0,0));return t.normalize();};
const lin=h=>new THREE.Color(h).convertSRGBToLinear();

/* ---------- 소리 ---------- */
let AC=null,soundOn=true;
function sfx(t){if(!AC||!soundOn)return;const T={hit:[240,80,.12,'square',.07],swing:[520,180,.1,'sawtooth',.05],hurt:[170,55,.25,'sawtooth',.09],cast:[380,920,.22,'sine',.08],boom:[110,30,.45,'triangle',.14],win:[520,1050,.6,'triangle',.09],roll:[320,140,.14,'sine',.06],fire:[260,520,.3,'sawtooth',.06]}[t];if(!T)return;
try{const o=AC.createOscillator(),g=AC.createGain(),n=AC.currentTime;o.type=T[3];o.frequency.setValueAtTime(T[0],n);o.frequency.exponentialRampToValueAtTime(T[1],n+T[2]);g.gain.setValueAtTime(T[4],n);g.gain.exponentialRampToValueAtTime(0.0001,n+T[2]);o.connect(g);g.connect(AC.destination);o.start(n);o.stop(n+T[2]+0.02);}catch(e){}}

/* ---------- UI 도우미 ---------- */
let toastTimer=0;
function toast(msg,ms){const t=$('toast');t.textContent=msg;t.classList.add('on');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('on'),ms||1800);}
function toScreen(v){const p=v.clone().project(cam);return {x:(p.x*0.5+0.5)*W.stage.clientWidth,y:(-p.y*0.5+0.5)*W.stage.clientHeight,z:p.z};}
function floater(worldPos,text,color){const s=toScreen(worldPos);if(s.z>1)return;const d=document.createElement('div');d.className='fl';d.textContent=text;d.style.left=s.x+'px';d.style.top=s.y+'px';d.style.color=color||'#fff';$('floaters').appendChild(d);setTimeout(()=>d.remove(),950);}
const wp=(n,lift)=>C.clone().addScaledVector(n,R+lift);

/* ---------- 이펙트, 장판 ---------- */
const bm=(c,o,two)=>new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:o,depthWrite:false,side:two?THREE.DoubleSide:THREE.FrontSide});
function addFx(obj,life,upd,delay){S.world.add(obj);S.fxs.push({o:obj,b:S.t+(delay||0),life,upd});}
function fxTick(){for(let i=S.fxs.length-1;i>=0;i--){const f=S.fxs[i],k=(S.t-f.b)/f.life;if(k<0){f.o.visible=false;continue;}f.o.visible=true;if(k>=1){S.world.remove(f.o);S.fxs.splice(i,1);}else f.upd(k);}}
function ringBurst(n,r0,r1,color,life,lift){const m=new THREE.Mesh(new THREE.RingGeometry(0.8,1,48),bm(color,0.9,true));m.rotation.x=-PI/2;const g=new THREE.Group();g.add(m);orient(g,n,any(n),lift||0.2);addFx(g,life,k=>{const s=r0+(r1-r0)*k;m.scale.setScalar(s);m.material.opacity=0.9*(1-k);});}
function glowBall(n,lift,r,color,life,grow){const m=new THREE.Mesh(new THREE.SphereGeometry(r,14,10),bm(color,0.85));m.position.copy(wp(n,lift));addFx(m,life,k=>{m.scale.setScalar(1+k*grow);m.material.opacity=0.85*(1-k);});}
function decalRing(n,r,color,life,onEnd){const g=new THREE.Group(),o=new THREE.Mesh(new THREE.RingGeometry(r*0.94,r,48),bm(color,0.95)),f=new THREE.Mesh(new THREE.CircleGeometry(r,48),bm(color,0.32));o.rotation.x=f.rotation.x=-PI/2;f.scale.setScalar(0.01);g.add(o,f);orient(g,n,any(n),0.16);S.world.add(g);
const d={g,b:S.t,life,upd:k=>f.scale.setScalar(Math.max(0.01,k)),end:onEnd};S.decals.push(d);return d;}
function decalStrip(n,f0,len,w,color,life,onEnd){const g=new THREE.Group(),o=new THREE.Mesh(new THREE.PlaneGeometry(w,len),bm(color,0.3)),fill=new THREE.Mesh(new THREE.PlaneGeometry(w,len),bm(color,0.5));o.rotation.x=fill.rotation.x=-PI/2;o.position.z=fill.position.z=len/2;fill.scale.set(1,1,0.01);g.add(o,fill);orient(g,n,f0,0.16);S.world.add(g);
const d={g,b:S.t,life,upd:k=>{const s=Math.max(0.01,k);fill.scale.set(1,s,1);fill.position.z=len*s/2*0+ (len/2)*s;},end:onEnd};
/* PlaneGeometry는 XY 평면. x축으로 눕히면 길이가 z축으로 향한다 */
S.decals.push(d);return d;}
function decalTick(){for(let i=S.decals.length-1;i>=0;i--){const d=S.decals[i],k=(S.t-d.b)/d.life;if(d.cancel||k>=1){S.world.remove(d.g);S.decals.splice(i,1);if(!d.cancel&&d.end)d.end();}else d.upd(k);}}

/* ---------- 투사체 ---------- */
function spawnProj(o){const m=new THREE.Group(),core=new THREE.Mesh(new THREE.SphereGeometry(o.rad*0.7,12,10),bm(o.color,1)),halo=new THREE.Mesh(new THREE.SphereGeometry(o.rad*1.35,12,10),bm(o.color,0.3));m.add(core,halo);S.world.add(m);
const p=Object.assign({m,life:2,home:null},o);p.n=o.n.clone();p.f=o.f.clone();S.projs.push(p);m.position.copy(wp(p.n,p.lift));return p;}
function projTick(dt){for(let i=S.projs.length-1;i>=0;i--){const p=S.projs[i];let dead=false;p.life-=dt;
if(p.home&&p.home.state!=='dead'){const d=dirTo(p.n,p.home.n);if(d)turnToward(p.f,d,p.n,2.6*dt);}
moveAlong(p.n,p.f.clone(),p.spd*dt,[p.f]);p.m.position.copy(wp(p.n,p.lift));
if(p.from==='enemy'){if(!S.dead&&arc(p.n,pl.n)<p.rad+0.55&&Math.abs(p.lift-0.9)<1.4){if(hurt(p.dmg,p.n,0.9))dead=true;else if(pl.roll>0){}}}
else{for(const e of S.ents){if(e.state==='dead')continue;if(arc(p.n,e.n)<p.rad+e.spec.rad&&Math.abs(p.lift-(e.lift+e.spec.h*0.4))<2.2){hitEnt(e,p.dmg,p.n,1.2);glowBall(p.n,p.lift,0.4,p.color,0.35,3);ringBurst(p.n,0.4,2.2,p.color,0.35,p.lift);dead=true;break;}}}
if(p.life<=0)dead=true;if(dead){S.world.remove(p.m);S.projs.splice(i,1);}}}

/* ---------- 데미지 ---------- */
function hurt(d,srcN,kb){if(S.dead||pl.inv>0||!S.running)return false;pl.hp=Math.max(0,pl.hp-d);pl.inv=0.65;pl.flash=0.18;pl.atkT=0;$('vig').classList.add('on');setTimeout(()=>$('vig').classList.remove('on'),120);sfx('hurt');
floater(wp(pl.n,2.1),'-'+Math.round(d),'#ff7a6b');
if(srcN){const dir=dirTo(pl.n,srcN);if(dir)moveAlong(pl.n,dir.negate(),kb||0.8,[pl.f,pl.cf,pl.rollDir]);}
if(pl.hp<=0)die();return true;}
function hitEnt(e,d,fromN,kb){if(e.state==='dead')return;e.hp-=d;e.flash=0.14;sfx('hit');floater(wp(e.n,e.lift+e.spec.h),String(Math.round(d)),'#fff2a8');
if(!e.boss&&kb&&fromN){const dir=dirTo(e.n,fromN);if(dir)moveAlong(e.n,dir.negate(),kb,[e.f]);}
if(!e.boss&&e.spec.kind!=='x'&&e.state!=='dash'){e.stun=0.28;if(e.state==='wind'){if(e.decal)e.decal.cancel=true;e.state='recover';e.t=0;}}
if(e.hp<=0)killEnt(e);}
function killEnt(e){e.state='dead';e.t=0;if(e.decal)e.decal.cancel=true;play(e,'die',0.1,true);if(S.lock===e)S.lock=null;if(e.boss){S.bossDead=true;sfx('win');victory();}else{S.kills++;updateQuest();if(S.kills===3)toast('보스방 문이 열렸어요!',2600);}}

/* ---------- 애니메이션 ---------- */
function mkActs(holder,anims,names){const mx=new THREE.AnimationMixer(holder);const acts={};for(const k in names){const c=findClip(anims,names[k]);if(c)acts[k]=mx.clipAction(c);}S.mixers.push(mx);return {mx,acts};}
function play(o,name,fade,once,speed){const a=o.acts[name];if(!a||o.cur===name&&!once)return;const prev=o.acts[o.cur];if(once){a.reset();a.setLoop(THREE.LoopOnce,1);a.clampWhenFinished=true;}else a.setLoop(THREE.LoopRepeat,Infinity);a.timeScale=speed||1;a.enabled=true;a.play();if(prev&&prev!==a)a.crossFadeFrom(prev,fade||0.15,false);o.cur=name;}
const MON={idle:'Idle',walk:'Walk',atk:'Bite_Front',hit:'HitRecieve',die:'Death',fly:'Flying'};

/* ---------- 플레이어 ---------- */
const WT={sword:{p:[0,8,0],r:[PI/2,0,0]},shield:{p:[0,6,0],r:[0,-PI/2,0]},staff:{p:[0,8,0],r:[0,0,-PI/2]}};
function attach(root,bone,obj,cfg){const b=root.getObjectByName(bone);if(!b)return null;const ws=V3(0,0,0);b.getWorldScale(ws);const w=new THREE.Group();w.scale.setScalar(1/ws.x);w.position.set(...cfg.p);w.rotation.set(...cfg.r);w.add(obj);b.add(w);return w;}
function makeStaff(){const g=new THREE.Group(),wood=new THREE.MeshToonMaterial({color:0xb98a55,emissive:0x2a1608});
const shaft=new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.028,1.55,10),wood);shaft.position.y=0.4;g.add(shaft);
const claw=new THREE.Mesh(new THREE.TorusGeometry(0.1,0.017,8,16),wood);claw.position.y=1.14;claw.rotation.x=PI/2;g.add(claw);
const tip=new THREE.Mesh(new THREE.SphereGeometry(0.1,16,12),new THREE.MeshBasicMaterial({color:0x9ee8ff}));tip.position.y=1.22;g.add(tip);
const halo=new THREE.Mesh(new THREE.SphereGeometry(0.19,16,12),bm(0x6fd0ff,0.3));halo.position.y=1.22;g.add(halo);g.userData.tip=tip;return g;}
async function makeHero(cls){
const a0=await load(cls),a=a0||await load('robot'),fb=!a0;
const root=new THREE.Group(),tumble=new THREE.Group();tumble.position.y=0.9;
const holder=inst(a,cls==='mage'?1.9:1.8,{ownMat:true,tint:fb?(cls==='mage'?0x6a8cff:0xff6a5a):0,tintAmt:0.6});holder.position.y=-0.9;tumble.add(holder);root.add(tumble);
const nm=fb?{idle:'Idle',walk:'Walking',run:'Running',atk:'Punch',die:'Death'}:{idle:'Idle',walk:'Walk',run:'Run',atk:'Attack',die:'Death'};
const m=mkActs(holder,a.anims,nm);
root.updateMatrixWorld(true);let tip=null;
if(!fb){if(cls==='warrior'){const sw=await load('sword'),sh=await load('shield');
if(sw){const s=sw.obj.clone();s.scale.setScalar(1.15/sw.box.getSize(V3(0,0,0)).y);attach(holder,'RightHand',s,WT.sword);}
if(sh){const s=sh.obj.clone();s.scale.setScalar(0.72/200);attach(holder,'LeftHand',s,WT.shield);}}
else{const st=makeStaff();tip=st.userData.tip;attach(holder,'RightHand',st,WT.staff);}}
const ref={root,tumble,holder,mx:m.mx,acts:m.acts,cur:'',tip,fb,cls};play(ref,'idle',0);return ref;}
async function setClass(cls){S.cls=cls;const ref=await makeHero(cls);if(pl.ref&&pl.ref.root.parent)pl.ref.root.parent.remove(pl.ref.root);pl.ref=ref;if(S.world)S.world.add(ref.root);
pl.mhp=cls==='warrior'?120:90;pl.hp=pl.mhp;$('clsName').textContent=cls==='warrior'?'전사':'마법사';}
function aimAssist(){let best=null,bd=7;for(const e of S.ents){if(e.state==='dead')continue;const d=arc(pl.n,e.n)-e.spec.rad;if(d<bd){const dir=dirTo(pl.n,e.n);if(dir&&dir.dot(pl.f)>0.2){best=dir;bd=d;}}}return best;}
function startAtk(kind){if(S.dead||!S.running||pl.roll>0||pl.atkT>0)return;const w=S.cls==='warrior';
const cost=kind==='skill'?30:(w?12:10);if(kind==='skill'&&pl.skCd>0){toast('스킬 준비 중',700);return;}
if(pl.st<cost){toast('스태미나 부족',600);return;}
pl.st-=cost;pl.stDelay=0.7;pl.atkKind=kind;pl.atkDone=false;
const d=S.lock&&S.lock.state!=='dead'?dirTo(pl.n,S.lock.n):aimAssist();if(d)pl.f.copy(d);
const ts=w?1.9:2.6;pl.atkT=w?0.62:0.8;pl.atkFire=w?0.28:0.5;if(kind==='skill'){pl.skCd=w?4:5;pl.atkT+=0.15;pl.atkFire+=0.1;}
play(pl.ref,'atk',0.08,true,ts);sfx(w?'swing':'cast');pl.atkAge=0;}
function fireAtk(){const w=S.cls==='warrior',kind=pl.atkKind;pl.atkDone=true;
if(w&&kind==='atk'){moveAlong(pl.n,pl.f.clone(),0.7,[pl.f,pl.cf]);
const sl=new THREE.Group();[[0xfff0a8,0.9,1.7],[0xffffff,1.15,1.3]].forEach(([c,r0,r1],i)=>{const m=new THREE.Mesh(new THREE.RingGeometry(r0,r1,40,1,0.15,2.3),bm(c,1,true));m.rotation.z=-0.7;sl.add(m);m.position.set(0.1,1.15,1.25);addFx(m,0.42,k=>{m.scale.setScalar(0.75+k*0.65);m.material.opacity=(1-k)*(i?0.7:1);},i*0.04);sl.remove(m);});
let any_=false;for(const e of S.ents){if(e.state==='dead')continue;const d=arc(pl.n,e.n),dir=dirTo(pl.n,e.n);if(d<2.9+e.spec.rad&&dir&&dir.dot(pl.f)>0.35){hitEnt(e,26+Math.floor(Math.random()*7),pl.n,0.9);any_=true;}}
const g=new THREE.Group();orient(g,pl.n,pl.f,0);S.world.add(g);const m1=new THREE.Mesh(new THREE.RingGeometry(0.9,1.7,40,1,0.15,2.3),bm(0xfff0a8,1,true)),m2=new THREE.Mesh(new THREE.RingGeometry(1.15,1.3,40,1,0.15,2.3),bm(0xffffff,0.8,true));
[m1,m2].forEach(m=>{m.rotation.z=-0.7;m.position.set(0.1,1.15,1.25);g.add(m);});addFx(g,0.42,k=>{g.scale.setScalar(0.75+k*0.65);m1.material.opacity=1-k;m2.material.opacity=0.8*(1-k);});}
else if(w&&kind==='skill'){ringBurst(pl.n,0.5,4.4,0xffe08a,0.5,0.25);ringBurst(pl.n,0.3,3.2,0xffffff,0.4,0.3);sfx('boom');
for(const e of S.ents){if(e.state==='dead')continue;if(arc(pl.n,e.n)<4.2+e.spec.rad)hitEnt(e,44,pl.n,2.2);}}
else if(!w&&kind==='atk'){const tp=V3(0,0,0);(pl.ref.tip||pl.ref.holder).getWorldPosition(tp);const rel=tp.clone().sub(C),lift=rel.length()-R,n=rel.normalize();const f=pl.f.clone().addScaledVector(n,-n.dot(pl.f)).normalize();
spawnProj({n,f,spd:19,lift:Math.max(0.6,lift),rad:0.35,dmg:22,color:0x9ee8ff,from:'player',home:S.lock&&S.lock.state!=='dead'?S.lock:null,life:1.4});sfx('fire');ringBurst(pl.n,0.6,1.8,0x8fe3ff,0.45,0.2);}
else{const tn=S.lock&&S.lock.state!=='dead'?S.lock.n.clone():(()=>{const n=pl.n.clone(),f=pl.f.clone();stepOn(n,f,6.5);return n;})();
const meteor=new THREE.Mesh(new THREE.SphereGeometry(0.9,16,12),bm(0xffb36b,1));const halo=new THREE.Mesh(new THREE.SphereGeometry(1.5,16,12),bm(0xff7a3a,0.35));meteor.add(halo);S.world.add(meteor);const t0=S.t;
const d=decalRing(tn,3.4,0x6fd0ff,0.9,()=>{S.world.remove(meteor);ringBurst(tn,0.5,4.2,0xffb36b,0.5,0.25);glowBall(tn,1.2,1.2,0xffd9a0,0.5,2.5);sfx('boom');
for(const e of S.ents){if(e.state==='dead')continue;if(arc(tn,e.n)<3.4+e.spec.rad)hitEnt(e,58,tn,1.8);}});
const upd=d.upd;d.upd=k=>{upd(k);meteor.position.copy(wp(tn,14*(1-k)*(1-k)+0.8));};}}

function tryRoll(){if(S.dead||!S.running||pl.roll>0)return;if(pl.st<22){toast('스태미나 부족',600);return;}
pl.st-=22;pl.stDelay=0.6;pl.roll=0.45;pl.inv=Math.max(pl.inv,0.4);pl.atkT=0;const dir=moveVec();if(dir)pl.rollDir.copy(dir);else pl.rollDir.copy(pl.f);sfx('roll');}
function moveVec(){const ix=(K.KeyD||K.right?1:0)-(K.KeyA||K.left?1:0)+joy.x,iz=(K.KeyW?1:0)-(K.KeyS?1:0)-joy.y;if(!ix&&!iz)return null;const right=V3(0,0,0).crossVectors(pl.cf,pl.n);const v=V3(0,0,0).addScaledVector(pl.cf,iz).addScaledVector(right,ix);if(v.length()<0.05)return null;return v.normalize();}
function toggleLock(){if(S.lock){S.lock=null;return;}let best=null,bd=24;for(const e of S.ents){if(e.state==='dead')continue;const d=arc(pl.n,e.n);if(d<bd){bd=d;best=e;}}S.lock=best;}
function interact(){if(!S.running||S.dead)return;for(const w of S.wells)if(arc(pl.n,w)<3.6){pl.hp=pl.mhp;pl.st=pl.mst;toast('우물물을 마시고 체력이 가득 찼어요',1800);ringBurst(pl.n,0.5,2.5,0x6fd0ff,0.6,0.2);return;}
for(const n of S.npcs)if(arc(pl.n,n.n)<3.8){toast(n.talk[S.talk++%n.talk.length],3200);return;}}

function updatePlayer(dt){const ref=pl.ref;if(!ref)return;
pl.inv=Math.max(0,pl.inv-dt);pl.skCd=Math.max(0,pl.skCd-dt);pl.stDelay-=dt;if(pl.stDelay<=0)pl.st=Math.min(pl.mst,pl.st+30*dt);pl.flash=Math.max(0,pl.flash-dt);
if(S.dead){orient(ref.root,pl.n,pl.f,0);return;}
const mv=S.running?moveVec():null;
if(S.running){const rot=((K.ArrowRight?1:0)-(K.ArrowLeft?1:0))*1.9*dt;if(rot)pl.cf.applyAxisAngle(pl.n,-rot);
if(S.lock&&S.lock.state!=='dead'){if(arc(pl.n,S.lock.n)>34)S.lock=null;else{const d=dirTo(pl.n,S.lock.n);if(d)turnToward(pl.cf,d,pl.n,4.5*dt);}}}
let speed=0,dir=null;
if(pl.roll>0){pl.roll-=dt;speed=11;dir=pl.rollDir;const k=1-Math.max(0,pl.roll)/0.45;ref.tumble.rotation.x=k*PI*2;ref.tumble.position.y=0.9-Math.sin(k*PI)*0.15;if(pl.roll<=0){ref.tumble.rotation.x=0;ref.tumble.position.y=0.9;}}
else if(mv){speed=pl.atkT>0?2.2:6.3;dir=mv;}
if(pl.atkT>0){pl.atkAge+=dt;pl.atkT-=dt;if(!pl.atkDone&&pl.atkAge>=pl.atkFire)fireAtk();}
if(dir&&speed>0)moveAlong(pl.n,dir,speed*dt,[pl.f,pl.cf,pl.rollDir]);
/* 충돌과 경계 */
for(const s of S.solids){const d=arc(pl.n,s.n);if(d<s.r+0.45){const dd=dirTo(pl.n,s.n);if(dd)moveAlong(pl.n,dd.negate(),(s.r+0.45)-d,[pl.f,pl.cf,pl.rollDir]);}}
const cN=S.cN,dc=arc(pl.n,cN);if(dc>S.Z.L){const dd=dirTo(pl.n,cN);if(dd)moveAlong(pl.n,dd,dc-S.Z.L,[pl.f,pl.cf,pl.rollDir]);}
/* 바라보는 방향 */
if(pl.roll>0)pl.f.copy(pl.rollDir);
else if(S.lock&&S.lock.state!=='dead'){const d=dirTo(pl.n,S.lock.n);if(d&&pl.atkT<=0.0001||d&&!pl.atkDone===false)turnToward(pl.f,d,pl.n,12*dt);}
else if(mv&&pl.atkT<=0)turnToward(pl.f,mv,pl.n,14*dt);
orient(ref.root,pl.n,pl.f,0);
/* 애니메이션 */
if(pl.atkT<=0&&pl.roll<=0&&ref.cur==='atk'&&(!ref.acts.atk||!ref.acts.atk.isRunning()||pl.atkT<=0)){}
if(pl.roll>0)play(ref,'run',0.05,false,1.6);
else if(pl.atkT>0){}
else if(mv)play(ref,'run',0.15,false,1);
else play(ref,'idle',0.2,false,1);
if(pl.atkT<=0&&ref.cur==='atk')ref.cur='';
ref.holder.userData.mats.forEach(m=>m.emissive.setHex(pl.flash>0?0xaa2200:(pl.inv>0&&pl.roll<=0&&Math.floor(S.t*20)%2?0x333333:0)));
}
function die(){S.dead=true;S.lock=null;play(pl.ref,'die',0.1,true);$('over').hidden=false;$('overT').textContent='쓰러졌어요';$('overP').textContent='마을에서 다시 시작해요';
setTimeout(()=>{if(!S.dead)return;$('over').hidden=true;pl.hp=pl.mhp;pl.st=pl.mst;S.dead=false;S.bossDead=false;goZone('village');},3200);}
function victory(){setTimeout(()=>{$('over').hidden=false;$('overT').textContent='보스 처치!';$('overP').textContent='드래곤을 쓰러뜨렸어요. 가운데 문으로 마을에 돌아갈 수 있어요';sfx('win');},1400);
setTimeout(()=>{$('over').hidden=true;},5200);
const c=S.cN;S.portals.push(makePortal({id:'toVillage',n:c.clone(),to:'village',label:'마을로 돌아가는 문'}));updateQuest();}

/* ---------- 몬스터 ---------- */
const EN={
cactus:{a:'cactus',name:'선인장',h:1.5,hp:60,spd:3.2,aggro:12,kind:'melee',range:2.0,wind:0.75,cd:1.6,dmg:12,rad:0.7,r2:2.4,fly:0},
alien:{a:'alien',name:'외계인',h:1.5,hp:50,spd:3.6,aggro:13,kind:'lunge',range:6,wind:0.7,cd:2.0,dmg:14,rad:0.7,dash:6,dashT:0.35,fly:0},
mushroom:{a:'mushroom',name:'버섯',h:1.4,hp:80,spd:1.9,aggro:14,kind:'ranged',range:9,wind:0.9,cd:2.6,dmg:10,rad:0.8,proj:7,fly:0},
bee:{a:'bee',name:'벌',h:1.2,hp:35,spd:5,aggro:15,kind:'lunge',range:7,wind:0.6,cd:1.8,dmg:10,rad:0.6,dash:7,dashT:0.3,fly:1.5},
bat:{a:'bat',name:'박쥐',h:1.2,hp:30,spd:5.5,aggro:15,kind:'lunge',range:7,wind:0.55,cd:1.7,dmg:8,rad:0.6,dash:7,dashT:0.28,fly:1.9},
dragon:{a:'dragon',name:'하늘의 폭군 드래곤',h:4.6,hp:760,spd:3.4,aggro:99,kind:'boss',range:99,rad:2.3,fly:0.8}};
async function spawnEnt(type,n,f){const spec=EN[type],a=await load(spec.a);if(!a)return null;
const holder=inst(a,spec.h,{ownMat:true}),root=new THREE.Group();root.add(holder);S.world.add(root);
const m=mkActs(holder,a.anims,MON);const e={type,spec,root,holder,mx:m.mx,acts:m.acts,cur:'',n:n.clone(),f:f.clone(),hp:spec.hp,mhp:spec.hp,state:'idle',t:0,cd:1+Math.random(),stun:0,flash:0,lift:spec.fly,decal:null,boss:type==='dragon',bob:Math.random()*6,home:n.clone()};
if(a.anims.length&&!e.acts.idle&&e.acts.fly)e.acts.idle=e.acts.fly;play(e,spec.fly?'fly':'idle',0);S.ents.push(e);orient(root,e.n,e.f,e.lift);return e;}
function faceTo(e,t,rate,dt){const d=dirTo(e.n,t);if(d)turnToward(e.f,d,e.n,rate*dt);}
function updateEnt(e,dt){const sp=e.spec;e.bob+=dt*3;
for(const m of e.holder.userData.mats)m.emissive.setHex(e.flash>0?0xaa3010:(e.state==='wind'&&Math.floor(S.t*16)%2?0x551100:0));e.flash=Math.max(0,e.flash-dt);
if(e.state==='dead'){e.t+=dt;if(e.t>1.1){const k=Math.min(1,(e.t-1.1)/0.5);e.root.scale.setScalar(1-k);if(k>=1){S.world.remove(e.root);e.gone=true;}}orient(e.root,e.n,e.f,e.lift*0.4);return;}
if(e.boss){updateBoss(e,dt);return;}
e.cd-=dt;const d=arc(e.n,pl.n);
if(e.stun>0){e.stun-=dt;orient(e.root,e.n,e.f,e.lift);return;}
if(e.state==='idle'){if(!S.dead&&d<sp.aggro){e.state='chase';}}
else if(e.state==='chase'){if(S.dead||d>sp.aggro*1.8){e.state='idle';play(e,sp.fly?'fly':'idle',0.2);}
else{faceTo(e,pl.n,5,dt);play(e,sp.fly?'fly':(e.acts.walk?'walk':'idle'),0.2);if(d>sp.range*0.7||sp.kind==='ranged'&&d>sp.range*0.8)moveAlong(e.n,e.f.clone(),sp.spd*dt,[e.f]);
else if(sp.kind==='ranged'&&d<4)moveAlong(e.n,e.f.clone().negate(),sp.spd*dt*0.8,[e.f]);
if(d<sp.range&&e.cd<=0)startWind(e);}}
else if(e.state==='wind'){e.t+=dt;if(e.t<sp.wind*0.6)faceTo(e,pl.n,8,dt);if(e.t>=sp.wind)execAtk(e);}
else if(e.state==='dash'){e.t+=dt;moveAlong(e.n,e.f.clone(),sp.dash/sp.dashT*dt,[e.f]);if(!e.hit&&arc(e.n,pl.n)<sp.rad+0.65){e.hit=true;hurt(sp.dmg,e.n,1.2);}if(e.t>=sp.dashT){e.state='recover';e.t=0;}}
else if(e.state==='recover'){e.t+=dt;if(e.t>0.7){e.state='chase';e.cd=sp.cd;}}
/* 겹침 방지 */
for(const o of S.ents){if(o===e||o.state==='dead'||o.boss)continue;const dd=arc(e.n,o.n);if(dd<1.0){const dir=dirTo(e.n,o.n);if(dir)moveAlong(e.n,dir.negate(),(1.0-dd)*0.5,[e.f]);}}
for(const s of S.solids){const dd=arc(e.n,s.n);if(dd<s.r+0.4){const dir=dirTo(e.n,s.n);if(dir)moveAlong(e.n,dir.negate(),(s.r+0.4)-dd,[e.f]);}}
const dc=arc(e.n,S.cN);if(dc>S.Z.L-0.5){const dir=dirTo(e.n,S.cN);if(dir)moveAlong(e.n,dir,dc-(S.Z.L-0.5),[e.f]);}
const wob=e.type==='mushroom'&&(e.state==='chase')?Math.abs(Math.sin(e.bob*1.6))*0.12:0;
e.lift=sp.fly?sp.fly+Math.sin(e.bob)*0.25-(e.state==='dash'?0.9:0):0;
orient(e.root,e.n,e.f,e.lift+wob);}
function startWind(e){const sp=e.spec;e.state='wind';e.t=0;e.hit=false;
if(sp.kind==='melee'){e.decal=decalRing(e.n,sp.r2,0xff4a4a,sp.wind);}
else if(sp.kind==='lunge'){const f0=e.f.clone();e.decal=decalStrip(e.n,f0,sp.dash+0.8,1.5,0xff4a4a,sp.wind);}
else e.decal=decalRing(e.n,1.1,0xffb04a,sp.wind);
play(e,e.acts.atk?'atk':(sp.fly?'fly':'idle'),0.1,!!e.acts.atk);}
function execAtk(e){const sp=e.spec;e.decal=null;
if(sp.kind==='melee'){ringBurst(e.n,0.4,sp.r2,0xff6a4a,0.35,0.2);if(arc(e.n,pl.n)<sp.r2){hurt(sp.dmg,e.n,1.5);}e.state='recover';e.t=0;e.cd=sp.cd;}
else if(sp.kind==='lunge'){e.state='dash';e.t=0;e.hit=false;}
else{const d=dirTo(e.n,pl.n)||e.f;spawnProj({n:e.n.clone(),f:d.clone(),spd:sp.proj,lift:0.9,rad:0.4,dmg:sp.dmg,color:0xffa04a,from:'enemy',life:2.6});sfx('fire');e.state='recover';e.t=0;e.cd=sp.cd;}}

/* ---------- 보스 ---------- */
const BP={fire:{wind:1.0,total:1.9},slam:{total:1.8},charge:{total:3.2},nova:{total:2.6}};
function updateBoss(b,dt){const sp=b.spec;b.cd-=dt;const d=arc(b.n,pl.n);
if(!b.awake){b.t+=dt;if(b.t>1.4&&!S.dead){b.awake=true;b.pat=null;b.t=0;$('bossBar').hidden=false;toast('하늘의 폭군 드래곤',2000);b.wait=0.8;}orient(b.root,b.n,b.f,b.lift+Math.sin(b.bob)*0.15);return;}
if(S.dead){b.pat=null;faceTo(b,pl.n,2,dt);orient(b.root,b.n,b.f,b.lift+Math.sin(b.bob)*0.15);return;}
if(b.hp<=b.mhp*0.5&&!b.p2){b.p2=true;b.pat=null;b.wait=0.6;toast('드래곤이 화났어요!',2000);ringBurst(b.n,1,9,0xff5a3a,0.8,0.3);sfx('boom');b.holder.userData.mats.forEach(m=>{if(m.color)m.color.lerp(new THREE.Color(0xff6a4a),0.35);});}
b.lift=sp.fly+Math.sin(b.bob)*0.2;
if(!b.pat){b.wait-=dt;faceTo(b,pl.n,4,dt);play(b,'fly',0.2,false,b.p2?1.3:1);
const ideal=8.5;if(d>ideal+2)moveAlong(b.n,b.f.clone(),sp.spd*dt,[b.f]);else if(d<ideal-3)moveAlong(b.n,b.f.clone().negate(),sp.spd*0.8*dt,[b.f]);
else{const side=V3(0,0,0).crossVectors(b.n,b.f);moveAlong(b.n,side.multiplyScalar(b.side||1),1.4*dt,[b.f]);}
if(b.wait<=0){const opts=['fire','slam','charge'];if(b.p2)opts.push('nova','slam');let p;do{p=opts[Math.floor(Math.random()*opts.length)];}while(p===b.last&&opts.length>1);b.last=p;b.pat=p;b.pt=0;b.fired=0;b.side=Math.random()<0.5?-1:1;}}
else{b.pt+=dt;const p=b.pat,pt=b.pt;
if(p==='fire'){faceTo(b,pl.n,6,dt);if(pt<0.1&&!b.pa){b.pa=true;play(b,'atk',0.1,true);}
if(pt>=1.0&&!b.fired){b.fired=1;const n=b.p2?5:3,base=dirTo(b.n,pl.n)||b.f;for(let i=0;i<n;i++){const a=(i-(n-1)/2)*0.28;const f=base.clone().applyAxisAngle(b.n,a);spawnProj({n:b.n.clone(),f,spd:12,lift:1.4,rad:0.55,dmg:18,color:0xff7a3a,from:'enemy',life:2.6});}sfx('fire');}
if(pt>=1.9)endPat(b);}
else if(p==='slam'){faceTo(b,pl.n,3,dt);if(!b.fired){b.fired=1;const cnt=b.p2?3:1;for(let i=0;i<cnt;i++){setTimeout(()=>{if(b.state==='dead'||S.dead||!S.running)return;const tn=pl.n.clone();play(b,'atk',0.1,true);decalRing(tn,3.7,0xff4a4a,1.15,()=>{ringBurst(tn,0.5,4.3,0xff7a3a,0.5,0.25);glowBall(tn,1,1.3,0xffc08a,0.4,2.5);sfx('boom');if(arc(tn,pl.n)<3.7)hurt(28,tn,1.8);});},i*650);}}
if(pt>=(b.p2?2.7:1.9))endPat(b);}
else if(p==='charge'){if(pt<1.0){faceTo(b,pl.n,b.pt<0.5?6:0.5,dt);if(!b.strip){b.dirL=null;b.strip=decalStrip(b.n,b.f.clone(),16,2.6,0xff4a4a,1.0);}
if(b.strip){b.strip.g.visible=true;const fl=b.f.clone();orient(b.strip.g,b.n,fl,0.16);}}
else if(pt<1.45){if(b.strip){b.strip.cancel=true;b.strip=null;b.lift=0.5;}if(!b.cdir){b.cdir=b.f.clone();b.hit=false;}moveAlong(b.n,b.cdir.clone(),36*dt,[b.f,b.cdir]);b.f.copy(b.cdir);if(!b.hit&&arc(b.n,pl.n)<sp.rad+0.6){b.hit=true;hurt(30,b.n,2);}
const dc=arc(b.n,S.cN);if(dc>S.Z.L-1){const dir=dirTo(b.n,S.cN);if(dir)moveAlong(b.n,dir,dc-(S.Z.L-1),[b.f,b.cdir]);}}
else{b.cdir=null;if(!b.rest){b.rest=true;b.lift=0.4;}faceTo(b,pl.n,2,dt);if(pt>=3.2){b.rest=false;endPat(b);}}}
else if(p==='nova'){faceTo(b,pl.n,3,dt);if(pt>=0.8&&b.fired<1){b.fired=1;novaRing(b,0);play(b,'atk',0.1,true);ringBurst(b.n,1,5,0xffb04a,0.6,0.3);}
if(pt>=1.6&&b.fired<2){b.fired=2;novaRing(b,0.26);}
if(pt>=2.6)endPat(b);}
b.lift=b.pat==='charge'?(b.rest?0.4:b.lift):b.lift;}
orient(b.root,b.n,b.f,(b.pat==='charge'&&b.pt>=1.0)?b.lift:b.lift);}
function novaRing(b,off){const N=14;for(let i=0;i<N;i++){if(i%7===3||i%7===4)continue;const f=b.f.clone().applyAxisAngle(b.n,i*2*PI/N+off);spawnProj({n:b.n.clone(),f,spd:9,lift:1.0,rad:0.5,dmg:14,color:0xffb04a,from:'enemy',life:3});}sfx('fire');}
function endPat(b){b.pat=null;b.pa=false;b.fired=0;b.strip=null;b.cdir=null;b.wait=b.p2?0.5:1.0;b.lift=b.spec.fly;}

/* ---------- 구역 ---------- */
function makePortal(o){const n=o.n||toN(o.th,o.ph),g=new THREE.Group(),col=o.locked?0xff5a5a:0x8fe3ff;
const ring=new THREE.Mesh(new THREE.RingGeometry(1.0,1.5,40),bm(col,0.85,true));ring.rotation.x=-PI/2;ring.position.y=0.12;
const beam=new THREE.Mesh(new THREE.CylinderGeometry(1.0,1.2,5,24,1,true),bm(col,0.2,true));beam.position.y=2.5;
const core=new THREE.Mesh(new THREE.CircleGeometry(1.0,32),bm(col,0.3,true));core.rotation.x=-PI/2;core.position.y=0.11;g.add(ring,beam,core);orient(g,n,any(n),0);S.world.add(g);
return Object.assign({},o,{n,g,ring,beam,core});}
function updateQuest(){const q=$('quest');if(!q)return;if(S.zone==='village')q.textContent='문으로 나가 필드에서 몬스터 3마리를 잡으세요 ('+Math.min(3,S.kills)+'/3)';
else if(S.zone==='field')q.textContent=S.kills>=3?'보스방 문이 열렸어요. 길 끝으로 가세요':'몬스터 처치 '+S.kills+'/3, 길 끝 문이 열려요';
else q.textContent=S.bossDead?'클리어! 가운데 문으로 마을에 돌아가요':'드래곤의 붉은 표시를 보고 구르기로 피하세요';}
async function buildZone(name){const Z=ZONES[name];S.Z=Z;S.zone=name;$('bossBar').hidden=true;
const keys=new Set([...Z.items.map(i=>i[0]),...Z.scatter.map(i=>i[0]),...(Z.ring||[]),...(Z.npcs||[]).map(n=>n.k),...(Z.spawns||[]).map(s=>s[0])]);if(name==='boss')keys.add('dragon');
await Promise.all([...keys].map(k=>load(k)));
if(S.world){scene.remove(S.world);}
const world=new THREE.Group();scene.add(world);S.world=world;S.ents=[];S.projs=[];S.fxs=[];S.decals=[];S.solids=[];S.portals=[];S.npcs=[];S.wells=[];S.mixers=[];S.lock=null;S.boss=null;
scene.background=new THREE.Color(Z.sky);scene.fog=new THREE.Fog(lin(Z.sky),Z.night?18:28,Z.night?62:85);
world.add(new THREE.HemisphereLight(Z.hemi[0],Z.hemi[1],Z.hemi[2]));
const sun=new THREE.DirectionalLight(Z.night?0xb8a8ff:0xfff4e0,Z.sun);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);const sc=sun.shadow.camera;sc.left=-16;sc.right=16;sc.top=16;sc.bottom=-16;sc.near=1;sc.far=60;sun.shadow.bias=-0.0008;world.add(sun);world.add(sun.target);S.sun=sun;
const pg=W.planetGeo();const pl_=new THREE.Mesh(pg,new THREE.MeshToonMaterial({map:W.floorTex(name)}));pl_.position.copy(C);pl_.receiveShadow=true;world.add(pl_);
const put=(a,h,n,spin)=>{const o=inst(a,h);const f=any(n).applyAxisAngle(n,spin||0);orient(o,n,f,0);world.add(o);return o;};
const A=k=>W.cache[k]?W.cache[k].__a:null;
const cN=toN(Z.center[0],Z.center[1]);S.cN=cN;
const get=async k=>await load(k);
for(const [k,h,th,ph,sp] of Z.items){if(k==='tree1'&&th>0.9)continue;const a=await get(k);if(!a)continue;const n=toN(th,ph);put(a,h,n,sp);const r=SOLID[k];if(r)S.solids.push({n,r});}
const rd=rnd(name.length*97+11);
for(const [k,h,cnt] of Z.scatter){const a=await get(k);if(!a)continue;for(let i=0;i<cnt*2;i++){const n=pointAt(cN,Math.sqrt(rd())*Z.L*0.95,rd()*PI*2);if(onPath(name,n))continue;put(a,h*(0.8+rd()*0.5),n,rd()*6);}}
/* 경계 장식 */
if(Z.ring&&Z.ring.length){const RH={brocks:1,bbush:1.1,btree4:5,rock:1,bush:.8,pine:5,tree1:4.6};const cnt=Math.floor(2*PI*Z.L/2.4);const pn=(Z.portals||[]).map(p=>toN(p.th,p.ph));
for(let i=0;i<cnt;i++){const n=pointAt(cN,Z.L+0.6,i*2*PI/cnt+rd()*0.1);if(pn.some(p=>arc(p,n)<4))continue;const k=Z.ring[i%Z.ring.length],a=await get(k);if(a)put(a,RH[k]||1,n,rd()*6);}}
/* NPC, 우물, 포탈 */
for(const nc of (Z.npcs||[])){const a=await get(nc.k);if(!a)continue;const n=toN(nc.th,nc.ph),h=inst(a,nc.h,{ownMat:true,tint:nc.tint,tintAmt:0.55});orient(h,n,any(n).applyAxisAngle(n,nc.spin||0),0);world.add(h);const m=mkActs(h,a.anims,{c:nc.clip});if(m.acts.c)m.acts.c.play();S.npcs.push({n,talk:nc.talk});}
for(const w of (Z.wells||[]))S.wells.push(toN(w.th,w.ph));
for(const p of (Z.portals||[]))S.portals.push(makePortal(Object.assign({locked:!!p.needKills&&S.kills<p.needKills},p)));
/* 몬스터 */
if(Z.spawns){for(const [t,th,ph] of Z.spawns){const n=toN(th,ph);await spawnEnt(t,n,any(n).applyAxisAngle(n,Math.random()*6));}}
if(name==='boss'){const n=toN(0.42,PI);const b=await spawnEnt('dragon',n,dirTo(n,toN(0,0))||any(n));if(b){b.awake=false;b.t=0;b.wait=1;b.p2=false;S.boss=b;b.lift=EN.dragon.fly;}}
if(S.world&&pl.ref)world.add(pl.ref.root);
if(Z.night){const st=new THREE.Group();const sg=new THREE.SphereGeometry(0.14,6,6),sm=new THREE.MeshBasicMaterial({color:0xfff6c8,fog:false});for(let i=0;i<160;i++){const s=new THREE.Mesh(sg,sm);const a=rd()*PI*2,b=0.05+rd()*1.2;s.position.set(Math.cos(a)*95*Math.cos(b),8+Math.sin(b)*70,Math.sin(a)*95*Math.cos(b)-20);st.add(s);}world.add(st);
const fire=new THREE.PointLight(0xff5a3a,2.4,34);fire.position.copy(wp(cN,7));world.add(fire);}
$('zoneName').textContent=Z.n;updateQuest();$('bossBar').hidden=true;}
async function goZone(name,instant){if(S.switching)return;S.switching=true;const f=$('fade');if(!instant){f.classList.add('on');await new Promise(r=>setTimeout(r,380));}
await buildZone(name);
pl.n.set(0,1,0);pl.f.set(0,0,-1);pl.cf.set(0,0,-1);pl.roll=0;pl.atkT=0;pl.inv=0.8;if(pl.ref){pl.ref.tumble.rotation.x=0;pl.ref.cur='';play(pl.ref,'idle',0);}
S.snap=true;S.dead=false;if(name!=='boss')S.bossDead=S.bossDead;if(S.running)toast(ZONES[name].n,1400);f.classList.remove('on');S.switching=false;}
function checkPortals(){if(S.switching||S.dead||!S.running)return;for(const p of S.portals){const d=arc(pl.n,p.n);
const locked=p.needKills&&S.kills<p.needKills;const col=locked?0xff5a5a:0x8fe3ff;p.ring.material.color.setHex(col);p.beam.material.color.setHex(col);p.core.material.color.setHex(col);p.beam.material.opacity=0.16+Math.sin(S.t*3)*0.06;p.ring.rotation.z+=0.01;
if(d<1.7){if(locked){if(S.t-(S.lastLockMsg||0)>2){S.lastLockMsg=S.t;toast('몬스터 '+p.needKills+'마리를 처치하면 열려요 ('+S.kills+'/'+p.needKills+')',2000);}}else{goZone(p.to);return;}}}}

/* ---------- HUD, 카메라 ---------- */
function hud(){$('hpFill').style.width=(pl.hp/pl.mhp*100)+'%';$('hpTxt').textContent=Math.ceil(pl.hp)+' / '+pl.mhp;$('stFill').style.width=(pl.st/pl.mst*100)+'%';
const b=S.boss;if(b&&b.awake){$('bossFill').style.width=Math.max(0,b.hp/b.mhp*100)+'%';if(b.state==='dead')$('bossBar').hidden=true;}
const lm=$('lockMark'),eh=$('ehp');if(S.lock&&S.lock.state!=='dead'&&S.running){const e=S.lock,s=toScreen(wp(e.n,e.lift+e.spec.h*0.6));if(s.z<1){lm.hidden=false;lm.style.left=s.x+'px';lm.style.top=s.y+'px';
if(!e.boss){const s2=toScreen(wp(e.n,e.lift+e.spec.h+0.5));eh.hidden=false;eh.style.left=s2.x+'px';eh.style.top=s2.y+'px';eh.firstChild.style.width=(e.hp/e.mhp*100)+'%';}else eh.hidden=true;}else{lm.hidden=true;eh.hidden=true;}}else{lm.hidden=true;eh.hidden=true;}}
function updateCamera(dt){const P=wp(pl.n,0),d=6.4,back=d*Math.cos(pl.pitch),up=1.1+d*Math.sin(pl.pitch);
const tgt=P.clone().addScaledVector(pl.cf,-back).addScaledVector(pl.n,up);
if(S.snap){S.camPos.copy(tgt);S.camUp.copy(pl.n);S.snap=false;}
const k=1-Math.exp(-9*dt);S.camPos.lerp(tgt,k);S.camUp.lerp(pl.n,1-Math.exp(-6*dt)).normalize();
cam.position.copy(S.camPos);cam.up.copy(S.camUp);const look=P.clone().addScaledVector(pl.n,1.4);
if(S.lock&&S.lock.state!=='dead')look.lerp(wp(S.lock.n,S.lock.lift+1),0.3);
cam.lookAt(look);
const right=V3(0,0,0).crossVectors(pl.cf,pl.n);S.sun.position.copy(P).addScaledVector(pl.n,16).addScaledVector(right,-8).addScaledVector(pl.cf,-3);S.sun.target.position.copy(P);}

/* ---------- 입력 ---------- */
addEventListener('keydown',e=>{if(!S.running){return;}K[e.code]=true;
if(e.code==='Space'){e.preventDefault();tryRoll();}else if(e.code==='KeyJ')startAtk('atk');else if(e.code==='KeyK')startAtk('skill');
else if(e.code==='Tab'||e.code==='KeyR'){e.preventDefault();toggleLock();}else if(e.code==='KeyF')interact();
else if(e.code.startsWith('Arrow'))e.preventDefault();
if(e.code==='ArrowLeft')K.ArrowLeft=true;if(e.code==='ArrowRight')K.ArrowRight=true;});
addEventListener('keyup',e=>{K[e.code]=false;});
addEventListener('blur',()=>{for(const k in K)K[k]=false;});
const st=W.stage;let drag=null;
st.addEventListener('contextmenu',e=>e.preventDefault());
st.addEventListener('pointerdown',e=>{if(!S.running)return;if(e.pointerType==='touch'){const left=e.clientX<innerWidth*0.5;drag={t:1,x:e.clientX,y:e.clientY,left,id:e.pointerId,ox:e.clientX,oy:e.clientY,moved:0};}else drag={t:0,x:e.clientX,y:e.clientY,b:e.button,moved:0,id:e.pointerId};try{st.setPointerCapture(e.pointerId);}catch(_){}});
st.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.moved+=Math.abs(dx)+Math.abs(dy);
if(drag.t===1&&drag.left){joy.x=clamp((e.clientX-drag.ox)/50,-1,1);joy.y=clamp((e.clientY-drag.oy)/50,-1,1);if(Math.hypot(joy.x,joy.y)<0.2){joy.x=joy.y=0;}return;}
if(drag.moved>4||drag.t===1){pl.cf.applyAxisAngle(pl.n,-dx*0.0055);pl.pitch=clamp(pl.pitch-dy*0.004,0.18,1.05);}drag.x=e.clientX;drag.y=e.clientY;});
const up=e=>{if(!drag||drag.id!==e.pointerId)return;if(drag.t===0&&drag.moved<6){if(drag.b===2)startAtk('skill');else if(drag.b===0)startAtk('atk');}if(drag.t===1&&drag.left){joy.x=joy.y=0;}drag=null;};
st.addEventListener('pointerup',up);st.addEventListener('pointercancel',up);
$('bAtk').onclick=()=>startAtk('atk');$('bSkill').onclick=()=>startAtk('skill');$('bRoll').onclick=()=>tryRoll();$('bLock').onclick=()=>toggleLock();
$('btnSnd').onclick=()=>{soundOn=!soundOn;$('btnSnd').textContent=soundOn?'소리 끄기':'소리 켜기';};
$('btnClass').onclick=async()=>{if(S.zone!=='village'){toast('직업은 마을에서만 바꿀 수 있어요',1600);return;}const c=S.cls==='warrior'?'mage':'warrior';toast('불러오는 중…',1000);await setClass(c);if(S.world)S.world.add(pl.ref.root);toast(c==='warrior'?'전사로 바꿨어요':'마법사로 바꿨어요',1400);};

/* ---------- 메인 루프 ---------- */
const clock=new THREE.Clock();let step=0;
function frame(){const dt=Math.min(clock.getDelta(),0.05);step++;
if(S.world&&S.sun){S.t+=dt;
if(S.running||true){updatePlayer(dt);for(let i=S.ents.length-1;i>=0;i--){const e=S.ents[i];updateEnt(e,dt);if(e.gone)S.ents.splice(i,1);}projTick(dt);}
S.mixers.forEach(m=>m.update(dt));fxTick();decalTick();
if(S.running){checkPortals();hud();}else{pl.cf.applyAxisAngle(pl.n,-dt*0.25);}
updateCamera(dt);renderer.render(scene,cam);}
requestAnimationFrame(frame);}

/* ---------- 시작 ---------- */
function pickCls(c){$('pWarrior').classList.toggle('on',c==='warrior');$('pMage').classList.toggle('on',c==='mage');$('go').disabled=true;$('go').textContent='불러오는 중…';
setClass(c).then(()=>{if(S.world&&pl.ref)S.world.add(pl.ref.root);$('go').disabled=false;$('go').textContent='모험 시작';});}
$('pWarrior').onclick=()=>pickCls('warrior');$('pMage').onclick=()=>pickCls('mage');
$('go').onclick=()=>{$('start').hidden=true;$('hud').hidden=false;S.running=true;S.snap=true;try{AC=new (window.AudioContext||window.webkitAudioContext)();}catch(_){}toast('마을에서 출발!',1500);pl.hp=pl.mhp;pl.st=pl.mst;updateQuest();};
(async function init(){const bar=$('load').firstChild;const total=3;let n=0;const tick=()=>{n++;bar.style.width=Math.min(100,n/total*100)+'%';};
await buildZone('village');tick();await setClass('warrior');tick();if(S.world)S.world.add(pl.ref.root);S.snap=true;tick();
bar.style.width='100%';$('go').disabled=false;$('go').textContent='모험 시작';frame();})().catch(e=>{console.error(e);$('go').textContent='불러오기 실패. 새로고침해 주세요';});
window.__g={S,pl,K,goZone,startAtk,tryRoll,toggleLock,hurt,hitEnt,fr:()=>step,EN,setClass};
})();
