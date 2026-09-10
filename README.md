# custom-home_design

Gnuboard7 홈 디자인 애드온 모듈.

- **목적:** 공식 `sirsoft-basic` 테마에서 메뉴 위치·아이콘·홈 화면 디자인을 Event Hook / Layout Extensions로 제공
- **비범위:** 광고 배너 (`custom-ad_slots` 사용)
- **방식:** 테마 파일 직접 수정 없음

## Identifier

`custom-home_design` (vendor: `custom`)

## Status

`0.1.0` — 레포/스캐폴드. 기능 구현은 이어갈 예정.

## Install (서버)

```bash
# 모듈을 modules/ 또는 modules/_bundled 에 배치한 뒤
php82 artisan module:update custom-home_design --source=bundled --force --layout-strategy=overwrite
php82 artisan hooks:clear
php82 artisan cache:clear
```

## Related

- [g7-module-custom-ad_slots](https://github.com/keidischoi/g7-module-custom-ad_slots) — 광고만
- feat 참고: `keidischoi/g7-template-sirsoft-basic` `feat/open-in-new-tab-1.1.51` 의 메뉴·아이콘·홈 디자인 변경분
