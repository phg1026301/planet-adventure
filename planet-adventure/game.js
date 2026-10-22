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
let AC=null,soundOn=false;addEventListener('pointerdown',()=>{if(AC&&AC.state==='suspended')AC.resume();},{passive:true});addEventListener('keydown',()=>{if(AC&&AC.state==='suspended')AC.resume();},{passive:true});
/* ---------- 효과음 (WebAudio 합성: 파일 없이 소리를 직접 만든다) ---------- */
const SFXV={};let SFX_MASTER=null,SFX_NB=null;
function sfxNoise(c){if(!SFX_NB||SFX_NB.sampleRate!==c.sampleRate){const n=c.sampleRate,b=c.createBuffer(1,n,n),d=b.getChannelData(0);for(let i=0;i<n;i++)d[i]=Math.random()*2-1;SFX_NB=b;}return SFX_NB;}
function sfxTone(c,o,type,f0,f1,dur,vol,t,atk){const os=c.createOscillator(),g=c.createGain();os.type=type;os.frequency.setValueAtTime(f0,t);if(f1&&f1!==f0)os.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t+dur);const a=atk||0.004;g.gain.setValueAtTime(0.0001,t);g.gain.linearRampToValueAtTime(vol,t+a);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);os.connect(g);g.connect(o);os.start(t);os.stop(t+dur+0.03);}
function sfxNz(c,o,ftype,f0,f1,q,dur,vol,t,atk){const s=c.createBufferSource();s.buffer=sfxNoise(c);s.loop=true;const f=c.createBiquadFilter();f.type=ftype;f.Q.value=q||1;f.frequency.setValueAtTime(f0,t);if(f1&&f1!==f0)f.frequency.exponentialRampToValueAtTime(Math.max(30,f1),t+dur);const g=c.createGain();const a=atk||0.004;g.gain.setValueAtTime(0.0001,t);g.gain.linearRampToValueAtTime(vol,t+a);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);s.connect(f);f.connect(g);g.connect(o);s.start(t,Math.random()*0.5);s.stop(t+dur+0.03);}
const SFXR={
swing:(c,o,t)=>{sfxNz(c,o,'bandpass',900,3400,1.2,0.17,1.0,t,0.02);sfxTone(c,o,'sine',760,300,0.1,0.14,t);},
swing2:(c,o,t)=>{sfxNz(c,o,'bandpass',500,2400,1.0,0.3,1.1,t,0.05);sfxTone(c,o,'sine',420,150,0.22,0.2,t);},
hit:(c,o,t)=>{const r=0.96+Math.random()*0.09;sfxNz(c,o,'bandpass',3300*r,2500,1.1,0.085,0.5,t,0.001);sfxNz(c,o,'highpass',5200,8500,0.8,0.045,0.26,t,0.001);sfxNz(c,o,'bandpass',1400,900,0.9,0.07,0.22,t,0.001);for(const p of[[3050,0.08,0.13],[3420,0.07,0.1],[4800,0.055,0.07],[2150,0.06,0.06]])sfxTone(c,o,'sine',p[0]*r,p[0]*r,p[1],p[2],t,0.001);sfxTone(c,o,'sine',125,65,0.07,0.28,t,0.001);},
crit:(c,o,t)=>{const r=0.97+Math.random()*0.06;sfxNz(c,o,'bandpass',3600*r,2400,1.0,0.14,0.6,t,0.001);sfxNz(c,o,'highpass',5200,9000,0.8,0.08,0.34,t,0.001);sfxNz(c,o,'bandpass',1300,800,0.9,0.12,0.3,t,0.001);for(const p of[[3050,0.16,0.17],[3420,0.14,0.14],[4800,0.1,0.1],[2150,0.12,0.08],[6200,0.07,0.05]])sfxTone(c,o,'sine',p[0]*r,p[0]*r,p[1],p[2],t,0.001);sfxTone(c,o,'sine',130,50,0.14,0.4,t,0.001);},
hurt:(c,o,t)=>{sfxTone(c,o,'sawtooth',210,60,0.32,0.28,t);sfxNz(c,o,'lowpass',1400,200,0.8,0.22,0.5,t);},
cast:(c,o,t)=>{[523,659,784,1046].forEach((f,i)=>sfxTone(c,o,'sine',f,f,0.3,0.16,t+i*0.06,0.01));sfxNz(c,o,'highpass',5000,7000,0.7,0.35,0.12,t+0.03,0.1);},
boom:(c,o,t)=>{sfxTone(c,o,'sine',95,26,0.65,0.8,t);sfxNz(c,o,'lowpass',500,70,0.8,0.55,0.7,t);sfxTone(c,o,'triangle',60,25,0.5,0.4,t);},
win:(c,o,t)=>{[523,659,784,1046,1318].forEach((f,i)=>{sfxTone(c,o,'triangle',f,f,0.5,0.2,t+i*0.13,0.01);sfxTone(c,o,'sine',f*2,f*2,0.4,0.07,t+i*0.13,0.01);});},
roll:(c,o,t)=>{sfxNz(c,o,'bandpass',350,1500,0.8,0.22,0.9,t,0.04);sfxTone(c,o,'sine',230,110,0.16,0.16,t);},
fire:(c,o,t)=>{sfxTone(c,o,'sawtooth',150,430,0.38,0.2,t,0.02);sfxNz(c,o,'bandpass',600,2600,0.9,0.4,0.8,t,0.05);},
jump:(c,o,t)=>{sfxTone(c,o,'sine',340,720,0.14,0.2,t);sfxNz(c,o,'bandpass',1200,2400,1,0.08,0.12,t);},
land:(c,o,t)=>{sfxTone(c,o,'sine',130,48,0.13,0.3,t);sfxNz(c,o,'lowpass',900,150,0.8,0.1,0.25,t);},
coin:(c,o,t)=>{sfxTone(c,o,'triangle',1318,1318,0.12,0.3,t,0.002);sfxTone(c,o,'triangle',1760,1760,0.25,0.3,t+0.06,0.002);sfxTone(c,o,'sine',3520,3520,0.15,0.05,t+0.06);},
clink:(c,o,t)=>{sfxTone(c,o,'sine',2400+Math.random()*600,2300,0.1,0.07,t,0.001);},
exp:(c,o,t)=>{sfxTone(c,o,'sine',880,1320,0.2,0.26,t,0.01);sfxTone(c,o,'sine',1760,1760,0.28,0.16,t+0.07,0.01);},
die:(c,o,t)=>{sfxNz(c,o,'lowpass',1600,160,0.9,0.42,0.55,t);sfxTone(c,o,'sine',420,80,0.38,0.25,t);sfxTone(c,o,'square',200,50,0.25,0.12,t);},
ui:(c,o,t)=>{sfxTone(c,o,'square',880,880,0.05,0.12,t,0.002);sfxTone(c,o,'square',1320,1320,0.06,0.1,t+0.04,0.002);},
dlg:(c,o,t)=>{sfxTone(c,o,'triangle',660,700,0.07,0.2,t,0.003);sfxTone(c,o,'triangle',990,990,0.09,0.15,t+0.05,0.003);},
portal:(c,o,t)=>{sfxTone(c,o,'sine',180,950,0.9,0.22,t,0.1);sfxTone(c,o,'triangle',360,1500,0.8,0.1,t,0.1);sfxNz(c,o,'bandpass',300,3000,1.2,0.9,0.3,t,0.2);},
roar:(c,o,t)=>{sfxTone(c,o,'sawtooth',95,48,1.0,0.5,t,0.08);sfxTone(c,o,'sawtooth',100,52,1.0,0.35,t,0.08);sfxNz(c,o,'lowpass',700,160,1.2,1.0,0.5,t,0.1);}
};
const SFXG={swing:0.05,swing2:0.08,hit:0.04,crit:0.1,hurt:0.12,cast:0.1,boom:0.08,win:0.5,roll:0.1,fire:0.08,jump:0.1,land:0.05,coin:0.05,clink:0.06,exp:0.06,die:0.12,ui:0.05,dlg:0.05,portal:0.5,roar:1.0};
function sfxInit(){try{if(!AC)AC=new (window.AudioContext||window.webkitAudioContext)();if(!SFX_MASTER||SFX_MASTER.ctx!==AC){const m=AC.createGain();m.gain.value=0.85;const cp=AC.createDynamicsCompressor();cp.threshold.value=-14;cp.ratio.value=5;m.connect(cp);cp.connect(AC.destination);SFX_MASTER={in:m,ctx:AC};}if(AC.state==='suspended')AC.resume();}catch(e){}}
function sfx(t){if(!soundOn)return;if(!AC||AC.state!=='running')sfxInit();if(!AC||!SFX_MASTER)return;const R=SFXR[t];if(!R)return;const now=AC.currentTime;if(SFXV[t]&&now-SFXV[t]<(SFXG[t]||0.04))return;SFXV[t]=now;try{R(AC,SFX_MASTER.in,now+0.005);}catch(e){}}
window.__sfx={SFXR};
/* ---------- 배경음악 (WebAudio 합성, 파일 없음) ---------- */
let bgmOn=false,MBG=null;
const mf=n=>440*Math.pow(2,(n-69)/12);
const BGT={
village:{bpm:94,sw:0.06,prog:[[48,52,55],[43,47,50],[45,48,52],[41,45,48],[48,52,55],[43,47,50],[41,45,48],[43,47,50]],
 mel:[[[76,2],[79,2],[81,1],[79,1],[76,2]],[[74,2],[79,2],[83,1],[81,1],[79,2]],[[72,2],[76,2],[81,2],[79,1],[76,1]],[[77,2],[81,2],[84,1],[83,1],[81,2]],[[79,2],[76,2],[72,2],[76,1],[79,1]],[[83,2],[81,2],[79,2],[74,2]],[[81,2],[79,1],[77,1],[76,2],[77,2]],[[79,4],[74,1],[76,1],[79,1],[83,1]]]},
field:{bpm:128,sw:0,prog:[[45,48,52],[41,45,48],[48,52,55],[43,47,50],[45,48,52],[41,45,48],[43,47,50],[40,44,47]],
 mel:[[[69,1],[72,1],[76,1],[81,1],[79,1],[76,1],[72,1],[76,1]],[[77,2],[81,1],[77,1],[72,2],[69,2]],[[72,1],[76,1],[79,1],[84,1],[83,1],[79,1],[76,1],[79,1]],[[74,2],[79,2],[83,2],[79,1],[74,1]],[[81,2],[79,1],[76,1],[72,2],[76,2]],[[77,1],[81,1],[84,2],[81,1],[77,1],[81,2]],[[83,2],[81,1],[79,1],[74,2],[79,1],[83,1]],[[76,2],[80,1],[83,1],[88,2],[83,1],[80,1]]]},
boss:{bpm:152,sw:0,prog:[[50,53,57],[46,50,53],[48,52,55],[45,49,52],[50,53,57],[46,50,53],[43,46,50],[45,49,52]],
 mel:[[[74,1],[74,1],[77,1],[81,2],[79,1],[77,1],[74,1]],[[70,1],[70,1],[74,1],[77,2],[76,1],[74,1],[70,1]],[[72,1],[72,1],[76,1],[79,2],[77,1],[76,1],[72,1]],[[69,1],[73,1],[76,1],[81,2],[80,1],[76,1],[73,1]],[[86,2],[84,1],[81,1],[84,2],[81,1],[77,1]],[[82,2],[81,1],[77,1],[81,2],[77,1],[74,1]],[[79,2],[77,1],[74,1],[77,2],[74,1],[70,1]],[[76,1],[73,1],[69,1],[73,1],[76,2],[81,2]]]}};
function bgEnv(c,o,type,f,t,dur,vol,atk,rel,lp,vib){const os=c.createOscillator(),g=c.createGain();os.type=type;os.frequency.value=f;let n=os;if(lp){const fl=c.createBiquadFilter();fl.type='lowpass';fl.frequency.value=lp;fl.Q.value=0.7;os.connect(fl);n=fl;}
if(vib){const l=c.createOscillator(),lg=c.createGain();l.frequency.value=5.2;lg.gain.value=f*0.006;l.connect(lg);lg.connect(os.frequency);l.start(t);l.stop(t+dur+rel+0.05);}
g.gain.setValueAtTime(0.0001,t);g.gain.linearRampToValueAtTime(vol,t+atk);g.gain.setValueAtTime(vol,t+Math.max(atk,dur-0.02));g.gain.exponentialRampToValueAtTime(0.0001,t+dur+rel);n.connect(g);g.connect(o);os.start(t);os.stop(t+dur+rel+0.05);}
function bgPluck(c,o,m,t,vol,dec){const os=c.createOscillator(),g=c.createGain(),fl=c.createBiquadFilter();os.type='triangle';os.frequency.value=mf(m);fl.type='lowpass';fl.frequency.setValueAtTime(3200,t);fl.frequency.exponentialRampToValueAtTime(500,t+dec);g.gain.setValueAtTime(0.0001,t);g.gain.linearRampToValueAtTime(vol,t+0.005);g.gain.exponentialRampToValueAtTime(0.0001,t+dec);os.connect(fl);fl.connect(g);g.connect(o);os.start(t);os.stop(t+dec+0.05);}
function bgPad(c,o,notes,t,dur,vol,lp){for(const m of notes){for(const d of[-6,6]){const os=c.createOscillator(),g=c.createGain(),fl=c.createBiquadFilter();os.type='sawtooth';os.frequency.value=mf(m+12);os.detune.value=d;fl.type='lowpass';fl.frequency.value=lp;g.gain.setValueAtTime(0.0001,t);g.gain.linearRampToValueAtTime(vol,t+dur*0.35);g.gain.linearRampToValueAtTime(vol*0.7,t+dur*0.8);g.gain.exponentialRampToValueAtTime(0.0001,t+dur+0.25);os.connect(fl);fl.connect(g);g.connect(o);os.start(t);os.stop(t+dur+0.3);}}}
function bgDrum(c,o,k,t,v){if(k==='k'){sfxTone(c,o,'sine',170,42,0.17,0.9*v,t,0.002);sfxNz(c,o,'lowpass',900,200,0.7,0.05,0.2*v,t,0.002);}else if(k==='s'){sfxNz(c,o,'bandpass',1900,1400,0.8,0.15,0.5*v,t,0.002);sfxTone(c,o,'triangle',210,150,0.09,0.3*v,t,0.002);}else if(k==='h'){sfxNz(c,o,'highpass',7000,7000,0.7,0.04,0.18*v,t,0.001);}else if(k==='c'){sfxNz(c,o,'highpass',5000,5000,0.7,0.9,0.28*v,t,0.002);}}
function bgStep(name,n,t,sp){const c=AC,o=MBG.bus,T=BGT[name],bar=Math.floor(n/16)%8,s=n%16,ch=T.prog[bar],root=ch[0],e8=sp*2;
const sw=(s%2&&T.sw)?T.sw*sp*2:0,tt=t+sw;
if(name==='village'){
 if(s===0)bgPad(c,o,ch,t,sp*16,0.018,1400);
 if(s%2===0){const arp=[ch[0]+12,ch[1]+12,ch[2]+12,ch[1]+12][(s/2)%4];bgPluck(c,o,arp,tt,0.11,0.5);}
 if(s===0||s===8)bgPluck(c,o,root-12,t,0.2,0.9);if(s===4||s===12)bgPluck(c,o,ch[2]-12,t,0.12,0.6);
 if(s===4||s===12)bgDrum(c,o,'h',t,0.7);if(s===0&&bar%4===0)bgDrum(c,o,'k',t,0.35);
}else if(name==='field'){
 if(s===0)bgPad(c,o,ch,t,sp*16,0.012,1800);
 if(s%2===0){bgEnv(c,o,'sawtooth',mf(root-12+(s%4===2?7:0)),t,sp*1.7,0.12,0.004,0.06,900);}
 if(s===4||s===12||s===10){const f=[ch[0]+12,ch[1]+12,ch[2]+12];for(const m of f)bgEnv(c,o,'square',mf(m),t,sp*1.2,0.025,0.003,0.05,2400);}
 if(s===0||s===8)bgDrum(c,o,'k',t,1);if(s===10&&bar%2)bgDrum(c,o,'k',t,0.7);if(s===4||s===12)bgDrum(c,o,'s',t,0.8);if(s%2===0)bgDrum(c,o,'h',t,s%4===0?0.9:0.6);if(s===0&&bar%4===0)bgDrum(c,o,'c',t,0.6);
}else{
 if(s===0)bgPad(c,o,ch,t,sp*16,0.02,1100);
 const oct=[0,0,12,0,0,12,0,7,0,0,12,0,0,7,12,0][s];bgEnv(c,o,'sawtooth',mf(root-12+oct),t,sp*0.9,0.13,0.003,0.04,700+((bar%2)?300:0));
 if(s%4===0)bgDrum(c,o,'k',t,1);if(s===14||s===15)bgDrum(c,o,'k',t,0.6);if(s===4||s===12)bgDrum(c,o,'s',t,1);if(s%2===0)bgDrum(c,o,'h',t,0.6);if(s===0&&bar%2===0)bgDrum(c,o,'c',t,0.7);
 if(s===0||s===8){for(const m of ch)bgEnv(c,o,'sawtooth',mf(m+12),t,sp*3.5,0.02,0.01,0.2,1500);}
}
if(s%2===0){const ev=s/2,mm=T.mel[bar];let p=0;for(const nt of mm){if(p===ev){const f=mf(nt[0]),d=nt[1]*e8;
 if(name==='village')bgEnv(c,o,'sine',f,tt,d*0.95,0.1,0.02,0.18,null,true);
 else if(name==='field')bgEnv(c,o,'square',f,t,d*0.9,0.05,0.008,0.08,3200,true);
 else bgEnv(c,o,'sawtooth',f,t,d*0.9,0.06,0.006,0.1,3600,true);}p+=nt[1];}}
}
function bgmStart(name){if(!bgmOn||!AC||!BGT[name])return;if(MBG&&MBG.name===name)return;bgmStop(true);const bus=AC.createGain();bus.gain.value=0.0001;bus.connect(SFX_MASTER.in);bus.gain.linearRampToValueAtTime(0.5,AC.currentTime+0.8);
const sp=60/BGT[name].bpm/4;MBG={name,bus,n:0,next:AC.currentTime+0.12,sp,iv:null};
const tick=()=>{if(!MBG||MBG.bus!==bus)return;while(MBG.next<AC.currentTime+0.3){try{bgStep(name,MBG.n,MBG.next,MBG.sp);}catch(e){}MBG.n++;MBG.next+=MBG.sp;}};tick();MBG.iv=setInterval(tick,60);}
function bgmStop(quick){if(!MBG)return;const b=MBG;MBG=null;clearInterval(b.iv);try{const t=AC.currentTime;b.bus.gain.cancelScheduledValues(t);b.bus.gain.setValueAtTime(b.bus.gain.value,t);b.bus.gain.linearRampToValueAtTime(0.0001,t+(quick?0.5:0.3));setTimeout(()=>{try{b.bus.disconnect();}catch(e){}},900);}catch(e){}}
window.__sfx.bgTest=(name,c,bus,bars)=>{const a=AC,m=MBG;AC=c;MBG={bus};const sp=60/BGT[name].bpm/4;try{for(let n=0;n<bars*16;n++)bgStep(name,n,n*sp,sp);}finally{AC=a;MBG=m;}return sp*16*bars;};
function bgmZone(name){if(!bgmOn)return;sfxInit();if(!AC||!SFX_MASTER)return;bgmStart(name==='boss'?'boss':name==='village'?'village':'field');}


/* ---------- UI 도우미 ---------- */
let toastTimer=0;
const LOGL=[];function logPush(m,c){const e=document.getElementById('logL');if(!e)return;LOGL.push([m,c]);while(LOGL.length>5)LOGL.shift();e.innerHTML=LOGL.map(x=>'<div'+(x[1]?' style="color:'+x[1]+'"':'')+'>'+x[0].replace(/</g,'&lt;')+'</div>').join('');}
function toast(msg,ms,cls){if(!cls&&msg&&msg.length<48)logPush('[알림] '+msg,'#8fd0ff');const t=$('toast');t.className=cls||'';t.textContent=msg;t.classList.add('on');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('on'),ms||1800);}
function toScreen(v){const p=v.clone().project(cam);return {x:(p.x*0.5+0.5)*W.stage.clientWidth,y:(-p.y*0.5+0.5)*W.stage.clientHeight,z:p.z};}
function floater(worldPos,text,color,crit){const s=toScreen(worldPos);if(s.z>1)return;const d=document.createElement('div');d.className='fl'+(crit?' cr':'');d.textContent=text;d.style.left=(s.x+(Math.random()-0.5)*44)+'px';d.style.top=(s.y-Math.random()*16)+'px';if(!crit)d.style.color=color||'#fff';$('floaters').appendChild(d);setTimeout(()=>d.remove(),950);}
const wp=(n,lift)=>C.clone().addScaledVector(n,R+lift);

/* ---------- 이펙트, 장판 ---------- */
const bm=(c,o,two)=>new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:o,depthWrite:false,side:two?THREE.DoubleSide:THREE.FrontSide});
function addFx(obj,life,upd,delay){S.world.add(obj);S.fxs.push({o:obj,b:S.t+(delay||0),life,upd});}
function fxTick(){for(let i=S.fxs.length-1;i>=0;i--){const f=S.fxs[i],k=(S.t-f.b)/f.life;if(k<0){f.o.visible=false;continue;}f.o.visible=true;if(k>=1){S.world.remove(f.o);S.fxs.splice(i,1);disposeFx(f.o);}else f.upd(k);}}
function disposeFx(o){try{o.traverse(m=>{if(!m.isMesh)return;if(m.geometry&&!m.geometry.userData.keep)m.geometry.dispose();const ms=Array.isArray(m.material)?m.material:[m.material];for(const x of ms)if(x&&!x.userData.keep)x.dispose();});}catch(e){}}
function ringBurst(n,r0,r1,color,life,lift){const m=new THREE.Mesh(new THREE.RingGeometry(0.8,1,48),bm(color,0.9,true));m.rotation.x=-PI/2;const g=new THREE.Group();g.add(m);orient(g,n,any(n),lift||0.2);addFx(g,life,k=>{const s=r0+(r1-r0)*k;m.scale.setScalar(s);m.material.opacity=0.9*(1-k);});}
function sparkFx(n,lift,color,cnt,spd,life,up){const g=new THREE.Group(),a=any(n),b=V3(0,0,0).crossVectors(n,a),ps=[];
for(let i=0;i<cnt;i++){const m=new THREE.Mesh(new THREE.BoxGeometry(0.07,0.07,0.34),bm(i%3?color:0xffffff,1));const th=Math.random()*PI*2,sp=spd*(0.5+Math.random()*0.8),v=a.clone().multiplyScalar(Math.cos(th)*sp).addScaledVector(b,Math.sin(th)*sp).addScaledVector(n,(up||2)*(0.3+Math.random()));g.add(m);ps.push({m,v,p:V3(0,0,0)});}
const base=wp(n,lift);addFx(g,life,k=>{ps.forEach(q=>{q.p.addScaledVector(q.v,1/60);q.v.addScaledVector(n,-0.12);const w=base.clone().add(q.p);q.m.position.copy(w);q.m.lookAt(w.clone().add(q.v));q.m.material.opacity=1-k;q.m.scale.setScalar(1-k*0.6);});});}
function dustFx(n,r,cnt){const g=new THREE.Group(),a=any(n),b=V3(0,0,0).crossVectors(n,a),ps=[];
for(let i=0;i<cnt;i++){const m=new THREE.Mesh(new THREE.SphereGeometry(0.22+Math.random()*0.18,8,6),bm(0xd9c9a3,0.55));const th=i/cnt*PI*2+Math.random()*0.3;g.add(m);ps.push({m,d:a.clone().multiplyScalar(Math.cos(th)).addScaledVector(b,Math.sin(th))});}
const base=wp(n,0.25);addFx(g,0.55,k=>{ps.forEach(q=>{q.m.position.copy(base).addScaledVector(q.d,r*(0.35+k*0.65)).addScaledVector(n,k*0.7);q.m.scale.setScalar(0.6+k*1.3);q.m.material.opacity=0.55*(1-k);});});}
function shake(v){if(S.noShake)return;S.shk=Math.max(S.shk||0,v);}function hitstop(t){S.hs=Math.max(S.hs||0,t);}
function slamFx(n,r,big){ringBurst(n,0.6,r,0xffd45a,0.42,0.14);ringBurst(n,0.3,r*0.72,0xffffff,0.3,0.18);dustFx(n,r*0.8,big?14:10);sparkFx(n,0.3,0xffe08a,big?16:10,5,0.5,3.2);shake(big?0.2:0.14);sfx('boom');}
function rangeFx(r,half,life,fk){fk=fk||0.4;const g=new THREE.Group(),fan=new THREE.Mesh(new THREE.CircleGeometry(r,40,-PI/2-half,half*2),bm(0xffe08a,0.22,true)),edge=new THREE.Mesh(new THREE.RingGeometry(r-0.07,r,40,1,-PI/2-half,half*2),bm(0xfff4c0,0.95,true));
fan.rotation.x=edge.rotation.x=-PI/2;fan.position.y=edge.position.y=0.05;g.add(fan,edge);
for(const sgn of[-1,1]){const aa=-PI/2+sgn*half,dx=Math.cos(aa),dz=-Math.sin(aa),l=new THREE.Mesh(new THREE.BoxGeometry(0.08,0.01,r),bm(0xfff4c0,0.9,true));l.position.set(dx*r/2,0.05,dz*r/2);l.rotation.y=Math.atan2(dx,dz);g.add(l);}
orient(g,pl.n,pl.f,0.12);S.world.add(g);addFx(g,life,k=>{const a=k<fk?0.35+0.65*(k/fk):1-(k-fk)/(1-fk);fan.material.opacity=(k<fk?0.07+0.1*(k/fk):0.28*a);edge.material.opacity=0.25+0.7*(k<fk?k/fk:a);g.traverse(o=>{if(o.isMesh&&o!==fan&&o!==edge)o.material.opacity=0.25+0.65*(k<fk?k/fk:a);});orient(g,pl.n,pl.f,0.12);});}
function glowBall(n,lift,r,color,life,grow){const m=new THREE.Mesh(new THREE.SphereGeometry(r,14,10),bm(color,0.85));m.position.copy(wp(n,lift));addFx(m,life,k=>{m.scale.setScalar(1+k*grow);m.material.opacity=0.85*(1-k);});}
function wc(c){return(c===0xff4a4a&&S.boss&&S.boss.p2&&S.boss.state!=='dead')?0xffee44:c;}
function decalRing(n,r,color,life,onEnd){color=wc(color);const g=new THREE.Group(),o=new THREE.Mesh(new THREE.RingGeometry(r*0.94,r,48),bm(color,0.95)),f=new THREE.Mesh(new THREE.CircleGeometry(r,48),bm(color,0.32));o.rotation.x=f.rotation.x=-PI/2;f.scale.setScalar(0.01);g.add(o,f);orient(g,n,any(n),0.16);S.world.add(g);
const d={g,b:S.t,life,upd:k=>f.scale.setScalar(Math.max(0.01,k)),end:onEnd};S.decals.push(d);return d;}
function decalStrip(n,f0,len,w,color,life,onEnd){color=wc(color);const g=new THREE.Group(),o=new THREE.Mesh(new THREE.PlaneGeometry(w,len),bm(color,0.3)),fill=new THREE.Mesh(new THREE.PlaneGeometry(w,len),bm(color,0.5));o.rotation.x=fill.rotation.x=-PI/2;o.position.z=fill.position.z=len/2;fill.scale.set(1,1,0.01);g.add(o,fill);orient(g,n,f0,0.16);S.world.add(g);
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
else{for(const e of S.ents){if(e.state==='dead')continue;if(arc(p.n,e.n)<p.rad+e.spec.rad&&Math.abs(p.lift-(e.lift+e.spec.h*0.4))<(p.refl?5:2.2)){if(p.refl){S.soft=1;hitEnt(e,p.dmg,p.n,0.2);S.soft=0;ringBurst(p.n,0.3,1.6,p.color,0.25,p.lift);}else{hitEnt(e,p.dmg,p.n,1.2);glowBall(p.n,p.lift,0.4,p.color,0.35,3);ringBurst(p.n,0.4,2.2,p.color,0.35,p.lift);}dead=true;break;}}}
if(p.life<=0)dead=true;if(dead){S.world.remove(p.m);S.projs.splice(i,1);}}}

/* ---------- 데미지 ---------- */
function hurt(d,srcN,kb){if(S.dead||pl.inv>0||pl.god>0||!S.running)return false;{const ent=srcN?S.ents.find(x=>x.n===srcN):null,key=ent||'env';if(!pl.hm)pl.hm=new Map();if((pl.hm.get(key)||0)>S.t)return false;pl.hm.set(key,S.t+0.65);if(pl.hm.size>40)for(const [k,v] of pl.hm)if(v<S.t)pl.hm.delete(k);}d*=100;if(S.zone==='boss'&&S.boss&&S.boss.state!=='dead')d=Math.max(d,pl.hp);pl.hp=Math.max(0,pl.hp-d);pl.flash=0.18;pl.atkT=0;pl.comboT=0;pl.combo=0;pl.lungeT=0;$('vig').classList.add('on');setTimeout(()=>$('vig').classList.remove('on'),120);sfx('hurt');
floater(wp(pl.n,2.1),'-'+Math.round(d),'#ff7a6b');
if(srcN){const dir=dirTo(pl.n,srcN);if(dir){pl.kbDir=dir.negate();pl.kbR=Math.min(kb||0.8,1.4)*0.5;}}
if(pl.hp<=0)die();return true;}
function hitEnt(e,d,fromN,kb){if(e.state==='dead'||e.invul)return;if(d<1e6){if(pl.sk||pl.spin>0||S.soft||d>=100){d=Math.max(30000000+Math.random()*20000000,d*5000000);if(!e.boss){e.skN=(e.skK===(pl.sk||pl.spinFx||'x'))?(e.skN||0)+1:1;e.skK=pl.sk||pl.spinFx||'x';d=Math.min(d,e.mhp*0.34);}}else{d=Math.max(530000,d*22000);if(!e.boss)d=Math.max(d,e.mhp/6*1.001);}}d*=(S.wmul||1);let crit=false;if(d<1e12&&!S.soft&&!(pl.spin>0)&&!(pl.sk&&pl.sk.id==='rise')){S.cc=(S.cc||0)+1;if(S.cc%3===0){crit=true;d*=1.5;}}if(crit)sfx('crit');e.hp-=d;e.hitT=S.t;e.flash=0.14;e.sq=0.2;if(S.soft||pl.spin>0||(pl.sk&&pl.sk.id==='rise')){const now=S.t||0;if(!e._ft||now-e._ft>0.12){e._ft=now;sparkFx(e.n,e.lift+e.spec.h*0.55,0x9ee8ff,3,3.2,0.25,2);floater(wp(e.n,e.lift+e.spec.h),String(Math.round(d)),'#cfeaff',false);}if(!S._sf||now-S._sf>0.07){S._sf=now;sfx('hit');}}else{sfx('hit');const big=d>=100000;sparkFx(e.n,e.lift+e.spec.h*0.55,big?0xffc46b:0xfff2a8,big?14:8,big?6:4.2,0.38,2.2);glowBall(e.n,e.lift+e.spec.h*0.55,0.35,0xffffff,0.16,2.2);shake(big?0.07:0.025);hitstop(big?0.05:0.02);floater(wp(e.n,e.lift+e.spec.h),String(Math.round(d)),'#fff2a8',crit);}
if(!e.boss&&kb&&fromN&&!S.soft){const dir=dirTo(e.n,fromN);if(dir){e.kbDir=dir.negate();e.kbR=Math.min(kb*0.8,1.4);}}
if(!e.boss&&e.spec.kind!=='x'&&e.state!=='dash'&&!(S.soft&&e.stun>0)){e.stun=0.28;if(e.state==='wind'){if(e.decal)e.decal.cancel=true;e.state='recover';e.t=0;}}
if(e.hp<=0)killEnt(e);}
function lootFloater(text,kind){if(!S.running)return;const sc=toScreen(wp(pl.n,2.4+pl.jy));if(sc.z>1)return;const d=document.createElement('div');d.className='fl loot '+kind;d.textContent=text;d.style.left=(sc.x+(kind==='exp'?-84:38)+(Math.random()-0.5)*16)+'px';d.style.top=(sc.y+(kind==='exp'?18:-6))+'px';$('floaters').appendChild(d);setTimeout(()=>d.remove(),1100);}
function lootHud(){const g=$('goldN'),x=$('expN');if(g)g.textContent=(S.gold||0).toLocaleString('en-US');if(x)x.textContent=(S.exp||0).toLocaleString('en-US');}
function mkDrop(kind,n,val){const g=new THREE.Group();if(kind==='coin'){const m=new THREE.Mesh(new THREE.CylinderGeometry(0.19,0.19,0.06,18),new THREE.MeshBasicMaterial({color:0xffd23a})),rim=new THREE.Mesh(new THREE.TorusGeometry(0.19,0.03,6,18),new THREE.MeshBasicMaterial({color:0xb87a10}));m.rotation.z=PI/2;rim.rotation.y=PI/2;g.add(m,rim);}else{g.add(new THREE.Mesh(new THREE.SphereGeometry(0.24,12,10),bm(0x7dff6a,1)),new THREE.Mesh(new THREE.SphereGeometry(0.4,12,10),bm(0x4dff8a,0.3)));}
S.world.add(g);S.drops.push({g,kind,val,n:n.clone(),lift:0.9,vy:5+Math.random()*3,hv:1.5+Math.random()*3,dir:any(n).applyAxisAngle(n,Math.random()*PI*2),t:0,mag:false,sp:0});}
function dropLoot(e){if(!S.drops)S.drops=[];const nc=4+Math.floor(Math.random()*3),tot=133000+Math.floor(Math.random()*47000),per=Math.floor(tot/nc);for(let i=0;i<nc;i++)mkDrop('coin',e.n,i===nc-1?tot-per*(nc-1):per);mkDrop('exp',e.n,Math.round(15000+Math.random()*9000));}
function dropTick(dt){const L=S.drops;if(!L||!L.length){S.pgT=(S.pgT||0)-dt;return;}for(let i=L.length-1;i>=0;i--){const d=L[i];d.t+=dt;
if(!d.mag){if(d.hv>0.05){moveAlong(d.n,d.dir.clone(),d.hv*dt,[d.dir]);d.hv*=Math.exp(-dt*2.5);}d.vy-=18*dt;d.lift+=d.vy*dt;const fl=d.kind==='coin'?0.07:0.2;if(d.lift<fl){d.lift=fl;d.vy=d.vy<-2.5?-d.vy*0.35:0;if(d.vy===0&&!d.land){if(!d.big||Math.random()<0.15)sfx('clink');d.land=1;d.hv=0;if(d.kind==='coin'){d.g.children[0].rotation.z=0;d.g.children[1].rotation.set(PI/2,0,0);}}}if(d.t>1.0&&!S.dead&&(d.big||arc(d.n,pl.n)<8)){d.mag=true;if(d.land&&d.kind==='coin'){d.g.children[0].rotation.z=PI/2;d.g.children[1].rotation.set(0,PI/2,0);}}}
else{d.sp=Math.min(15,d.sp+26*dt);const dir=dirTo(d.n,pl.n),dist=arc(d.n,pl.n);if(dir)moveAlong(d.n,dir,Math.min(dist,(3.5+d.sp)*dt),[d.dir]);d.lift+=((1.0+pl.jy)-d.lift)*Math.min(1,dt*4);}
d.g.position.copy(wp(d.n,d.lift));if(!d.land||d.mag)d.g.rotation.y+=dt*8;
if(d.mag&&arc(d.n,pl.n)<0.8){if(d.kind==='coin'){S.gold=(S.gold||0)+d.val;S.pg=(S.pg||0)+d.val;if(!d.big||Math.random()<0.25)sfx('coin');}else{if(!d.big||Math.random()<0.25)sfx('exp');S.exp=(S.exp||0)+d.val;if(!d.big||Math.random()<0.2)lootFloater('EXP '+d.val,'exp');sparkFx(pl.n,1.2,0x9dff8a,6,3,0.4,1.5);}S.world.remove(d.g);L.splice(i,1);lootHud();}}
S.pgT=(S.pgT||0)-dt;if(S.pg>0&&S.pgT<=0){lootFloater('+'+S.pg,'gold');S.pg=0;S.pgT=0.45;}}
/* 보스 사망: 위에서 아래로 몸이 흩어지며 입자가 위로 퍼진다 (SAO 사망 연출 느낌) */
function bossDissolveInit(e){const base=wp(e.n,0),up=e.n.clone().normalize();const U={uCut:{value:99},uBase:{value:base},uUp:{value:up}};
const SV=[];let hmin=1e9,hmax=-1e9;e.root.updateMatrixWorld(true);const bx=new THREE.Box3();
e.root.traverse(m=>{if(!m.isMesh||m.userData.isOutline)return;bx.setFromObject(m);for(let i=0;i<8;i++){const c=new THREE.Vector3(i&1?bx.max.x:bx.min.x,i&2?bx.max.y:bx.min.y,i&4?bx.max.z:bx.min.z),h=c.sub(base).dot(up);hmin=Math.min(hmin,h);hmax=Math.max(hmax,h);}
{const ps=m.geometry.attributes.position,st=Math.max(1,Math.floor(ps.count/900)),tv=new THREE.Vector3();for(let i=0;i<ps.count;i+=st){if(m.isSkinnedMesh&&m.boneTransform)tv.copy(m.boneTransform(i,new THREE.Vector3()));else tv.set(ps.getX(i),ps.getY(i),ps.getZ(i));tv.applyMatrix4(m.matrixWorld);SV.push([tv.x,tv.y,tv.z,tv.clone().sub(base).dot(up)]);}}
const arr=[].concat(m.material).map(x=>{const y=x.clone();y.transparent=false;y.onBeforeCompile=sh=>{Object.assign(sh.uniforms,U);
sh.vertexShader=sh.vertexShader.replace('#include <common>','varying vec3 vWp;\n#include <common>').replace('#include <project_vertex>','#include <project_vertex>\nvWp=(modelMatrix*vec4(transformed,1.0)).xyz;');
sh.fragmentShader=sh.fragmentShader.replace('#include <common>','varying vec3 vWp;uniform float uCut;uniform vec3 uBase;uniform vec3 uUp;\n#include <common>').replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\nfloat vDh=dot(vWp-uBase,uUp);float nz=fract(sin(dot(floor(vWp*9.0),vec3(12.9898,78.233,37.719)))*43758.5453);float cutN=uCut+(nz-0.5)*0.9;if(vDh>cutN)discard;').replace('#include <dithering_fragment>','float ed=smoothstep(cutN-0.45,cutN,vDh);gl_FragColor.rgb=mix(gl_FragColor.rgb,vec3(0.75,0.92,1.0),ed*0.85);\n#include <dithering_fragment>');};y.customProgramCacheKey=()=>'bossdis';y.needsUpdate=true;return y;});m.material=Array.isArray(m.material)?arr:arr[0];});
const N=420,pos=new Float32Array(N*3),col=new Float32Array(N*3),geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setAttribute('color',new THREE.BufferAttribute(col,3));
const pts=new THREE.Points(geo,new THREE.PointsMaterial({size:0.34,map:(()=>{const c=document.createElement('canvas');c.width=c.height=32;const x=c.getContext('2d'),gr=x.createRadialGradient(16,16,0,16,16,16);gr.addColorStop(0,'#fff');gr.addColorStop(0.45,'rgba(255,255,255,.7)');gr.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=gr;x.fillRect(0,0,32,32);return new THREE.CanvasTexture(c);})(),vertexColors:true,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,fog:false}));pts.frustumCulled=false;S.world.add(pts);
const tA=new THREE.Vector3(1,0,0);if(Math.abs(up.dot(tA))>0.9)tA.set(0,1,0);tA.cross(up).normalize();const tB=up.clone().cross(tA).normalize();
SV.sort((a,b)=>a[3]-b[3]);if(SV.length){hmin=SV[0][3];hmax=SV[SV.length-1][3];}e.dz={SV,U,hmin,hmax,pts,pos,col,N,vel:new Float32Array(N*3),life:new Float32Array(N),k:0,up,base,tA,tB,spawnAcc:0,t:0};}
function bossDissolveTick(e,dt){const z=e.dz,dur=2.8;z.t+=dt;const k=Math.min(1,z.t/dur);z.U.uCut.value=z.hmax+0.3-(z.hmax-z.hmin+0.3)*k;const cut=z.U.uCut.value;
if(k<1){z.spawnAcc+=dt*190;const rad=Math.max(1.6,(e.spec.rad||2)*1.1);while(z.spawnAcc>=1){z.spawnAcc--;let i=z.k++%z.N;const SV=z.SV;if(!SV.length)break;let lo=0,hi=SV.length;const want=cut-0.25;while(lo<hi){const mid=(lo+hi)>>1;if(SV[mid][3]<want)lo=mid+1;else hi=mid;}let a=lo,b2=a;const top=cut+0.5;while(b2<SV.length&&SV[b2][3]<top)b2++;if(b2<=a){a=Math.max(0,Math.min(SV.length-1,a));b2=a+1;}const s=SV[a+Math.floor(Math.random()*(b2-a))];
z.pos[i*3]=s[0]+(Math.random()-0.5)*0.15;z.pos[i*3+1]=s[1]+(Math.random()-0.5)*0.15;z.pos[i*3+2]=s[2]+(Math.random()-0.5)*0.15;
const sp=1.2+Math.random()*2.6,dx=(Math.random()-0.5)*0.9,dy=(Math.random()-0.5)*0.9;z.vel[i*3]=z.up.x*sp+z.tA.x*dx+z.tB.x*dy;z.vel[i*3+1]=z.up.y*sp+z.tA.y*dx+z.tB.y*dy;z.vel[i*3+2]=z.up.z*sp+z.tA.z*dx+z.tB.z*dy;z.life[i]=1.0+Math.random()*0.9;}}
for(let i=0;i<z.N;i++){if(z.life[i]<=0){z.col[i*3]=z.col[i*3+1]=z.col[i*3+2]=0;continue;}z.life[i]-=dt;z.pos[i*3]+=z.vel[i*3]*dt;z.pos[i*3+1]+=z.vel[i*3+1]*dt;z.pos[i*3+2]+=z.vel[i*3+2]*dt;const f=Math.max(0,Math.min(1,z.life[i]/1.2));z.col[i*3]=0.6*f;z.col[i*3+1]=0.88*f;z.col[i*3+2]=f;}
z.pts.geometry.attributes.position.needsUpdate=true;z.pts.geometry.attributes.color.needsUpdate=true;
if(z.t>dur+1.4){S.world.remove(z.pts);z.pts.geometry.dispose();return true;}return false;}
/* 보스 강화 연출: 크기 확대 + 짙은 진홍 색 + 붉은 반투명 오러 */
const TR2=10;
function bossRecolor(b){const MP=[[111,88,80,24,24,30],[88,61,50,12,12,16],[148,143,149,248,246,240],[30,34,45,10,10,14],[154,139,134,125,14,22]];
for(const m of b.holder.userData.mats){const mp=m.map;if(m.color)m.color.setHex(0xffffff);if(!mp||!mp.image||mp.bkR)continue;const im=mp.image,c=document.createElement('canvas');c.width=im.width;c.height=im.height;const x=c.getContext('2d');x.drawImage(im,0,0);const d=x.getImageData(0,0,c.width,c.height),a=d.data;
for(let i=0;i<a.length;i+=4){for(const q of MP){if(Math.abs(a[i]-q[0])<5&&Math.abs(a[i+1]-q[1])<5&&Math.abs(a[i+2]-q[2])<5){a[i]=q[3];a[i+1]=q[4];a[i+2]=q[5];break;}}}
x.putImageData(d,0,0);const t=new THREE.CanvasTexture(c);t.flipY=mp.flipY;t.encoding=mp.encoding;t.magFilter=THREE.NearestFilter;t.minFilter=THREE.NearestFilter;t.wrapS=mp.wrapS;t.wrapT=mp.wrapT;t.bkR=1;m.map=t;m.needsUpdate=true;}}
function bossEyes(b){try{let sm=null;b.holder.traverse(o=>{if(o.isSkinnedMesh)sm=o;});if(!sm)return;const bi=sm.skeleton.bones.findIndex(x=>x.name==='Head');if(bi<0)return;const M=new THREE.Matrix4().multiplyMatrices(sm.skeleton.boneInverses[bi],sm.bindMatrix),k=new THREE.Vector3(0,0,0).applyMatrix4(M).distanceTo(new THREE.Vector3(1,0,0).applyMatrix4(M)),bone=sm.skeleton.bones[bi];b.eyes=[];
for(const sx of[-1,1]){const add=(rad,x,y,z,col)=>{const m=new THREE.Mesh(new THREE.SphereGeometry(rad*k,14,10),new THREE.MeshBasicMaterial({color:col}));m.position.set(sx*x,y,z).applyMatrix4(M);bone.add(m);b.eyes.push(m);};add(0.082,0.42,2.2,0.455,0x0a0a10);add(0.03,0.4,2.235,0.53,0xffffff);add(0.014,0.44,2.17,0.53,0xffffff);}}catch(e){}}
function bossPower(b){b.holder.scale.multiplyScalar(1.3);b.spec=Object.assign({},b.spec,{rad:b.spec.rad*1.25,h:b.spec.h*1.3});
bossRecolor(b);bossEyes(b);
b.auras=[];const list=[];b.holder.traverse(m=>{if(m.isSkinnedMesh)list.push(m);});
for(const m of []){if(!m.geometry.boundingBox)m.geometry.computeBoundingBox();const bb=m.geometry.boundingBox,sz=Math.max(bb.max.x-bb.min.x,bb.max.y-bb.min.y,bb.max.z-bb.min.z)||1,off=(sz*0.022).toFixed(5);
const mt=new THREE.MeshBasicMaterial({color:0xff2a48,transparent:true,opacity:0.3,blending:THREE.AdditiveBlending,side:THREE.BackSide,depthWrite:false,fog:false});mt.skinning=true;
mt.onBeforeCompile=sh=>{sh.vertexShader=sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed+=normalize(normal)*'+off+';');};
const o=new THREE.SkinnedMesh(m.geometry,mt);o.bindMode=m.bindMode;o.bind(m.skeleton,m.bindMatrix);o.position.copy(m.position);o.quaternion.copy(m.quaternion);o.scale.copy(m.scale);o.frustumCulled=false;o.renderOrder=5;o.userData.isOutline=1;m.parent.add(o);b.auras.push(o);}}
/* ---------- 보스 보물상자: 상자 등장 → 열림 → 골드·EXP 폭발 → 엑스칼리버 획득 ---------- */
function bossChestStart(e){let n=e.n.clone();if(S.cN){let bd=1e9;for(let k=0;k<8;k++){const c=pointAt(S.cN,6,k*PI/4),d=arc(c,pl.n);if(d<bd){bd=d;n=c;}}}const g=new THREE.Group(),mk=(w,h,d,c)=>new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshBasicMaterial({color:c}));
const body=mk(2.4,1.3,1.6,0x7a4220);body.position.y=0.65;g.add(body);for(const x of[-0.8,0.8]){const b=mk(0.2,1.34,1.64,0xffd45a);b.position.set(x,0.65,0);g.add(b);}
const lid=new THREE.Group();lid.position.set(0,1.3,-0.8);const lb=mk(2.4,0.5,1.6,0x8a4c26);lb.position.set(0,0.25,0.8);lid.add(lb);for(const x of[-0.8,0.8]){const b=mk(0.2,0.54,1.64,0xffd45a);b.position.set(x,0.25,0.8);lid.add(b);}const lk=mk(0.36,0.4,0.1,0xffe27a);lk.position.set(0,0.1,1.62);lid.add(lk);g.add(lid);
const beamM=new THREE.MeshBasicMaterial({color:0xffe9a0,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,fog:false}),beam=new THREE.Mesh(new THREE.CylinderGeometry(0.9,1.5,9,20,1,true),beamM);beam.position.y=5.2;g.add(beam);
S.world.add(g);orient(g,n,e.f,0);g.scale.setScalar(0.01);S.chest={g,n,f:e.f.clone(),lid,beamM,t:0,burst:false,sw:null,swT:0,done:false,e};sfx('boom');shake(0.3);}
function chestBurst(c){const nC=70,nE=32,tot=420000000,per=Math.floor(tot/nC);for(let i=0;i<nC;i++){mkDrop('coin',c.n,i===nC-1?tot-per*(nC-1):per);const d=S.drops[S.drops.length-1];d.big=true;d.t=-0.9;d.vy=8+Math.random()*7;d.hv=2+Math.random()*6;d.lift=1.4;}
for(let i=0;i<nE;i++){mkDrop('exp',c.n,Math.round(900000+Math.random()*600000));const d=S.drops[S.drops.length-1];d.big=true;d.t=-0.9;d.vy=8+Math.random()*7;d.hv=2+Math.random()*6;d.lift=1.4;}
sfx('boom');shake(0.35);ringBurst(c.n,0.5,9,0xffd45a,0.8,0.4);ringBurst(c.n,0.3,6,0xffffff,0.6,0.6);
const sg=new THREE.Group(),mb=(w,h,d,col)=>new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshBasicMaterial({color:col}));const bl=mb(0.26,2.4,0.08,0xe8f6ff);bl.position.y=1.5;const tip=mb(0.16,0.35,0.08,0xe8f6ff);tip.position.y=2.85;const gd=mb(1.0,0.16,0.16,0xffd45a);gd.position.y=0.3;const gr=mb(0.14,0.6,0.14,0x5a3a20);gr.position.y=-0.05;const pm=mb(0.28,0.28,0.28,0xffd45a);pm.position.y=-0.45;
const aura=new THREE.Mesh(new THREE.BoxGeometry(0.7,3.6,0.5),new THREE.MeshBasicMaterial({color:0x6ec8ff,transparent:true,opacity:0.3,blending:THREE.AdditiveBlending,depthWrite:false,fog:false}));aura.position.y=1.3;sg.add(bl,tip,gd,gr,pm,aura);
const hold=new THREE.Group();hold.add(sg);S.world.add(hold);c.sw={hold,sg,t:0};}
function mythGrant(){const k=S.inv.indexOf(null),have=S.inv.includes('w8')||S.eq.weapon==='w8';let msg;if(have){S.gold=(S.gold||0)+100000000;msg='이미 엑스칼리버가 있어서 100,000,000 플래톤으로 바뀌었어요';}else if(k<0){S.eq.weapon=S.eq.weapon||'w8';msg='엑스칼리버 획득!';}else{S.inv[k]='w8';msg='인벤토리(I)에서 엑스칼리버를 장착하세요';}
saveGame();renderAll();sfx('win');const b=document.createElement('div');b.id='mythBanner';b.innerHTML='<small>★ 신화 등급 무기 획득 ★</small><b>엑스칼리버</b><span>'+msg+'</span>';document.body.appendChild(b);setTimeout(()=>b.remove(),5200);toast('신화 무기 엑스칼리버 획득!',3000);}
function chestTick(dt){const c=S.chest;if(!c||c.done)return;if(!c.g.parent){S.chest=null;return;}c.t+=dt;const t=c.t;
const pop=Math.min(1,t/0.6),ease=1-Math.pow(1-pop,3),bn=pop<1?1+0.12*Math.sin(pop*PI):1;c.g.scale.setScalar(Math.max(0.01,ease*bn));
const open=Math.max(0,Math.min(1,(t-0.9)/0.9));c.lid.rotation.x=-open*1.9;
if(t>1.8&&!c.burst){c.burst=true;chestBurst(c);}
c.beamM.opacity=c.burst?Math.max(0,0.45*(1-(t-1.8)/7))*(0.85+0.15*Math.sin(t*9)):open*0.2;
if(c.sw){const s=c.sw;s.t+=dt;const k=s.t;let h;if(k<1.7){h=1.4+k/1.7*2.4;const sc=Math.min(1,k/0.5);s.sg.scale.setScalar(Math.max(0.01,sc));s.hold.position.copy(wp(c.n,h));}else if(k<2.9){h=3.8+0.15*Math.sin(k*4);s.hold.position.copy(wp(c.n,h));}else{const u=Math.min(1,(k-2.9)/0.7),from=wp(c.n,3.8),to=wp(pl.n,1.3+pl.jy);s.hold.position.lerpVectors(from,to,u*u);s.sg.scale.setScalar(Math.max(0.01,1-u*0.7));if(u>=1){S.world.remove(s.hold);c.sw=null;mythGrant();}}
if(c.sw){c.sw.sg.rotation.y+=dt*6;const up=c.n;c.sw.hold.quaternion.setFromUnitVectors(V3(0,1,0),up);c.sw.hold.rotateY(0);}}
if(t>16){S.world.remove(c.g);c.done=true;S.chest=null;}}
function killEnt(e){if(e.eyes)for(const o of e.eyes)o.visible=false;if(e.auras)for(const o of e.auras)o.visible=false;sfx('die');e.state='dead';e.t=0;if(e.decal)e.decal.cancel=true;play(e,'die',0.1,true);if(S.lock===e)S.lock=null;if(e.boss){S.bossDead=true;sfx('win');victory();}else{S.kills++;dropLoot(e);updateQuest();if(S.kills===1)toast('보스 스테이지 문이 열렸어요!',2600);}}

/* ---------- 애니메이션 ---------- */
const flatCache=new Map();
function flatClip(c){if(flatCache.has(c))return flatCache.get(c);const n=c.clone();for(const t of n.tracks){if(!t.name.endsWith('Hips.position'))continue;const v=t.values,len=v.length/3,m=[0,0,0];for(let i=0;i<len;i++)for(let k=0;k<3;k++)m[k]+=Math.abs(v[i*3+k]);let up=0;for(let k=1;k<3;k++)if(m[k]>m[up])up=k;for(let k=0;k<3;k++){if(k===up)continue;const f=v[k];for(let i=0;i<len;i++)v[i*3+k]=f;}}flatCache.set(c,n);return n;}
function mkActs(holder,anims,names,flat){const mx=new THREE.AnimationMixer(holder);const acts={};for(const k in names){let c=findClip(anims,names[k]);if(c&&flat)c=flatClip(c);if(c)acts[k]=mx.clipAction(c);}S.mixers.push(mx);return {mx,acts};}
function play(o,name,fade,once,speed){const a=o.acts[name];if(!a)return;if(o.cur===name&&!once&&a.enabled&&a.getEffectiveWeight()>0.01)return;const f=fade||0.15;for(const k in o.acts){const b=o.acts[k];if(b!==a&&b.enabled)b.fadeOut(f);}if(once){a.reset();a.setLoop(THREE.LoopOnce,1);a.clampWhenFinished=true;}else{a.clampWhenFinished=false;if(!a.enabled||a.getEffectiveWeight()<=0.01)a.reset();a.setLoop(THREE.LoopRepeat,Infinity);}a.timeScale=speed||1;a.enabled=true;a.setEffectiveWeight(1);a.fadeIn(f).play();o.cur=name;}
const MON={idle:'Idle',walk:'Walk',atk:'Bite_Front',hit:'HitRecieve',die:'Death',fly:'Flying'};

/* ---------- 플레이어 ---------- */
const WT={sword:{p:[0,0,0],r:[-0.4,0,0.26],s:0.7},shield:{p:[0,0,0],r:[0,0,0]},staff:{p:[0,0,0],r:[0,0,0]}};
function attach(root,bone,obj,cfg){const b=root.getObjectByName(bone);if(!b)return null;const ws=V3(0,0,0);b.getWorldScale(ws);const w=new THREE.Group();w.scale.setScalar(1/ws.x*(cfg.s||1));w.position.set(...cfg.p);w.rotation.set(...cfg.r);w.add(obj);b.add(w);return w;}
function makeStaff(){const g=new THREE.Group(),wood=new THREE.MeshToonMaterial({color:0xb98a55,emissive:0x2a1608});
const shaft=new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.028,1.55,10),wood);shaft.position.y=0.4;g.add(shaft);
const claw=new THREE.Mesh(new THREE.TorusGeometry(0.1,0.017,8,16),wood);claw.position.y=1.14;claw.rotation.x=PI/2;g.add(claw);
const tip=new THREE.Mesh(new THREE.SphereGeometry(0.1,16,12),new THREE.MeshBasicMaterial({color:0x9ee8ff}));tip.position.y=1.22;g.add(tip);
const halo=new THREE.Mesh(new THREE.SphereGeometry(0.19,16,12),bm(0x6fd0ff,0.3));halo.position.y=1.22;g.add(halo);g.userData.tip=tip;return g;}
const RT={};
/* 흑기사 팔레트: 팔레트 텍스처의 회색/흰색(갑옷)은 어두운 철색, 붉은색(망토)은 짙은 진홍, 가죽은 어둡게. 피부·금색은 유지 */
const _dkCache=new Map();
function darkTex(m){const im=m.map&&m.map.image;if(!im||!im.width)return;let t=_dkCache.get(im);if(!t){const w=im.width,h=im.height,c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.drawImage(im,0,0,w,h);const d=x.getImageData(0,0,w,h),a=d.data,sk=w/4;
for(let i=0;i<a.length;i+=4){const px=(i/4)%w,py=(i/4/w)|0;if(px<sk&&py<h/4)continue;const r=a[i]/255,g=a[i+1]/255,b=a[i+2]/255,mx=Math.max(r,g,b),mn=Math.min(r,g,b),s=mx?(mx-mn)/mx:0;let hh=0;if(mx!==mn){const dd=mx-mn;hh=mx===r?((g-b)/dd+6)%6:mx===g?(b-r)/dd+2:(r-g)/dd+4;hh*=60;}
let nr=r,ng=g,nb=b;
if(s<0.22){const v=mx*0.30+0.035;nr=v*0.95;ng=v*0.98;nb=v*1.12;}
else if((hh<14||hh>340)&&s>0.45){nr=r*0.62;ng=g*0.5;nb=b*0.6;}
else if(hh>=8&&hh<=34&&s<0.75&&!(hh>=30&&s>0.6)){nr=r*0.42;ng=g*0.4;nb=b*0.42;}
a[i]=Math.min(255,nr*255);a[i+1]=Math.min(255,ng*255);a[i+2]=Math.min(255,nb*255);}
x.putImageData(d,0,0);t=new THREE.CanvasTexture(c);t.flipY=m.map.flipY;t.encoding=m.map.encoding;t.wrapS=m.map.wrapS;t.wrapT=m.map.wrapT;t.anisotropy=m.map.anisotropy;_dkCache.set(im,t);}
m.map=t;m.needsUpdate=true;}
function darkKnight(root){root.traverse(o=>{if(o.isMesh&&o.name!=='sword_1handed')[].concat(o.material).forEach(darkTex);});}
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
holder.updateMatrixWorld(true);let tip=null,rw=null,swTip=null,swBase=null,glowM=null;
if(!fb){const hs=holder.userData.inner;
if(cls==='warrior'){const sw=await load('sword'),sh=await load('shield');
if(sw){const s=sw.obj.clone();s.scale.setScalar(1);{const bb=new THREE.Box3().setFromObject(s),sz=bb.getSize(V3(0,0,0)),ax=sz.x>=sz.y&&sz.x>=sz.z?'x':sz.y>=sz.z?'y':'z',lo=bb.min[ax],hi=bb.max[ax],far=Math.abs(hi)>Math.abs(lo)?hi:lo,c=bb.getCenter(V3(0,0,0)),mk=v=>{const o=new THREE.Object3D(),p=c.clone();p[ax]=v;o.position.copy(p);s.add(o);return o;};swTip=mk(far);swBase=mk(far*0.2);
/* 월광검: 칼날을 은은한 달빛색으로 빛나게 (눈부심 없도록 반투명 가산 합성 + 아주 느린 맥동) */
{const a=swBase.position.clone(),b=swTip.position.clone(),d=b.clone().sub(a),L=d.length(),gr=new THREE.Group();gr.position.copy(a.clone().add(b).multiplyScalar(0.5));gr.quaternion.setFromUnitVectors(V3(0,1,0),d.clone().normalize());
const mkc=(r,col,op)=>{const m=new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:op,blending:THREE.AdditiveBlending,depthWrite:false,fog:false}),me=new THREE.Mesh(new THREE.CylinderGeometry(r*0.55,r,L*1.02,16,1,true),m);me.renderOrder=6;me.userData.glow=1;gr.add(me);return m;};
glowM=[mkc(L*0.2,0x8fb4ff,0.2),mkc(L*0.12,0xb9d2ff,0.3),mkc(L*0.06,0xf2f7ff,0.5)];glowM.base=[0.2,0.3,0.5];s.add(gr);
s.traverse(o=>{if(o.isMesh&&o.material&&o.material.map&&o.parent!==gr){o.material=o.material.clone();o.material.emissive=new THREE.Color(0x4a66aa);o.material.emissiveMap=o.material.map;o.material.emissiveIntensity=0.7;o.material.userData.mo=0x4a66aa;}});}
}rw=attach(hs,'handslotr',s,WT.sword);}
if(sh){const s=sh.obj.clone();attach(hs,'handslotl',s,WT.shield);}}
else{const st=await load('staff');if(st){const s=st.obj.clone();rw=attach(hs,'handslotr',s,WT.staff);const tp=new THREE.Mesh(new THREE.SphereGeometry(0.01),new THREE.MeshBasicMaterial({visible:false}));s.add(tp);tp.position.set(0,0.9,0);tip=tp;}}}
if(!fb&&cls==='warrior')darkKnight(holder);
const bone=n=>holder.userData.inner.getObjectByName(n);
const ref={root,tumble,holder,mx:m.mx,acts:m.acts,cur:'',tip,fb,cls,rw,swTip,swBase,glowM,bones:fb?null:{ur:bone('upperarmr'),lr:bone('lowerarmr'),ul:bone('upperarml'),ll:bone('lowerarml'),ch:bone('chest'),hips:bone('hips'),hd:bone('head'),tr:bone('upperlegr'),sr:bone('lowerlegr'),tl:bone('upperlegl'),sl:bone('lowerlegl')}};play(ref,'idle',0);return ref;}
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
async function setClass(cls){S.cls=cls;const ref=await makeHero(cls);if(pl.ref){if(pl.ref.root.parent)pl.ref.root.parent.remove(pl.ref.root);const i=S.mixers.indexOf(pl.ref.mx);if(i>=0)S.mixers.splice(i,1);}pl.ref=ref;if(S.world)S.world.add(ref.root);try{recalcWeapon();}catch(e){}
pl.mhp=12000;pl.mst=5000;pl.hp=pl.mhp;pl.st=pl.mst;$('clsName').textContent='Lv.99 동성인재개발교육원';}
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
{const R=pl.ref,k=kind==='skill'?'skill':'atk'+pl.combo;if(R.acts[k]){const cl=R.acts[k].getClip().duration;play(R,k,0.06,true,cl/P.t*(P.rt||1));R.rt=1;}else play(R,'atk',0.06,true,P.ts);}sfx(w?(pl.combo===3?'swing2':'swing'):'cast');}
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
if(!pl.pSwOn){let pend=null,pd=1e9;for(const p of S.projs){if(p.from!=='enemy')continue;const d=arc(p.n,pl.n);if(d<=3.4&&d<pd){pd=d;pend=p;}}
pl.pSwOn=true;pl.pSwT=0;pl.pSwDir=-(pl.pSwDir||1);pl.pSwLen=pend?0.08:0.2;pl.pTgt=pend;if(pend){const fd=dirTo(pl.n,pend.n);if(fd)pl.f.copy(fd);}const dd=pl.pSwDir,fast=!!pend;ribbonFx(u=>{const x=dd*(-2.3+4.4*u),y=0.2+2.2*u,z=1.1+1.5*Math.sin(u*PI)+0.8*u;return[x,y,z,x*0.92,y-0.25,z-0.5];},fast?12:22,fast?0.12:0.2,[0.8,0.92,1],{sweep:0.5,tail:1.0,rev:false});sfx('swing');}
for(const w of S.waves){if(w.refl)continue;const d=arc(w.c,pl.n);if(d>=w.r-1.6&&d<=w.r+1.6){w.refl=true;w.hit=true;sfx('boom');shake(0.2);hitstop(0.05);ringBurst(pl.n,0.4,6,0xfff0a0,0.4,0.2);ringBurst(pl.n,0.3,3.2,0xffffff,0.3,0.25);sparkFx(pl.n,0.9,0xfff0a0,16,8,0.4,2.4);reflectWave(pl.n.clone());}}}
function reflectWave(c){const g=new THREE.Group(),m=new THREE.MeshBasicMaterial({color:0xfff0a0,transparent:true,opacity:0.7,side:THREE.DoubleSide,depthWrite:false}),ring=new THREE.Mesh(new THREE.RingGeometry(0.92,1,64),m);ring.rotation.x=-PI/2;ring.position.y=0.15;g.add(ring);orient(g,c,any(c),0);S.world.add(g);const hit=new Set();
addFx(g,0.9,k=>{const r=1+k*42;g.scale.set(r,1,r);m.opacity=0.7*(1-k);for(const e of S.ents){if(e.state==='dead'||hit.has(e))continue;if(arc(c,e.n)<=r+e.spec.rad){hit.add(e);S.soft=0;hitEnt(e,e.boss?40:300,c,0.4);}}});}
/* ---------- 지형 높이 (건물 지붕, 테라스, 계단) ---------- */
const SQ2=0.70710678;
function locOf(n){const p=W.floorXY(n);return [SQ2*(p[1]-p[0]),-SQ2*(p[0]+p[1])];}
function platTop(p,x,z){if(x<p.x0||x>p.x1||z<p.z0||z>p.z1)return null;if(p.type==='box')return p.top;if(p.type==='ramp')return p.h0+(p.h1-p.h0)*(z-p.z0)/(p.z1-p.z0);const t=p.axis==='z'?z:x;return p.wall+p.rh*Math.max(0,1-Math.abs(t-p.c)/p.half);}
function groundAtLocal(pls,x,z){let b=0;if(pls)for(const p of pls){const t=platTop(p,x,z);if(t!==null&&t>b)b=t;}return b;}
const STEPH=1.1,PR=0.05;
function groundUpdate(){const pls=S.plats;if(!pls||!pls.length){pl.gy=0;return;}
let xl,zl;[xl,zl]=locOf(pl.n);const abs0=(pl.gy||0)+pl.jy;
for(let it=0;it<2;it++){let moved=false;for(const p of pls){if(xl<p.x0-PR||xl>p.x1+PR||zl<p.z0-PR||zl>p.z1+PR)continue;const cx=clamp(xl,p.x0,p.x1),cz=clamp(zl,p.z0,p.z1);const top=platTop(p,cx,cz);if(top===null||top<=abs0+STEPH)continue;
const dl=xl-(p.x0-PR),dr=(p.x1+PR)-xl,dd=zl-(p.z0-PR),du=(p.z1+PR)-zl,m=Math.min(dl,dr,dd,du);let dx=0,dz=0;if(m===dl)dx=-m;else if(m===dr)dx=m;else if(m===dd)dz=-m;else dz=m;
const wx=-SQ2*(dx+dz),wz=SQ2*(dx-dz),L=Math.hypot(wx,wz);if(L<1e-6)continue;const d=V3(wx/L,0,wz/L);d.addScaledVector(pl.n,-pl.n.dot(d));if(d.lengthSq()<1e-9)continue;d.normalize();moveAlong(pl.n,d,L+0.005,[pl.f,pl.cf,pl.rollDir]);[xl,zl]=locOf(pl.n);moved=true;}if(!moved)break;}
let best=0;for(const p of pls){const t=platTop(p,xl,zl);if(t!==null&&t<=abs0+STEPH&&t>best)best=t;}
const grounded=pl.jy<=0.0001&&pl.vy<=0.001;let nj=abs0-best;if(nj<0){nj=0;if(pl.vy<0)pl.vy=0;}else if(grounded&&nj<=0.5)nj=0;
pl.gy=best;pl.jy=nj;}
function skyTex(){const c=document.createElement('canvas');c.width=4;c.height=256;const g=c.getContext('2d'),gr=g.createLinearGradient(0,0,0,256);gr.addColorStop(0,'#2a86e6');gr.addColorStop(0.55,'#7cc6f5');gr.addColorStop(1,'#d9f0fa');g.fillStyle=gr;g.fillRect(0,0,4,256);const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;return t;}
function cloudTex(){const c=document.createElement('canvas');c.width=256;c.height=100;const g=c.getContext('2d');g.fillStyle='#fff';for(const [x,y,r] of[[60,60,34],[100,44,40],[150,50,44],[196,62,32],[128,68,46],[80,72,28],[176,74,30]]){g.beginPath();g.arc(x,y,r,0,7);g.fill();}const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;return t;}
function tryJump(){if(S.dead||!S.running||pl.roll>0)return;if(pl.jy>0.05){if(pl.dj)return;pl.dj=1;pl.vy=16;pl.jt=0;pl.jflip=1;sfx('roll');ringBurst(pl.n,0.3,1.8,0x9ee8ff,0.35,pl.jy);ringBurst(pl.n,0.2,1.0,0xffffff,0.3,pl.jy+0.05);sparkFx(pl.n,pl.jy,0xbfe9ff,8,3,0.35,0.5);return;}sfx('jump');pl.dj=0;pl.vy=12.8;pl.ff=0;pl.jt=0;pl.jflip=moveVec()&&!pl.atkT?1:0;sfx('roll');ringBurst(pl.n,0.3,1.3,0xffffff,0.3,0.15);}
function tryRoll(){if(S.dead||!S.running||pl.roll>0||pl.jy>0.05||(pl.sk&&(pl.sk.id==='giga'||pl.sk.id==='guard')))return;if(pl.st<1100){toast('스태미나 부족',600);return;}
pl.sk=null;pl.st-=1100;pl.stDelay=0.6;pl.roll=0.45;pl.inv=Math.max(pl.inv,0.4);pl.atkT=0;pl.comboT=0;pl.combo=0;pl.lungeT=0;endSpin();const dir=moveVec();if(dir)pl.rollDir.copy(dir);else pl.rollDir.copy(pl.f);sfx('roll');}
function moveVec(){if(S.dlg)return null;const ix=(K.ArrowRight?1:0)-(K.ArrowLeft?1:0)+joy.x,iz=(K.ArrowUp?1:0)-(K.ArrowDown?1:0)-joy.y;if(!ix&&!iz)return null;const right=V3(0,0,0).crossVectors(pl.cf,pl.n);const v=V3(0,0,0).addScaledVector(pl.cf,iz).addScaledVector(right,ix);if(v.length()<0.05)return null;return v.normalize();}
function toggleLock(){if(S.lock){S.lock=null;return;}let best=null,bd=24;for(const e of S.ents){if(e.state==='dead')continue;const d=e.boss?0:arc(pl.n,e.n);if(d<bd){bd=d;best=e;}}S.lock=best;}
S.camMode=2;S.quarter=true;S.qk=1;S.camAuto=false;S.calm=true;const QB=V3(-0.7071,0,-0.7071);
const CAMTXT=['카메라: 자동 (F5: 마우스 조작)','카메라: 마우스 조작 (F5: 쿼터뷰)','카메라: 쿼터뷰 (F5: 자동)'],CAMTOAST=['카메라 자동','카메라 수동: 마우스 드래그로 돌려요','쿼터뷰: 맵 전체가 보여요'];
function toggleCam(){S.camMode=(S.camMode+1)%3;S.camAuto=S.camMode===0;S.quarter=S.camMode===2;const el=$('camMode');if(el){el.textContent=CAMTXT[S.camMode];el.classList.add('on');clearTimeout(S._camT);S._camT=setTimeout(()=>el.classList.remove('on'),2600);}toast(CAMTOAST[S.camMode],1400);}
function interact(){if(!S.running||S.dead)return;if(S.dlg){dlgNext();return;}for(const w of S.wells)if(arc(pl.n,w)<3.6){pl.hp=pl.mhp;pl.st=pl.mst;toast('우물물을 마시고 체력이 가득 찼어요',1800);ringBurst(pl.n,0.5,2.5,0x6fd0ff,0.6,0.2);return;}
const n=nearNpc();if(n)dlgOpen(n);}
const NPC_EMO={'로비':'📋','가렌':'⚔️','브론':'🔨','모아':'🛍️','레나':'🎯'};
function nearNpc(){let b=null,bd=4.4;for(const n of S.npcs){const d=arc(pl.n,n.n);if(d<bd){bd=d;b=n;}}return b;}
function portraitSvg(nm){const P={'로비':{hair:'#f08fb8',hair2:'#d8679a',cloth:'#fdf3fb',cloth2:'#e0568f',eye:'#d85a9a',style:'twin',acc:'ribbon'},
'가렌':{hair:'#e8c46a',hair2:'#c79a3a',cloth:'#cfd6e6',cloth2:'#e8b93a',eye:'#3f7fd1',style:'short',acc:'armor',skin:'#f4cfa6',scar:1},
'브론':{hair:'#c9632a',hair2:'#9e4418',cloth:'#6a4a3a',cloth2:'#f0a83a',eye:'#4a3020',style:'short',acc:'band',skin:'#e8b890',beard:1},
'모아':{hair:'#58b86a',hair2:'#3d9150',cloth:'#fff3d0',cloth2:'#4aa65e',eye:'#2e8b57',style:'pony',acc:'hat'},
'레나':{hair:'#5a8be8',hair2:'#3a63c0',cloth:'#eaf1ff',cloth2:'#3a63c0',eye:'#2a56b8',style:'short',acc:'band2'},
'hero-w':{hair:'#f4f0ff',hair2:'#c8c0e6',cloth:'#d84c4c',cloth2:'#f2c94c',eye:'#7a5cd1',style:'long2',acc:'none'},
'hero-m':{hair:'#7a4cc8',hair2:'#5a329c',cloth:'#4a3a9a',cloth2:'#e8b93a',eye:'#e0457a',style:'long2',acc:'star'}};
let k=Object.keys(P).find(x=>nm===x||nm.includes(x))||'로비';const o=Object.assign({skin:'#ffe0c4'},P[k]);let s='<svg viewBox="0 0 300 440" xmlns="http://www.w3.org/2000/svg">';
/* 뒷머리 */
if(o.style==='long'||o.style==='long2')s+=`<path d="M62 190 Q40 330 70 420 L230 420 Q262 330 238 190Z" fill="${o.hair2}"/>`;
if(o.style==='twin'){for(const sx of[-1,1])s+=`<path d="M${150+sx*70} 170 Q${150+sx*125} 250 ${150+sx*100} 400 Q${150+sx*80} 340 ${150+sx*60} 230Z" fill="${o.hair2}"/>`;}
if(o.style==='pony')s+=`<path d="M215 130 Q285 150 270 300 Q250 230 214 190Z" fill="${o.hair2}"/>`;
/* 몸 */
s+=`<path d="M30 440 Q40 340 108 318 L192 318 Q260 340 270 440Z" fill="${o.cloth}"/>`;
if(o.acc==='armor'){s+=`<path d="M22 440 Q22 330 78 312 L120 330 L84 440Z" fill="${o.cloth}"/><path d="M278 440 Q278 330 222 312 L180 330 L216 440Z" fill="${o.cloth}"/><path d="M60 318 Q110 300 150 332 Q190 300 240 318 L240 346 Q190 330 150 360 Q110 330 60 346Z" fill="${o.cloth2}"/>`;}
else s+=`<path d="M110 318 L150 372 L190 318 L176 312 L150 346 L124 312Z" fill="${o.cloth2}"/>`;
if(k==='브론')s+=`<path d="M30 440 Q40 350 100 330 L110 440Z" fill="#8a5a36"/>`;
s+=`<rect x="128" y="276" width="44" height="50" rx="14" fill="${o.skin}"/>`;
/* 얼굴 */
s+=`<ellipse cx="150" cy="200" rx="78" ry="86" fill="${o.skin}"/>`;
if(o.beard)s+=`<path d="M82 220 Q90 300 150 300 Q210 300 218 220 Q196 260 150 262 Q104 260 82 220Z" fill="${o.hair2}"/>`;
/* 앞머리 */
s+=`<path d="M66 205 Q56 96 150 88 Q244 96 234 205 Q226 150 196 140 Q176 170 140 150 Q108 168 100 140 Q74 152 66 205Z" fill="${o.hair}"/>`;
s+=`<path d="M66 205 Q60 250 74 290 Q84 240 90 200Z" fill="${o.hair}"/><path d="M234 205 Q240 250 226 290 Q216 240 210 200Z" fill="${o.hair}"/>`;
if(o.style==='long2'||o.style==='long'){s+=`<path d="M150 90 Q146 60 128 50 Q150 52 160 88Z" fill="${o.hair}"/>`;}
/* 눈 */
for(const sx of[-1,1]){const cx=150+sx*34;s+=`<ellipse cx="${cx}" cy="210" rx="17" ry="25" fill="#fff"/><ellipse cx="${cx}" cy="214" rx="13" ry="21" fill="${o.eye}"/><ellipse cx="${cx}" cy="218" rx="6.5" ry="11" fill="#1a1630"/><circle cx="${cx-5}" cy="204" r="5.5" fill="#fff"/><circle cx="${cx+5}" cy="224" r="2.6" fill="#fff"/><path d="M${cx-19} 196 Q${cx} 184 ${cx+19} 196" stroke="#2a1d33" stroke-width="4.5" fill="none" stroke-linecap="round"/><path d="M${cx-16} 178 Q${cx} 170 ${cx+16} 178" stroke="${o.hair2}" stroke-width="4" fill="none" stroke-linecap="round"/>`;}
s+=`<ellipse cx="102" cy="246" rx="13" ry="7" fill="#ff8aa8" opacity=".35"/><ellipse cx="198" cy="246" rx="13" ry="7" fill="#ff8aa8" opacity=".35"/><path d="M138 262 Q150 272 162 262" stroke="#a8504a" stroke-width="3.4" fill="none" stroke-linecap="round"/><path d="M148 236 Q150 240 153 237" stroke="#c98a70" stroke-width="2.4" fill="none"/>`;
if(o.scar)s+=`<path d="M186 176 L206 232" stroke="#c76a5a" stroke-width="4" stroke-linecap="round"/>`;
/* 장식 */
if(o.acc==='ribbon')for(const sx of[-1,1])s+=`<path d="M${150+sx*66} 120 l${sx*34} -22 l0 44z M${150+sx*66} 120 l${sx*-4} 0" fill="${o.cloth2}"/><circle cx="${150+sx*66}" cy="120" r="9" fill="#f9c0d8"/>`;
if(o.acc==='band'||o.acc==='band2')s+=`<path d="M70 150 Q150 108 230 150 L228 172 Q150 132 72 172Z" fill="${o.cloth2}"/><circle cx="150" cy="130" r="9" fill="#fff6c8"/>`;
if(o.acc==='hat')s+=`<ellipse cx="150" cy="116" rx="96" ry="22" fill="#d8b074"/><path d="M92 114 Q96 54 150 52 Q204 54 208 114Z" fill="#e8c88c"/><rect x="92" y="100" width="116" height="14" fill="${o.cloth2}"/>`;
if(o.acc==='star')s+=`<polygon points="150,70 158,92 182,92 163,106 170,128 150,114 130,128 137,106 118,92 142,92" fill="#ffd45a" transform="translate(0,-14) scale(1)"/>`;
if(k==='hero-w')s+=`<path d="M236 190 Q258 168 262 130 Q248 150 232 160Z" fill="${o.hair}"/>`;
if(k==='가렌')s+=`<path d="M92 160 Q110 120 150 112 Q190 120 208 160" stroke="${o.hair2}" stroke-width="3" fill="none"/>`;
s+='</svg>';return s;}
function parseLine(s){const m=/^\[(.+?)\]\s*(.*)$/.exec(s);return m?{nm:m[1],tx:m[2]}:{nm:'',tx:s};}
function npcFx(h,n,nc){const outl=[];const mats=[];
try{const list=[];/* 노란 외곽선 효과 제거(부자연스러워서) */for(const m of list){if(!m.geometry)continue;if(!m.geometry.boundingBox)m.geometry.computeBoundingBox();const bb=m.geometry.boundingBox,sz=Math.max(bb.max.x-bb.min.x,bb.max.y-bb.min.y,bb.max.z-bb.min.z)||1,off=(sz*0.016).toFixed(5);
const mt=new THREE.MeshBasicMaterial({color:0xffe27a,side:THREE.BackSide,fog:false});mt.skinning=!!m.isSkinnedMesh;mt.onBeforeCompile=sh=>{sh.vertexShader=sh.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\nvec3 onr=normal;\nvec2 oo=(projectionMatrix*vec4(normalize(normalMatrix*onr),0.0)).xy;if(length(oo)>1e-5)gl_Position.xy+=normalize(oo)*0.011*gl_Position.w;');};
let o;if(m.isSkinnedMesh){o=new THREE.SkinnedMesh(m.geometry,mt);o.bindMode=m.bindMode;o.bind(m.skeleton,m.bindMatrix);}else o=new THREE.Mesh(m.geometry,mt);
o.position.copy(m.position);o.quaternion.copy(m.quaternion);o.scale.copy(m.scale);o.frustumCulled=false;o.visible=false;o.userData.isOutline=1;m.parent.add(o);outl.push(o);mats.push(mt);}}catch(e){console.warn('outline',e);}
const rm=new THREE.MeshBasicMaterial({color:0xffd45a,transparent:true,opacity:0.8,side:THREE.DoubleSide,depthWrite:false,fog:false}),ring=new THREE.Mesh(new THREE.RingGeometry(1.25,1.45,48),rm);ring.rotation.x=-PI/2;const g=new THREE.Group();g.add(ring);const rm2=new THREE.MeshBasicMaterial({color:0xffd45a,transparent:true,opacity:0.22,side:THREE.DoubleSide,depthWrite:false,fog:false}),r2=new THREE.Mesh(new THREE.CircleGeometry(1.25,40),rm2);r2.rotation.x=-PI/2;g.add(r2);g.visible=false;orient(g,n,any(n),0.08+(nc.lift||0));S.world.add(g);
const L0=parseLine(nc.talk[0]);let emo='💬';for(const k in NPC_EMO)if(L0.nm.includes(k))emo=NPC_EMO[k];
const em=[];h.traverse(m=>{if(m.isMesh&&!m.userData.isOutline){for(const x of (Array.isArray(m.material)?m.material:[m.material]))if(x&&x.emissive)em.push(x);}});
return {n,talk:nc.talk,h,outl,mats,em,ring:g,rm,rm2,nm:L0.nm,emo,lift:nc.lift||0,hgt:nc.h||2};}
function dlgDraw(){const d=S.dlg;if(!d)return;$('dlgTx').textContent=d.full.slice(0,Math.floor(d.pos));$('dlgNx').style.visibility=d.pos>=d.full.length?'visible':'hidden';}
function dlgShow(){const d=S.dlg,L=parseLine(d.npc.talk[d.i]);d.full=L.tx;d.pos=0;dlgDraw();const sh=d.npc.nm&&d.npc.nm.includes('브론')&&d.i===d.npc.talk.length-1;$('dlgNx').textContent=sh?'ENTER 🛒 상점':'ENTER ▼';}
let SNAPRT=null;
function visBox(root){const b=new THREE.Box3(),t=new THREE.Box3();root.traverse(m=>{if(!m.isMesh||!m.geometry)return;let o=m,v=true;while(o){if(!o.visible){v=false;break;}o=o.parent;}if(!v)return;if(m.userData&&m.userData.isOutline)return;t.setFromObject(m);if(!t.isEmpty())b.union(t);});return b;}
function snapChar(root,face,yaw,W,H,fx,zf){const up=pl.n.clone();root.updateMatrixWorld(true);let ctr,sz,hh;if(fx){const bp=root.getWorldPosition(new THREE.Vector3());ctr=bp.addScaledVector(up,fx*0.5);sz=new THREE.Vector3(fx*0.5,fx,fx*0.5);hh=fx*(zf||1.08);}else{const box=visBox(root);ctr=box.getCenter(new THREE.Vector3());sz=box.getSize(new THREE.Vector3());hh=Math.max(0.5,sz.y*1.05,Math.max(sz.x,sz.z)*1.55);}
if(!SNAPRT||SNAPRT.width!==W||SNAPRT.height!==H){if(SNAPRT)SNAPRT.dispose();SNAPRT=new THREE.WebGLRenderTarget(W,H,{minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,format:THREE.RGBAFormat});SNAPRT.texture.encoding=THREE.sRGBEncoding;}
const tc=new THREE.PerspectiveCamera(22,W/H,0.05,80),f=face.clone().applyAxisAngle(up,yaw),dist=hh*0.62/Math.tan(11*Math.PI/180)*1.0;
const lk=ctr.clone();tc.position.copy(lk).addScaledVector(f,dist).addScaledVector(up,sz.y*0.06);tc.up.copy(up);tc.lookAt(lk);tc.updateMatrixWorld(true);
const hid=[];for(const c of S.world.children){if(c.isLight||c===root||c.isCamera)continue;if(c.visible){c.visible=false;hid.push(c);}}
const ol=[],em=[];root.traverse(m=>{if(m.userData&&m.userData.isOutline&&m.visible){m.visible=false;ol.push(m);}if(m.isMesh&&!m.userData.isOutline){for(const x of(Array.isArray(m.material)?m.material:[m.material]))if(x&&x.emissive&&x.emissive.getHex()!==0){em.push([x,x.emissive.getHex(),x.emissiveIntensity]);x.emissive.setHex(0);}}});
const bg=scene.background,fg=scene.fog,pc=new THREE.Color(),pa=renderer.getClearAlpha();renderer.getClearColor(pc);scene.background=null;scene.fog=null;renderer.setClearColor(0x000000,0);
const prevSh=renderer.shadowMap.autoUpdate;
renderer.setRenderTarget(SNAPRT);renderer.clear();renderer.render(scene,tc);const buf=new Uint8Array(W*H*4);renderer.readRenderTargetPixels(SNAPRT,0,0,W,H,buf);renderer.setRenderTarget(null);
renderer.setClearColor(pc,pa);scene.background=bg;scene.fog=fg;for(const c of hid)c.visible=true;for(const m of ol)m.visible=true;for(const [x,h,i] of em){x.emissive.setHex(h);x.emissiveIntensity=i;}
const cv=document.createElement('canvas');cv.width=W;cv.height=H;const ctx=cv.getContext('2d'),im=ctx.createImageData(W,H);for(let y=0;y<H;y++)im.data.set(buf.subarray((H-1-y)*W*4,(H-y)*W*4),y*W*4);ctx.putImageData(im,0,0);return cv;}
function dlgOpen(npc){S.dlg={npc,i:0,pos:0,full:''};$('hud').style.visibility='hidden';K.ArrowUp=K.ArrowDown=K.ArrowLeft=K.ArrowRight=false;$('dlgNm').textContent=npc.nm;$('dlgPt').innerHTML=portraitSvg(npc.nm);$('dlgPl').innerHTML=portraitSvg(S.cls==='warrior'?'hero-w':'hero-m');$('dlg').hidden=false;$('npcTip').hidden=true;const d=dirTo(npc.n,pl.n);if(d)orient(npc.h,npc.n,d,0);
try{const W=440,H=640,dh=dirTo(pl.n,npc.n)||pl.f,ph=npc.h.root||npc.h,hr=pl.ref.root;const cn=snapChar(ph,d||pl.f,0.55,W,H,1.6,1.2),ch=snapChar(hr,pl.f,-0.55,W,H,1.3);$('dlgPt').innerHTML='';$('dlgPt').appendChild(cn);$('dlgPl').innerHTML='';$('dlgPl').appendChild(ch);}catch(e){console.warn('dlg snap',e);}sfx('dlg');dlgShow();}
function dlgNext(){const d=S.dlg;if(!d)return;sfx('dlg');if(d.pos<d.full.length){d.pos=d.full.length;dlgDraw();return;}d.i++;if(d.i>=d.npc.talk.length){const sh=d.npc.nm&&d.npc.nm.includes('브론');dlgClose();if(sh)openShop();return;}dlgShow();}
$('dlg').addEventListener('click',()=>dlgNext());$('npcTip').addEventListener('click',()=>interact());
function dlgClose(){S.dlg=null;$('hud').style.visibility='';$('dlg').hidden=true;}
function npcUi(dt){const tip=$('npcTip');if(!S.npcs.length||!S.running||S.dead){if(!tip.hidden)tip.hidden=true;if(S.dlg)dlgClose();return;}
const nr=S.dlg?S.dlg.npc:nearNpc();
if(S.dlg){const d=S.dlg;if(arc(pl.n,d.npc.n)>6.5){dlgClose();}else if(d.pos<d.full.length){d.pos=Math.min(d.full.length,d.pos+dt*42);dlgDraw();}}
const pulse=0.5+0.5*Math.sin(S.t*6);
for(const n of S.npcs){const on=n===nr;n.ring.visible=on;if(on){n.rm.opacity=0.5+0.15*pulse;const sc=1+0.03*pulse;n.ring.scale.set(sc,1,sc);}for(const o of n.outl)o.visible=on;for(const x of n.em)x.emissive.setRGB(on?0.07+0.03*pulse:0,on?0.06+0.03*pulse:0,on?0.02:0);if(on)for(const m of n.mats)m.color.setHex(pulse>0.5?0xffe27a:0xfff1b0);}
if(nr&&!S.dlg){const v=wp(nr.n,3.1).project(cam);if(v.z<1){tip.hidden=false;tip.style.left=Math.round((v.x*0.5+0.5)*innerWidth-tip.offsetWidth/2)+'px';tip.style.top=Math.round((-v.y*0.5+0.5)*innerHeight-tip.offsetHeight)+'px';}else tip.hidden=true;}else tip.hidden=true;}
const MB=[];const fmtN=n=>n>=1e8?(n/1e8).toFixed(1)+'억':n>=1e4?Math.round(n/1e4)+'만':String(Math.max(0,Math.round(n)));
function mhpUi(){const box=$('mhp');if(!box)return;let k=0;if(S.running&&!S.dead&&S.world){for(const e of S.ents){if(e.boss||e.state==='dead')continue;if(!(S.lock===e||S.t-(e.hitT||-99)<5))continue;const v=wp(e.n,e.lift+e.spec.h+0.5).project(cam);if(v.z>=1||Math.abs(v.x)>1.1||Math.abs(v.y)>1.1)continue;let b=MB[k];if(!b){const d=document.createElement('div');d.className='mb';d.innerHTML='<div class="mn"></div><div class="mbar"><i></i></div><div class="mt"></div>';box.appendChild(d);b=MB[k]={d,n:d.children[0],f:d.children[1].firstChild,t:d.children[2]};}
b.d.style.display='block';b.d.style.left=((v.x*0.5+0.5)*innerWidth)+'px';b.d.style.top=((-v.y*0.5+0.5)*innerHeight)+'px';if(b.nm!==e.spec.name){b.nm=e.spec.name;b.n.textContent=e.spec.name;}b.f.style.width=Math.max(0,e.hp/e.mhp*100)+'%';b.t.textContent=fmtN(e.hp)+' / '+fmtN(e.mhp);k++;}}
for(let i=k;i<MB.length;i++)if(MB[i].d.style.display!=='none')MB[i].d.style.display='none';}
let PL=null;function portalUi(){const box=$('mhp');if(!box)return;if(!PL){PL=document.createElement('div');PL.className='ptl';box.appendChild(PL);}
let best=null,bd=9;if(S.running&&!S.dead&&S.world)for(const p of S.portals){const d=arc(pl.n,p.n);if(d<bd){bd=d;best=p;}}
if(!best||!ZONES[best.to]){PL.style.display='none';return;}const v=wp(best.n,4.2).project(cam);if(v.z>=1){PL.style.display='none';return;}
const txt=(best.locked?'🔒 ':'')+ZONES[best.to].n;if(PL.textContent!==txt)PL.textContent=txt;PL.style.display='block';PL.style.left=((v.x*0.5+0.5)*innerWidth)+'px';PL.style.top=((-v.y*0.5+0.5)*innerHeight)+'px';PL.style.opacity=Math.min(1,(9-bd)/3);}
let pfr=0,ptDone=null;function portraitUi(){const c=$('ptc');if(!c||!S.running||!pl.ref||S.switching)return;const nm='Lv.99 동성인재개발교육원';{for(const np of S.npcs){if(!np.nm)continue;if(!np.tag){const d=document.createElement('div');d.className='npcn';d.textContent=np.nm;document.body.appendChild(d);np.tag=d;}const t=np.tag;if(S.running&&!S.dead&&!S.switching&&S.world&&arc(pl.n,np.n)<9){const v=wp(np.n,np.lift+np.hgt+0.35).project(cam);if(v.z<1&&Math.abs(v.x)<1.05&&Math.abs(v.y)<1.05){t.style.display='block';t.style.left=Math.round((v.x*0.5+0.5)*innerWidth)+'px';t.style.top=Math.round((-v.y*0.5+0.5)*innerHeight-6)+'px';continue;}}t.style.display='none';}}
{const pn=$('pname');if(pn){if(S.running&&!S.dead&&pl.n&&!S.switching){const v=wp(pl.n,1.7).project(cam);if(v.z<1){pn.style.display='block';pn.style.left=Math.round((v.x*0.5+0.5)*innerWidth)+'px';pn.style.top=Math.round((-v.y*0.5+0.5)*innerHeight-8)+'px';}else pn.style.display='none';}else pn.style.display='none';}}if($('ptn').textContent!==nm)$('ptn').textContent=nm;const key=S.cls+S.zone;if(ptDone===key)return;if(pl.ref.root.parent!==S.world){pfr=0;return;}if(++pfr<45)return;pfr=0;
try{const cv=renderer.domElement,tc=new THREE.PerspectiveCamera(24,cv.width/cv.height,0.1,300),head=wp(pl.n,1.02),f=pl.f.clone();tc.position.copy(head).addScaledVector(f,1.7).addScaledVector(pl.n,0.06);tc.up.copy(pl.n);tc.lookAt(head);tc.updateMatrixWorld(true);const hid=[];for(const e of S.ents){if(e.root&&e.root.visible){hid.push(e.root);e.root.visible=false;}}
if(!window.__PRT){window.__PRT=new THREE.WebGLRenderTarget(256,256,{minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter});window.__PRT.texture.encoding=THREE.sRGBEncoding;}tc.aspect=1;tc.updateProjectionMatrix();renderer.setRenderTarget(window.__PRT);renderer.render(scene,tc);const bf=new Uint8Array(256*256*4);renderer.readRenderTargetPixels(window.__PRT,0,0,256,256,bf);renderer.setRenderTarget(null);const tcv=document.createElement('canvas');tcv.width=256;tcv.height=256;const tx=tcv.getContext('2d'),im=tx.createImageData(256,256);for(let y=0;y<256;y++)im.data.set(bf.subarray((255-y)*1024,(256-y)*1024),y*1024);tx.putImageData(im,0,0);c.getContext('2d').drawImage(tcv,0,0,c.width,c.height);for(const r of hid)r.visible=true;ptDone=key;}catch(e){renderer.setRenderTarget(null);console.warn("portrait",e);ptDone=key;}}
function occUpdate(dt){if(!S.occ||!S.occ.length||!pl.ref)return;const C=cam.position,P=wp(pl.n,1.3),ab=P.clone().sub(C),L2=ab.lengthSq();if(L2<1e-4)return;const c=new THREE.Vector3(),q2=new THREE.Vector3();
for(const q of S.occ){let hit=false;const pn=q.o.position;for(const fr of[0.2,0.5,0.85]){c.copy(pn).addScaledVector(q.n,q.hh*fr);q2.copy(c).sub(C);const t=q2.dot(ab)/L2;if(t<0.03||t>0.96)continue;q2.copy(C).addScaledVector(ab,t);if(c.distanceTo(q2)<q.r){hit=true;break;}}
if(!hit&&q.a>=1)continue;const tg=hit?0.2:1;q.a+=(tg-q.a)*Math.min(1,9*dt);if(q.a>0.985){q.a=1;if(q.mats){let i=0;q.o.traverse(m=>{if(m.isMesh&&m.userData.om){m.material=m.userData.om;m.userData.om=null;}});for(const x of q.mats)x.dispose();q.mats=null;}continue;}
if(!q.mats){q.mats=[];q.o.traverse(m=>{if(m.isMesh&&!m.userData.om){const arr=Array.isArray(m.material);m.userData.om=m.material;const cl=(arr?m.material:[m.material]).map(x=>{const y=x.clone();y.transparent=true;y.needsUpdate=true;return y;});m.material=arr?cl:cl[0];q.mats.push(...cl);}});}
for(const x of q.mats){x.opacity=q.a;x.depthWrite=q.a>0.95;}}}

function updatePlayer(dt){const ref=pl.ref;if(!ref)return;
pl.inv=Math.max(0,pl.inv-dt);pl.god=Math.max(0,pl.god-dt);pl.skCd=Math.max(0,pl.skCd-dt);meteorTick(dt);for(const k in pl.cds)pl.cds[k]=Math.max(0,pl.cds[k]-dt);parryTick(dt);pl.dashCd=Math.max(0,(pl.dashCd||0)-dt);pl.stDelay-=dt;pl.flash=Math.max(0,pl.flash-dt);
if(S.dead){orient(ref.root,pl.n,pl.f,0);return;}
const mv=S.running?moveVec():null;const run=!!(K.ShiftLeft||K.ShiftRight||DT.run||Math.hypot(joy.x,joy.y)>0.8);if(pl.sk)tickSkill(dt);{const aa=K.ArrowUp||K.ArrowDown||K.ArrowLeft||K.ArrowRight,nw=performance.now();if(aa)DT.clr=nw;else if(DT.run&&nw-DT.clr>130)DT.run=false;}
if(S.running){if(S.quarter){const b=QB.clone();b.addScaledVector(pl.n,-b.dot(pl.n));if(b.lengthSq()>1e-6)pl.cf.copy(b.normalize());}if(S.camAuto){pl.pitch+=(0.4-pl.pitch)*Math.min(1,2*dt);if(mv&&pl.roll<=0&&pl.atkT<=0&&!(S.lock&&S.lock.state!=='dead')){const ang=Math.atan2(pl.n.dot(V3(0,0,0).crossVectors(pl.cf,mv)),pl.cf.dot(mv));if(Math.abs(ang)<1.75)pl.cf.applyAxisAngle(pl.n,Math.sin(ang)*1.35*dt);}}
if(S.lock&&S.lock.state!=='dead'){if(!S.lock.boss&&arc(pl.n,S.lock.n)>34)S.lock=null;else{const d=dirTo(pl.n,S.lock.n);if(d)turnToward(pl.cf,d,pl.n,4.5*dt);}}}
if(DT.dash){DT.dash=false;tryDash();}let speed=0,dir=null;
if(pl.roll>0){pl.roll-=dt;speed=11;dir=pl.rollDir;const k=1-Math.max(0,pl.roll)/0.45;ref.tumble.rotation.x=k*PI*2;ref.tumble.position.y=0.9-Math.sin(k*PI)*0.15;if(pl.roll<=0){ref.tumble.rotation.x=0;ref.tumble.position.y=0.9;}}
else if(pl.dashT>0){pl.dashT-=dt;speed=27;dir=pl.dashDir;pl.inv=Math.max(pl.inv,0.08);pl.fd2=(pl.fd2||0)-dt;if(pl.fd2<=0){pl.fd2=0.035;const bk=pl.n.clone().addScaledVector(pl.dashDir,-1.4/R).normalize();sparkFx(bk,0.8,0xe8f2ff,2,1.4,0.22,0.2);dustFx(bk,0.5,2);}}
else if(mv){speed=pl.sk?((pl.sk.id==='wild'&&pl.sk.t<WCH)||pl.sk.id==='giga'||pl.sk.id==='guard'?0:(run?8.6:4.5)*(pl.sk.id==='rise'?0.4:pl.sk.id==='sakura'?0.75:1)):pl.spin>0?6:(pl.atkT>0?0:(run?8.6:4.5));dir=speed>0?mv:null;}
if(mv&&speed>6&&pl.jy<=0&&pl.roll<=0){pl.fd=(pl.fd||0)-dt;if(pl.fd<=0){pl.fd=0.13;dustFx(pl.n,0.6,3);const bk=pl.n.clone().addScaledVector(pl.f,-1.2/R).normalize();sparkFx(bk,0.9,0xffffff,2,1.2,0.25,0.3);}}
if(pl.atkT>0){pl.atkAge+=dt;pl.atkT-=dt;if(!pl.atkDone&&pl.atkAge>=pl.atkFire)fireAtk();if(pl.atkT<=0&&pl.atkKind==='atk'){if(pl.combo<3)pl.comboT=0.5;else{pl.combo=0;pl.atkLock=0.04;}}}
if(pl.spin>0){pl.spin-=dt;pl.spinAng+=dt*SPINW;pl.spinTick-=dt;if(pl.spinTick<=0){pl.spinTick=PI/SPINW;pl.spinN++;const slam=pl.spinN%2===0;let hit=false;for(const e of S.ents){if(e.state==='dead')continue;if(arc(pl.n,e.n)<(slam?6.4:5.6)+e.spec.rad){hitEnt(e,slam?18:8,pl.n,slam?1.1:0.4);hit=true;}}if(slam){slamFx(pl.n,6.6,false);}else sfx(hit?'hit':'swing');}if(pl.spin<=0)endSpin();}
pl.comboT=Math.max(0,pl.comboT-dt);pl.atkLock=Math.max(0,pl.atkLock-dt);
if(S.running&&pl.atkT<=0&&(K.KeyZ||S.btnAtk||S.mouseAtk))startAtk('atk');
if(pl.kbR>0.001){const st=pl.kbR*(1-Math.exp(-dt*12));pl.kbR-=st;moveAlong(pl.n,pl.kbDir.clone(),st,[pl.f,pl.cf,pl.rollDir]);}
if(pl.lungeT>0){const st=Math.min(pl.lungeT,dt);moveAlong(pl.n,pl.f.clone(),pl.lungeV*st,[pl.f,pl.cf,pl.rollDir]);pl.lungeT-=st;}
if(pl.jy>0||pl.vy>0){if(pl.ff&&pl.jy>0.05)pl.vy=Math.min(pl.vy,-40);pl.vy-=(pl.vy>0?48:34)*dt;;pl.jy+=pl.vy*dt;if(pl.jy<=0){if(pl.ff){pl.ff=0;slamFx(pl.n,4.2,false);ringBurst(pl.n,0.4,4.2,0xbfe9ff,0.35,0.2);dustFx(pl.n,1.4,8);sparkFx(pl.n,0.2,0xfff0c0,10,6,0.4,2.2);shake(0.16);sfx('boom');S.soft=1;for(const e of S.ents){if(e.state==='dead')continue;if(arc(pl.n,e.n)<4.0+e.spec.rad)hitEnt(e,8,pl.n,1.0);}S.soft=0;}pl.jy=0;pl.vy=0;pl.jland=0.14;pl.jflip=0;pl.dj=0;ringBurst(pl.n,0.3,1.1,0xffffff,0.25,0.15);}else pl.jt+=dt;}pl.jland=Math.max(0,pl.jland-dt);
if(dir&&speed>0)moveAlong(pl.n,dir,speed*dt,[pl.f,pl.cf,pl.rollDir]);
/* 충돌과 경계 */
for(const s of S.solids){if(S.zone==='field')break;const d=arc(pl.n,s.n);if(d<s.r+0.45){const dd=dirTo(pl.n,s.n);if(dd)moveAlong(pl.n,dd.negate(),(s.r+0.45)-d,[pl.f,pl.cf,pl.rollDir]);}}
const cN=S.cN,dc=arc(pl.n,cN);if(dc>S.Z.L){const dd=dirTo(pl.n,cN);if(dd)moveAlong(pl.n,dd,dc-S.Z.L,[pl.f,pl.cf,pl.rollDir]);}
groundUpdate();
/* 바라보는 방향 */
if(pl.roll>0)pl.f.copy(pl.rollDir);
else if(pl.dashT>0&&pl.dashDir)turnToward(pl.f,pl.dashDir,pl.n,30*dt);
else if(pl.sk){if(pl.sk.id==='wild'){play(ref,'idle',0.12,false,1);const ia=ref.acts.idle;if(ia)ia.timeScale=pl.sk.t<WCH-0.12?0.001:1.2;}else if(mv&&(pl.sk.id==='chase'||pl.sk.id==='rain'))turnToward(pl.f,mv,pl.n,10*dt);}
else if(pl.atkT>0){if(pl.atkDir&&!pl.atkDone)turnToward(pl.f,pl.atkDir,pl.n,16*dt);}
else if(S.lock&&S.lock.state!=='dead'){const d=dirTo(pl.n,S.lock.n);if(d)turnToward(pl.f,d,pl.n,12*dt);}
else if(mv)turnToward(pl.f,mv,pl.n,14*dt);
orient(ref.root,pl.n,pl.f,pl.jy+(pl.gy||0));
if(pl.spinFx){orient(pl.spinFx,pl.n,pl.f,pl.jy);pl.spinFx.userData.sp.rotation.y+=SPINW*dt;}
pl.lean=(pl.lean||0)+((((mv&&run&&!pl.sk&&pl.atkT<=0&&pl.spin<=0&&pl.jy<=0)||pl.dashT>0)?0.5:0)-(pl.lean||0))*Math.min(1,11*dt);
if(pl.sk&&pl.roll<=0&&!(pl.dashT>0&&pl.sk.id!=='sakura'&&pl.sk.id!=='wild')){const sk=pl.sk,q=sk.t/sk.dur;if(sk.id==='sakura'){ref.tumble.rotation.set(0.12,easeIO(Math.min(1,q))*PI*4,0);ref.tumble.position.y=0.9;}else if(sk.id==='wild'){const cq=Math.min(1,sk.t/WCH);const cr=Math.min(1,sk.t/0.35);ref.tumble.rotation.set(sk.t<WCH-0.12?0.38*cr:(sk.t<WCH+0.4?0.4:0.05),(sk.t<WCH-0.12?0.25*cr:0)+(window.__dbgYaw||0),0);ref.tumble.position.y=0.9-(sk.t<WCH?0.3*cr:0);}else if(sk.id==='rise'){ref.tumble.rotation.set(sk.t<0.12?0.2:-0.2,0,0);ref.tumble.position.y=0.9;}else{ref.tumble.rotation.set(-0.12,0,0);ref.tumble.position.y=0.9;}}
else if(pl.parry>0&&pl.roll<=0){const w=pSw(),e2=w*w*(3-2*w),dr=pl.pSwDir||1,sn=Math.sin(w*PI);ref.tumble.rotation.set(0.12+0.22*sn,dr*(-0.75+1.5*e2),dr*(0.22-0.44*e2));ref.tumble.position.y=0.9-0.14*sn;}
else if(MBAR&&MBAR.t<MBAR.dur+0.5&&pl.roll<=0&&pl.jy<=0){const q=Math.min(1,MBAR.t/0.3)*Math.min(1,(MBAR.dur+0.5-MBAR.t)/0.4);ref.tumble.rotation.set(-0.3*q,0.3*Math.sin(MBAR.t*2.6)*q,0);ref.tumble.position.y=0.9+0.42*q+0.05*q*Math.sin(MBAR.t*5);if(Math.floor(MBAR.t*2.5)!==MBAR.pr){MBAR.pr=Math.floor(MBAR.t*2.5);ringBurst(pl.n,0.4,2.4,0xffd9a0,0.5,0.1+0.4*q);}}
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
function victory(){const c=S.cN;S.portals.push(makePortal({id:'toVillage',n:c.clone(),to:'village',label:'마을로 돌아가는 문'}));updateQuest();}

/* ---------- 몬스터 ---------- */
const EN={
cactus:{a:'cactus',name:'선인장',h:2.0,hp:60,spd:3.2,aggro:7,kind:'melee',range:2.0,wind:0.75,cd:1.6,dmg:12,rad:0.7,r2:2.4,fly:0},
alien:{a:'alien',name:'Lv.90 외계인',h:1.9,hp:50,spd:3.6,aggro:7.5,kind:'lunge',range:4.6,wind:0.7,cd:2.0,dmg:14,rad:0.7,dash:3.4,dashT:0.35,fly:0},
mushroom:{a:'mushroom',name:'버섯',h:2.1,hp:80,spd:1.9,aggro:7,kind:'ranged',range:9,wind:0.9,cd:2.6,dmg:10,rad:0.8,proj:7,fly:0},
bee:{a:'bee',name:'벌',h:1.4,hp:35,spd:5,aggro:8,kind:'lunge',range:5.2,wind:0.6,cd:1.8,dmg:10,rad:0.6,dash:3.8,dashT:0.3,fly:1.5},
bat:{a:'bat',name:'박쥐',h:1.5,hp:30,spd:5.5,aggro:8,kind:'lunge',range:5.2,wind:0.55,cd:1.7,dmg:8,rad:0.6,dash:3.8,dashT:0.28,fly:1.9},
orc:{a:'orc',name:'오크',h:2.2,hp:95,spd:2.9,aggro:7,kind:'melee',range:2.2,wind:0.8,cd:1.7,dmg:15,rad:0.8,r2:2.6,fly:0},
dino:{a:'dino',name:'공룡',h:1.9,hp:70,spd:3.5,aggro:7.5,kind:'lunge',range:4.6,wind:0.7,cd:2.0,dmg:14,rad:0.7,dash:3.4,dashT:0.35,fly:0},
dragon:{a:'dragon',name:'Lv.100 하늘의 폭군 드래곤',h:4.6,hp:2280,spd:3.4,aggro:99,kind:'boss',range:99,rad:2.3,fly:0.8}};
for(const k in EN)EN[k].hp*=300000;EN.dragon.hp=40000000000;
async function spawnEnt(type,n,f){const spec=EN[type],a=await load(spec.a);if(!a)return null;
const holder=inst(a,spec.h,{ownMat:true}),root=new THREE.Group();root.add(holder);S.world.add(root);
const m=mkActs(holder,a.anims,a.clips||MON);const e={type,spec,root,holder,mx:m.mx,acts:m.acts,cur:'',n:n.clone(),f:f.clone(),hp:spec.hp,mhp:spec.hp,state:'idle',t:0,cd:1+Math.random(),stun:0,flash:0,lift:spec.fly,decal:null,boss:type==='dragon',bob:Math.random()*6,home:n.clone()};
if(a.anims.length&&!e.acts.idle&&e.acts.fly)e.acts.idle=e.acts.fly;play(e,spec.fly?'fly':'idle',0);S.ents.push(e);orient(root,e.n,e.f,e.lift);return e;}
function faceTo(e,t,rate,dt){const d=dirTo(e.n,t);if(d)turnToward(e.f,d,e.n,rate*dt);}
function updateEnt(e,dt){const sp=e.spec;e.bob+=dt*3;if(e.auras&&e.state!=='dead'){const ak=0.3+0.1*Math.sin(S.t*2.4);for(const o of e.auras)o.material.opacity=ak;}
for(const m of e.holder.userData.mats)m.emissive.setHex(e.flash>0?0xaa3010:(e.state==='wind'&&Math.floor(S.t*16)%2?0x551100:(e.boss?0x050206:0)));e.flash=Math.max(0,e.flash-dt);
if(e.kbR>0.001&&e.state!=='dead'){const st=e.kbR*(1-Math.exp(-dt*11));e.kbR-=st;moveAlong(e.n,e.kbDir.clone(),st,[e.f]);}
if(e.sq>0&&e.state!=='dead'){e.sq=Math.max(0,e.sq-dt);const s=Math.sin(e.sq/0.2*PI);e.root.scale.set(1+0.1*s,1-0.11*s,1+0.1*s);}
if(e.state==='dead'&&e.exec){const x=e.exec;x.t+=dt;if(x.t<0){e.holder.rotation.set(0,0,0);orient(e.root,e.n,e.f,e.lift*0.4);return;}if(!x.s){x.s=1;sparkFx(e.n,e.lift+e.spec.h*0.5,0xffc070,16,8,0.5,3);ringBurst(e.n,0.4,3.2,0xff8a3a,0.4,0.3);}moveAlong(e.n,x.f.clone(),20*dt*Math.max(0.15,1-x.t),[e.f]);orient(e.root,e.n,e.f,e.lift*0.4+Math.sin(Math.min(1,x.t/0.7)*PI)*2.6);e.holder.rotation.set(x.t*9,x.t*13,0);
if(x.t>0.7&&!x.b){x.b=true;sparkFx(e.n,e.lift+e.spec.h*0.5,0xffa050,34,10,0.7,3.6);ringBurst(e.n,0.4,4.2,0xffb060,0.45,0.3);ringBurst(e.n,0.2,2.4,0xffffff,0.3,0.3);glowBall(e.n,e.lift+e.spec.h*0.5,0.8,0xffd08a,0.35,4);shake(0.14);sfx('boom');S.world.remove(e.root);e.gone=true;}return;}
if(e.state==='dead'&&e.boss){e.t+=dt;if(e.t>0.7){if(!e.dz)bossDissolveInit(e);if(!e.gone&&bossDissolveTick(e,dt)){S.world.remove(e.root);e.gone=true;bossChestStart(e);}}orient(e.root,e.n,e.f,e.lift*0.4);return;}
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
if(!b.awake){if(!b.intro){b.intro=1;b.mhpF=b.mhp;b.hp=1;b.invul=true;b.fxT=0;$('bossBar').hidden=false;toast('드래곤이 힘을 모으고 있어요!',2800);}
b.t+=dt;const IN=10;b.hp=Math.max(1,b.mhpF*Math.min(1,b.t/IN));b.fxT-=dt;if(b.fxT<=0){b.fxT=0.6;ringBurst(b.n,0.6,5+b.t,0xff3a2a,0.55,b.lift*0.5);if(b.t>2)shake(0.06);}
if(b.t>IN&&!S.dead){b.awake=true;b.invul=false;b.hp=b.mhpF;sfx('roar');shake(0.5);ringBurst(b.n,1,14,0xff3a2a,0.8,0.3);b.pat=null;b.t=0;toast('Lv.100 하늘의 폭군 드래곤',2000);b.wait=0.8;}orient(b.root,b.n,b.f,b.lift+Math.sin(b.bob)*0.15);return;}
if(S.dead){b.pat=null;faceTo(b,pl.n,2,dt);orient(b.root,b.n,b.f,b.lift+Math.sin(b.bob)*0.15);return;}
if(b.hp<=b.mhp*0.5&&!b.p2){b.p2=true;b.pi=-1;b.pat=null;b.tr=TR2;b.trT=0;b.hp0=b.hp;b.invul=true;b.vol=0;toast('2페이즈 돌입!',2400);sfx('boom');ringBurst(b.n,1,12,0xff5a3a,0.8,0.3);p2Stage();$('bossName').textContent='하늘의 폭군 드래곤 · 2페이즈';}
if(b.tr>0){b.tr-=dt;b.trT+=dt;faceTo(b,pl.n,2,dt);play(b,'fly',0.2,false,0.7);b.lift=sp.fly+0.6*Math.sin(Math.min(1,b.trT/1.2)*PI/2)+Math.sin(b.bob)*0.1;b.hp=Math.min(b.mhp,b.hp0+(b.mhp-b.hp0)*Math.min(1,b.trT/(TR2-0.4)));
b.cfx=(b.cfx||0)-dt;if(b.cfx<=0){b.cfx=0.12;const k=Math.min(1,b.trT/TR2);ringBurst(b.n,0.5+k*0.5,7-4*k,0xff6a3a,0.3,b.lift);sparkFx(b.n,b.lift,0xffa060,4,6,0.4,2);}shake(0.05+0.08*Math.min(1,b.trT/TR2));
if(b.tr<=0){b.invul=false;b.wait=0.8;b.holder.userData.mats.forEach(m=>{if(m.color)m.color.lerp(new THREE.Color(0xc89098),0.35);});ringBurst(b.n,1,16,0xff3a2a,0.8,0.3);ringBurst(b.n,0.5,9,0xffd27a,0.6,0.4);sfx('boom');shake(0.5);toast('드래곤이 폭주했어요!',2200);}
orient(b.root,b.n,b.f,b.lift);return;}
b.lift=sp.fly+Math.sin(b.bob)*0.2;
if(!b.pat){b.wait-=dt;faceTo(b,pl.n,4,dt);play(b,'fly',0.2,false,b.p2?1.3:1);
const ideal=8.5;if(d>ideal+2)moveAlong(b.n,b.f.clone(),sp.spd*dt,[b.f]);else if(d<ideal-3)moveAlong(b.n,b.f.clone().negate(),sp.spd*0.8*dt,[b.f]);
else{const side=V3(0,0,0).crossVectors(b.n,b.f);moveAlong(b.n,side.multiplyScalar(b.side||1),1.4*dt,[b.f]);}
if(b.wait<=0){const opts=b.p2?['meteor','fire','charge','wave']:['fire','charge','wave'];b.pi=((b.pi==null?-1:b.pi)+1)%opts.length;const p=opts[b.pi];b.last=p;b.pat=p;b.pt=0;b.fired=0;b.side=Math.random()<0.5?-1:1;}}
else{b.pt+=dt;const p=b.pat,pt=b.pt;
if(p==='fire'){faceTo(b,pl.n,6,dt);if(pt<0.1&&!b.pa){b.pa=true;play(b,'atk',0.1,true);}
{const NV=b.p2?14:10;while((b.vol||0)<NV&&pt>=1.0+(b.vol||0)*0.07){b.vol=(b.vol||0)+1;const base=dirTo(b.n,pl.n)||b.f;const f=base.clone().applyAxisAngle(b.n,(Math.random()-0.5)*0.2);spawnProj({n:b.n.clone(),f,spd:15,lift:1.4,rad:0.5,dmg:14,color:0xff7a3a,from:'enemy',life:2.4});sfx('fire');}
if(pt>=1.0+NV*0.07+0.8)endPat(b);}}
else if(p==='slam'){faceTo(b,pl.n,3,dt);if(!b.fired){b.fired=1;const cnt=b.p2?3:1;for(let i=0;i<cnt;i++){setTimeout(()=>{if(b.state==='dead'||S.dead||!S.running)return;const tn=pl.n.clone();play(b,'atk',0.1,true);decalRing(tn,3.7,0xff4a4a,1.15,()=>{ringBurst(tn,0.5,4.3,0xff7a3a,0.5,0.25);glowBall(tn,1,1.3,0xffc08a,0.4,2.5);sfx('boom');if(arc(tn,pl.n)<3.7)hurt(28,tn,1.8);});},i*650);}}
if(pt>=(b.p2?2.7:1.9))endPat(b);}
else if(p==='charge'){if(pt<1.0){if(pt<0.8){const tp=pl.n.clone();faceTo(b,tp,14,dt);}if(!b.strip){b.dirL=null;b.strip=decalStrip(b.n,b.f.clone(),40,2.6,0xff4a4a,1.0);}
if(b.strip){b.strip.g.visible=true;const fl=b.f.clone();orient(b.strip.g,b.n,fl,0.16);let el=0;for(let t=0.5;t<S.Z.L*2+8;t+=0.5){const q=b.n.clone().addScaledVector(fl,t/R).normalize();el=t;if(arc(q,S.cN)>=S.Z.L+0.2)break;}b.strip.g.scale.set(1,1,el/40);}}
else if(!b.cend&&pt<3.2){if(b.strip){b.strip.cancel=true;b.strip=null;b.lift=0.5;}if(!b.cdir){b.cdir=b.f.clone();b.hit=false;}moveAlong(b.n,b.cdir.clone(),50*dt,[b.f,b.cdir]);b.f.copy(b.cdir);if(arc(b.n,S.cN)>=S.Z.L-1.15){b.cend=true;b.rt0=pt;}if(!b.hit&&arc(b.n,pl.n)<sp.rad+0.6){b.hit=true;hurt(30,b.n,2);}
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
function waveTick(dt){for(let i=S.waves.length-1;i>=0;i--){const w=S.waves[i];w.pr=w.r;w.r+=24*dt;w.g.scale.set(w.r,1+Math.min(0.5,w.r/60),w.r);{const fa=Math.max(0.15,1-w.r/(S.Z.L*2+6));if(w.wl){w.wl.material.opacity=0.55*fa;w.w2.material.opacity=0.7*fa;w.rg.material.opacity=fa;}if((w.k=(w.k||0)+1)%2===0&&S.fxs.length<200){const a2=Math.random()*PI*2,ax=any(w.c),bx=V3(0,0,0).crossVectors(w.c,ax).normalize(),pp=w.c.clone().addScaledVector(ax,Math.cos(a2)*w.r/R).addScaledVector(bx,Math.sin(a2)*w.r/R).normalize();sparkFx(pp,0.3,0xffa040,2,3,0.35,2);}}
if(!w.hit&&!S.dead&&arc(w.c,pl.n)>=(w.pr||0)-0.6&&arc(w.c,pl.n)<=w.r+0.6){w.hit=true;if(pl.jy<0.75&&pl.roll<=0)hurt(24,w.c,1.2);}
if(w.r>S.Z.L*2+4){S.world.remove(w.g);S.waves.splice(i,1);}}}
function novaRing(b,off){const N=14;for(let i=0;i<N;i++){if(i%7===3||i%7===4)continue;const f=b.f.clone().applyAxisAngle(b.n,i*2*PI/N+off);spawnProj({n:b.n.clone(),f,spd:9,lift:1.0,rad:0.5,dmg:14,color:0xffb04a,from:'enemy',life:3});}sfx('fire');}
function p2Stage(){const c=new THREE.Color(0x3a0c14);scene.background=c;scene.fog=new THREE.Fog(c,24,84);if(S.hemi){S.hemi.color.setHex(0xff7a5a);S.hemi.groundColor.setHex(0x40101a);S.hemi.intensity=1.0;}if(S.sun){S.sun.color.setHex(0xff8a5a);S.sun.intensity=1.2;}if(S.floor&&S.floor.material.color)S.floor.material.color.setHex(0xff8a7a);
S.world.traverse(m=>{if(m.isMesh&&m!==S.floor&&m.material&&m.material.emissive&&!m.userData.isOutline&&m.parent&&m.parent.type==='Group'&&!S.ents.some(e=>e.holder&&m.parent===e.holder)){}});
const rm=new THREE.MeshBasicMaterial({color:0xff3a1a,transparent:true,opacity:0.0,side:THREE.DoubleSide,depthWrite:false,fog:false}),rg=new THREE.Mesh(new THREE.RingGeometry(S.Z.L-0.7,S.Z.L+0.5,96),rm);rg.rotation.x=-PI/2;const gg=new THREE.Group();gg.add(rg);orient(gg,S.cN,any(S.cN),0.12);S.world.add(gg);S.p2ring=rm;
for(let i=0;i<24;i++){const a=i*PI/12,n=pointAt(S.cN,S.Z.L,a);const fm=new THREE.MeshBasicMaterial({color:0xff6a2a,transparent:true,opacity:0.8,fog:false,depthWrite:false}),fl=new THREE.Mesh(new THREE.ConeGeometry(0.5,2.4,6),fm);const g2=new THREE.Group();fl.position.y=1.2;g2.add(fl);orient(g2,n,any(n),0);S.world.add(g2);addFx(g2,600,k=>{const t=S.t*6+i;fl.scale.set(1+0.2*Math.sin(t),1+0.35*Math.sin(t*1.7),1+0.2*Math.sin(t));fm.opacity=0.7+0.2*Math.sin(t*1.3);});}
addFx(gg,600,k=>{rm.opacity=0.35+0.2*Math.sin(S.t*5);});}
const BPAL=['#ff4d4d','#ff9a3d','#ffd93d','#9be24a','#3fd37a','#35d0d0','#3d9bff','#6a6aff','#b36aff','#ff6ad0'];
function bossBarUpd(b){const f=Math.max(0,b.hp/b.mhp),fl=$('bossFill'),bar=fl.parentNode;if(!b.p2){fl.style.width=f*100+'%';fl.style.background='';bar.style.background='';$('bossX').textContent=Math.ceil(f*100-1e-6)+'%';return;}
const L=Math.max(1,Math.ceil(f*100-1e-6)),w=f*100-(L-1);fl.style.width=(f<=0?0:Math.min(100,w*100))+'%';fl.style.background=BPAL[(L-1)%10];bar.style.background=L>1?BPAL[(L-2)%10]:'';$('bossX').textContent='x'+L;}
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
const world=new THREE.Group();scene.add(world);S.world=world;document.querySelectorAll('.npcn').forEach(x=>x.remove());S.ents=[];S.projs=[];S.fxs=[];S.decals=[];S.solids=[];S.plats=[];S.vill=null;S.portals=[];S.npcs=[];S.occ=[];S.wells=[];S.mixers=[];S.waves=[];S.drops=[];S.lock=null;S.boss=null;S.chest=null;
scene.background=new THREE.Color(Z.sky);scene.fog=new THREE.Fog(lin(Z.sky),Z.night?18:28,Z.night?62:85);
S.hemi=new THREE.HemisphereLight(Z.hemi[0],Z.hemi[1],Z.hemi[2]);world.add(S.hemi);
const sun=new THREE.DirectionalLight(Z.night?0xb8a8ff:0xfff4e0,Z.sun);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);const sc=sun.shadow.camera;sc.left=-16;sc.right=16;sc.top=16;sc.bottom=-16;sc.near=1;sc.far=60;sun.shadow.bias=-0.0008;world.add(sun);world.add(sun.target);S.sun=sun;
const pg=W.planetGeo();const pl_=new THREE.Mesh(pg,new THREE.MeshToonMaterial({map:W.floorTex(name)}));pl_.position.set(0,0,0);pl_.receiveShadow=true;world.add(pl_);S.floor=pl_;
const put=(a,h,n,spin)=>{const o=inst(a,h);const f=any(n).applyAxisAngle(n,spin||0);orient(o,n,f,0);world.add(o);return o;};
const A=k=>W.cache[k]?W.cache[k].__a:null;
const cN=toN(Z.center[0],Z.center[1]);S.cN=cN;
if(Z.village2&&window.buildVillage){const VV=buildVillage(world);S.vill=VV;S.plats=VV.plats;const SQ=0.70710678;for(const s of VV.solids){const wx=-SQ*(s.xl+s.zl),wz=SQ*(s.xl-s.zl);S.solids.push({n:toN(Math.hypot(wx,wz)/26,Math.atan2(wx,wz)),r:s.r});}
scene.background=skyTex();scene.fog=new THREE.Fog(0xcfe6f3,95,340);
const ck=cloudTex();for(let i=0;i<10;i++){const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:ck,transparent:true,depthWrite:false,fog:false,opacity:0.95}));const xl=-170+i*38+((i*37)%19),zl=170+((i*53)%50),y=55+((i*29)%45),wx=-SQ*(xl+zl),wz=SQ*(xl-zl);sp.position.set(wx,y,wz);const sc=55+((i*17)%35);sp.scale.set(sc,sc*0.4,1);world.add(sp);}}
const get=async k=>await load(k);
const TREE=/^(tree|pine|autumn|birch|willow)/,OCC=/^(column|inn|house|cottage|statue|stall|cart|wagon|tree|pine|autumn|birch|willow)/;const pnAll=(Z.portals||[]).map(p=>toN(p.th,p.ph));
for(const [k,h,th,ph,sp] of Z.items){if(k==='tree1'&&th>0.9)continue;const a=await get(k);if(!a)continue;let n=toN(th,ph);
if(name==='field'&&TREE.test(k)&&arc(cN,n)<Z.L*0.8){const d=dirTo(cN,n);if(d){const ref=dirTo(cN,pointAt(cN,1,0)),cr=V3(0,0,0).crossVectors(cN,ref),bearing=Math.atan2(d.dot(cr),d.dot(ref));n=pointAt(cN,Z.L*(0.88+((sp||0)*0.03)),bearing);if(pnAll.some(p=>arc(p,n)<7))continue;}}const po=put(a,h,n,sp);if(OCC.test(k))S.occ.push({o:po,n:n.clone(),hh:h,r:(SOLID[k]||0.9)+0.5,a:1});const r=SOLID[k];if(r){S.solids.push({n,r});if(SOLID_X[k]){const f=any(n).applyAxisAngle(n,sp||0);for(const [d] of SOLID_X[k])S.solids.push({n:n.clone().addScaledVector(f,d/R).normalize(),r:r-0.3});}}}
const rd=rnd(name.length*97+11);
for(const [k,h,cnt] of Z.scatter){const a=await get(k);if(!a)continue;for(let i=0;i<cnt*2;i++){const n=pointAt(cN,Math.sqrt(rd())*Z.L*0.95,rd()*PI*2);if(onPath(name,n))continue;put(a,h*(0.8+rd()*0.5),n,rd()*6);}}
/* 경계 장식 */
if(Z.ring&&Z.ring.length){const RH={brocks:1,bbush:1.1,btree4:5,rock:1,bush:.8,pine:5,tree1:4.6};const cnt=Math.floor(2*PI*Z.L/(Z.ringGap||2.4));const pn=(Z.portals||[]).map(p=>toN(p.th,p.ph));
for(let i=0;i<cnt;i++){const n=pointAt(cN,Z.L+0.6,i*2*PI/cnt+rd()*0.1);if(pn.some(p=>arc(p,n)<4))continue;const k=Z.ring[i%Z.ring.length],a=await get(k);if(a)put(a,RH[k]||1,n,rd()*6);}}
/* NPC, 우물, 포탈 */
for(const nc of (Z.npcs||[])){const a=await get(nc.k);if(!a)continue;const n=toN(nc.th,nc.ph),h=inst(a,nc.h,{ownMat:true,tint:nc.tint,tintAmt:0.55});const nlift=nc.face?groundAtLocal(S.plats,nc.face[0],nc.face[1]):0;nc.lift=nlift;const nfd=nc.face?dirTo(n,cN):null;orient(h,n,nfd||any(n).applyAxisAngle(n,nc.spin||0),nlift);world.add(h);const m=mkActs(h,a.anims,{c:nc.clip});if(m.acts.c)m.acts.c.play();S.npcs.push(npcFx(h,n,nc));}
for(const w of (Z.wells||[]))S.wells.push(toN(w.th,w.ph));
for(const p of (Z.portals||[]))S.portals.push(makePortal(Object.assign({locked:!!p.needKills&&S.kills<p.needKills},p)));
/* 몬스터 */
S.rsT=10;if(Z.spawns){const farP=c=>!S.portals.some(p=>arc(p.n,c)<15)&&!S.solids.some(o=>arc(o.n,c)<o.r+1.2)&&arc(c,pl.n)>=11;for(const [t,th,ph] of Z.spawns){let n=toN(th,ph);if(!farP(n)){for(let k=0;k<400;k++){const c=pointAt(S.cN,Math.sqrt(Math.random())*Z.L*0.72,Math.random()*PI*2);if(farP(c)&&!S.ents.some(e=>arc(e.n,c)<3.5)){n=c;break;}}}await spawnEnt(t,n,any(n).applyAxisAngle(n,Math.random()*6));}
for(let ex=0,tr=0;ex<8&&tr<400;tr++){const c=pointAt(S.cN,Math.sqrt(Math.random())*Z.L*0.72,Math.random()*PI*2);if(!farP(c))continue;if(S.ents.some(e=>arc(e.n,c)<3.5))continue;ex++;await spawnEnt('alien',c,any(c).applyAxisAngle(c,Math.random()*6));}}
if(name==='boss'){const n=toN(0.42,PI);const b=await spawnEnt('dragon',n,dirTo(n,toN(0,0))||any(n));if(b){b.awake=false;b.t=0;b.wait=1;b.p2=false;$('bossName').textContent='하늘의 폭군 드래곤';S.boss=b;b.lift=EN.dragon.fly;S.lock=b;bossPower(b);}}
if(S.world&&pl.ref){world.add(pl.ref.root);S.mixers.push(pl.ref.mx);}
if(Z.night){const st=new THREE.Group();const sg=new THREE.SphereGeometry(0.14,6,6),sm=new THREE.MeshBasicMaterial({color:0xfff6c8,fog:false});for(let i=0;i<160;i++){const s=new THREE.Mesh(sg,sm);const a=rd()*PI*2,b=0.05+rd()*1.2;s.position.set(Math.cos(a)*95*Math.cos(b),8+Math.sin(b)*70,Math.sin(a)*95*Math.cos(b)-20);st.add(s);}world.add(st);
const fire=new THREE.PointLight(0xff5a3a,2.4,34);fire.position.copy(wp(cN,7));world.add(fire);}
$('zoneName').textContent=Z.n;$('zoneTag').textContent=Z.safe?'안전 지역':Z.night?'보스 지역':'사냥터';logPush('['+Z.n+'] 에 입장했습니다.','#ffe27a');updateQuest();$('bossBar').hidden=true;}
const LTIPS=['방향키를 두 번 빠르게 누르면 대쉬해요.','C로 구르면 잠깐 무적이 돼요. 보스의 공격을 피해보세요!','Space로 점프! 보스가 쏘는 파동은 점프로 넘을 수 있어요.','마을 우물에서 F를 누르면 체력이 가득 차요.','NPC 가까이 가서 F를 누르면 대화할 수 있어요.','몬스터를 처치하면 플래톤과 경험치 구슬이 떨어져요. 가까이 가면 천천히 끌려와요.','필드에서 몬스터를 잡아야 보스 스테이지 문이 열려요.','마우스 휠로 화면을 확대·축소할 수 있어요.','카메라 버튼(F5)으로 쿼터뷰, 자동, 마우스 조작을 바꿔요.','스킬 아이콘 모서리의 글자가 단축키예요.','치명타가 터지면 데미지 숫자가 크게 떠요!','오른쪽 아이콘에서 조작법, 소리, 직업을 바꿀 수 있어요.','보스는 체력이 절반이 되면 더 강해져요. 조심하세요!'];
let LOADT=null;
function loadShow(){const v=$('loadv'),tp=$('loadTip');tp.innerHTML='<b>TIP :</b>'+LTIPS[Math.floor(Math.random()*LTIPS.length)];const lbar=$('loadBar');lbar.style.animation='none';void lbar.offsetWidth;lbar.style.animation='lbfill 3s cubic-bezier(.25,.55,.35,1) forwards';v.classList.add('show');void v.offsetWidth;v.classList.add('in');const t0=performance.now();let k=0;clearInterval(LOADT);LOADT=setInterval(()=>{k=(k+1)%4;$('loadTx').textContent='로딩중'+'.'.repeat(k);},420);return t0;}
function loadHide(){const v=$('loadv');v.classList.remove('in');setTimeout(()=>{v.classList.remove('show');clearInterval(LOADT);},200);}
async function goZone(name,instant){if(S.switching)return;S.switching=true;const f=$('fade');let t0=0,prog=0,tick=null;if(!instant){t0=loadShow();tick=null;await new Promise(r=>setTimeout(r,220));}
if(S.running)sfx('portal');await buildZone(name);
if(name==='boss'){if(S.prevCam==null)S.prevCam=S.camMode;S.camMode=0;S.camAuto=true;S.quarter=false;const el=$('camMode');if(el){el.textContent=CAMTXT[0];el.classList.add('on');clearTimeout(S._camT);S._camT=setTimeout(()=>el.classList.remove('on'),2600);}}else if(S.prevCam!=null){S.camMode=S.prevCam;S.camAuto=S.camMode===0;S.quarter=S.camMode===2;S.prevCam=null;}
endSpin();pl.n.set(0,1,0);pl.f.set(0,0,-1);pl.cf.set(0,0,-1);pl.gy=0;pl.jy=0;pl.vy=0;if(name==='village'&&S.cN){const dc=dirTo(pl.n,S.cN);if(dc){pl.f.copy(dc);pl.cf.copy(dc);}}pl.roll=0;pl.atkT=0;pl.inv=0.8;if(pl.ref){pl.ref.tumble.rotation.x=0;pl.ref.cur='';play(pl.ref,'idle',0);}
S.snap=true;S.dead=false;if(name!=='boss')S.bossDead=S.bossDead;
if(!instant){const raf=()=>new Promise(r=>requestAnimationFrame(r));for(let i=0;i<4;i++)await raf();const rest=3000-(performance.now()-t0);if(rest>0)await new Promise(r=>setTimeout(r,rest));await new Promise(r=>setTimeout(r,250));for(let i=0;i<2;i++)await raf();loadHide();}
bgmZone(name);if(S.running)toast(ZONES[name].n,1400);f.classList.remove('on');S.switching=false;}
function checkPortals(){if(S.switching||S.dead||!S.running)return;for(const p of S.portals){const d=arc(pl.n,p.n);
const locked=p.needKills&&S.kills<p.needKills;p.locked=!!locked;const col=locked?0xff5a5a:0x8fe3ff;p.ring.material.color.setHex(col);p.beam.material.color.setHex(col);p.core.material.color.setHex(col);p.beam.material.opacity=0.16+Math.sin(S.t*3)*0.06;p.ring.rotation.z+=0.01;
if(d<1.7){if(locked){if(S.t-(S.lastLockMsg||0)>2){S.lastLockMsg=S.t;toast('몬스터 '+p.needKills+'마리를 처치하면 열려요 ('+S.kills+'/'+p.needKills+')',2000);}}else{goZone(p.to);return;}}}}

/* ---------- 하단 독: 스킬 아이콘(코드로 그린 SVG) + 체력/스태미나 구슬 ---------- */
const SW=(x,y,r,sc,c)=>`<g transform="translate(${x} ${y}) rotate(${r}) scale(${sc})"><path d="M0-22L3.4-14V8h-6.8V-14z" fill="${c||'#eef7ff'}" stroke="#4a5a7a" stroke-width="1"/><rect x="-8" y="8" width="16" height="3.4" rx="1" fill="#ffd45a" stroke="#7a5518" stroke-width=".8"/><rect x="-2" y="11" width="4" height="8" rx="1.5" fill="#b0763a"/></g>`;
const ICON={meteor:'<circle cx="30" cy="30" r="10" fill="#ff8a3a" stroke="#fff3c8" stroke-width="2"/><circle cx="30" cy="30" r="5" fill="#ffe08a"/><path d="M22 22 L6 7 M25 18 L12 5 M18 26 L4 16" stroke="#ffb36b" stroke-width="3" stroke-linecap="round"/><path d="M38 40 L44 44" stroke="#ff6a2a" stroke-width="3" stroke-linecap="round"/>',
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
const BG={bAtk:['#6a8cff','#2a3d9a'],bSkill:['#ffa84a','#a8481f'],bS1:['#ff7a4a','#a02a1f'],bS2:['#ffd05a','#b87a14'],bS3:['#ff9cc0','#a83f78'],bS4:['#6fd0ff','#2a5fb8'],bS5:['#7fa8ff','#3a3fa8'],bJump:['#7ad98a','#2a8a4a'],bRoll:['#c58aff','#6a35b0'],bLock:['#ff8f84','#a82f45'],bP1:['#9fb4ff','#3a4fb8'],bP2:['#5fe0ff','#1f4fb8']};
const KEYS={bAtk:'Z',bSkill:'X',bS1:'A',bS2:'S',bS3:'D',bS4:'Q',bS5:'W',bJump:'␣',bRoll:'C',bLock:'R',bP1:'E',bP2:'V'};
const ICN={bAtk:'atkW',bSkill:'skW',bS1:'wild',bS2:'rise',bS3:'sakura',bS4:'chase',bS5:'rain',bJump:'jump',bRoll:'roll',bLock:'lock',bP1:'counter',bP2:'giga'};
function fitDock(){const d=$('dock');if(!d)return;const w=d.offsetWidth||720,k=Math.max(0.5,Math.min(1,(innerWidth-16)/w));d.style.setProperty('--ds',k.toFixed(3));}
addEventListener('resize',fitDock);setTimeout(fitDock,0);setTimeout(fitDock,800);
function dockSetIcon(id,name){const el=$(id).querySelector('.ic');if(el)el.innerHTML='<svg viewBox="0 0 48 48">'+ICON[name]+'</svg>';}
(function buildDock(){for(const id in ICN){const b=$(id),[c1,c2]=BG[id];b.style.background=`radial-gradient(circle at 30% 25%,${c1},${c2})`;b.innerHTML='<span class="ic"></span><em>'+KEYS[id]+'</em><u class="cdo"></u><u class="cdn"></u>';dockSetIcon(id,ICN[id]);}})();
function setCd(id,cd,max,low){const b=$(id);if(!b._o){b._o=b.querySelector('.cdo');b._n=b.querySelector('.cdn');}const p=cd>0?Math.min(1,cd/max)*100+'%':'0%';if(b._o.style.height!==p)b._o.style.height=p;const t=cd>0?String(Math.ceil(cd)):'';if(b._n.textContent!==t)b._n.textContent=t;b.classList.toggle('low',!!low&&cd<=0);}
/* ---------- HUD, 카메라 ---------- */
function hud(){{if(S._ic!==S.cls){S._ic=S.cls;const w=S.cls==='warrior';dockSetIcon('bAtk',w?'atkW':'atkM');dockSetIcon('bSkill',w?'skW':'skM');dockSetIcon('bS1',w?'wild':'meteor');}
if(S.cls==='warrior'){for(const [id,b] of [['wild','bS1'],['rise','bS2'],['sakura','bS3'],['chase','bS4'],['rain','bS5'],['giga','bP2']]){$(b).hidden=false;setCd(b,pl.cds[id],SKI[id].cd,pl.st<SKI[id].st);}}else{for(const b of['bS2','bS3','bS4','bS5','bP2'])$(b).hidden=true;$('bS1').hidden=false;setCd('bS1',pl.cds.meteor||0,16,pl.st<2200);}setCd('bSkill',pl.skCd,S.cls==='warrior'?7:5,pl.st<30);const bf=$('buff'),bt=pl.god>0?'무적 '+pl.god.toFixed(1)+'초':'';if(bf.textContent!==bt)bf.textContent=bt;}
{const hf=Math.max(0,Math.min(1,pl.hp/pl.mhp)),sf=Math.max(0,Math.min(1,pl.st/pl.mst)),hp=$('hpFill'),sp=$('stFill');hp.setAttribute('y',(128-122*hf).toFixed(1));hp.setAttribute('height',(122*hf).toFixed(1));sp.setAttribute('y',(128-122*sf).toFixed(1));sp.setAttribute('height',(122*sf).toFixed(1));$('hpTxt').textContent=Math.ceil(pl.hp);$('stTxt').textContent=Math.floor(pl.st);}
const b=S.boss;if(b&&(b.awake||b.intro)){bossBarUpd(b);if(b.state==='dead')$('bossBar').hidden=true;}
const lm=$('lockMark'),eh=$('ehp');if(S.lock&&S.lock.state!=='dead'&&S.running){const e=S.lock,s=toScreen(wp(e.n,e.lift+e.spec.h*0.6));if(s.z<1){lm.hidden=false;lm.style.left=s.x+'px';lm.style.top=s.y+'px';
if(!e.boss){const s2=toScreen(wp(e.n,e.lift+e.spec.h+0.5));eh.hidden=false;eh.style.left=s2.x+'px';eh.style.top=s2.y+'px';eh.firstChild.style.width=(e.hp/e.mhp*100)+'%';}else eh.hidden=true;}else{lm.hidden=true;eh.hidden=true;}}else{lm.hidden=true;eh.hidden=true;}}
function updateCamera(dt){S.qk+=((S.quarter?1:0)-S.qk)*Math.min(1,2.6*dt);const q=S.qk,ease=q*q*(3-2*q);
const VZ=S.zone==='village',P=wp(pl.n,(pl.gy||0)+pl.jy*(S.calm?0.12:0.4)),d=(8.4+((VZ?19:19)-8.4)*ease)*(1-0.08*(S.zm||0))*(S.zw||1),ptc=pl.pitch+((VZ?0.36:0.98)-pl.pitch)*ease,back=d*Math.cos(ptc),up=Math.max(0.5,1.1+d*Math.sin(ptc));
S.zm=(S.zm||0)+((S.chgT||0)-(S.zm||0))*Math.min(1,7*dt);const b0=S.calm?48:55,fv=(b0+9)+((VZ?b0+12:b0+2)-(b0+9))*ease-4*S.zm;if(Math.abs(cam.fov-fv)>0.05){cam.fov+=(fv-cam.fov)*Math.min(1,6*dt);cam.updateProjectionMatrix();}
const tgt=P.clone().addScaledVector(pl.cf,-back).addScaledVector(pl.n,up);
if(S.snap){S.camPos.copy(tgt);S.camUp.copy(pl.n);S.snap=false;}
const trans=Math.abs((S.quarter?1:0)-S.qk)>0.02,k=1-Math.exp(-(trans?4.5:S.calm?11:9)*dt);S.camPos.lerp(tgt,k);S.camUp.lerp(pl.n,1-Math.exp(-6*dt)).normalize();
cam.position.copy(S.camPos);cam.up.copy(S.camUp);const look=P.clone().addScaledVector(pl.n,1.4+0.5*(1-ease)+(VZ?3.1*ease:0));
if(S.lock&&S.lock.state!=='dead')look.lerp(wp(S.lock.n,S.lock.lift+1),0.3);
cam.lookAt(look);if(S.noShake)S.shk=0;if(S.shk>0){const a=S.shk;cam.position.x+=(Math.random()-.5)*a*2;cam.position.y+=(Math.random()-.5)*a*2;cam.position.z+=(Math.random()-.5)*a*2;S.shk=Math.max(0,S.shk-dt*0.9);}
const right=V3(0,0,0).crossVectors(pl.cf,pl.n);S.sun.position.copy(P).addScaledVector(pl.n,16).addScaledVector(right,-8).addScaledVector(pl.cf,-3);S.sun.target.position.copy(P);}

/* ---------- 상점 / 인벤토리 / 캐릭터 정보 ---------- */
const WEAPONS=[
{id:'w1',nm:'낡은 검',pr:10000,atk:5,c:['#b9bcc4','#6b4a2a'],ln:'오래 쓴 연습용 검. 가볍고 다루기 쉬워요.'},
{id:'w2',nm:'강철검',pr:120000,atk:15,c:['#cfd6e4','#4a5a7a'],ln:'단단하게 벼려낸 기본 검이에요.'},
{id:'w3',nm:'월광검',pr:1500000,atk:30,c:['#e6f2ff','#3a6aa8'],ln:'달빛처럼 은은하게 빛나는 검이에요.'},
{id:'w4',nm:'블레이즈 소드',pr:12000000,atk:55,c:['#ff9a5a','#a8321f'],ln:'칼날 위로 불꽃이 일렁이는 검이에요.'},
{id:'w5',nm:'묠니르',pr:55000000,atk:90,c:['#ffe86a','#6a4fd8'],ln:'휘두를 때마다 번개가 튀는 검이에요.'},
{id:'w6',nm:'용왕의 대검',pr:180000000,atk:140,c:['#7af0d6','#1f6a8a'],ln:'용왕의 비늘로 만든 전설의 대검이에요.'},
{id:'w7',nm:'엘더 블레이드',pr:300000000,atk:200,c:['#ffd45a','#c03a6a'],ln:'왕관의 보석이 박힌 최고의 블레이드예요.'},
{id:'w8',nm:'엑스칼리버',pr:0,atk:400,myth:true,c:['#fff4b8','#3fa8ff'],ln:'신화 속 성검. 하늘의 폭군을 쓰러뜨린 자에게만 허락돼요.'}];
const WBY={};WEAPONS.forEach((w,i)=>{w.i=i;WBY[w.id]=w;});
const SAVEK='planet-adventure-save-v2';
S.inv=new Array(24).fill(null);S.eq={weapon:null};S.wmul=1;
function saveGame(){}
function loadSave(){S.gold=30000;try{localStorage.removeItem(SAVEK);}catch(e){}}
function bladeSvg(w){const i=w.i,bl=22+i*1.3,bw=3.6+i*0.45,c0=w.c[0],c1=w.c[1],gl=i>=3?`<rect x="${24-bw/2-1.6}" y="${30-bl}" width="${bw+3.2}" height="${bl}" rx="2" fill="${c0}" opacity=".28"/>`:'';
const wing=i>=5?`<path d="M24 30 L11 24 L14 32 Z M24 30 L37 24 L34 32 Z" fill="${c1}" stroke="#fff6" stroke-width=".6"/>`:'';const gem=i>=4?`<circle cx="24" cy="30.5" r="2.2" fill="${c0}" stroke="#fff" stroke-width=".7"/>`:'';
return `<svg viewBox="0 0 48 48"><defs><linearGradient id="bg${i}" x1="0" x2="1"><stop offset="0" stop-color="#fff"/><stop offset=".5" stop-color="${c0}"/><stop offset="1" stop-color="${c1}"/></linearGradient></defs><g transform="rotate(45 24 24) translate(0 4)">${gl}${wing}<path d="M${24-bw/2} 30 V${12-i*0.2} L24 ${30-bl-4} L${24+bw/2} ${12-i*0.2} V30Z" fill="url(#bg${i})" stroke="#2a3050" stroke-width="1"/><rect x="${24-9-i*0.4}" y="29.5" width="${18+i*0.8}" height="3.6" rx="1.4" fill="${c1}" stroke="#2a3050" stroke-width=".8"/>${gem}<rect x="22.4" y="33" width="3.2" height="9" rx="1.2" fill="#7a4a24" stroke="#2a3050" stroke-width=".7"/><circle cx="24" cy="43" r="2" fill="${c1}" stroke="#2a3050" stroke-width=".7"/></g></svg>`;}
const fmt=n=>(n||0).toLocaleString('en-US');
function recalcWeapon(){const w=WBY[S.eq.weapon];S.wmul=1+(w?w.atk/100:0);tintWeapon(w);}
function tintWeapon(w){try{const rw=pl.ref&&pl.ref.rw;if(!rw||S.cls!=='warrior')return;rw.traverse(m=>{if(!m.isMesh||m.userData.glow)return;const arr=Array.isArray(m.material)?m.material:[m.material];arr.forEach((x,k)=>{if(!x||!x.color)return;if(!x.userData.wt){const y=x.clone();y.userData.wt=1;y.userData.oc=x.color.clone();if(Array.isArray(m.material))m.material[k]=y;else m.material=y;x=y;}x.color.copy(x.userData.oc);if(x.emissive)x.emissive.setHex(x.userData.mo||0);if(w){x.color.lerp(new THREE.Color(w.c[0]),0.65);if(w.i>=3&&x.emissive){x.emissive.set(w.c[0]);x.emissiveIntensity=0.08+w.i*0.035;}}});});}catch(e){console.warn('tint',e);}}
const WIN=['wShop','wInv','wChar'];let WZ=60,SELL=null;
function winOpen(id){const w=$(id);if(!w.hidden)return;w.hidden=false;w.style.zIndex=++WZ;renderWin(id);sfx('ui');}
function winClose(id){const w=$(id);if(w.hidden)return;w.hidden=true;if(id==='wShop')S.shopOpen=false;sfx('ui');}
function winToggle(id){$(id).hidden?winOpen(id):winClose(id);}
function winTop(){let b=null,z=-1;for(const id of WIN){const w=$(id);if(!w.hidden&&(+w.style.zIndex||0)>z){z=+w.style.zIndex||0;b=id;}}return b;}
function renderWin(id){if(id==='wShop')renderShop();else if(id==='wInv')renderInv();else renderChar();}
function renderAll(){for(const id of WIN)if(!$(id).hidden)renderWin(id);lootHud();}
function itTip(ev,w,extra){const t=$('itTip');if(!w){t.hidden=true;return;}t.innerHTML=`<b>${w.nm}</b><i>${w.myth?'신화 ':''}블레이드 · 공격력 +${w.atk}%</i><span>${w.ln}</span>${extra?`<em>${extra}</em>`:''}`;t.hidden=false;const x=Math.min(innerWidth-250,ev.clientX+16),y=Math.min(innerHeight-130,ev.clientY+14);t.style.left=x+'px';t.style.top=y+'px';}
function slotEl(w,cnt){const d=document.createElement('div');d.className='slot'+(w?' has':'');if(w){d.innerHTML=bladeSvg(w);}return d;}
function renderShop(){const g=$('shopGrid');g.innerHTML='';WEAPONS.filter(w=>!w.myth).forEach(w=>{const d=document.createElement('div');d.className='sitem'+(SELL===w.id?' sel':'')+((S.gold||0)<w.pr?' poor':'');d.innerHTML=`<div class="slot has">${bladeSvg(w)}</div><div class="sn"><b>${w.nm}</b><span>공격력 +${w.atk}%</span><em>${fmt(w.pr)} 플래톤</em></div>`;d.onclick=()=>{SELL=w.id;sfx('ui');renderShop();};d.ondblclick=()=>buyItem(w.id);d.onmousemove=ev=>itTip(ev,w);d.onmouseleave=()=>itTip(null);g.appendChild(d);});
const w=WBY[SELL];$('shopInfo').innerHTML=w?`<b>${w.nm}</b> · ${fmt(w.pr)} 플래톤`:'살 물건을 눌러 선택하세요. (더블클릭하면 바로 구매)';$('shopBuy').disabled=!w;$('shopGold').textContent=fmt(S.gold)+' 플래톤';}
function buyItem(id){const w=WBY[id];if(!w)return;if((S.gold||0)<w.pr){toast('플래톤이 부족해요',1200);sfx('hurt');return;}const k=S.inv.indexOf(null);if(k<0){toast('인벤토리가 가득 찼어요',1200);sfx('hurt');return;}S.gold-=w.pr;S.inv[k]=id;sfx('coin');sfx('clink');toast(w.nm+' 구매!',1200);logPush&&logPush(w.nm+' 구매 (-'+fmt(w.pr)+')');saveGame();renderAll();}
function renderInv(){const g=$('invGrid');g.innerHTML='';S.inv.forEach((id,i)=>{const w=WBY[id],d=slotEl(w);if(w){d.onmousemove=ev=>itTip(ev,w);d.onmouseleave=()=>itTip(null);d.oncontextmenu=ev=>{ev.preventDefault();itTip(null);equipFrom(i);};d.ondblclick=()=>{itTip(null);equipFrom(i);};}g.appendChild(d);});$('invGold').textContent=fmt(S.gold);}
function equipFrom(i){const id=S.inv[i],w=WBY[id];if(!w)return;if(S.cls!=='warrior'){toast('전사만 블레이드를 장착할 수 있어요',1400);sfx('hurt');return;}const cur=S.eq.weapon;S.eq.weapon=id;S.inv[i]=cur||null;recalcWeapon();sfx('clink');toast(w.nm+' 장착',1000);saveGame();renderAll();}
function unequip(){const id=S.eq.weapon;if(!id)return;const k=S.inv.indexOf(null);if(k<0){toast('인벤토리가 가득 찼어요',1200);return;}S.inv[k]=id;S.eq.weapon=null;recalcWeapon();sfx('clink');saveGame();renderAll();}
function renderChar(){const w=WBY[S.eq.weapon],e=$('eqWeapon');e.innerHTML='';e.className='slot eq'+(w?' has':'');if(w){e.innerHTML=bladeSvg(w);e.onmousemove=ev=>itTip(ev,w);e.onmouseleave=()=>itTip(null);e.oncontextmenu=ev=>{ev.preventDefault();itTip(null);unequip();};}else{e.onmousemove=null;e.oncontextmenu=null;}
const cls=S.cls==='warrior'?'전사':'마법사';$('chStats').innerHTML=[['직업',cls],['레벨','99'],['HP',fmt(pl.mhp)],['SP',fmt(pl.mst)],['무기',w?w.nm:'없음'],['무기 공격력','+'+(w?w.atk:0)+'%'],['최종 데미지','×'+S.wmul.toFixed(2)],['EXP','100.00% (MAX)'],['플래톤',fmt(S.gold)]].map(r=>`<div><i>${r[0]}</i><b>${r[1]}</b></div>`).join('');
try{if(pl.ref){const cv=snapChar(pl.ref.root,pl.f,-0.35,260,330,1.3,1.18),t=$('chPrev'),x=t.getContext('2d');x.clearRect(0,0,t.width,t.height);x.drawImage(cv,0,0,t.width,t.height);}}catch(er){console.warn('prev',er);}$('chNm').textContent=cls+' Lv.99';}
for(const id of WIN){const w=$(id);w.addEventListener('pointerdown',ev=>{ev.stopPropagation();w.style.zIndex=++WZ;});w.addEventListener('contextmenu',ev=>ev.preventDefault());const h=w.querySelector('.wh');let dr=null;h.addEventListener('pointerdown',ev=>{if(ev.target.closest('.wx'))return;dr={x:ev.clientX-w.offsetLeft,y:ev.clientY-w.offsetTop};h.setPointerCapture(ev.pointerId);});h.addEventListener('pointermove',ev=>{if(!dr)return;w.style.left=Math.max(0,Math.min(innerWidth-80,ev.clientX-dr.x))+'px';w.style.top=Math.max(0,Math.min(innerHeight-40,ev.clientY-dr.y))+'px';});h.addEventListener('pointerup',()=>{dr=null;});w.querySelector('.wx').onclick=()=>winClose(id);}
$('shopBuy').onclick=()=>{if(SELL)buyItem(SELL);};
$('btnInv').onclick=()=>winToggle('wInv');$('btnChar').onclick=()=>winToggle('wChar');
function openShop(){S.shopOpen=true;winOpen('wShop');winOpen('wInv');}
loadSave();recalcWeapon();try{lootHud();}catch(e){}setInterval(saveGame,4000);addEventListener('beforeunload',saveGame);

/* ---------- 입력 ---------- */
const DT={last:{},run:false,clr:0,dash:false};
addEventListener('keydown',e=>{if(!S.running){return;}if(!S.dlg&&!e.repeat&&!e.ctrlKey&&!e.metaKey&&!e.altKey){if(e.code==='KeyA'&&S.cls==='mage'){e.preventDefault();castMeteor();return;}if(e.code==='KeyI'){e.preventDefault();winToggle('wInv');return;}if(e.code==='KeyU'){e.preventDefault();winToggle('wChar');return;}if(e.code==='Escape'){const t=winTop();if(t){e.preventDefault();winClose(t);return;}}}if(S.dlg){if(e.code==='Enter'||e.code==='Space'||e.code==='KeyF'||e.code==='NumpadEnter'){e.preventDefault();dlgNext();}else if(e.code==='Escape'){e.preventDefault();dlgClose();}return;}if(!e.repeat&&e.code.startsWith('Arrow')){const n=performance.now();if(n-(DT.last[e.code]||-1e9)<320){if(e.code==='ArrowDown'&&pl.jy>0.05)pl.ff=1;else{DT.run=true;DT.dash=true;}}DT.last[e.code]=n;}K[e.code]=true;
if(e.code==='F5'){e.preventDefault();toggleCam();return;}if(e.code==='Space'){e.preventDefault();tryJump();}else if(e.code==='KeyC'){e.preventDefault();tryRoll();}else if(e.code==='KeyZ')startAtk('atk');else if(e.code==='KeyA')startSkill('wild');else if(e.code==='KeyS')startSkill('rise');else if(e.code==='KeyD')startSkill('sakura');else if(e.code==='KeyQ')startSkill('chase');else if(e.code==='KeyH')$('btnHelp').click();else if(e.code==='KeyW')startSkill('rain');else if(e.code==='KeyX')startAtk('skill');else if(e.code==='KeyE')startParry();else if(e.code==='KeyV')startSkill('giga');
else if(e.code==='Tab'||e.code==='KeyR'){e.preventDefault();toggleLock();}else if(e.code==='KeyF')interact();
else if(e.code.startsWith('Arrow'))e.preventDefault();
});
addEventListener('keyup',e=>{K[e.code]=false;});addEventListener('blur',()=>{DT.run=false;});
addEventListener('blur',()=>{for(const k in K)K[k]=false;S.mouseAtk=false;S.btnAtk=false;});
const st=W.stage;let drag=null;
st.addEventListener('contextmenu',e=>e.preventDefault());
st.addEventListener('wheel',e=>{if(!S.running||S.dlg)return;e.preventDefault();S.zw=Math.max(0.45,Math.min(1.7,(S.zw||1)*Math.exp(e.deltaY*0.0012)));},{passive:false});
$('help').style.display='none';
st.addEventListener('pointerdown',e=>{if(!S.running)return;if(e.pointerType==='touch'){const left=e.clientX<innerWidth*0.5;drag={t:1,x:e.clientX,y:e.clientY,left,id:e.pointerId,ox:e.clientX,oy:e.clientY,moved:0};}else{drag={t:0,x:e.clientX,y:e.clientY,b:e.button,moved:0,id:e.pointerId};if(e.button===0&&S.camAuto){S.mouseAtk=true;startAtk('atk');}}try{st.setPointerCapture(e.pointerId);}catch(_){}});
st.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.moved+=Math.abs(dx)+Math.abs(dy);
if(drag.t===1&&drag.left){joy.x=clamp((e.clientX-drag.ox)/50,-1,1);joy.y=clamp((e.clientY-drag.oy)/50,-1,1);if(Math.hypot(joy.x,joy.y)<0.2){joy.x=joy.y=0;}return;}
if((drag.moved>4||drag.t===1)&&(drag.t===1||!S.camAuto)&&!S.quarter){pl.cf.applyAxisAngle(pl.n,-dx*0.0055);pl.pitch=clamp(pl.pitch-dy*0.004,-0.3,1.45);}drag.x=e.clientX;drag.y=e.clientY;});
const up=e=>{if(!drag||drag.id!==e.pointerId)return;S.mouseAtk=false;if(drag.t===0&&drag.moved<6){if(drag.b===2)startAtk('skill');else if(drag.b===0&&!S.camAuto)startAtk('atk');}if(drag.t===1&&drag.left){joy.x=joy.y=0;}drag=null;};
st.addEventListener('pointerup',up);st.addEventListener('pointercancel',up);
{const b=$('bAtk');b.onpointerdown=e=>{e.preventDefault();S.btnAtk=true;startAtk('atk');};['onpointerup','onpointerleave','onpointercancel'].forEach(k=>b[k]=()=>{S.btnAtk=false;});}$('bSkill').onclick=()=>startAtk('skill');$('bRoll').onclick=()=>tryRoll();$('bJump').onclick=()=>tryJump();$('bLock').onclick=()=>toggleLock();$('bP1').onclick=()=>startParry();for(const [bb,ii] of [['bS1','wild'],['bS2','rise'],['bS3','sakura'],['bS4','chase'],['bS5','rain'],['bP2','giga']])$(bb).onclick=()=>startSkill(ii);
{const TIPS=()=>({bP2:'기간틱 슬래시 (V)\n주변 적을 앞으로 끌어당겨 묶은 뒤 검으로 17번 베고, 마지막에 거대한 검을 내리꽂아요. 마지막 일격에 모든 적이 즉사해요! 보스도 예외 없어요.\n사용 중에는 움직일 수 없고 무적이에요. 스태미나 3000 · 재사용 25초',bP1:'반격 (E)\n검을 휘둘러 보스의 모든 투사체와 파동을 튕겨내요. 쿨타임·소모 없이 무제한! 꾹 누르면 계속 유지돼요.',bAtk:'기본공격 (Z / 마우스 클릭)\n꾹 누르면 연속 공격해요. 1·2·3타로 이어지고 3타가 가장 강해요. 스태미나 소모 없음.',
bSkill:S.cls==='warrior'?'윈드밀 (X)\n3초 동안 회전하며 주변 적을 0.25초마다 베어요. 도는 중에도 이동할 수 있어요.\n사용한 순간부터 5초 동안 무적이에요.\n스태미나 1500 · 재사용 7초':'메테오 (X)\n조준한 곳에 운석을 떨어뜨려 넓은 범위에 큰 피해를 줘요.\n스태미나 1500 · 재사용 5초',
bS1:'앱솔루트 저지먼트 (A)\n시간이 멈춘 듯 1.9초간 힘을 모은 뒤, 점점 커지는 거대한 불꽃 검기를 날려요. 맞은 적은 즉사해요.\n차징 중에는 움직일 수 없고 무적이에요. 스태미나 2250 · 재사용 12초',bS2:'라이징 슬래시 (S)\n베어 올리며 땅에서 거대한 불꽃 검 8자루가 앞뒤로 솟아올라요. 맞은 적은 공중에 떠올라요.\n시전 중 무적이에요. 스태미나 1250 · 재사용 5초',bS3:'발상발파 (D)\n벚꽃잎이 소용돌이치는 가운데 회전하며 5번 베어요. 마지막 일격이 가장 강해요.\n스태미나 1500 · 재사용 9초',bS4:'소드 체이서 (Q)\n허공에 검 45자루를 소환해 소드 레인처럼 1.5초 동안 비처럼 연달아 쏘아요. 날아갈수록 점점 빨라져요! 적이 없으면 앞으로 날아가요.\n스태미나 1700 · 재사용 10초',bS5:'소드 레인 (W)\n조준한 적(없으면 앞쪽) 위로 검 44자루가 비처럼 쏟아져요. 마지막에 거대한 검이 떨어지며 충격파가 터져요.\n스태미나 1600 · 재사용 10초',bJump:'점프 (Space)\n보스의 파동처럼 낮게 깔리는 공격을 넘어가요.',bRoll:'구르기 (C)\n구르는 동안 무적이에요. 스태미나 1100.',bLock:'락온 (Tab / R)\n가까운 적을 조준해요. 다시 누르면 해제돼요.'});
const tip=$('tip');for(const id of ['bAtk','bSkill','bS1','bS2','bS3','bS4','bS5','bJump','bRoll','bLock','bP1','bP2']){const b=$(id);
b.addEventListener('mouseenter',()=>{const ln=(id==='bS1'&&S.cls==='mage'?MTIP:TIPS()[id]).split('\n');tip.textContent='';const h=document.createElement('b');h.textContent=ln[0];tip.append(h,document.createTextNode(ln.slice(1).join('\n')));tip.hidden=false;const r=b.getBoundingClientRect();tip.style.left=Math.max(16,Math.min(r.left,innerWidth-300))+'px';tip.style.right='auto';tip.style.bottom=(innerHeight-r.top+10)+'px';});
b.addEventListener('mouseleave',()=>{tip.hidden=true;});}}
$('btnHelp').onclick=()=>{const h=$('help');h.style.display=getComputedStyle(h).display==='none'?'flex':'none';};$('btnCalm').onclick=()=>{S.calm=!S.calm;$('btnCalm').textContent=S.calm?'멀미 완화: 켜짐':'멀미 완화: 꺼짐';};
$('btnSnd').onclick=()=>{soundOn=!soundOn;$('btnSnd').classList.toggle('off',!soundOn);if(soundOn){sfxInit();sfx('ui');}};$('btnBgm').onclick=()=>{bgmOn=!bgmOn;$('btnBgm').classList.toggle('off',!bgmOn);if(bgmOn){sfxInit();bgmZone(S.zone||'village');sfx('ui');toast('배경음악 켜짐',900);}else{bgmStop();toast('배경음악 꺼짐',900);}};$('btnBgm').classList.add('off');$('btnSnd').classList.add('off');$('btnCam').onclick=()=>toggleCam();$('mhz').onclick=()=>$('btnMap').click();try{S.noShake=localStorage.getItem('pa_noshake')!=='0';}catch(e){S.noShake=true;}$('btnShake').classList.toggle('off',!!S.noShake);$('btnShake').onclick=()=>{S.noShake=!S.noShake;if(S.noShake)S.shk=0;$('btnShake').classList.toggle('off',S.noShake);try{localStorage.setItem('pa_noshake',S.noShake?'1':'0');}catch(e){}toast(S.noShake?'화면 흔들림 꺼짐':'화면 흔들림 켜짐',900);};$('tr').addEventListener('click',()=>sfx('ui'));
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
function trailTick(){const ref=pl.ref;if(!ref||!ref.swTip||!S.world)return;if(ref.glowM){const k=0.88+0.12*Math.sin(S.t*2.2);ref.glowM.forEach((m,i)=>{m.opacity=ref.glowM.base[i]*k;});}if(!TR.mesh||TR.mesh.parent!==S.world){if(TR.mesh&&TR.mesh.parent)TR.mesh.parent.remove(TR.mesh);trailInit();}
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
const SKI={wild:{key:'KeyA',n:'앱솔루트 저지먼트',st:2250,cd:12,dur:3.0},rise:{key:'KeyS',n:'라이징 슬래시',st:1250,cd:5,dur:0.9},sakura:{key:'KeyD',n:'발상발파',st:1500,cd:9,dur:1.8,short:'발상'},chase:{key:'KeyQ',n:'소드 체이서',st:1700,cd:10,dur:3.4,short:'추격'},rain:{key:'KeyW',n:'소드 레인',st:1600,cd:10,dur:2.4,short:'검우'},giga:{key:'KeyV',n:'기간틱 슬래시',st:3000,cd:25,dur:3.4,short:'기간'}};
SKI.wild.short='저지';SKI.rise.short='라이';
const WCH=1.9;
function ultClear(){for(const d of S.decals)d.cancel=true;for(let i=S.projs.length-1;i>=0;i--){const p=S.projs[i];if(p.from==='enemy'){if(p.m&&p.m.parent)p.m.parent.remove(p.m);S.projs.splice(i,1);}}for(let i=S.waves.length-1;i>=0;i--){const w=S.waves[i];if(!w.refl){if(w.g&&w.g.parent)w.g.parent.remove(w.g);S.waves.splice(i,1);}}for(const e of S.ents){if(e.decal)e.decal.cancel=true;if(!e.boss&&(e.state==='wind'||e.state==='dash')){e.state='recover';e.t=0;}if(e.boss){e.pat=null;if(e.strip){e.strip.cancel=true;e.strip=null;}e.cend=false;e.rest=false;e.vol=0;e.wait=Math.max(e.wait||0,0.8);}}}

/* ---------- 마법사 스킬: 메테오 (A) ---------- */
let MBAR=null;const MTIP='메테오 (A)\n하늘에서 메테오를 난사해요. 적이 있는 곳 위주로 3.6초 동안 34발이 떨어지고, 맞은 적에게 큰 피해를 줘요. 움직이면서 쓸 수 있어요.\n스태미나 2200 · 재사용 16초';
let MTG=null;
function dropMeteorP(tn){const life=0.8;if(!MTG){const k=o=>{o.userData.keep=1;return o;};MTG={core:k(new THREE.SphereGeometry(0.6,10,8)),glow:k(new THREE.SphereGeometry(1.0,10,8)),tail:k(new THREE.ConeGeometry(0.6,6,8)),mc:k(bm(0xff8a3a,1)),mg:k(bm(0xff4a1a,0.35)),mt:k(bm(0xff6a2a,0.35))};}
decalRing(tn,2.7,0xffc04a,life,()=>{ringBurst(tn,0.5,5.4,0xff7a3a,0.5,0.25);glowBall(tn,1,1.7,0xffc08a,0.4,2.8);dustFx(tn,2,4);sparkFx(tn,0.3,0xffa040,8,8,0.5,3);sfx('boom');shake(0.04);const sv=S.soft;S.soft=1;for(const e of S.ents){if(e.state==='dead')continue;if(arc(e.n,tn)<2.7+(e.boss?e.spec.rad*0.5:0.3))hitEnt(e,100,tn,1.2);}S.soft=sv;});
const m=new THREE.Group(),core=new THREE.Mesh(MTG.core,MTG.mc),glow=new THREE.Mesh(MTG.glow,MTG.mg),tail=new THREE.Mesh(MTG.tail,MTG.mt);tail.position.y=3.4;m.add(core,glow,tail);const side=any(tn),back=V3(0,0,0).addScaledVector(tn,32).addScaledVector(side,12).normalize();m.quaternion.setFromUnitVectors(V3(0,1,0),back);
addFx(m,life,k=>{const h=0.8+(1-k)*32,o=(1-k)*12;m.position.copy(wp(tn,h)).addScaledVector(side,o);m.visible=k<0.99;});}
function castMeteor(){if(S.dead||!S.running||S.cls!=='mage'||pl.roll>0||MBAR)return;if((pl.cds.meteor||0)>0){toast('메테오 준비 중',700);return;}if(pl.st<2200){toast('스태미나 부족',600);return;}pl.st-=2200;pl.stDelay=0.7;pl.cds.meteor=16;MBAR={t:0,n:0,N:34,dur:3.6};toast('메테오!',900);sfx('cast');ringBurst(pl.n,0.6,6,0xffb36b,0.6,0.2);glowBall(pl.n,1,1.4,0xffd9a0,0.5,2.2);}
function meteorTick(dt){if(!MBAR)return;if(S.dead||!S.running){MBAR=null;return;}MBAR.t+=dt;while(MBAR.n<MBAR.N&&MBAR.t>=0.35+MBAR.n*(MBAR.dur/MBAR.N)){MBAR.n++;let tn;const al=S.ents.filter(e=>e.state!=='dead'&&arc(e.n,pl.n)<22);if(al.length&&Math.random()<0.6){const e=al[Math.floor(Math.random()*al.length)];tn=pointAt(e.n,Math.random()*(e.boss?e.spec.rad*0.6:1.6),Math.random()*PI*2);}else tn=pointAt(pl.n,3+Math.random()*9,Math.random()*PI*2);dropMeteorP(tn);}if(MBAR.t>MBAR.dur+1.5)MBAR=null;}
function startSkill(id){if(S.dead||!S.running||S.cls!=='warrior'||pl.roll>0||pl.spin>0||pl.sk)return;const D=SKI[id];if(pl.cds[id]>0){toast(D.n+' 준비 중',700);return;}if(pl.st<D.st){toast('스태미나 부족',600);return;}
pl.st-=D.st;pl.stDelay=0.7;pl.cds[id]=D.cd;pl.atkT=0;pl.comboT=0;pl.combo=0;pl.lungeT=0;pl.atkLock=0;
const d=S.lock&&S.lock.state!=='dead'?dirTo(pl.n,S.lock.n):((id==='wild'||id==='giga')?nearestDir():aimAssist()),dir=d||moveVec();if(dir)pl.f.copy(dir);
if(id==='wild'||id==='giga')ultClear();
pl.sk={id,t:0,dur:D.dur,hit:new Set(),trail:true,col:id==='sakura'?[1,0.62,0.82]:id==='wild'?[1,0.5,0.25]:[1,0.95,0.6],n:0};
const R=pl.ref,k='sk_'+id;if(R.acts[k]&&id!=='wild'){const cl=R.acts[k].getClip().duration;play(R,k,0.06,true,cl/D.dur);}
toast(D.n+'!',800);sfx(id==='sakura'?'swing':'boom');
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
function tickSkill(dt){const sk=pl.sk;if(!sk)return;sk.t+=dt*(sk.id==='giga'?1.06:1);const t=sk.t;
if(sk.id==='wild'){
if(t<WCH){const q=t/WCH;S.fzT=0.2;S.chgT=Math.min(1,q*2.2)*0.35;$('dim').style.opacity=(Math.min(1,q*1.6)*0.12).toFixed(2);shake(0.008+0.07*q*q);if((sk.cf=(sk.cf||0)+1)%2===0)chargeFx(q);
wgUpdate(sk,q);if(!sk.aura){sk.aura=1;wildAura();}sk.rt=(sk.rt||0)-dt;if(sk.rt<=0){sk.rt=0.6-0.3*q;ringBurst(pl.n,7.5+q*2,0.7,q>0.6?0xff8a3a:0xff5a1a,0.3,0.15);}if(q>0.5&&Math.random()<0.2)sparkFx(pl.n,0.2,0xffa050,2,2,0.4,5+q*4);}
else if(!sk.fired){sk.fired=1;wgHide();S.fzT=0.4;lineFlash();edgeFlash();S.chgT=0;$('dim').style.opacity=0;const f=$('flash');f.style.transition='none';f.style.background='#ff7a3a';f.style.opacity=0.5;void f.offsetWidth;f.style.transition='opacity .7s ease-out';f.style.opacity=0;
{const ad=nearestDir();if(ad)pl.f.copy(ad);}hitstop(0.14);shake(0.35);dustFx(pl.n,5,14);ringBurst(pl.n,0.6,12,0xd02808,0.6,0.2);ringBurst(pl.n,0.3,8,0xff6a20,0.45,0.25);ringBurst(pl.n,0.2,5,0xffa040,0.35,0.3);sparkFx(pl.n,0.9,0xff8a30,44,12,0.7,3.4);fireWildWave();}}
else if(sk.id==='giga'){gigaTick(sk,dt,t);}
else if(sk.id==='rise'){
if(t>=0.12&&!sk.up){sk.up=1;pl.vy=11.5;pl.jt=0;pl.jflip=0;pl.god=Math.max(pl.god,1.0);sfx('boom');
ribbonFx(u=>{const e=-0.5+2.5*u,R2=3.5,y=Math.max(0.06,0.6+R2*Math.sin(e)),z=R2*Math.cos(e)+0.4,W=0.7*Math.pow(Math.sin(PI*Math.min(1,u*0.97+0.015)),0.7);return[-W,y,z,W,y,z];},26,0.42,[0.4,0.95,0.55],{sweep:0.36,tail:1.6});
shake(0.16);hitstop(0.05);risingBlades();}}
else if(sk.id==='sakura'){
const ticks=[0.15,0.3,0.45,0.6,0.75,0.9,1.05,1.2,1.35,1.5];while(sk.n<ticks.length&&t>=ticks[sk.n]){sk.n++;const last=sk.n===ticks.length,SR=6.6;ribbonFx(u=>{const a=u*PI*2,y=0.9+0.25*Math.sin(a*2+sk.n),w=0.22;return[Math.cos(a)*SR,y,Math.sin(a)*SR,Math.cos(a)*(SR*(1-w)),y,Math.sin(a)*(SR*(1-w))];},40,0.4,[1,0.58,0.8],{sweep:0.55,tail:1.4,rev:sk.n%2===0});
if(sk.n%2===1||last)ringBurst(pl.n,0.6,SR+0.4,0xffb7d5,0.4,0.15);sparkFx(pl.n,1.0,0xffb7d5,last?22:8,6,0.6,2.4);sfx('hit');S.soft=last?0:1;const h=hitGroup(SR,last?22:8,last?0.7:0.2,-2,false,null);S.soft=0;if(last){shake(0.16);hitstop(0.05);}else if(h&&sk.n%2===0)shake(0.04);}}
if(t>=sk.dur){pl.sk=null;}}
function sz2(g){return 13*g;}
function gAnim(k,len){const R=pl.ref;if(R&&R.acts[k]){const cl=R.acts[k].getClip().duration;play(R,k,0.09,true,cl/len);}}
function gigaTick(sk,dt,t){S.fzT=Math.max(S.fzT,0.15);pl.god=Math.max(pl.god,0.2);
if(!sk.init){sk.init=1;sk.sn=0;sk.col=[0.5,0.85,1];sk.ts=[];let tt=0.9;for(let i=0;i<50;i++){sk.ts.push(tt);tt+=(0.26*Math.pow(1-i/50,1.7)+0.03)/1.1;}sk.Te=tt;sk.dur=tt+1.0;pl.god=Math.max(pl.god,sk.dur+0.3);}
if(t<0.8){sk.pt=(sk.pt||0)-dt;if(sk.pt<=0){sk.pt=0.12;ringBurst(pl.n,0.4+0.3*t,9-8*t,0x6fd0ff,0.28,0.2);sparkFx(pl.n,0.4,0x9ee8ff,3,3,0.4,4);}}
if(sk.Te&&t<sk.Te+0.5){const side=pl.n.clone().cross(pl.f).normalize();let gi=0;for(const e of S.ents){if(e.state==='dead')continue;gi++;const D=e.boss?9+e.spec.rad*0.4:5.2,lat=e.boss?0:((gi%5)-2)*1.5,tp=pl.n.clone().addScaledVector(pl.f,D/R).addScaledVector(side,lat/R).normalize();const dist=arc(e.n,tp),dir=dirTo(e.n,tp);if(dir&&dist>0.25){moveAlong(e.n,dir,Math.min(dist,Math.max(e.boss?38:64,dist/(e.boss?0.8:0.5))*dt),[e.f]);}}}
const NS=50;while(sk.sn<NS&&t>=sk.ts[sk.sn]){sk.sn++;const a=(sk.sn*1.7)%PI-PI/2,dd=sk.sn%2?1:-1,gr=1+sk.sn/NS*0.9;if(sk.sn%2===1){const iv=(sk.ts[Math.min(NS-1,sk.sn)]-sk.ts[sk.sn-1])*2.2;gAnim('atk'+(1+(sk.sn>>1)%2),Math.max(0.16,iv+0.1));}
for(const [sz,col,lf] of [[16*gr,[0.55,0.9,1],0.26],[11*gr,[1,1,1],0.2]])ribbonFx(u=>{const x=dd*(u-0.5)*sz*Math.cos(a),y=1.8+(u-0.5)*sz*Math.sin(a)*dd,z=4+Math.sin(u*PI)*1.6;return[x,y,z,x*0.97,y-0.4,z-0.8];},16,lf,col,{sweep:0.5,tail:1.0,rev:false});
ribbonFx(u=>{const x=-dd*(u-0.5)*sz2(gr)*Math.cos(a+1.2),y=1.8+(u-0.5)*sz2(gr)*Math.sin(a+1.2)*-dd,z=4.2;return[x,y,z,x,y-0.4,z-0.8];},16,0.22,[0.4,0.7,1],{sweep:0.5,tail:1.0,rev:false});
if(sk.sn%4===0){ringBurst(pl.n.clone().addScaledVector(pl.f,5/R).normalize(),0.5,6+sk.sn*0.4,0x6fd0ff,0.35,0.2);}
sfx('swing');
if(sk.sn%2===0){const q=pointAt(pl.n,5+Math.random()*3,(Math.random()-0.5)*1.4+Math.atan2(0,1));sparkFx(pl.n.clone().addScaledVector(pl.f,5.5/R).normalize(),0.9+Math.random()*1.5,0x9ee8ff,4,5,0.3,2);}
S.soft=1;for(const e of S.ents){if(e.state==='dead')continue;if(arc(pl.n,e.n)>=26)continue;if(e.boss){if(!e.invul){const dmg=e.p2?e.mhp/100:e.mhp/150;e.hp=e.p2?Math.max(1,e.hp-dmg):Math.max(e.mhp*0.51,e.hp-dmg);e.hitT=S.t;e.flash=0.14;const nw=S.t||0;if(!e._ft||nw-e._ft>0.1){e._ft=nw;sparkFx(e.n,e.lift+e.spec.h*0.55,0x9ee8ff,3,3.2,0.25,2);floater(wp(e.n,e.lift+e.spec.h),String(Math.round(dmg)),'#cfeaff',false);}}continue;}hitEnt(e,5,pl.n,0);}S.soft=0;shake(0.04+sk.sn*0.006);}
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
if(!hit&&u>0.35){hit=true;if(i%2===0){dustFx(nn,1.0,3);ringBurst(nn,0.3,1.7,0xa5ffc4,0.3,0.12);}sparkFx(nn,0.2,0x55ff98,3,4,0.3,2.2);for(const e of S.ents){if(e.state==='dead')continue;if(arc(nn,e.n)<2.3+e.spec.rad){hitEnt(e,9,nn,0.25);}}if(i===0)shake(0.12);}});}}
/* ---------- 메인 루프 ---------- */
const SPINW=4*PI;
const clock=new THREE.Clock();let step=0;
function frame(){let dt=Math.min(clock.getDelta(),0.05);if(S.hs>0){S.hs-=dt;dt*=0.07;}if(S.mapOpen)dt=0;step++;
if(S.world&&S.sun){S.t+=dt;
const ultF=pl.sk&&((pl.sk.id==='wild'&&pl.sk.t<WCH+0.5)||(pl.sk.id==='giga'&&!pl.sk.fin));const edt=(S.fzT>0||ultF)?0:dt;if(S.fzT>0)S.fzT-=dt;
if(S.zone==='field'&&S.running&&!S.dead&&S.Z&&S.Z.spawns&&S.cN){S.rsT=(S.rsT||0)-dt;if(S.rsT<=0&&!S.rsBusy){S.rsT=5;const alive=S.ents.filter(e=>!e.boss&&e.state!=='dead').length;if(alive<16){S.rsBusy=true;const pn=S.portals.map(p=>p.n);let pos=null;for(let k=0;k<30&&!pos;k++){const c=pointAt(S.cN,Math.sqrt(Math.random())*S.Z.L*0.72,Math.random()*PI*2);if(arc(c,pl.n)<12)continue;if(pn.some(p=>arc(p,c)<15))continue;if(S.solids.some(o=>arc(o.n,c)<o.r+1.5))continue;pos=c;}if(pos){const z0=S.zone;spawnEnt('alien',pos,any(pos).applyAxisAngle(pos,Math.random()*6)).then(()=>{S.rsBusy=false;}).catch(()=>{S.rsBusy=false;});}else S.rsBusy=false;}}}
if(S.running||true){updatePlayer(dt);if(!(pl.sk&&pl.sk.id==='wild'&&pl.sk.t<WCH)&&S.chgT){S.chgT=0;$('dim').style.opacity=0;}if(!(pl.sk&&pl.sk.id==='wild'&&pl.sk.t<WCH))wgHide();for(let i=S.ents.length-1;i>=0;i--){const e=S.ents[i];updateEnt(e,e.exec?dt:edt);if(e.gone)S.ents.splice(i,1);}projTick(edt);waveTick(edt);dropTick(dt);}
if(S.vill)S.vill.update(S.t);S.mixers.forEach(m=>m.update(pl.ref&&m===pl.ref.mx?dt:edt));if(pl.ref&&pl.ref.bones&&pl.ref.bones.hd)pl.ref.bones.hd.scale.setScalar(0.8);poseHero();trailTick();chestTick(dt);fxTick();decalTick();
if(S.running){checkPortals();hud();if(window.mapTick)mapTick();}else{pl.cf.applyAxisAngle(pl.n,-dt*0.25);}
updateCamera(dt);occUpdate(dt+0.0001);npcUi(dt);renderer.render(scene,cam);mhpUi();portalUi();portraitUi();}
requestAnimationFrame(frame);}

/* ---------- 시작 ---------- */
function pickCls(c){$('pWarrior').classList.toggle('on',c==='warrior');$('pMage').classList.toggle('on',c==='mage');$('go').disabled=true;$('go').textContent='불러오는 중…';
setClass(c).then(()=>{if(S.world&&pl.ref)S.world.add(pl.ref.root);$('go').disabled=false;$('go').textContent='모험 시작';});}
$('pWarrior').onclick=()=>pickCls('warrior');$('pMage').onclick=()=>pickCls('mage');
addEventListener('keydown',e=>{if(!S.running&&!$('start').hidden&&!$('go').disabled&&(e.code==='Enter'||e.code==='Space')){e.preventDefault();$('go').click();}});
$('go').onclick=()=>{$('start').hidden=true;$('hud').hidden=false;S.running=true;S.snap=true;fitDock();sfxInit();sfx('cast');toast('마을에서 출발!',1500);pl.hp=pl.mhp;pl.st=pl.mst;updateQuest();};
(async function init(){const bar=$('load').firstChild;const total=3;let n=0;const tick=()=>{n++;bar.style.width=Math.min(100,n/total*100)+'%';};
await buildZone('village');tick();await setClass('warrior');tick();if(S.world)S.world.add(pl.ref.root);S.snap=true;tick();
bar.style.width='100%';$('go').disabled=false;$('go').textContent='모험 시작';frame();})().catch(e=>{console.error(e);$('go').textContent='불러오기 실패. 새로고침해 주세요';});
window.__g={chestTick,mythGrant,DT,S,pl,K,goZone,startAtk,tryRoll,tryJump,spawnWave,toggleLock,hurt,hitEnt,fr:()=>step,EN,setClass};
})();
