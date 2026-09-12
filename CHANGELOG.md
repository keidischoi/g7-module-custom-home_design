# Changelog

형식은 [Keep a Changelog](https://keepachangelog.com/ko/1.1.0/)를 따르며,
[Semantic Versioning](https://semver.org/lang/ko/)를 준수합니다.

## [0.2.36] - 2026-09-13

### Fixed — 공유메뉴/썸네일에서 상세 진입 시 무한 로딩

- 상품 상세(`/products/:id`)로 가는 즉시 쇼핑 무한스크롤 Observer와
  `chd-shop-quiet-nav` 전환 오버레이 숨김을 해제합니다.
- 공유 메뉴(`#cdp_share_list`)·상품 카드 클릭 때도 목록 런타임을 먼저 끄니다.
- SPA 이동 300ms 대기 전에 상세 경로를 판정해 `blur_until_loaded`가
  전환 오버레이/옵저버와 겹치지 않게 합니다.
