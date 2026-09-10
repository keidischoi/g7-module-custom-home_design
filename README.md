# custom-home_design

Gnuboard7 홈 디자인 애드온 모듈 (`0.2.2`).

공식 **gnuboard `sirsoft-basic`** 테마에서 메뉴·콘텐츠 폭·푸터 사업자 고지를
Event Hook / Layout Extensions / 주입 JS로 제공합니다. **테마 파일 직접 수정 없음.**

## Identifier

`custom-home_design` (vendor: `custom`)

## Scope / Limits

| 포함 | 비포함 |
|------|--------|
| `main_content` 최대 폭 (기본 **1240px**) | 광고 배너 → [`custom-ad_slots`](https://github.com/keidischoi/g7-module-custom-ad_slots) |
| 데스크톱 상단 탭 네비 숨김 (CSS) | feat 테마 Header/Footer React 컴포넌트 의존 |
| 헤더 게시판 slug 필터 (`qna`, `inquiry` 기본) | 테마 소스 패치 / zip 배포 |
| 푸터 `linkGroups` (공식 Footer props) | |
| 푸터 직전 사업자 고지 (표시 ON만; 내용은 sirsoft-ecommerce basic_info) | |

**참고 전용:** `keidischoi/g7-template-sirsoft-basic` 브랜치 `feat/open-in-new-tab-1.1.51`
(`layouts/_user_base.json`, `Footer.tsx` businessInfo/linkGroups, Header 보드 필터).
라이브 사이트에는 feat React 기능이 없어도 동작하도록 훅+JS로 이식했습니다.

## Install (서버, php82)

모듈을 `modules/` 또는 `modules/_bundled` 에 배치한 뒤:

```bash
php82 artisan module:update custom-home_design --source=bundled --force --layout-strategy=overwrite
php82 artisan migrate --force
php82 artisan hooks:clear
php82 artisan cache:clear
```

Git에서 직접 받을 때 예:

```bash
cd /path/to/g7/modules
git clone https://github.com/keidischoi/g7-module-custom-home_design.git custom-home_design
# 또는 _bundled/custom-home_design 로 복사 후
php82 artisan module:update custom-home_design --source=bundled --force --layout-strategy=overwrite
php82 artisan migrate --force
php82 artisan hooks:clear
php82 artisan cache:clear
```

관리자: **홈 디자인** (`/admin/home-design`) — 신규 설치 시 `enabled` 기본 OFF. 관리자에서 켜세요.

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
- `GET /api/modules/custom-home_design/assets/home-design.js`

## Admin API

- `GET /api/modules/custom-home_design/admin/settings`
- `PUT /api/modules/custom-home_design/admin/settings`

## How it works

1. **Migration / model** — `home_design_settings` 싱글톤 (`enabled` 기본 false)
2. **Hook** (`HomeDesignLayoutListener`) — `_user_base` 의 `main_content` 폭, `desktop_header.boards` 필터, `footer.linkGroups`, **사업자 고지(이커머스 basic_info) 마운트 children 서버 렌더**, 스크립트 엔트리
3. **Layout extension** — `_user_base` 에 `home-design.js` + `chd_business_info_mount`
4. **JS (0.2.1+)** — CSS 변수·상단 네비 숨김만; MutationObserver 없음; SPA는 debounce CSS 재적용; 사업자 HTML은 마운트 비어 있을 때만 1회
