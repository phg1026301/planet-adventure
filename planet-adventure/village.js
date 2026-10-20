/* 새 마을: 크림색 석재 건물, 금색 장식, 붉은/청록 지붕, 광장, 계단 테라스, 멀리 큰 성.
   로컬 좌표: xl(왼쪽+), zl(앞쪽+, 성 방향). 플레이어 시작점은 (0,0)이고 성을 바라본다.
   plats: 올라설 수 있는 구조물(지붕, 테라스, 계단). 지붕은 점프로 올라선다. */
window.buildVillage=function(group){
const T=THREE,PI=Math.PI;
const root=new T.Group();root.rotation.y=-3*PI/4;group.add(root);
const MC={};const M=(c,o)=>{const k=c+(o?JSON.stringify(o):'');return MC[k]||(MC[k]=new T.MeshToonMaterial(Object.assign({color:c},o||{})));};
const STONE=0xefe3bf,STONE2=0xe0d2a4,GOLD=0xe8b93a,RED=0xd2503c,TEAL=0x3c9ab8,WOOD=0x8a5a36,DOOR=0x6a4a2e,GLASS=0x8ec6e6,GREEN=0x58b043,GREEN2=0x7ad25a;
const plats=[],solids=[],anim=[];let DEF=root;
const bx=(w,h,d,col,x,y,z,par,sh)=>{const m=new T.Mesh(new T.BoxGeometry(w,h,d),M(col));m.position.set(x,y+h/2,z);m.castShadow=sh!==false;m.receiveShadow=true;(par||DEF).add(m);return m;};
const cyl=(r0,r1,h,col,x,y,z,par,seg)=>{const m=new T.Mesh(new T.CylinderGeometry(r1,r0,h,seg||14),M(col));m.position.set(x,y+h/2,z);m.castShadow=true;m.receiveShadow=true;(par||DEF).add(m);return m;};
const cone=(r,h,col,x,y,z,par,seg,rot)=>{const m=new T.Mesh(new T.ConeGeometry(r,h,seg||14),M(col));m.position.set(x,y+h/2,z);if(rot)m.rotation.y=rot;m.castShadow=true;(par||DEF).add(m);return m;};
const sph=(r,col,x,y,z,par,sy)=>{const m=new T.Mesh(new T.SphereGeometry(r,12,10),M(col));m.position.set(x,y,z);if(sy)m.scale.y=sy;m.castShadow=true;(par||DEF).add(m);return m;};
const flag=(x,y,z,par,col)=>{const g=par||DEF;const p=cyl(0.05,0.05,3,0x7a6a44,x,y,z,g,6);const f=new T.Mesh(new T.PlaneGeometry(1.8,1.0),new T.MeshBasicMaterial({color:col||GOLD,side:T.DoubleSide}));f.position.set(x+0.95,y+2.45,z);g.add(f);anim.push(t=>{f.rotation.y=Math.sin(t*2.2+x)*0.25;});};
const merlons=(x0,x1,z,y,step,par,hh,dd)=>{for(let x=x0;x<=x1;x+=step*2)bx(step,hh||0.9,dd||1.2,STONE,x,y,z,par);};
/* ---------- 집 ---------- */
function house(cx,cz,w,d,face,roofCol,wallH,rh){
 wallH=wallH||1.5;rh=rh||2.2;
 const g=new T.Group();g.position.set(cx,0,cz);root.add(g);g.rotation.y={N:0,E:PI/2,S:PI,W:-PI/2}[face];
 bx(w,wallH,d,STONE,0,0,0,g);
 bx(w+0.3,0.28,d+0.3,GOLD,0,wallH-0.55,0,g);
 bx(w+0.2,0.5,d+0.2,STONE2,0,0,0,g,false);
 for(const sx of[-1,0,1])bx(0.22,wallH-0.55,0.1,WOOD,sx*w*0.33,0.5,d/2+0.02,g,false);
 bx(w,0.2,0.1,WOOD,0,wallH*0.5,d/2+0.02,g,false);
 bx(1.0,1.25,0.14,DOOR,0,0,d/2+0.03,g,false);bx(1.3,0.14,0.2,GOLD,0,1.25,d/2+0.04,g,false);
 for(const sx of[-1,1]){bx(1.0,0.85,0.1,GLASS,sx*w*0.3,wallH*0.45,d/2+0.04,g,false);bx(1.2,0.1,0.18,WOOD,sx*w*0.3,wallH*0.45-0.1,d/2+0.06,g,false);}
 for(const sx of[-1,1]){bx(0.1,0.85,1.0,GLASS,sx*(w/2+0.02),wallH*0.45,0,g,false);}
 const hd=d/2+0.45,sh=new T.Shape();sh.moveTo(-hd,0);sh.lineTo(hd,0);sh.lineTo(0,rh);sh.lineTo(-hd,0);
 const geo=new T.ExtrudeGeometry(sh,{depth:w+0.9,bevelEnabled:false});geo.rotateY(PI/2);geo.translate(-(w+0.9)/2,0,0);
 const roof=new T.Mesh(geo,M(roofCol));roof.position.y=wallH;roof.castShadow=true;g.add(roof);
 bx(w+1.0,0.22,0.3,GOLD,0,wallH+rh-0.05,0,g,false);
 bx(0.7,1.6,0.7,STONE2,w*0.28,wallH+rh*0.35,-d*0.15,g);
 const sw=(face==='E'||face==='W');const fx=sw?d:w,fz=sw?w:d;
 plats.push({type:'house',x0:cx-fx/2-0.35,x1:cx+fx/2+0.35,z0:cz-fz/2-0.35,z1:cz+fz/2+0.35,axis:sw?'x':'z',c:sw?cx:cz,half:(sw?fx:fz)/2+0.45,wall:wallH,rh});
 return g;}
/* ---------- 탑 ---------- */
function tower(x,z,r,h,roofH,roofCol,par){
 cyl(r,r,h,STONE,x,0,z,par,16);cyl(r+0.25,r+0.25,0.5,GOLD,x,h*0.6,z,par,16);cyl(r+0.3,r+0.3,0.6,STONE2,x,h-0.6,z,par,16);
 cone(r+0.9,roofH,roofCol,x,h,z,par,16);
 for(let i=0;i<3;i++){const a=i*PI*0.6-PI*0.6+PI/2;bx(0.6,1.4,0.3,0x5b7fa6,x+Math.cos(a)*r,h*0.7,z-Math.sin(a)*r-0.0,par,false);}
 flag(x,h+roofH,z,par);}
/* ---------- 나무, 가로등, 깃발 ---------- */
function tree(x,z,s){s=s||1;const g=new T.Group();g.position.set(x,0,z);root.add(g);cyl(0.28*s,0.36*s,2.2*s,0x7a5632,0,0,0,g,8);
 sph(1.6*s,GREEN,0,3.3*s,0,g);sph(1.2*s,GREEN,-1.1*s,2.7*s,0.3*s,g);sph(1.2*s,GREEN,1.1*s,2.8*s,-0.3*s,g);sph(0.9*s,GREEN2,0.2*s,4.1*s,0.2*s,g);solids.push({xl:x,zl:z,r:0.7*s});}
function bush(x,z,s){s=s||1;sph(0.8*s,GREEN,x,0.55*s,z,root,0.8);sph(0.55*s,GREEN2,x+0.5*s,0.45*s,z+0.2*s,root,0.8);}
function lamp(x,z){cyl(0.09,0.12,3.0,0x6a5a3c,x,0,z,root,8);const l=bx(0.6,0.8,0.6,GOLD,x,3.0,z,root,false);const c=bx(0.34,0.5,0.34,0xfff6c9,x,3.15,z,root,false);c.material=new T.MeshBasicMaterial({color:0xfff6c9});cone(0.5,0.4,GOLD,x,3.8,z,root,4,PI/4);solids.push({xl:x,zl:z,r:0.35});}
function banner(x,z,col){cyl(0.06,0.06,4.0,0x6a5a3c,x,0,z,root,6);const f=new T.Mesh(new T.PlaneGeometry(1.0,2.2),new T.MeshBasicMaterial({color:col||GOLD,side:T.DoubleSide}));f.position.set(x,2.5,z);root.add(f);const f2=new T.Mesh(new T.PlaneGeometry(0.5,0.5),new T.MeshBasicMaterial({color:0xfff2b0,side:T.DoubleSide}));f2.position.set(x,3.0,z+0.01);root.add(f2);anim.push(t=>{f.rotation.y=Math.sin(t*1.7+x)*0.12;f2.rotation.y=f.rotation.y;});solids.push({xl:x,zl:z,r:0.3});}
/* ---------- 마을 건물 (플라자 양옆) ---------- */
house(23,6,8.5,7.5,'W',RED);house(-23,6,8.5,7.5,'E',TEAL);
house(23,16,8.5,7.5,'W',TEAL);house(-23,16,8.5,7.5,'E',RED);
house(23,25.5,8.5,7,'W',RED,1.6,2.3);house(-23,25.5,8.5,7,'E',TEAL,1.6,2.3);
for(const s of[-1,1]){house(s*36,10,9,8,s>0?'W':'E',s>0?TEAL:RED);house(s*36,22,9,8,s>0?'W':'E',s>0?RED:TEAL);house(s*38,34,9,8,s>0?'W':'E',s>0?TEAL:RED);}
/* 입구 쪽 낮은 성벽 장식 */
for(const s of[-1,1]){bx(1.2,1.4,14,STONE,s*13,0,-6,root);bx(1.3,0.25,14,GOLD,s*13,1.4,-6,root,false);}
/* ---------- 테라스와 계단 ---------- */
const TH=3.2;
bx(96,TH,20.5,STONE,0,0,40.25,root);bx(96,0.3,20.5,STONE2,0,TH,40.25,root,false);
bx(96,0.4,0.9,GOLD,0,TH-0.55,29.75,root,false);
for(let x=-46;x<=46;x+=6){if(Math.abs(x)<6)continue;bx(4,1.9,0.18,0xf4ead0,x,0.55,29.8,root,false);bx(4.3,0.14,0.22,GOLD,x,2.5,29.78,root,false);bx(4.3,0.14,0.22,GOLD,x,0.5,29.78,root,false);}
plats.push({type:'box',x0:-48,x1:48,z0:30,z1:50.5,top:TH});
const NS=14;for(let i=0;i<NS;i++){const zz=23+i*0.5,hh=TH*(i+1)/NS;bx(10,hh,0.5,i%2?STONE2:STONE,0,0,zz+0.25,root,false);}
plats.push({type:'ramp',x0:-5,x1:5,z0:23,z1:30,h0:0,h1:TH});
for(const s of[-1,1]){const x0=s>0?5:-5.9,x1=s>0?5.9:-5;for(let i=0;i<NS;i++){const zz=23+i*0.5,hh=TH*(i+1)/NS+0.9;bx(0.9,hh,0.5,STONE,s*5.45,0,zz+0.25,root,false);}
 bx(1.1,0.2,7.2,GOLD,s*5.45,TH+0.95,26.5,root,false).rotation.x=0;plats.push({type:'ramp',x0,x1,z0:23,z1:30,h0:0.9,h1:TH+0.9});banner(s*4.4,31.4,GOLD);banner(s*8.5,31.4,0xd2503c);}
/* 테라스 위 */
for(const s of[-1,1]){lamp(s*5,36);lamp(s*5,44);lamp(s*14,34);bush(s*10,33.5,1.2);bush(s*18,33.5,1.1);}
for(let i=0;i<6;i++)for(const s of[-1,1])bx(0.12,0.05,2.4,GOLD,s*1.9,TH+0.3,31+i*3.2,root,false);
bx(3.8,0.06,18,0xd9c88e,0,TH+0.3,40.5,root,false);
/* ---------- 광장 ---------- */
for(let i=0;i<8;i++){const a=i*PI/4+PI/8;lamp(Math.sin(a)*12.6,16+Math.cos(a)*12.6);}
const glow=new T.Mesh(new T.CircleGeometry(4.6,40),new T.MeshBasicMaterial({color:0x8cfff0,transparent:true,opacity:0.5,depthWrite:false,blending:T.AdditiveBlending,fog:false}));glow.rotation.x=-PI/2;glow.position.set(0,0.05,16);root.add(glow);
const pill=[];for(let i=0;i<6;i++){const a=i*PI/3;const p=bx(0.5,2.4,0.5,0xbfeff0,Math.cos(a)*4.9,0,16+Math.sin(a)*4.9,root,false);const c=cone(0.42,0.7,0x6fe3c9,Math.cos(a)*4.9,2.4,16+Math.sin(a)*4.9,root,4,PI/4);pill.push(c);solids.push({xl:Math.cos(a)*4.9,zl:16+Math.sin(a)*4.9,r:0.4});}
anim.push(t=>{glow.material.opacity=0.38+0.2*Math.sin(t*2.2);glow.scale.setScalar(1+0.03*Math.sin(t*2.2));pill.forEach((c,i)=>{c.position.y=2.75+0.15*Math.sin(t*2+i);c.rotation.y=t*0.8;});});
/* ---------- 나무와 수풀 ---------- */
for(const [x,z,s] of[[-12,-3,1.1],[14,-4,1],[-27,-4,1.2],[27,-3,1.1],[-17,32,1],[17,31,1.1],[-30,14,1.2],[30,15,1.2],[-27,36,1.1],[27,37,1.2],[-8,-8,0.9],[-34,-2,1.3],[34,-2,1.3],[-40,25,1.3],[40,24,1.3]])tree(x,z,s);
for(const [x,z] of[[-6,-2],[6,-1],[-18,3],[18,2],[-10,28],[10,27.5],[-20,30],[20,30],[-4,9],[4,10]])bush(x,z,1);
/* ---------- 멀리 보이는 성 ---------- */
const CZ=58,CS=0.62,castle=new T.Group();castle.scale.setScalar(CS);castle.position.set(0,0,86-CZ*CS);root.add(castle);DEF=castle;
for(const s of[-1,1]){const x0=s>0?7:-300,x1=s>0?300:-7;const wid=x1-x0,cx=(x0+x1)/2;bx(wid,10,4,STONE,cx,0,CZ,root);bx(wid,0.5,4.3,GOLD,cx,6.5,CZ,root,false);merlons(x0+0.6,x1-0.6,CZ-1.4,10,0.7,root,1.1,1.1);
 for(let x=x0+6;x<x1-4;x+=9)bx(3,2.6,0.2,0xf4ead0,x,3.0,CZ-2.05,root,false);}
for(const s of[-1,1]){tower(s*10,CZ-1,4.5,20,9,TEAL);tower(s*38,CZ-1,5,16,8,RED);tower(s*70,CZ-1,5,16,8,RED);tower(s*105,CZ-1,5.5,18,9,TEAL);tower(s*145,CZ-1,5.5,16,8,RED);}
bx(14,10,4.6,0x3a3328,0,0,CZ-0.1,root,false);bx(11,0.5,0.4,GOLD,0,9.4,CZ-2.2,root,false);
const arch=new T.Mesh(new T.CylinderGeometry(5.5,5.5,4.7,18,1,false,0,PI),M(0x2a241c));arch.rotation.set(PI/2,0,PI/2);arch.position.set(0,6.6,CZ-0.1);root.add(arch);
bx(11,6.6,4.7,0x2a241c,0,0,CZ-0.1,root,false);
for(let i=0;i<5;i++)bx(10.5,0.12,0.12,0x4b3b22,0,1+i*1.3,CZ-2.45,root,false);
/* 본성 */
const KZ=CZ+13;
bx(34,24,18,STONE,0,0,KZ,root);bx(35,0.7,19,GOLD,0,14,KZ,root,false);bx(35,0.9,19,STONE2,0,23.2,KZ,root,false);merlons(-16.5,16.5,KZ-8.4,24,1.1,root,1.3,1.4);
for(let x=-13;x<=13;x+=6.5){bx(2.2,4.4,0.3,0x5b7fa6,x,16.5,KZ-9.1,root,false);bx(2.5,0.3,0.4,GOLD,x,20.8,KZ-9.1,root,false);}
for(let x=-13;x<=13;x+=6.5)bx(2.2,4,0.3,0x5b7fa6,x,5,KZ-9.1,root,false);
bx(10,11,2,0x3a3328,0,0,KZ-9.2,root,false);bx(11,0.6,0.6,GOLD,0,11,KZ-9.3,root,false);
bx(14,13,14,STONE,0,24,KZ,root);bx(15,0.6,15,GOLD,0,30,KZ,root,false);bx(15,0.7,15,STONE2,0,36.4,KZ,root,false);
cone(11.4,17,TEAL,0,37,KZ,root,4,PI/4);flag(0,54,KZ,root,GOLD);
bx(3,5,0.3,0x5b7fa6,0,27,KZ-7.1,root,false);bx(3.4,0.3,0.4,GOLD,0,32,KZ-7.1,root,false);
for(const s of[-1,1]){tower(s*21,KZ-2,6,32,13,TEAL);tower(s*30,KZ+4,4.5,24,10,RED);}
DEF=root;
/* 성으로 이어지는 길 */
bx(6.4,0.12,40,0xe8dcb4,0,0,68,root,false);bx(0.5,0.3,40,GOLD,3.4,0,68,root,false);bx(0.5,0.3,40,GOLD,-3.4,0,68,root,false);for(let z=54;z<=84;z+=6){lamp(4.8,z);lamp(-4.8,z);}for(const s of[-1,1])for(let z=58;z<=82;z+=8)tree(s*9,z,1.1);
/* ---------- 먼 산 ---------- */
for(let i=0;i<14;i++){const x=-260+i*40+((i*37)%17),z=190+((i*53)%40),h=40+((i*29)%35);cone(48+((i*13)%20),h,i%2?0x9cc3dd:0xa9cbe3,x,0,z,root,7);}
return {root,plats,solids,update:t=>{for(const f of anim)f(t);}};};
