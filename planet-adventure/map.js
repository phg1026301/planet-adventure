/* 미니맵과 M키 큰 지도. 월드 탭(섬 지도)과 지금 지역 탭(위에서 본 지도), 드래그/휠로 이동·확대 */
(function(){
const $=id=>document.getElementById(id),PI=Math.PI;
const INFO={
village:{name:'첫 마을',tag:'안전 지역',lv:'—',col:'#8fd16a',side:'#5e9a45',desc:'모험이 시작되는 마을이에요. NPC와 이야기하고, 직업을 바꾸고, 허수아비로 연습할 수 있어요.',mon:[],ico:'house'},
field:{name:'초원 필드',tag:'사냥터',lv:'Lv 1~5',col:'#b6d95a',side:'#7f9f3a',desc:'선인장, 외계인, 버섯, 오크, 공룡, 벌, 박쥐가 흩어져 살아요. 3마리를 잡으면 보스방 문이 열려요.',mon:['선인장','외계인','버섯','오크','공룡','벌','박쥐'],ico:'tree'},
boss:{name:'폭군의 둥지',tag:'보스 지역',lv:'Lv 5+',col:'#9a6bd1',side:'#5c3d8a',desc:'하늘의 폭군 드래곤이 기다리는 마법진이에요. 붉은 표시는 구르기, 파동은 점프로 피하세요.',mon:['하늘의 폭군 드래곤'],ico:'spike'},
lock1:{name:'???',tag:'미개방',lv:'—',col:'#9aa0b4',side:'#6a6f85',desc:'아직 알려지지 않은 땅이에요. 곧 열려요.',mon:[],locked:1},
lock2:{name:'???',tag:'미개방',lv:'—',col:'#9aa0b4',side:'#6a6f85',desc:'아직 알려지지 않은 땅이에요. 곧 열려요.',mon:[],locked:1},
lock3:{name:'???',tag:'미개방',lv:'—',col:'#9aa0b4',side:'#6a6f85',desc:'아직 알려지지 않은 땅이에요. 곧 열려요.',mon:[],locked:1}};
const ISL=[['village',0,0],['field',1,0],['boss',2,0],['lock1',1,-1],['lock2',0,1],['lock3',2,1]];
const LINKS=[[0,1],[1,2]];
const V={tab:'world',x:0,y:0,z:1,hover:null,sel:null,mx:0,my:0};
let mini,mc,big,bc,bx,open=false,frameN=0,S,pl,K,R;
function bind(){if(!S&&window.__g){S=__g.S;pl=__g.pl;K=__g.K;R=window.W.R;}return !!S;}
const loc=n=>[(n.x-S.cN.x)*R,(n.z-S.cN.z)*R];
function zoneKey(){return S.zone||'village';}
function ok(){return bind()&&S.Z&&S.cN&&pl&&pl.n;}

/* ---------- 미니맵 ---------- */
function drawMini(){if(!ok()||!mc)return;const W=mini.width,H=mini.height,c=W/2,rad=c-3,view=26;mc.clearRect(0,0,W,H);
mc.save();mc.beginPath();mc.arc(c,c,rad,0,PI*2);mc.clip();
mc.fillStyle='#1c2547';mc.fillRect(0,0,W,H);const sc=rad/view,[px,pz]=loc(pl.n);
const T=(x,z)=>[c+(x-px)*sc,c+(z-pz)*sc];
{const o=T(0,0);mc.beginPath();mc.arc(o[0],o[1],S.Z.L*sc,0,PI*2);mc.fillStyle=zoneCol(0.9);mc.fill();mc.lineWidth=2;mc.strokeStyle='rgba(255,255,255,.7)';mc.stroke();}
for(const s of S.solids){const [x,z]=loc(s.n),p=T(x,z);if(Math.abs(p[0]-c)>rad+9||Math.abs(p[1]-c)>rad+9)continue;mc.beginPath();mc.arc(p[0],p[1],Math.max(1.5,s.r*sc*0.7),0,PI*2);mc.fillStyle='rgba(60,45,35,.55)';mc.fill();}
for(const q of S.portals){const [x,z]=loc(q.n),p=T(x,z);mc.beginPath();mc.arc(p[0],p[1],5,0,PI*2);mc.fillStyle=q.locked?'#888':'#7fe3ff';mc.fill();mc.strokeStyle='#fff';mc.lineWidth=1.5;mc.stroke();}
for(const n of S.npcs){const [x,z]=loc(n.n),p=T(x,z);mc.beginPath();mc.arc(p[0],p[1],3.5,0,PI*2);mc.fillStyle='#7dff9a';mc.fill();}
for(const e of S.ents){if(e.state==='dead')continue;const [x,z]=loc(e.n),p=T(x,z);mc.beginPath();mc.arc(p[0],p[1],e.boss?6:3.5,0,PI*2);mc.fillStyle=e.boss?'#ff3b3b':'#ff7a6b';mc.fill();mc.strokeStyle='rgba(0,0,0,.6)';mc.lineWidth=1;mc.stroke();}
arrow(mc,c,c,pl.f,7);
mc.restore();mc.beginPath();mc.arc(c,c,rad,0,PI*2);mc.lineWidth=3;mc.strokeStyle='rgba(255,246,223,.75)';mc.stroke();}
function zoneCol(a){const k=zoneKey();return k==='boss'?'rgba(70,45,110,'+a+')':k==='field'?'rgba(120,160,70,'+a+')':'rgba(110,170,100,'+a+')';}
function arrow(g,x,y,f,s){const a=Math.atan2(f.z,f.x);g.save();g.translate(x,y);g.rotate(a);g.beginPath();g.moveTo(s*1.3,0);g.lineTo(-s*0.9,s*0.85);g.lineTo(-s*0.4,0);g.lineTo(-s*0.9,-s*0.85);g.closePath();g.fillStyle='#ffd45a';g.fill();g.lineWidth=1.5;g.strokeStyle='#5a3b00';g.stroke();g.restore();}

/* ---------- 큰 지도 ---------- */
function resize(){const r=big.getBoundingClientRect(),d=Math.min(2,devicePixelRatio||1);bc.width=Math.max(10,r.width*d);bc.height=Math.max(10,r.height*d);bx.setTransform(d,0,0,d,0,0);}
const TW=96,TH=54;
const iso=(gx,gy)=>[(gx-gy)*TW,(gx+gy)*TH];
function curIsl(){return zoneKey();}
function drawBig(){if(!open)return;const W=bc.width/(Math.min(2,devicePixelRatio||1)),H=bc.height/(Math.min(2,devicePixelRatio||1));bx.clearRect(0,0,W,H);
const g=bx;g.fillStyle='#101a36';g.fillRect(0,0,W,H);
/* 바둑판 배경 */
g.save();g.translate(W/2+V.x,H/2+V.y);g.scale(V.z,V.z);
if(V.tab==='world')drawWorld(g,W,H);else drawLocal(g);
g.restore();
g.fillStyle='rgba(255,246,223,.7)';g.font='12px sans-serif';g.textAlign='right';g.fillText('드래그: 이동 · 휠: 확대/축소 · M/Esc: 닫기',W-12,H-10);}
function poly(g,pts){g.beginPath();pts.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.closePath();}
function diamond(cx,cy,k){return[[cx,cy-TH*k],[cx+TW*k,cy],[cx,cy+TH*k],[cx-TW*k,cy]];}
function drawWorld(g,W,H){
/* 바다 느낌의 격자 */
g.strokeStyle='rgba(120,150,255,.10)';g.lineWidth=1;for(let i=-8;i<=8;i++){let a=iso(i,-8),b=iso(i,8);g.beginPath();g.moveTo(a[0],a[1]);g.lineTo(b[0],b[1]);g.stroke();a=iso(-8,i);b=iso(8,i);g.beginPath();g.moveTo(a[0],a[1]);g.lineTo(b[0],b[1]);g.stroke();}
g.strokeStyle='rgba(255,230,160,.55)';g.lineWidth=5;g.setLineDash([2,10]);g.lineCap='round';for(const [a,b] of LINKS){const p=iso(ISL[a][1],ISL[a][2]),q=iso(ISL[b][1],ISL[b][2]);g.beginPath();g.moveTo(p[0],p[1]);g.lineTo(q[0],q[1]);g.stroke();}g.setLineDash([]);
const order=ISL.map((s,i)=>i).sort((a,b)=>(ISL[a][1]+ISL[a][2])-(ISL[b][1]+ISL[b][2]));
V.hits=[];
for(const i of order){const [id,gx,gy]=ISL[i],inf=INFO[id],[cx,cy]=iso(gx,gy),hov=V.hover===id,sel=V.sel===id,lift=hov?-8:0;
const top=diamond(cx,cy+lift,0.93),th=18;
g.fillStyle=inf.side;poly(g,[top[3],top[2],[top[2][0],top[2][1]+th],[top[3][0],top[3][1]+th]]);g.fill();g.fillStyle=shade(inf.side,-14);poly(g,[top[2],top[1],[top[1][0],top[1][1]+th],[top[2][0],top[2][1]+th]]);g.fill();
g.fillStyle=inf.col;poly(g,top);g.fill();g.lineWidth=sel?4:2;g.strokeStyle=sel?'#ffd45a':'rgba(255,255,255,.55)';g.stroke();
g.fillStyle=shade(inf.col,10);poly(g,diamond(cx,cy+lift,0.62));g.fill();
deco(g,inf,cx,cy+lift);
const lab=inf.locked?'???':inf.name;g.font='bold 15px sans-serif';g.textAlign='center';const tw=g.measureText(lab).width+18;
g.fillStyle='rgba(20,18,45,.85)';rr(g,cx-tw/2,cy+lift-TH*0.93-24,tw,22,8);g.fill();g.fillStyle='#fff6df';g.fillText(lab,cx,cy+lift-TH*0.93-8);
if(id===curIsl()){const b=Math.sin(performance.now()/260)*4;g.fillStyle='#ff4a6b';g.beginPath();g.moveTo(cx,cy+lift-TH*0.93-30+b);g.lineTo(cx-9,cy+lift-TH*0.93-46+b);g.lineTo(cx+9,cy+lift-TH*0.93-46+b);g.closePath();g.fill();g.fillStyle='#fff';g.font='bold 11px sans-serif';g.fillText('현재 위치',cx,cy+lift-TH*0.93-52+b);}
V.hits.push({id,cx,cy});}
}
function deco(g,inf,cx,cy){if(inf.locked){g.fillStyle='rgba(255,255,255,.7)';g.font='bold 30px sans-serif';g.textAlign='center';g.fillText('?',cx,cy+10);return;}
if(inf.ico==='house'){for(const [dx,dy,s] of [[-26,-4,1],[10,-10,1.2],[26,8,0.9]]){const x=cx+dx,y=cy+dy;g.fillStyle='#f3e3c0';g.fillRect(x-9*s,y-8*s,18*s,14*s);g.fillStyle='#d9573f';g.beginPath();g.moveTo(x-12*s,y-8*s);g.lineTo(x,y-20*s);g.lineTo(x+12*s,y-8*s);g.closePath();g.fill();}}
else if(inf.ico==='tree'){for(const [dx,dy,s] of [[-28,0,1],[-6,-10,1.2],[22,-2,1],[8,10,0.8]]){const x=cx+dx,y=cy+dy;g.fillStyle='#7a5230';g.fillRect(x-2,y-2,4,10*s);g.fillStyle='#3f9a3a';g.beginPath();g.arc(x,y-8*s,10*s,0,PI*2);g.fill();}}
else{g.strokeStyle='rgba(255,220,255,.8)';g.lineWidth=2;g.beginPath();g.arc(cx,cy,24,0,PI*2);g.stroke();g.beginPath();g.arc(cx,cy,12,0,PI*2);g.stroke();g.fillStyle='#e8c8ff';for(let k=0;k<5;k++){const a=k/5*PI*2-PI/2;g.beginPath();g.moveTo(cx+Math.cos(a)*30,cy+Math.sin(a)*14);g.lineTo(cx+Math.cos(a+0.2)*14,cy+Math.sin(a+0.2)*7);g.lineTo(cx+Math.cos(a-0.2)*14,cy+Math.sin(a-0.2)*7);g.fill();}}}
function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();}
function shade(hex,d){const n=parseInt(hex.slice(1),16),c=v=>Math.max(0,Math.min(255,v+d));return'rgb('+c(n>>16)+','+c((n>>8)&255)+','+c(n&255)+')';}
function drawLocal(g){if(!ok())return;const sc=9,[px,pz]=loc(pl.n);
g.beginPath();g.arc(0,0,S.Z.L*sc,0,PI*2);g.fillStyle=zoneCol(0.95);g.fill();g.lineWidth=3;g.strokeStyle='rgba(255,255,255,.7)';g.stroke();
g.strokeStyle='rgba(255,255,255,.1)';g.lineWidth=1;for(let r=5;r<S.Z.L;r+=5){g.beginPath();g.arc(0,0,r*sc,0,PI*2);g.stroke();}
for(const s of S.solids){const [x,z]=loc(s.n);g.beginPath();g.arc(x*sc,z*sc,Math.max(3,s.r*sc*0.8),0,PI*2);g.fillStyle='rgba(70,50,35,.6)';g.fill();}
g.textAlign='center';g.font='bold 13px sans-serif';
for(const q of S.portals){const [x,z]=loc(q.n);g.beginPath();g.arc(x*sc,z*sc,14,0,PI*2);g.fillStyle=q.locked?'#888':'#7fe3ff';g.fill();g.lineWidth=2;g.strokeStyle='#fff';g.stroke();g.fillStyle='#fff';g.fillText(q.label||'문',x*sc,z*sc-20);}
for(const n of S.npcs){const [x,z]=loc(n.n);g.beginPath();g.arc(x*sc,z*sc,8,0,PI*2);g.fillStyle='#7dff9a';g.fill();g.fillStyle='#fff';g.fillText('NPC',x*sc,z*sc-12);}
for(const e of S.ents){if(e.state==='dead')continue;const [x,z]=loc(e.n);g.beginPath();g.arc(x*sc,z*sc,e.boss?16:8,0,PI*2);g.fillStyle=e.boss?'#ff3b3b':'#ff7a6b';g.fill();g.lineWidth=1.5;g.strokeStyle='#000';g.stroke();g.fillStyle='#fff';g.fillText(e.spec.name,x*sc,z*sc-(e.boss?22:12));}
g.save();g.translate(px*sc,pz*sc);g.scale(1,1);g.restore();arrow(g,px*sc,pz*sc,pl.f,15);g.fillStyle='#fff6df';g.fillText('나',px*sc,pz*sc-20);}
function infoHTML(id){const i=INFO[id];if(!i)return'<div class="mi-h">지역 정보</div><div class="mi-d">섬 위에 마우스를 올리거나 눌러보세요.</div>';
const cur=id===curIsl();let extra='';if(id==='field')extra='<div class="mi-r">처치한 몬스터 '+Math.min(S.kills||0,3)+'/3</div>';if(id==='boss')extra='<div class="mi-r">'+(S.bossDead?'보스 처치 완료':(S.kills>=3?'입장 가능':'몬스터 3마리를 잡으면 열려요'))+'</div>';
return'<div class="mi-h">'+i.name+(cur?' <em>현재 위치</em>':'')+'</div><div class="mi-t"><b>'+i.tag+'</b><span>'+i.lv+'</span></div><div class="mi-d">'+i.desc+'</div>'+(i.mon.length?'<div class="mi-m">'+i.mon.map(m=>'<i>'+m+'</i>').join('')+'</div>':'')+extra;}
function updInfo(){const id=V.hover||V.sel||(V.tab==='world'?curIsl():curIsl());const el=$('mapInfo');const h=infoHTML(id);if(el._h!==h){el.innerHTML=h;el._h=h;}}
function hit(mx,my){if(V.tab!=='world'||!V.hits)return null;const r=big.getBoundingClientRect(),X=(mx-r.left-r.width/2-V.x)/V.z,Y=(my-r.top-r.height/2-V.y)/V.z;
for(let i=V.hits.length-1;i>=0;i--){const h=V.hits[i];if(Math.abs(X-h.cx)/ (TW*0.93)+Math.abs(Y-h.cy)/(TH*0.93)<=1)return h.id;}return null;}
function setTab(t){V.tab=t;V.x=V.y=0;V.z=t==='world'?1:1;$('tabW').classList.toggle('on',t==='world');$('tabL').classList.toggle('on',t==='local');if(t==='local'&&ok()){const sc=9,[px,pz]=loc(pl.n);V.x=-px*sc;V.y=-pz*sc;}}
function zoom(f,cx,cy){const r=big.getBoundingClientRect(),nz=Math.max(0.5,Math.min(3.2,V.z*f)),k=nz/V.z;const ox=(cx!=null?cx-r.left-r.width/2:0),oy=(cy!=null?cy-r.top-r.height/2:0);V.x=ox-(ox-V.x)*k;V.y=oy-(oy-V.y)*k;V.z=nz;}
function toggle(v){if(!bind())return;open=(v===undefined?!open:v);S.mapOpen=open;$('bigmap').hidden=!open;if(open){resize();setTab('world');if(K)for(const k in K)K[k]=false;}}
function init(){mini=$('mini');big=$('mapC');if(!mini||!big)return;mc=mini.getContext('2d');bc=big;bx=bc.getContext('2d');
$('btnMap').onclick=()=>toggle();$('mapX').onclick=()=>toggle(false);$('tabW').onclick=()=>setTab('world');$('tabL').onclick=()=>setTab('local');$('zIn').onclick=()=>zoom(1.25);$('zOut').onclick=()=>zoom(0.8);
mini.onclick=()=>toggle(true);
addEventListener('keydown',e=>{if(e.code==='KeyM'&&bind()&&S.running){e.preventDefault();toggle();}else if(e.code==='Escape'&&open&&bind()){e.preventDefault();toggle(false);}});
addEventListener('resize',()=>{if(open)resize();});
const ps=new Map();let moved=0;
big.addEventListener('pointerdown',e=>{big.setPointerCapture(e.pointerId);ps.set(e.pointerId,[e.clientX,e.clientY]);moved=0;});
big.addEventListener('pointermove',e=>{V.mx=e.clientX;V.my=e.clientY;if(ps.has(e.pointerId)){const o=ps.get(e.pointerId);
if(ps.size===2){const [a,b]=[...ps.values()];const d0=Math.hypot(a[0]-b[0],a[1]-b[1]);ps.set(e.pointerId,[e.clientX,e.clientY]);const [c,d]=[...ps.values()];const d1=Math.hypot(c[0]-d[0],c[1]-d[1]);if(d0>0)zoom(d1/d0,(c[0]+d[0])/2,(c[1]+d[1])/2);}
else{V.x+=e.clientX-o[0];V.y+=e.clientY-o[1];moved+=Math.abs(e.clientX-o[0])+Math.abs(e.clientY-o[1]);ps.set(e.pointerId,[e.clientX,e.clientY]);}}
else V.hover=hit(e.clientX,e.clientY);});
const up=e=>{ps.delete(e.pointerId);if(moved<6){const id=hit(e.clientX,e.clientY);V.sel=id;}};
big.addEventListener('pointerup',up);big.addEventListener('pointercancel',e=>ps.delete(e.pointerId));
big.addEventListener('pointerleave',()=>{V.hover=null;});
big.addEventListener('wheel',e=>{e.preventDefault();zoom(Math.exp(-e.deltaY*0.0015),e.clientX,e.clientY);},{passive:false});
}
window.mapTick=function(){if(!bind())return;frameN++;if(frameN%2===0)drawMini();if(open){drawBig();updInfo();}};
window.mapToggle=toggle;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
