# Changelog

형식은 [Keep a Changelog](https://keepachangelog.com/ko/1.1.0/)를 따르며,
[Semantic Versioning](https://semver.org/lang/ko/)를 준수합니다.

## [0.2.46] - 2026-09-23

### Fixed — 홈 박스 숨김: SPA 지연 로드 재적용 + multi-child grid

- 홈(/)에서 `ensureHiddenHomeBoxes`를 0·300·800·1500·3000·5000·8000ms에 재시도합니다 (이전 타이머 클리어).
- `#main_content` / `#main_content_area`에 debounced MutationObserver(200ms, childList+subtree)를 연결해 **숨김만** 재적용합니다 (검색 리마운트·헤더 UX 전체 경로는 호출하지 않음 — 0.2.1 루프 방지). 홈을 떠나면 disconnect.
- `hideHomeBoxElement`가 성공 시 `true` / 스킵 시 `false`를 반환합니다. multi-child `.grid` 스킵은 성공으로 치지 않으며, `claimed`는 실제 hide 성공 시에만 설정합니다.
- 토큰이 그리드 래퍼에 매칭되면 동일 토큰이 맞는 **직접 자식**을 숨기도록 폴백합니다.
- 0.2.45의 한/영 별칭·CAS 광고 마운트 스킵을 유지합니다.

### Fixed — home box hide: progressive SPA retries + MutationObserver

- Staggered re-apply + home-only MO calling `ensureHiddenHomeBoxes` only.
- Grid skip is not success; optional per-child hide for multi-card grids.

## [0.2.45] - 2026-09-23

### Fixed — 숨길 홈 박스: 영문 UI 라벨 매칭 + 컬럼 누락 시 실패 노출

- 관리자에 한글 토큰(웰컴, 회원, 게시글…)을 넣어도 라이브 영문 제목(Members, Posts, Recent Posts, Community Guide 등)과 매칭됩니다.
- `data-chd-home-box` / `data-board-slug` / `/board/{slug}` href 매칭을 추가합니다. CAS 광고 마운트는 숨기지 않습니다.
- `게시글`/`posts`는 Recent Posts를, `게시판`/`boards`는 Popular Boards를 훔치지 않습니다.
- DB에 `hide_home_box_ids` 컬럼이 없으면 저장 시 RuntimeException으로 migrate를 안내합니다 (조용히 필드가 버려지지 않음).

### Fixed — hide home boxes: Korean tokens ↔ English titles + fail-loud migrate

- Korean admin tokens match English rendered titles; `data-chd-home-box` supported.
- Missing `hide_home_box_ids` column throws (run `php82 artisan migrate`).

## [0.2.44] - 2026-09-23

### Fixed — 「숨길 홈 박스」 저장이 항상 비던 문제

- `hide_home_box_ids_text`를 파싱하기 **전에** `unset`하던 순서를 바로잡았습니다. 관리자 저장 시 쉼표 목록이 `hide_home_box_ids` JSON으로 정상 반영됩니다.

## [0.2.43] - 2026-09-23

### Fixed — 설정 API 500 · 광고 폭 커짐 · 홈 박스 숨김 미동작

- `SettingsController`의 깨진 `foreach`를 복구해 `/api/modules/custom-home_design/settings`가 다시 200을 반환합니다 (숨김 목록 전달).
- 홈 fill CSS가 `custom-ad_slots` 마운트 `max-width`를 덮어쓰지 않습니다. 광고는 `--chd-content-max-width`를 유지합니다.
- 홈 fill에서 nested `.grid` 타깃을 제거합니다.

## [0.2.42] - 2026-09-23

### Added — 홈 박스 숨김 (이벤트훅 광고 제외)

- 관리자 「숨길 홈 박스 (이름 / slug)」에 쉼표로 입력하면 홈(/)에서만 해당 카드를 숨깁니다.
- `custom-ad_slots` 이벤트훅·마운트(`data-cas-*`, `#cas_*`)는 숨기지 않습니다. 그리드 행 전체도 접지 않습니다.
- 예: 웰컴, 회원, 게시글, 댓글, 게시판, 최근 게시글, 인기 게시판, 쇼핑몰, 커뮤니티 가이드, 웹진, webzine, 1:1 문의, Q&A

## [0.2.41] - 2026-09-23

### Reverted — 홈 박스 숨김 (0.2.39–0.2.40)

- `custom-ad_slots` 이벤트훅·마운트와 겹치지 않도록 홈 박스 숨김 기능을 잠시 제거합니다.
- 런타임은 0.2.38과 동일합니다. DB의 `hide_home_box_ids` 컬럼은 그대로 두며 사용하지 않습니다.

## [0.2.40] - 2026-09-23

### Fixed — 홈 박스 숨김이 그리드·광고를 깨지 않게

- 홈 fill CSS에서 `#main_content .grid` 타깃을 제거하고, 홈(`/`)에서만 fill을 적용합니다.
- `custom-ad_slots` 마운트(`data-cas-*`, `#cas_*`, `#ad_*`)는 폭 강제·숨김 대상에서 제외합니다.
- 「숨길 홈 박스」는 설정에 적은 카드만 숨기고, 여러 카드가 묶인 grid 행 전체는 접지 않습니다.

## [0.2.39] - 2026-09-23

### Added — 홈 박스 이름/slug로 숨기기

- 관리자 「숨길 홈 박스 (이름 / slug)」에 게시판 slug·박스 제목 일부를 쉼표로 입력하면 홈(/)에서만 해당 박스를 숨깁니다.
- 새 게시판을 만들어도 slug만 목록에 추가하면 됩니다. 헤더 게시판 숨김과는 별개입니다.

## [0.2.38] - 2026-09-23

### Fixed — 검색 아이콘 모드 ON인데 아이콘 미표시

- boot CSS가 원본 검색 form을 먼저 숨기지 않습니다. 아이콘 버튼이 DOM에 붙은 뒤에만 원본 form을 숨깁니다.
- 아이콘 모드 ON일 때 `#chd_header_search_toggle`를 `display:inline-flex`로 강제 표시합니다.
- 아이콘이 안 붙으면 원본 검색 입력란이 그대로 남아 헤더가 비지 않습니다.

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
