# Changelog

형식은 [Keep a Changelog](https://keepachangelog.com/ko/1.1.0/)를 따르며,
[Semantic Versioning](https://semver.org/lang/ko/)을 준수합니다.

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
