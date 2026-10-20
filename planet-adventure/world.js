/* 월드: 렌더러, 에셋 로더, 구체 행성 수학, 타일 바닥, 구역(마을/필드/보스 스테이지) 데이터 */
(function(){
'use strict';
const A=window.ASSETS;
const R0=26,R=100000,C=new THREE.Vector3(0,-R,0); /* R이 아주 커서 사실상 평지. 구역 데이터의 각도는 R0=26 기준 거리로 환산 */
const V3=(x,y,z)=>new THREE.Vector3(x,y,z);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const stage=document.getElementById('stage');
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.75));
renderer.outputEncoding=THREE.sRGBEncoding;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
stage.appendChild(renderer.domElement);
const scene=new THREE.Scene(),cam=new THREE.PerspectiveCamera(55,1,0.1,300);
function resize(){const w=stage.clientWidth||innerWidth,h=stage.clientHeight||innerHeight;renderer.setSize(w,h);cam.aspect=w/h;cam.updateProjectionMatrix();}
new ResizeObserver(resize).observe(stage);resize();

/* ---------- 구체 위 수학 ---------- */
const _x=V3(0,0,0),_m=new THREE.Matrix4(),_q=new THREE.Quaternion();
function orient(o,n,f,lift){_x.crossVectors(n,f).normalize();_m.makeBasis(_x,n,f);o.quaternion.setFromRotationMatrix(_m);o.position.copy(C).addScaledVector(n,R+(lift||0));}
function toN(th,ph){th=th*R0/R;return V3(Math.sin(th)*Math.sin(ph),Math.cos(th),Math.sin(th)*Math.cos(ph));}
function arc(a,b){return R*Math.acos(clamp(a.dot(b),-1,1));}
function dirTo(n,t,out){out=out||V3(0,0,0);out.copy(t).addScaledVector(n,-n.dot(t));const l=out.length();if(l<1e-11)return null;return out.multiplyScalar(1/l);}
function stepOn(n,f,dist){const a=dist/R,c=Math.cos(a),s=Math.sin(a);const nn=V3(0,0,0).copy(n).multiplyScalar(c).addScaledVector(f,s);const ff=V3(0,0,0).copy(f).multiplyScalar(c).addScaledVector(n,-s);n.copy(nn).normalize();f.copy(ff).normalize();}
/* n에서 방향 d(접선)로 dist만큼 이동하면서 따라 돌아야 하는 접선 벡터들을 함께 옮긴다 */
function moveAlong(n,d,dist,carry){const n0=n.clone(),f=d.clone();stepOn(n,f,dist);_q.setFromUnitVectors(n0,n);carry.forEach(v=>{v.applyQuaternion(_q);v.addScaledVector(n,-n.dot(v)).normalize();});}
function turnToward(f,t,n,maxAng){const ang=Math.atan2(n.dot(V3(0,0,0).crossVectors(f,t)),f.dot(t));const a=clamp(ang,-maxAng,maxAng);f.applyAxisAngle(n,a);f.addScaledVector(n,-n.dot(f)).normalize();return Math.abs(ang);}
function rotAbout(v,axis,ang){return v.applyAxisAngle(axis,ang);}
function pointAt(c,dist,bearing){const ax=V3(0,0,0).crossVectors(c,V3(0,1,0));if(ax.length()<1e-12)ax.set(1,0,0);ax.normalize();const p=c.clone().applyAxisAngle(ax,dist/R);return p.applyAxisAngle(c,bearing).normalize();}

/* ---------- 에셋 로더 ---------- */
const gltfL=new THREE.GLTFLoader(),fbxL=new THREE.FBXLoader(),texL=new THREE.TextureLoader();
const WF={9728:THREE.NearestFilter,9729:THREE.LinearFilter,9984:THREE.NearestMipmapNearestFilter,9985:THREE.LinearMipmapNearestFilter,9986:THREE.NearestMipmapLinearFilter,9987:THREE.LinearMipmapLinearFilter},WW={33071:THREE.ClampToEdgeWrapping,33648:THREE.MirroredRepeatWrapping,10497:THREE.RepeatWrapping};
gltfL.register(parser=>({name:'bitmap_tex',loadTexture(i){const json=parser.json,td=json.textures[i],src=json.images[td.source];if(src.bufferView===undefined||typeof createImageBitmap==='undefined')return null;
return parser.getDependency('bufferView',src.bufferView).then(buf=>createImageBitmap(new Blob([buf],{type:src.mimeType}),{premultiplyAlpha:'none'})).then(bmp=>{const tx=new THREE.CanvasTexture(bmp);tx.flipY=false;const s=(json.samplers||{})[td.sampler]||{};
tx.magFilter=WF[s.magFilter]||THREE.LinearFilter;tx.minFilter=WF[s.minFilter]||THREE.LinearMipmapLinearFilter;tx.wrapS=WW[s.wrapS]||THREE.RepeatWrapping;tx.wrapT=WW[s.wrapT]||THREE.RepeatWrapping;tx.encoding=THREE.sRGBEncoding;parser.associations.set(tx,{type:'textures',index:i});return tx;});}}));
const cache={},failed=[],mcache={};
function modScene(k){if(!mcache[k])mcache[k]=new Promise(res=>gltfL.load('assets/v2/'+k+'.glb',g=>{g.scene.traverse(c=>{if(c.isMesh){c.castShadow=true;c.receiveShadow=true;}});res(g.scene);},undefined,()=>res(null)));return mcache[k].then(s=>s?s.clone():null);}
function fixMat(m){if(m.isMeshPhongMaterial){m.shininess=4;m.specular=new THREE.Color(0x111111);}}
function load(key,onDone){if(cache[key])return cache[key];const d=A[key];
cache[key]=new Promise(res=>{
const done=(obj,anims)=>{obj.updateMatrixWorld(true);let box=new THREE.Box3().setFromObject(obj);
if(d.bones){box=new THREE.Box3();const v=V3(0,0,0);obj.traverse(c=>{if(c.isBone)box.expandByPoint(c.getWorldPosition(v));});box.min.x=box.min.z=-0.3;box.max.x=box.max.z=0.3;box.max.y*=1.03;box.min.y=0;}
res({key,obj,anims:anims||[],box,skin:d.skin,clips:d.clips});};
const fail=()=>{failed.push(key);res(null);};
if(d.build){buildHouse(modScene,d.build).then(g=>done(g,[]),fail);}
else if(d.fbx){fbxL.load(d.url,o=>{let tex=null;if(d.tex){tex=texL.load(d.tex);tex.encoding=THREE.sRGBEncoding;}
o.traverse(c=>{if(c.isMesh){c.castShadow=true;c.receiveShadow=true;const ms=Array.isArray(c.material)?c.material:[c.material];ms.forEach(m=>{fixMat(m);if(tex){m.map=tex;m.color=new THREE.Color(0xffffff);m.needsUpdate=true;}});}});
done(o,o.animations);},undefined,fail);}
else gltfL.load(d.url,g=>{g.scene.traverse(c=>{if(c.isMesh){c.castShadow=true;c.receiveShadow=true;}});done(g.scene,g.animations);},undefined,fail);
}).then(a=>{if(onDone)onDone();return a;});
return cache[key];}
/* 에셋 한 개를 원하는 키(h)로 복제. 반환: holder (발바닥 기준) */
function inst(a,h,opt){opt=opt||{};const o=a.skin?THREE.SkeletonUtils.clone(a.obj):a.obj.clone();
if(opt.ownMat||opt.tint)o.traverse(m=>{if(m.isMesh){m.material=Array.isArray(m.material)?m.material.map(x=>x.clone()):m.material.clone();}});
const mats=[];o.traverse(m=>{if(m.isMesh)(Array.isArray(m.material)?m.material:[m.material]).forEach(x=>{if(opt.tint&&x.color)x.color.lerp(new THREE.Color(opt.tint),opt.tintAmt||0.5);if(x.emissive)mats.push(x);});});
const size=V3(0,0,0),c=V3(0,0,0);a.box.getSize(size);a.box.getCenter(c);
const pivot=new THREE.Group();pivot.add(o);pivot.position.set(-c.x,-a.box.min.y,-c.z);const holder=new THREE.Group();holder.add(pivot);holder.scale.setScalar(h/size.y);
holder.userData={mats,anims:a.anims,inner:o};return holder;}
function findClip(anims,name){return anims.find(x=>x.name.includes(name))||null;}

/* ---------- 타일 바닥 ---------- */
const FS=72,FN=2048,FK=FN/FS,fcache={};
function rnd(s){return()=>((s=(s*16807)%2147483647)/2147483647);}
function planetGeo(){const g=new THREE.PlaneGeometry(900,900,1,1);g.rotateX(-Math.PI/2);const P=g.attributes.position,U=g.attributes.uv;
for(let i=0;i<P.count;i++){U.setXY(i,P.getX(i)/FS+0.5,0.5-P.getZ(i)/FS);}return g;}
function rrect(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();}
function shade(hex,a){const n=parseInt(hex.slice(1),16),f=1+a,c=v=>Math.max(0,Math.min(255,(v*f)|0));return 'rgb('+c(n>>16&255)+','+c(n>>8&255)+','+c(n&255)+')';}
function paintFloor(z){const cv=document.createElement('canvas');cv.width=cv.height=FN;const g=cv.getContext('2d'),rd=rnd(z.length*131+7),X=u=>(u+FS/2)*FK;
function layer(size,pal,gap,inside,brick,chk,hi){const n=Math.ceil(FS/size)+2;
for(let j=-n;j<n;j++){const ox=brick&&(j&1)?size/2:0;for(let i=-n;i<n;i++){const x0=i*size+ox,z0=j*size;if(!inside(x0+size/2,z0+size/2))continue;
const px=X(x0),pz=X(z0),s=size*FK,gp=s*0.07;g.fillStyle=gap;g.fillRect(px,pz,s,s);
const base=chk?pal[(i+j)&1]:pal[(rd()*pal.length)|0];g.fillStyle=shade(base,(rd()-0.5)*0.07);rrect(g,px+gp,pz+gp,s-2*gp,s-2*gp,s*0.2);g.fill();
if(hi){g.strokeStyle='rgba(255,255,255,0.16)';g.lineWidth=s*0.05;rrect(g,px+gp*1.8,pz+gp*1.8,s-3.6*gp,s-3.6*gp,s*0.17);g.stroke();}}}}
const all=()=>true;
function dots(n,cols,rad,ok){for(let k=0;k<n;k++){const x=(rd()-0.5)*60,zz=(rd()-0.5)*60;if(!ok(x,zz))continue;const c=cols[(rd()*cols.length)|0];
g.fillStyle=c;for(let p=0;p<5;p++){const a=p*1.2566;g.beginPath();g.arc(X(x+Math.cos(a)*rad),X(zz+Math.sin(a)*rad),rad*0.62*FK,0,7);g.fill();}g.fillStyle='#ffd84a';g.beginPath();g.arc(X(x),X(zz),rad*0.55*FK,0,7);g.fill();}}
if(z==='village'){const C0=-8.7,pth=(x,zz)=>(Math.abs(x)<2.7&&zz<17&&zz>-30)||(Math.abs(zz-C0)<2.2&&Math.abs(x)<22)||(Math.abs(x)<9&&zz>2&&zz<12&&false),plz=(x,zz)=>Math.hypot(x,zz-C0)<9.4,inn=(x,zz)=>Math.hypot(x,zz-C0)<5.2,hall=(x,zz)=>Math.abs(x)<8&&zz<-21&&zz>-31,yard=(x,zz)=>Math.abs(x+15)<5&&zz>4&&zz<14;
layer(1.5,['#86b56a','#7aa95f'],'#5f8f4a',all,0,1,0);
dots(120,['#ffffff','#ffd1e0','#fff0a0'],0.11,(x,zz)=>!pth(x,zz)&&!plz(x,zz)&&!hall(x,zz)&&!yard(x,zz));
layer(1.2,['#c8c4d2','#bab6c8','#d2cfdc','#b1adc2'],'#8d89a2',(x,zz)=>pth(x,zz)||plz(x,zz)||hall(x,zz)||yard(x,zz),1,0,1);
layer(1.0,['#7f98c6','#7089ba','#8aa2cc'],'#4a5f8e',inn,0,1,1);
g.strokeStyle='#f2c84a';g.lineWidth=0.34*FK;for(const rr of [9.2,5.0,1.6]){g.beginPath();g.arc(X(0),X(C0),rr*FK,0,7);g.stroke();}
g.strokeStyle='rgba(255,236,160,.9)';g.lineWidth=0.14*FK;g.beginPath();for(let k=0;k<12;k++){const a=k*Math.PI/6;g.moveTo(X(Math.cos(a)*1.6),X(C0+Math.sin(a)*1.6));g.lineTo(X(Math.cos(a)*9.2),X(C0+Math.sin(a)*9.2));}g.stroke();}
else if(z==='field'){const px=zz=>2.6*Math.sin(zz*0.22+1),pth=(x,zz)=>zz<14&&zz>-40&&Math.abs(x-px(zz))<1.6;
layer(1.6,['#a3cf5c','#94c24f'],'#78a73e',all,0,1,0);
dots(260,['#ffffff','#ff9ec4','#ffe27a','#b5a0ff'],0.12,(x,zz)=>!pth(x,zz));
layer(0.9,['#dcb67e','#cfa76c','#e3c18c'],'#a58050',pth,1,0,1);}
else{const cz=-8,arena=(x,zz)=>Math.hypot(x,zz-cz)<14.6;
layer(1.6,['#3a2f63','#32295a'],'#221a40',all,0,1,0);
layer(1.6,['#5a4a92','#4e3f84'],'#2d2352',arena,0,1,1);
g.save();g.shadowColor='#a58bff';g.shadowBlur=26;g.strokeStyle='#d2c2ff';g.lineWidth=0.2*FK;const circ=(r)=>{g.beginPath();g.arc(X(0),X(cz),r*FK,0,7);g.stroke();};
circ(14.2);circ(7.8);circ(1.2);const vt=k=>[X(Math.sin(k*Math.PI/3)*7.8),X(cz-Math.cos(k*Math.PI/3)*7.8)];
[[0,2,4],[1,3,5]].forEach(t=>{g.beginPath();t.forEach((k,n)=>{const p=vt(k);n?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]);});g.closePath();g.stroke();});
for(let k=0;k<6;k++){const p=vt(k);g.beginPath();g.arc(p[0],p[1],0.9*FK,0,7);g.stroke();}g.restore();}
return cv;}
function floorTex(z){if(!fcache[z]){const t=new THREE.CanvasTexture(paintFloor(z));t.encoding=THREE.sRGBEncoding;t.anisotropy=renderer.capabilities.getMaxAnisotropy();t.wrapS=t.wrapT=THREE.ClampToEdgeWrapping;fcache[z]=t;}return fcache[z];}

/* ---------- 구역 데이터 ---------- */
const PI=Math.PI;
const SOLID={inn:3.2,houseS:2.2,houseM:2.9,houseB:2.9,cottage:2.9,well:1.1,lamp:0.4,barrel:0.5,barrelA:0.5,crates:0.8,wagon:1.4,stall:1.2,cart:1.6,anvil:0.6,dummy:0.5,weaponstand:0.7,chest:0.6,cauldron:0.6,bench:0.9,btree1:0.8,btree2:0.8,btree4:0.8,brocks:0.8,tree1:0.8,tree2:0.8,tree3:0.8,birch:0.7,pine:0.8,pine2:0.8,pine3:0.8,autumn:0.8,willow:0.9,rock:0.8,rock2:0.8,rockMoss:0.9,stump:0.5,log:0.6,column:0.9,columnD:0.9,statue:0.9,dead1:0.6,dead2:0.6,bush:0.0};
const SOLID_X={inn:[[-3.6],[3.6]]};
const ZONES={
village:{n:'마을',sky:0xbfe3f2,hemi:[0xffffff,0x7a9a6a,0.85],sun:1.05,center:[0.2,PI],L:19,safe:true,
 items:[['inn',7.6,0.58,PI,0],['houseM',6.2,0.33,PI-0.66,0],['houseB',6.2,0.36,PI+0.7,0],['houseS',5.4,0.64,PI+1.2,0],
 ['well',2.6,0.2,PI+0.05,0.3],['pbanner',2.6,0.4,PI-0.2,0],['pbanner2',2.6,0.4,PI+0.2,0],
 ['stall',2.6,0.27,PI-1.2,0.5],['cart',2.5,0.3,PI+1.05,2.4],['anvil',1.0,0.36,PI-1.0,0],['dummy',1.9,0.24,PI-0.6,0.3],['weaponstand',1.1,0.23,PI-0.4,0],
 ['fence',1.1,0.24,PI-1.3,1.2],['fence',1.1,0.27,PI-1.42,1.0],['barrel',0.8,0.42,PI+0.35,0],['barrelA',0.8,0.44,PI+0.4,0.5],['crates',1.1,0.45,PI-0.3,0.3],['wagon',1.7,0.3,PI+0.4,-1.0],['bench',0.7,0.19,PI+0.5,0.3],
 ['btree1',5,0.7,PI-0.5,0],['btree2',4.6,0.75,PI+0.5,1],['btree4',5.4,0.5,PI-1.25,2],['btree1',5,0.55,PI+1.45,0.5],['btree2',4.4,0.9,PI+0.05,2],
 ['bbush',1.1,0.18,PI-0.45,0],['bbush',1.0,0.23,PI+0.5,1],['bbush',1.2,0.4,PI-0.75,2],['brocks',0.9,0.3,PI-0.85,0]],
 scatter:[['flowers',0.55,24,0.06,0.5],['grass',0.45,30,0.05,0.7]],ring:['brocks','bbush','btree4'],
 npcs:[{k:'robot',h:1.55,th:0.13,ph:PI-0.42,spin:0.6,clip:'Wave',tint:0xff8fb5,talk:['안녕! 필드에서 몬스터 3마리를 잡으면 보스 스테이지 문이 열려.','C로 구르면 잠깐 무적이 돼. 보스가 파동을 쏘면 Space로 점프해서 넘어가!','다치면 우물에서 F를 눌러 쉬어. 체력이 가득 차.']}],
 wells:[{th:0.2,ph:PI+0.05}],
 portals:[{id:'toField',th:0.3,ph:0,to:'field',label:'필드로 가는 문'}]},
field:{n:'필드',sky:0xffe0c0,hemi:[0xfff2dd,0x8a9a5a,0.85],sun:1.1,center:[0.45,PI],L:22,
 items:[['tree1',4.6,0.42,PI-0.75,0],['tree2',5.2,0.5,PI+0.62,1],['autumn',4.6,0.36,PI+1.1,2],['pine',5.4,0.6,PI-0.25,0],['birch',5.2,0.55,PI+0.2,1],['willow',4.8,0.72,PI-1.2,2],['tree3',5,0.8,PI+0.9,0],['autumn',4.4,0.68,PI-0.55,0.5],['pine',5,0.85,PI+0.45,1.5],
 ['bush',0.7,0.2,PI-0.95,0],['berry',0.7,0.34,PI+0.95,1],['bush',0.8,0.42,PI-0.45,2],['rockMoss',1.0,0.28,PI-0.35,0],['rock',0.8,0.2,PI+0.75,1],['stump',0.7,0.31,PI+0.28,0],['log',0.7,0.42,PI-0.15,1.2],['plant',0.5,0.1,PI+0.35,0]],
 scatter:[['flowers',0.55,40,0.05,0.7],['grass',0.45,45,0.04,0.8],['fern',0.7,16,0.05,0.5],['mush',0.4,12,0.05,0.5],['flowers2',0.6,14,0.05,0.5],['clover',0.3,16,0.05,0.5]],ring:['rock','bush','pine','tree1','pine2','tree2'],
 spawns:[['alien',1.226,2.962],['alien',1.007,-2.494],['alien',0.600,2.366],['alien',0.645,-2.288],['alien',1.142,2.608],['alien',0.758,2.942],['alien',1.214,-2.900],['alien',0.980,2.261]],
 portals:[{id:'toVillage',th:0.3,ph:0,to:'village',label:'마을로 돌아가는 문'},{id:'toBoss',th:0.97,ph:PI,to:'boss',label:'보스 스테이지 문',needKills:1}]},
boss:{n:'보스 스테이지',sky:0x2b2650,hemi:[0x9a8aff,0x2a2040,0.8],sun:0.6,night:1,center:[0.31,PI],L:14.2,
 items:[],scatter:[],ring:[],portals:[]}};
(function(){const Z=ZONES.village,C0=-8.7,tp=(x,z)=>[Math.hypot(x,z)/26,Math.atan2(x,z)],it=[];
Object.assign(Z,{n:'마을',sky:0xb7cdea,hemi:[0xf4f6ff,0x6a7ca2,0.92],sun:1.1,center:[-C0/26,PI],L:28});
const face=(x,z)=>Math.atan2(z-C0,-x);
const P=(k,h,x,z,sp,fc)=>{const p=tp(x,z);it.push([k,h,p[0],p[1],fc?face(x,z):(sp||0)]);};
/* 중앙 광장: 거대한 영웅상과 깃발 */
P('statue',6.5,0,C0,0,0);
for(let i=0;i<8;i++){const a=i*PI/4+PI/8,x=Math.sin(a)*7.6,z=C0+Math.cos(a)*7.6;P('pbanner',2.0,x,z,0,1);}
for(let i=0;i<6;i++){const a=i*PI/3,x=Math.sin(a)*11.6,z=C0+Math.cos(a)*11.6;if(Math.abs(x)<4&&z>C0+8)continue;P('column',4.6,x,z,0,0);}
/* 북쪽: 레이드 본부 (여관을 크게) + 양옆 기둥과 조각상 */
P('inn',9.5,0,-31,PI/2*0+face(0,-31)-face(0,-31)+0,1);
for(const sx of[-1,1]){P('column',6.2,sx*8.5,-24,0,0);P('statue',4.2,sx*13,-27,0,1);P('pbanner',2.6,sx*5.2,-23.2,0,1);P('houseB',6.6,sx*20,-27,0,1);}
/* 동서 건물: 병영, 공방, 상점 */
P('houseB',6.8,-19,-15,0,1);P('houseB',6.8,19,-15,0,1);
P('houseM',6.2,-23,-5,0,1);P('houseM',6.2,23,-5,0,1);
P('cottage',5.6,-21,5,0,1);P('cottage',5.6,21,5,0,1);
/* 공방(대장간) */
P('anvil',1.0,-15.5,-10,0.6,0);P('weaponstand',1.2,-15,-13,0,1);P('barrel',0.8,-16.5,-12.5,0,0);P('crates',1.1,-15.2,-7.5,0.4,0);
/* 상점 노점 */
P('stall',2.8,15.5,-10,0,1);P('stall',2.8,16.5,-5.5,0,1);P('cart',2.5,14.5,-1,2.4,0);P('barrel',0.8,17,-8,0,0);P('barrelA',0.8,13.8,-12,0.5,0);
/* 훈련장 */
for(let i=0;i<3;i++)P('dummy',1.9,-17+i*2.6,9,0,1);P('weaponstand',1.2,-12.5,12.5,0,1);P('weaponstand',1.2,-17.5,12.5,0,1);P('bench',0.8,-20,9,0,1);
/* 보급 */
P('wagon',1.7,16,12,-1.0,0);P('crates',1.1,18,10,0.3,0);P('crates',1.1,19.3,11.3,0.8,0);P('barrel',0.8,13,11,0,0);P('bench',0.8,13,2,0,1);P('bench',0.8,-13,2,0,1);
/* 우물 */
P('well',2.6,-6.5,-2.5,0.3,0);
/* 정문: 포탈 양옆 기둥과 깃발 */
for(const sx of[-1,1]){P('column',6.0,sx*4.2,7.8,0,0);P('pbanner',2.4,sx*3.0,8.6,0,1);P('brocks',0.9,sx*6.4,7.2,0,0);}
/* 외곽 기둥 성벽 */
for(let i=0;i<22;i++){const a=PI*0.12+i*(PI*2-PI*0.24)/21,x=Math.sin(a)*26.6,z=C0+Math.cos(a)*26.6;if(z>C0+20&&Math.abs(x)<9)continue;P('column',5.0,x,z,0,0);if(i%2===0){const a2=a+0.05,x2=Math.sin(a2)*26.2,z2=C0+Math.cos(a2)*26.2;P('pbanner',2.2,x2,z2,0,1);}}
Z.items=it;Z.scatter=[['flowers',0.55,16,0.06,0.5],['grass',0.45,22,0.05,0.7]];Z.ring=['brocks','bbush','btree4'];
const nc=(x,z,tint,talk,clip)=>{const p=tp(x,z);return {k:'robot',h:1.55,th:p[0],ph:p[1],spin:face(x,z),clip:clip||'Wave',tint,talk};};
Z.npcs=[
nc(-4,3,0xff8fb5,['[안내 요원 로비] 마을에 온 걸 환영해!','[안내 요원 로비] 정문 포탈로 나가면 사냥터야. 몬스터 1마리만 잡아도 보스 스테이지 문이 열려.','[안내 요원 로비] 방향키를 두 번 누르면 대쉬, 구르기는 C야.']),
nc(0,-22.5,0xffd45a,['[레이드 사령관 가렌] 하늘의 폭군 드래곤이 보스 스테이지에 둥지를 틀었다.','[레이드 사령관 가렌] 앱솔루트 저지먼트를 차징해서 한 방에 베어버려! 그 검기는 보스도 버티지 못한다.','[레이드 사령관 가렌] 필드에서 몬스터를 1마리만 처치하면 보스 스테이지 문이 열린다. 서둘러라.'],'Idle'),
nc(-13.5,-10.5,0xff9a4a,['[대장장이 브론] 칼날은 날카롭게, 마음은 뜨겁게! 아직 무기는 최고 성능이야.','[대장장이 브론] 소드 체이서는 검 200자루가 뒤에서 쏟아지는 스킬이지. 정말 멋있지 않아?']),
nc(14,-7.5,0x7ad98a,['[상인 모아] 어서 와요! 아쉽지만 지금은 물건을 팔지 않아요. 구경만 하세요~','[상인 모아] 우물물을 마시면 체력과 스태미나가 가득 차요. F키를 눌러보세요.']),
nc(-14.8,6.8,0x6fa8ff,['[훈련 교관 레나] 허수아비를 쳐보면서 기본 공격 3타 콤보를 익혀 봐.','[훈련 교관 레나] 라이징 슬래시는 땅에서 검이 지그재그로 솟아올라. 범위가 넓으니 모여 있는 적에게 써!','[훈련 교관 레나] 발상발파는 10번 베어서 주변을 정리하는 스킬이야.'])
];
Z.wells=[(()=>{const p=tp(-6.5,-2.5);return {th:p[0],ph:p[1]};})()];
})();
(function(){const it=ZONES.boss.items,cz=-ZONES.boss.center[0]*26,toP=(x,z)=>[Math.hypot(x,z)/26,Math.atan2(x,z)];
/* 기둥과 조각상은 전투 구역(반지름 14) 바깥 멀리에 둔다. 카메라 시야를 가리지 않게 */
const put=(k,h,rad,a,face)=>{const x=Math.sin(a)*rad,z=cz+Math.cos(a)*rad,p=toP(x,z);it.push([k,h,p[0],p[1],face?Math.atan2(-(cz-z),-x):0]);};
for(let i=0;i<12;i++){const a=i*Math.PI/6;put(i%4===1?'columnD':'column',i%4===1?3.6:5.4,24,a,0);put('banner',2.8,23,a+Math.PI/12,1);}
for(let k=0;k<4;k++)put('statue',3.6,21.5,Math.PI/4+k*Math.PI/2,1);
for(let k=0;k<5;k++)put('bricks',0.9,19.5,0.4+k*1.3,0);})();

function floorXY(n){const sn=Math.hypot(n.x,n.z),th=Math.atan2(sn,n.y),s=R*th;return sn<1e-14?[0,0]:[s*n.x/sn,s*n.z/sn];}
function onPath(zone,n){const [x,z]=floorXY(n);
if(zone==='village'){return (Math.abs(x)<3&&z<17&&z>-30)||(Math.abs(z+8.7)<2.5&&Math.abs(x)<22)||Math.hypot(x,z+8.7)<9.8||(Math.abs(x)<8.5&&z<-21&&z>-31);}
if(zone==='field'){const px=2.6*Math.sin(z*0.22+1);return z<14&&z>-40&&Math.abs(x-px)<1.9;}
return false;}
window.W={SOLID_X,floorXY,onPath,R,C,V3,clamp,renderer,scene,cam,stage,orient,toN,arc,dirTo,stepOn,moveAlong,turnToward,rotAbout,pointAt,load,inst,findClip,failed,planetGeo,floorTex,ZONES,SOLID,rnd,PI,cache};
})();
