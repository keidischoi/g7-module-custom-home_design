# Changelog

형식은 [Keep a Changelog](https://keepachangelog.com/ko/1.1.0/)를 따르며,
[Semantic Versioning](https://semver.org/lang/ko/)를 준수합니다.

## [0.2.58] - 2026-09-23

### Added — 홈 커스텀 HTML (캐러셀 아래 · 박스 위)

- **설정:** `home_custom_html` (longText). 관리자 Settings 텍스트에어리어로 저장. 공개 settings / boot cfg / `toPublicArray`에 노출.
- **배치:** 홈(`/`)에서만 `#chd-home-custom-html`을 캐러셀·히어로 **다음**, 홈 박스 그리드 / `#chd-home-reflow` **앞**에 삽입.
  - 캐러셀 탐색: `data-cas-hero*` → id/class에 `carousel`·`hero` (기존 home-design 휴리스틱). 없으면 메인 콘텐츠 상단·첫 홈 박스 그리드 앞.
  - custom-ad_slots Event Hook 광고 마운트는 수정·숨김하지 않음.
- **빈 값:** 마운트 제거(빈 여백 없음). 홈 이탈 시 제거.
- **SPA:** `ensureHeaderUx` / home MO / hide retries에서 재보장. 단일 id, 내용 불변 시 innerHTML 재기록 안 함. 관리자 `<script>`는 재삽입으로 실행.
- **회귀 방지:** hide/reflow(0.2.57) 경로 유지. fill selector·`isProtectedLayoutRoot`에서 커스텀 HTML 마운트 제외.
- **캐시:** `home-design.js?v=0.2.58`. migration `2026_09_23_000004_add_home_custom_html...` 필요.

### Added — home custom HTML under carousel / above home boxes

- Persist `home_custom_html`; inject `#chd-home-custom-html` after carousel/hero heuristics and before home box grids / reflow host. Empty clears the mount. SPA-safe; ads untouched; hide/reflow unchanged.

## [0.2.57] - 2026-09-23

### Fixed — SPA remount과 reflow 호스트 파괴 경쟁 제거 + 무마크 카드 수집

- **확인된 원인:** `ensureHiddenHomeBoxes`가 매 패스 `clearHiddenHomeBoxes()` → `restoreHomeBoxReflow()`로 `#chd-home-reflow`를 부수고 카드를 원위치로 되돌린 뒤 다시 숨김/reflow합니다. 그 사이 React SPA가 게시판 그리드를 재마운트하면 보드는 원래 행에, 「최근 게시글」만 호스트에 남아 **n=1 + row2**가 됩니다. (캐시된 0.2.54 경로에서는 `isHomeBoxCardRoot`가 flex 카드를 거절해 호스트 자체가 안 생기기도 함 — live에 `data-chd-home-box`/`data-board-slug` 없음.)
- **호스트 유지:** hide 토큰이 활성인 동안은 `clearHiddenHomeBoxAttrs()`만 호출(숨김/collapse attrs 재적용). `restoreHomeBoxReflow()`는 hide 목록이 비었거나 홈 경로를 떠날 때만.
- **Merge:** 기존 호스트 밖 보이는 카드 루트를 `#chd-home-reflow`로 병합하고 `--chd-home-reflow-cols` / `data-chd-home-reflow-n` 갱신.
- **수집 강화:** grid 자식이 bare iteration wrapper면 `looksLikeHomeCard`/마크 자손으로 하강; 템플릿 마커 없이도 rounded-xl+border+shadow 카드 수집.
- **중복 remount:** 호스트에 같은 slug/title이 있으면 밖 remount는 숨김; 호스트가 노드를 잃었으면 remount를 호스트로 이동.
- compactPartial 토큰 활성 중 비활성 유지. CAS(`data-cas-*`, `#cas_*`) 미터치. 0.2.55 카드 루트 판별 순서 유지.
- **캐시:** `module.iife.js`가 `home-design.js?v=0.2.57` 로드 — `module:update` + hard refresh 후 Network에서 확인.

### Fixed — keep reflow host while hide tokens active; harden unmarked collection

- Stop destroy/restore of `#chd-home-reflow` on every ensure (SPA remount fight). Merge outside cards into existing host; full restore only when hide list empty or leaving home. Collect bare-wrapper / unmarked `looksLikeHomeCard` roots; suppress duplicate outside remounts.

## [0.2.56] - 2026-09-23

### Fixed — SPA 지연 마운트 시 홈 박스 한 행 병합 (reflow merge)

- **원인:** 프로그레시브 SPA 로드로 첫 `ensure` 때 「최근 게시글」만 있으면 `#chd-home-reflow`가 n=1(~1/3 폭)로 생깁니다. 이후 게시판 카드가 마운트되어도 (1) `reflowVisibleHomeBoxes(claimed.length)`가 이번 패스 `hiddenCount < 1`이면 reflow를 건너뛰고, (2) `compactPartialHomeGrid`가 게시판 행을 제자리에서 압축해 **위: 최근 단독 / 아래: 자유|웹진** 두 행이 남았습니다.
- **Always reflow:** hide 토큰이 비어 있지 않으면(홈 경로) `claimed.length`와 무관하게 reflow. `reflowVisibleHomeBoxes(shouldReflow)`.
- **Merge:** `collectVisibleHomeBoxRoots`가 `#chd-home-reflow` 안 카드와 아직 밖인 카드를 모두 모아 document order로 호스트에 append.
- **No partial compact while hiding:** 토큰 활성 중 `collapseEmptyHomeLayouts(false)` — 보이는 자식 0개인 wrapper만 접음. per-grid compact 비활성.
- **configureReflowHost(host, N):** N=`min(3, children)` — 보이는 카드 3개면 전폭 3열 균등.
- 0.2.55 `isHomeBoxCardRoot` 순서(마크/카드 우선) 유지. MO/재시도 `ensureHiddenHomeBoxes` 경로 유지.

### Fixed — merge late SPA boards into one reflow row

- Always reflow while hide tokens are non-empty; merge cards already in `#chd-home-reflow` with late-mounted boards; disable in-place partial grid compact so remaining cards (e.g. 최근|자유게시판|웹진) stay one row of up to 3.

## [0.2.55] - 2026-09-23

### Fixed — 홈 박스 재배치: flex 카드 루트 인식

- **원인:** `isHomeBoxCardRoot`가 `isLayoutStackClass`(ANY `\\bflex\\b`)를 `data-chd-home-box` / `looksLikeHomeCard`보다 **먼저** 검사해, 실제 카드(`h-full flex flex-col` + rounded-xl/border/shadow)를 전부 레이아웃 스택으로 거절 → `collectVisibleHomeBoxRoots`가 비어 `reflowVisibleHomeBoxes`가 카드를 옮기지 못함.
- **순서 수정:** 보호 루트/CAS/reflow 호스트 제외 후 → 마크(`data-chd-home-box` / `data-board-slug` / `data-slug`) → `looksLikeHomeCard` → 그다음에야 layout stack / `contents` 거절.
- **Hardening:** `#chd-home-reflow` 호스트는 `w-full`만 (더 이상 `chd-home-fill` 없음). `homeFillSelector`·`collectHomeBoxCandidates`의 `.chd-home-fill` 매칭에서 reflow 호스트 제외.

### Fixed — reflow card roots: recognize flex home cards

- Prefer marked / card-like roots over flex layout-stack rejection so remaining cards (최근 게시글, 인기 게시판, 웹진, …) actually move into `#chd-home-reflow` side-by-side.

## [0.2.54] - 2026-09-23

### Fixed — 홈 박스 교차 행 재배치 (나란히 reflow)

- **원인:** 홈 템플릿은 Row B(`최근|인기|쇼핑몰+가이드`)와 Row C(게시판 요약)를 **별도** `grid-cols-3`로 둡니다. 0.2.53 compact는 **같은 그리드 안** 빈 1fr 트랙만 줄이므로, 「최근 게시글」「인기 게시판」이 한 행에 있고 「웹진」만 아래 행에 남는 교차 행 공백은 해결되지 않습니다.
- **Reflow:** `ensureHiddenHomeBoxes`가 박스를 숨긴 뒤, 남은 보이는 카드 루트(`data-chd-home-box` / `data-board-slug` / 분류된 루트)를 `#chd-home-reflow` 호스트로 모아 **하나의 가로 그리드**에 배치합니다. 열 수 `N = min(3, visibleCount)`. 카드 1개 → 폭 ~1/3 (전폭 금지). 2개 → 2열, 3개+ → 3열(초과분은 줄바꿈). 좁은 뷰포트(≤767px)는 1열.
- **복원:** `clearHiddenHomeBoxes`가 WeakMap/마커로 원래 부모·nextSibling에 되돌리고 호스트를 제거합니다. hide 목록이 비면 템플릿 DOM 순서가 복구됩니다.
- **Collapse:** 비워진 원래 `.grid`/`.flex`/bare wrapper는 기존처럼 접습니다. carousel·CAS·`#main_content`·reflow 호스트는 건드리지 않습니다.
- SPA/MO 재시도에도 호스트를 중복 생성하지 않고, clear→hide→reflow 경로로 안전하게 재적용합니다.

### Fixed — cross-row home-box reflow (side-by-side)

- When some home boxes are hidden, remaining visible cards from separate template rows reflow into one horizontal grid (max 3 columns) instead of leaving a lone board card on the next row with empty space beside it.

## [0.2.53] - 2026-09-23

### Fixed — 부분 숨김 그리드 빈 트랙 압축 (CSS compact, 전폭 아님)

- **원인:** 홈 템플릿 `grid-cols-3`는 `display:none` 형제에도 **빈 1fr 트랙**을 남깁니다. 0.2.52는 완전 빈 행만 접어 「최근 게시글」 옆 ~2/3 공백이 남았습니다. 0.2.51 전폭(`grid-column:1/-1`)은 거절됨.
- **Compact CSS:** `.grid[data-chd-home-grid-compact='1']`에 `grid-template-columns: repeat(var(--chd-home-visible-cols), …)` + 원래 열 수 대비 폭 `calc` (gap 반영). 1/3 남으면 왼쪽 정렬 ~33% — **풀블리드 아님**.
- **JS:** `collapseEmptyHomeLayouts`가 보이는 자식 ≥1 이고 `visible < grid-cols-N`이면 compact 속성·CSS 변수 설정. 완전 빈 `.grid`/`.flex`는 기존처럼 `data-chd-home-layout-collapsed`.
- **Bare wrapper:** 숨긴 카드의 부모(이터레이션 Div 등, grid/flex 아님)도 자식이 모두 숨겨지면 접어 Row C 빈 셀 제거.
- `clearHiddenHomeBoxes` / `clearCollapsedHomeLayouts`가 compact attrs/vars 복원. carousel·CAS·`#main_content`는 접지/압축하지 않음.

### Fixed — compact partial home grids (no empty tracks, no full-bleed)

- When some siblings in a `grid-cols-N` row are hidden, shrink the grid to the remaining column count/width instead of leaving empty tracks or stretching the lone card full width.

## [0.2.52] - 2026-09-23

### Fixed — 남은 홈 카드 전폭 확장 되돌림 (빈 행만 접기)

- **Revert 0.2.51 full-bleed:** `data-chd-home-grid-span` / `grid-column: 1 / -1` / 1열 `grid-template-columns` 강제 제거. 남은 카드(예: 「최근 게시글」만 남음)는 템플릿 원래 폭(~반열)을 유지합니다.
- **좁힌 collapse:** `collapseEmptyHomeLayouts`는 보이는 non-ad 홈 자식이 **0개**인 `.grid`/flex 래퍼만 접습니다. 1개 이상 남으면 template columns / grid-column을 건드리지 않습니다.
- 완전 빈 부모는 이전과 같이 올라가며 접어 빈 세로 밴드를 제거합니다. `#main_content` / `#main_content_area` / body / carousel·hero / CAS(`data-cas-*`, `#cas_*`)는 절대 접지 않음.
- **유지:** `hideHomeBoxElement`의 HTML `hidden`, `min-height:0`/`border:0`, display:none 경로; CSS hidden/collapsed harden + `:has` 완전 빈 grid 보조 규칙.
- `clearHiddenHomeBoxes` / `clearCollapsedHomeLayouts`: collapsed 래퍼 복원 + 남은 span/onecol attrs도 정리.

### Fixed — stop stretching lone remaining home cards

- Revert full-width lone-child span from 0.2.51. Collapse wrappers only when zero visible home children remain; leave CSS grid alone when any card is still visible.

## [0.2.51] - 2026-09-23

### Fixed — 홈 박스 숨김 후 빈 레이아웃 공간 접기

- `hideHomeBoxElement`: HTML `hidden` 속성 추가 + `min-height`/`border` 제로.
- `ensureHiddenHomeBoxes` 이후 `collapseEmptyHomeLayouts()`:
  - main 콘텐츠 아래 `.grid` / `.flex` 등 스택에서 보이는 홈 자식 수 집계 (hidden / `data-chd-home-box-hidden` / display:none 제외, CAS `data-cas-*` / `#cas_*` 스킵).
  - 보이는 홈 자식 0개 → 래퍼에 `data-chd-home-layout-collapsed=1` + display:none + hidden (단 `#main_content` / `#main_content_area` / body / 광고 마운트는 절대 접지 않음).
  - 보이는 자식 1개이고 multi-column grid면 남은 자식에 `grid-column: 1 / -1` + 그리드를 1열로 (이전 inline style 저장).
  - 숨겨진 카드만 담던 상위 flex/grid도 한 단계 이상 올라가며 접기.
- `clearHiddenHomeBoxes`: `hidden` 제거, collapsed 부모·grid-column/template 오버라이드 복원.
- CSS: `[data-chd-home-box-hidden],[data-chd-home-layout-collapsed]`에 min-height/border 강화 + `:has` 보조 규칙 + grid-span.
- multi-card grid를 “홈 박스 kind”로 숨기지 않음 / Event Hook 광고와 충돌하지 않음 (기존 가드 유지).

### Fixed — collapse empty layout space after home-box hide

- Collapse empty grid/flex parents; stretch lone remaining child to full width (`grid-column: 1 / -1`). Clear restores prior styles.

## [0.2.50] - 2026-09-23

### Fixed — 홈 박스 숨김: 카드 루트 해석 + 한글 게시판명 매칭

- `resolveHomeBoxRoot(el)`: `main_content` 안에서 가장 바깥 `[data-chd-home-box]` / `[data-board-slug]`(또는 `rounded-xl`+border+shadow 카드)로 올라갑니다. `hideHomeBoxElement`는 이 루트만 숨깁니다 — 중첩 마킹된 H3/헤더 행만 숨겨 리스트가 남는 문제를 고칩니다.
- `collectHomeBoxCandidates`: `[data-chd-home-box]` / `[data-board-slug]` 수집 시 **조상에도 동일 속성이 있으면 건너뛰고** 최외곽만 유지합니다.
- `tokensToHideKinds`: 고정 맵·ascii slug가 아닌 토큰은 `boardname:<normalize>` 추가. 별칭: `웹진`→`board:webzine`+`boardname:웹진`, `공지사항`→`board:notice`+`boardname:공지사항`, `자유게시판`→`boardname:자유게시판`.
- `ensureHiddenHomeBoxes` / `extractBoardTitleFromCard`: 게시판 요약 카드는 slug(`data-board-slug`) 또는 제목(첫 두드러진 Button/heading = item.name)으로 숨김. navigate Button(href 없음)에서도 한글 이름 매칭.
- 배타적 kind·재시도·MO·CAS 스킵(0.2.46–0.2.49) 유지.
- **템플릿 참고:** Windows 쪽 partial에서 중첩 `data-chd-home-box`를 제거하고 **카드 루트에만** 두세요 (`_recent_posts.json`, `_popular_boards.json` 등). 게시판 요약은 루트 `data-board-slug`만.

### Fixed — home-box hide: outermost root + Korean board-name match

- Hide card roots only (nested `data-chd-home-box` safe). Match board summary cards by slug or display name (`공지사항`, `자유게시판`, `웹진`).

## [0.2.49] - 2026-09-23

### Fixed — 홈 박스 숨김: 배타적 kind 분류 (부분 숨김)

- 퍼지 멀티토큰 매칭을 제거하고, 각 홈 박스 leaf를 **정확히 하나의 kind**로 분류합니다:
  `welcome`, `users`, `posts`, `comments`, `boards`, `recent_posts`, `popular_boards`, `shop`, `community_guide`, `board:<slug>`.
- `classifyHomeBox(el)`: `data-chd-home-box` → board slug(`data-board-slug` / `/board/{slug}` 인덱스, 고정 크롬 제외) → 제목/헤딩 엄격 점수. 동점·약하면 `null`(숨기지 않음). multi-child `.grid` 래퍼는 분류하지 않습니다.
- `tokensToHideKinds`: 관리자 토큰을 kind 집합으로 1:1 매핑. **`게시판`/`boards` = 통계 카드만** (모든 `board:*` 아님). 요약 카드는 `webzine` / `1:1 문의`→`board:inquiry` / `Q&A`→`board:qna` 등 slug.
- `ensureHiddenHomeBoxes`: clear 후 leaf별 kind ∈ hideSet이면 숨김. CAS 스킵·재시도·MO(0.2.46+) 유지.
- 관리자 힌트: 토큰↔kind 1:1, 부분 예 `welcome, shop, webzine`.
- **참고:** 라이브 API에 여전히 긴 숨김 목록이 있으면 짧은 목록으로 비우고 저장해야 부분 숨김이 보입니다 — 분류 수정만으로는 목록에 있는 박스가 다시 표시되지 않습니다.

### Fixed — exclusive home-box kind classification (partial hide)

- One kind per leaf; tokens map 1:1. `boards` = stats only; board cards need slug.
- If API still lists every box, clear/save a short hide list — classification alone will not unhide intentionally listed boxes.

## [0.2.48] - 2026-09-23

### Fixed — 짧은 한글 토큰 Hangul-boundary (자유게시판 ≠ 게시판)

- `needleInLabel`에서 짧은 KO 토큰(`웰컴`, `회원`, `게시글`, `댓글`, `게시판`)은 `(^|[^가-힣])TOKEN([^가-힣]|$)` 경계 매칭만 허용합니다. `게시판`이 `자유게시판`·`공지사항` 등 합성 제목에 부분문자열로 걸려 요약 카드까지 숨기던 문제를 고칩니다.
- 제목 heading이 정확히 `Boards`/`게시판`/`Members`/`회원`/…이면 통계 카드 강매칭으로 취급합니다.
- 기존 가드 유지: `게시글`/`posts` → Recent Posts, `게시판`/`boards` → Popular Boards 훔치지 않음.
- `data-chd-home-box` 정확 매칭 우선. 게시판 요약 카드는 slug 토큰(`webzine`, `inquiry`, `qna` 등)의 `data-board-slug` 또는 `/board/{slug}`만으로 숨깁니다 — 토큰 `게시판`으로는 숨기지 않습니다.
- 부분 숨김 예: `welcome, shop, webzine` → 해당 3종만; `게시판` 단독 → Boards **통계** 카드만.

### Fixed — short Korean tokens: Hangul-boundary match

- `게시판` no longer matches `자유게시판`. Board summary cards hide only via exact slug (`data-board-slug` / `/board/{slug}`).
- Exact heading boost for stat cards; 0.2.47 title/href split + EN whole-word kept.

## [0.2.47] - 2026-09-23

### Fixed — 숨길 홈 박스: 과도한 매칭(`/board/…`) 축소

- `homeBoxTitleLabel`(id·`data-chd-home-box`·slug·제목·텍스트)과 `homeBoxHrefBlob`(href만)을 분리합니다. 별칭/제목 매칭은 title만 사용합니다.
- 짧은 영문 needle(`board`/`boards`/`post`/`posts`/`user`/`users`/`member`/`members`/`comment`/`comments`/`shop`/`guide`)은 **whole-word** 매칭만 허용합니다. `/board/notice` 같은 경로에 `board` 부분문자열이 걸려 모든 게시판 요약 카드가 숨겨지던 문제를 고칩니다.
- slug 토큰(`/^[a-z0-9][a-z0-9_-]*$/i`)만 `data-board-slug` 또는 `/board/{tok}` 경로 세그먼트로 정확 매칭합니다.
- `게시글`/`posts` → Recent Posts, `게시판`/`boards` → Popular Boards 가드와 0.2.46 재시도·MO·CAS 스킵은 유지합니다.
- 홈이 비어 보이면 「숨길 홈 박스」를 **비우고 저장**하세요. 저장된 목록이 거의 모든 박스를 숨기도록 되어 있을 수 있습니다.

### Fixed — hide home boxes: narrower matching (no /board/… alias bleed)

- Title vs href split; short English needles are whole-word only.
- Exact slug path match for slug-like tokens; clear the hide field + save if home looks empty.

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
