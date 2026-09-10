# custom-home_design

Gnuboard7 홈 디자인 애드온 모듈 (`0.2.10`).

공식 **gnuboard `sirsoft-basic`** 테마에서 메뉴·콘텐츠 폭·푸터 사업자 고지를
Event Hook / Layout Extensions / 주입 JS로 제공합니다. **테마 파일 직접 수정 없음.**

## Identifier

`custom-home_design` (vendor: `custom`)

## Scope / Limits

| 포함 | 비포함 |
|------|--------|
| `main_content`·홈 하단 콘텐츠 컬럼 최대 폭 (기본 **1240px**) | 광고 배너 → [`custom-ad_slots`](https://github.com/keidischoi/g7-module-custom-ad_slots) |
| 데스크톱 상단 탭 네비 숨김 (CSS) | feat 테마 Header/Footer React 컴포넌트 의존 |
| 헤더 검색 아이콘+슬라이드 패널 / 다크모드 클릭 토글 (JS) | |
| 헤더 게시판 slug 필터 (기본 빈 배열 — 명시 slug만 숨김) | 테마 소스 패치 / zip 배포 |
| 푸터 `linkGroups` (공식 Footer props) | |
| 푸터 직전 사업자 고지 (표시 ON만; 내용은 sirsoft-ecommerce basic_info) | |

**참고 전용:** `keidischoi/g7-template-sirsoft-basic` 브랜치 `feat/open-in-new-tab-1.1.51`
(`layouts/_user_base.json`, `Footer.tsx` businessInfo/linkGroups, Header 보드 필터).
라이브 사이트에는 feat React 기능이 없어도 동작하도록 훅+JS로 이식했습니다.

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
  `phone`, `email`을 읽어 푸터 직전에 표시합니다. (feat `_user_base` 와 동일 매핑)
- **푸터 linkGroups**: `footer_link_groups_json`에
  `[{ "title", "links":[{ "label", "href" }] }]` JSON을 넣으면 테마 기본을 덮어씁니다.
  비우면 테마 기본. FAQ는 `/faq` 권장 (공식 Footer 기본은 `/page/faq`).

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
2. **Hook** (`HomeDesignLayoutListener`) — `_user_base` 의 `main_content` 폭, `desktop_header.boards` 필터, `footer.linkGroups`, **사업자 고지(이커머스 basic_info) 마운트 children 서버 렌더**, 스크립트 엔트리
3. **Layout extension** — `_user_base` 에 `chd_business_info_mount`만 (scripts 없음 → 미설치 시 404 UI 경고 방지)
4. **Listener scripts** — 모듈 활성 시에만 `boot.js` + `home-design.js`를 layout `scripts`에 주입 (ad_slots `cas_hero_carousel` 과 동일 `{id,src}`)
5. **JS** — 폭 CSS `!important`·검색 패널(헤더↓/네비↑)·아이콘 순서(검색→다크모드); MutationObserver 없음
