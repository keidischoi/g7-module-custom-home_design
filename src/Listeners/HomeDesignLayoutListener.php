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
 *  - footer props.linkGroups when footer_link_groups is set (official Footer supports it)
 *  - server-render business info from sirsoft-ecommerce basic_info into chd_business_info_mount
 *  - ensure boot.js + home-design.js via layout scripts (Listener only; extension has NO scripts
 *    so 미설치 leftover overlays do not 404-warn on the home page)
 *
 * Header search icon + dark-mode click toggle are applied by home-design.js (0.2.5+; 0.2.8 robust selectors).
 * Desktop top-nav hide: boot.js critical CSS + home-design.js; header data-chd-hide-top-nav (no MutationObserver since 0.2.1).
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
                'priority' => 45,
                'type' => 'filter',
                'sync' => true,
            ],
        ];
    }

    public function handle(...$args): void
    {
    }

    public function filterChildLayout(mixed $childLayout = null, mixed $parentLayout = null): mixed
    {
        if (! is_array($childLayout)) {
            return $childLayout;
        }

        return $this->apply($childLayout);
    }

    public function filterMergedLayout(mixed $merged = null, mixed $parentLayout = null, mixed $childLayout = null): mixed
    {
        if (! is_array($merged)) {
            return $merged;
        }
        if (empty($merged['layout_name']) && is_array($childLayout) && ! empty($childLayout['layout_name'])) {
            $merged['layout_name'] = $childLayout['layout_name'];
        }

        return $this->apply($merged);
    }

    public function afterExtensions(mixed $layout = null, mixed $templateId = null): mixed
    {
        if (! is_array($layout)) {
            return $layout;
        }

        return $this->apply($layout);
    }

    private function apply(array $layout): array
    {
        $settings = $this->settings();
        // Module manager activation is enough — do not gate on settings.enabled (removed from admin in 0.2.4).
        if (! $settings) {
            return $layout;
        }

        // Always try to ensure script when we touch layouts that include chrome.
        $layoutName = (string) ($layout['layout_name'] ?? '');
        $hasChrome = $this->findById($layout, 'desktop_header') !== null
            || $this->findById($layout, 'main_content') !== null
            || $this->findById($layout, 'footer') !== null
            || $this->findById($layout, self::BUSINESS_MOUNT_ID) !== null
            || $layoutName === '_user_base'
            || $layoutName === 'home';

        if (! $hasChrome) {
            return $layout;
        }

        $px = (int) $settings->content_max_width_px;
        $layout = $this->patchMainContentWidth($layout, $px);
        $layout = $this->patchContentColumnWidths($layout, $px);
        $layout = $this->patchHomeContentWidth($layout, $px);
        $layout = $this->patchDesktopHeaderBoards($layout, $settings->hide_header_board_slugs ?? []);
        $layout = $this->patchFooterLinkGroups($layout, $settings->footer_link_groups);
        $layout = $this->fillBusinessInfoMount($layout, $settings);
        $layout = $this->patchHideDesktopTopNavAttr($layout, $settings);
        $layout = $this->ensureScripts($layout);

        return $layout;
    }

    private function settings(): ?HomeDesignSetting
    {
        if ($this->cacheLoaded) {
            return $this->cached;
        }
        $this->cacheLoaded = true;
        try {
            $this->cached = app(HomeDesignSettingService::class)->get();
        } catch (\Throwable $e) {
            $this->cached = null;
        }

        return $this->cached;
    }

    /**
     * Server-render business notice into the layout extension mount so JS does not
     * need to inject HTML (avoids MutationObserver ↔ React remount loops).
     */
    private function fillBusinessInfoMount(array $layout, HomeDesignSetting $settings): array
    {
        if (! filter_var($settings->business_info_enabled, FILTER_VALIDATE_BOOLEAN)) {
            return $this->updateNodeById($layout, self::BUSINESS_MOUNT_ID, static function (array $node): array {
                $node['children'] = [];

                return $node;
            });
        }

        $parts = $this->buildBusinessParts();
        if ($parts === []) {
            return $this->updateNodeById($layout, self::BUSINESS_MOUNT_ID, static function (array $node): array {
                $node['children'] = [];

                return $node;
            });
        }

        $text = implode('  |  ', $parts);
        $px = max(320, min(2560, (int) ($settings->content_max_width_px ?: HomeDesignSetting::DEFAULT_CONTENT_MAX_WIDTH_PX)));
        $block = $this->buildBusinessInfoBlock($text, $px);

        $updated = $this->updateNodeById($layout, self::BUSINESS_MOUNT_ID, static function (array $node) use ($block): array {
            $node['children'] = [$block];

            return $node;
        });

        // Feat Footer accepts businessInfo prop — set it when present (official ignores unknown props).
        $bi = [];
        try {
            $bi = app(HomeDesignSettingService::class)->getEcommerceBusinessInfo();
        } catch (\Throwable) {
            $bi = [];
        }
        $updated = $this->updateNodeById($updated, 'footer', static function (array $node) use ($bi): array {
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

        return $updated;
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
     * @return array<string, mixed>
     */
    private function buildBusinessInfoBlock(string $text, int $px): array
    {
        return [
            'id' => self::BUSINESS_BLOCK_ID,
            'type' => 'basic',
            'name' => 'Div',
            'props' => [
                'id' => self::BUSINESS_BLOCK_ID,
                'className' => 'w-full border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900',
                'data-chd-role' => 'business-info',
                'data-chd-sig' => $text,
            ],
            'children' => [
                [
                    'id' => 'chd_business_info_inner',
                    'type' => 'basic',
                    'name' => 'Div',
                    'props' => [
                        'className' => 'chd-bi-inner mx-auto px-4 sm:px-6 lg:px-8 py-3',
                        'style' => [
                            'maxWidth' => $px.'px',
                        ],
                    ],
                    'children' => [
                        [
                            'id' => 'chd_business_info_text',
                            'type' => 'basic',
                            'name' => 'P',
                            'props' => [
                                'className' => 'text-xs leading-relaxed text-gray-500 dark:text-gray-400 text-left',
                            ],
                            'text' => $text,
                        ],
                    ],
                ],
            ],
        ];
    }

    /**
     * Filter header boards by hide_header_board_slugs:
     *  - desktop_header props.boards (composite Header)
     *  - any iteration.source that reads boards.data (mobile menu Repeat)
     *
     * @param  list<string>|array|null  $slugs
     */
    private function patchDesktopHeaderBoards(array $layout, ?array $slugs): array
    {
        $slugs = array_values(array_filter(array_map(
            static fn ($s) => is_string($s) ? trim($s) : '',
            $slugs ?? []
        ), static fn ($s) => $s !== ''));

        // Always mark desktop header so JS/CSS can find it even when composite
        // Header drops the layout node id from the DOM.
        // Official uses responsive.desktop.props.className = "block" which REPLACES
        // base className — stamp the marker on base + every responsive breakpoint.
        $layout = $this->updateNodeById($layout, 'desktop_header', static function (array $node): array {
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
                    $node['responsive'][$bp] = $bpVal;
                }
            }

            return $node;
        });

        if ($slugs === []) {
            return $layout;
        }

        $expr = $this->buildBoardsFilterExpression($slugs);

        $layout = $this->updateNodeById($layout, 'desktop_header', static function (array $node) use ($expr): array {
            if (! isset($node['props']) || ! is_array($node['props'])) {
                $node['props'] = [];
            }
            $node['props']['boards'] = $expr;

            return $node;
        });

        // Mobile drawer boards list uses iteration.source = {{boards.data ?? []}}
        return $this->mapNodes($layout, function (array $node) use ($expr): array {
            if (isset($node['iteration']) && is_array($node['iteration'])) {
                $src = $node['iteration']['source'] ?? null;
                if (is_string($src) && str_contains($src, 'boards.data') && ! str_contains($src, '.filter(')) {
                    $node['iteration']['source'] = $expr;
                }
            }
            if (isset($node['props']) && is_array($node['props'])) {
                $src = $node['props']['source'] ?? null;
                if (is_string($src) && str_contains($src, 'boards.data') && ! str_contains($src, '.filter(')) {
                    $node['props']['source'] = $expr;
                }
            }

            return $node;
        });
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

        // Same shape as feat/_user_base.json boards prop
        return '{{(boards.data ?? []).filter(b => !'.$list.'.includes(b.slug))}}';
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
     * Patch home mid-section width nodes:
     *  - layout Container (home root / section wrappers)
     *  - any max-w-* / style.maxWidth
     * Skip obvious full-bleed: class is only w-full / mb-* without max-w, or hero/carousel ids.
     */
    private function maybePatchHomeWidthNode(array $node, int $px): array
    {
        $id = strtolower((string) ($node['id'] ?? ''));
        $name = (string) ($node['name'] ?? '');
        if (str_contains($id, 'hero') || str_contains($id, 'carousel') || str_contains($id, 'full_bleed') || str_contains($id, 'full-bleed')) {
            return $node;
        }

        $patched = $this->maybePatchMaxWidthNode($node, $px, skipMainContent: false);

        // Home root / section Containers: force maxWidth even without max-w-* class
        // so nested grids grow with content_max_width_px (parent main_content alone
        // is not always enough when React remounts child slot trees).
        $isContainer = ($node['type'] ?? '') === 'layout' && $name === 'Container';
        if ($isContainer) {
            $className = (string) (($patched['props']['className'] ?? '') ?: '');
            $isFullBleed = $className !== ''
                && preg_match('/\bw-full\b/', $className)
                && ! preg_match('/\bmax-w-/', $className)
                && ! preg_match('/\bmx-auto\b/', $className)
                && ! preg_match('/\bpx-/', $className); // home root uses px-4/6/8 — not full-bleed

            if (! $isFullBleed) {
                if (! isset($patched['props']) || ! is_array($patched['props'])) {
                    $patched['props'] = [];
                }
                $style = isset($patched['props']['style']) && is_array($patched['props']['style'])
                    ? $patched['props']['style']
                    : [];
                $style['maxWidth'] = $px.'px';
                $style['width'] = '100%';
                $style['marginInline'] = 'auto';
                $patched['props']['style'] = $style;
                $patched['props']['data-chd-max-width'] = (string) $px;

                // Also set on each responsive breakpoint props
                if (isset($patched['responsive']) && is_array($patched['responsive'])) {
                    foreach ($patched['responsive'] as $bp => $bpVal) {
                        if (! is_array($bpVal)) {
                            continue;
                        }
                        if (! isset($bpVal['props']) || ! is_array($bpVal['props'])) {
                            $bpVal['props'] = [];
                        }
                        $bpStyle = isset($bpVal['props']['style']) && is_array($bpVal['props']['style'])
                            ? $bpVal['props']['style']
                            : [];
                        $bpStyle['maxWidth'] = $px.'px';
                        $bpStyle['width'] = '100%';
                        $bpStyle['marginInline'] = 'auto';
                        $bpVal['props']['style'] = $bpStyle;
                        $patched['responsive'][$bp] = $bpVal;
                    }
                }
            }
        }

        return $patched;
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

        if (! is_array($groups) || $groups === []) {
            return $layout;
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
     * Ensure boot.js (embedded settings) loads before home-design.js.
     * Only called while this Listener is registered (= module installed+active).
     * Extension overlay intentionally has NO scripts array — leftover extensions
     * after uninstall must not inject 404 script ids into the home UI.
     *
     * Uses the same {id, src} shape as custom-ad_slots cas_hero_carousel.
     * Never injects layout Component nodes — scripts stay in layout["scripts"].
     */
    private function ensureScripts(array $layout): array
    {
        if (! isset($layout['scripts']) || ! is_array($layout['scripts'])) {
            $layout['scripts'] = [];
        }

        // Drop legacy/broken script ids that G7 may still have from older extensions
        // (chd_home_design without _js was resolved as a missing Component).
        $layout['scripts'] = array_values(array_filter(
            $layout['scripts'],
            static function ($script): bool {
                if (! is_array($script)) {
                    return false;
                }
                $id = (string) ($script['id'] ?? '');
                // Remove the pre-0.2.4 id that collided with Component lookup
                if ($id === 'chd_home_design') {
                    return false;
                }

                return true;
            }
        ));

        $hasBoot = false;
        $hasMain = false;
        foreach ($layout['scripts'] as $script) {
            if (! is_array($script)) {
                continue;
            }
            $id = (string) ($script['id'] ?? '');
            $src = (string) ($script['src'] ?? '');
            if ($id === self::BOOT_SCRIPT_ID || str_contains($src, 'assets/boot')) {
                $hasBoot = true;
            }
            if ($id === self::SCRIPT_ID || str_contains($src, 'home-design')) {
                $hasMain = true;
            }
        }

        if (! $hasBoot) {
            array_unshift($layout['scripts'], [
                'id' => self::BOOT_SCRIPT_ID,
                'src' => self::BOOT_SCRIPT_SRC,
            ]);
        }
        if (! $hasMain) {
            $layout['scripts'][] = [
                'id' => self::SCRIPT_ID,
                'src' => self::SCRIPT_SRC,
            ];
        }

        return $layout;
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
