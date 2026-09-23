# Changelog

형식은 [Keep a Changelog](https://keepachangelog.com/ko/1.1.0/)를 따르며,
[Semantic Versioning](https://semver.org/lang/ko/)를 준수합니다.

## [0.2.37] - 2026-09-23

### Fixed — 검색 아이콘 모드 OFF 시 입력란 미표시

- `header_search_icon_mode` 체크 해제 시 헤더 검색 입력란이 원본처럼 상시 보이도록 복구합니다.
- 아이콘/슬라이드 패널 위젯을 제거하고, 원본 가운데 검색 form이 있으면 강제로 다시 표시합니다.
- 원본 form이 없는 테마에서는 데스크톱·모바일용 상시 검색 입력란을 주입합니다.
- boot CSS가 아이콘 모드 ON일 때만 form을 숨기도록 매번 다시 쓰고, OFF일 때는 form을 표시합니다.
- `home-design.js`를 CDN 래퍼 없이 모듈에 다시 포함합니다 (0.2.36 상세 진입 런타임 해제 포함).

## [0.2.36] - 2026-09-13

### Fixed — 공유메뉴/썸네일에서 상세 진입 시 무한 로딩

- 상품 상세(`/products/:id`)로 가는 즉시 쇼핑 무한스크롤 Observer와
  `chd-shop-quiet-nav` 전환 오버레이 숨김을 해제합니다.
- 공유 메뉴(`#cdp_share_list`)·상품 카드 클릭 때도 목록 런타임을 먼저 끄니다.
- SPA 이동 300ms 대기 전에 상세 경로를 판정해 `blur_until_loaded`가
  전환 오버레이/옵저버와 겹치지 않게 합니다.
