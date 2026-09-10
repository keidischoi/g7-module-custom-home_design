# Changelog

형식은 [Keep a Changelog](https://keepachangelog.com/ko/1.1.0/)를 따르며,
[Semantic Versioning](https://semver.org/lang/ko/)을 준수합니다.

## [0.2.6] - 2026-09-10

### Fixed

- **DB 저장 실패 (핵심)**: 관리자 PUT이 싱글톤 `home_design_settings` id=1에 **실제로 upsert**되도록 `HomeDesignSettingService::update()`를 Query Builder `update`/`insert`로 재작성. Eloquent `fill`/`save` 무반응·누락 컬럼 SQL 오류를 우회. JSON 컬럼은 QB용으로 명시 `json_encode`. 저장 후 id=1 재조회로 검증.
- **체크박스 false 미전송**: 레이아웃 엔진이 JSON `false` 키를 생략하는 경우 → FormRequest에서 누락 bool을 **false로 merge**. 관리자 body는 **0/1 정수**로 전송(생략 불가). `(bool)"false"` PHP 함정 유지 방지.
- **마이그레이션 미실행**: 테이블 없으면 명확한 500 메시지(`php82 artisan migrate --force`). 000001은 `hasTable` + id=1 seed 가드. 000002 미적용 시 `header_*` 컬럼만 스킵하고 나머지 필드는 저장.
- **get() never fatal**: 테이블/쿼리 실패 시 인메모리 기본값. update는 테이블 필수.
- **프론트 적용**: `business_info_enabled=false`면 사업자 블록/마운트 비움. `hide_desktop_top_nav` CSS 선택자 확대 + `html/body.chd-hide-desktop-top-nav`.
- **관리자 UI**: 체크박스 Label 래핑·실불린 onChange; JSON 예시는 help **아래** static Text(placeholder 아님); 저장 onSuccess가 API `toAdminArray` 키로 폼 복원.

### Changed

- 버전 `0.2.6`. 설치 후 **반드시** `php82 artisan migrate --force` (테이블 `home_design_settings`).

## [0.2.5] - 2026-09-10

### Fixed

- **관리자 저장 라운드트립 (모든 필드)**: `HomeDesignSettingService::get()`가 존재하지 않는 `normalizeLegacyHideBoardSlugs()`를 호출해 조회/저장이 전부 실패하던 치명 버그 수정. 메서드 구현 + 레거시 `["qna","inquiry"]` → `[]` 리셋
- **체크박스/불리언 저장**: `(bool)"false" === true` PHP 함정 제거 — FormRequest/Service 공통 `coerceBool()`. onSuccess는 `!!missing→false` 대신 `?? _local.form` 폴백으로 토글 유지 (`hide_desktop_top_nav`, `business_info_enabled`, `header_*` 포함)
- **JSON Textarea**: `rows=18` + `min-h-[18rem] h-72` + inline `height/minHeight: 18rem` (접혀 보이지 않게)
- **게시판 기본 숨김 제거**: `hide_header_board_slugs` 기본 `[]`. 마이그레이션이 레거시 기본값만 `[]`로 리셋
- **홈 중간(미드) 박스 폭**: `layout_name=home`도 패치 대상. home 루트 `Container`와 중첩 Container에 `style.maxWidth/width` 주입. `style.maxWidth` 하드코드·모든 responsive breakpoint의 `max-w-*` 제거 후 설정 px 적용. JS 선택자·`!important`로 mid/lower·`max-w-*` 강제

### Added

- **헤더 검색 아이콘 모드** (`header_search_icon_mode`, 기본 ON): 가운데 검색창 숨김, 우측 액션 클러스터(장바구니 왼쪽) 돋보기 → 클릭 시 패널 슬라이드
- **다크모드 클릭 즉시 토글** (`header_theme_click_toggle`, 기본 ON): 드롭다운 숨김, `g7_color_scheme` + `data-theme`/`dark`로 light↔dark. `G7Core.dispatch(setTheme)` 우선

### Changed

- `hide_desktop_top_nav`는 전체 상단 탭 네비 CSS 숨김으로 유지(개별 보드 필터와 분리)

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
