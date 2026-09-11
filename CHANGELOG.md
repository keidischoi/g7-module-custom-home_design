# Changelog

형식은 [Keep a Changelog](https://keepachangelog.com/ko/1.1.0/)를 따르며,
[Semantic Versioning](https://semver.org/lang/ko/)을 준수합니다.

## [0.2.16] - 2026-09-11

### Fixed — 페이지별 게시판 숨김 설정 불일치

- 원인: 관리자에서 제외 slug를 변경해도 기존 병합 레이아웃 캐시가 페이지별로
  남아 홈·인기와 다른 메뉴가 서로 다른 필터 설정을 사용했습니다.
- 설정 저장 후 공식 G7 `LayoutExtensionService::invalidateExtensionCache()`를
  호출해 활성 사용자 템플릿의 `_user_base`와 모든 하위 레이아웃을 무효화합니다.
- 확장 캐시 버전도 함께 갱신되어 브라우저가 이전 레이아웃 응답을 계속 사용하지 않습니다.

## [0.2.15] - 2026-09-11

### Fixed — 게시판 일부 제외 시 헤더 메뉴 전체가 사라지는 문제

- 원인: 주입한 필터 표현식 안의 중첩 `function has(){}` 선언은 G7 안전 표현식
  평가기에서 지역 함수로 바인딩되지 않아 평가에 실패했습니다.
- 공식 `sirsoft-basic` 레이아웃이 사용하는 화살표 함수와 `filter/includes` 형태로
  변경했습니다.
- `qna, inquiry` 입력 시 해당 slug만 제외하고 나머지 게시판 메뉴는 유지합니다.

## [0.2.14] - 2026-09-11

### Changed — 게시판 숨김 설정을 slug 입력란으로 변경

- 게시판 체크박스 목록을 쉼표 구분 slug 입력란으로 변경했습니다
  (예: `qna, inquiry`).
- 관리자 화면에서 불필요해진 `board-menu` API 조회를 제거했습니다.
- 입력값은 기존 `hide_header_board_slugs_text` 요청 경로로 저장하며,
  빈 값은 `[]`로 저장되어 모든 게시판을 표시합니다.

## [0.2.13] - 2026-09-10

### Critical — board hide consistent on ALL pages

- **Bug**: home showed qna/inquiry while other pages hid them (or the reverse after clearing DB).
- **Cause**: (1) feat/`_user_base` hardcodes `filter(!['qna','inquiry'])` — Listener only restored
  when `.filter(` was detected on some nodes; (2) JS `hideSlugList` merged stale
  `data-chd-hide-board-slugs` from the DOM even when settings were `[]`; (3) `applyInitial`
  treated empty `[]` as missing and re-filled from cfg.
- **Fix**:
  - Empty `hide_header_board_slugs` → **force** `{{boards.data ?? []}}` on every
    `desktop_header` / Header / `boards.data` iteration+source (all layouts that use chrome).
  - Non-empty → same filter expression on every page (home + board + shop + …).
  - JS: settings array is sole source of truth; empty → `clearHiddenBoardNav()` unhides.
  - Never promote cfg non-empty over API/boot empty `[]`.

If qna/inquiry exist in `/api/modules/sirsoft-board/boards/board-menu` they appear when
unchecked. Official `maxVisibleBoards: 5` may park overflow under “더보기”.

### Fixed — business beside brand + footer icons on official Footer

- Business notice: place **beside** footer brand H3 / logo (“3D Store” 옆), same flex row
  (not under H3). Official Footer has no `businessInfo` render — JS only.
- Footer icons: official Footer ignores `link.icon`. Listener now **always** sets
  `linkGroups` with **emoji-prefixed labels** (admin JSON or Korean defaults).
  JS also prepends emoji if labels lack them. Survives React remount better than SVG-only.

### Changed — admin hide-slugs → checkboxes

- Admin: boards from `board-menu` as checkboxes (checked = hide). Saves slug array.
- Hidden comma-text sync kept for older clients.

### Install

```bash
php82 artisan module:update custom-home_design --source=bundled --force --layout-strategy=overwrite
php82 artisan migrate --force
php82 artisan hooks:clear && php82 artisan cache:clear && php82 artisan route:clear
# verify assets load (must be JS, not HTML 404):
curl -sk "https://YOUR_HOST/api/modules/custom-home_design/assets/home-design.js?v=0.2.13" | head -c 120
# verify hide list (empty = show all including qna/inquiry on EVERY page):
php82 artisan tinker --execute="echo json_encode(\Modules\Custom\HomeDesign\Models\HomeDesignSetting::query()->find(1)?->hide_header_board_slugs);"
# to show qna/inquiry again if still hidden: uncheck in /admin/home-design and save, or:
php82 artisan tinker --execute="\Modules\Custom\HomeDesign\Models\HomeDesignSetting::query()->where('id',1)->update(['hide_header_board_slugs'=>json_encode([])]);"
php82 artisan hooks:clear && php82 artisan cache:clear
```

## [0.2.12] - 2026-09-10

### Critical — no toast when module disabled

- **Removed layout `scripts[]` ids** `chd_home_design_boot_js` / `chd_home_design_js`.
  G7 `TemplateApp.loadLayoutScripts` records failed ids in `AssetFailureNotice`
  ("N개 항목을 불러오지 못했습니다") when the module is disabled or assets 404.
- Listener **strips** any leftover those ids (and matching Component nodes) on every apply.
- Extension `home_design__user_base.json` has **no scripts** and **no injections**.
- JS loads via `module.json` `assets` + `loading.strategy=global` → `dist/js/module.iife.js`
  (ModuleAssetLoader — only while module active). IIFE reads `#chd_home_design_cfg` and
  DOM-injects `home-design.js` (not via layout script loader).
- Inline boot: Listener injects hidden Div `chd_home_design_cfg` with `data-chd-settings` JSON.

If you still see the toast from an older install:

```bash
php82 artisan hooks:clear && php82 artisan cache:clear
```

### Fixed — board hide apply (DB save already OK)

- Listener filter matches **slug / name / id / href** (`/board/{slug}`, `/boards/{slug}`, `bo_table`).
- When slugs **non-empty**, never restore official `{{boards.data ?? []}}`.
- Always overwrite desktop_header.boards **and** mobile `iteration.source` / any `boards.data` source
  (including prior `.filter(` expressions). Covers Header `maxVisibleBoards` / 더보기 (same array).
- Stamps `data-chd-hide-board-slugs` on header; JS fallback hides matching `<a href>` and
  name-matched buttons (board-menu name→slug map).
- `afterExtensions` priority **900** (last wins).

### Changed — footer business + link icons

- Business notice: set Footer `businessInfo` prop (feat); JS places text **under shop-name H3**
  inside footer (official). Removes awkward sibling-before-footer block from 0.2.11.
- Footer linkGroups: auto-enrich `icon` for common hrefs in Service (save) + Listener (apply).
  Official Footer ignores `icon` → JS prepends feat-style SVG icons before labels.

### Install

```bash
php82 artisan module:update custom-home_design --source=bundled --force --layout-strategy=overwrite
php82 artisan migrate --force
php82 artisan hooks:clear && php82 artisan cache:clear && php82 artisan route:clear
# verify board hide still in DB:
php82 artisan tinker --execute="print_r(\Modules\Custom\HomeDesign\Models\HomeDesignSetting::query()->find(1)?->hide_header_board_slugs);"
# verify no layout script ids toast after disable test — and assets route:
curl -sk "https://YOUR_HOST/api/modules/custom-home_design/assets/home-design.js" | head -c 120
```

## [0.2.11] - 2026-09-10

### Simulation (pre-code)

1. **Search**: click `#chd_header_search_toggle` → panel `#chd_header_search_panel` gets
   `.chd-search-open` (max-height/opacity). Input lives in panel `form.chd-search-form`.
   **Root cause of invisible input**: boot + home-design CSS used
   `header.chd-desktop-header form{display:none!important}` which also matched the panel form
   inside the header. Fix: scope hide to `.h-16 > form` (center bar only) and force-show
   `#chd_header_search_panel.chd-search-open form/input`.
2. **Boards (qna/inquiry)**: live DB `hide_header_board_slugs=[]`. Listener must not filter.
   Official `_user_base` uses `{{boards.data ?? []}}` (all boards); feat hardcodes
   `filter(!['qna','inquiry'])`. Empty slugs now **restore** official expression if a leftover
   `.filter(` is present. Note: official `maxVisibleBoards: 5` may park overflow in “더보기”.
3. **Business**: `module_setting('sirsoft-ecommerce','basic_info')` returns real fields
   (company_name, business_number, …) from
   `storage/app/modules/sirsoft-ecommerce/settings/basic_info.json` (no SQL settings table).
   Display bug was mount/merge path — Listener now **always inserts**
   `#chd_business_info_block` as sibling **before** `footer`; JS re-injects if React remounts.

### Fixed

- **Search slide input invisible**: scoped center-form hide; panel form/input forced visible when open.
- **Business notice missing on home** despite `business_info_enabled=1` + filled ecommerce
  `basic_info`: sibling insert before footer + EcommerceSettingsService/`module_setting`/file
  reader + split-field merge; visible fallback text if still empty; JS reinject on ensure/SPA.
- **Boards**: empty `hide_header_board_slugs` restores `{{boards.data ?? []}}` (show qna/inquiry
  unless admin lists them). Official Footer `linkGroups` prop already applied when DB has JSON.

### Changed

- Version `0.2.11`.

### Install

```bash
php82 artisan module:update custom-home_design --source=bundled --force --layout-strategy=overwrite
php82 artisan migrate --force
php82 artisan hooks:clear && php82 artisan cache:clear && php82 artisan route:clear
# verify ecommerce → business mapping:
php82 artisan tinker --execute="print_r(app(\Modules\Custom\HomeDesign\Services\HomeDesignSettingService::class)->getEcommerceBusinessInfo());"
curl -sk "https://YOUR_HOST/api/modules/custom-home_design/settings" | head -c 800
```

## [0.2.10] - 2026-09-10

### Fixed

- **Site HTTP 500 safety**: `HomeDesignLayoutListener` hook entry points
  (`filterChildLayout` / `filterMergedLayout` / `afterExtensions`) and `apply()`
  now swallow **all** `Throwable` and return the original layout.
  Each patch step is isolated. `settings()` soft-fails if the service class /
  container binding is missing (broken 미설치 / half-copied module).
- **Public settings API**: never returns 500 — falls back to safe defaults JSON 200.
- **getEcommerceBusinessInfo()**: outer try/catch → empty array (no throw).

### Emergency (live 500)

```bash
php82 artisan module:disable custom-home_design
php82 artisan hooks:clear
php82 artisan cache:clear
php82 artisan route:clear
# then re-install clean 0.2.10 when ready:
# php82 artisan module:install custom-home_design --source=bundled
```

### Changed

- Version `0.2.10`.

## [0.2.9] - 2026-09-10

### Fixed

- **Priority: 미설치 시 홈 UI 경고**: extension `home_design__user_base`에서 `scripts` 제거.
  boot/home-design JS는 **Listener `ensureScripts`만** 주입(모듈 활성 시에만).
  미설치·라우트 없음 상태에서 `chd_home_design_js` / `chd_home_design_boot_js` 불러오기 실패 토스트가 홈에 뜨지 않음.
  (잔여 확장 캐시는 `hooks:clear && cache:clear` — README)
- **`hide_header_board_slugs` DB 미갱신**: 0.2.8이 admin Input `change`에 onSuccess용 `$response` 식을
  잘못 넣어 `_local.form.hide_header_board_slugs_text`가 타이핑으로 갱신되지 않음.
  → `{{$event.target.value}}` 복구. 저장 경로: PUT body → `settingsPayload()` →
  `parseCommaSeparatedSlugs` → `DB::table(...)->update(['hide_header_board_slugs' => json])`.
- **검색↔다크모드 아이콘 위치 스왑**: 우측 클러스터에서 검색을 ThemeToggle **앞**에 배치 (feat 대비 사용자 요청 swap).
- **검색 슬라이드 패널**: `header` 맨끝이 아니라 **top bar와 nav(홈 메뉴) 사이**에 삽입.
  인라인 maxHeight + 보이도록 CSS 강화. (이전: nav 아래 append → 홈 메뉴 밑에서 미세 움직임만)
- **캐러셀 아래 박스 폭**: `main_content`·max-w 노드에 `chd-content-col` + inline maxWidth,
  JS `setProperty(...,'important')` + full-bleed 캐러셀 제외.
- **푸터 사업자 고지**: ecommerce `basic_info` 읽기 강화(alias/envelope/storage paths);
  mount children 채움 + feat Footer `businessInfo` props 동시 주입; boot.js never-500.
- **AssetController**: boot/home-design 절대 500/HTML 에러 페이지 금지 (항상 JS 200).
  `dirname(__DIR__, 4)` 모듈 루트 (ad_slots와 동일). routes에 `.js` + extension-less alias.

### Changed

- Version `0.2.9`. `module.php`에 명시적 `getRoutes()`.
- README: **반드시 module:install** (미설치면 route:list 0개 / assets 404), 검증 curl·route:list,
  uninstall 후 `hooks:clear && cache:clear`.

### Install / verify

```bash
# 미설치면 먼저:
php82 artisan module:install custom-home_design --source=bundled
# 이미 설치:
php82 artisan module:update custom-home_design --source=bundled --force --layout-strategy=overwrite
php82 artisan migrate --force
php82 artisan hooks:clear && php82 artisan cache:clear && php82 artisan route:clear
php82 artisan route:list --path=custom-home_design
curl -sk "https://YOUR_HOST/api/modules/custom-home_design/assets/boot.js" | head -c 200
```

## [0.2.8] - 2026-09-10

### Fixed

- **home-design.js SyntaxError**: stray extra `}` after `refresh()` prevented the entire script from parsing — search icon mode + theme click toggle never ran on any page (including home).
- **Admin "헤더에서 숨길 게시판 slug" disappears after save**: `normalizeLegacyHideBoardSlugs()` on every `get()` treated intentional `qna, inquiry` as the pre-0.2.5 seed and wiped DB to `[]`. Removed runtime wipe (one-time reset stays in migration `000002` only). `toAdminArray()` / onSuccess keep `hide_header_board_slugs_text` as comma-joined string.
- **Official Header DOM**: composite `Header` drops layout node `id`, so `#desktop_header` was often missing. Listener always adds `chd-desktop-header` class (+ tries `props.id`); JS finds `header.sticky` / `.chd-desktop-header` and hides the center search form with matching selectors. Search icon goes in the right action cluster (before cart).
- **Theme click toggle**: broader host selectors (`header.sticky`) + hide official ThemeToggle dropdown popup.
- **Board filter**: also rewrites mobile menu `iteration.source` that reads `boards.data` (not only `desktop_header.props.boards`).
- **Footer**: marks `chd-footer` / `props.id`; `linkGroups` still applied when `footer_link_groups` is set; business notice mount fill unchanged.

### Changed

- Version `0.2.8`. After update: `php82 artisan module:update custom-home_design --source=bundled --force --layout-strategy=overwrite && php82 artisan hooks:clear && php82 artisan cache:clear` (no new migration).

## [0.2.7] - 2026-09-10

### Fixed

- **Admin save 422 ("입력값을 확인해 주세요.")**: FormRequest used `present` on `hide_header_board_slugs_text` and `footer_link_groups_json`. G7 `apiCall` often **omits empty-string keys** from the JSON body → `present` failed before the controller ran. Changed both to `sometimes` + `nullable`; `prepareForValidation` still defaults missing keys to `''`.
- **Booleans**: `required` → `sometimes` (missing / stripped unchecked ⇒ false via prepareForValidation). Accept 0/1/true/false/"0"/"1".
- **Empty footer JSON**: blank/omitted `footer_link_groups_json` stores `null` (no JSON decode / no 422).
- **Missing `parseCommaSeparatedSlugs()`**: 0.2.6 called it after comma-slug UX but never defined it — would 500 after validation passed. Implemented (comma text + accidental JSON array).
- Admin save body: simpler 0/1 bool expressions; `content_max_width_px` coerced to valid int (fallback 1240).
- Admin update also accepts **POST** (same handler as PUT).

### Changed

- Version `0.2.7`. After update run `php82 artisan hooks:clear && php82 artisan cache:clear` (no new migration).

## [0.2.6] - 2026-09-10

### Fixed

- **Root cause clarified**: DB boolean columns were already persisting (`hide_desktop_top_nav=1` etc.). Failures were **admin UI not reflecting DB** + **JSON columns not writing** + **frontend apply**.
- **Admin UI wiped after load**: `init_actions` was `setState`ing a default `form` (bools false / JSON empty) and overwriting `data_sources.initLocal` — checkboxes looked unchecked and JSON textareas empty despite DB. Removed form overwrite from init_actions.
- **Board slugs UX**: admin field is comma-separated text (`qna, inquiry`) → stored as JSON array in DB; displayed as comma-joined string.
- **JSON save path** (footer_link_groups still JSON): `hide_header_board_slugs_json` / `footer_link_groups_json` now `present` in FormRequest, forced through `settingsPayload()`, and **always decoded + upserted** to `hide_header_board_slugs` / `footer_link_groups` (Query Builder `json_encode`). `*_json` wins even if a parallel array key exists.
- **Checkbox display/submit**: checked bindings accept `true|1|"1"`; body sends bools as `0|1`; missing checkbox keys ⇒ false.
- **Frontend apply (PRIORITY)**: dynamic `assets/boot.js` embeds DB settings + critical hide-nav CSS so flags apply **without re-save**. `home-design.js` applies `window.__CHD_HOME_DESIGN__` immediately then refreshes from public GET. Listener sets `data-chd-hide-top-nav` on `desktop_header`. Broader nav selectors (`header.sticky nav`, `[data-chd-hide-top-nav]`).
- **Frontend apply**: `coerceBool` for tinyint/string flags; clear business mount when off; broader `#desktop_header nav` hide + `chd-hide-desktop-top-nav` class.
- Service upsert singleton id=1 remains (safe even when header_* columns missing).

### Changed

- Version `0.2.6`. After update run `php82 artisan migrate --force && php82 artisan hooks:clear && php82 artisan cache:clear`.


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
