# 플래닛 어드벤처 (3D 웹 액션 RPG) 인수인계

## 프로젝트 개요
- 부트캠프(생성형 AI 마케팅) 5일 개인 프로젝트: 배포 포트폴리오 사이트 + PPT + 라이브 데모
- Three.js r128(UMD) 기반 3D 웹 액션 RPG, 귀여운 스타일. 사용자는 한국어 사용.
- 배포: https://planet-adventure.vercel.app (GitHub phg1026301/planet-adventure, Vercel Root Directory = `planet-adventure`)
- Claude 아티팩트 버전: https://claude.ai/artifact/5jiW79GhJ44FJYHZNsLUZb (v81)

## 파일 구조 (planet-adventure/ 폴더)
- index.html: HUD/CSS (#lootHud 골드, .fl 데미지 숫자, .fl.cr CRITICAL, 보스바)
- game.js: 메인 로직. 하나의 클로저, `window.__g`로 디버그 핸들 노출
- world.js / map.js: 구형 월드, 존, 카메라, 맵
- 아티팩트 배포 시 `.glb`를 `.mp3`로 sed 치환해서 올림

## 월드/코드 개념
- 구체 월드(R=100000, 국소적으로 평면): 단위벡터 n + 접선 f. 헬퍼: wp, orient, moveAlong, dirTo, arc, pointAt
- FX: addFx, ringBurst, sparkFx, slamFx, shake, hitstop, floater, decalRing 등
- 플레이어 HP 12000, hurt(d)는 x100. 피격 쿨다운은 공격 주체별(pl.hm, 0.65초)
- 필드 몬스터: 기본 공격 6대에 사망, 16마리 유지(5초마다 리젠, 포탈 15 이상 거리, 플레이어 11 이상 거리)
- 보스: Lv.100 하늘의 폭군 드래곤. 패턴 순서 fire→charge→wave→meteor 순환. 2페이즈 50% 이하, 체력바 100줄
- 스킬: 앱솔루트 저지먼트(A, 자동 조준), 라이징 슬래시(S), 발상발파(D), Q 추격, W 비, 기간틱 슬래시(V)
- 기간틱 슬래시: 50연참(점점 가속), 적을 앞으로 끌어옴, 보스 2페이즈에선 1타당 체력바 1줄 감소, 마지막 타격은 즉사
- 궁극기 사용 중엔 적/보스 패턴 정지(ultClear, ultF)
- 드롭: 코인 4~6개(합계 133,000~180,000) + 경험치 구슬. 지면에 안착, 약 1초 후 8m 안에서 느린 자석 흡수. 좌상단은 골드만 표시

## 배포 방법 (사용자가 zip을 받아 PowerShell로 적용)
```
Expand-Archive $HOME\Downloads\planet-adventure-v2.zip $HOME\v2tmp -Force
Copy-Item $HOME\v2tmp\* $HOME\planet-adventure\planet-adventure\ -Recurse -Force
Remove-Item $HOME\v2tmp -Recurse -Force
cd $HOME\planet-adventure
git add -A
git commit -m "메시지"
git push
```
푸시 후 Vercel 배포 완료를 기다리고 Ctrl+F5.

## 작업 규칙 (사용자 선호)
- 한국어로 답변. 변경 후엔 짧은 요약 + 배포 명령 제공
- 클로드 환경은 화면이 약 1fps라 체감/속도/타이밍은 검증 불가임을 항상 명시
- 요청하지 않은 기능은 추가하지 말 것

## 미확인 사항 (실제 브라우저 검증 필요)
넉백, 흔들림 감소, 렉 개선, 기간틱 슬래시 모션/속도/끌어오기 거리, 보스 경고 길이, 드롭 시각/자석 속도

## 보류 중
- Firefly → 3D 캐릭터 파이프라인(ComfyUI). 집 RTX 3060 VRAM 확인 필요. 노트북만 있으면 클라우드 GPU(Comfy Cloud/RunComfy 등) 검토
