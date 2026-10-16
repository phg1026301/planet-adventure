/* 에셋 목록. 모델을 바꾸고 싶으면 url만 새 파일 경로로 바꾸면 돼.
   skin: 뼈대 애니메이션 모델, clips: 모델 안의 애니메이션 이름, build: 조각을 조립해 만드는 건물 */
const MB={idle:'Idle',walk:'Walk',atk:'Punch',hit:'HitReact',die:'Death'},MF={idle:'Flying_Idle',walk:'Fast_Flying',fly:'Flying_Idle',atk:'Headbutt',hit:'HitReact',die:'Death'};
const nat=(f)=>({url:'assets/v2/nature/'+f+'.glb'}),prp=(f)=>({url:'assets/v2/props/'+f+'.glb'});
window.ASSETS={
  /* 플레이어 (KayKit Adventurers, CC0) */
  warrior:{url:'assets/v2/chars/Knight.glb',skin:1},
  mage:{url:'assets/v2/chars/Mage.glb',skin:1},
  animGen:{url:'assets/v2/chars/Rig_Medium_General.glb',skin:1},
  animMove:{url:'assets/v2/chars/Rig_Medium_MovementBasic.glb',skin:1},
  sword:{url:'assets/v2/weapons/sword_1handed.glb'},
  shield:{url:'assets/v2/weapons/shield_badge_color.glb'},
  staff:{url:'assets/v2/weapons/staff.glb'},
  ualSword:{url:'assets/v2/chars/UALsword.glb',skin:1},
  robot:{url:'assets/chars/robot.glb',skin:1},
  /* 몬스터와 보스 (Quaternius Ultimate Monsters, CC0) */
  cactus:{url:'assets/v2/monsters/Cactoro.glb',skin:1,clips:MB},
  alien:{url:'assets/v2/monsters/Alien.glb',skin:1,clips:MB},
  mushroom:{url:'assets/v2/monsters/MushroomKing.glb',skin:1,clips:MB},
  orc:{url:'assets/v2/monsters/Orc.glb',skin:1,clips:MB},
  dino:{url:'assets/v2/monsters/Dino.glb',skin:1,clips:MB},
  demon:{url:'assets/v2/monsters/Demon.glb',skin:1,clips:MB},
  bee:{url:'assets/v2/monsters/Armabee.glb',skin:1,clips:MF},
  bat:{url:'assets/v2/monsters/Hywirl.glb',skin:1,clips:MF},
  ghost:{url:'assets/v2/monsters/Ghost.glb',skin:1,clips:MF},
  dragon:{url:'assets/v2/monsters/Dragon_Evolved.glb',skin:1,clips:MF},
  /* 자연 (Quaternius Stylized Nature MegaKit, CC0) */
  tree1:nat('CommonTree_1'),tree2:nat('CommonTree_2'),tree3:nat('CommonTree_4'),birch:nat('CommonTree_3'),tree5:nat('CommonTree_5'),
  pine:nat('Pine_1'),pine2:nat('Pine_2'),pine3:nat('Pine_3'),pine4:nat('Pine_4'),
  autumn:nat('TwistedTree_1'),willow:nat('TwistedTree_3'),twisted2:nat('TwistedTree_2'),
  dead1:nat('DeadTree_1'),dead2:nat('DeadTree_2'),dead3:nat('DeadTree_3'),
  bush:nat('Bush_Common_Flowers'),berry:nat('Bush_Common'),fern:nat('Fern_1'),plant:nat('Plant_1_Big'),plant2:nat('Plant_7'),
  flowers:nat('Flower_3_Group'),flowers2:nat('Flower_4_Group'),clover:nat('Clover_1'),grass:nat('Grass_Common_Tall'),grassS:nat('Grass_Common_Short'),wisp:nat('Grass_Wispy_Tall'),
  rock:nat('Rock_Medium_1'),rock2:nat('Rock_Medium_2'),rockMoss:nat('Rock_Medium_3'),pebble:nat('Pebble_Round_1'),pebble2:nat('Pebble_Round_3'),
  mush:nat('Mushroom_Common'),mush2:nat('Mushroom_Laetiporus'),stump:nat('Mushroom_Laetiporus'),log:nat('Rock_Medium_2'),
  pathR:nat('RockPath_Round_Wide'),pathS:nat('RockPath_Square_Wide'),
  /* 보스방 (Kenney, CC0) */
  column:{url:'assets/kenney/column.glb'},columnD:{url:'assets/kenney/column-damaged.glb'},banner:{url:'assets/kenney/banner.glb'},statue:{url:'assets/kenney/statue.glb'},bricks:{url:'assets/kenney/bricks.glb'},
  /* 마을: 집은 Quaternius Medieval Village MegaKit 조각을 조립한다 */
  houseS:{build:{nx:2,nz:2}},houseM:{build:{nx:3,nz:3}},houseB:{build:{nx:3,nz:3,brick:1}},inn:{build:{nx:4,nz:6}},
  cottage:{build:{nx:3,nz:3}},
  well:{url:'assets/village/waterwell.glb'},lamp:prp('Torch_Metal'),fence:{url:'assets/v2/village/Prop_WoodenFence_Single.glb'},
  barrel:prp('Barrel'),crates:prp('Crate_Wooden'),wagon:{url:'assets/v2/village/Prop_Wagon.glb'},
  stall:prp('Stall_Empty'),cart:prp('Stall_Cart_Empty'),bench:prp('Bench'),anvil:prp('Anvil_Log'),chest:prp('Chest_Wood'),cauldron:prp('Cauldron'),dummy:prp('Dummy'),weaponstand:prp('WeaponStand'),
  pbanner:prp('Banner_1'),pbanner2:prp('Banner_2'),barrelA:prp('Barrel_Apples'),crateM:prp('Crate_Metal'),bucket:prp('Bucket_Wooden_1'),pot:prp('Pot_1'),
  chandelier:prp('Chandelier'),torch:prp('Torch_Metal'),
  btree1:nat('CommonTree_1'),btree2:nat('CommonTree_2'),btree4:nat('CommonTree_5'),bbush:nat('Bush_Common_Flowers'),brocks:nat('Rock_Medium_2')
};
