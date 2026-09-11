# custom-home_design

Gnuboard7 홈 디자인 애드온 모듈 (`0.2.22`).

공식 **gnuboard `sirsoft-basic`** 테마에서 메뉴·콘텐츠 폭·푸터 사업자 고지를
Event Hook / Layout Extensions / 주입 JS로 제공합니다. **테마 파일 직접 수정 없음.**

## Identifier

`custom-home_design` (vendor: `custom`)

## 0.2.22 notes

- **Stable header actions**: 비쇼핑 페이지에서도 통화 선택기 자리만 유지하고 보이지 않게 해,
  쇼핑 페이지 이동 시 우측 상단 메뉴가 왼쪽으로 밀리지 않습니다.

## 0.2.21 notes

- **Slug input**: 저장 응답 처리에서 구형 G7 평가기가 해석하지 못하는 `var` IIFE를 제거해
  표현식 원문이 입력란에 표시되지 않도록 했습니다.

## 0.2.20 notes

- **Header width**: 실제 DOM에서 유실되는 `desktop_header` id 대신
  `chd-desktop-header` 대체 클래스로 상단 바와 글로벌 메뉴를 콘텐츠 최대 폭에 맞춥니다.

## Scope / Limits

| 포함 | 비포함 |
|------|--------|
| `main_content`·홈 하단 콘텐츠 컬럼 최대 폭 (기본 **1240px**) | 광고 배너 → [`custom-ad_slots`](https://github.com/keidischoi/g7-module-custom-ad_slots) |
| 데스크톱 상단 탭 네비 숨김 (CSS) | feat 테마 Header/Footer React 컴포넌트 의존 |
| 헤더 검색 아이콘+슬라이드 패널 / 다크모드 클릭 토글 (JS) | |
| 헤더 게시판 slug 필터 (기본 빈 배열 — 명시 slug만 숨김) | 테마 소스 패치 / zip 배포 |
| 푸터 `linkGroups` (공식 Footer props) | |
| 푸터 직전 사업자 고지 (표시 ON; 내용은 file `settings/basic_info.json` via `module_setting` / EcommerceSettingsService — DB 테이블 아님) | |

**참고 전용:** `keidischoi/g7-template-sirsoft-basic` 브랜치 `feat/open-in-new-tab-1.1.51`
(`layouts/_user_base.json`, `Footer.tsx` businessInfo/linkGroups, Header 보드 필터).
라이브 사이트에는 feat React 기능이 없어도 동작하도록 훅+JS로 이식했습니다.

## 0.2.29 notes

- **Shop sort bar**: 총 개수 / 최신순 줄 배경을 투명하게 유지합니다.
- **Shop nav flash**: 카테고리 줄 버튼 전환 시 페이지 블러 번쩍임을 숨깁니다.

## 0.2.28 notes

- **Shop sort bar**: 총 개수 / 최신순 드롭박스 줄 배경을 투명하게 표시합니다.

## 0.2.27 notes

- **Shop 전체**: 카테고리 전체 페이지는 최근 본 / 인기 / 신상품 섹션을 유지하고,
  목록 버튼을 눌렀을 때만 전용 그리드로 전환합니다.

## 0.2.26 notes

- **Shop list order**: 모든 상품 → 최근 본 상품 → 인기상품 → 신상품.

## 0.2.25 notes

- **Shop list modes**: 쇼핑 카테고리 옆에 인기상품 / 모든 상품 / 최근 본 상품 /
  신상품 버튼을 넣고, 같은 썸네일 그리드에서 해당 상품만 무한 스크롤로 보여 줍니다.

## 0.2.24 notes

- **Auth forms**: 로그인·회원가입 박스는 콘텐츠 최대 폭과 별개로 원래 `max-w-md`
  카드 크기를 유지합니다.

## 0.2.23 notes

- **Header stability**: 페이지별 콘텐츠 높이에 따라 세로 스크롤바가 생기거나 사라져도
  상단 헤더와 글로벌 메뉴의 가로 위치가 바뀌지 않습니다.

## 0.2.19 notes

- **Home align**: 홈 박스 좌우를 헤더/네비와 같은 `px-4 sm:px-6 lg:px-8` 여백으로 맞춥니다.
- **Footer**: `Powered by 그누보드7` 문구를 숨깁니다.

## 0.2.18 notes

- **Home boxes**: 홈 카드/그리드가 `콘텐츠 최대 폭` 컬럼을 가득 채우도록 정렬합니다.
  중첩 Container에 같은 px를 한 번 더 씌워 박스가 작아지던 문제를 제거했습니다.

## 0.2.17 notes

- **Currency icon**: 헤더 통화 설정 아이콘은 쇼핑 관련 페이지에서만 표시됩니다
  (`/shop`, 장바구니/결제, 주문·위시리스트 등). 홈·게시판 등 그 외 페이지에서는 숨깁니다.

## 0.2.16 notes

- **Layout cache**: 관리자 설정 저장 시 활성 사용자 템플릿의 `_user_base`와
  모든 하위 레이아웃 캐시를 자동 무효화합니다. 홈·인기·게시판 등 페이지별로
  서로 다른 게시판 숨김 설정이 남지 않습니다.

## 0.2.15 notes

- **Header boards**: 공식 테마와 동일한 안전한 화살표 함수 표현식으로 slug를 필터합니다.
  `qna, inquiry` 저장 시 두 게시판만 제외되고 나머지 메뉴는 유지됩니다.

## 0.2.14 notes

- **Admin**: 헤더에서 숨길 게시판을 쉼표 구분 slug 입력란으로 설정합니다
  (예: `qna, inquiry`). 빈 값은 모든 게시판을 표시합니다.

## 0.2.13 notes

- **Boards (all pages)**: `hide_header_board_slugs=[]` forces `{{boards.data ?? []}}` on every
  header/mobile boards source (strips feat hardcoded qna/inquiry filter). Non-empty hides
  the same slugs on home and every other page. Clear stale checks in admin or set DB `[]`.
- **Business**: notice sits **beside** footer brand H3/logo (not under).
- **Footer icons**: emoji prefixes in `linkGroups` labels (official ignores `icon` prop).
- **Admin**: hide-slugs are checkboxes from board-menu API.
- **JS load**: `module.iife.js` loads `home-design.js?v=0.2.13` with fallback + console warn.

## 0.2.12 notes

- Search panel input: hide CSS scoped to header bar `.h-16 > form` only (panel form visible when open).
- Boards: `hide_header_board_slugs=[]` restores `{{boards.data ?? []}}` (qna/inquiry shown; overflow may sit in official “더보기” when >5).
- Business: reads `module_setting('sirsoft-ecommerce','basic_info')` / `storage/app/modules/sirsoft-ecommerce/settings/basic_info.json`; Listener inserts `#chd_business_info_block` sibling before footer.

## Install (서버, php82) — **반드시 INSTALLED 상태**

> **Critical:** 파일만 `modules/`에 두면 **미설치(📦)** 입니다.  
> 미설치면 `src/routes/api.php` 라우트가 등록되지 않아  
> `/api/modules/custom-home_design/assets/*.js` · `settings` · admin API 가 전부 **HTML 404** 입니다.  
> (`custom-ad_slots` 와 동일: `module:install` / 관리자 GitHub 설치로 **설치+활성화** 필요)

### 1) 소스 배치 (완전 복사)

`modules/_bundled/custom-home_design/` (또는 `modules/custom-home_design/`)에 **전체** 트리 필요:

```text
module.php
module.json
composer.json
src/routes/api.php          ← 없으면 route:list 에 라우트 0개
src/Http/Controllers/...
resources/assets/home-design.js
resources/extensions/...
database/migrations/...
```

### 2) 설치 (미설치일 때) — ad_slots 와 동일 패턴

```bash
# 관리자 UI: 확장 → 모듈 → GitHub/로컬에서 custom-home_design 설치+활성화
# 또는 CLI:
php82 artisan module:install custom-home_design
# bundled 소스면:
php82 artisan module:install custom-home_design --source=bundled
```

이미 설치돼 있고 버전만 올릴 때:

```bash
php82 artisan module:update custom-home_design --source=bundled --force --layout-strategy=overwrite
```

`module:update` 가 **"설치되지 않았습니다"** 이면 먼저 `module:install` 하세요.

### 3) 마이그레이션 + 캐시

```bash
php82 artisan migrate --force
php82 artisan hooks:clear
php82 artisan cache:clear
# 라우트 캐시를 쓰는 환경이면:
php82 artisan route:clear
```

### 4) 설치 검증 (필수)

```bash
# 라우트가 보여야 함 (settings + assets/boot.js + assets/home-design.js + admin)
php82 artisan route:list --path=custom-home_design

# JS 200 (HTML 404 페이지면 안 됨)
curl -sk "https://YOUR_HOST/api/modules/custom-home_design/assets/boot.js" | head -c 200
curl -sk "https://YOUR_HOST/api/modules/custom-home_design/assets/home-design.js" | head -c 200

# 디스크에 라우트 파일 존재
ls modules/custom-home_design/src/routes/api.php
# 또는
ls modules/_bundled/custom-home_design/src/routes/api.php
```

관리자: **홈 디자인** (`/admin/home-design`) — 모듈 활성화만으로 적용(별도 「모듈 사용」토글 없음).

### Uninstall / 미설치 시 홈 에러 방지

0.2.9+ 는 **extension에 scripts를 넣지 않습니다** (Listener가 모듈 활성 시에만 주입).  
그래도 예전 확장 캐시가 남아 `chd_home_design_js` 불러오기 실패가 보이면:

```bash
php82 artisan module:disable custom-home_design   # 또는 uninstall
php82 artisan hooks:clear
php82 artisan cache:clear
```

> 설정이 저장되지 않으면 마이그레이션 미실행일 수도 있습니다.  
> 테이블: `home_design_settings` (싱글톤 `id=1`).


## Diagnose DB persistence (NAS)

```bash
# 테이블/행 확인 (네임스페이스 주의: Modules\\Custom\\HomeDesign\\...)
php82 artisan tinker --execute="echo json_encode(\\Modules\\Custom\\HomeDesign\\Models\\HomeDesignSetting::query()->find(1));"

# 또는
php82 artisan db:show
php82 artisan migrate:status | grep home_design
```

관리자 저장 API: `PUT /api/modules/custom-home_design/admin/settings` (Sanctum + `custom-home_design.design.update`).
메뉴: `/admin/home-design` → layout `admin_home_design_settings`.

## Diagnose slug save (0.2.9)

관리자 저장 body → Service::update → Query Builder:

```text
PUT /api/modules/custom-home_design/admin/settings
body.hide_header_board_slugs_text = "qna, inquiry"
  → parseCommaSeparatedSlugs → ["qna","inquiry"]
  → DB::table('home_design_settings')->where('id',1)->update([
       'hide_header_board_slugs' => '["qna","inquiry"]', ...
     ])
```

```bash
php82 artisan tinker --execute="echo json_encode(\Modules\Custom\HomeDesign\Models\HomeDesignSetting::query()->find(1)?->hide_header_board_slugs);"
```

0.2.8 버그: admin Input `change` 핸들러가 `$event.target.value` 대신 `$response` 를 읽어
폼 상태가 갱신되지 않은 채 저장됨 → 0.2.9에서 `$event.target.value`로 복구.

## Business notice & footer links (0.2.2+)

- **사업자 고지**: 관리자에는 토글 `사업자 고지 블록 표시`만 있습니다. ON이면
  `sirsoft-ecommerce` 모듈 설정 `basic_info`의 `company_name`, `ceo_name`,
  `business_number`, `mail_order_number`, `base_address`+`detail_address`,
  `phone`, `email`을 읽어 푸터 **상점명(H3) 바로 아래**에 표시합니다 (feat Footer `businessInfo` 위치). 공식 테마는 JS로 동일 배치.
- **푸터 linkGroups**: `footer_link_groups_json`에
  `[{ "title", "links":[{ "label", "href", "icon?" }] }]` JSON을 넣으면 테마 기본을 덮어씁니다.
  흔한 href는 저장/적용 시 `icon` 자동 보강. 공식 Footer는 icon 미지원 → JS가 라벨 앞 SVG 삽입. FAQ는 `/faq` 권장.

## Toast when module off (`chd_home_design_*`)

0.2.12+ never registers those layout script ids. If an older version left them cached:

```bash
php82 artisan hooks:clear && php82 artisan cache:clear
```

## Emergency disable (무한 로딩 시)

```bash
php82 artisan module:disable custom-home_design
php82 artisan hooks:clear && php82 artisan cache:clear
```

## Public API

- `GET /api/modules/custom-home_design/settings` — JS용 공개 설정
- `GET /api/modules/custom-home_design/assets/boot.js` — embedded settings + critical CSS
- `GET /api/modules/custom-home_design/assets/home-design.js`

## Admin API

- `GET /api/modules/custom-home_design/admin/settings`
- `PUT /api/modules/custom-home_design/admin/settings`

## How it works

1. **Migration / model** — `home_design_settings` 싱글톤 (`enabled` 컬럼은 레거시; 런타임은 모듈 활성화로 게이트)
2. **Hook** (`HomeDesignLayoutListener`) — 폭·boards 필터·footer linkGroups(+icon enrich)·Footer `businessInfo`·config Div; **layout scripts[] 에 chd_home_design_* 절대 미등록**
3. **Layout extension** — scripts/injections 없음 (미설치·비활성 시 실패 토스트 방지)
4. **Module assets** — `loading.strategy=global` → `dist/js/module.iife.js` (모듈 활성 시에만 ModuleAssetLoader). IIFE가 `home-design.js` DOM 주입
5. **JS** — 사업자 고지(상점명 아래)·푸터 링크 아이콘·게시판 slug 숨김 fallback·검색/다크모드; MutationObserver 없음
