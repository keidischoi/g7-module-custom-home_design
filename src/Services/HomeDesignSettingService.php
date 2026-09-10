<?php

namespace Modules\Custom\HomeDesign\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Modules\Custom\HomeDesign\Models\HomeDesignSetting;

class HomeDesignSettingService
{
    /** @var list<string> */
    private const BOOL_KEYS = [
        'hide_desktop_top_nav',
        'header_search_icon_mode',
        'header_theme_click_toggle',
        'business_info_enabled',
    ];

    /** @var list<string> Columns that must be JSON-encoded for query-builder writes. */
    private const JSON_KEYS = [
        'hide_header_board_slugs',
        'footer_link_groups',
    ];

    public function get(): HomeDesignSetting
    {
        try {
            if (! $this->tableExists()) {
                return $this->memoryFallback();
            }

            $row = HomeDesignSetting::query()->find(HomeDesignSetting::SINGLETON_ID);
            if ($row) {
                return $row;
            }

            // Ensure singleton row exists (migration seed may have been skipped).
            $this->upsertSingleton($this->defaultAttributes());

            $row = HomeDesignSetting::query()->find(HomeDesignSetting::SINGLETON_ID);
            if ($row) {
                return $row;
            }

            return $this->memoryFallback();
        } catch (\Throwable $e) {
            return $this->memoryFallback();
        }
    }

    /**
     * Persist admin settings to home_design_settings id=1.
     * Uses query-builder upsert so mass-assignment / missing-column / cast
     * issues cannot silently no-op; then reloads via Eloquent.
     *
     * @param  array<string, mixed>  $data
     */
    public function update(array $data): HomeDesignSetting
    {
        if (! $this->tableExists()) {
            throw new \RuntimeException(
                'Table home_design_settings missing. Run: php82 artisan migrate --force'
            );
        }

        // Board slugs: prefer comma-separated text (admin UX). Still accept legacy JSON.
        if (array_key_exists('hide_header_board_slugs_text', $data)) {
            $data['hide_header_board_slugs'] = $this->parseCommaSeparatedSlugs($data['hide_header_board_slugs_text'] ?? '');
        } elseif (array_key_exists('hide_header_board_slugs_json', $data)) {
            $rawSlugs = $data['hide_header_board_slugs_json'];
            if ($rawSlugs === null || (is_string($rawSlugs) && trim($rawSlugs) === '')) {
                $data['hide_header_board_slugs'] = [];
            } elseif (is_array($rawSlugs)) {
                $data['hide_header_board_slugs'] = array_values($rawSlugs);
            } else {
                // Allow accidental comma text in the old json field
                $str = trim((string) $rawSlugs);
                if ($str !== '' && $str[0] !== '[' && $str[0] !== '{') {
                    $data['hide_header_board_slugs'] = $this->parseCommaSeparatedSlugs($str);
                } else {
                    $data['hide_header_board_slugs'] = $this->decodeJsonArray($str);
                }
            }
        } elseif (array_key_exists('hide_header_board_slugs', $data)) {
            $slugs = $data['hide_header_board_slugs'];
            if (is_array($slugs)) {
                $data['hide_header_board_slugs'] = array_values($slugs);
            } elseif (is_string($slugs)) {
                $trim = trim($slugs);
                $data['hide_header_board_slugs'] = ($trim !== '' && ($trim[0] ?? '') !== '[')
                    ? $this->parseCommaSeparatedSlugs($trim)
                    : $this->decodeJsonArray($trim === '' ? '[]' : $trim);
            } else {
                $data['hide_header_board_slugs'] = [];
            }
        }

        if (array_key_exists('footer_link_groups_json', $data)) {
            $rawGroups = $data['footer_link_groups_json'];
            if ($rawGroups === null || (is_string($rawGroups) && trim($rawGroups) === '')) {
                $data['footer_link_groups'] = null;
            } elseif (is_array($rawGroups)) {
                $data['footer_link_groups'] = $rawGroups;
            } else {
                $data['footer_link_groups'] = $this->decodeJsonValue((string) $rawGroups);
            }
        } elseif (array_key_exists('footer_link_groups', $data) && is_string($data['footer_link_groups'])) {
            $trim = trim($data['footer_link_groups']);
            $data['footer_link_groups'] = $trim === '' ? null : $this->decodeJsonValue($trim);
        }

        unset(
            $data['hide_header_board_slugs_json'],
            $data['hide_header_board_slugs_text'],
            $data['footer_link_groups_json']
        );

        foreach ([
            'business_company_name',
            'business_representative',
            'business_number',
            'business_mail_order_number',
            'business_address',
            'business_phone',
            'business_email',
            'enabled',
            'id',
            'created_at',
            'updated_at',
        ] as $legacyKey) {
            unset($data[$legacyKey]);
        }

        $data['enabled'] = true;

        foreach (self::BOOL_KEYS as $boolKey) {
            if (array_key_exists($boolKey, $data)) {
                $data[$boolKey] = $this->coerceBool($data[$boolKey]);
            } else {
                $data[$boolKey] = false;
            }
        }

        if (isset($data['hide_header_board_slugs']) && is_string($data['hide_header_board_slugs'])) {
            $data['hide_header_board_slugs'] = $this->decodeJsonArray($data['hide_header_board_slugs']);
        }
        if (array_key_exists('footer_link_groups', $data) && is_string($data['footer_link_groups'])) {
            $trim = trim($data['footer_link_groups']);
            $data['footer_link_groups'] = $trim === '' ? null : $this->decodeJsonValue($trim);
        }

        if (array_key_exists('content_max_width_px', $data)) {
            $data['content_max_width_px'] = max(320, min(2560, (int) $data['content_max_width_px']));
        } else {
            $data['content_max_width_px'] = HomeDesignSetting::DEFAULT_CONTENT_MAX_WIDTH_PX;
        }

        if (isset($data['hide_header_board_slugs']) && is_array($data['hide_header_board_slugs'])) {
            $data['hide_header_board_slugs'] = array_values(array_filter(array_map(
                static fn ($s) => is_string($s) ? trim($s) : '',
                $data['hide_header_board_slugs']
            ), static fn ($s) => $s !== ''));
        } elseif (! array_key_exists('hide_header_board_slugs', $data)) {
            $data['hide_header_board_slugs'] = [];
        }

        if (! array_key_exists('footer_link_groups', $data)) {
            $data['footer_link_groups'] = null;
        }
        if (! array_key_exists('hide_header_board_slugs', $data)) {
            $data['hide_header_board_slugs'] = [];
        }

        // Always write both JSON columns on every admin save (full-form replace).
        $this->upsertSingleton($data);

        $row = HomeDesignSetting::query()->find(HomeDesignSetting::SINGLETON_ID);
        if (! $row) {
            throw new \RuntimeException('home_design_settings id=1 was not persisted after upsert');
        }

        return $row;
    }

    /**
     * @return array{
     *   companyName: string,
     *   representative: string,
     *   businessNumber: string,
     *   mailOrderNumber: string,
     *   address: string,
     *   phone: string,
     *   email: string
     * }
     */
    public function getEcommerceBusinessInfo(): array
    {
        $empty = [
            'companyName' => '',
            'representative' => '',
            'businessNumber' => '',
            'mailOrderNumber' => '',
            'address' => '',
            'phone' => '',
            'email' => '',
        ];

        try {
            $basic = $this->readEcommerceBasicInfo();
            if (! is_array($basic)) {
                return $empty;
            }

            $base = trim((string) ($basic['base_address'] ?? ''));
            $detail = trim((string) ($basic['detail_address'] ?? ''));
            $address = trim($base.($base !== '' && $detail !== '' ? ' ' : '').$detail);
            if ($address === '' && isset($basic['address'])) {
                $address = trim((string) $basic['address']);
            }

            return [
                'companyName' => trim((string) ($basic['company_name'] ?? '')),
                'representative' => trim((string) ($basic['ceo_name'] ?? '')),
                'businessNumber' => trim((string) ($basic['business_number'] ?? '')),
                'mailOrderNumber' => trim((string) ($basic['mail_order_number'] ?? '')),
                'address' => $address,
                'phone' => trim((string) ($basic['phone'] ?? '')),
                'email' => trim((string) ($basic['email'] ?? '')),
            ];
        } catch (\Throwable) {
            return $empty;
        }
    }

    /**
     * Bulletproof singleton write: only existing columns, JSON encoded for QB,
     * updateOrInsert on id=1 so create-vs-update cannot drift.
     *
     * @param  array<string, mixed>  $attrs  PHP-native values (bool/array/null/int)
     */
    private function upsertSingleton(array $attrs): void
    {
        $attrs = $this->filterExistingColumns($attrs);
        unset($attrs['id']);

        $row = [];
        foreach ($attrs as $key => $value) {
            if (in_array($key, self::JSON_KEYS, true)) {
                $row[$key] = $value === null ? null : json_encode($value, JSON_UNESCAPED_UNICODE);
                continue;
            }
            if (in_array($key, self::BOOL_KEYS, true) || $key === 'enabled') {
                $row[$key] = $this->coerceBool($value) ? 1 : 0;
                continue;
            }
            $row[$key] = $value;
        }

        $now = now();
        $row['updated_at'] = $now;

        $exists = DB::table('home_design_settings')
            ->where('id', HomeDesignSetting::SINGLETON_ID)
            ->exists();

        if ($exists) {
            DB::table('home_design_settings')
                ->where('id', HomeDesignSetting::SINGLETON_ID)
                ->update($row);
        } else {
            $row['id'] = HomeDesignSetting::SINGLETON_ID;
            $row['created_at'] = $now;
            // Fill any NOT NULL columns the migration requires but attrs omitted.
            foreach ($this->defaultAttributes() as $k => $v) {
                if ($k === 'id' || array_key_exists($k, $row)) {
                    continue;
                }
                if (! $this->hasColumn($k)) {
                    continue;
                }
                if (in_array($k, self::JSON_KEYS, true)) {
                    $row[$k] = $v === null ? null : json_encode($v, JSON_UNESCAPED_UNICODE);
                } elseif (in_array($k, self::BOOL_KEYS, true) || $k === 'enabled') {
                    $row[$k] = $this->coerceBool($v) ? 1 : 0;
                } else {
                    $row[$k] = $v;
                }
            }
            DB::table('home_design_settings')->insert($row);
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function defaultAttributes(): array
    {
        return [
            'id' => HomeDesignSetting::SINGLETON_ID,
            'enabled' => true,
            'content_max_width_px' => HomeDesignSetting::DEFAULT_CONTENT_MAX_WIDTH_PX,
            'hide_desktop_top_nav' => false,
            'header_search_icon_mode' => true,
            'header_theme_click_toggle' => true,
            'hide_header_board_slugs' => HomeDesignSetting::DEFAULT_HIDE_BOARD_SLUGS,
            'footer_link_groups' => null,
            'business_info_enabled' => false,
        ];
    }

    private function memoryFallback(): HomeDesignSetting
    {
        $fallback = new HomeDesignSetting();
        $fallback->forceFill($this->defaultAttributes());
        $fallback->exists = false;

        return $fallback;
    }

    private function tableExists(): bool
    {
        try {
            return Schema::hasTable('home_design_settings');
        } catch (\Throwable) {
            return false;
        }
    }

    private function hasColumn(string $column): bool
    {
        try {
            return Schema::hasColumn('home_design_settings', $column);
        } catch (\Throwable) {
            return false;
        }
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function filterExistingColumns(array $data): array
    {
        if (! $this->tableExists()) {
            return $data;
        }

        $out = [];
        foreach ($data as $key => $value) {
            if ($key === 'id' || $this->hasColumn($key)) {
                $out[$key] = $value;
            }
        }

        return $out;
    }

    /**
     * @return array<string, mixed>
     */
    private function readEcommerceBasicInfo(): array
    {
        $basic = null;

        // 1) module_setting helper (preferred)
        if (function_exists('module_setting')) {
            try {
                $basic = module_setting('sirsoft-ecommerce', 'basic_info', null);
            } catch (\Throwable) {
                $basic = null;
            }
        }

        // 2) storage JSON (G7 category file)
        if (! is_array($basic) || $basic === []) {
            $paths = [];
            if (function_exists('storage_path')) {
                $paths[] = storage_path('app/modules/sirsoft-ecommerce/settings/basic_info.json');
                $paths[] = storage_path('app/modules/sirsoft-ecommerce/settings/basic_info/setting.json');
            }
            if (function_exists('base_path')) {
                $paths[] = base_path('storage/app/modules/sirsoft-ecommerce/settings/basic_info.json');
            }
            foreach ($paths as $path) {
                if (! is_string($path) || ! is_readable($path)) {
                    continue;
                }
                $decoded = json_decode((string) file_get_contents($path), true);
                if (is_array($decoded) && $decoded !== []) {
                    $basic = $decoded;
                    break;
                }
            }
        }

        if (! is_array($basic)) {
            return [];
        }

        // Unwrap common envelopes: {data:{...}}, {value:{...}}, JSON string
        if (isset($basic['data']) && is_array($basic['data']) && $this->looksLikeBasicInfo($basic['data'])) {
            $basic = $basic['data'];
        } elseif (isset($basic['value']) && is_array($basic['value']) && $this->looksLikeBasicInfo($basic['value'])) {
            $basic = $basic['value'];
        } elseif (isset($basic['basic_info']) && is_array($basic['basic_info'])) {
            $basic = $basic['basic_info'];
        }

        // Alternate key aliases seen in some ecommerce schemas
        $aliases = [
            'company_name' => ['shop_name', 'store_name', 'name', 'company'],
            'ceo_name' => ['representative', 'representative_name', 'owner_name', 'ceo'],
            'business_number' => ['biz_no', 'business_no', 'brn', '사업자등록번호'],
            'mail_order_number' => ['mailorder_number', 'online_marketing_number', '통신판매업신고'],
            'base_address' => ['address1', 'addr1', 'road_address'],
            'detail_address' => ['address2', 'addr2', 'address_detail'],
            'phone' => ['tel', 'telephone', 'contact_phone', 'cs_phone'],
            'email' => ['mail', 'contact_email', 'cs_email'],
        ];
        foreach ($aliases as $canonical => $alts) {
            if (! empty($basic[$canonical])) {
                continue;
            }
            foreach ($alts as $alt) {
                if (! empty($basic[$alt])) {
                    $basic[$canonical] = $basic[$alt];
                    break;
                }
            }
        }

        return $basic;
    }

    /**
     * @param  array<string, mixed>  $arr
     */
    private function looksLikeBasicInfo(array $arr): bool
    {
        foreach (['company_name', 'ceo_name', 'business_number', 'shop_name', 'phone', 'email', 'base_address'] as $k) {
            if (array_key_exists($k, $arr)) {
                return true;
            }
        }

        return false;
    }


    /**
     * Parse admin comma-separated board slugs ("qna, inquiry") → list of non-empty strings.
     * Also tolerates accidental JSON array strings.
     *
     * @return list<string>
     */
    private function parseCommaSeparatedSlugs(mixed $raw): array
    {
        if (is_array($raw)) {
            $parts = [];
            foreach ($raw as $s) {
                if (! is_string($s) && ! is_numeric($s)) {
                    continue;
                }
                $t = trim((string) $s);
                if ($t !== '') {
                    $parts[] = $t;
                }
            }

            return array_values($parts);
        }

        if ($raw === null) {
            return [];
        }

        $str = trim((string) $raw);
        if ($str === '') {
            return [];
        }

        // Accidental JSON array in the text field
        if ($str[0] === '[' || $str[0] === '{') {
            $decoded = json_decode($str, true);
            if (is_array($decoded)) {
                return $this->parseCommaSeparatedSlugs($decoded);
            }
        }

        $parts = preg_split('/\s*,\s*/', $str) ?: [];
        $out = [];
        foreach ($parts as $p) {
            $t = trim((string) $p);
            if ($t !== '') {
                $out[] = $t;
            }
        }

        return array_values($out);
    }

    private function coerceBool(mixed $v): bool
    {
        if (is_bool($v)) {
            return $v;
        }
        if (is_int($v) || is_float($v)) {
            return (int) $v === 1;
        }
        if (is_string($v)) {
            $trim = strtolower(trim($v));
            if ($trim === '' || $trim === '0' || $trim === 'false' || $trim === 'off' || $trim === 'no' || $trim === 'null') {
                return false;
            }
            if ($trim === '1' || $trim === 'true' || $trim === 'on' || $trim === 'yes') {
                return true;
            }

            return (bool) filter_var($v, FILTER_VALIDATE_BOOLEAN);
        }

        return (bool) $v;
    }

    /**
     * @return list<mixed>
     */
    private function decodeJsonArray(mixed $raw): array
    {
        $val = $this->decodeJsonValue($raw);
        if (! is_array($val)) {
            return [];
        }

        return array_values($val);
    }

    private function decodeJsonValue(mixed $raw): mixed
    {
        if (is_array($raw)) {
            return $raw;
        }
        if (! is_string($raw)) {
            return null;
        }
        $trim = trim($raw);
        if ($trim === '') {
            return null;
        }
        $decoded = json_decode($trim, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new \InvalidArgumentException('Invalid JSON: '.json_last_error_msg());
        }

        return $decoded;
    }
}
