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
 *  - main_content desktop max width (settings content_max_width_px, default 1240)
 *  - desktop_header boards filter by hide_header_board_slugs (feat: qna, inquiry)
 *  - footer props.linkGroups when footer_link_groups is set (official Footer supports it)
 *  - server-render business info from sirsoft-ecommerce basic_info into chd_business_info_mount
 *  - ensure home-design.js script entry (extension also loads it)
 *
 * Desktop top-nav hide CSS is applied by home-design.js (no MutationObserver since 0.2.1).
 */
class HomeDesignLayoutListener implements HookListenerInterface
{
    private const SCRIPT_ID = 'chd_home_design';

    private const SCRIPT_SRC = '/api/modules/custom-home_design/assets/home-design.js';

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
        if (! $settings || ! $settings->enabled) {
            return $layout;
        }

        // Always try to ensure script when we touch layouts that include chrome.
        $hasChrome = $this->findById($layout, 'desktop_header') !== null
            || $this->findById($layout, 'main_content') !== null
            || $this->findById($layout, 'footer') !== null
            || $this->findById($layout, self::BUSINESS_MOUNT_ID) !== null
            || ($layout['layout_name'] ?? '') === '_user_base';

        if (! $hasChrome) {
            return $layout;
        }

        $layout = $this->patchMainContentWidth($layout, (int) $settings->content_max_width_px);
        $layout = $this->patchDesktopHeaderBoards($layout, $settings->hide_header_board_slugs ?? []);
        $layout = $this->patchFooterLinkGroups($layout, $settings->footer_link_groups);
        $layout = $this->fillBusinessInfoMount($layout, $settings);
        $layout = $this->ensureScript($layout);

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
        if (! $settings->business_info_enabled) {
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

        // If mount was not found (extension not yet applied), leave layout as-is;
        // JS one-shot fallback may fill an empty mount later.
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
     * @param  list<string>|array|null  $slugs
     */
    private function patchDesktopHeaderBoards(array $layout, ?array $slugs): array
    {
        $slugs = array_values(array_filter(array_map(
            static fn ($s) => is_string($s) ? trim($s) : '',
            $slugs ?? []
        ), static fn ($s) => $s !== ''));

        if ($slugs === []) {
            return $layout;
        }

        $expr = $this->buildBoardsFilterExpression($slugs);

        return $this->updateNodeById($layout, 'desktop_header', static function (array $node) use ($expr): array {
            if (! isset($node['props']) || ! is_array($node['props'])) {
                $node['props'] = [];
            }
            $node['props']['boards'] = $expr;

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
            $props['className'] = trim($className);

            $style = isset($props['style']) && is_array($props['style']) ? $props['style'] : [];
            $style['maxWidth'] = $px.'px';
            $props['style'] = $style;

            if (! isset($node['props']) || ! is_array($node['props'])) {
                $node['props'] = [];
            }
            $node['props']['data-chd-max-width'] = (string) $px;

            return $node;
        });
    }

    private function patchFooterLinkGroups(array $layout, mixed $groups): array
    {
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

    private function ensureScript(array $layout): array
    {
        if (! isset($layout['scripts']) || ! is_array($layout['scripts'])) {
            $layout['scripts'] = [];
        }

        foreach ($layout['scripts'] as $script) {
            if (! is_array($script)) {
                continue;
            }
            $id = (string) ($script['id'] ?? '');
            $src = (string) ($script['src'] ?? '');
            if ($id === self::SCRIPT_ID || str_contains($src, 'home-design.js')) {
                return $layout;
            }
        }

        $layout['scripts'][] = [
            'id' => self::SCRIPT_ID,
            'src' => self::SCRIPT_SRC,
        ];

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
