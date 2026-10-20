/* 게임: 플레이어, 전투, 몬스터, 보스, HUD, 구역 이동 */
(function(){
'use strict';
const {SOLID_X,R,C,V3,clamp,renderer,scene,cam,orient,toN,arc,dirTo,moveAlong,stepOn,turnToward,pointAt,load,inst,findClip,ZONES,SOLID,rnd,PI,onPath}=W;
const $=id=>document.getElementById(id);
const S={zone:null,Z:null,world:null,cls:'warrior',running:false,kills:0,bossDead:false,t:0,ents:[],projs:[],fxs:[],decals:[],solids:[],portals:[],npcs:[],wells:[],mixers:[],lock:null,boss:null,switching:false,dead:false,sun:null,camPos:V3(0,6,8),camUp:V3(0,1,0),snap:true,talk:0,camAuto:true,waves:[]};
const pl={n:V3(0,1,0),f:V3(0,0,-1),cf:V3(0,0,-1),hp:12000,mhp:12000,st:5000,mst:5000,stDelay:0,inv:0,roll:0,rollDir:V3(0,0,-1),jy:0,vy:0,jt:0,jland:0,jflip:0,god:0,spin:0,spinTick:0,spinFx:null,combo:0,comboT:0,atkLock:0,lungeT:0,lungeV:0,P:null,atkLen:1,atkDir:null,atkT:0,atkFire:0,atkDone:true,atkKind:'',skCd:0,cds:{wild:0,rise:0,sakura:0,chase:0,rain:0},sk:null,spinAng:0,spinN:0,pitch:0.5,flash:0,ref:null,act:''};
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
function toast(msg,ms,cls){const t=$('toast');t.className=cls||'';t.textContent=msg;t.classList.add('on');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('on'),ms||1800);}
function toScreen(v){const p=v.clone().project(cam);return {x:(p.x*0.5+0.5)*W.stage.clientWidth,y:(-p.y*0.5+0.5)*W.stage.clientHeight,z:p.z};}
function floater(worldPos,text,color){const s=toScreen(worldPos);if(s.z>1)return;const d=document.createElement('div');d.className='fl';d.textContent=text;d.style.left=s.x+'px';d.style.top=s.y+'px';d.style.color=color||'#fff';$('floaters').appendChild(d);setTimeout(()=>d.remove(),950);}
const wp=(n,lift)=>C.clone().addScaledVector(n,R+lift);

/* ---------- 이펙트, 장판 ---------- */
const bm=(c,o,two)=>new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:o,depthWrite:false,side:two?THREE.DoubleSide:THREE.FrontSide});
function addFx(obj,life,upd,delay){S.world.add(obj);S.fxs.push({o:obj,b:S.t+(delay||0),life,upd});}
function fxTick(){for(let i=S.fxs.length-1;i>=0;i--){const f=S.fxs[i],k=(S.t-f.b)/f.life;if(k<0){f.o.visible=false;continue;}f.o.visible=true;if(k>=1){S.world.remove(f.o);S.fxs.splice(i,1);}else f.upd(k);}}
function ringBurst(n,r0,r1,color,life,lift){const m=new THREE.Mesh(new THREE.RingGeometry(0.8,1,48),bm(color,0.9,true));m.rotation.x=-PI/2;const g=new THREE.Group();g.add(m);orient(g,n,any(n),lift||0.2);addFx(g,life,k=>{const s=r0+(r1-r0)*k;m.scale.setScalar(s);m.material.opacity=0.9*(1-k);});}
function sparkFx(n,lift,color,cnt,spd,life,up){const g=new THREE.Group(),a=any(n),b=V3(0,0,0).crossVectors(n,a),ps=[];
for(let i=0;i<cnt;i++){const m=new THREE.Mesh(new THREE.BoxGeometry(0.07,0.07,0.34),bm(i%3?color:0xffffff,1));const th=Math.random()*PI*2,sp=spd*(0.5+Math.random()*0.8),v=a.clone().multiplyScalar(Math.cos(th)*sp).addScaledVector(b,Math.sin(th)*sp).addScaledVector(n,(up||2)*(0.3+Math.random()));g.add(m);ps.push({m,v,p:V3(0,0,0)});}
const base=wp(n,lift);addFx(g,life,k=>{ps.forEach(q=>{q.p.addScaledVector(q.v,1/60);q.v.addScaledVector(n,-0.12);const w=base.clone().add(q.p);q.m.position.copy(w);q.m.lookAt(w.clone().add(q.v));q.m.material.opacity=1-k;q.m.scale.setScalar(1-k*0.6);});});}
function dustFx(n,r,cnt){const g=new THREE.Group(),a=any(n),b=V3(0,0,0).crossVectors(n,a),ps=[];
for(let i=0;i<cnt;i++){const m=new THREE.Mesh(new THREE.SphereGeometry(0.22+Math.random()*0.18,8,6),bm(0xd9c9a3,0.55));const th=i/cnt*PI*2+Math.random()*0.3;g.add(m);ps.push({m,d:a.clone().multiplyScalar(Math.cos(th)).addScaledVector(b,Math.sin(th))});}
const base=wp(n,0.25);addFx(g,0.55,k=>{ps.forEach(q=>{q.m.position.copy(base).addScaledVector(q.d,r*(0.35+k*0.65)).addScaledVector(n,k*0.7);q.m.scale.setScalar(0.6+k*1.3);q.m.material.opacity=0.55*(1-k);});});}
function shake(v){S.shk=Math.max(S.shk||0,v);}function hitstop(t){S.hs=Math.max(S.hs||0,t);}
function slamFx(n,r,big){ringBurst(n,0.6,r,0xffd45a,0.42,0.14);ringBurst(n,0.3,r*0.72,0xffffff,0.3,0.18);dustFx(n,r*0.8,big?14:10);sparkFx(n,0.3,0xffe08a,big?16:10,5,0.5,3.2);shake(big?0.2:0.14);sfx('boom');}
function rangeFx(r,half,life,fk){fk=fk||0.4;const g=new THREE.Group(),fan=new THREE.Mesh(new THREE.CircleGeometry(r,40,-PI/2-half,half*2),bm(0xffe08a,0.22,true)),edge=new THREE.Mesh(new THREE.RingGeometry(r-0.07,r,40,1,-PI/2-half,half*2),bm(0xfff4c0,0.95,true));
fan.rotation.x=edge.rotation.x=-PI/2;fan.position.y=edge.position.y=0.05;g.add(fan,edge);
for(const sgn of[-1,1]){const aa=-PI/2+sgn*half,dx=Math.cos(aa),dz=-Math.sin(aa),l=new THREE.Mesh(new THREE.BoxGeometry(0.08,0.01,r),bm(0xfff4c0,0.9,true));l.position.set(dx*r/2,0.05,dz*r/2);l.rotation.y=Math.atan2(dx,dz);g.add(l);}
orient(g,pl.n,pl.f,0.12);S.world.add(g);addFx(g,life,k=>{const a=k<fk?0.35+0.65*(k/fk):1-(k-fk)/(1-fk);fan.material.opacity=(k<fk?0.07+0.1*(k/fk):0.28*a);edge.material.opacity=0.25+0.7*(k<fk?k/fk:a);g.traverse(o=>{if(o.isMesh&&o!==fan&&o!==edge)o.material.opacity=0.25+0.65*(k<fk?k/fk:a);});orient(g,pl.n,pl.f,0.12);});}
function glowBall(n,lift,r,color,life,grow){const m=new THREE.Mesh(new THREE.SphereGeometry(r,14,10),bm(color,0.85));m.position.copy(wp(n,lift));addFx(m,life,k=>{m.scale.setScalar(1+k*grow);m.material.opacity=0.85*(1-k);});}
function decalRing(n,r,color,life,onEnd){const g=new THREE.Group(),o=new THREE.Mesh(new THREE.RingGeometry(r*0.94,r,48),bm(color,0.95)),f=new THREE.Mesh(new THREE.CircleGeometry(r,48),bm(color,0.32));o.rotation.x=f.rotation.x=-PI/2;f.scale.setScalar(0.01);g.add(o,f);orient(g,n,any(n),0.16);S.world.add(g);
const d={g,b:S.t,life,upd:k=>f.scale.setScalar(Math.max(0.01,k)),end:onEnd};S.decals.push(d);return d;}
function decalStrip(n,f0,len,w,color,life,onEnd){const g=new THREE.Group(),o=new THREE.Mesh(new THREE.PlaneGeometry(w,len),bm(color,0.3)),fill=new THREE.Mesh(new THREE.PlaneGeometry(w,len),bm(color,0.5));o.rotation.x=fill.rotation.x=-PI/2;o.position.z=fill.position.z=len/2;fill.scale.set(1,1,0.01);g.add(o,fill);orient(g,n,f0,0.16);S.world.add(g);
const d={g,b:S.t,life,upd:k=>{const s=Math.max(0.01,k);fill.scale.set(1,s,1);fill.position.z=len*s/2*0+ (len/2)*s;},end:onEnd};
/* PlaneGeometry는 XY 평면. x축으로 눕히면 길이가 z축으로 향한다 */
S.decals.push(d);return d;}
function decalTick(){for(let i=S.decals.length-1;i>=0;i--){const d=S.decals[i],k=(S.t-d.b)/d.life;if(d.cancel||k>=1){S.world.remove(d.g);S.decals.splice(i,1);if(!d.cancel&&d.end)d.end();}else d.upd(k);}}

/* ---------- 투사체 ---------- */
function spawnProj(o){if(o.from==='enemy')o.spd*=1.7;const m=new THREE.Group(),core=new THREE.Mesh(new THREE.SphereGeometry(o.rad*0.7,12,10),bm(o.color,1)),halo=new THREE.Mesh(new THREE.SphereGeometry(o.rad*1.35,12,10),bm(o.color,0.3));m.add(core,halo);S.world.add(m);
const p=Object.assign({m,life:2,home:null},o);p.n=o.n.clone();p.f=o.f.clone();S.projs.push(p);m.position.copy(wp(p.n,p.lift));return p;}
function projTick(dt){for(let i=S.projs.length-1;i>=0;i--){const p=S.projs[i];let dead=false;p.life-=dt;
if(p.home&&p.home.state!=='dead'){const d=dirTo(p.n,p.home.n);if(d)turnToward(p.f,d,p.n,2.6*dt);}
moveAlong(p.n,p.f.clone(),p.spd*dt,[p.f]);p.m.position.copy(wp(p.n,p.lift));
if(p.from==='enemy'){if(!S.dead&&arc(p.n,pl.n)<p.rad+0.55&&Math.abs(p.lift-(0.9+pl.jy))<1.4){if(hurt(p.dmg,p.n,0.9))dead=true;else if(pl.roll>0){}}}
else{for(const e of S.ents){if(e.state==='dead')continue;if(arc(p.n,e.n)<p.rad+e.spec.rad&&Math.abs(p.lift-(e.lift+e.spec.h*0.4))<2.2){if(p.refl){S.soft=1;hitEnt(e,p.dmg,p.n,0.2);S.soft=0;ringBurst(p.n,0.3,1.6,p.color,0.25,p.lift);}else{hitEnt(e,p.dmg,p.n,1.2);glowBall(p.n,p.lift,0.4,p.color,0.35,3);ringBurst(p.n,0.4,2.2,p.color,0.35,p.lift);}dead=true;break;}}}
if(p.life<=0)dead=true;if(dead){S.world.remove(p.m);S.projs.splice(i,1);}}}

/* ---------- 데미지 ---------- */
function hurt(d,srcN,kb){if(S.dead||pl.inv>0||pl.god>0||!S.running)return false;d*=100;pl.hp=Math.max(0,pl.hp-d);pl.inv=0.65;pl.flash=0.18;pl.atkT=0;pl.comboT=0;pl.combo=0;pl.lungeT=0;$('vig').classList.add('on');setTimeout(()=>$('vig').classList.remove('on'),120);sfx('hurt');
floater(wp(pl.n,2.1),'-'+Math.round(d),'#ff7a6b');
if(srcN){const dir=dirTo(pl.n,srcN);if(dir)moveAlong(pl.n,dir.negate(),kb||0.8,[pl.f,pl.cf,pl.rollDir]);}
if(pl.hp<=0)die();return true;}
function hitEnt(e,d,fromN,kb){if(e.state==='dead'||e.invul)return;if(d<1e6){if(pl.sk||pl.spin>0||S.soft||d>=100){d=Math.max(30000000+Math.random()*20000000,d*5000000);if(!e.boss){e.skN=(e.skK===(pl.sk||pl.spinFx||'x'))?(e.skN||0)+1:1;e.skK=pl.sk||pl.spinFx||'x';d=Math.min(d,e.mhp*0.34);}}else d=Math.max(530000,d*22000);}e.hp-=d;e.hitT=S.t;e.flash=0.14;e.sq=0.2;if(S.soft){const now=S.t||0;if(!e._ft||now-e._ft>0.12){e._ft=now;sparkFx(e.n,e.lift+e.spec.h*0.55,0x9ee8ff,3,3.2,0.25,2);floater(wp(e.n,e.lift+e.spec.h),String(Math.round(d)),'#cfeaff');}if(!S._sf||now-S._sf>0.07){S._sf=now;sfx('hit');}}else{sfx('hit');const big=d>=100000;sparkFx(e.n,e.lift+e.spec.h*0.55,big?0xffc46b:0xfff2a8,big?14:8,big?6:4.2,0.38,2.2);glowBall(e.n,e.lift+e.spec.h*0.55,0.35,0xffffff,0.16,2.2);shake(big?0.16:0.07);hitstop(big?0.09:0.045);floater(wp(e.n,e.lift+e.spec.h),String(Math.round(d)),'#fff2a8');}
if(!e.boss&&kb&&fromN&&!S.soft){const dir=dirTo(e.n,fromN);if(dir)moveAlong(e.n,dir.negate(),kb,[e.f]);}
if(!e.boss&&e.spec.kind!=='x'&&e.state!=='dash'&&!(S.soft&&e.stun>0)){e.stun=0.28;if(e.state==='wind'){if(e.decal)e.decal.cancel=true;e.state='recover';e.t=0;}}
if(e.hp<=0)killEnt(e);}
function killEnt(e){e.state='dead';e.t=0;if(e.decal)e.decal.cancel=true;play(e,'die',0.1,true);if(S.lock===e)S.lock=null;if(e.boss){S.bossDead=true;sfx('win');victory();}else{S.kills++;updateQuest();if(S.kills===1)toast('보스 스테이지 문이 열렸어요!',2600);}}

/* ---------- 애니메이션 ---------- */
const flatCache=new Map();
function flatClip(c){if(flatCache.has(c))return flatCache.get(c);const n=c.clone();for(const t of n.tracks){if(!t.name.endsWith('Hips.position'))continue;const v=t.values,len=v.length/3,m=[0,0,0];for(let i=0;i<len;i++)for(let k=0;k<3;k++)m[k]+=Math.abs(v[i*3+k]);let up=0;for(let k=1;k<3;k++)if(m[k]>m[up])up=k;for(let k=0;k<3;k++){if(k===up)continue;const f=v[k];for(let i=0;i<len;i++)v[i*3+k]=f;}}flatCache.set(c,n);return n;}
function mkActs(holder,anims,names,flat){const mx=new THREE.AnimationMixer(holder);const acts={};for(const k in names){let c=findClip(anims,names[k]);if(c&&flat)c=flatClip(c);if(c)acts[k]=mx.clipAction(c);}S.mixers.push(mx);return {mx,acts};}
function play(o,name,fade,once,speed){const a=o.acts[name];if(!a)return;if(o.cur===name&&!once&&a.enabled&&a.getEffectiveWeight()>0.01)return;const f=fade||0.15;for(const k in o.acts){const b=o.acts[k];if(b!==a&&b.enabled)b.fadeOut(f);}if(once){a.reset();a.setLoop(THREE.LoopOnce,1);a.clampWhenFinished=true;}else{a.clampWhenFinished=false;if(!a.enabled||a.getEffectiveWeight()<=0.01)a.reset();a.setLoop(THREE.LoopRepeat,Infinity);}a.timeScale=speed||1;a.enabled=true;a.setEffectiveWeight(1);a.fadeIn(f).play();o.cur=name;}
const MON={idle:'Idle',walk:'Walk',atk:'Bite_Front',hit:'HitRecieve',die:'Death',fly:'Flying'};

/* ---------- 플레이어 ---------- */
const WT={sword:{p:[0,0,0],r:[0,0,-PI/2]},shield:{p:[0,0,0],r:[0,0,0]},staff:{p:[0,0,0],r:[0,0,0]}};
function attach(root,bone,obj,cfg){const b=root.getObjectByName(bone);if(!b)return null;const ws=V3(0,0,0);b.getWorldScale(ws);const w=new THREE.Group();w.scale.setScalar(1/ws.x);w.position.set(...cfg.p);w.rotation.set(...cfg.r);w.add(obj);b.add(w);return w;}
function makeStaff(){const g=new THREE.Group(),wood=new THREE.MeshToonMaterial({color:0xb98a55,emissive:0x2a1608});
const shaft=new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.028,1.55,10),wood);shaft.position.y=0.4;g.add(shaft);
const claw=new THREE.Mesh(new THREE.TorusGeometry(0.1,0.017,8,16),wood);claw.position.y=1.14;claw.rotation.x=PI/2;g.add(claw);
const tip=new THREE.Mesh(new THREE.SphereGeometry(0.1,16,12),new THREE.MeshBasicMaterial({color:0x9ee8ff}));tip.position.y=1.22;g.add(tip);
const halo=new THREE.Mesh(new THREE.SphereGeometry(0.19,16,12),bm(0x6fd0ff,0.3));halo.position.y=1.22;g.add(halo);g.userData.tip=tip;return g;}
const RT={};
async function makeHero(cls){
const a0=await load(cls),a=a0||await load('robot'),fb=!a0;
let anims=a.anims;if(!fb){const g=await load('animGen'),m=await load('animMove');anims=[].concat(g?g.anims:[],m?m.anims:[]);}
const aa=Object.assign({},a,{anims});
const root=new THREE.Group(),tumble=new THREE.Group();tumble.position.y=0.9;
const holder=inst(aa,cls==='mage'?1.6:1.55,{ownMat:true,tint:fb?(cls==='mage'?0x6a8cff:0xff6a5a):0,tintAmt:0.6});holder.position.y=-0.9;tumble.add(holder);root.add(tumble);
const nm=fb?{idle:'Idle',walk:'Walking',run:'Running',atk:'Punch',die:'Death'}:{idle:'Idle_A',walk:'Walking_A',run:'Running_A',jump:'Jump_Idle',hit:'Hit_A',die:'Death_A'};
let rtOK=false;if(!fb&&cls==='warrior'){try{if(!RT[cls]){const u=await load(cls==='warrior'?'ualSword':'ualMage');if(u){RT[cls]=retargetClips(u.obj,u.anims,holder.userData.inner,cls==='warrior'?['Sword_Regular_A','Sword_Regular_B','Sword_Regular_C','Sword_Heavy_Combo','Sword_Dash']:['Spell_Simple_Shoot']);}}
if(RT[cls]&&RT[cls].length){RT[cls].forEach(c=>aa.anims.push(c));rtOK=true;}}catch(e){console.warn('retarget',e);}}
if(rtOK){if(cls==='warrior'){nm.atk1='RT_Sword_Regular_A';nm.atk2='RT_Sword_Regular_B';nm.atk3='RT_Sword_Regular_C';nm.skill='RT_Sword_Heavy_Combo';nm.sk_wild='RT_Sword_Regular_B';nm.sk_rise='RT_Sword_Regular_C';}else{nm.atk1=nm.atk2=nm.atk3=nm.skill='RT_Spell_Simple_Shoot';}}
const m=mkActs(holder,aa.anims,nm,false);
holder.updateMatrixWorld(true);let tip=null,rw=null,swTip=null,swBase=null;
if(!fb){const hs=holder.userData.inner;
if(cls==='warrior'){const sw=await load('sword'),sh=await load('shield');
if(sw){const s=sw.obj.clone();s.scale.setScalar(1);{const bb=new THREE.Box3().setFromObject(s),sz=bb.getSize(V3(0,0,0)),ax=sz.x>=sz.y&&sz.x>=sz.z?'x':sz.y>=sz.z?'y':'z',lo=bb.min[ax],hi=bb.max[ax],far=Math.abs(hi)>Math.abs(lo)?hi:lo,c=bb.getCenter(V3(0,0,0)),mk=v=>{const o=new THREE.Object3D(),p=c.clone();p[ax]=v;o.position.copy(p);s.add(o);return o;};swTip=mk(far);swBase=mk(far*0.2);}rw=attach(hs,'handslotr',s,WT.sword);}
if(sh){const s=sh.obj.clone();attach(hs,'handslotl',s,WT.shield);}}
else{const st=await load('staff');if(st){const s=st.obj.clone();rw=attach(hs,'handslotr',s,WT.staff);const tp=new THREE.Mesh(new THREE.SphereGeometry(0.01),new THREE.MeshBasicMaterial({visible:false}));s.add(tp);tp.position.set(0,0.9,0);tip=tp;}}}
const bone=n=>holder.userData.inner.getObjectByName(n);
const ref={root,tumble,holder,mx:m.mx,acts:m.acts,cur:'',tip,fb,cls,rw,swTip,swBase,bones:fb?null:{ur:bone('upperarmr'),lr:bone('lowerarmr'),ul:bone('upperarml'),ll:bone('lowerarml'),ch:bone('chest'),hips:bone('hips'),hd:bone('head'),tr:bone('upperlegr'),sr:bone('lowerlegr'),tl:bone('upperlegl'),sl:bone('lowerlegl')}};play(ref,'idle',0);return ref;}
/* 팔 자세: 애니메이션 위에 모델 기준 축으로 덧씌운다 (x=앞뒤 휘두름, y=좌우 휘두름, z=옆으로 벌림) */
const _q1=new THREE.Quaternion(),_q2=new THREE.Quaternion(),_q3=new THREE.Quaternion(),_e=new THREE.Euler(),_h=new THREE.Quaternion();
function boneAdd(ref,b,rx,ry,rz){if(!b||!b.parent)return;b.updateWorldMatrix(true,false);_h.copy(ref.holder.getWorldQuaternion(_q3)).invert();
b.getWorldQuaternion(_q1);_q1.premultiply(_h);_e.set(rx,ry,rz,'YXZ');_q2.setFromEuler(_e);_q1.premultiply(_q2);_q1.premultiply(ref.holder.getWorldQuaternion(_q3));
b.parent.getWorldQuaternion(_q2).invert();b.quaternion.copy(_q2.multiply(_q1));b.updateWorldMatrix(false,true);}
function poseHero(){const ref=pl.ref;if(!ref||!ref.bones||pl.roll>0)return;if(ref.acts.atk1&&pl.spin<=0&&!(pl.parry>0)&&!(pl.sk&&(pl.sk.id==='sakura'||pl.sk.id==='chase'||pl.sk.id==='rain'||pl.sk.id==='wild'||pl.sk.id==='guard')))return;const B=ref.bones;let ur=null,lr=null,ul=null,ll=null,lg=null,ch=0,swd=0;
const w=S.cls==='warrior';
if(pl.parry>0&&!pl.sk){const w=pSw(),e2=w*w*(3-2*w),dr=pl.pSwDir||1;ur=[0.2-2.5*e2,dr*(-1.1+2.2*e2),dr*(0.5-0.5*e2)];lr=[-0.4-0.3*Math.sin(w*PI),0,0];ul=[-0.8+0.5*e2,dr*0.5,0];ll=[-0.6,0,0];}
else if(pl.spin>0||(pl.sk&&pl.sk.id==='sakura')){ur=[0,0,-1.45];lr=[0,0,0];}
else if(pl.sk&&pl.sk.id==='wild'){const t=pl.sk.t;if(t<WCH-0.12){const q=Math.min(1,t/0.35),sh=Math.sin(S.t*40)*0.012*q;ur=[WI.ur[0]*q+sh,WI.ur[1]*q,WI.ur[2]*q];lr=[WI.lr[0]*q,WI.lr[1]*q,WI.lr[2]*q];ul=[WI.ul[0]*q,WI.ul[1]*q,WI.ul[2]*q];ll=[WI.ll[0]*q,WI.ll[1]*q,WI.ll[2]*q];lg=q;}else{const k=Math.min(1,(t-WCH+0.12)/0.16);ur=[-2.7*k+WI.ur[0]*(1-k)+(3.1-3.1)*k+3.1*k*0,WI.ur[1]*(1-k),WI.ur[2]*(1-k)];ur[0]=WI.ur[0]*(1-k)+(0.4)*k;lr=[WI.lr[0]*(1-k),WI.lr[1]*(1-k),WI.lr[2]*(1-k)];ul=[WI.ul[0]*(1-k),WI.ul[1]*(1-k),WI.ul[2]*(1-k)];ll=[WI.ll[0]*(1-k),WI.ll[1]*(1-k),WI.ll[2]*(1-k)];lg=1-k;}}
else if(pl.sk&&pl.sk.id==='guard'){const q=Math.min(1,pl.sk.t/0.25);ur=[-1.3*q,0.6*q,-0.5*q];lr=[-1.6*q,0,0];ul=[-0.5*q,0,0];ll=[0.4*q,0,0];}
else if(pl.sk&&pl.sk.id==='giga'){const t=pl.sk.t,Te=pl.sk.Te||3,sw=t<0.9?-0.4:(t<Te-0.3?-1.2+Math.sin(t*(8+t*3))*0.7:(t<Te+0.4?-2.7:0.2));ur=[sw,0,-0.15];lr=[-0.3,0,0];}
else if(pl.sk&&(pl.sk.id==='chase'||pl.sk.id==='rain')){const q=Math.min(1,pl.sk.t/0.25);ur=[-2.7*q,0,-0.15*q];lr=[-0.25*q,0,0];}
else if(pl.atkT>0&&pl.P){const k=clamp(pl.atkAge/pl.atkLen,0,1),f=pl.atkFire/pl.atkLen,wind=easeIO(clamp(k/f,0,1)),strike=easeIO(clamp((k-f)/(1-f),0,1));
if(pl.atkKind==='skill'){const t=k<f?wind:1-strike;ur=[-1.2-0.2*t,0,0];lr=[-0.3,0,0];}
else if(w){const c=pl.combo;let A,Bp;
if(c===1){A=[-2.5,-0.7,0];Bp=[-0.6,0.6,0];}
else if(c===2){A=[-1.5,0.9,0];Bp=[-1.5,-0.9,0];}
else{A=[-3.1,0,0];Bp=[-0.5,0,0];}
const t=k<f?wind:1,u=k<f?0:strike;
const p=A.map((v,i)=>v+(Bp[i]-v)*(k<f?0:Math.pow(u,0.5)));
const wv=k<f?A.map((v,i)=>[0,0,0][i]*0):p;ur=k<f?[A[0]*wind+(-0.2)*(1-wind),A[1]*wind,0]:p;lr=[-0.5*Math.sin(k*PI),0,0];ch=0;}
else{const t=k<f?wind:1-strike*0.7;ur=[-1.0-0.5*t,0,0];lr=[-0.6*t,0,0];}}
else if(!w&&pl.comboT>0){}
if(!ur)return;
boneAdd(ref,B.ur,ur[0],ur[1],ur[2]);if(lr)boneAdd(ref,B.lr,lr[0],lr[1],lr[2]);if(ul&&B.ul)boneAdd(ref,B.ul,ul[0],ul[1],ul[2]);if(ll&&B.ll)boneAdd(ref,B.ll,ll[0],ll[1],ll[2]);if(lg){if(B.tr)boneAdd(ref,B.tr,LG.tr[0]*lg,LG.tr[1]*lg,LG.tr[2]*lg);if(B.sr)boneAdd(ref,B.sr,LG.sr[0]*lg,0,0);if(B.tl)boneAdd(ref,B.tl,LG.tl[0]*lg,LG.tl[1]*lg,LG.tl[2]*lg);if(B.sl)boneAdd(ref,B.sl,LG.sl[0]*lg,0,0);}}
const LG={tr:[-0.85,0.15,0],sr:[1.5,0,0],tl:[0.45,-0.1,0],sl:[1.0,0,0]};
const WI={ur:[-0.7,0.9,0.1],lr:[-1.0,0,0],ul:[-0.5,-0.4,-0.1],ll:[-0.9,0,0]};
async function setClass(cls){S.cls=cls;const ref=await makeHero(cls);if(pl.ref){if(pl.ref.root.parent)pl.ref.root.parent.remove(pl.ref.root);const i=S.mixers.indexOf(pl.ref.mx);if(i>=0)S.mixers.splice(i,1);}pl.ref=ref;if(S.world)S.world.add(ref.root);
pl.mhp=12000;pl.mst=5000;pl.hp=pl.mhp;pl.st=pl.mst;$('clsName').textContent=cls==='warrior'?'전사':'마법사';}
function nearestDir(){let b=null,bd=1e9;for(const e of S.ents){if(e.state==='dead')continue;const d=arc(pl.n,e.n)-(e.boss?30:0);if(d<bd){const dir=dirTo(pl.n,e.n);if(dir){b=dir;bd=d;}}}return b;}
function aimAssist(){let best=null,bd=7;for(const e of S.ents){if(e.state==='dead')continue;const d=arc(pl.n,e.n)-e.spec.rad;if(d<bd){const dir=dirTo(pl.n,e.n);if(dir&&dir.dot(pl.f)>0.2){best=dir;bd=d;}}}return best;}
const CB={warrior:[null,
{t:.5,fire:.2,ts:2.4,dmg:[24,30],lunge:.35,r:3.7,dot:.45,twist:-.5,lean:.1,kb:.9},
{t:.48,fire:.17,ts:2.9,dmg:[30,38],lunge:.4,r:3.9,dot:.4,twist:.6,lean:.12,kb:1.1},
{t:.9,fire:.42,ts:1.5,dmg:[54,66],lunge:.7,r:4.9,dot:-.1,twist:0,lean:.5,hop:1,kb:2.6}],
mage:[null,{t:.6,fire:.32,ts:3.0,dmg:[20,20],twist:-.3,lean:.1},{t:.58,fire:.3,ts:3.2,dmg:[24,24],twist:.35,lean:.1},{t:1.0,fire:.55,ts:2.1,dmg:[28,28],twist:0,lean:.3,hop:1}]};
for(const c in CB)CB[c].forEach(P=>{if(P){P.t*=0.46;P.fire*=0.46;P.ts/=0.46;}});
function startAtk(kind){if(S.dead||!S.running||pl.roll>0||pl.spin>0||pl.sk)return;if(kind!=='skill'&&(pl.atkT>0||pl.atkLock>0))return;if(kind==='skill'&&pl.skCd<=0&&pl.atkT>0){pl.atkT=0;pl.lungeT=0;pl.atkLock=0;}if(kind==='skill'&&pl.atkT>0)return;const w=S.cls==='warrior';
if(kind==='skill'){if(pl.skCd>0){toast('스킬 준비 중',700);return;}if(pl.st<1500){toast('스태미나 부족',600);return;}pl.st-=1500;pl.stDelay=0.7;if(w){makeSpinFx();pl.god=5;pl.spin=3;pl.spinTick=PI/SPINW;pl.spinAng=0;pl.spinN=0;pl.skCd=7;pl.comboT=0;pl.combo=0;sfx('swing');toast('윈드밀!',900);return;}}
let P;if(kind==='atk'){pl.combo=pl.comboT>0?pl.combo%3+1:1;P=CB[S.cls][pl.combo];}
else{pl.combo=0;P=w?{t:.77,fire:.38,ts:1.9,twist:0,lean:.2}:{t:.95,fire:.6,ts:2.6,twist:0,lean:.2};pl.skCd=w?4:5;}
if(w&&kind==='atk'&&P.r){rangeFx(P.r+0.55,Math.min(1.75,Math.max(0.75,Math.acos(Math.max(-1,Math.min(1,P.dot))))),P.t*1.05,P.fire/(P.t*1.05));kickFx(0.5);}
pl.comboT=0;pl.atkKind=kind;pl.atkDone=false;pl.P=P;pl.atkLen=P.t;pl.atkT=P.t;pl.atkFire=P.fire;pl.atkAge=0;
const d=S.lock&&S.lock.state!=='dead'?dirTo(pl.n,S.lock.n):aimAssist();pl.atkDir=d?d.clone():(moveVec()||null);
{const R=pl.ref,k=kind==='skill'?'skill':'atk'+pl.combo;if(R.acts[k]){const cl=R.acts[k].getClip().duration;play(R,k,0.06,true,cl/P.t*(P.rt||1));R.rt=1;}else play(R,'atk',0.06,true,P.ts);}sfx(w?(pl.combo===3?'boom':'swing'):'cast');}
function makeSpinFx(){endSpin(true);const g=new THREE.Group(),sp=new THREE.Group(),gr=new THREE.Group();
[0,PI].forEach((a,i)=>{const m=new THREE.Mesh(new THREE.RingGeometry(1.9,2.7,40,1,a,2.4),bm(i?0xffffff:0xffe9a0,0.85,true));m.rotation.x=-PI/2;m.position.y=0.95;sp.add(m);});
const disc=new THREE.Mesh(new THREE.CircleGeometry(3.3,48),bm(0xffd45a,0.16));disc.rotation.x=-PI/2;disc.position.y=0.12;const rg=new THREE.Mesh(new THREE.RingGeometry(3.2,3.35,48),bm(0xffe9a0,0.8));rg.rotation.x=-PI/2;rg.position.y=0.13;gr.add(disc,rg);
g.add(sp,gr);g.userData.sp=sp;S.world.add(g);pl.spinFx=g;orient(g,pl.n,pl.f,pl.jy);g.scale.set(1.65,1,1.65);}
function endSpin(quiet){pl.spin=0;if(pl.spinFx){if(pl.spinFx.parent)pl.spinFx.parent.remove(pl.spinFx);pl.spinFx=null;}}
function slashFx(step){const g=new THREE.Group();orient(g,pl.n,pl.f,0);S.world.add(g);const ms=[];
const mk=(r0,r1,c,o,rz,sx)=>{const sub=new THREE.Group();sub.scale.x=sx||1;const m=new THREE.Mesh(new THREE.RingGeometry(r0,r1,40,1,0.15,2.3),bm(c,o,true));m.rotation.z=rz;m.position.set(0.1,1.15,1.25);sub.add(m);g.add(sub);ms.push([m,o]);};
if(step===1){mk(.9,1.7,0xfff0a8,1,-.7);mk(1.15,1.3,0xffffff,.8,-.7);}
else if(step===2){mk(.9,1.7,0xfff0a8,1,-.7,-1);mk(1.15,1.3,0xffffff,.8,-.7,-1);}
else{mk(1.2,2.4,0xffc46b,1,-.7);mk(1.2,2.4,0xffc46b,1,-.7,-1);mk(1.55,1.75,0xffffff,.9,-.7);ringBurst(pl.n,0.5,4.4,0xffc46b,0.45,0.2);}
addFx(g,step===3?0.5:0.4,k=>{g.scale.setScalar((step===3?0.8:0.75)+k*0.65);ms.forEach(([m,o])=>{m.material.opacity=o*(1-k);});});}
function fireAtk(){const w=S.cls==='warrior',kind=pl.atkKind;pl.atkDone=true;
if(w&&kind==='atk'){const P=pl.P;pl.lungeT=0.16;pl.lungeV=P.lunge/0.16;
for(const e of S.ents){if(e.state==='dead')continue;const d=arc(pl.n,e.n),dir=dirTo(pl.n,e.n);if(d<P.r+e.spec.rad&&dir&&dir.dot(pl.f)>P.dot){hitEnt(e,P.dmg[0]+Math.floor(Math.random()*(P.dmg[1]-P.dmg[0]+1)),pl.n,P.kb);}}
slashWave(pl.combo,P);}
else if(w&&kind==='skill'){ringBurst(pl.n,0.5,4.4,0xffe08a,0.5,0.25);ringBurst(pl.n,0.3,3.2,0xffffff,0.4,0.3);sfx('boom');
for(const e of S.ents){if(e.state==='dead')continue;if(arc(pl.n,e.n)<4.2+e.spec.rad)hitEnt(e,44,pl.n,2.2);}}
else if(!w&&kind==='atk'){const P=pl.P,tp=V3(0,0,0);(pl.ref.tip||pl.ref.holder).getWorldPosition(tp);const rel=tp.clone().sub(C),lift=Math.max(0.6,rel.length()-R),n=rel.normalize();const f=pl.f.clone().addScaledVector(n,-n.dot(pl.f)).normalize();const home=S.lock&&S.lock.state!=='dead'?S.lock:null;
if(pl.combo<3){spawnProj({n:n.clone(),f,spd:19,lift,rad:0.35,dmg:P.dmg[0],color:0x9ee8ff,from:'player',home,life:1.4});sfx('fire');ringBurst(pl.n,0.6,1.8,0x8fe3ff,0.45,0.2);}
else{[-0.3,0,0.3].forEach(a=>spawnProj({n:n.clone(),f:f.clone().applyAxisAngle(n,a),spd:21,lift,rad:0.45,dmg:P.dmg[0],color:0xb9f0ff,from:'player',home:a===0?home:null,life:1.5}));sfx('boom');ringBurst(pl.n,0.6,3.2,0x8fe3ff,0.5,0.2);}}
else{const tn=S.lock&&S.lock.state!=='dead'?S.lock.n.clone():(()=>{const n=pl.n.clone(),f=pl.f.clone();stepOn(n,f,6.5);return n;})();
const meteor=new THREE.Mesh(new THREE.SphereGeometry(0.9,16,12),bm(0xffb36b,1));const halo=new THREE.Mesh(new THREE.SphereGeometry(1.5,16,12),bm(0xff7a3a,0.35));meteor.add(halo);S.world.add(meteor);const t0=S.t;
const d=decalRing(tn,3.4,0x6fd0ff,0.9,()=>{S.world.remove(meteor);ringBurst(tn,0.5,4.2,0xffb36b,0.5,0.25);glowBall(tn,1.2,1.2,0xffd9a0,0.5,2.5);sfx('boom');
for(const e of S.ents){if(e.state==='dead')continue;if(arc(tn,e.n)<3.4+e.spec.rad)hitEnt(e,58,tn,1.8);}});
const upd=d.upd;d.upd=k=>{upd(k);meteor.position.copy(wp(tn,14*(1-k)*(1-k)+0.8));};}}

const easeIO=t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
function tryDash(){if(S.dead||!S.running||pl.roll>0||(pl.sk&&((pl.sk.id==='wild'&&pl.sk.t<WCH)||pl.sk.id==='giga'||pl.sk.id==='guard'))||pl.dashT>0||pl.dashCd>0)return;const d=moveVec();if(!d)return;pl.dashT=0.17;pl.dashCd=0.22;pl.dashDir=d.clone();pl.f.copy(d);sfx('roll');ringBurst(pl.n,0.3,1.6,0xe8f2ff,0.3,0.12);dustFx(pl.n,1.0,6);sparkFx(pl.n,0.9,0xffffff,8,5,0.25,0.4);}
function startParry(){if(S.dead||!S.running)return;pl.parry=0.6;pl.god=Math.max(pl.god,0.6);}
function parryDome(){const g=new THREE.Group(),m=new THREE.MeshBasicMaterial({color:0xcfe0ff,transparent:true,opacity:0.2,side:THREE.DoubleSide,depthWrite:false}),sp=new THREE.Mesh(new THREE.SphereGeometry(1,24,16),m),rm=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0.7,side:THREE.DoubleSide,depthWrite:false}),rg=new THREE.Mesh(new THREE.RingGeometry(0.94,1,48),rm);rg.rotation.x=-PI/2;rg.position.y=-0.9;g.add(sp,rg);g.userData.live=1;S.world.add(g);pl.dome=g;
addFx(g,600,k=>{g.position.copy(wp(pl.n,1.0));const on=pl.parry>0&&!S.dead;const tgt=on?1:0;g.userData.s=(g.userData.s||0.3)+(tgt*1-(g.userData.s||0.3))*0.35;const sc=2.9*(g.userData.s||0.3)*(1+0.04*Math.sin(S.t*30));g.scale.setScalar(Math.max(0.01,sc));m.opacity=0.2*(g.userData.s||0);rm.opacity=0.7*(g.userData.s||0);if(!on&&(g.userData.s||0)<0.05){S.world.remove(g);pl.dome=null;g.userData.dead=1;}});}
function pSw(){return window.__swf!=null?window.__swf:(pl.pSwOn?pl.pSwT:0);}
function parryTick(dt){if(K.KeyE&&S.running)pl.parry=Math.max(pl.parry||0,0.15);if(!(pl.parry>0)){pl.pSwOn=false;pl.pTgt=null;return;}pl.parry-=dt;pl.god=Math.max(pl.god,0.1);
if(pl.pSwOn){pl.pSwT+=dt/(pl.pSwLen||0.2);if(pl.pTgt&&pl.pSwT>=0.35){const p=pl.pTgt;pl.pTgt=null;if(S.projs.indexOf(p)>=0&&p.from==='enemy'){let tg=null,bd=1e9;for(const e of S.ents){if(e.state==='dead')continue;const d=arc(pl.n,e.n);const sc=e.boss?d-40:d;if(sc<bd){bd=sc;tg=e;}}
p.from='player';p.refl=1;const d=tg?dirTo(p.n,tg.n):null;if(d)p.f.copy(d);else p.f.negate();p.spd=Math.max(p.spd*3,46);p.dmg=Math.max(p.dmg*3,45);p.life=3;p.home=tg||null;p.lift=1.1;sparkFx(p.n,p.lift,0xffffff,5,6,0.18,1.2);ringBurst(p.n,0.2,1.0,0xffffff,0.16,p.lift);shake(0.02);}}
if(pl.pSwT>=1){pl.pSwOn=false;pl.pSwT=0;}}
if(!pl.pSwOn){let pend=null,pd=1e9;for(const p of S.projs){if(p.from!=='enemy')continue;const d=arc(p.n,pl.n);if(d<=10&&d<pd){pd=d;pend=p;}}
pl.pSwOn=true;pl.pSwT=0;pl.pSwDir=-(pl.pSwDir||1);pl.pSwLen=pend?0.08:0.2;pl.pTgt=pend;if(pend){const fd=dirTo(pl.n,pend.n);if(fd)pl.f.copy(fd);}const dd=pl.pSwDir,fast=!!pend;ribbonFx(u=>{const x=dd*(-2.3+4.4*u),y=0.2+2.2*u,z=1.1+1.5*Math.sin(u*PI)+0.8*u;return[x,y,z,x*0.92,y-0.25,z-0.5];},fast?12:22,fast?0.12:0.2,[0.8,0.92,1],{sweep:0.5,tail:1.0,rev:false});sfx('swing');}
for(const w of S.waves){if(w.refl)continue;const d=arc(w.c,pl.n);if(d>=w.r-1.6&&d<=w.r+1.6){w.refl=true;w.hit=true;sfx('boom');shake(0.2);hitstop(0.05);ringBurst(pl.n,0.4,6,0xfff0a0,0.4,0.2);ringBurst(pl.n,0.3,3.2,0xffffff,0.3,0.25);sparkFx(pl.n,0.9,0xfff0a0,16,8,0.4,2.4);reflectWave(pl.n.clone());}}}
function reflectWave(c){const g=new THREE.Group(),m=new THREE.MeshBasicMaterial({color:0xfff0a0,transparent:true,opacity:0.7,side:THREE.DoubleSide,depthWrite:false}),ring=new THREE.Mesh(new THREE.RingGeometry(0.92,1,64),m);ring.rotation.x=-PI/2;ring.position.y=0.15;g.add(ring);orient(g,c,any(c),0);S.world.add(g);const hit=new Set();
addFx(g,0.9,k=>{const r=1+k*42;g.scale.set(r,1,r);m.opacity=0.7*(1-k);for(const e of S.ents){if(e.state==='dead'||hit.has(e))continue;if(arc(c,e.n)<=r+e.spec.rad){hit.add(e);S.soft=0;hitEnt(e,e.boss?40:300,c,0.4);}}});}
function tryJump(){if(S.dead||!S.running||pl.roll>0)return;if(pl.jy>0.05){if(pl.dj)return;pl.dj=1;pl.vy=16;pl.jt=0;pl.jflip=1;sfx('roll');ringBurst(pl.n,0.3,1.8,0x9ee8ff,0.35,pl.jy);ringBurst(pl.n,0.2,1.0,0xffffff,0.3,pl.jy+0.05);sparkFx(pl.n,pl.jy,0xbfe9ff,8,3,0.35,0.5);return;}pl.dj=0;pl.vy=12.8;pl.ff=0;pl.jt=0;pl.jflip=moveVec()&&!pl.atkT?1:0;sfx('roll');ringBurst(pl.n,0.3,1.3,0xffffff,0.3,0.15);}
function tryRoll(){if(S.dead||!S.running||pl.roll>0||pl.jy>0.05||(pl.sk&&(pl.sk.id==='giga'||pl.sk.id==='guard')))return;if(pl.st<1100){toast('스태미나 부족',600);return;}
pl.sk=null;pl.st-=1100;pl.stDelay=0.6;pl.roll=0.45;pl.inv=Math.max(pl.inv,0.4);pl.atkT=0;pl.comboT=0;pl.combo=0;pl.lungeT=0;endSpin();const dir=moveVec();if(dir)pl.rollDir.copy(dir);else pl.rollDir.copy(pl.f);sfx('roll');}
function moveVec(){const ix=(K.ArrowRight?1:0)-(K.ArrowLeft?1:0)+joy.x,iz=(K.ArrowUp?1:0)-(K.ArrowDown?1:0)-joy.y;if(!ix&&!iz)return null;const right=V3(0,0,0).crossVectors(pl.cf,pl.n);const v=V3(0,0,0).addScaledVector(pl.cf,iz).addScaledVector(right,ix);if(v.length()<0.05)return null;return v.normalize();}
function toggleLock(){if(S.lock){S.lock=null;return;}let best=null,bd=24;for(const e of S.ents){if(e.state==='dead')continue;const d=arc(pl.n,e.n);if(d<bd){bd=d;best=e;}}S.lock=best;}
S.camMode=0;S.quarter=false;S.qk=0;S.calm=true;const QB=V3(-0.7071,0,-0.7071);
const CAMTXT=['카메라: 자동 (F5: 마우스 조작)','카메라: 마우스 조작 (F5: 쿼터뷰)','카메라: 쿼터뷰 (F5: 자동)'],CAMTOAST=['카메라 자동','카메라 수동: 마우스 드래그로 돌려요','쿼터뷰: 맵 전체가 보여요'];
function toggleCam(){S.camMode=(S.camMode+1)%3;S.camAuto=S.camMode===0;S.quarter=S.camMode===2;const el=$('camMode');if(el){el.textContent=CAMTXT[S.camMode];el.classList.add('on');clearTimeout(S._camT);S._camT=setTimeout(()=>el.classList.remove('on'),2600);}toast(CAMTOAST[S.camMode],1400);}
function interact(){if(!S.running||S.dead)return;if(S.dlg){dlgNext();return;}for(const w of S.wells)if(arc(pl.n,w)<3.6){pl.hp=pl.mhp;pl.st=pl.mst;toast('우물물을 마시고 체력이 가득 찼어요',1800);ringBurst(pl.n,0.5,2.5,0x6fd0ff,0.6,0.2);return;}
const n=nearNpc();if(n)dlgOpen(n);}
const NPC_EMO={'로비':'📋','가렌':'⚔️','브론':'🔨','모아':'🛍️','레나':'🎯'};
function nearNpc(){let b=null,bd=4.4;for(const n of S.npcs){const d=arc(pl.n,n.n);if(d<bd){bd=d;b=n;}}return b;}
function parseLine(s){const m=/^\[(.+?)\]\s*(.*)$/.exec(s);return m?{nm:m[1],tx:m[2]}:{nm:'',tx:s};}
function npcFx(h,n,nc){const outl=[];const mats=[];
try{const list=[];h.traverse(m=>{if(m.isMesh&&!m.userData.isOutline)list.push(m);});for(const m of list){if(!m.geometry)continue;if(!m.geometry.boundingBox)m.geometry.computeBoundingBox();const bb=m.geometry.boundingBox,sz=Math.max(bb.max.x-bb.min.x,bb.max.y-bb.min.y,bb.max.z-bb.min.z)||1,off=(sz*0.016).toFixed(5);
const mt=new THREE.MeshBasicMaterial({color:0xffe27a,side:THREE.BackSide,fog:false});mt.skinning=!!m.isSkinnedMesh;mt.onBeforeCompile=sh=>{sh.vertexShader=sh.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\nvec3 onr=normal;\nvec2 oo=(projectionMatrix*vec4(normalize(normalMatrix*onr),0.0)).xy;if(length(oo)>1e-5)gl_Position.xy+=normalize(oo)*0.011*gl_Position.w;');};
let o;if(m.isSkinnedMesh){o=new THREE.SkinnedMesh(m.geometry,mt);o.bindMode=m.bindMode;o.bind(m.skeleton,m.bindMatrix);}else o=new THREE.Mesh(m.geometry,mt);
o.position.copy(m.position);o.quaternion.copy(m.quaternion);o.scale.copy(m.scale);o.frustumCulled=false;o.visible=false;o.userData.isOutline=1;m.parent.add(o);outl.push(o);mats.push(mt);}}catch(e){console.warn('outline',e);}
const rm=new THREE.MeshBasicMaterial({color:0xffd45a,transparent:true,opacity:0.8,side:THREE.DoubleSide,depthWrite:false,fog:false}),ring=new THREE.Mesh(new THREE.RingGeometry(1.25,1.45,48),rm);ring.rotation.x=-PI/2;const g=new THREE.Group();g.add(ring);const rm2=new THREE.MeshBasicMaterial({color:0xffd45a,transparent:true,opacity:0.22,side:THREE.DoubleSide,depthWrite:false,fog:false}),r2=new THREE.Mesh(new THREE.CircleGeometry(1.25,40),rm2);r2.rotation.x=-PI/2;g.add(r2);g.visible=false;orient(g,n,any(n),0.08);S.world.add(g);
const L0=parseLine(nc.talk[0]);let emo='💬';for(const k in NPC_EMO)if(L0.nm.includes(k))emo=NPC_EMO[k];
const em=[];h.traverse(m=>{if(m.isMesh&&!m.userData.isOutline){for(const x of (Array.isArray(m.material)?m.material:[m.material]))if(x&&x.emissive)em.push(x);}});
return {n,talk:nc.talk,h,outl,mats,em,ring:g,rm,rm2,nm:L0.nm,emo};}
function dlgDraw(){const d=S.dlg;if(!d)return;$('dlgTx').textContent=d.full.slice(0,Math.floor(d.pos));$('dlgNx').style.visibility=d.pos>=d.full.length?'visible':'hidden';}
function dlgShow(){const d=S.dlg,L=parseLine(d.npc.talk[d.i]);d.full=L.tx;d.pos=0;dlgDraw();}
function dlgOpen(npc){S.dlg={npc,i:0,pos:0,full:''};$('dlgNm').textContent=npc.nm;$('dlgPt').textContent=npc.emo;$('dlg').hidden=false;$('npcTip').hidden=true;const d=dirTo(npc.n,pl.n);if(d)orient(npc.h,npc.n,d,0);sfx('hit');dlgShow();}
function dlgNext(){const d=S.dlg;if(!d)return;if(d.pos<d.full.length){d.pos=d.full.length;dlgDraw();return;}d.i++;if(d.i>=d.npc.talk.length){dlgClose();return;}dlgShow();}
$('dlg').addEventListener('click',()=>dlgNext());$('npcTip').addEventListener('click',()=>interact());
function dlgClose(){S.dlg=null;$('dlg').hidden=true;}
function npcUi(dt){const tip=$('npcTip');if(!S.npcs.length||!S.running||S.dead){if(!tip.hidden)tip.hidden=true;if(S.dlg)dlgClose();return;}
const nr=S.dlg?S.dlg.npc:nearNpc();
if(S.dlg){const d=S.dlg;if(arc(pl.n,d.npc.n)>6.5){dlgClose();}else if(d.pos<d.full.length){d.pos=Math.min(d.full.length,d.pos+dt*42);dlgDraw();}}
const pulse=0.5+0.5*Math.sin(S.t*6);
for(const n of S.npcs){const on=n===nr;n.ring.visible=on;if(on){n.rm.opacity=0.55+0.4*pulse;const sc=1+0.06*pulse;n.ring.scale.set(sc,1,sc);}for(const o of n.outl)o.visible=on;for(const x of n.em)x.emissive.setRGB(on?0.32+0.28*pulse:0,on?0.24+0.2*pulse:0,on?0.05:0);if(on)for(const m of n.mats)m.color.setHex(pulse>0.5?0xffe27a:0xfff1b0);}
if(nr&&!S.dlg){const v=wp(nr.n,3.1).project(cam);if(v.z<1){tip.hidden=false;tip.style.left=((v.x*0.5+0.5)*innerWidth)+'px';tip.style.top=((-v.y*0.5+0.5)*innerHeight)+'px';}else tip.hidden=true;}else tip.hidden=true;}
const MB=[];const fmtN=n=>n>=1e8?(n/1e8).toFixed(1)+'억':n>=1e4?Math.round(n/1e4)+'만':String(Math.max(0,Math.round(n)));
function mhpUi(){const box=$('mhp');if(!box)return;let k=0;if(S.running&&!S.dead&&S.world){for(const e of S.ents){if(e.boss||e.state==='dead')continue;if(!(S.lock===e||S.t-(e.hitT||-99)<5))continue;const v=wp(e.n,e.lift+e.spec.h+0.5).project(cam);if(v.z>=1||Math.abs(v.x)>1.1||Math.abs(v.y)>1.1)continue;let b=MB[k];if(!b){const d=document.createElement('div');d.className='mb';d.innerHTML='<div class="mn"></div><div class="mbar"><i></i></div><div class="mt"></div>';box.appendChild(d);b=MB[k]={d,n:d.children[0],f:d.children[1].firstChild,t:d.children[2]};}
b.d.style.display='block';b.d.style.left=((v.x*0.5+0.5)*innerWidth)+'px';b.d.style.top=((-v.y*0.5+0.5)*innerHeight)+'px';if(b.nm!==e.spec.name){b.nm=e.spec.name;b.n.textContent=e.spec.name;}b.f.style.width=Math.max(0,e.hp/e.mhp*100)+'%';b.t.textContent=fmtN(e.hp)+' / '+fmtN(e.mhp);k++;}}
for(let i=k;i<MB.length;i++)if(MB[i].d.style.display!=='none')MB[i].d.style.display='none';}
let PL=null;function portalUi(){const box=$('mhp');if(!box)return;if(!PL){PL=document.createElement('div');PL.className='ptl';box.appendChild(PL);}
let best=null,bd=9;if(S.running&&!S.dead&&S.world)for(const p of S.portals){const d=arc(pl.n,p.n);if(d<bd){bd=d;best=p;}}
if(!best||!ZONES[best.to]){PL.style.display='none';return;}const v=wp(best.n,4.2).project(cam);if(v.z>=1){PL.style.display='none';return;}
const txt=(best.locked?'🔒 ':'')+ZONES[best.to].n;if(PL.textContent!==txt)PL.textContent=txt;PL.style.display='block';PL.style.left=((v.x*0.5+0.5)*innerWidth)+'px';PL.style.top=((-v.y*0.5+0.5)*innerHeight)+'px';PL.style.opacity=Math.min(1,(9-bd)/3);}
let pfr=0,ptDone=null;function portraitUi(){const c=$('ptc');if(!c||!S.running||!pl.ref||S.switching)return;const nm=(S.cls==='warrior'?'전사':'마법사')+' Lv.99';if($('ptn').textContent!==nm)$('ptn').textContent=nm;const key=S.cls+S.zone;if(ptDone===key)return;if(pl.ref.root.parent!==S.world){pfr=0;return;}if(++pfr<45)return;pfr=0;
try{const cv=renderer.domElement,tc=new THREE.PerspectiveCamera(24,cv.width/cv.height,0.1,300),head=wp(pl.n,1.02),f=pl.f.clone();tc.position.copy(head).addScaledVector(f,1.7).addScaledVector(pl.n,0.06);tc.up.copy(pl.n);tc.lookAt(head);tc.updateMatrixWorld(true);const hid=[];for(const e of S.ents){if(e.root&&e.root.visible){hid.push(e.root);e.root.visible=false;}}
renderer.render(scene,tc);const dim=Math.min(cv.width,cv.height),x0=(cv.width-dim)/2,y0=(cv.height-dim)/2;c.getContext('2d').drawImage(cv,x0,y0,dim,dim,0,0,c.width,c.height);for(const r of hid)r.visible=true;ptDone=key;}catch(e){console.warn("portrait",e);ptDone=key;}}
function occUpdate(dt){if(!S.occ||!S.occ.length||!pl.ref)return;const C=cam.position,P=wp(pl.n,1.3),ab=P.clone().sub(C),L2=ab.lengthSq();if(L2<1e-4)return;const c=new THREE.Vector3(),q2=new THREE.Vector3();
for(const q of S.occ){let hit=false;const pn=q.o.position;for(const fr of[0.2,0.5,0.85]){c.copy(pn).addScaledVector(q.n,q.hh*fr);q2.copy(c).sub(C);const t=q2.dot(ab)/L2;if(t<0.03||t>0.96)continue;q2.copy(C).addScaledVector(ab,t);if(c.distanceTo(q2)<q.r){hit=true;break;}}
if(!hit&&q.a>=1)continue;const tg=hit?0.2:1;q.a+=(tg-q.a)*Math.min(1,9*dt);if(q.a>0.985){q.a=1;if(q.mats){let i=0;q.o.traverse(m=>{if(m.isMesh&&m.userData.om){m.material=m.userData.om;m.userData.om=null;}});for(const x of q.mats)x.dispose();q.mats=null;}continue;}
if(!q.mats){q.mats=[];q.o.traverse(m=>{if(m.isMesh&&!m.userData.om){const arr=Array.isArray(m.material);m.userData.om=m.material;const cl=(arr?m.material:[m.material]).map(x=>{const y=x.clone();y.transparent=true;y.needsUpdate=true;return y;});m.material=arr?cl:cl[0];q.mats.push(...cl);}});}
for(const x of q.mats){x.opacity=q.a;x.depthWrite=q.a>0.95;}}}

function updatePlayer(dt){const ref=pl.ref;if(!ref)return;
pl.inv=Math.max(0,pl.inv-dt);pl.god=Math.max(0,pl.god-dt);pl.skCd=Math.max(0,pl.skCd-dt);for(const k in pl.cds)pl.cds[k]=Math.max(0,pl.cds[k]-dt);parryTick(dt);pl.dashCd=Math.max(0,(pl.dashCd||0)-dt);if(!S.dead){pl.hp=Math.min(pl.mhp,pl.hp+pl.mhp*2*dt);pl.st=Math.min(pl.mst,pl.st+pl.mst*2*dt);}pl.stDelay-=dt;if(pl.stDelay<=0)pl.st=Math.min(pl.mst,pl.st+1500*dt);pl.flash=Math.max(0,pl.flash-dt);
if(S.dead){orient(ref.root,pl.n,pl.f,0);return;}
const mv=S.running?moveVec():null;const run=!!(K.ShiftLeft||K.ShiftRight||DT.run||Math.hypot(joy.x,joy.y)>0.8);if(pl.sk)tickSkill(dt);{const aa=K.ArrowUp||K.ArrowDown||K.ArrowLeft||K.ArrowRight,nw=performance.now();if(aa)DT.clr=nw;else if(DT.run&&nw-DT.clr>130)DT.run=false;}
if(S.running){if(S.quarter){const b=QB.clone();b.addScaledVector(pl.n,-b.dot(pl.n));if(b.lengthSq()>1e-6)pl.cf.copy(b.normalize());}if(S.camAuto){pl.pitch+=(0.4-pl.pitch)*Math.min(1,2*dt);if(mv&&pl.roll<=0&&pl.atkT<=0&&!(S.lock&&S.lock.state!=='dead')){const ang=Math.atan2(pl.n.dot(V3(0,0,0).crossVectors(pl.cf,mv)),pl.cf.dot(mv));if(Math.abs(ang)<1.75)pl.cf.applyAxisAngle(pl.n,Math.sin(ang)*1.35*dt);}}
if(S.lock&&S.lock.state!=='dead'){if(arc(pl.n,S.lock.n)>34)S.lock=null;else{const d=dirTo(pl.n,S.lock.n);if(d)turnToward(pl.cf,d,pl.n,4.5*dt);}}}
if(DT.dash){DT.dash=false;tryDash();}let speed=0,dir=null;
if(pl.roll>0){pl.roll-=dt;speed=11;dir=pl.rollDir;const k=1-Math.max(0,pl.roll)/0.45;ref.tumble.rotation.x=k*PI*2;ref.tumble.position.y=0.9-Math.sin(k*PI)*0.15;if(pl.roll<=0){ref.tumble.rotation.x=0;ref.tumble.position.y=0.9;}}
else if(pl.dashT>0){pl.dashT-=dt;speed=27;dir=pl.dashDir;pl.inv=Math.max(pl.inv,0.08);pl.fd2=(pl.fd2||0)-dt;if(pl.fd2<=0){pl.fd2=0.035;const bk=pl.n.clone().addScaledVector(pl.dashDir,-1.4/R).normalize();sparkFx(bk,0.8,0xe8f2ff,2,1.4,0.22,0.2);dustFx(bk,0.5,2);}}
else if(mv){speed=pl.sk?((pl.sk.id==='wild'&&pl.sk.t<WCH)||pl.sk.id==='giga'||pl.sk.id==='guard'?0:(run?8.6:4.5)*(pl.sk.id==='rise'?0.4:pl.sk.id==='sakura'?0.75:1)):pl.spin>0?6:(pl.atkT>0?0:(run?8.6:4.5));dir=speed>0?mv:null;}
if(mv&&speed>6&&pl.jy<=0&&pl.roll<=0){pl.fd=(pl.fd||0)-dt;if(pl.fd<=0){pl.fd=0.13;dustFx(pl.n,0.6,3);const bk=pl.n.clone().addScaledVector(pl.f,-1.2/R).normalize();sparkFx(bk,0.9,0xffffff,2,1.2,0.25,0.3);}}
if(pl.atkT>0){pl.atkAge+=dt;pl.atkT-=dt;if(!pl.atkDone&&pl.atkAge>=pl.atkFire)fireAtk();if(pl.atkT<=0&&pl.atkKind==='atk'){if(pl.combo<3)pl.comboT=0.5;else{pl.combo=0;pl.atkLock=0.04;}}}
if(pl.spin>0){pl.spin-=dt;pl.spinAng+=dt*SPINW;pl.spinTick-=dt;if(pl.spinTick<=0){pl.spinTick=PI/SPINW;pl.spinN++;const slam=pl.spinN%2===0;let hit=false;for(const e of S.ents){if(e.state==='dead')continue;if(arc(pl.n,e.n)<(slam?6.4:5.6)+e.spec.rad){hitEnt(e,slam?18:8,pl.n,slam?1.1:0.4);hit=true;}}if(slam){slamFx(pl.n,6.6,false);if(hit)hitstop(0.05);}else sfx(hit?'hit':'swing');}if(pl.spin<=0)endSpin();}
pl.comboT=Math.max(0,pl.comboT-dt);pl.atkLock=Math.max(0,pl.atkLock-dt);
if(S.running&&pl.atkT<=0&&(K.KeyZ||S.btnAtk||S.mouseAtk))startAtk('atk');
if(pl.lungeT>0){const st=Math.min(pl.lungeT,dt);moveAlong(pl.n,pl.f.clone(),pl.lungeV*st,[pl.f,pl.cf,pl.rollDir]);pl.lungeT-=st;}
if(pl.jy>0||pl.vy>0){if(pl.ff&&pl.jy>0.05)pl.vy=Math.min(pl.vy,-40);pl.vy-=(pl.vy>0?48:34)*dt;;pl.jy+=pl.vy*dt;if(pl.jy<=0){if(pl.ff){pl.ff=0;slamFx(pl.n,4.2,false);ringBurst(pl.n,0.4,4.2,0xbfe9ff,0.35,0.2);dustFx(pl.n,1.4,8);sparkFx(pl.n,0.2,0xfff0c0,10,6,0.4,2.2);shake(0.16);sfx('boom');S.soft=1;for(const e of S.ents){if(e.state==='dead')continue;if(arc(pl.n,e.n)<4.0+e.spec.rad)hitEnt(e,8,pl.n,1.0);}S.soft=0;}pl.jy=0;pl.vy=0;pl.jland=0.14;pl.jflip=0;pl.dj=0;ringBurst(pl.n,0.3,1.1,0xffffff,0.25,0.15);}else pl.jt+=dt;}pl.jland=Math.max(0,pl.jland-dt);
if(dir&&speed>0)moveAlong(pl.n,dir,speed*dt,[pl.f,pl.cf,pl.rollDir]);
/* 충돌과 경계 */
for(const s of S.solids){const d=arc(pl.n,s.n);if(d<s.r+0.45){const dd=dirTo(pl.n,s.n);if(dd)moveAlong(pl.n,dd.negate(),(s.r+0.45)-d,[pl.f,pl.cf,pl.rollDir]);}}
const cN=S.cN,dc=arc(pl.n,cN);if(dc>S.Z.L){const dd=dirTo(pl.n,cN);if(dd)moveAlong(pl.n,dd,dc-S.Z.L,[pl.f,pl.cf,pl.rollDir]);}
/* 바라보는 방향 */
if(pl.roll>0)pl.f.copy(pl.rollDir);
else if(pl.dashT>0&&pl.dashDir)turnToward(pl.f,pl.dashDir,pl.n,30*dt);
else if(pl.sk){if(pl.sk.id==='wild'){play(ref,'idle',0.12,false,1);const ia=ref.acts.idle;if(ia)ia.timeScale=pl.sk.t<WCH-0.12?0.001:1.2;}else if(mv&&(pl.sk.id==='chase'||pl.sk.id==='rain'))turnToward(pl.f,mv,pl.n,10*dt);}
else if(pl.atkT>0){if(pl.atkDir&&!pl.atkDone)turnToward(pl.f,pl.atkDir,pl.n,16*dt);}
else if(S.lock&&S.lock.state!=='dead'){const d=dirTo(pl.n,S.lock.n);if(d)turnToward(pl.f,d,pl.n,12*dt);}
else if(mv)turnToward(pl.f,mv,pl.n,14*dt);
orient(ref.root,pl.n,pl.f,pl.jy);
if(pl.spinFx){orient(pl.spinFx,pl.n,pl.f,pl.jy);pl.spinFx.userData.sp.rotation.y+=SPINW*dt;}
pl.lean=(pl.lean||0)+((((mv&&run&&!pl.sk&&pl.atkT<=0&&pl.spin<=0&&pl.jy<=0)||pl.dashT>0)?0.5:0)-(pl.lean||0))*Math.min(1,11*dt);
if(pl.sk&&pl.roll<=0&&!(pl.dashT>0&&pl.sk.id!=='sakura'&&pl.sk.id!=='wild')){const sk=pl.sk,q=sk.t/sk.dur;if(sk.id==='sakura'){ref.tumble.rotation.set(0.12,easeIO(Math.min(1,q))*PI*4,0);ref.tumble.position.y=0.9;}else if(sk.id==='wild'){const cq=Math.min(1,sk.t/WCH);const cr=Math.min(1,sk.t/0.35);ref.tumble.rotation.set(sk.t<WCH-0.12?0.38*cr:(sk.t<WCH+0.4?0.4:0.05),(sk.t<WCH-0.12?0.25*cr:0)+(window.__dbgYaw||0),0);ref.tumble.position.y=0.9-(sk.t<WCH?0.3*cr:0);}else if(sk.id==='rise'){ref.tumble.rotation.set(sk.t<0.12?0.2:-0.2,0,0);ref.tumble.position.y=0.9;}else{ref.tumble.rotation.set(-0.12,0,0);ref.tumble.position.y=0.9;}}
else if(pl.parry>0&&pl.roll<=0){const w=pSw(),e2=w*w*(3-2*w),dr=pl.pSwDir||1,sn=Math.sin(w*PI);ref.tumble.rotation.set(0.12+0.22*sn,dr*(-0.75+1.5*e2),dr*(0.22-0.44*e2));ref.tumble.position.y=0.9-0.14*sn;}
else if(pl.spin>0&&pl.roll<=0){ref.tumble.rotation.set(0.22,pl.spinAng%(2*PI),0);ref.tumble.position.y=0.84+Math.abs(Math.sin(pl.spinAng*2))*0.05;}
else if(pl.atkT>0&&pl.atkKind==='atk'&&pl.P&&pl.roll<=0){const pr=clamp(pl.atkAge/pl.atkLen,0,1),sn=Math.sin(pr*PI);const rt=ref.acts.atk1?0.0:1;ref.tumble.rotation.set(pl.P.lean*sn*rt,pl.P.twist*sn*rt,0);ref.tumble.position.y=0.9+(pl.P.hop?sn*(rt?0.45:0.2):0);}
else if(pl.roll<=0&&pl.jy>0){const T=pl.dj?0.72:0.6,k=clamp(pl.jt/T,0,1),up=pl.vy>0;
let rx;if(pl.jflip){rx=easeIO(clamp((k-0.08)/0.84,0,1))*PI*2;}else{rx=up?-0.12:0.22*Math.min(1,(1-k)*3);}
ref.tumble.rotation.set(rx,0,0);const tuck=pl.jflip?Math.sin(clamp((k-0.08)/0.84,0,1)*PI)*0.18:0;
ref.tumble.position.y=0.9-tuck;const sy=up?1.1:1.02,sxz=1/Math.sqrt(sy);ref.root.scale.set(sxz,sy,sxz);}
else if(pl.roll<=0&&pl.jland>0){const q=pl.jland/0.14,s=Math.sin(q*PI/2);ref.tumble.rotation.set(0.15*s,0,0);ref.tumble.position.y=0.9-0.2*s;ref.root.scale.set(1+0.12*s,1-0.16*s,1+0.12*s);}
else if(pl.roll<=0){ref.tumble.rotation.set(pl.lean||0,0,0);ref.tumble.position.y=0.9-0.16*((pl.lean||0)/0.5);}
if(!(pl.jy>0||pl.jland>0))ref.root.scale.set(1,1,1);
/* 애니메이션 */
if(pl.atkT<=0&&pl.roll<=0&&ref.cur==='atk'&&(!ref.acts.atk||!ref.acts.atk.isRunning()||pl.atkT<=0)){}
if(pl.roll>0)play(ref,'run',0.05,false,1.6);
else if(pl.dashT>0)play(ref,'run',0.05,false,2.4);
else if(pl.sk){if(pl.sk.id==='guard'||(pl.sk.id==='giga'&&!(ref.cur==='skill'||/^atk\d/.test(ref.cur||''))))play(ref,'idle',0.1,false,1);else if(pl.sk.id!=='wild'&&pl.sk.id!=='giga'&&!/^sk_/.test(ref.cur||''))play(ref,mv?(run?'run':'walk'):'idle',0.1,false,mv?1.75:1.2);}
else if(pl.atkT>0){if(!(ref.cur==='skill'||/^atk\d/.test(ref.cur)))play(ref,mv?'run':'idle',0.1,false,1);}
else if(pl.spin>0)play(ref,'run',0.1,false,1.8);
else if(pl.jy>0)play(ref,ref.acts.jump?'jump':'run',0.06,false,2.4);
else if(mv){if(run)play(ref,'run',0.15,false,1.75);else play(ref,'walk',0.15,false,1.75);}
else play(ref,'idle',0.2,false,1.2);
if(pl.atkT<=0&&ref.cur==='atk')ref.cur='';
ref.holder.userData.mats.forEach(m=>m.emissive.setHex(pl.flash>0?0xaa2200:(pl.god>0?0x4a3a00:pl.inv>0&&pl.roll<=0&&Math.floor(S.t*20)%2?0x333333:0)));
}
function die(){S.dead=true;S.lock=null;endSpin();pl.god=0;play(pl.ref,'die',0.1,true);$('over').hidden=false;$('overT').textContent='쓰러졌어요';$('overP').textContent='마을에서 다시 시작해요';
setTimeout(()=>{if(!S.dead)return;$('over').hidden=true;pl.hp=pl.mhp;pl.st=pl.mst;S.dead=false;S.bossDead=false;goZone('village');},3200);}
function victory(){setTimeout(()=>{$('over').hidden=false;$('overT').textContent='보스 처치!';$('overP').textContent='드래곤을 쓰러뜨렸어요. 가운데 문으로 마을에 돌아갈 수 있어요';sfx('win');},1400);
setTimeout(()=>{$('over').hidden=true;},5200);
const c=S.cN;S.portals.push(makePortal({id:'toVillage',n:c.clone(),to:'village',label:'마을로 돌아가는 문'}));updateQuest();}

/* ---------- 몬스터 ---------- */
const EN={
cactus:{a:'cactus',name:'선인장',h:2.0,hp:60,spd:3.2,aggro:7,kind:'melee',range:2.0,wind:0.75,cd:1.6,dmg:12,rad:0.7,r2:2.4,fly:0},
alien:{a:'alien',name:'외계인',h:1.9,hp:50,spd:3.6,aggro:7.5,kind:'lunge',range:4.6,wind:0.7,cd:2.0,dmg:14,rad:0.7,dash:3.4,dashT:0.35,fly:0},
mushroom:{a:'mushroom',name:'버섯',h:2.1,hp:80,spd:1.9,aggro:7,kind:'ranged',range:9,wind:0.9,cd:2.6,dmg:10,rad:0.8,proj:7,fly:0},
bee:{a:'bee',name:'벌',h:1.4,hp:35,spd:5,aggro:8,kind:'lunge',range:5.2,wind:0.6,cd:1.8,dmg:10,rad:0.6,dash:3.8,dashT:0.3,fly:1.5},
bat:{a:'bat',name:'박쥐',h:1.5,hp:30,spd:5.5,aggro:8,kind:'lunge',range:5.2,wind:0.55,cd:1.7,dmg:8,rad:0.6,dash:3.8,dashT:0.28,fly:1.9},
orc:{a:'orc',name:'오크',h:2.2,hp:95,spd:2.9,aggro:7,kind:'melee',range:2.2,wind:0.8,cd:1.7,dmg:15,rad:0.8,r2:2.6,fly:0},
dino:{a:'dino',name:'공룡',h:1.9,hp:70,spd:3.5,aggro:7.5,kind:'lunge',range:4.6,wind:0.7,cd:2.0,dmg:14,rad:0.7,dash:3.4,dashT:0.35,fly:0},
dragon:{a:'dragon',name:'하늘의 폭군 드래곤',h:4.6,hp:2280,spd:3.4,aggro:99,kind:'boss',range:99,rad:2.3,fly:0.8}};
for(const k in EN)EN[k].hp*=300000;EN.dragon.hp=200000000000;
async function spawnEnt(type,n,f){const spec=EN[type],a=await load(spec.a);if(!a)return null;
const holder=inst(a,spec.h,{ownMat:true}),root=new THREE.Group();root.add(holder);S.world.add(root);
const m=mkActs(holder,a.anims,a.clips||MON);const e={type,spec,root,holder,mx:m.mx,acts:m.acts,cur:'',n:n.clone(),f:f.clone(),hp:spec.hp,mhp:spec.hp,state:'idle',t:0,cd:1+Math.random(),stun:0,flash:0,lift:spec.fly,decal:null,boss:type==='dragon',bob:Math.random()*6,home:n.clone()};
if(a.anims.length&&!e.acts.idle&&e.acts.fly)e.acts.idle=e.acts.fly;play(e,spec.fly?'fly':'idle',0);S.ents.push(e);orient(root,e.n,e.f,e.lift);return e;}
function faceTo(e,t,rate,dt){const d=dirTo(e.n,t);if(d)turnToward(e.f,d,e.n,rate*dt);}
function updateEnt(e,dt){const sp=e.spec;e.bob+=dt*3;
for(const m of e.holder.userData.mats)m.emissive.setHex(e.flash>0?0xaa3010:(e.state==='wind'&&Math.floor(S.t*16)%2?0x551100:0));e.flash=Math.max(0,e.flash-dt);
if(e.sq>0&&e.state!=='dead'){e.sq=Math.max(0,e.sq-dt);const s=Math.sin(e.sq/0.2*PI);e.root.scale.set(1+0.2*s,1-0.22*s,1+0.2*s);}
if(e.state==='dead'&&e.exec){const x=e.exec;x.t+=dt;if(x.t<0){e.holder.rotation.set(0,0,0);orient(e.root,e.n,e.f,e.lift*0.4);return;}if(!x.s){x.s=1;sparkFx(e.n,e.lift+e.spec.h*0.5,0xffc070,16,8,0.5,3);ringBurst(e.n,0.4,3.2,0xff8a3a,0.4,0.3);}moveAlong(e.n,x.f.clone(),20*dt*Math.max(0.15,1-x.t),[e.f]);orient(e.root,e.n,e.f,e.lift*0.4+Math.sin(Math.min(1,x.t/0.7)*PI)*2.6);e.holder.rotation.set(x.t*9,x.t*13,0);
if(x.t>0.7&&!x.b){x.b=true;sparkFx(e.n,e.lift+e.spec.h*0.5,0xffa050,34,10,0.7,3.6);ringBurst(e.n,0.4,4.2,0xffb060,0.45,0.3);ringBurst(e.n,0.2,2.4,0xffffff,0.3,0.3);glowBall(e.n,e.lift+e.spec.h*0.5,0.8,0xffd08a,0.35,4);shake(0.14);sfx('boom');S.world.remove(e.root);e.gone=true;}return;}
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
e.lift=(sp.fly?sp.fly+Math.sin(e.bob)*0.25-(e.state==='dash'?0.9:0):0)+(e.pop>0?2.6*Math.sin(PI*(1-e.pop/0.8)):0);if(e.pop>0){e.pop-=dt;e.stun=Math.max(e.stun,0.1);}
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
if(b.hp<=b.mhp*0.5&&!b.p2){b.p2=true;b.pat=null;b.tr=3.4;b.trT=0;b.invul=true;b.vol=0;toast('2페이즈 돌입!',2400);sfx('boom');ringBurst(b.n,1,12,0xff5a3a,0.8,0.3);p2Stage();$('bossName').textContent='하늘의 폭군 드래곤 · 2페이즈';}
if(b.tr>0){b.tr-=dt;b.trT+=dt;faceTo(b,pl.n,2,dt);play(b,'fly',0.2,false,0.7);b.lift=sp.fly+0.6*Math.sin(Math.min(1,b.trT/1.2)*PI/2)+Math.sin(b.bob)*0.1;b.hp=Math.min(b.mhp,b.hp+b.mhp*dt/3.2);
b.cfx=(b.cfx||0)-dt;if(b.cfx<=0){b.cfx=0.12;const k=b.trT/3.4;ringBurst(b.n,0.5+k*0.5,7-4*k,0xff6a3a,0.3,b.lift);sparkFx(b.n,b.lift,0xffa060,4,6,0.4,2);}shake(0.05+0.08*(b.trT/3.4));
if(b.tr<=0){b.invul=false;b.wait=0.8;b.holder.userData.mats.forEach(m=>{if(m.color)m.color.lerp(new THREE.Color(0xff6a4a),0.35);});ringBurst(b.n,1,16,0xff3a2a,0.8,0.3);ringBurst(b.n,0.5,9,0xffd27a,0.6,0.4);sfx('boom');shake(0.5);toast('드래곤이 폭주했어요!',2200);}
orient(b.root,b.n,b.f,b.lift);return;}
b.lift=sp.fly+Math.sin(b.bob)*0.2;
if(!b.pat){b.wait-=dt;faceTo(b,pl.n,4,dt);play(b,'fly',0.2,false,b.p2?1.3:1);
const ideal=8.5;if(d>ideal+2)moveAlong(b.n,b.f.clone(),sp.spd*dt,[b.f]);else if(d<ideal-3)moveAlong(b.n,b.f.clone().negate(),sp.spd*0.8*dt,[b.f]);
else{const side=V3(0,0,0).crossVectors(b.n,b.f);moveAlong(b.n,side.multiplyScalar(b.side||1),1.4*dt,[b.f]);}
if(b.wait<=0){const opts=['fire','charge','wave','meteor'];if(b.p2)opts.push('meteor','fire');let p;do{p=opts[Math.floor(Math.random()*opts.length)];}while(p===b.last&&opts.length>1);b.last=p;b.pat=p;b.pt=0;b.fired=0;b.side=Math.random()<0.5?-1:1;}}
else{b.pt+=dt;const p=b.pat,pt=b.pt;
if(p==='fire'){faceTo(b,pl.n,6,dt);if(pt<0.1&&!b.pa){b.pa=true;play(b,'atk',0.1,true);}
{const NV=b.p2?14:10;while((b.vol||0)<NV&&pt>=1.0+(b.vol||0)*0.07){b.vol=(b.vol||0)+1;const base=dirTo(b.n,pl.n)||b.f;const f=base.clone().applyAxisAngle(b.n,(Math.random()-0.5)*0.2);spawnProj({n:b.n.clone(),f,spd:15,lift:1.4,rad:0.5,dmg:14,color:0xff7a3a,from:'enemy',life:2.4});sfx('fire');}
if(pt>=1.0+NV*0.07+0.8)endPat(b);}}
else if(p==='slam'){faceTo(b,pl.n,3,dt);if(!b.fired){b.fired=1;const cnt=b.p2?3:1;for(let i=0;i<cnt;i++){setTimeout(()=>{if(b.state==='dead'||S.dead||!S.running)return;const tn=pl.n.clone();play(b,'atk',0.1,true);decalRing(tn,3.7,0xff4a4a,1.15,()=>{ringBurst(tn,0.5,4.3,0xff7a3a,0.5,0.25);glowBall(tn,1,1.3,0xffc08a,0.4,2.5);sfx('boom');if(arc(tn,pl.n)<3.7)hurt(28,tn,1.8);});},i*650);}}
if(pt>=(b.p2?2.7:1.9))endPat(b);}
else if(p==='charge'){if(pt<1.0){if(pt<0.8){const tp=pl.n.clone();faceTo(b,tp,14,dt);}if(!b.strip){b.dirL=null;b.strip=decalStrip(b.n,b.f.clone(),40,2.6,0xff4a4a,1.0);}
if(b.strip){b.strip.g.visible=true;const fl=b.f.clone();orient(b.strip.g,b.n,fl,0.16);let el=0;for(let t=1;t<60;t+=1){const q=b.n.clone().addScaledVector(fl,t/R).normalize();el=t;if(arc(q,S.cN)>=S.Z.L-1.2)break;}b.strip.g.scale.set(1,1,el/40);}}
else if(!b.cend&&pt<3.2){if(b.strip){b.strip.cancel=true;b.strip=null;b.lift=0.5;}if(!b.cdir){b.cdir=b.f.clone();b.hit=false;}moveAlong(b.n,b.cdir.clone(),50*dt,[b.f,b.cdir]);b.f.copy(b.cdir);if(arc(b.n,S.cN)>=S.Z.L-1.3){b.cend=true;b.rt0=pt;}if(!b.hit&&arc(b.n,pl.n)<sp.rad+0.6){b.hit=true;hurt(30,b.n,2);}
const dc=arc(b.n,S.cN);if(dc>S.Z.L-1){const dir=dirTo(b.n,S.cN);if(dir)moveAlong(b.n,dir,dc-(S.Z.L-1),[b.f,b.cdir]);}}
else{b.cdir=null;if(!b.rest){b.rest=true;b.lift=0.4;}faceTo(b,pl.n,2,dt);if(pt>=(b.rt0||pt)+1.7||pt>=5){b.rest=false;b.cend=false;b.rt0=0;endPat(b);}}}
else if(p==='meteor'){faceTo(b,pl.n,3,dt);if(!b.pa){b.pa=true;b.mt=0;play(b,'atk',0.1,true);toast('메테오! 붉은 표시에서 벗어나세요',1600);ringBurst(b.n,1,6,0xff7a3a,0.6,0.3);sfx('boom');}
const NM=b.p2?40:26,gap=b.p2?0.085:0.12;while(b.mt<NM&&pt>=0.8+b.mt*gap){b.mt++;let tn;if(b.mt%3===1)tn=pl.n.clone();else tn=pointAt(pl.n,Math.random()*10,Math.random()*PI*2);const da=arc(tn,S.cN),lim=S.Z.L-1.5;if(da>lim){const dr=dirTo(tn,S.cN);if(dr)moveAlong(tn,dr,da-lim,[]);}dropMeteor(tn);}
if(pt>=0.8+NM*gap+1.2)endPat(b);}
else if(p==='wave'){faceTo(b,pl.n,2,dt);if(!b.pa){b.pa=true;play(b,'atk',0.1,true);toast('파동! 점프(Space)로 넘어가세요',1500);decalRing(b.n,3.2,0xffd45a,0.95);}
if(pt>=1.0&&b.fired<1){b.fired=1;spawnWave(b);}if(b.p2&&pt>=1.9&&b.fired<2){b.fired=2;spawnWave(b);}
if(pt>=(b.p2?3.6:2.6))endPat(b);}
else if(p==='nova'){faceTo(b,pl.n,3,dt);if(pt>=0.8&&b.fired<1){b.fired=1;novaRing(b,0);play(b,'atk',0.1,true);ringBurst(b.n,1,5,0xffb04a,0.6,0.3);}
if(pt>=1.6&&b.fired<2){b.fired=2;novaRing(b,0.26);}
if(pt>=2.6)endPat(b);}
b.lift=b.pat==='charge'?(b.rest?0.4:b.lift):b.lift;}
orient(b.root,b.n,b.f,(b.pat==='charge'&&b.pt>=1.0)?b.lift:b.lift);}
function dropMeteor(tn){const life=0.95;decalRing(tn,2.4,0xff4a4a,life,()=>{ringBurst(tn,0.5,5.2,0xff7a3a,0.5,0.25);ringBurst(tn,0.3,3,0xffd27a,0.4,0.3);glowBall(tn,1,1.6,0xffc08a,0.4,2.8);dustFx(tn,2,8);sparkFx(tn,0.3,0xffa040,14,8,0.5,3);sfx('boom');shake(0.1);if(!S.dead&&arc(tn,pl.n)<2.4)hurt(26,tn,1.6);});
const m=new THREE.Group(),core=new THREE.Mesh(new THREE.SphereGeometry(0.6,12,10),bm(0xff8a3a,1)),glow=new THREE.Mesh(new THREE.SphereGeometry(1.0,12,10),bm(0xff4a1a,0.35)),tail=new THREE.Mesh(new THREE.ConeGeometry(0.6,6,10),bm(0xff6a2a,0.35));tail.position.y=3.4;m.add(core,glow,tail);const side=any(tn),back=V3(0,0,0).addScaledVector(tn,32).addScaledVector(side,12).normalize();m.quaternion.setFromUnitVectors(V3(0,1,0),back);
addFx(m,life,k=>{const h=0.8+(1-k)*32,o=(1-k)*12;m.position.copy(wp(tn,h)).addScaledVector(side,o);m.visible=k<0.99;});}
function spawnWave(b){const c=b.n.clone(),gp=new THREE.Group(),ring=new THREE.Mesh(new THREE.RingGeometry(0.92,1,72),bm(0xffd45a,0.95,true)),wall=new THREE.Mesh(new THREE.CylinderGeometry(1,1,2.8,72,1,true),new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,opacity:0.5,side:THREE.DoubleSide,depthWrite:false})),wall2=new THREE.Mesh(new THREE.CylinderGeometry(0.97,0.97,1.3,72,1,true),new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,opacity:0.65,side:THREE.DoubleSide,depthWrite:false}));{const paint=(m,bot,top)=>{const p=m.geometry.attributes.position,col=new Float32Array(p.count*3),hh=m.geometry.parameters.height;for(let i=0;i<p.count;i++){const u=p.getY(i)/hh+0.5;for(let j=0;j<3;j++)col[i*3+j]=bot[j]+(top[j]-bot[j])*u;}m.geometry.setAttribute('color',new THREE.BufferAttribute(col,3));};paint(wall,[1,0.55,0.15],[0.5,0.04,0.04]);paint(wall2,[1,0.85,0.4],[1,0.35,0.08]);}ring.rotation.x=-PI/2;ring.position.y=0.14;wall.position.y=1.4;wall2.position.y=0.65;gp.add(ring,wall,wall2);shake(0.25);orient(gp,c,any(c),0);S.world.add(gp);S.waves.push({c,r:1.6,g:gp,hit:false,wl:wall,w2:wall2,rg:ring});sfx('boom');ringBurst(c,1,4,0xffd45a,0.5,0.25);ringBurst(c,1.4,8,0xff6a20,0.5,0.2);dustFx(c,3,12);sparkFx(c,0.5,0xffa040,30,10,0.6,3);}
function waveTick(dt){for(let i=S.waves.length-1;i>=0;i--){const w=S.waves[i];w.pr=w.r;w.r+=24*dt;w.g.scale.set(w.r,1+Math.min(0.5,w.r/60),w.r);{const fa=Math.max(0.15,1-w.r/46);if(w.wl){w.wl.material.opacity=0.55*fa;w.w2.material.opacity=0.7*fa;w.rg.material.opacity=fa;}if((w.k=(w.k||0)+1)%2===0&&S.fxs.length<200){const a2=Math.random()*PI*2,ax=any(w.c),bx=V3(0,0,0).crossVectors(w.c,ax).normalize(),pp=w.c.clone().addScaledVector(ax,Math.cos(a2)*w.r/R).addScaledVector(bx,Math.sin(a2)*w.r/R).normalize();sparkFx(pp,0.3,0xffa040,2,3,0.35,2);}}
if(!w.hit&&!S.dead&&arc(w.c,pl.n)>=(w.pr||0)-0.6&&arc(w.c,pl.n)<=w.r+0.6){w.hit=true;if(pl.jy<0.75&&pl.roll<=0)hurt(24,w.c,1.2);}
if(w.r>42){S.world.remove(w.g);S.waves.splice(i,1);}}}
function novaRing(b,off){const N=14;for(let i=0;i<N;i++){if(i%7===3||i%7===4)continue;const f=b.f.clone().applyAxisAngle(b.n,i*2*PI/N+off);spawnProj({n:b.n.clone(),f,spd:9,lift:1.0,rad:0.5,dmg:14,color:0xffb04a,from:'enemy',life:3});}sfx('fire');}
function p2Stage(){const c=new THREE.Color(0x3a0c14);scene.background=c;scene.fog=new THREE.Fog(c,16,52);if(S.hemi){S.hemi.color.setHex(0xff7a5a);S.hemi.groundColor.setHex(0x40101a);S.hemi.intensity=1.0;}if(S.sun){S.sun.color.setHex(0xff8a5a);S.sun.intensity=1.2;}if(S.floor&&S.floor.material.color)S.floor.material.color.setHex(0xff8a7a);
S.world.traverse(m=>{if(m.isMesh&&m!==S.floor&&m.material&&m.material.emissive&&!m.userData.isOutline&&m.parent&&m.parent.type==='Group'&&!S.ents.some(e=>e.holder&&m.parent===e.holder)){}});
const rm=new THREE.MeshBasicMaterial({color:0xff3a1a,transparent:true,opacity:0.0,side:THREE.DoubleSide,depthWrite:false,fog:false}),rg=new THREE.Mesh(new THREE.RingGeometry(S.Z.L-0.7,S.Z.L+0.5,96),rm);rg.rotation.x=-PI/2;const gg=new THREE.Group();gg.add(rg);orient(gg,S.cN,any(S.cN),0.12);S.world.add(gg);S.p2ring=rm;
for(let i=0;i<24;i++){const a=i*PI/12,n=pointAt(S.cN,S.Z.L,a);const fm=new THREE.MeshBasicMaterial({color:0xff6a2a,transparent:true,opacity:0.8,fog:false,depthWrite:false}),fl=new THREE.Mesh(new THREE.ConeGeometry(0.5,2.4,6),fm);const g2=new THREE.Group();fl.position.y=1.2;g2.add(fl);orient(g2,n,any(n),0);S.world.add(g2);addFx(g2,600,k=>{const t=S.t*6+i;fl.scale.set(1+0.2*Math.sin(t),1+0.35*Math.sin(t*1.7),1+0.2*Math.sin(t));fm.opacity=0.7+0.2*Math.sin(t*1.3);});}
addFx(gg,600,k=>{rm.opacity=0.35+0.2*Math.sin(S.t*5);});}
const BPAL=['#ff4d4d','#ff9a3d','#ffd93d','#9be24a','#3fd37a','#35d0d0','#3d9bff','#6a6aff','#b36aff','#ff6ad0'];
function bossBarUpd(b){const f=Math.max(0,b.hp/b.mhp),fl=$('bossFill'),bar=fl.parentNode;if(!b.p2){fl.style.width=f*100+'%';fl.style.background='';bar.style.background='';$('bossX').textContent='';return;}
const L=Math.max(1,Math.ceil(f*10-1e-6)),w=f*10-(L-1);fl.style.width=(f<=0?0:Math.min(100,w*100))+'%';fl.style.background=BPAL[(L-1)%10];bar.style.background=L>1?BPAL[(L-2)%10]:'';$('bossX').textContent='x'+L;}
function endPat(b){b.cend=false;b.rt0=0;b.vol=0;b.pat=null;b.pa=false;b.fired=0;b.strip=null;b.cdir=null;b.wait=b.p2?0.5:1.0;b.lift=b.spec.fly;}

/* ---------- 구역 ---------- */
function makePortal(o){const n=o.n||toN(o.th,o.ph),g=new THREE.Group(),col=o.locked?0xff5a5a:0x8fe3ff;
const ring=new THREE.Mesh(new THREE.RingGeometry(1.0,1.5,40),bm(col,0.85,true));ring.rotation.x=-PI/2;ring.position.y=0.12;
const beam=new THREE.Mesh(new THREE.CylinderGeometry(1.0,1.2,5,24,1,true),bm(col,0.2,true));beam.position.y=2.5;
const core=new THREE.Mesh(new THREE.CircleGeometry(1.0,32),bm(col,0.3,true));core.rotation.x=-PI/2;core.position.y=0.11;g.add(ring,beam,core);orient(g,n,any(n),0);S.world.add(g);
return Object.assign({},o,{n,g,ring,beam,core});}
function updateQuest(){const q=$('quest');if(!q)return;if(S.zone==='village')q.textContent='문으로 나가 필드에서 몬스터 1마리를 잡으세요 ('+Math.min(1,S.kills)+'/1)';
else if(S.zone==='field')q.textContent=S.kills>=1?'보스 스테이지 문이 열렸어요. 길 끝으로 가세요':'몬스터 처치 '+S.kills+'/1, 길 끝 문이 열려요';
else q.textContent=S.bossDead?'클리어! 가운데 문으로 마을에 돌아가요':'붉은 표시는 구르기(C), 파동은 점프(Space)로 피하세요';q.innerHTML=q.textContent.replace(/(\d+\/3)/,'<b class="qn">$1</b>');}
async function buildZone(name){const Z=ZONES[name];S.Z=Z;S.zone=name;$('bossBar').hidden=true;
const keys=new Set([...Z.items.map(i=>i[0]),...Z.scatter.map(i=>i[0]),...(Z.ring||[]),...(Z.npcs||[]).map(n=>n.k),...(Z.spawns||[]).map(s=>s[0])]);if(name==='boss')keys.add('dragon');
await Promise.all([...keys].map(k=>load(k)));
if(S.world){scene.remove(S.world);}
const world=new THREE.Group();scene.add(world);S.world=world;S.ents=[];S.projs=[];S.fxs=[];S.decals=[];S.solids=[];S.portals=[];S.npcs=[];S.occ=[];S.wells=[];S.mixers=[];S.waves=[];S.lock=null;S.boss=null;
scene.background=new THREE.Color(Z.sky);scene.fog=new THREE.Fog(lin(Z.sky),Z.night?18:28,Z.night?62:85);
S.hemi=new THREE.HemisphereLight(Z.hemi[0],Z.hemi[1],Z.hemi[2]);world.add(S.hemi);
const sun=new THREE.DirectionalLight(Z.night?0xb8a8ff:0xfff4e0,Z.sun);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);const sc=sun.shadow.camera;sc.left=-16;sc.right=16;sc.top=16;sc.bottom=-16;sc.near=1;sc.far=60;sun.shadow.bias=-0.0008;world.add(sun);world.add(sun.target);S.sun=sun;
const pg=W.planetGeo();const pl_=new THREE.Mesh(pg,new THREE.MeshToonMaterial({map:W.floorTex(name)}));pl_.position.set(0,0,0);pl_.receiveShadow=true;world.add(pl_);S.floor=pl_;
const put=(a,h,n,spin)=>{const o=inst(a,h);const f=any(n).applyAxisAngle(n,spin||0);orient(o,n,f,0);world.add(o);return o;};
const A=k=>W.cache[k]?W.cache[k].__a:null;
const cN=toN(Z.center[0],Z.center[1]);S.cN=cN;
const get=async k=>await load(k);
const TREE=/^(tree|pine|autumn|birch|willow)/,OCC=/^(column|inn|house|cottage|statue|stall|cart|wagon|tree|pine|autumn|birch|willow)/;const pnAll=(Z.portals||[]).map(p=>toN(p.th,p.ph));
for(const [k,h,th,ph,sp] of Z.items){if(k==='tree1'&&th>0.9)continue;const a=await get(k);if(!a)continue;let n=toN(th,ph);
if(name==='field'&&TREE.test(k)&&arc(cN,n)<Z.L*0.8){const d=dirTo(cN,n);if(d){const ref=dirTo(cN,pointAt(cN,1,0)),cr=V3(0,0,0).crossVectors(cN,ref),bearing=Math.atan2(d.dot(cr),d.dot(ref));n=pointAt(cN,Z.L*(0.88+((sp||0)*0.03)),bearing);if(pnAll.some(p=>arc(p,n)<7))continue;}}const po=put(a,h,n,sp);if(OCC.test(k))S.occ.push({o:po,n:n.clone(),hh:h,r:(SOLID[k]||0.9)+0.5,a:1});const r=SOLID[k];if(r){S.solids.push({n,r});if(SOLID_X[k]){const f=any(n).applyAxisAngle(n,sp||0);for(const [d] of SOLID_X[k])S.solids.push({n:n.clone().addScaledVector(f,d/R).normalize(),r:r-0.3});}}}
const rd=rnd(name.length*97+11);
for(const [k,h,cnt] of Z.scatter){const a=await get(k);if(!a)continue;for(let i=0;i<cnt*2;i++){const n=pointAt(cN,Math.sqrt(rd())*Z.L*0.95,rd()*PI*2);if(onPath(name,n))continue;put(a,h*(0.8+rd()*0.5),n,rd()*6);}}
/* 경계 장식 */
if(Z.ring&&Z.ring.length){const RH={brocks:1,bbush:1.1,btree4:5,rock:1,bush:.8,pine:5,tree1:4.6};const cnt=Math.floor(2*PI*Z.L/2.4);const pn=(Z.portals||[]).map(p=>toN(p.th,p.ph));
for(let i=0;i<cnt;i++){const n=pointAt(cN,Z.L+0.6,i*2*PI/cnt+rd()*0.1);if(pn.some(p=>arc(p,n)<4))continue;const k=Z.ring[i%Z.ring.length],a=await get(k);if(a)put(a,RH[k]||1,n,rd()*6);}}
/* NPC, 우물, 포탈 */
for(const nc of (Z.npcs||[])){const a=await get(nc.k);if(!a)continue;const n=toN(nc.th,nc.ph),h=inst(a,nc.h,{ownMat:true,tint:nc.tint,tintAmt:0.55});orient(h,n,any(n).applyAxisAngle(n,nc.spin||0),0);world.add(h);const m=mkActs(h,a.anims,{c:nc.clip});if(m.acts.c)m.acts.c.play();S.npcs.push(npcFx(h,n,nc));}
for(const w of (Z.wells||[]))S.wells.push(toN(w.th,w.ph));
for(const p of (Z.portals||[]))S.portals.push(makePortal(Object.assign({locked:!!p.needKills&&S.kills<p.needKills},p)));
/* 몬스터 */
S.rsT=10;if(Z.spawns){for(const [t,th,ph] of Z.spawns){const n=toN(th,ph);await spawnEnt(t,n,any(n).applyAxisAngle(n,Math.random()*6));}}
if(name==='boss'){const n=toN(0.42,PI);const b=await spawnEnt('dragon',n,dirTo(n,toN(0,0))||any(n));if(b){b.awake=false;b.t=0;b.wait=1;b.p2=false;$('bossName').textContent='하늘의 폭군 드래곤';S.boss=b;b.lift=EN.dragon.fly;}}
if(S.world&&pl.ref){world.add(pl.ref.root);S.mixers.push(pl.ref.mx);}
if(Z.night){const st=new THREE.Group();const sg=new THREE.SphereGeometry(0.14,6,6),sm=new THREE.MeshBasicMaterial({color:0xfff6c8,fog:false});for(let i=0;i<160;i++){const s=new THREE.Mesh(sg,sm);const a=rd()*PI*2,b=0.05+rd()*1.2;s.position.set(Math.cos(a)*95*Math.cos(b),8+Math.sin(b)*70,Math.sin(a)*95*Math.cos(b)-20);st.add(s);}world.add(st);
const fire=new THREE.PointLight(0xff5a3a,2.4,34);fire.position.copy(wp(cN,7));world.add(fire);}
$('zoneName').textContent=Z.n;updateQuest();$('bossBar').hidden=true;}
async function goZone(name,instant){if(S.switching)return;S.switching=true;const f=$('fade');if(!instant){f.classList.add('on');await new Promise(r=>setTimeout(r,380));}
await buildZone(name);
endSpin();pl.n.set(0,1,0);pl.f.set(0,0,-1);pl.cf.set(0,0,-1);pl.roll=0;pl.atkT=0;pl.inv=0.8;if(pl.ref){pl.ref.tumble.rotation.x=0;pl.ref.cur='';play(pl.ref,'idle',0);}
S.snap=true;S.dead=false;if(name!=='boss')S.bossDead=S.bossDead;if(S.running)toast(ZONES[name].n,1400);f.classList.remove('on');S.switching=false;}
function checkPortals(){if(S.switching||S.dead||!S.running)return;for(const p of S.portals){const d=arc(pl.n,p.n);
const locked=p.needKills&&S.kills<p.needKills;const col=locked?0xff5a5a:0x8fe3ff;p.ring.material.color.setHex(col);p.beam.material.color.setHex(col);p.core.material.color.setHex(col);p.beam.material.opacity=0.16+Math.sin(S.t*3)*0.06;p.ring.rotation.z+=0.01;
if(d<1.7){if(locked){if(S.t-(S.lastLockMsg||0)>2){S.lastLockMsg=S.t;toast('몬스터 '+p.needKills+'마리를 처치하면 열려요 ('+S.kills+'/'+p.needKills+')',2000);}}else{goZone(p.to);return;}}}}

/* ---------- 하단 독: 스킬 아이콘(코드로 그린 SVG) + 체력/스태미나 구슬 ---------- */
const SW=(x,y,r,sc,c)=>`<g transform="translate(${x} ${y}) rotate(${r}) scale(${sc})"><path d="M0-22L3.4-14V8h-6.8V-14z" fill="${c||'#eef7ff'}" stroke="#4a5a7a" stroke-width="1"/><rect x="-8" y="8" width="16" height="3.4" rx="1" fill="#ffd45a" stroke="#7a5518" stroke-width=".8"/><rect x="-2" y="11" width="4" height="8" rx="1.5" fill="#b0763a"/></g>`;
const ICON={
counter:'<path d="M24 6l15 5v11c0 10-7 17-15 20C16 39 9 32 9 22V11z" fill="#dfe8ff" stroke="#fff" stroke-width="2"/><path d="M24 12l9 3v7c0 6-4 11-9 14-5-3-9-8-9-14v-7z" fill="#5b7dff"/><path d="M17 27l7-9 7 9" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M24 19v14" stroke="#fff" stroke-width="3" stroke-linecap="round"/>',
atkW:SW(24,26,45,1.05),
atkM:'<path d="M12 40L32 14" stroke="#c98a4b" stroke-width="4" stroke-linecap="round"/><circle cx="34" cy="12" r="7" fill="#9ee8ff" stroke="#fff" stroke-width="2"/><circle cx="32" cy="10" r="2.4" fill="#fff"/>',
skW:'<path d="M10 24a14 14 0 0 1 24-9" fill="none" stroke="#ffe08a" stroke-width="4" stroke-linecap="round"/><path d="M38 24a14 14 0 0 1-24 9" fill="none" stroke="#ffe08a" stroke-width="4" stroke-linecap="round"/><path d="M36 8l1 9-9-1z M12 40l-1-9 9 1z" fill="#ffe08a"/>'+SW(24,25,0,0.62),
skM:'<circle cx="31" cy="17" r="9" fill="#ff9a4a" stroke="#ffe0a0" stroke-width="2"/><path d="M24 24L8 42M28 26L16 42M22 20L6 34" stroke="#ffc46b" stroke-width="3" stroke-linecap="round"/>',
wild:SW(28,24,90,0.95)+'<path d="M4 16h10M2 24h14M4 32h10" stroke="#ffb066" stroke-width="3" stroke-linecap="round"/><circle cx="40" cy="24" r="4" fill="#ff7a3a"/>',
rise:'<path d="M12 40C10 24 20 10 36 8C26 14 22 26 24 40z" fill="#fff2b0" stroke="#ffb847" stroke-width="2"/><path d="M34 8l0 12M34 8l-9 6" stroke="#fff" stroke-width="3" stroke-linecap="round"/>',
sakura:[0,72,144,216,288].map(a=>`<ellipse cx="24" cy="13" rx="6.4" ry="10.5" fill="#ffc2d8" stroke="#ff7fae" stroke-width="1.6" transform="rotate(${a} 24 25)"/>`).join('')+'<circle cx="24" cy="25" r="4.2" fill="#ffe27a"/>',
chase:SW(14,32,60,0.55)+SW(25,24,60,0.7,'#cfe6ff')+SW(36,16,60,0.55)+'<path d="M4 40L14 34M8 44L20 36" stroke="#9ee8ff" stroke-width="2" stroke-linecap="round" opacity=".8"/>',
guard:'<path d="M24 4 L40 10 V24 C40 34 33 41 24 45 C15 41 8 34 8 24 V10Z" fill="#ffe08a" stroke="#8a5a14" stroke-width="2.4"/><path d="M24 10 L34 14 V24 C34 31 29 36 24 39Z" fill="#ffb347"/><path d="M24 14v20M16 22h16" stroke="#fff" stroke-width="3" stroke-linecap="round"/>',
giga:'<path d="M24 3 L31 28 L24 35 L17 28Z" fill="#d8f0ff" stroke="#1f4fb8" stroke-width="2"/><path d="M24 6 L24 30" stroke="#7fd0ff" stroke-width="2"/><rect x="13" y="34" width="22" height="4" rx="2" fill="#ffd45a" stroke="#8a5a14" stroke-width="1.2"/><rect x="22" y="38" width="4" height="7" fill="#8a5a2a"/><path d="M6 12l9 5M42 12l-9 5M5 24h8M43 24h-8" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>',
rain:SW(10,18,180,0.55)+SW(24,14,180,0.8,'#cfe6ff')+SW(38,18,180,0.55)+'<ellipse cx="24" cy="42" rx="17" ry="4.5" fill="none" stroke="#9ee8ff" stroke-width="2.4"/>',
jump:'<path d="M12 26L24 14L36 26M12 38L24 26L36 38" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>',
roll:'<path d="M36 16A14 14 0 1 0 38 28" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/><path d="M40 6V19H27z" fill="#fff"/>',
lock:'<circle cx="24" cy="24" r="12" fill="none" stroke="#fff" stroke-width="3.5"/><circle cx="24" cy="24" r="3.5" fill="#ff7a6b"/><path d="M24 4v10M24 34v10M4 24h10M34 24h10" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/>'};
const BG={bAtk:['#6a8cff','#2a3d9a'],bSkill:['#ffa84a','#a8481f'],bS1:['#ff7a4a','#a02a1f'],bS2:['#ffd05a','#b87a14'],bS3:['#ff9cc0','#a83f78'],bS4:['#6fd0ff','#2a5fb8'],bS5:['#7fa8ff','#3a3fa8'],bJump:['#7ad98a','#2a8a4a'],bRoll:['#c58aff','#6a35b0'],bLock:['#ff8f84','#a82f45'],bP1:['#9fb4ff','#3a4fb8'],bP2:['#5fe0ff','#1f4fb8'],bP3:['#ffd45a','#b8741f']};
const KEYS={bAtk:'Z',bSkill:'X',bS1:'A',bS2:'S',bS3:'D',bS4:'Q',bS5:'W',bJump:'␣',bRoll:'C',bLock:'R',bP1:'E',bP2:'V',bP3:'F'};
const ICN={bAtk:'atkW',bSkill:'skW',bS1:'wild',bS2:'rise',bS3:'sakura',bS4:'chase',bS5:'rain',bJump:'jump',bRoll:'roll',bLock:'lock',bP1:'counter',bP2:'giga',bP3:'guard'};
function fitDock(){const d=$('dock');if(!d)return;const w=d.offsetWidth||720,k=Math.max(0.5,Math.min(1,(innerWidth-16)/w));d.style.setProperty('--ds',k.toFixed(3));}
addEventListener('resize',fitDock);setTimeout(fitDock,0);setTimeout(fitDock,800);
function dockSetIcon(id,name){const el=$(id).querySelector('.ic');if(el)el.innerHTML='<svg viewBox="0 0 48 48">'+ICON[name]+'</svg>';}
(function buildDock(){for(const id in ICN){const b=$(id),[c1,c2]=BG[id];b.style.background=`radial-gradient(circle at 30% 25%,${c1},${c2})`;b.innerHTML='<span class="ic"></span><em>'+KEYS[id]+'</em><u class="cdo"></u><u class="cdn"></u>';dockSetIcon(id,ICN[id]);}})();
function setCd(id,cd,max,low){const b=$(id);if(!b._o){b._o=b.querySelector('.cdo');b._n=b.querySelector('.cdn');}const p=cd>0?Math.min(1,cd/max)*100+'%':'0%';if(b._o.style.height!==p)b._o.style.height=p;const t=cd>0?String(Math.ceil(cd)):'';if(b._n.textContent!==t)b._n.textContent=t;b.classList.toggle('low',!!low&&cd<=0);}
/* ---------- HUD, 카메라 ---------- */
function hud(){{if(S._ic!==S.cls){S._ic=S.cls;const w=S.cls==='warrior';dockSetIcon('bAtk',w?'atkW':'atkM');dockSetIcon('bSkill',w?'skW':'skM');}
if(S.cls==='warrior'){for(const [id,b] of [['wild','bS1'],['rise','bS2'],['sakura','bS3'],['chase','bS4'],['rain','bS5'],['giga','bP2'],['guard','bP3']]){$(b).hidden=false;setCd(b,pl.cds[id],SKI[id].cd,pl.st<SKI[id].st);}}else for(const b of['bS1','bS2','bS3','bS4','bS5','bP2','bP3'])$(b).hidden=true;setCd('bSkill',pl.skCd,S.cls==='warrior'?7:5,pl.st<30);const bf=$('buff'),bt=pl.god>0?'무적 '+pl.god.toFixed(1)+'초':'';if(bf.textContent!==bt)bf.textContent=bt;}
{const hf=Math.max(0,Math.min(1,pl.hp/pl.mhp)),sf=Math.max(0,Math.min(1,pl.st/pl.mst)),hp=$('hpFill'),sp=$('stFill');hp.setAttribute('y',(128-122*hf).toFixed(1));hp.setAttribute('height',(122*hf).toFixed(1));sp.setAttribute('y',(128-122*sf).toFixed(1));sp.setAttribute('height',(122*sf).toFixed(1));$('hpTxt').textContent=Math.ceil(pl.hp);$('stTxt').textContent=Math.floor(pl.st);}
const b=S.boss;if(b&&b.awake){bossBarUpd(b);if(b.state==='dead')$('bossBar').hidden=true;}
const lm=$('lockMark'),eh=$('ehp');if(S.lock&&S.lock.state!=='dead'&&S.running){const e=S.lock,s=toScreen(wp(e.n,e.lift+e.spec.h*0.6));if(s.z<1){lm.hidden=false;lm.style.left=s.x+'px';lm.style.top=s.y+'px';
if(!e.boss){const s2=toScreen(wp(e.n,e.lift+e.spec.h+0.5));eh.hidden=false;eh.style.left=s2.x+'px';eh.style.top=s2.y+'px';eh.firstChild.style.width=(e.hp/e.mhp*100)+'%';}else eh.hidden=true;}else{lm.hidden=true;eh.hidden=true;}}else{lm.hidden=true;eh.hidden=true;}}
function updateCamera(dt){S.qk+=((S.quarter?1:0)-S.qk)*Math.min(1,2.6*dt);const q=S.qk,ease=q*q*(3-2*q);
const P=wp(pl.n,pl.jy*(S.calm?0.12:0.4)),d=(8.4+(19-8.4)*ease)*(1-0.08*(S.zm||0)),ptc=pl.pitch+(0.98-pl.pitch)*ease,back=d*Math.cos(ptc),up=1.1+d*Math.sin(ptc);
S.zm=(S.zm||0)+((S.chgT||0)-(S.zm||0))*Math.min(1,7*dt);const b0=S.calm?48:55,fv=(b0+9)+(b0+2-(b0+9))*ease-4*S.zm;if(Math.abs(cam.fov-fv)>0.05){cam.fov+=(fv-cam.fov)*Math.min(1,6*dt);cam.updateProjectionMatrix();}
const tgt=P.clone().addScaledVector(pl.cf,-back).addScaledVector(pl.n,up);
if(S.snap){S.camPos.copy(tgt);S.camUp.copy(pl.n);S.snap=false;}
const trans=Math.abs((S.quarter?1:0)-S.qk)>0.02,k=1-Math.exp(-(trans?4.5:S.calm?11:9)*dt);S.camPos.lerp(tgt,k);S.camUp.lerp(pl.n,1-Math.exp(-6*dt)).normalize();
cam.position.copy(S.camPos);cam.up.copy(S.camUp);const look=P.clone().addScaledVector(pl.n,1.4+0.5*(1-ease));
if(S.lock&&S.lock.state!=='dead')look.lerp(wp(S.lock.n,S.lock.lift+1),0.3);
cam.lookAt(look);if(S.shk>0){const a=S.shk;cam.position.x+=(Math.random()-.5)*a*2;cam.position.y+=(Math.random()-.5)*a*2;cam.position.z+=(Math.random()-.5)*a*2;S.shk=Math.max(0,S.shk-dt*0.9);}
const right=V3(0,0,0).crossVectors(pl.cf,pl.n);S.sun.position.copy(P).addScaledVector(pl.n,16).addScaledVector(right,-8).addScaledVector(pl.cf,-3);S.sun.target.position.copy(P);}

/* ---------- 입력 ---------- */
const DT={last:{},run:false,clr:0,dash:false};
addEventListener('keydown',e=>{if(!S.running){return;}if(!e.repeat&&e.code.startsWith('Arrow')){const n=performance.now();if(n-(DT.last[e.code]||-1e9)<320){if(e.code==='ArrowDown'&&pl.jy>0.05)pl.ff=1;else{DT.run=true;DT.dash=true;}}DT.last[e.code]=n;}K[e.code]=true;
if(e.code==='F5'){e.preventDefault();toggleCam();return;}if(e.code==='Space'){e.preventDefault();tryJump();}else if(e.code==='KeyC'){e.preventDefault();tryRoll();}else if(e.code==='KeyZ')startAtk('atk');else if(e.code==='KeyA')startSkill('wild');else if(e.code==='KeyS')startSkill('rise');else if(e.code==='KeyD')startSkill('sakura');else if(e.code==='KeyQ')startSkill('chase');else if(e.code==='KeyH')$('btnHelp').click();else if(e.code==='KeyW')startSkill('rain');else if(e.code==='KeyX')startAtk('skill');else if(e.code==='KeyE')startParry();else if(e.code==='KeyV')startSkill('giga');else if(e.code==='KeyF')startSkill('guard');
else if(e.code==='Tab'||e.code==='KeyR'){e.preventDefault();toggleLock();}else if(e.code==='KeyF')interact();
else if(e.code.startsWith('Arrow'))e.preventDefault();
});
addEventListener('keyup',e=>{K[e.code]=false;});addEventListener('blur',()=>{DT.run=false;});
addEventListener('blur',()=>{for(const k in K)K[k]=false;S.mouseAtk=false;S.btnAtk=false;});
const st=W.stage;let drag=null;
st.addEventListener('contextmenu',e=>e.preventDefault());
st.addEventListener('pointerdown',e=>{if(!S.running)return;if(e.pointerType==='touch'){const left=e.clientX<innerWidth*0.5;drag={t:1,x:e.clientX,y:e.clientY,left,id:e.pointerId,ox:e.clientX,oy:e.clientY,moved:0};}else{drag={t:0,x:e.clientX,y:e.clientY,b:e.button,moved:0,id:e.pointerId};if(e.button===0&&S.camAuto){S.mouseAtk=true;startAtk('atk');}}try{st.setPointerCapture(e.pointerId);}catch(_){}});
st.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.moved+=Math.abs(dx)+Math.abs(dy);
if(drag.t===1&&drag.left){joy.x=clamp((e.clientX-drag.ox)/50,-1,1);joy.y=clamp((e.clientY-drag.oy)/50,-1,1);if(Math.hypot(joy.x,joy.y)<0.2){joy.x=joy.y=0;}return;}
if((drag.moved>4||drag.t===1)&&(drag.t===1||!S.camAuto)&&!S.quarter){pl.cf.applyAxisAngle(pl.n,-dx*0.0055);pl.pitch=clamp(pl.pitch-dy*0.004,0.18,1.05);}drag.x=e.clientX;drag.y=e.clientY;});
const up=e=>{if(!drag||drag.id!==e.pointerId)return;S.mouseAtk=false;if(drag.t===0&&drag.moved<6){if(drag.b===2)startAtk('skill');else if(drag.b===0&&!S.camAuto)startAtk('atk');}if(drag.t===1&&drag.left){joy.x=joy.y=0;}drag=null;};
st.addEventListener('pointerup',up);st.addEventListener('pointercancel',up);
{const b=$('bAtk');b.onpointerdown=e=>{e.preventDefault();S.btnAtk=true;startAtk('atk');};['onpointerup','onpointerleave','onpointercancel'].forEach(k=>b[k]=()=>{S.btnAtk=false;});}$('bSkill').onclick=()=>startAtk('skill');$('bRoll').onclick=()=>tryRoll();$('bJump').onclick=()=>tryJump();$('bLock').onclick=()=>toggleLock();$('bP1').onclick=()=>startParry();{const gb=$('bP3');gb.onpointerdown=e=>{e.preventDefault();S.btnGuard=true;startSkill('guard');};['onpointerup','onpointerleave','onpointercancel'].forEach(k=>gb[k]=()=>{S.btnGuard=false;});}for(const [bb,ii] of [['bS1','wild'],['bS2','rise'],['bS3','sakura'],['bS4','chase'],['bS5','rain'],['bP2','giga']])$(bb).onclick=()=>startSkill(ii);
{const TIPS=()=>({bP3:'극기 (F, 누르고 있기)\n누르는 동안 기를 모으며 보호막을 펼쳐요. 차징 중에는 슈퍼아머 무적이라 모든 공격이 무효예요. 스태미나도 빠르게 차올라요. 누르고 있는 동안 계속 유지 · 재사용 10초',bP2:'기간틱 슬래시 (V)\n주변 적을 앞으로 끌어당겨 묶은 뒤 검으로 17번 베고, 마지막에 거대한 검을 내리꽂아요. 마지막 일격에 모든 적이 즉사해요! 보스도 예외 없어요.\n사용 중에는 움직일 수 없고 무적이에요. 스태미나 3000 · 재사용 25초',bP1:'반격 (E)\n검을 휘둘러 보스의 모든 투사체와 파동을 튕겨내요. 쿨타임·소모 없이 무제한! 꾹 누르면 계속 유지돼요.',bAtk:'기본공격 (Z / 마우스 클릭)\n꾹 누르면 연속 공격해요. 1·2·3타로 이어지고 3타가 가장 강해요. 스태미나 소모 없음.',
bSkill:S.cls==='warrior'?'윈드밀 (X)\n3초 동안 회전하며 주변 적을 0.25초마다 베어요. 도는 중에도 이동할 수 있어요.\n사용한 순간부터 5초 동안 무적이에요.\n스태미나 1500 · 재사용 7초':'메테오 (X)\n조준한 곳에 운석을 떨어뜨려 넓은 범위에 큰 피해를 줘요.\n스태미나 1500 · 재사용 5초',
bS1:'앱솔루트 저지먼트 (A)\n시간이 멈춘 듯 1.9초간 힘을 모은 뒤, 점점 커지는 거대한 불꽃 검기를 날려요. 맞은 적은 즉사해요.\n차징 중에는 움직일 수 없고 무적이에요. 스태미나 2250 · 재사용 12초',bS2:'라이징 슬래시 (S)\n베어 올리며 땅에서 거대한 불꽃 검 8자루가 앞뒤로 솟아올라요. 맞은 적은 공중에 떠올라요.\n시전 중 무적이에요. 스태미나 1250 · 재사용 5초',bS3:'발상발파 (D)\n벚꽃잎이 소용돌이치는 가운데 회전하며 5번 베어요. 마지막 일격이 가장 강해요.\n스태미나 1500 · 재사용 9초',bS4:'소드 체이서 (Q)\n허공에 검 45자루를 소환해 소드 레인처럼 1.5초 동안 비처럼 연달아 쏘아요. 날아갈수록 점점 빨라져요! 적이 없으면 앞으로 날아가요.\n스태미나 1700 · 재사용 10초',bS5:'소드 레인 (W)\n조준한 적(없으면 앞쪽) 위로 검 44자루가 비처럼 쏟아져요. 마지막에 거대한 검이 떨어지며 충격파가 터져요.\n스태미나 1600 · 재사용 10초',bJump:'점프 (Space)\n보스의 파동처럼 낮게 깔리는 공격을 넘어가요.',bRoll:'구르기 (C)\n구르는 동안 무적이에요. 스태미나 1100.',bLock:'락온 (Tab / R)\n가까운 적을 조준해요. 다시 누르면 해제돼요.'});
const tip=$('tip');for(const id of ['bAtk','bSkill','bS1','bS2','bS3','bS4','bS5','bJump','bRoll','bLock','bP1','bP2','bP3']){const b=$(id);
b.addEventListener('mouseenter',()=>{const ln=TIPS()[id].split('\n');tip.textContent='';const h=document.createElement('b');h.textContent=ln[0];tip.append(h,document.createTextNode(ln.slice(1).join('\n')));tip.hidden=false;const r=b.getBoundingClientRect();tip.style.left=Math.max(16,Math.min(r.left,innerWidth-300))+'px';tip.style.right='auto';tip.style.bottom=(innerHeight-r.top+10)+'px';});
b.addEventListener('mouseleave',()=>{tip.hidden=true;});}}
$('btnHelp').onclick=()=>{const h=$('help');h.style.display=getComputedStyle(h).display==='none'?'flex':'none';};$('btnCalm').onclick=()=>{S.calm=!S.calm;$('btnCalm').textContent=S.calm?'멀미 완화: 켜짐':'멀미 완화: 꺼짐';};
$('btnSnd').onclick=()=>{soundOn=!soundOn;$('btnSnd').textContent=soundOn?'소리 끄기':'소리 켜기';};
$('btnClass').onclick=async()=>{if(S.zone!=='village'){toast('직업은 마을에서만 바꿀 수 있어요',1600);return;}const c=S.cls==='warrior'?'mage':'warrior';toast('불러오는 중…',1000);await setClass(c);if(S.world)S.world.add(pl.ref.root);toast(c==='warrior'?'전사로 바꿨어요':'마법사로 바꿨어요',1400);};

/* ---------- 검기 리본, 검 궤적, 스킬 ---------- */
/* 리본: pt(u)가 [바깥xyz, 안쪽xyz]를 돌려주면 그 모양의 초승달 띠가 시작점에서 끝점으로 쓸고 지나가며 빛난다 */
function ribbonFx(pt,M,life,col,opt){opt=opt||{};const pos=new Float32Array((M+1)*6),cl=new Float32Array((M+1)*6),idx=[];
for(let i=0;i<M;i++){const a=2*i,b=a+1,c=a+2,d=a+3;idx.push(a,b,c,b,d,c);}
const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setAttribute('color',new THREE.BufferAttribute(cl,3));geo.setIndex(idx);
const U=[];for(let i=0;i<=M;i++){const u=i/M,p=pt(u);U.push(u);pos.set(p,i*6);}
const mesh=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));mesh.frustumCulled=false;
const g=new THREE.Group();g.add(mesh);orient(g,pl.n,pl.f,opt.lift||0);const sweep=opt.sweep||0.38,rev=!!opt.rev,follow=opt.follow!==false;
addFx(g,life,k=>{if(follow)orient(g,pl.n,pl.f,opt.lift||0);const head=Math.min(1.25,k/sweep),fade=1-Math.max(0,(k-sweep*0.9)/(1-sweep*0.9));
for(let i=0;i<=M;i++){const s=rev?1-U[i]:U[i];let b=0;if(s<=head)b=Math.max(0,1-(head-s)*(opt.tail||2.2));b*=fade;const w=0.25+0.75*b;for(let j=0;j<2;j++){const o=i*6+j*3,t=(j?b*0.55:b)*0.8;cl[o]=col[0]*t;cl[o+1]=col[1]*t;cl[o+2]=col[2]*t;}}
geo.attributes.color.needsUpdate=true;});S.world.add(g);}
/* 기본 공격 검기: 범위선과 같은 반지름, 같은 각도로 부채꼴 끝까지 닿는다 */
function slashWave(step,P){const r=P.r+0.45,half=Math.min(1.75,Math.max(0.75,Math.acos(Math.max(-1,Math.min(1,P.dot)))));
if(step===3){const R3=P.r+0.5,rf=P.r+0.55;ribbonFx(u=>{const e=1.95-2.35*u,y=Math.max(0.06,1.35+R3*Math.sin(e)),z=R3*Math.cos(e),W=2.4*Math.pow(Math.sin(PI*Math.min(1,u*0.98+0.01)),0.7);return[ -W,y,z, W,y,z];},26,0.5,[1,0.74,0.38],{sweep:0.4,tail:1.8});
ribbonFx(u=>{const a=-half+2*half*u,w=0.55*Math.pow(Math.sin(PI*u),0.5);return[rf*Math.sin(a),0.14,rf*Math.cos(a), rf*(1-w)*Math.sin(a),0.14,rf*(1-w)*Math.cos(a)];},30,0.45,[1,0.78,0.42],{sweep:0.25});
const sd=V3(0,0,0).crossVectors(pl.n,pl.f);setTimeout(()=>{if(!S.world)return;for(let k=0;k<7;k++){const a=-half+2*half*k/6,nn=pl.n.clone().addScaledVector(pl.f,rf*Math.cos(a)/R).addScaledVector(sd,rf*Math.sin(a)/R).normalize();dustFx(nn,1.4,5);sparkFx(nn,0.2,0xffc46b,5,4,0.4,2);}},130);
const n2=pl.n.clone().addScaledVector(pl.f,r*0.85/R).normalize();setTimeout(()=>{if(!S.world)return;dustFx(n2,2.2,10);sparkFx(n2,0.3,0xffc46b,14,5.5,0.45,3);ringBurst(n2,0.4,4.6,0xffc46b,0.4,0.15);shake(0.15);},120);}
else{const rev=step===2;ribbonFx(u=>{const a=-half+2*half*u,w=0.5*Math.pow(Math.sin(PI*u),0.75),ro=r,ri=r*(1-w),dy=step===1?(1.85-1.15*u):(1.0+0.12*Math.sin(PI*u));return[ro*Math.sin(a),dy,ro*Math.cos(a), ri*Math.sin(a),dy-0.0,ri*Math.cos(a)];},30,0.38,step===1?[1,0.95,0.7]:[0.8,0.95,1],{sweep:0.4,rev});
const a=rev?-half:half;const n2=pl.n.clone().addScaledVector(pl.f,r*Math.cos(a)/R).addScaledVector(V3(0,0,0).crossVectors(pl.n,pl.f),r*Math.sin(a)/R).normalize();setTimeout(()=>{if(S.world)sparkFx(n2,0.9,0xfff2b0,8,4,0.35,1.6);},110);}}
/* 검 궤적: 검 손잡이~끝을 매 프레임 기록해서 이어 붙인다 */
const TR={pts:[],mesh:null,N:26,life:0.2};
function trailInit(){const N=TR.N,geo=new THREE.BufferGeometry(),idx=[];geo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(N*6),3));geo.setAttribute('color',new THREE.BufferAttribute(new Float32Array(N*6),3));for(let i=0;i<N-1;i++){const a=2*i;idx.push(a,a+1,a+2,a+1,a+3,a+2);}geo.setIndex(idx);
const m=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));m.frustumCulled=false;S.world.add(m);TR.mesh=m;}
function trailTick(){const ref=pl.ref;if(!ref||!ref.swTip||!S.world)return;if(!TR.mesh||TR.mesh.parent!==S.world){if(TR.mesh&&TR.mesh.parent)TR.mesh.parent.remove(TR.mesh);trailInit();}
const act=(pl.atkT>0&&pl.atkKind==='atk')||(pl.sk&&pl.sk.trail)||pl.spin>0;
if(act){ref.holder.updateMatrixWorld(true);const a=V3(0,0,0),b=V3(0,0,0);ref.swBase.getWorldPosition(a);ref.swTip.getWorldPosition(b);TR.pts.push({a,b,t:S.t});}
while(TR.pts.length&&(S.t-TR.pts[0].t>TR.life||TR.pts.length>TR.N))TR.pts.shift();
const L=TR.pts.length,m=TR.mesh;if(L<2){m.visible=false;return;}m.visible=true;const P=m.geometry.attributes.position.array,C=m.geometry.attributes.color.array,col=(pl.sk&&pl.sk.col)||(pl.spin>0?[1,0.85,0.4]:[1,0.93,0.65]);
for(let i=0;i<TR.N;i++){const q=TR.pts[Math.min(i,L-1)],age=1-(S.t-q.t)/TR.life,br=i>=L?0:Math.max(0,age)*(0.35+0.65*i/(L-1));P[i*6]=q.a.x;P[i*6+1]=q.a.y;P[i*6+2]=q.a.z;P[i*6+3]=q.b.x;P[i*6+4]=q.b.y;P[i*6+5]=q.b.z;
for(let j=0;j<2;j++){const t=j?br:br*0.25;C[i*6+j*3]=col[0]*t;C[i*6+j*3+1]=col[1]*t;C[i*6+j*3+2]=col[2]*t;}}
m.geometry.attributes.position.needsUpdate=true;m.geometry.attributes.color.needsUpdate=true;m.geometry.setDrawRange(0,Math.max(0,(L-1)*6));}
/* 땅을 박차는 먼지 */
function kickFx(back){const n2=pl.n.clone().addScaledVector(pl.f,-(back||0.5)/R).normalize();dustFx(n2,1.0,6);const bf=pl.f.clone().negate();sparkFx(n2,0.12,0xd9c9a3,6,2.6,0.35,1.6);ringBurst(n2,0.2,0.9,0xe8dcc0,0.25,0.1);}
/* 스킬 3종 */
const SKI={wild:{key:'KeyA',n:'앱솔루트 저지먼트',st:2250,cd:12,dur:3.0},rise:{key:'KeyS',n:'라이징 슬래시',st:1250,cd:5,dur:0.9},sakura:{key:'KeyD',n:'발상발파',st:1500,cd:9,dur:1.8,short:'발상'},chase:{key:'KeyQ',n:'소드 체이서',st:1700,cd:10,dur:3.4,short:'추격'},rain:{key:'KeyW',n:'소드 레인',st:1600,cd:10,dur:2.4,short:'검우'},guard:{key:'KeyF',n:'극기',st:0,cd:10,dur:1e9,short:'극기'},giga:{key:'KeyV',n:'기간틱 슬래시',st:3000,cd:25,dur:3.4,short:'기간'}};
SKI.wild.short='저지';SKI.rise.short='라이';
const WCH=1.9;
function startSkill(id){if(S.dead||!S.running||S.cls!=='warrior'||pl.roll>0||pl.spin>0||pl.sk)return;const D=SKI[id];if(pl.cds[id]>0){toast(D.n+' 준비 중',700);return;}if(pl.st<D.st){toast('스태미나 부족',600);return;}
pl.st-=D.st;pl.stDelay=0.7;pl.cds[id]=D.cd;pl.atkT=0;pl.comboT=0;pl.combo=0;pl.lungeT=0;pl.atkLock=0;
const d=S.lock&&S.lock.state!=='dead'?dirTo(pl.n,S.lock.n):((id==='wild'||id==='giga')?nearestDir():aimAssist()),dir=d||moveVec();if(dir)pl.f.copy(dir);
pl.sk={id,t:0,dur:D.dur,hit:new Set(),trail:true,col:id==='sakura'?[1,0.62,0.82]:id==='wild'?[1,0.5,0.25]:[1,0.95,0.6],n:0};
const R=pl.ref,k='sk_'+id;if(R.acts[k]&&id!=='wild'){const cl=R.acts[k].getClip().duration;play(R,k,0.06,true,cl/D.dur);}
toast(D.n+'!',800);sfx(id==='sakura'?'swing':'boom');
if(id==='guard'){pl.sk.trail=false;pl.god=Math.max(pl.god,0.3);pl.sk.shield=guardShield();sfx('cast');}
if(id==='giga'){pl.god=Math.max(pl.god,3.6);ringBurst(pl.n,0.4,3,0x6fd0ff,0.4,0.15);sfx('boom');}
if(id==='wild'){kickFx(0.4);ringBurst(pl.n,5,0.6,0xff7a3a,0.4,0.14);pl.god=Math.max(pl.god,2.3);sfx('boom');}
if(id==='rise'){kickFx(0.4);pl.god=Math.max(pl.god,0.6);}
if(id==='sakura'){pl.god=Math.max(pl.god,0.8);petalStorm();}
if(id==='chase'){pl.sk.trail=false;ringBurst(pl.n,0.4,2.4,0x9ee8ff,0.4,0.15);swordChase();}
if(id==='rain'){pl.sk.trail=false;ringBurst(pl.n,0.4,2.0,0x9ee8ff,0.4,0.15);swordRain();}}
function hitGroup(rad,dmg,kb,dotMin,pop,key){let hit=0;for(const e of S.ents){if(e.state==='dead')continue;const d=arc(pl.n,e.n),dir=dirTo(pl.n,e.n);if(d<rad+e.spec.rad&&(dotMin<=-1||!dir||dir.dot(pl.f)>dotMin)){if(key&&pl.sk.hit.has(key+e.n.x+e.n.z))continue;if(key)pl.sk.hit.add(key+e.n.x+e.n.z);hitEnt(e,dmg,pl.n,kb);if(pop&&!e.boss)e.pop=0.8;hit++;}}return hit;}
function petalStorm(){const g=new THREE.Group(),N=64,ps=[];const geo=new THREE.PlaneGeometry(0.2,0.14);
for(let i=0;i<N;i++){const m=new THREE.Mesh(geo,bm(i%4?0xffb7d5:0xffffff,0.95,true));g.add(m);ps.push({m,ph:i*2.399,h:Math.random(),sp:0.7+Math.random()*0.8,rs:Math.random()*6});}
orient(g,pl.n,pl.f,0);S.world.add(g);const life=SKI.sakura.dur+0.7;
addFx(g,life,k=>{orient(g,pl.n,pl.f,0);const t=k*life;for(const p of ps){const a=p.ph+t*(5+p.sp*2),rad=0.8+Math.min(1,t/1.2)*(1.5+p.h*2.4)+Math.max(0,t-SKI.sakura.dur)*2,y=0.2+((p.h*2.6+t*0.9*p.sp)%3.2);p.m.position.set(Math.cos(a)*rad,y,Math.sin(a)*rad);p.m.rotation.set(t*4+p.rs,t*3,p.rs);p.m.material.opacity=0.95*Math.min(1,(1-k)*3.5);}});}
function tickSkill(dt){const sk=pl.sk;if(!sk)return;sk.t+=dt;const t=sk.t;
if(sk.id==='wild'){
if(t<WCH){const q=t/WCH;S.fzT=0.2;S.chgT=Math.min(1,q*2.2)*0.35;$('dim').style.opacity=(Math.min(1,q*1.6)*0.12).toFixed(2);shake(0.008+0.07*q*q);if((sk.cf=(sk.cf||0)+1)%2===0)chargeFx(q);
wgUpdate(sk,q);if(!sk.aura){sk.aura=1;wildAura();}sk.rt=(sk.rt||0)-dt;if(sk.rt<=0){sk.rt=0.6-0.3*q;ringBurst(pl.n,7.5+q*2,0.7,q>0.6?0xff8a3a:0xff5a1a,0.3,0.15);}if(q>0.5&&Math.random()<0.2)sparkFx(pl.n,0.2,0xffa050,2,2,0.4,5+q*4);}
else if(!sk.fired){sk.fired=1;wgHide();S.fzT=0.4;lineFlash();edgeFlash();S.chgT=0;$('dim').style.opacity=0;const f=$('flash');f.style.transition='none';f.style.background='#ff7a3a';f.style.opacity=0.5;void f.offsetWidth;f.style.transition='opacity .7s ease-out';f.style.opacity=0;
{const ad=nearestDir();if(ad)pl.f.copy(ad);}hitstop(0.14);shake(0.35);dustFx(pl.n,5,14);ringBurst(pl.n,0.6,12,0xd02808,0.6,0.2);ringBurst(pl.n,0.3,8,0xff6a20,0.45,0.25);ringBurst(pl.n,0.2,5,0xffa040,0.35,0.3);sparkFx(pl.n,0.9,0xff8a30,44,12,0.7,3.4);fireWildWave();}}
else if(sk.id==='giga'){gigaTick(sk,dt,t);}
else if(sk.id==='guard'){guardTick(sk,dt,t);}
else if(sk.id==='rise'){
if(t>=0.12&&!sk.up){sk.up=1;pl.vy=11.5;pl.jt=0;pl.jflip=0;pl.god=Math.max(pl.god,1.0);sfx('boom');
ribbonFx(u=>{const e=-0.5+2.5*u,R2=3.5,y=Math.max(0.06,0.6+R2*Math.sin(e)),z=R2*Math.cos(e)+0.4,W=0.7*Math.pow(Math.sin(PI*Math.min(1,u*0.97+0.015)),0.7);return[-W,y,z,W,y,z];},26,0.42,[0.4,0.95,0.55],{sweep:0.36,tail:1.6});
shake(0.16);hitstop(0.05);risingBlades();}}
else if(sk.id==='sakura'){
const ticks=[0.15,0.3,0.45,0.6,0.75,0.9,1.05,1.2,1.35,1.5];while(sk.n<ticks.length&&t>=ticks[sk.n]){sk.n++;const last=sk.n===ticks.length,SR=6.6;ribbonFx(u=>{const a=u*PI*2,y=0.9+0.25*Math.sin(a*2+sk.n),w=0.22;return[Math.cos(a)*SR,y,Math.sin(a)*SR,Math.cos(a)*(SR*(1-w)),y,Math.sin(a)*(SR*(1-w))];},40,0.4,[1,0.58,0.8],{sweep:0.55,tail:1.4,rev:sk.n%2===0});
if(sk.n%2===1||last)ringBurst(pl.n,0.6,SR+0.4,0xffb7d5,0.4,0.15);sparkFx(pl.n,1.0,0xffb7d5,last?22:8,6,0.6,2.4);sfx('hit');S.soft=last?0:1;const h=hitGroup(SR,last?22:8,last?0.7:0.2,-2,false,null);S.soft=0;if(last){shake(0.16);hitstop(0.05);}else if(h&&sk.n%2===0)shake(0.04);}}
if(t>=sk.dur){pl.sk=null;}}
function guardShield(){const g=new THREE.Group(),a=new THREE.Mesh(new THREE.SphereGeometry(1.9,24,16),bm(0xffd45a,0.28,true)),b=new THREE.Mesh(new THREE.SphereGeometry(2.05,16,10),new THREE.MeshBasicMaterial({color:0xfff1b0,wireframe:true,transparent:true,opacity:0.35,depthWrite:false}));g.add(a,b);g.userData={a,b};S.world.add(g);return g;}
function guardTick(sk,dt,t){pl.god=Math.max(pl.god,0.25);S.fzT=Math.max(S.fzT,0);pl.st=Math.min(pl.mst,pl.st+3000*dt);
const g=sk.shield;if(g){g.position.copy(wp(pl.n,pl.jy+1.1));const p=1+Math.sin(t*14)*0.05+Math.min(t,2)*0.08;g.scale.setScalar(p);g.userData.b.rotation.y+=dt*2.5;g.userData.a.material.opacity=0.22+0.1*Math.sin(t*10);}
sk.pt=(sk.pt||0)-dt;if(sk.pt<=0){sk.pt=0.16;ringBurst(pl.n,0.3,3.2+t*0.5,0xffd45a,0.4,0.15);sparkFx(pl.n,0.6,0xfff1b0,3,3,0.4,3);}
const held=K.KeyF||S.btnGuard;if((t>0.45&&!held)||t>=sk.dur-0.02){sk.dur=t;if(g&&g.parent)g.parent.remove(g);sk.shield=null;ringBurst(pl.n,0.5,9,0xffd45a,0.5,0.2);ringBurst(pl.n,0.4,6,0xffffff,0.4,0.25);sfx('boom');}}
function sz2(g){return 13*g;}
function gAnim(k,len){const R=pl.ref;if(R&&R.acts[k]){const cl=R.acts[k].getClip().duration;play(R,k,0.09,true,cl/len);}}
function gigaTick(sk,dt,t){S.fzT=Math.max(S.fzT,0.15);pl.god=Math.max(pl.god,0.2);
if(!sk.init){sk.init=1;sk.sn=0;sk.col=[0.5,0.85,1];sk.ts=[];let tt=0.9;for(let i=0;i<50;i++){sk.ts.push(tt);tt+=0.26*Math.pow(1-i/50,1.7)+0.03;}sk.Te=tt;sk.dur=tt+1.0;pl.god=Math.max(pl.god,sk.dur+0.3);}
if(t<0.8){sk.pt=(sk.pt||0)-dt;if(sk.pt<=0){sk.pt=0.12;ringBurst(pl.n,0.4+0.3*t,9-8*t,0x6fd0ff,0.28,0.2);sparkFx(pl.n,0.4,0x9ee8ff,3,3,0.4,4);}}
if(sk.Te&&t<sk.Te+0.5){const side=pl.n.clone().cross(pl.f).normalize();let gi=0;for(const e of S.ents){if(e.state==='dead')continue;if(arc(e.n,pl.n)>90)continue;gi++;const D=e.boss?9+e.spec.rad*0.4:5.2,lat=e.boss?0:((gi%5)-2)*1.5,tp=pl.n.clone().addScaledVector(pl.f,D/R).addScaledVector(side,lat/R).normalize();const dist=arc(e.n,tp),dir=dirTo(e.n,tp);if(dir&&dist>0.25){moveAlong(e.n,dir,Math.min(dist,(e.boss?38:64)*dt),[e.f]);}}}
const NS=50;while(sk.sn<NS&&t>=sk.ts[sk.sn]){sk.sn++;const a=(sk.sn*1.7)%PI-PI/2,dd=sk.sn%2?1:-1,gr=1+sk.sn/NS*0.9;if(sk.sn%2===1){const iv=(sk.ts[Math.min(NS-1,sk.sn)]-sk.ts[sk.sn-1])*2.2;gAnim('atk'+(1+(sk.sn>>1)%2),Math.max(0.16,iv+0.1));}
for(const [sz,col,lf] of [[16*gr,[0.55,0.9,1],0.26],[11*gr,[1,1,1],0.2]])ribbonFx(u=>{const x=dd*(u-0.5)*sz*Math.cos(a),y=1.8+(u-0.5)*sz*Math.sin(a)*dd,z=4+Math.sin(u*PI)*1.6;return[x,y,z,x*0.97,y-0.4,z-0.8];},16,lf,col,{sweep:0.5,tail:1.0,rev:false});
ribbonFx(u=>{const x=-dd*(u-0.5)*sz2(gr)*Math.cos(a+1.2),y=1.8+(u-0.5)*sz2(gr)*Math.sin(a+1.2)*-dd,z=4.2;return[x,y,z,x,y-0.4,z-0.8];},16,0.22,[0.4,0.7,1],{sweep:0.5,tail:1.0,rev:false});
if(sk.sn%4===0){ringBurst(pl.n.clone().addScaledVector(pl.f,5/R).normalize(),0.5,6+sk.sn*0.4,0x6fd0ff,0.35,0.2);}
sfx('swing');
if(sk.sn%2===0){const q=pointAt(pl.n,5+Math.random()*3,(Math.random()-0.5)*1.4+Math.atan2(0,1));sparkFx(pl.n.clone().addScaledVector(pl.f,5.5/R).normalize(),0.9+Math.random()*1.5,0x9ee8ff,4,5,0.3,2);}
S.soft=1;for(const e of S.ents){if(e.state==='dead')continue;if(arc(pl.n,e.n)<26)hitEnt(e,5,pl.n,0);}S.soft=0;shake(0.04+sk.sn*0.006);}
if(t>=sk.Te-0.3&&!sk.an2){sk.an2=1;gAnim('skill',1.0);}
if(t>=sk.Te&&!sk.sw){sk.sw=1;const P=pl.n.clone().addScaledVector(pl.f,6.5/R).normalize(),m=swordMesh(0x7fe0ff);m.rotation.set(PI/2,0,0);ringBurst(P,0.5,8,0x6fd0ff,0.6,0.2);sfx('boom');
addFx(m,0.7,k=>{const hv=k<0.65?(k/0.65):1,dn=k<0.65?0:(k-0.65)/0.35,y=24-18*hv*0.3-dn*22+0;m.position.copy(wp(P,Math.max(0.5,y)));m.scale.setScalar(4+20*Math.min(1,k*1.6));m.rotation.set(PI/2,0,0);});}
if(t>=sk.Te+0.65&&!sk.fin){sk.fin=1;S.fzT=0.5;const P=pl.n.clone().addScaledVector(pl.f,6.5/R).normalize();hitstop(0.18);shake(0.6);const f=$('flash');f.style.transition='none';f.style.background='#bfeaff';f.style.opacity=0.55;void f.offsetWidth;f.style.transition='opacity .7s ease-out';f.style.opacity=0;
slamFx(P,24,true);shake(1.0);ringBurst(P,0.6,60,0x6fd0ff,0.9,0.2);ringBurst(P,0.5,44,0xffffff,0.7,0.25);ringBurst(P,0.5,30,0x6fd0ff,0.7,0.2);glowBall(P,3,1.0,0xbfeaff,0.5,16);for(let i=0;i<5;i++)ribbonFx(u=>[-1.2+i*0.6,u*40,6.5,-0.9+i*0.6,u*40,6.5],4,0.6+i*0.1,[0.6,0.9,1],{sweep:0.1,tail:1,rev:false});ringBurst(P,0.4,20,0xffffff,0.5,0.25);ringBurst(P,0.3,12,0xbfeaff,0.45,0.3);dustFx(P,8,22);sparkFx(P,0.5,0x9ee8ff,60,14,0.8,4);sfx('boom');
S.soft=0;for(const e of S.ents){if(e.state==='dead')continue;if(e.boss&&!e.p2){sparkFx(e.n,e.lift+e.spec.h*0.5,0x9ee8ff,40,12,0.8,4);e.hp=Math.min(e.hp,e.mhp*0.49);e.flash=0.3;continue;}hitEnt(e,1e13,P,0);}}}
function pillarFx(){const g=new THREE.Group(),cyl=new THREE.Mesh(new THREE.CylinderGeometry(0.55,0.9,8,24,1,true),bm(0xffe08a,0.2,true));cyl.position.y=4;cyl.material.blending=THREE.AdditiveBlending;g.add(cyl);const rs=[];for(let i=0;i<3;i++){const r=new THREE.Mesh(new THREE.RingGeometry(0.9,1.15,32),bm(0xffffff,0.8,true));r.rotation.x=-PI/2;g.add(r);rs.push(r);}
orient(g,pl.n,pl.f,0);addFx(g,0.55,k=>{cyl.scale.set(1+k*0.4,1,1+k*0.4);cyl.material.opacity=0.2*(1-k);rs.forEach((r,i)=>{const kk=Math.min(1,k*1.4-i*0.12);r.position.y=Math.max(0,kk)*6;r.scale.setScalar(1+Math.max(0,kk)*0.6);r.material.opacity=0.8*(1-Math.max(0,kk));});});}

/* 소드 체이서 / 소드 레인: 허공에 소환한 검들이 날아가 꽂힌다 */
function swordMesh(col){const g=new THREE.Group(),m=bm(col||0x9ee8ff,0.95);m.blending=THREE.AdditiveBlending;const core=bm(new THREE.Color(col||0x9ee8ff).lerp(new THREE.Color(0xffffff),0.3).getHex(),0.95);core.blending=THREE.AdditiveBlending;
const blade=new THREE.Mesh(new THREE.BoxGeometry(0.1,0.025,0.85),m);blade.position.z=0.55;const core2=new THREE.Mesh(new THREE.BoxGeometry(0.04,0.03,0.8),core);core2.position.z=0.55;
const tip=new THREE.Mesh(new THREE.ConeGeometry(0.06,0.3,4),m);tip.rotation.x=PI/2;tip.position.z=1.12;const guard=new THREE.Mesh(new THREE.BoxGeometry(0.36,0.05,0.07),m);guard.position.z=0.1;const grip=new THREE.Mesh(new THREE.BoxGeometry(0.05,0.05,0.28),m);grip.position.z=-0.08;
g.add(blade,core2,tip,guard,grip);g.scale.setScalar(1.15);return g;}
const tgtList=(maxd)=>S.ents.filter(e=>e.state!=='dead'&&arc(pl.n,e.n)<maxd).sort((a,b)=>arc(pl.n,a.n)-arc(pl.n,b.n));
function swordChase(){const N=200,DUR=3.0;
for(let i=0;i<N;i++){const t0=(i/N)*DUR+Math.random()*0.02,hov=0.1+Math.random()*0.08,fly=0.045+Math.random()*0.03,fade=0.15,life=t0+hov+fly+fade;
const side=(Math.random()-0.5)*3.4,hh=0.7+Math.random()*1.9,back=0.9+Math.random()*0.9,ph=Math.random()*6;
const mesh=swordMesh(i%2?0xa070ff:0xc88cff);const start=V3(0,0,0);let launched=false,hit=false,tgt=null,aim=null,spawned=false;
const base=(t)=>{const right=V3(0,0,0).crossVectors(pl.n,pl.f).normalize();return wp(pl.n,hh+Math.min(1,t/0.3)*0.25+Math.sin(t*9+ph)*0.04).addScaledVector(right,side).addScaledVector(pl.f,-back);};
S.world.add(mesh);mesh.visible=false;
addFx(mesh,life,k=>{const t=k*life;
if(t<t0){mesh.visible=false;return;}mesh.visible=true;const lt=t-t0;
if(lt<hov){if(!spawned){spawned=true;sparkFx(pl.n,0.5+hh*0.5,0xa070ff,1,0.6,0.2,0);}const p=base(lt);mesh.position.copy(p);const fwd=pl.f.clone();mesh.lookAt(p.clone().addScaledVector(fwd,5));mesh.scale.set(1.1,1.1,1.1*Math.min(1,lt/0.06+0.2));}
else if(lt<hov+fly){if(!launched){launched=true;start.copy(mesh.position);sfx('swing');const l=tgtList(22);tgt=l.length?l[Math.floor(Math.random()*Math.min(3,l.length))]:null;aim=wp(pl.n,1.2).addScaledVector(pl.f,16);}
const u=(lt-hov)/fly,ue=Math.pow(u,1.6),end=tgt&&tgt.state!=='dead'?wp(tgt.n,tgt.lift+tgt.spec.h*0.5):aim;mesh.position.lerpVectors(start,end,ue);mesh.lookAt(end);mesh.scale.set(1.1,1.1,1.1*(1+u*3.5));
if(S.fxs.length<150&&Math.random()<0.25)sparkFx(pl.n,0,0xb98cff,1,0.2,0.18,0);
if(u>0.9&&!hit){hit=true;if(tgt&&tgt.state!=='dead'){S.soft=1;hitEnt(tgt,3,pl.n,0.05);S.soft=0;if(i%7===0){sparkFx(tgt.n,tgt.lift+tgt.spec.h*0.5,0xa070ff,4,4,0.3,2);ringBurst(tgt.n,0.3,1.2,0xb98cff,0.25,tgt.lift+0.4);}if(i%12===0)shake(0.04);}}}
else{const u=(lt-hov-fly)/fade;mesh.scale.setScalar(Math.max(0.01,1.1*(1-u)));}});}
sfx('boom');}
function swordRain(){const lk=S.lock&&S.lock.state!=='dead'?S.lock:null,near=tgtList(16)[0],tg=lk||near;let cn;if(tg)cn=tg.n.clone();else cn=pl.n.clone().addScaledVector(pl.f,6.5/R).normalize();
const a=any(cn),b=V3(0,0,0).crossVectors(cn,a).normalize(),Rr=4.4;decalRing(cn,Rr,0x4fb0ff,0.9);
const N=80;let landed=0;
for(let i=0;i<N;i++){const th=i*2.399,rr=Math.sqrt((i+0.5)/N)*Rr*0.95,off=a.clone().multiplyScalar(Math.cos(th)*rr).addScaledVector(b,Math.sin(th)*rr),spawnT=0.3+i*0.017,fall=0.13,stay=0.55,life=spawnT+fall+stay;
const imp=wp(cn,0.05).add(off),mesh=swordMesh(i%3?0x4fb0ff:0x2f8fff);S.world.add(mesh);let hit=false;mesh.visible=false;
const nI=cn.clone().addScaledVector(a,Math.cos(th)*rr/R).addScaledVector(b,Math.sin(th)*rr/R).normalize();
addFx(mesh,life,k=>{const t=k*life;if(t<spawnT){mesh.visible=false;return;}mesh.visible=true;const u=Math.min(1,(t-spawnT)/fall);
if(u<1){const y=0.4+13*(1-u)*(1-u);mesh.position.copy(imp);mesh.position.y+=y;mesh.rotation.set(PI/2,0,0);mesh.rotation.x=PI/2-0.0;mesh.scale.setScalar(1.15);mesh.position.y+=0;}
else{mesh.position.copy(imp);mesh.position.y+=0.15;mesh.rotation.set(PI/2,0,0);const fa=Math.max(0,(t-spawnT-fall)/stay);mesh.scale.setScalar(1.15*(1-fa*fa));
if(!hit){hit=true;landed++;if(i%3===0)dustFx(nI,0.9,3);if(i%2===0)sparkFx(nI,0.15,0x2f8fff,4,3.5,0.3,2.2);if(i%6===0)ringBurst(nI,0.2,1.1,0x6ac4ff,0.28,0.12);if(i%8===0)shake(0.04);S.soft=1;for(const e of S.ents){if(e.state==='dead')continue;if(arc(nI,e.n)<1.5+e.spec.rad){hitEnt(e,6,nI,0.1);}}S.soft=0;}}});}
const T0=0.3+N*0.017-0.1,FALL=0.38,big=swordMesh(0x5fc0ff),BS=4.6;big.visible=false;S.world.add(big);const gp=wp(cn,0);let boom=false;
addFx(big,T0+FALL+0.7,k=>{const t=k*(T0+FALL+0.7);if(t<T0){big.visible=false;return;}big.visible=true;const u=Math.min(1,(t-T0)/FALL);big.rotation.set(PI/2,0,0);
if(u<1){big.position.copy(gp);big.position.y+=4.3+30*(1-u*u);big.scale.setScalar(BS*(0.6+0.4*u));}
else{big.position.copy(gp);big.position.y+=4.3;const fa=Math.max(0,(t-T0-FALL-0.3)/0.4);big.scale.setScalar(BS*(1-fa));
if(!boom){boom=true;ringBurst(cn,0.6,Rr*1.5,0x6ac4ff,0.5,0.2);ringBurst(cn,0.3,Rr*1.1,0x9fe0ff,0.4,0.25);ringBurst(cn,0.2,Rr*0.7,0x2f8fff,0.35,0.3);sparkFx(cn,0.2,0x6ac4ff,28,9,0.6,3);dustFx(cn,2.2,14);shake(0.3);hitstop(0.08);sfx('boom');for(const e of S.ents){if(e.state==='dead')continue;if(arc(cn,e.n)<Rr+e.spec.rad)hitEnt(e,26,cn,1.2);}}}});}
/* 앱솔루트 저지먼트(궁극기 느낌): 시간이 멈춘 듯 힘을 모으고, 점점 커지는 거대한 불꽃 검기를 쏜다 */
function wgUpdate(sk,q){const w=$('wg');if(!w)return;if(!sk.wg){sk.wg=1;sk.stg=0;w.classList.add('on');}const f=$('wgf');f.style.width=(q*100).toFixed(1)+'%';const st=q>=0.99?3:q>=0.66?2:q>=0.33?1:0;f.className='s'+st;
if(st>sk.stg){sk.stg=st;ringBurst(pl.n,0.4,3+st*1.2,st===3?0xffd24a:st===2?0xff5a1a:0xff9a3a,0.45,0.15);sparkFx(pl.n,1.0,st===3?0xffd24a:0xff8a30,10+st*4,5,0.5,2.4);sfx('hit');w.classList.remove('pop');void w.offsetWidth;w.classList.add('pop');}
if(sk.t>=WCH-0.12&&!sk.glint){sk.glint=1;sfx('boom');sparkFx(pl.n,1.1,0xffe6a0,18,9,0.35,1.5);ringBurst(pl.n,0.5,2.2,0xffd24a,0.3,0.2);}}
function wgHide(){const w=$('wg');if(w)w.classList.remove('on');}
function lineFlash(){const l=$('sline');if(!l)return;l.style.transition='none';l.style.opacity=1;l.style.transform='scaleX(0)';void l.offsetWidth;l.style.transition='transform .1s ease-out,opacity .45s .08s';l.style.transform='scaleX(1)';l.style.opacity=0;}
function edgeFlash(){const l=$('fedge');if(!l)return;l.style.transition='none';l.style.opacity=0.95;void l.offsetWidth;l.style.transition='opacity 1s ease-out';l.style.opacity=0;}
function chargeFx(q){const n=pl.n,a=any(n),b=V3(0,0,0).crossVectors(n,a),cnt=1+Math.floor(q*2);if(S.fxs.length>120)return;
for(let i=0;i<cnt;i++){const th=Math.random()*PI*2,r=3.4+Math.random()*2,h=0.2+Math.random()*2.6,mt=bm(Math.random()<0.5?0xffa050:0xffe6b0,1);mt.blending=THREE.AdditiveBlending;mt.depthWrite=false;const g=new THREE.Group(),m=new THREE.Mesh(new THREE.BoxGeometry(0.06,0.06,0.55),mt);g.add(m);
addFx(g,0.38,k=>{const rr=r*(1-k)+0.35,hh=h+(1.0-h)*k,ox=a.clone().multiplyScalar(Math.cos(th)*rr).addScaledVector(b,Math.sin(th)*rr);g.position.copy(wp(pl.n,hh).add(ox));g.lookAt(wp(pl.n,1.0));mt.opacity=1-k*0.4;});}}
function wildAura(){const mk=(c,o)=>{const m=bm(c,o,true);m.depthWrite=false;return m;},g=new THREE.Group(),m1=mk(0xc02008,0.2),m2=mk(0xff5a18,0.2),s1=new THREE.Mesh(new THREE.SphereGeometry(1,20,14),m1),s2=new THREE.Mesh(new THREE.SphereGeometry(0.6,16,12),m2);g.add(s1,s2);const bm_=[];for(let i=0;i<8;i++){const mt=mk(i%2?0xe04a14:0xb81e08,0.2),b=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.1,10,6,1,true),mt);g.add(b);bm_.push(b);}
addFx(g,WCH+0.1,k=>{const q=Math.min(1,k*(WCH+0.1)/WCH),p=1+0.12*Math.sin(S.t*34);g.position.copy(wp(pl.n,1.0));s1.scale.setScalar((0.7+2.4*q)*p);s2.scale.setScalar((0.5+1.5*q)*p);m1.opacity=0.08+0.08*q;m2.opacity=0.07+0.08*q;bm_.forEach((b,i)=>{b.scale.set(1,0.2+q*0.8,1);b.position.y=b.scale.y*6;const a=S.t*(1.5+i*0.1)+i;b.position.x=Math.cos(a)*(2.8-q*0.8);b.position.z=Math.sin(a)*(2.8-q*0.8);b.material.opacity=0.02+0.05*q;});if(k>0.92){m1.opacity*=(1-k)/0.08;m2.opacity*=(1-k)/0.08;}});}
function slashMark(e){const c=wp(e.n,e.lift+e.spec.h*0.5),g=new THREE.Group(),a=new THREE.Mesh(new THREE.PlaneGeometry(1,0.2),new THREE.MeshBasicMaterial({color:0xff2a10,transparent:true,opacity:0.95,side:THREE.DoubleSide,depthWrite:false,depthTest:false})),b=new THREE.Mesh(new THREE.PlaneGeometry(1,0.06),new THREE.MeshBasicMaterial({color:0xffd9a0,transparent:true,opacity:1,side:THREE.DoubleSide,depthWrite:false,depthTest:false}));a.renderOrder=b.renderOrder=20;g.add(a,b);g.position.copy(c);S.world.add(g);const w=2.2+e.spec.h*1.4;
addFx(g,0.55,k=>{g.position.copy(c);g.quaternion.copy(cam.quaternion);g.rotateZ(-0.55);const u=Math.min(1,k/0.12);g.scale.set(w*(0.2+0.8*u),1,1);const fa=k<0.5?1:1-(k-0.5)/0.5;a.material.opacity=0.95*fa;b.material.opacity=fa;});}
function execEnt(e,dirv,pos){if(e.state==='dead')return;const boss=e.boss;slashMark(e);sparkFx(e.n,e.lift+e.spec.h*0.5,0xff5a30,10,6,0.4,2);if(boss){sparkFx(e.n,e.lift+e.spec.h*0.5,0xff6a30,40,12,0.8,4);ringBurst(e.n,0.6,9,0xff5a1a,0.6,0.3);ringBurst(e.n,0.3,6,0xffd24a,0.5,0.35);shake(0.5);hitstop(0.2);}if(boss&&!e.p2){e.hp=Math.min(e.hp,e.mhp*0.49);e.flash=0.3;return;}hitEnt(e,1e13,pos,0);if(!boss&&e.state==='dead'){e.exec={f:dirv.clone(),t:-0.32,b:false};}}
function fireWildWave(){const n0=pl.n.clone(),f0=pl.f.clone(),RG=38,V=34,life=RG/V+0.35,hit=new Set(),g=new THREE.Group(),ms=[];let tk=0;
/* 반투명 불꽃 벽: 아래는 밝은 주황, 위로 갈수록 진한 붉은색으로 그라데이션 */
const mk=(r,h,op,ang,bot,top)=>{const geo=new THREE.CylinderGeometry(r,r*0.95,h,32,8,true,-ang,2*ang),pos=geo.attributes.position,col=new Float32Array(pos.count*3);for(let i=0;i<pos.count;i++){const u=pos.getY(i)/h+0.5;for(let j=0;j<3;j++)col[i*3+j]=bot[j]+(top[j]-bot[j])*u;}geo.setAttribute('color',new THREE.BufferAttribute(col,3));
const m=new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,opacity:op,side:THREE.DoubleSide,depthWrite:false}),me=new THREE.Mesh(geo,m);me.position.y=h/2+0.05;ms.push([m,op]);return me;};
g.add(mk(3.4,4.6,0.22,0.46,[1,0.3,0.05],[0.45,0.02,0.02]),mk(3.1,3.2,0.4,0.42,[1,0.55,0.12],[0.8,0.1,0.03]),mk(2.95,1.5,0.5,0.38,[1,0.72,0.25],[1,0.4,0.08]));
const blade=mk(3.05,0.42,0.9,1.3,[1,0.92,0.55],[1,0.62,0.2]);blade.position.y=2.1;g.add(blade);const vbar=mk(3.05,7.2,0.85,0.075,[1,0.95,0.7],[1,0.5,0.15]);g.add(vbar);const vbar2=mk(3.12,5.0,0.5,0.17,[1,0.8,0.35],[1,0.4,0.1]);g.add(vbar2);const bladeGeo=blade.geometry;
const ghost=(pos,ff,sx,sy)=>{const gg=new THREE.Group(),mt=new THREE.MeshBasicMaterial({color:0xff7a2a,transparent:true,opacity:0.5,side:THREE.DoubleSide,depthWrite:false}),m=new THREE.Mesh(bladeGeo,mt);m.position.y=2.1;gg.add(m);orient(gg,pos,ff,0.1);gg.scale.set(sx,sy,sx);S.world.add(gg);addFx(gg,0.32,k=>{mt.opacity=0.5*(1-k);gg.scale.set(sx*(1+k*0.15),sy*(1+k*0.3),sx*(1+k*0.15));});};
const scorch=(pos,ff,sx)=>{const gg=new THREE.Group(),dm=new THREE.MeshBasicMaterial({color:0x1d0802,transparent:true,opacity:0.55,depthWrite:false}),d=new THREE.Mesh(new THREE.CircleGeometry(sx*1.1,16),dm),cm=new THREE.MeshBasicMaterial({color:0xff6a20,transparent:true,opacity:0.95,side:THREE.DoubleSide,depthWrite:false}),L=1.3+Math.random()*1.8,c=new THREE.Mesh(new THREE.PlaneGeometry(0.1,L),cm);d.rotation.x=-PI/2;c.rotation.x=-PI/2;c.rotation.z=(Math.random()-0.5)*1.8;c.position.set((Math.random()-0.5)*sx*1.8,0.01,(Math.random()-0.5)*sx*0.8);gg.add(d,c);orient(gg,pos,ff,0.04);S.world.add(gg);addFx(gg,3.2,k=>{const f=k<0.35?1:1-(k-0.35)/0.65;dm.opacity=0.55*f;cm.opacity=(0.5+0.45*Math.sin(S.t*14+L*3)*0.5+0.45*0.5)*f*(k<0.6?1:1-(k-0.6)/0.4);});};
sfx('boom');
addFx(g,life,k=>{const t=k*life,d=Math.min(RG,V*t),pos=n0.clone().addScaledVector(f0,d/R).normalize(),ff=f0.clone().addScaledVector(pos,-f0.dot(pos)).normalize(),rt=V3(0,0,0).crossVectors(pos,ff).normalize(),p=Math.pow(d/RG,0.75);orient(g,pos,ff,0.1);
const sx=0.9+1.7*p,sy=0.9+5.6*p*(1+0.05*Math.sin(S.t*38));g.scale.set(sx,sy,sx);const fade=k>0.8?1-(k-0.8)/0.2:1;for(const[m,o]of ms)m.opacity=o*fade;
tk++;if(tk%2===0)ghost(pos,ff,sx,sy);if(tk%2===1&&d>3)scorch(pos,ff,sx);if(tk%2===0&&S.fxs.length<190){sparkFx(pos.clone().addScaledVector(rt,(Math.random()-0.5)*3.5*sx/R).normalize(),0.1,0xff9a30,2,0.7,1.7,1.1);}if(S.fxs.length<190){for(let u=-1;u<=1;u+=1){const nn=pos.clone().addScaledVector(rt,u*2.4*sx/R).addScaledVector(ff,(2.9*sx)/R).normalize();sparkFx(nn,0.5*sy,u?0xff7a2a:0xffb040,2,3+sx,0.4,1.8+sy*0.35);}
if(tk%3===0){ringBurst(pos,sx*0.5,sx*1.5,0xff5a1a,0.4,0.15);dustFx(pos,sx*0.9,3);}}
shake(0.03+0.02*sy);
for(const e of S.ents){if(e.state==='dead'||hit.has(e))continue;const df=e.n.clone().sub(pos).multiplyScalar(R),lat=Math.abs(df.dot(rt)),fw=df.dot(ff);if(lat<2.6*sx+e.spec.rad&&Math.abs(fw)<3*sx){hit.add(e);execEnt(e,ff,pos);}}});}
/* 라이징 슬래시: 땅에서 거대한 불꽃 검이 앞뒤로 솟아오른다 */
function risingBlades(){const n0=pl.n.clone(),f0=pl.f.clone();
for(let i=0;i<8;i++)for(const sd of[1,-1])for(const zz of (i%2===0?[-4.5,1.5]:[-1.5,4.5])){const d=(2.0+i*1.3)*sd,LN=i%2===0?[-4.5,1.5]:[-1.5,4.5],rt0=V3(0,0,0).crossVectors(n0,f0).normalize(),sp=0.03+i*0.04+(sd<0?0.02:0),tilt=(Math.random()-0.5)*0.3,nn=n0.clone().addScaledVector(f0,d/R).addScaledVector(rt0,zz/R).normalize(),m=swordMesh(0x55ff98),S3=3.3,life=sp+0.8;let hit=false;m.visible=false;
addFx(m,life,k=>{const t=k*life;if(t<sp){m.visible=false;return;}m.visible=true;const u=Math.min(1,(t-sp)/0.14),dn=Math.max(0,(t-sp-0.42)/0.38),y=-3.4+u*4.0-dn*4.2;m.position.copy(wp(nn,0));m.position.y+=y;m.rotation.set(-PI/2+tilt,0,tilt*0.7);m.scale.setScalar(S3);
if(!hit&&u>0.35){hit=true;dustFx(nn,1.0,4);sparkFx(nn,0.2,0x55ff98,6,4,0.35,2.6);ringBurst(nn,0.3,1.7,0xa5ffc4,0.3,0.12);for(const e of S.ents){if(e.state==='dead')continue;if(arc(nn,e.n)<2.3+e.spec.rad){hitEnt(e,9,nn,0.25);if(!e.boss)e.pop=0.8;}}if(i===0)shake(0.12);}});}}
/* ---------- 메인 루프 ---------- */
const SPINW=4*PI;
const clock=new THREE.Clock();let step=0;
function frame(){let dt=Math.min(clock.getDelta(),0.05);if(S.hs>0){S.hs-=dt;dt*=0.07;}if(S.mapOpen)dt=0;step++;
if(S.world&&S.sun){S.t+=dt;
const edt=S.fzT>0?0:dt;if(S.fzT>0)S.fzT-=dt;
if(S.zone==='field'&&S.running&&!S.dead&&S.Z&&S.Z.spawns&&S.cN){S.rsT=(S.rsT||0)-dt;if(S.rsT<=0&&!S.rsBusy){S.rsT=9;const alive=S.ents.filter(e=>!e.boss&&e.state!=='dead').length;if(alive<8){S.rsBusy=true;const pn=S.portals.map(p=>p.n);let pos=null;for(let k=0;k<30&&!pos;k++){const c=pointAt(S.cN,Math.sqrt(Math.random())*S.Z.L*0.72,Math.random()*PI*2);if(arc(c,pl.n)<12)continue;if(pn.some(p=>arc(p,c)<16))continue;if(S.solids.some(o=>arc(o.n,c)<o.r+1.5))continue;pos=c;}if(pos){const z0=S.zone;spawnEnt('alien',pos,any(pos).applyAxisAngle(pos,Math.random()*6)).then(()=>{S.rsBusy=false;}).catch(()=>{S.rsBusy=false;});}else S.rsBusy=false;}}}
if(S.running||true){updatePlayer(dt);if(!(pl.sk&&pl.sk.id==='wild'&&pl.sk.t<WCH)&&S.chgT){S.chgT=0;$('dim').style.opacity=0;}if(!(pl.sk&&pl.sk.id==='wild'&&pl.sk.t<WCH))wgHide();for(let i=S.ents.length-1;i>=0;i--){const e=S.ents[i];updateEnt(e,e.exec?dt:edt);if(e.gone)S.ents.splice(i,1);}projTick(edt);waveTick(edt);}
S.mixers.forEach(m=>m.update(pl.ref&&m===pl.ref.mx?dt:edt));if(pl.ref&&pl.ref.bones&&pl.ref.bones.hd)pl.ref.bones.hd.scale.setScalar(0.8);poseHero();trailTick();fxTick();decalTick();
if(S.running){checkPortals();hud();if(window.mapTick)mapTick();}else{pl.cf.applyAxisAngle(pl.n,-dt*0.25);}
updateCamera(dt);occUpdate(dt+0.0001);npcUi(dt);renderer.render(scene,cam);mhpUi();portalUi();portraitUi();}
requestAnimationFrame(frame);}

/* ---------- 시작 ---------- */
function pickCls(c){$('pWarrior').classList.toggle('on',c==='warrior');$('pMage').classList.toggle('on',c==='mage');$('go').disabled=true;$('go').textContent='불러오는 중…';
setClass(c).then(()=>{if(S.world&&pl.ref)S.world.add(pl.ref.root);$('go').disabled=false;$('go').textContent='모험 시작';});}
$('pWarrior').onclick=()=>pickCls('warrior');$('pMage').onclick=()=>pickCls('mage');
$('go').onclick=()=>{$('start').hidden=true;$('hud').hidden=false;S.running=true;S.snap=true;fitDock();try{AC=new (window.AudioContext||window.webkitAudioContext)();}catch(_){}toast('마을에서 출발!',1500);pl.hp=pl.mhp;pl.st=pl.mst;updateQuest();};
(async function init(){const bar=$('load').firstChild;const total=3;let n=0;const tick=()=>{n++;bar.style.width=Math.min(100,n/total*100)+'%';};
await buildZone('village');tick();await setClass('warrior');tick();if(S.world)S.world.add(pl.ref.root);S.snap=true;tick();
bar.style.width='100%';$('go').disabled=false;$('go').textContent='모험 시작';frame();})().catch(e=>{console.error(e);$('go').textContent='불러오기 실패. 새로고침해 주세요';});
window.__g={DT,S,pl,K,goZone,startAtk,tryRoll,tryJump,spawnWave,toggleLock,hurt,hitEnt,fr:()=>step,EN,setClass};
})();
