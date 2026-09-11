<?php

namespace Modules\Custom\HomeDesign\Listeners;

use App\Contracts\Extension\HookListenerInterface;

/**
 * Event-hook patches for shop/index:
 *  - add 모든 상품 / 최근 본 상품 / 인기상품 / 신상품 chips next to categories
 *  - show those products in the same ProductCard thumbnail grid
 *  - list-mode pages use the thumbnail grid + infinite scroll
 *  - category "전체" keeps the original pager and recent/popular/new sections
 */
class ShopListLayoutListener implements HookListenerInterface
{
    private const LAYOUT = 'shop/index';

    private const CATEGORY_ROW_ID = 'chd_shop_category_row';

    private const SENTINEL_ID = 'chd_shop_scroll_sentinel';

    private const ACTIVE_CLASS = 'px-3 py-1.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full text-sm font-medium';

    private const INACTIVE_CLASS = 'px-3 py-1.5 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-full text-sm hover:bg-gray-100 dark:hover:bg-gray-600';

    public static function getSubscribedHooks(): array
    {
        return [
            'core.layout.filter_child_data' => [
                'method' => 'filterChildLayout',
                'priority' => 48,
                'type' => 'filter',
                'sync' => true,
            ],
            'core.layout.filter_merged' => [
                'method' => 'filterMergedLayout',
                'priority' => 48,
                'type' => 'filter',
                'sync' => true,
            ],
            'core.layout_extension.after_apply' => [
                'method' => 'afterExtensions',
                'priority' => 910,
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
        try {
            return is_array($childLayout) ? $this->apply($childLayout) : $childLayout;
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
            return is_array($layout) ? $this->apply($layout) : $layout;
        } catch (\Throwable) {
            return $layout;
        }
    }

    /**
     * @param  array<string, mixed>  $layout
     * @return array<string, mixed>
     */
    private function apply(array $layout): array
    {
        if ((string) ($layout['layout_name'] ?? '') !== self::LAYOUT) {
            return $layout;
        }

        try {
            $layout = $this->patchProductsDataSource($layout);
        } catch (\Throwable) {
        }
        try {
            $layout = $this->walk($layout, function (array $node): array {
                $node = $this->patchCategoryRow($node);
                $node = $this->hideCarousel($node);
                $node = $this->hideSearchOnRecent($node);
                $node = $this->patchSortBarBackground($node);
                $node = $this->patchProductGrid($node);
                $node = $this->hidePagination($node);

                return $node;
            });
        } catch (\Throwable) {
        }
        try {
            $layout = $this->ensureSentinel($layout);
        } catch (\Throwable) {
        }

        return $layout;
    }

    /**
     * @param  array<string, mixed>  $layout
     * @return array<string, mixed>
     */
    private function patchProductsDataSource(array $layout): array
    {
        if (! isset($layout['data_sources']) || ! is_array($layout['data_sources'])) {
            return $layout;
        }

        foreach ($layout['data_sources'] as $i => $source) {
            if (! is_array($source) || ($source['id'] ?? '') !== 'products') {
                continue;
            }
            if (! isset($source['params']) || ! is_array($source['params'])) {
                $source['params'] = [];
            }
            $source['params']['page'] = '{{query.page ?? 1}}';
            $source['params']['per_page'] = "{{(!query.list && !query.category) ? 12 : 20}}";
            $source['params']['search'] = '{{query.keyword ?? \'\'}}';
            $source['params']['sort'] = "{{query.list == 'popular' ? 'sales' : ((query.list == 'new' || query.list == 'all') ? 'latest' : (query.sort ?? 'latest'))}}";
            $source['params']['category_id'] = "{{(query.list == 'popular' || query.list == 'new' || query.list == 'recent' || query.list == 'all') ? '' : (query.category ?? '')}}";
            $layout['data_sources'][$i] = $source;
            break;
        }

        return $layout;
    }

    /**
     * @param  array<string, mixed>  $node
     * @return array<string, mixed>
     */
    private function patchCategoryRow(array $node): array
    {
        if (! $this->isCategoryRow($node)) {
            return $node;
        }

        $node['id'] = self::CATEGORY_ROW_ID;
        if (! isset($node['children']) || ! is_array($node['children'])) {
            $node['children'] = [];
        }

        $kept = [];
        foreach ($node['children'] as $child) {
            if (! is_array($child)) {
                $kept[] = $child;
                continue;
            }
            $id = (string) ($child['id'] ?? '');
            if ($id === 'chd_shop_list_mode_sep' || str_starts_with($id, 'chd_shop_list_')) {
                continue;
            }
            $kept[] = $this->retargetCategoryChip($child);
        }
        $kept[] = $this->separatorNode();
        foreach ($this->listModeButtons() as $button) {
            $kept[] = $button;
        }
        $node['children'] = $kept;

        return $node;
    }

    /**
     * @param  array<string, mixed>  $node
     * @return array<string, mixed>
     */
    private function retargetCategoryChip(array $node): array
    {
        $className = (string) (($node['props']['className'] ?? '') ?: '');
        if (str_contains($className, 'query.list')) {
            return $node;
        }

        if (str_contains($className, '!query.category ?')) {
            $node['props']['className'] = '{{!query.category && !(query.list == \'popular\') && !(query.list == \'recent\') && !(query.list == \'new\') ? \''.self::ACTIVE_CLASS.'\' : \''.self::INACTIVE_CLASS.'\'}}';
        } elseif (str_contains($className, 'query.category == cat?.id')) {
            $node['props']['className'] = '{{query.category == cat?.id && !(query.list == \'popular\') && !(query.list == \'recent\') && !(query.list == \'new\') ? \''.self::ACTIVE_CLASS.'\' : \''.self::INACTIVE_CLASS.'\'}}';
        }

        if (isset($node['children']) && is_array($node['children'])) {
            $node['children'] = array_map(function ($child) {
                return is_array($child) ? $this->retargetCategoryChip($child) : $child;
            }, $node['children']);
        }

        return $node;
    }

    /**
     * @return array<string, mixed>
     */
    private function separatorNode(): array
    {
        return [
            'id' => 'chd_shop_list_mode_sep',
            'type' => 'basic',
            'name' => 'Span',
            'props' => [
                'className' => 'hidden sm:inline-block w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1 self-center',
            ],
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function listModeButtons(): array
    {
        $items = [
            ['id' => 'chd_shop_list_all', 'list' => 'all', 'text' => '모든 상품'],
            ['id' => 'chd_shop_list_recent', 'list' => 'recent', 'text' => '최근 본 상품'],
            ['id' => 'chd_shop_list_popular', 'list' => 'popular', 'text' => '인기상품'],
            ['id' => 'chd_shop_list_new', 'list' => 'new', 'text' => '신상품'],
        ];

        $buttons = [];
        foreach ($items as $item) {
            $list = $item['list'];
            $buttons[] = [
                'id' => $item['id'],
                'type' => 'basic',
                'name' => 'Button',
                'props' => [
                    'className' => '{{query.list == \''.$list.'\' ? \''.self::ACTIVE_CLASS.'\' : \''.self::INACTIVE_CLASS.'\'}}',
                    'data-chd-shop-list' => $list,
                ],
                'text' => $item['text'],
                'actions' => [
                    [
                        'type' => 'click',
                        'handler' => 'navigate',
                        'params' => [
                            'path' => '{{_global.shopBase}}/products',
                            'query' => [
                                'list' => $list,
                                'page' => '1',
                            ],
                        ],
                    ],
                ],
            ];
        }

        return $buttons;
    }

    /**
     * @param  array<string, mixed>  $node
     * @return array<string, mixed>
     */
    private function hideCarousel(array $node): array
    {
        $partial = (string) ($node['partial'] ?? '');
        $scope = (string) ($node['isolatedScopeId'] ?? '');
        $isCarousel = str_contains($partial, '_recent_products.json')
            || str_contains($partial, '_popular_products.json')
            || str_contains($partial, '_new_products.json')
            || in_array($scope, ['popular-products-scroll', 'new-products-scroll', 'recent-products-scroll'], true);
        if ($isCarousel) {
            $extra = '';
            if ($scope === 'popular-products-scroll' || str_contains($partial, '_popular_products.json')) {
                $extra = ' && popularProducts.data && popularProducts.data.length > 0';
            } elseif ($scope === 'new-products-scroll' || str_contains($partial, '_new_products.json')) {
                $extra = ' && newProducts.data && newProducts.data.length > 0';
            } elseif ($scope === 'recent-products-scroll' || str_contains($partial, '_recent_products.json')) {
                $extra = ' && recentProducts.data && recentProducts.data.length > 0';
            }
            $node['if'] = '{{!query.list && !query.category'.$extra.'}}';
        }

        return $node;
    }

    /**
     * @param  array<string, mixed>  $node
     * @return array<string, mixed>
     */
    private function hideSearchOnRecent(array $node): array
    {
        $partial = (string) ($node['partial'] ?? '');
        if (str_contains($partial, '_search_filter_bar.json')) {
            $node['if'] = "{{!(query.list == 'recent')}}";

            return $node;
        }

        $className = (string) (($node['props']['className'] ?? '') ?: '');
        if ($className === 'space-y-4' && $this->containsText($node, '$t:shop.search')) {
            $node['if'] = "{{!(query.list == 'recent')}}";
        }

        return $node;
    }

    /**
     * Make the "총 n개 + 최신순" sort bar background transparent.
     *
     * @param  array<string, mixed>  $node
     * @return array<string, mixed>
     */
    private function patchSortBarBackground(array $node): array
    {
        $comment = (string) ($node['comment'] ?? '');
        $className = (string) (($node['props']['className'] ?? '') ?: '');
        $isSortBar = str_contains($comment, '정렬 바')
            || (str_contains($className, 'justify-between') && str_contains($className, 'bg-gray-50') && $this->containsText($node, '$t:shop.total_count'))
            || (($node['id'] ?? '') === 'chd_shop_sort_bar');
        if (! $isSortBar) {
            return $node;
        }

        $className = trim(preg_replace('/\b(?:dark:)?bg-(?:gray-50|gray-800(?:\/50)?)\b/', '', $className) ?? $className);
        $className = trim(preg_replace('/\s+/', ' ', $className) ?? $className);
        if (! str_contains($className, 'bg-transparent')) {
            $className = trim($className.' bg-transparent');
        }
        if (! str_contains($className, 'chd-shop-sort-bar')) {
            $className = trim($className.' chd-shop-sort-bar');
        }
        $node['id'] = 'chd_shop_sort_bar';
        if (! isset($node['props']) || ! is_array($node['props'])) {
            $node['props'] = [];
        }
        $node['props']['className'] = $className;
        $style = isset($node['props']['style']) && is_array($node['props']['style']) ? $node['props']['style'] : [];
        $style['background'] = 'transparent';
        $style['backgroundColor'] = 'transparent';
        $node['props']['style'] = $style;

        return $node;
    }

    /**
     * @param  array<string, mixed>  $node
     * @return array<string, mixed>
     */
    private function patchProductGrid(array $node): array
    {
        $source = (string) (($node['iteration']['source'] ?? '') ?: '');
        if ($source === '{{products?.data?.data ?? []}}' || $source === '{{products.data.data ?? []}}') {
            $node['iteration']['source'] = "{{query.list == 'recent' ? (recentProducts?.data ?? []) : (products?.data?.data ?? [])}}";
        }

        $iff = (string) ($node['if'] ?? '');
        if (str_contains($iff, 'products?.data?.data ?? []).length === 0')) {
            $node['if'] = "{{query.list == 'recent' ? ((recentProducts?.data ?? []).length === 0) : ((products?.data?.data ?? []).length === 0)}}";
        }

        if (($node['id'] ?? '') === self::SENTINEL_ID) {
            return $node;
        }

        return $node;
    }

    /**
     * @param  array<string, mixed>  $node
     * @return array<string, mixed>
     */
    private function hidePagination(array $node): array
    {
        if (($node['id'] ?? '') === self::SENTINEL_ID) {
            return $node;
        }
        if ((string) (($node['props']['data-chd-shop-sentinel'] ?? '') ?: '') === '1') {
            return $node;
        }
        $comment = (string) ($node['comment'] ?? '');
        $iff = (string) ($node['if'] ?? '');
        $isPager = str_contains($comment, '페이지네이션')
            || str_contains($iff, 'products?.data?.pagination?.last_page')
            || (str_contains($iff, 'products?.data?.pagination?.has_more_pages') && str_contains($iff, 'last_page'));
        if ($isPager) {
            $node['if'] = '{{!query.list && !query.category && (((products?.data?.pagination?.last_page ?? 0) > 1) || (products?.data?.pagination?.has_more_pages ?? false) || ((products?.data?.pagination?.current_page ?? 1) > 1))}}';
            if (empty($node['id'])) {
                $node['id'] = 'chd_shop_pager';
            }
        }

        return $node;
    }

    /**
     * @param  array<string, mixed>  $layout
     * @return array<string, mixed>
     */
    private function ensureSentinel(array $layout): array
    {
        $sentinelIf = "{{(query.list || query.category) && !(query.list == 'recent') && (products?.data?.pagination?.has_more_pages ?? false)}}";
        if ($this->findById($layout, self::SENTINEL_ID) !== null) {
            return $this->walk($layout, function (array $node) use ($sentinelIf): array {
                if (($node['id'] ?? '') === self::SENTINEL_ID) {
                    $node['if'] = $sentinelIf;
                }

                return $node;
            });
        }

        $sentinel = [
            'id' => self::SENTINEL_ID,
            'type' => 'basic',
            'name' => 'Div',
            'if' => $sentinelIf,
            'props' => [
                'className' => 'h-12 flex items-center justify-center mb-10 text-sm text-gray-400 dark:text-gray-500',
                'data-chd-shop-sentinel' => '1',
            ],
            'text' => '불러오는 중',
        ];

        $inserted = false;
        $layout = $this->walk($layout, function (array $node) use ($sentinel, &$inserted): array {
            if ($inserted || ! isset($node['children']) || ! is_array($node['children'])) {
                return $node;
            }
            foreach ($node['children'] as $i => $child) {
                if (! is_array($child)) {
                    continue;
                }
                $cls = (string) (($child['props']['className'] ?? '') ?: '');
                if (! str_contains($cls, 'grid-cols-2') || ! str_contains($cls, 'lg:grid-cols-4')) {
                    continue;
                }
                array_splice($node['children'], $i + 1, 0, [$sentinel]);
                $inserted = true;
                break;
            }

            return $node;
        });

        return $layout;
    }

    /**
     * @param  array<string, mixed>  $node
     * @param  callable(array<string, mixed>): array<string, mixed>  $mutator
     * @return array<string, mixed>
     */
    private function walk(array $node, callable $mutator): array
    {
        $node = $mutator($node);
        foreach (['children', 'components', 'content'] as $key) {
            if (! isset($node[$key]) || ! is_array($node[$key])) {
                continue;
            }
            foreach ($node[$key] as $i => $child) {
                if (is_array($child)) {
                    $node[$key][$i] = $this->walk($child, $mutator);
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
                            $node['slots'][$sk][$i] = $this->walk($child, $mutator);
                        }
                    }
                } else {
                    $node['slots'][$sk] = $this->walk($slot, $mutator);
                }
            }
        }

        return $node;
    }

    /**
     * @param  array<string, mixed>  $node
     */
    private function isCategoryRow(array $node): bool
    {
        if (($node['id'] ?? '') === self::CATEGORY_ROW_ID) {
            return true;
        }
        $comment = (string) ($node['comment'] ?? '');
        if (str_contains($comment, '최상위 카테고리')) {
            return true;
        }
        $className = (string) (($node['props']['className'] ?? '') ?: '');
        if ($className !== 'flex flex-wrap gap-2 mb-4') {
            return false;
        }

        return $this->containsText($node, 'categories?.data');
    }

    /**
     * @param  array<string, mixed>  $node
     */
    private function containsText(array $node, string $needle): bool
    {
        try {
            $json = json_encode($node, JSON_UNESCAPED_UNICODE);

            return is_string($json) && str_contains($json, $needle);
        } catch (\Throwable) {
            return false;
        }
    }

    /**
     * @param  array<string, mixed>  $node
     * @return array<string, mixed>|null
     */
    private function findById(array $node, string $id): ?array
    {
        if (($node['id'] ?? '') === $id) {
            return $node;
        }
        $found = null;
        $this->walk($node, function (array $current) use ($id, &$found): array {
            if ($found === null && ($current['id'] ?? '') === $id) {
                $found = $current;
            }

            return $current;
        });

        return $found;
    }
}
