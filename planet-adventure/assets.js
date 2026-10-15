/* 에셋 목록. 모델을 바꾸고 싶으면 url만 새 파일 경로로 바꾸면 돼.
   h: 게임 안에서의 키(미터), skin: 뼈대 애니메이션 모델, fbx: FBX 파일, tex: 따로 입히는 텍스처 */
window.ASSETS={
  /* 플레이어 */
  warrior:{url:'assets/chars/paladin.glb',skin:1,bones:1},
  mage:{url:'assets/chars/sorceror.glb',skin:1,bones:1},
  sword:{url:'assets/weapons/Sword_Golden.fbx',fbx:1},
  shield:{url:'assets/weapons/Shield_Round.fbx',fbx:1},
  robot:{url:'assets/chars/robot.glb',skin:1},
  /* 몬스터와 보스 */
  mushroom:{url:'assets/monsters/Mushroom.fbx',fbx:1,tex:'assets/monsters/Mushroom_Texture.png',skin:1},
  alien:{url:'assets/monsters/Alien.fbx',fbx:1,tex:'assets/monsters/Alien_Texture.png',skin:1},
  cactus:{url:'assets/monsters/Cactus.fbx',fbx:1,tex:'assets/monsters/Cactus_Texture.png',skin:1},
  bee:{url:'assets/monsters/Bee.fbx',fbx:1,tex:'assets/monsters/Bee_Texture.png',skin:1},
  bat:{url:'assets/monsters/Bat.fbx',fbx:1,tex:'assets/monsters/Bat_Texture.png',skin:1},
  dragon:{url:'assets/monsters/YellowDragon.fbx',fbx:1,tex:'assets/monsters/YellowDragon_Texture.png',skin:1},
  /* 자연 */
  tree1:{url:'assets/nature/CommonTree_1.fbx',fbx:1},tree2:{url:'assets/nature/CommonTree_2.fbx',fbx:1},tree3:{url:'assets/nature/CommonTree_3.fbx',fbx:1},
  pine:{url:'assets/nature/PineTree_1.fbx',fbx:1},birch:{url:'assets/nature/BirchTree_1.fbx',fbx:1},autumn:{url:'assets/nature/CommonTree_Autumn_1.fbx',fbx:1},willow:{url:'assets/nature/Willow_1.fbx',fbx:1},
  bush:{url:'assets/nature/Bush_1.fbx',fbx:1},berry:{url:'assets/nature/BushBerries_1.fbx',fbx:1},flowers:{url:'assets/nature/Flowers.fbx',fbx:1},grass:{url:'assets/nature/Grass.fbx',fbx:1},
  plant:{url:'assets/nature/Plant_1.fbx',fbx:1},rock:{url:'assets/nature/Rock_1.fbx',fbx:1},rockMoss:{url:'assets/nature/Rock_Moss_1.fbx',fbx:1},stump:{url:'assets/nature/TreeStump.fbx',fbx:1},log:{url:'assets/nature/WoodLog.fbx',fbx:1},
  /* 보스방 (Kenney) */
  column:{url:'assets/kenney/column.glb'},columnD:{url:'assets/kenney/column-damaged.glb'},banner:{url:'assets/kenney/banner.glb'},statue:{url:'assets/kenney/statue.glb'},bricks:{url:'assets/kenney/bricks.glb'},
  /* 마을 (Babylon.js Village Pack) */
  cottage:{url:'assets/village/cottage.glb'},inn:{url:'assets/village/inn.glb'},well:{url:'assets/village/waterwell.glb'},lamp:{url:'assets/village/lightPost1.glb'},fence:{url:'assets/village/fence.glb'},
  barrel:{url:'assets/village/barrel.glb'},crates:{url:'assets/village/crateStack.glb'},wagon:{url:'assets/village/wagon.glb'},
  btree1:{url:'assets/village/tree1.glb'},btree2:{url:'assets/village/tree2.glb'},btree4:{url:'assets/village/tree4.glb'},bbush:{url:'assets/village/bush1.glb'},brocks:{url:'assets/village/rocks2.glb'}
};
