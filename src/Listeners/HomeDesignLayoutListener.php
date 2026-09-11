<?php

namespace Modules\Custom\HomeDesign\Listeners;

use App\Contracts\Extension\HookListenerInterface;
use Modules\Custom\HomeDesign\Models\HomeDesignSetting;
use Modules\Custom\HomeDesign\Services\HomeDesignSettingService;

/**
 * Official sirsoft-basic `_user_base` patches (no feat React dependency).
 *
 * Ports layout differences from keidischoi/g7-template-sirsoft-basic
 * feat/open-in-new-tab-1.1.51:
 *  - main_content + main_content_area content-column max-w-* (settings content_max_width_px, default 1240)
 *  - desktop_header boards filter by hide_header_board_slugs (default empty — show all)
 *  - footer props.linkGroups when footer_link_groups is set (+ icon enrich for feat Footer)
 *  - businessInfo prop on Footer (feat) + JS places notice under shop name (official)
 *  - JS via module.json assets.global + config Div (NEVER layout scripts chd_home_design_* ids)
 *
 * Header search icon + dark-mode click toggle are applied by home-design.js (0.2.5+; 0.2.8 robust selectors).
 * Desktop top-nav hide: boot.js critical CSS + home-design.js; header data-chd-hide-top-nav (no MutationObserver since 0.2.1).
 * 0.2.10: ALL hook entry points + apply() swallow Throwable — never site-wide HTTP 500.
 * 0.2.12: board hide apply hardened (slug/name/id/href); business beside shop name; footer link icons.
 * 0.2.13: global boards hide consistency; business beside brand; emoji footer icons; admin checkboxes.
 */
class HomeDesignLayoutListener implements HookListenerInterface
{
    private const SCRIPT_ID = 'chd_home_design_js';

    private const SCRIPT_SRC = '/api/modules/custom-home_design/assets/home-design.js';

    private const BOOT_SCRIPT_ID = 'chd_home_design_boot_js';

    private const BOOT_SCRIPT_SRC = '/api/modules/custom-home_design/assets/boot.js';

    private const BUSINESS_MOUNT_ID = 'chd_business_info_mount';

    private const BUSINESS_BLOCK_ID = 'chd_business_info_block';

    private ?HomeDesignSetting $cached = null;

    private bool $cacheLoaded = false;

    public static function getSubscribedHooks(): array
    {
        return [
            'core.layout.filter_child_data' => [
                'method' => 'filterChildLayout',
                'priority' => 45,
                'type' => 'filter',
                'sync' => true,
            ],
            'core.layout.filter_merged' => [
                'method' => 'filterMergedLayout',
                'priority' => 45,
                'type' => 'filter',
                'sync' => true,
            ],
            'core.layout_extension.after_apply' => [
                'method' => 'afterExtensions',
                'priority' => 900,
                'type' => 'filter',
                'sync' => true,
            ],
        ];
    }

    public function handle(...$args): void
    {
        // no-op — never throw
    }

    /**
     * CRITICAL: hook filters must NEVER throw — a Throwable here becomes site-wide HTTP 500.
     * Broken 미설치 / missing table / unbound service must soft-fail to the original layout.
     */
    public function filterChildLayout(mixed $childLayout = null, mixed $parentLayout = null): mixed
    {
        try {
            if (! is_array($childLayout)) {
                return $childLayout;
            }

            return $this->apply($childLayout);
        } catch (\Throwable) {
            return $childLayout;
        }
    }

    public function filterMergedLayout(mixed $merged = null, mixed $parentLayout = null, mixed $childLayout = null): mixed
    {
        try {
            if (! is_array($merged)) {
                return $merged;
            }
            if (empty($merged['layout_name']) && is_array($childLayout) && ! empty($childLayout['layout_name'])) {
                $merged['layout_name'] = $childLayout['layout_name'];
            }

            return $this->apply($merged);
        } catch (\Throwable) {
            return $merged;
        }
    }

    public function afterExtensions(mixed $layout = null, mixed $templateId = null): mixed
    {
        try {
            if (! is_array($layout)) {
                return $layout;
            }

            return $this->apply($layout);
        } catch (\Throwable) {
            return $layout;
        }
    }

    private function apply(array $layout): array
    {
        try {
            $settings = $this->settings();
            // Module manager activation is enough — do not gate on settings.enabled (removed from admin in 0.2.4).
            if (! $settings) {
                return $layout;
            }

            // Always try to ensure script when we touch layouts that include chrome.
            $layoutName = (string) ($layout['layout_name'] ?? '');
            $hasChrome = false;
            try {
                $hasChrome = $this->findById($layout, 'desktop_header') !== null
                    || $this->findById($layout, 'main_content') !== null
                    || $this->findById($layout, 'footer') !== null
                    || $this->findById($layout, self::BUSINESS_MOUNT_ID) !== null
                    || $layoutName === '_user_base'
                    || $layoutName === 'home';
            } catch (\Throwable) {
                $hasChrome = ($layoutName === '_user_base' || $layoutName === 'home');
            }

            if (! $hasChrome) {
                return $layout;
            }

            $px = (int) ($settings->content_max_width_px ?? HomeDesignSetting::DEFAULT_CONTENT_MAX_WIDTH_PX);
            if ($px < 320 || $px > 2560) {
                $px = HomeDesignSetting::DEFAULT_CONTENT_MAX_WIDTH_PX;
            }

            // Each patch isolated — one failure must not abort the rest or the request.
            try {
                $layout = $this->patchMainContentWidth($layout, $px);
            } catch (\Throwable) {
            }
            try {
                $layout = $this->patchContentColumnWidths($layout, $px);
            } catch (\Throwable) {
            }
            try {
                $layout = $this->patchHomeContentWidth($layout, $px);
            } catch (\Throwable) {
            }
            try {
                $layout = $this->patchDesktopHeaderBoards($layout, $settings->hide_header_board_slugs ?? []);
            } catch (\Throwable) {
            }
            try {
                $layout = $this->patchFooterLinkGroups($layout, $settings->footer_link_groups ?? null);
            } catch (\Throwable) {
            }
            try {
                $layout = $this->fillBusinessInfoMount($layout, $settings);
            } catch (\Throwable) {
            }
            try {
                $layout = $this->patchHideDesktopTopNavAttr($layout, $settings);
            } catch (\Throwable) {
            }
            try {
                $layout = $this->patchCurrencySelectorVisibility($layout);
            } catch (\Throwable) {
            }
            try {
                $layout = $this->ensureScripts($layout);
            } catch (\Throwable) {
            }

            return $layout;
        } catch (\Throwable) {
            return $layout;
        }
    }

    private function settings(): ?HomeDesignSetting
    {
        if ($this->cacheLoaded) {
            return $this->cached;
        }
        $this->cacheLoaded = true;
        try {
            if (! class_exists(HomeDesignSettingService::class)) {
                $this->cached = null;

                return null;
            }
            /** @var HomeDesignSettingService|null $svc */
            $svc = null;
            try {
                $svc = app(HomeDesignSettingService::class);
            } catch (\Throwable) {
                // Unbound / half-installed module — soft fail
                $this->cached = null;

                return null;
            }
            if (! $svc) {
                $this->cached = null;

                return null;
            }
            $this->cached = $svc->get();
        } catch (\Throwable) {
            $this->cached = null;
        }

        return $this->cached;
    }

    /**
     * Business notice (0.2.12):
     *  - Always set Footer props.businessInfo when enabled (feat Footer renders under siteName).
     *  - Do NOT insert awkward sibling block before footer (0.2.11 path) — official ignores
     *    businessInfo, so home-design.js places text BESIDE shop-name/logo (H3) in footer.
     *  - Clear legacy mount/sibling nodes left from older versions.
     */
    private function fillBusinessInfoMount(array $layout, HomeDesignSetting $settings): array
    {
        // Always remove legacy awkward sibling / empty mount from older installs.
        $layout = $this->removeNodeById($layout, self::BUSINESS_BLOCK_ID);
        $layout = $this->updateNodeById($layout, self::BUSINESS_MOUNT_ID, static function (array $node): array {
            $node['children'] = [];

            return $node;
        });
        // Hide leftover mount wrapper if still injected by extension.
        $layout = $this->updateNodeById($layout, self::BUSINESS_MOUNT_ID, static function (array $node): array {
            if (! isset($node['props']) || ! is_array($node['props'])) {
                $node['props'] = [];
            }
            $cls = (string) ($node['props']['className'] ?? '');
            if (! str_contains($cls, 'hidden')) {
                $node['props']['className'] = trim($cls.' hidden');
            }
            $node['props']['aria-hidden'] = 'true';

            return $node;
        });

        if (! filter_var($settings->business_info_enabled, FILTER_VALIDATE_BOOLEAN)) {
            // Clear businessInfo prop when disabled
            return $this->updateNodeById($layout, 'footer', static function (array $node): array {
                if (isset($node['props']) && is_array($node['props'])) {
                    unset($node['props']['businessInfo']);
                }

                return $node;
            });
        }

        $bi = [];
        try {
            $bi = app(HomeDesignSettingService::class)->getEcommerceBusinessInfo();
        } catch (\Throwable) {
            $bi = [];
        }

        return $this->updateNodeById($layout, 'footer', static function (array $node) use ($bi): array {
            if (! isset($node['props']) || ! is_array($node['props'])) {
                $node['props'] = [];
            }
            $node['props']['businessInfo'] = [
                'companyName' => (string) ($bi['companyName'] ?? ''),
                'representative' => (string) ($bi['representative'] ?? ''),
                'businessNumber' => (string) ($bi['businessNumber'] ?? ''),
                'mailOrderNumber' => (string) ($bi['mailOrderNumber'] ?? ''),
                'address' => (string) ($bi['address'] ?? ''),
                'phone' => (string) ($bi['phone'] ?? ''),
                'email' => (string) ($bi['email'] ?? ''),
            ];

            return $node;
        });
    }

    /**
     * Build display parts from sirsoft-ecommerce basic_info (feat Footer mapping).
     *
     * @return list<string>
     */
    private function buildBusinessParts(): array
    {
        try {
            $bi = app(HomeDesignSettingService::class)->getEcommerceBusinessInfo();
        } catch (\Throwable) {
            $bi = [];
        }

        $parts = [];
        $company = trim((string) ($bi['companyName'] ?? ''));
        $rep = trim((string) ($bi['representative'] ?? ''));
        $number = trim((string) ($bi['businessNumber'] ?? ''));
        $mailOrder = trim((string) ($bi['mailOrderNumber'] ?? ''));
        $address = trim((string) ($bi['address'] ?? ''));
        $phone = trim((string) ($bi['phone'] ?? ''));
        $email = trim((string) ($bi['email'] ?? ''));

        if ($company !== '') {
            $parts[] = $company;
        }
        if ($rep !== '') {
            $parts[] = '대표 '.$rep;
        }
        if ($number !== '') {
            $parts[] = '사업자등록번호 '.$number;
        }
        if ($mailOrder !== '') {
            $parts[] = '통신판매업신고 '.$mailOrder;
        }
        if ($address !== '') {
            $parts[] = $address;
        }
        if ($phone !== '') {
            $parts[] = '전화 '.$phone;
        }
        if ($email !== '') {
            $parts[] = '이메일 '.$email;
        }

        return $parts;
    }

    /**
     * Filter header boards by hide_header_board_slugs:
     *  - desktop_header props.boards (composite Header — feeds visible + 더보기)
     *  - any iteration.source / props.source that reads boards.data (mobile menu Repeat)
     *
     * 0.2.12: when slugs non-empty, NEVER restore official unfiltered expression.
     * Match slug, name, id, and href path (/board/{slug}, /boards/{slug}).
     *
     * @param  list<string>|array|mixed  $slugs
     */
    private function patchDesktopHeaderBoards(array $layout, mixed $slugs): array
    {
        $slugs = $this->normalizeHideBoardSlugs($slugs);

        // Always mark desktop header so JS/CSS can find it even when composite
        // Header drops the layout node id from the DOM.
        $layout = $this->updateNodeById($layout, 'desktop_header', static function (array $node) use ($slugs): array {
            if (! isset($node['props']) || ! is_array($node['props'])) {
                $node['props'] = [];
            }
            $cls = (string) ($node['props']['className'] ?? '');
            if (! str_contains($cls, 'chd-desktop-header')) {
                $node['props']['className'] = trim($cls.' chd-desktop-header');
            }
            if (empty($node['props']['id'])) {
                $node['props']['id'] = 'desktop_header';
            }
            // JS fallback reads this even if expression filter misses.
            if ($slugs !== []) {
                $node['props']['data-chd-hide-board-slugs'] = implode(',', $slugs);
            } else {
                unset($node['props']['data-chd-hide-board-slugs']);
            }
            if (isset($node['responsive']) && is_array($node['responsive'])) {
                foreach ($node['responsive'] as $bp => $bpVal) {
                    if (! is_array($bpVal)) {
                        continue;
                    }
                    if (! isset($bpVal['props']) || ! is_array($bpVal['props'])) {
                        $bpVal['props'] = [];
                    }
                    $bpCls = (string) ($bpVal['props']['className'] ?? '');
                    if (! str_contains($bpCls, 'chd-desktop-header')) {
                        $bpVal['props']['className'] = trim($bpCls.' chd-desktop-header');
                    }
                    if ($slugs !== []) {
                        $bpVal['props']['data-chd-hide-board-slugs'] = implode(',', $slugs);
                    } else {
                        unset($bpVal['props']['data-chd-hide-board-slugs']);
                    }
                    $node['responsive'][$bp] = $bpVal;
                }
            }

            return $node;
        });

        $officialExpr = '{{boards.data ?? []}}';

        // EMPTY (0.2.13): ALWAYS force official unfiltered expression on EVERY page.
        // Live feat/_user_base hardcodes filter(!qna/inquiry) — must overwrite globally
        // (home + board + shop + …). Never leave .filter( or data-chd-hide-board-slugs.
        if ($slugs === []) {
            $layout = $this->updateNodeById($layout, 'desktop_header', static function (array $node) use ($officialExpr): array {
                if (! isset($node['props']) || ! is_array($node['props'])) {
                    $node['props'] = [];
                }
                $node['props']['boards'] = $officialExpr;
                unset($node['props']['data-chd-hide-board-slugs']);
                if (isset($node['responsive']) && is_array($node['responsive'])) {
                    foreach ($node['responsive'] as $bp => $bpVal) {
                        if (! is_array($bpVal)) {
                            continue;
                        }
                        if (! isset($bpVal['props']) || ! is_array($bpVal['props'])) {
                            $bpVal['props'] = [];
                        }
                        unset($bpVal['props']['data-chd-hide-board-slugs']);
                        if (isset($bpVal['props']['boards']) && is_string($bpVal['props']['boards'])
                            && str_contains($bpVal['props']['boards'], 'boards.data')) {
                            $bpVal['props']['boards'] = $officialExpr;
                        }
                        $node['responsive'][$bp] = $bpVal;
                    }
                }

                return $node;
            });

            return $this->mapNodes($layout, function (array $node) use ($officialExpr): array {
                // Any Header-like boards prop (id may differ across pages)
                if (($node['name'] ?? '') === 'Header' || ($node['id'] ?? '') === 'desktop_header') {
                    if (! isset($node['props']) || ! is_array($node['props'])) {
                        $node['props'] = [];
                    }
                    if (isset($node['props']['boards']) && is_string($node['props']['boards'])
                        && str_contains($node['props']['boards'], 'boards.data')) {
                        $node['props']['boards'] = $officialExpr;
                    }
                    unset($node['props']['data-chd-hide-board-slugs']);
                }
                if (isset($node['iteration']) && is_array($node['iteration'])) {
                    $src = $node['iteration']['source'] ?? null;
                    if (is_string($src) && str_contains($src, 'boards.data')) {
                        $node['iteration']['source'] = $officialExpr;
                    }
                }
                if (isset($node['props']) && is_array($node['props'])) {
                    $src = $node['props']['source'] ?? null;
                    if (is_string($src) && str_contains($src, 'boards.data')) {
                        $node['props']['source'] = $officialExpr;
                    }
                    if (isset($node['props']['boards']) && is_string($node['props']['boards'])
                        && str_contains($node['props']['boards'], 'boards.data')) {
                        $node['props']['boards'] = $officialExpr;
                    }
                    unset($node['props']['data-chd-hide-board-slugs']);
                }

                return $node;
            });
        }

        // NON-EMPTY: always overwrite boards expressions (never leave official unfiltered).
        $expr = $this->buildBoardsFilterExpression($slugs);

        $layout = $this->updateNodeById($layout, 'desktop_header', static function (array $node) use ($expr): array {
            if (! isset($node['props']) || ! is_array($node['props'])) {
                $node['props'] = [];
            }
            $node['props']['boards'] = $expr;

            return $node;
        });

        // Mobile drawer + any Repeat over boards.data — replace even if a prior .filter( exists.
        return $this->mapNodes($layout, function (array $node) use ($expr): array {
            if (isset($node['iteration']) && is_array($node['iteration'])) {
                $src = $node['iteration']['source'] ?? null;
                if (is_string($src) && str_contains($src, 'boards.data')) {
                    $node['iteration']['source'] = $expr;
                }
            }
            if (isset($node['props']) && is_array($node['props'])) {
                $src = $node['props']['source'] ?? null;
                if (is_string($src) && str_contains($src, 'boards.data')) {
                    $node['props']['source'] = $expr;
                }
                // Also patch boards prop on any Header-like node (id may be missing).
                if (isset($node['props']['boards']) && is_string($node['props']['boards'])
                    && str_contains($node['props']['boards'], 'boards.data')) {
                    $node['props']['boards'] = $expr;
                }
            }

            return $node;
        });
    }

    /**
     * Normalize admin/DB hide_header_board_slugs into a clean list of strings.
     * Tolerates JSON string, comma text, or nested array — never character-split a JSON string.
     *
     * @return list<string>
     */
    private function normalizeHideBoardSlugs(mixed $slugs): array
    {
        if ($slugs === null || $slugs === '' || $slugs === []) {
            return [];
        }
        if (is_string($slugs)) {
            $trim = trim($slugs);
            if ($trim === '') {
                return [];
            }
            if (($trim[0] ?? '') === '[' || ($trim[0] ?? '') === '{') {
                $decoded = json_decode($trim, true);
                if (is_array($decoded)) {
                    $slugs = $decoded;
                } else {
                    return [];
                }
            } else {
                $slugs = preg_split('/\s*,\s*/', $trim) ?: [];
            }
        }
        if (! is_array($slugs)) {
            return [];
        }

        $out = [];
        $seen = [];
        foreach ($slugs as $s) {
            if (is_array($s)) {
                // accidental nested
                foreach ($this->normalizeHideBoardSlugs($s) as $inner) {
                    if (! isset($seen[$inner])) {
                        $seen[$inner] = true;
                        $out[] = $inner;
                    }
                }
                continue;
            }
            if (! is_string($s) && ! is_numeric($s)) {
                continue;
            }
            $t = trim((string) $s);
            if ($t === '') {
                continue;
            }
            // Strip accidental /board/ prefix from admin input
            $t = preg_replace('#^/+boards?/#', '', $t) ?? $t;
            $t = trim($t, '/');
            if ($t === '' || isset($seen[$t])) {
                continue;
            }
            $seen[$t] = true;
            $out[] = $t;
            $lower = strtolower($t);
            if ($lower !== $t && ! isset($seen[$lower])) {
                $seen[$lower] = true;
                $out[] = $lower;
            }
        }

        return array_values($out);
    }

    /**
     * @param  list<string>  $slugs
     */
    private function buildBoardsFilterExpression(array $slugs): string
    {
        $parts = [];
        foreach ($slugs as $slug) {
            $parts[] = "'".str_replace(["\\", "'"], ["\\\\", "\\'"], $slug)."'";
        }
        $list = '['.implode(', ', $parts).']';

        // G7's safe expression evaluator supports arrow callbacks used by the official
        // theme, but a nested `function has(){}` declaration is not bound as a local
        // statement. That made evaluation fail and Header received no boards at all.
        // Filter only on the official board slug shape, with legacy key fallbacks.
        return '{{(boards.data ?? []).filter(b => !'.$list
            .'.includes(String(b?.slug ?? b?.bo_table ?? b?.id ?? "").toLowerCase()))}}';
    }

    private function patchMainContentWidth(array $layout, int $px): array
    {
        $px = max(320, min(2560, $px > 0 ? $px : HomeDesignSetting::DEFAULT_CONTENT_MAX_WIDTH_PX));

        return $this->updateNodeById($layout, 'main_content', static function (array $node) use ($px): array {
            if (! isset($node['responsive']) || ! is_array($node['responsive'])) {
                $node['responsive'] = [];
            }
            if (! isset($node['responsive']['desktop']) || ! is_array($node['responsive']['desktop'])) {
                $node['responsive']['desktop'] = [];
            }
            if (! isset($node['responsive']['desktop']['props']) || ! is_array($node['responsive']['desktop']['props'])) {
                $node['responsive']['desktop']['props'] = [];
            }

            $props = &$node['responsive']['desktop']['props'];
            $className = (string) ($props['className'] ?? 'min-h-fit mx-auto px-8');
            // Drop Tailwind max-w-* so inline maxWidth wins; keep spacing utilities.
            $className = trim(preg_replace('/\bmax-w-[A-Za-z0-9\[\]\-\/]+\b/', '', $className) ?? $className);
            if ($className === '') {
                $className = 'min-h-fit mx-auto px-8';
            }
            if (! str_contains($className, 'mx-auto')) {
                $className .= ' mx-auto';
            }
            if (! str_contains($className, 'chd-content-col')) {
                $className = trim($className.' chd-content-col');
            }
            $props['className'] = trim($className);

            $style = isset($props['style']) && is_array($props['style']) ? $props['style'] : [];
            $style['maxWidth'] = $px.'px';
            $style['width'] = '100%';
            $style['marginInline'] = 'auto';
            $props['style'] = $style;

            if (! isset($node['props']) || ! is_array($node['props'])) {
                $node['props'] = [];
            }
            $baseCls = (string) ($node['props']['className'] ?? '');
            $baseCls = trim(preg_replace('/\bmax-w-[A-Za-z0-9\[\]\-\/]+\b/', '', $baseCls) ?? $baseCls);
            if (! str_contains($baseCls, 'chd-content-col')) {
                $baseCls = trim($baseCls.' chd-content-col');
            }
            $node['props']['className'] = $baseCls;
            $baseStyle = isset($node['props']['style']) && is_array($node['props']['style']) ? $node['props']['style'] : [];
            $baseStyle['maxWidth'] = $px.'px';
            $baseStyle['width'] = '100%';
            $baseStyle['marginInline'] = 'auto';
            $node['props']['style'] = $baseStyle;
            $node['props']['data-chd-max-width'] = (string) $px;
            // Also set props.id so #main_content survives if node id mapping drops
            if (empty($node['props']['id']) && ($node['id'] ?? '') === 'main_content') {
                $node['props']['id'] = 'main_content';
            }

            return $node;
        });
    }

    /**
     * Align other content-column Containers (feat ad_global_top/bottom inner
     * max-w-7xl wraps under main_content_area, nested home max-w-* boxes) to
     * the same content_max_width_px. Skips bare w-full full-bleed wrappers
     * that have no max-w-* utility.
     */
    private function patchContentColumnWidths(array $layout, int $px): array
    {
        $px = max(320, min(2560, $px > 0 ? $px : HomeDesignSetting::DEFAULT_CONTENT_MAX_WIDTH_PX));

        $area = $this->findById($layout, 'main_content_area');
        if ($area === null) {
            // Still walk whole layout for stray content-column max-w nodes
            // when area id is missing (partial merges).
            return $this->mapNodes($layout, function (array $node) use ($px): array {
                return $this->maybePatchMaxWidthNode($node, $px, skipMainContent: true);
            });
        }

        $patchedArea = $this->mapNodes($area, function (array $node) use ($px): array {
            return $this->maybePatchMaxWidthNode($node, $px, skipMainContent: true);
        });

        return $this->updateNodeById($layout, 'main_content_area', static fn (array $node): array => $patchedArea);
    }

    /**
     * @param  callable(array): array  $mutator
     */
    private function mapNodes(array $node, callable $mutator): array
    {
        $node = $mutator($node);

        foreach (['children', 'components', 'content'] as $key) {
            if (! isset($node[$key]) || ! is_array($node[$key])) {
                continue;
            }
            foreach ($node[$key] as $i => $child) {
                if (is_array($child)) {
                    $node[$key][$i] = $this->mapNodes($child, $mutator);
                }
            }
        }

        if (isset($node['slots']) && is_array($node['slots'])) {
            foreach ($node['slots'] as $sk => $slot) {
                if (! is_array($slot)) {
                    continue;
                }
                if (array_is_list($slot)) {
                    foreach ($slot as $i => $child) {
                        if (is_array($child)) {
                            $node['slots'][$sk][$i] = $this->mapNodes($child, $mutator);
                        }
                    }
                } else {
                    $node['slots'][$sk] = $this->mapNodes($slot, $mutator);
                }
            }
        }

        return $node;
    }

    /**
     * If node className (props or desktop responsive) contains max-w-*, replace
     * with inline maxWidth = $px and mark data-chd-max-width. main_content is
     * handled by patchMainContentWidth — skip when requested.
     */
    private function maybePatchMaxWidthNode(array $node, int $px, bool $skipMainContent = false): array
    {
        if ($skipMainContent && ($node['id'] ?? null) === 'main_content') {
            return $node;
        }

        $hasMaxW = false;

        if (isset($node['props']) && is_array($node['props'])) {
            [$node['props'], $hit] = $this->stripMaxWAndSetWidth($node['props'], $px);
            $hasMaxW = $hasMaxW || $hit;
        }

        if (isset($node['responsive']) && is_array($node['responsive'])) {
            foreach ($node['responsive'] as $bp => $bpVal) {
                if (! is_array($bpVal) || ! isset($bpVal['props']) || ! is_array($bpVal['props'])) {
                    continue;
                }
                [$node['responsive'][$bp]['props'], $hit] = $this->stripMaxWAndSetWidth(
                    $bpVal['props'],
                    $px
                );
                $hasMaxW = $hasMaxW || $hit;
            }
        }

        if ($hasMaxW) {
            if (! isset($node['props']) || ! is_array($node['props'])) {
                $node['props'] = [];
            }
            $node['props']['data-chd-max-width'] = (string) $px;
        }

        return $node;
    }

    /**
     * @param  array<string, mixed>  $props
     * @return array{0: array<string, mixed>, 1: bool}
     */
    private function stripMaxWAndSetWidth(array $props, int $px): array
    {
        $hit = false;
        $className = (string) ($props['className'] ?? '');
        if ($className !== '' && preg_match('/\bmax-w-[A-Za-z0-9\[\]\-\/]+\b/', $className)) {
            $className = trim(preg_replace('/\bmax-w-[A-Za-z0-9\[\]\-\/]+\b/', '', $className) ?? $className);
            if ($className === '') {
                $className = 'mx-auto';
            }
            if (! str_contains($className, 'mx-auto')) {
                $className .= ' mx-auto';
            }
            if (! str_contains($className, 'chd-content-col')) {
                $className = trim($className.' chd-content-col');
            }
            $props['className'] = trim($className);
            $hit = true;
        }

        $style = isset($props['style']) && is_array($props['style']) ? $props['style'] : [];
        if (isset($style['maxWidth']) || isset($style['max-width'])) {
            // Theme hardcoded maxWidth (1240px / 80rem / etc.) — align to setting.
            $hit = true;
        }
        if ($hit || isset($props['data-chd-max-width'])) {
            $style['maxWidth'] = $px.'px';
            $style['width'] = $style['width'] ?? '100%';
            $style['marginInline'] = $style['marginInline'] ?? 'auto';
            unset($style['max-width']);
            $props['style'] = $style;
            $cls2 = (string) ($props['className'] ?? '');
            if ($cls2 !== '' && ! str_contains($cls2, 'chd-content-col')) {
                $props['className'] = trim($cls2.' chd-content-col');
            } elseif ($cls2 === '' && $hit) {
                $props['className'] = 'chd-content-col mx-auto';
            }
            $hit = true;
        }

        return [$props, $hit];
    }

    /**
     * Home layout mid/lower section wrappers: root Container + any nested
     * Containers/Divs that constrain width. Full-bleed heroes (w-full only,
     * carousel) are skipped. Also runs when child layout_name === home.
     */
    private function patchHomeContentWidth(array $layout, int $px): array
    {
        $px = max(320, min(2560, $px > 0 ? $px : HomeDesignSetting::DEFAULT_CONTENT_MAX_WIDTH_PX));
        $layoutName = (string) ($layout['layout_name'] ?? '');

        // Always walk slots.content when present (home / merged pages).
        if (isset($layout['slots']['content']) && is_array($layout['slots']['content'])) {
            foreach ($layout['slots']['content'] as $i => $child) {
                if (is_array($child)) {
                    $layout['slots']['content'][$i] = $this->mapNodes($child, function (array $node) use ($px): array {
                        return $this->maybePatchHomeWidthNode($node, $px);
                    });
                }
            }
        }

        if ($layoutName === 'home') {
            $layout = $this->mapNodes($layout, function (array $node) use ($px): array {
                return $this->maybePatchHomeWidthNode($node, $px);
            });
        }

        return $layout;
    }

    /**
     * Home section wrappers/grids should FILL `#main_content`.
     * The content-column cap lives only on `#main_content`; a second px cap on
     * nested Containers made the home boxes narrower than the setting.
     */
    private function maybePatchHomeWidthNode(array $node, int $px): array
    {
        $id = strtolower((string) ($node['id'] ?? ''));
        $name = (string) ($node['name'] ?? '');
        if (str_contains($id, 'hero') || str_contains($id, 'carousel') || str_contains($id, 'full_bleed') || str_contains($id, 'full-bleed')) {
            return $node;
        }

        if (($node['id'] ?? null) === 'main_content') {
            return $this->maybePatchMaxWidthNode($node, $px, skipMainContent: false);
        }

        $isContainer = ($node['type'] ?? '') === 'layout' && $name === 'Container';
        $className = (string) (($node['props']['className'] ?? '') ?: '');
        $isGrid = $className !== '' && preg_match('/\bgrid\b/', $className);
        if (! $isContainer && ! $isGrid) {
            return $node;
        }

        return $this->markHomeFillNode($node);
    }

    /**
     * @param  array<string, mixed>  $node
     * @return array<string, mixed>
     */
    private function markHomeFillNode(array $node): array
    {
        $apply = static function (array $props): array {
            $className = trim((string) ($props['className'] ?? ''));
            if ($className !== '' && ! str_contains($className, 'w-full')) {
                $className = trim($className.' w-full');
            }
            if ($className !== '' && ! str_contains($className, 'chd-home-fill')) {
                $className = trim($className.' chd-home-fill');
            }
            if ($className !== '') {
                $props['className'] = $className;
            }
            $style = isset($props['style']) && is_array($props['style']) ? $props['style'] : [];
            $style['width'] = '100%';
            $style['maxWidth'] = '100%';
            unset($style['max-width']);
            $props['style'] = $style;
            $props['data-chd-home-fill'] = '1';
            unset($props['data-chd-max-width']);

            return $props;
        };

        if (! isset($node['props']) || ! is_array($node['props'])) {
            $node['props'] = [];
        }
        $node['props'] = $apply($node['props']);

        if (isset($node['responsive']) && is_array($node['responsive'])) {
            foreach ($node['responsive'] as $bp => $bpVal) {
                if (! is_array($bpVal)) {
                    continue;
                }
                if (! isset($bpVal['props']) || ! is_array($bpVal['props'])) {
                    $bpVal['props'] = [];
                }
                $bpVal['props'] = $apply($bpVal['props']);
                $node['responsive'][$bp] = $bpVal;
            }
        }

        return $node;
    }

    private function patchFooterLinkGroups(array $layout, mixed $groups): array
    {
        // Always mark footer for JS/CSS targeting (composite Footer may drop id).
        $layout = $this->updateNodeById($layout, 'footer', static function (array $node): array {
            if (! isset($node['props']) || ! is_array($node['props'])) {
                $node['props'] = [];
            }
            $cls = (string) ($node['props']['className'] ?? '');
            if (! str_contains($cls, 'chd-footer')) {
                $node['props']['className'] = trim($cls.' chd-footer');
            }
            if (empty($node['props']['id'])) {
                $node['props']['id'] = 'footer';
            }

            return $node;
        });

        // 0.2.13: official Footer ignores link.icon — always set linkGroups with
        // emoji-prefixed labels (admin JSON or Korean defaults) so icons show without JS.
        try {
            if (! is_array($groups) || $groups === []) {
                $groups = HomeDesignSettingService::defaultFooterLinkGroupsWithEmojis();
            } else {
                $groups = HomeDesignSettingService::enrichFooterLinkGroupIcons($groups);
                $groups = HomeDesignSettingService::prependFooterLinkEmojis($groups);
            }
        } catch (\Throwable) {
            $groups = HomeDesignSettingService::defaultFooterLinkGroupsWithEmojis();
        }

        return $this->updateNodeById($layout, 'footer', static function (array $node) use ($groups): array {
            if (! isset($node['props']) || ! is_array($node['props'])) {
                $node['props'] = [];
            }
            $node['props']['linkGroups'] = $groups;

            return $node;
        });
    }

    /**
     * Show the ecommerce currency icon only on shopping layouts.
     * `_user_base` is left untouched so shop children keep the injected slot.
     */
    private function patchCurrencySelectorVisibility(array $layout): array
    {
        if ($this->isShopRelatedLayout((string) ($layout['layout_name'] ?? ''))) {
            return $layout;
        }

        return $this->mapNodes($layout, function (array $node): array {
            $id = (string) ($node['id'] ?? '');
            $slot = (string) ($node['slot'] ?? '');
            $slotId = '';
            if (isset($node['props']) && is_array($node['props'])) {
                $slotId = (string) ($node['props']['slotId'] ?? '');
            }
            $isCurrency = $id === 'ext_header_currency_selector'
                || $id === 'header_currency_inject_anchor'
                || $id === 'mobile_drawer_currency_wrap'
                || $id === 'header_currency_slot_desktop'
                || str_starts_with($id, 'ext_header_currency_selector')
                || $slot === 'header_currency'
                || $slotId === 'header_currency';
            if ($isCurrency) {
                $node['if'] = '{{false}}';
            }

            return $node;
        });
    }

    private function isShopRelatedLayout(string $layoutName): bool
    {
        $name = trim($layoutName);
        if ($name === '' || $name === '_user_base') {
            return true;
        }
        if ($name === 'shop' || str_starts_with($name, 'shop/')) {
            return true;
        }
        foreach (['mypage/orders', 'mypage/wishlist', 'mypage/mileage', 'mypage/addresses'] as $prefix) {
            if ($name === $prefix || str_starts_with($name, $prefix.'/')) {
                return true;
            }
        }

        return false;
    }

    /**
     * Mark desktop header so CSS can target hide even if #id is missing on some builds.
     */
    private function patchHideDesktopTopNavAttr(array $layout, HomeDesignSetting $settings): array
    {
        $hide = (bool) $settings->hide_desktop_top_nav;

        return $this->updateNodeById($layout, 'desktop_header', static function (array $node) use ($hide): array {
            if (! isset($node['props']) || ! is_array($node['props'])) {
                $node['props'] = [];
            }
            $applyCls = static function (string $cls) use ($hide): string {
                if ($hide) {
                    if (! str_contains($cls, 'chd-hide-top-nav')) {
                        $cls = trim($cls.' chd-hide-top-nav');
                    }

                    return $cls;
                }

                return trim(preg_replace('/\bchd-hide-top-nav\b/', '', $cls) ?? $cls);
            };

            if ($hide) {
                $node['props']['data-chd-hide-top-nav'] = '1';
            } else {
                unset($node['props']['data-chd-hide-top-nav']);
            }
            $node['props']['className'] = $applyCls((string) ($node['props']['className'] ?? ''));

            if (isset($node['responsive']) && is_array($node['responsive'])) {
                foreach ($node['responsive'] as $bp => $bpVal) {
                    if (! is_array($bpVal)) {
                        continue;
                    }
                    if (! isset($bpVal['props']) || ! is_array($bpVal['props'])) {
                        $bpVal['props'] = [];
                    }
                    $bpVal['props']['className'] = $applyCls((string) ($bpVal['props']['className'] ?? ''));
                    if ($hide) {
                        $bpVal['props']['data-chd-hide-top-nav'] = '1';
                    } else {
                        unset($bpVal['props']['data-chd-hide-top-nav']);
                    }
                    $node['responsive'][$bp] = $bpVal;
                }
            }

            return $node;
        });
    }

    /**
     * 0.2.12: NEVER register layout scripts with ids chd_home_design_boot_js /
     * chd_home_design_js (G7 TemplateApp.loadLayoutScripts → AssetFailureNotice toast
     * "N개 항목을 불러오지 못했습니다" when module disabled / assets 404).
     *
     * Instead:
     *  - Strip any leftover those ids (and Component nodes) from the layout
     *  - Inject a hidden Div with data-chd-settings (inline boot payload, no 404)
     *  - JS loads via module.json assets.loading=global (ModuleAssetLoader; only when
     *    module active) → dist/js/module.iife.js dynamically loads home-design.js
     */
    private function ensureScripts(array $layout): array
    {
        $layout = $this->stripLegacyHomeDesignScripts($layout);
        $layout = $this->ensureConfigDiv($layout);

        return $layout;
    }

    /**
     * Remove ALL legacy layout.scripts entries and Script/Component nodes that used
     * chd_home_design* ids (causes failure toast when module is off).
     */
    private function stripLegacyHomeDesignScripts(array $layout): array
    {
        $bannedIds = [
            self::BOOT_SCRIPT_ID,
            self::SCRIPT_ID,
            'chd_home_design',
            'chd_home_design_boot',
            'chd_home_design_main',
        ];

        if (isset($layout['scripts']) && is_array($layout['scripts'])) {
            $layout['scripts'] = array_values(array_filter(
                $layout['scripts'],
                static function ($script) use ($bannedIds): bool {
                    if (! is_array($script)) {
                        return false;
                    }
                    $id = (string) ($script['id'] ?? '');
                    if ($id !== '' && in_array($id, $bannedIds, true)) {
                        return false;
                    }
                    $src = (string) ($script['src'] ?? '');
                    if ($src !== '' && (
                        str_contains($src, 'custom-home_design/assets/boot')
                        || str_contains($src, 'custom-home_design/assets/home-design')
                        || str_contains($src, 'chd_home_design')
                    )) {
                        return false;
                    }

                    return true;
                }
            ));
            if ($layout['scripts'] === []) {
                unset($layout['scripts']);
            }
        }

        // Also drop any tree nodes that reused those ids as Components
        foreach ($bannedIds as $id) {
            $layout = $this->removeNodeById($layout, $id);
        }

        return $layout;
    }

    /**
     * Hidden config Div — embeds public settings JSON for instant apply (replaces boot.js).
     * Not a layout script id → never appears in AssetFailureNotice.
     */
    private function ensureConfigDiv(array $layout): array
    {
        $cfgId = 'chd_home_design_cfg';
        $payload = [];
        try {
            $settings = $this->settings();
            if ($settings) {
                $bi = null;
                try {
                    if (filter_var($settings->business_info_enabled, FILTER_VALIDATE_BOOLEAN)) {
                        $bi = app(HomeDesignSettingService::class)->getEcommerceBusinessInfo();
                    }
                } catch (\Throwable) {
                    $bi = null;
                }
                $payload = $settings->toPublicArray(is_array($bi) ? $bi : null);
            }
        } catch (\Throwable) {
            $payload = [];
        }

        $json = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($json === false) {
            $json = '{}';
        }

        $node = [
            'id' => $cfgId,
            'type' => 'basic',
            'name' => 'Div',
            'props' => [
                'id' => $cfgId,
                'className' => 'hidden',
                'aria-hidden' => 'true',
                'data-chd-role' => 'home-design-config',
                'data-chd-settings' => $json,
                'style' => [
                    'display' => 'none',
                ],
            ],
            'children' => [],
        ];

        // Replace if present, else insert before footer (or append to root children)
        if ($this->findById($layout, $cfgId) !== null) {
            return $this->updateNodeById($layout, $cfgId, static function (array $existing) use ($node): array {
                $existing['props'] = $node['props'];
                $existing['children'] = [];

                return $existing;
            });
        }

        $withFooter = $this->insertSiblingBefore($layout, 'footer', $node);
        if ($this->findById($withFooter, $cfgId) !== null) {
            return $withFooter;
        }

        // Fallback: append under root children/components
        foreach (['children', 'components', 'content'] as $key) {
            if (isset($layout[$key]) && is_array($layout[$key]) && array_is_list($layout[$key])) {
                $layout[$key][] = $node;

                return $layout;
            }
        }

        return $layout;
    }

    /**
     * Insert $newNode as a sibling immediately before the node with $targetId.
     * No-op if target missing or newNode id already present.
     *
     * @param  array<string, mixed>  $newNode
     */
    private function insertSiblingBefore(array $layout, string $targetId, array $newNode): array
    {
        $newId = (string) ($newNode['id'] ?? '');
        if ($newId !== '' && $this->findById($layout, $newId) !== null) {
            return $layout;
        }

        return $this->insertSiblingBeforeWalk($layout, $targetId, $newNode);
    }

    /**
     * @param  array<string, mixed>  $newNode
     */
    private function insertSiblingBeforeWalk(array $node, string $targetId, array $newNode): array
    {
        foreach (['children', 'components', 'content'] as $key) {
            if (! isset($node[$key]) || ! is_array($node[$key]) || ! array_is_list($node[$key])) {
                continue;
            }
            $list = $node[$key];
            foreach ($list as $i => $child) {
                if (! is_array($child)) {
                    continue;
                }
                if (($child['id'] ?? null) === $targetId) {
                    array_splice($list, $i, 0, [$newNode]);
                    $node[$key] = $list;

                    return $node;
                }
                $list[$i] = $this->insertSiblingBeforeWalk($child, $targetId, $newNode);
            }
            $node[$key] = $list;
        }

        if (isset($node['slots']) && is_array($node['slots'])) {
            foreach ($node['slots'] as $sk => $slot) {
                if (! is_array($slot)) {
                    continue;
                }
                if (array_is_list($slot)) {
                    foreach ($slot as $i => $child) {
                        if (! is_array($child)) {
                            continue;
                        }
                        if (($child['id'] ?? null) === $targetId) {
                            array_splice($slot, $i, 0, [$newNode]);
                            $node['slots'][$sk] = $slot;

                            return $node;
                        }
                        $slot[$i] = $this->insertSiblingBeforeWalk($child, $targetId, $newNode);
                    }
                    $node['slots'][$sk] = $slot;
                } else {
                    $node['slots'][$sk] = $this->insertSiblingBeforeWalk($slot, $targetId, $newNode);
                }
            }
        }

        return $node;
    }

    private function removeNodeById(array $node, string $id): array
    {
        foreach (['children', 'components', 'content'] as $key) {
            if (! isset($node[$key]) || ! is_array($node[$key])) {
                continue;
            }
            $filtered = [];
            foreach ($node[$key] as $child) {
                if (! is_array($child)) {
                    $filtered[] = $child;
                    continue;
                }
                if (($child['id'] ?? null) === $id) {
                    continue;
                }
                $filtered[] = $this->removeNodeById($child, $id);
            }
            $node[$key] = array_is_list($node[$key]) ? array_values($filtered) : $filtered;
        }

        if (isset($node['slots']) && is_array($node['slots'])) {
            foreach ($node['slots'] as $sk => $slot) {
                if (! is_array($slot)) {
                    continue;
                }
                if (array_is_list($slot)) {
                    $filtered = [];
                    foreach ($slot as $child) {
                        if (! is_array($child)) {
                            $filtered[] = $child;
                            continue;
                        }
                        if (($child['id'] ?? null) === $id) {
                            continue;
                        }
                        $filtered[] = $this->removeNodeById($child, $id);
                    }
                    $node['slots'][$sk] = array_values($filtered);
                } else {
                    if (($slot['id'] ?? null) === $id) {
                        unset($node['slots'][$sk]);
                    } else {
                        $node['slots'][$sk] = $this->removeNodeById($slot, $id);
                    }
                }
            }
        }

        return $node;
    }

    private function findById(array $node, string $id): ?array
    {
        if (($node['id'] ?? null) === $id) {
            return $node;
        }
        foreach (['children', 'components', 'content'] as $key) {
            if (! isset($node[$key]) || ! is_array($node[$key])) {
                continue;
            }
            foreach ($node[$key] as $child) {
                if (! is_array($child)) {
                    continue;
                }
                $found = $this->findById($child, $id);
                if ($found !== null) {
                    return $found;
                }
            }
        }
        if (isset($node['slots']) && is_array($node['slots'])) {
            foreach ($node['slots'] as $slot) {
                if (is_array($slot)) {
                    // slot may be list of nodes or single node
                    if (array_is_list($slot)) {
                        foreach ($slot as $child) {
                            if (is_array($child)) {
                                $found = $this->findById($child, $id);
                                if ($found !== null) {
                                    return $found;
                                }
                            }
                        }
                    } else {
                        $found = $this->findById($slot, $id);
                        if ($found !== null) {
                            return $found;
                        }
                    }
                }
            }
        }

        return null;
    }

    /**
     * @param  callable(array): array  $mutator
     */
    private function updateNodeById(array $node, string $id, callable $mutator): array
    {
        if (($node['id'] ?? null) === $id) {
            return $mutator($node);
        }

        foreach (['children', 'components', 'content'] as $key) {
            if (! isset($node[$key]) || ! is_array($node[$key])) {
                continue;
            }
            foreach ($node[$key] as $i => $child) {
                if (is_array($child)) {
                    $node[$key][$i] = $this->updateNodeById($child, $id, $mutator);
                }
            }
        }

        if (isset($node['slots']) && is_array($node['slots'])) {
            foreach ($node['slots'] as $sk => $slot) {
                if (! is_array($slot)) {
                    continue;
                }
                if (array_is_list($slot)) {
                    foreach ($slot as $i => $child) {
                        if (is_array($child)) {
                            $node['slots'][$sk][$i] = $this->updateNodeById($child, $id, $mutator);
                        }
                    }
                } else {
                    $node['slots'][$sk] = $this->updateNodeById($slot, $id, $mutator);
                }
            }
        }

        return $node;
    }
}
