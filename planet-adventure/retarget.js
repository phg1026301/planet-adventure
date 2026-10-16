/* 다른 뼈대(Quaternius UAL)의 애니메이션을 KayKit 캐릭터 뼈대로 옮기는 도구.
   월드 회전 변화량을 계산해 대응 뼈에 적용하고 30fps로 샘플링해서 새 클립을 만든다. */
(function(){
const MAP=[['hips','pelvis'],['spine','spine_02'],['chest','spine_03'],['head','Head'],
['upperarml','upperarm_l'],['lowerarml','lowerarm_l'],['handl','hand_l'],['upperarmr','upperarm_r'],['lowerarmr','lowerarm_r'],['handr','hand_r'],
['upperlegl','thigh_l'],['lowerlegl','calf_l'],['footl','foot_l'],['toesl','ball_l'],['upperlegr','thigh_r'],['lowerlegr','calf_r'],['footr','foot_r'],['toesr','ball_r']];
const clean=n=>n.replace(/[.\[\]:\/]/g,'');
window.retargetClips=function(srcScene,srcAnims,tgtRoot,names,fps){
fps=fps||30;const src=THREE.SkeletonUtils?THREE.SkeletonUtils.clone(srcScene):srcScene.clone();
const sb={},tb={};src.traverse(o=>{sb[clean(o.name)]=o;});tgtRoot.traverse(o=>{if(o.name)tb[clean(o.name)]=o;});
src.updateMatrixWorld(true);tgtRoot.updateWorldMatrix(true,true);
const pairs=MAP.filter(p=>sb[clean(p[1])]&&tb[p[0]]);
const Q=()=>new THREE.Quaternion();
const sRest=pairs.map(p=>sb[clean(p[1])].getWorldQuaternion(Q())),tRest=pairs.map(p=>tb[p[0]].getWorldQuaternion(Q()));
const tLocalRest=pairs.map(p=>tb[p[0]].quaternion.clone());
const mx=new THREE.AnimationMixer(src),out=[];
for(const nm of names){const clip=srcAnims.find(c=>c.name===nm);if(!clip)continue;
const act=mx.clipAction(clip);act.play();const n=Math.max(2,Math.ceil(clip.duration*fps)+1),times=[],vals=pairs.map(()=>[]);
for(let f=0;f<n;f++){const t=Math.min(clip.duration,f/fps);times.push(t);act.time=t;act.paused=true;mx.update(0);src.updateMatrixWorld(true);
for(let i=0;i<pairs.length;i++){const sw=sb[clean(pairs[i][1])].getWorldQuaternion(Q());
const d=sw.multiply(sRest[i].clone().invert());const tw=d.multiply(tRest[i]);
const tbn=tb[pairs[i][0]];tbn.parent.updateWorldMatrix(true,false);const pw=tbn.parent.getWorldQuaternion(Q()).invert();
tbn.quaternion.copy(pw.multiply(tw));tbn.updateWorldMatrix(false,true);
vals[i].push(tbn.quaternion.x,tbn.quaternion.y,tbn.quaternion.z,tbn.quaternion.w);}}
act.stop();mx.uncacheAction(clip);
const tracks=pairs.map((p,i)=>new THREE.QuaternionKeyframeTrack(tbOriginalName(tb[p[0]])+'.quaternion',times,vals[i]));
out.push(new THREE.AnimationClip('RT_'+nm,clip.duration,tracks));
pairs.forEach((p,i)=>tb[p[0]].quaternion.copy(tLocalRest[i]));tgtRoot.updateWorldMatrix(true,true);}
return out;};
function tbOriginalName(o){return o.name;}
})();
