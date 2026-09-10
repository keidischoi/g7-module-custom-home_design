# Changelog

형식은 [Keep a Changelog](https://keepachangelog.com/ko/1.1.0/)를 따르며,
[Semantic Versioning](https://semver.org/lang/ko/)을 준수합니다.

## [0.2.4] - 2026-09-10

### Fixed

- **홈 하단 박스 폭**: `content_max_width_px`가 `#main_content`뿐 아니라 `#main_content_area` 아래 `max-w-7xl` 콘텐츠 컬럼(홈 mid/lower·feat `ad_global_top/bottom` 내부 Container 등)에도 동일 적용
- CSS 변수 `--chd-content-max-width` 하나로 헤더/푸터/사업자 고지 inner와 함께 구동; full-bleed(`w-full`만 있고 max-w 없음) 히어로는 건드리지 않음; `margin-inline: auto` 포함
- **관리자 저장 후 토글/JSON 초기화**: `onSuccess`에서 `$response.data` 이중 래핑으로 form 전체가 비어 덮이던 문제 수정 — 필드를 deep-unwrap(`$response.data?.data ?? $response.data ?? $response`)으로만 패치하고, 실패 시 `_local.form` 값 유지
- `*_json` 필드가 배열/객체로 전송돼도 Request에서 문자열로 재인코딩; boolean은 명시 캐스팅
- **`chd_home_design` 불러오기 실패**: 스크립트 id를 `chd_home_design_js`로 변경(커스텀 Component 아님). `AssetController`가 bundled/일반 설치 경로를 모두 탐색

### Changed

- **「모듈 사용」체크박스 제거**: G7 모듈 활성화만으로 동작. `settings.enabled` 게이트 제거(리스너/JS). 컬럼은 저장 시 항상 `true`로 유지
- JSON Textarea `rows=16` + `min-h-[320px]`
- `HomeDesignLayoutListener::patchContentColumnWidths` — main_content_area 내 max-w-* 노드에 inline maxWidth + `data-chd-max-width`
- `home-design.js` 선택자 확장 + 매칭 노드에 inline maxWidth 재적용 (SPA debounce 포함)

## [0.2.3] - 2026-09-10

### Fixed

- **관리자 설정 JSON 필드 바인딩**: `hide_header_board_slugs_json`, `footer_link_groups_json` Textarea에 `value`/`onChange`를 `_local.form`에 연결 — 저장 후에도 값이 유지됨
- `content_max_width_px` Input도 동일하게 controlled 바인딩
- 저장 `onSuccess`에서 `toAdminArray` 응답의 `*_json`·폭 필드를 form에 명시 반영

### Changed

- 설정 페이지 wrapper를 `max-w-3xl` → `w-full max-w-none` (전체 너비)

## [0.2.2] - 2026-09-10

### Changed

- **사업자 고지**: 관리자에서 상호/대표/번호/주소/전화/이메일 수동 입력 필드 제거. 토글 **「사업자 고지 블록 표시」**(`business_info_enabled`)만 유지
- 표시 ON 시 내용은 **sirsoft-ecommerce** `basic_info`에서 조회 (`module_setting` → storage fallback). feat와 동일 매핑: `company_name`, `ceo_name`, `business_number`, `mail_order_number`, `base_address`+`detail_address`, `phone`, `email`
- 공개 API `business_info`도 이커머스 값을 반환 (JS 1회 fallback용). DB `business_*` 문자열 컬럼은 더 이상 채우지 않음(레거시 유지)
- **푸터 linkGroups**: 관리자 힌트/placeholder에 JSON 스키마 `{title, links:[{label,href}]}` 문서화. 비우면 테마 기본, 설정 시 Footer `linkGroups` 덮어쓰기. FAQ 예시 **`/faq`** (공식 기본 `/page/faq` 대신 feat 경로)

### Notes

- 이커머스 모듈이 없거나 basic_info가 비어 있으면 고지 블록은 빈 마운트로 남습니다.

## [0.2.1] - 2026-09-10

### Fixed

- **무한 로딩**: `home-design.js` MutationObserver가 사업자 고지 DOM을 재주입하고 React 푸터가 remount되며 제거 → 재주입 루프를 끊기 위해 **MutationObserver 완전 제거**
- SPA `popstate` / `pushState` / `replaceState` 시 **300ms debounce 후 CSS만 재적용** (사업자 HTML wipe/rebuild 금지)
- 동일 signature의 사업자 블록이 이미 있으면 JS가 다시 만들지 않음; 마운트가 비어 있을 때만 1회 fallback 주입

### Changed

- `HomeDesignLayoutListener`가 `chd_business_info_mount` children을 설정 기반 **서버 렌더(Div/P)** 로 채움 → JS HTML 주입 의존 축소
- 신규 설치 시 `enabled` 기본값 **false** (migration seed + service fallback) — 관리자에서 명시 활성화
- `AssetController` 경로 깊이 재확인: `Public/` → `dirname(__DIR__, 4)` = 모듈 루트 (유지)

### Emergency disable

사이트가 계속 멈추면:

```bash
php82 artisan module:disable custom-home_design
php82 artisan hooks:clear && php82 artisan cache:clear
```

## [0.2.0] - 2026-09-10

### Added

- `home_design_settings` 마이그레이션·싱글톤 모델 (기본 `content_max_width_px=1240`, `hide_header_board_slugs=["qna","inquiry"]`)
- Admin GET/PUT API + `/admin/home-design` 설정 폼·메뉴·라우트
- `HomeDesignLayoutListener` — 공식 `_user_base` 패치 (콘텐츠 폭, 보드 slug 필터, footer linkGroups, 스크립트)
- Layout extension `home_design__user_base` + `AssetController` / `home-design.js`
- 공개 `GET settings` API (JS용)
- 데스크톱 상단 탭 네비 CSS 숨김, 푸터 직전 사업자 고지 HTML 주입

### Notes

- 타깃: 공식 gnuboard sirsoft-basic (feat 테마 React 비의존)
- 동작 참고: `keidischoi/g7-template-sirsoft-basic` `feat/open-in-new-tab-1.1.51`

## [0.1.0] - 2026-09-10

### Added

- 모듈 스캐폴드 (`module.json`, `module.php`, `composer.json`)
