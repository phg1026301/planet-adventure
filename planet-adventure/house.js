/* 모듈식 집 조립기: Quaternius Medieval Village MegaKit 조각(벽 2m 격자)을 이어 붙여 집 한 채를 만든다.
   mod(key) 는 불러온 조각의 복제본(Object3D)을 돌려주는 함수다. */
window.buildHouse=async function(mod,o){
const nx=o.nx,nz=o.nz,g=new THREE.Group(),put=async(k,x,y,z,ry,s)=>{const m=await mod('village/'+k);if(!m)return null;m.position.set(x,y,z);m.rotation.y=ry||0;if(s)m.scale.setScalar(s);g.add(m);return m;};
const brick=o.brick,P=brick?'Wall_UnevenBrick_':'Wall_Plaster_',wnd=o.round===false?'Window_Wide_Flat':'Window_Wide_Round',doorK=brick?'Wall_UnevenBrick_Door_Round':'Wall_Plaster_Door_Round';
const side=async(len,cx,cz,ry,door,seed)=>{for(let i=0;i<len;i++){const off=(i-(len-1)/2)*2;const x=cx+Math.cos(ry)*off,z=cz-Math.sin(ry)*off;
let k=P+'Straight';if(door&&i===Math.floor((len-1)/2))k=doorK;else if(door!==null&&len>1)k=((i+seed)%3===1&&!brick)?'Wall_Plaster_WoodGrid':(brick?'Wall_UnevenBrick_Window_Wide_Round':'Wall_Plaster_Window_Wide_Round');
else if(len>1&&(i+seed)%2===0)k=brick?'Wall_UnevenBrick_Window_Wide_Round':'Wall_Plaster_Window_Wide_Round';
await put(k,x,0,z,ry);
if(door&&i===Math.floor((len-1)/2)){const d=await put('Door_1_Round',x+Math.cos(ry)*-0.53,0,z-Math.sin(ry)*-0.53,ry);}}};
/* 앞(+z), 뒤(-z), 왼쪽(-x), 오른쪽(+x) */
await side(nx,0,nz-0.09,0,true,0);
await side(nx,0,-nz+0.09,Math.PI,null,1);
await side(nz,-nx+0.09,0,-Math.PI/2,null,0);
await side(nz,nx-0.09,0,Math.PI/2,null,1);
for(const [x,z] of[[-nx,-nz],[nx,-nz],[-nx,nz],[nx,nz]])await put(brick?'Corner_Exterior_Brick':'Corner_Exterior_Wood',x,0,z,0);
const rk=nx===nz?`Roof_RoundTiles_${nx*2}x${nz*2}`:`Roof_RoundTiles_${Math.min(nx,nz)*2}x${Math.max(nx,nz)*2}`;
const roofK=['Roof_RoundTiles_4x4','Roof_RoundTiles_6x6','Roof_RoundTiles_8x8','Roof_RoundTiles_8x12'].includes(rk)?rk:'Roof_RoundTiles_8x8';
const r=await put(roofK,0,3.05,0,nx>nz?Math.PI/2:0);
/* 지붕 앞뒤 삼각형 벽 (폭 4, 6, 8 용 조각이 있다) */
const gw=nx>nz?nz:nx,gk={2:'Roof_Front_Brick4',3:'Roof_Front_Brick6',4:'Roof_Front_Brick8'}[gw];
if(gk){const alongZ=!(nx>nz),len=alongZ?nz:nx;
if(alongZ){await put(gk,0,3.0,nz-0.05,0);await put(gk,0,3.0,-nz+0.05,Math.PI);}else{await put(gk,nx-0.05,3.0,0,Math.PI/2);await put(gk,-nx+0.05,3.0,0,-Math.PI/2);}}
if(o.chimney!==false){const wd=Math.min(nx,nz),ap={2:3.73,3:4.89,4:6.0}[wd]||5,hw={2:2.76,3:4.12,4:4.98}[wd]||4,cx=hw*0.45,ry=3.05+ap-(ap+0.65)*cx/hw;
if(nx>nz)await put('Prop_Chimney',-nx*0.3,ry-0.6,cx,0);else await put('Prop_Chimney',cx,ry-0.6,-nz*0.3,0);}
g.userData.foot=Math.max(nx,nz)*2;return g;};
