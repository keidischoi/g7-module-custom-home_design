# Changelog

형식은 [Keep a Changelog](https://keepachangelog.com/ko/1.1.0/)를 따르며,
[Semantic Versioning](https://semver.org/lang/ko/)을 준수합니다.

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
