<?php

namespace Modules\Custom\HomeDesign\Services;

use Modules\Custom\HomeDesign\Models\HomeDesignSetting;

class HomeDesignSettingService
{
    public function get(): HomeDesignSetting
    {
        $row = HomeDesignSetting::query()->find(HomeDesignSetting::SINGLETON_ID);
        if ($row) {
            return $row;
        }

        return HomeDesignSetting::query()->create([
            'id' => HomeDesignSetting::SINGLETON_ID,
            // Module manager activation is enough — keep column true for legacy rows.
            'enabled' => true,
            'content_max_width_px' => HomeDesignSetting::DEFAULT_CONTENT_MAX_WIDTH_PX,
            'hide_desktop_top_nav' => false,
            'hide_header_board_slugs' => HomeDesignSetting::DEFAULT_HIDE_BOARD_SLUGS,
            'footer_link_groups' => null,
            'business_info_enabled' => false,
        ]);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(array $data): HomeDesignSetting
    {
        $row = $this->get();

        if (array_key_exists('hide_header_board_slugs_json', $data) && ! array_key_exists('hide_header_board_slugs', $data)) {
            $data['hide_header_board_slugs'] = $this->decodeJsonArray($data['hide_header_board_slugs_json'] ?? '[]');
        }
        if (array_key_exists('footer_link_groups_json', $data) && ! array_key_exists('footer_link_groups', $data)) {
            $raw = $data['footer_link_groups_json'] ?? '';
            $data['footer_link_groups'] = ($raw === null || trim((string) $raw) === '')
                ? null
                : $this->decodeJsonValue($raw);
        }

        unset($data['hide_header_board_slugs_json'], $data['footer_link_groups_json']);

        // 사업자 문자열은 이커머스 basic_info 에서만 표시 — 로컬 컬럼 저장 중단
        foreach ([
            'business_company_name',
            'business_representative',
            'business_number',
            'business_mail_order_number',
            'business_address',
            'business_phone',
            'business_email',
            'enabled', // admin toggle removed — module activation controls availability
        ] as $legacyKey) {
            unset($data[$legacyKey]);
        }

        // Always keep design active while the module is installed/enabled in G7.
        $data['enabled'] = true;

        foreach (['hide_desktop_top_nav', 'business_info_enabled'] as $boolKey) {
            if (array_key_exists($boolKey, $data)) {
                $data[$boolKey] = (bool) $data[$boolKey];
            }
        }

        if (isset($data['hide_header_board_slugs']) && is_string($data['hide_header_board_slugs'])) {
            $data['hide_header_board_slugs'] = $this->decodeJsonArray($data['hide_header_board_slugs']);
        }
        if (array_key_exists('footer_link_groups', $data) && is_string($data['footer_link_groups'])) {
            $trim = trim($data['footer_link_groups']);
            $data['footer_link_groups'] = $trim === '' ? null : $this->decodeJsonValue($trim);
        }

        if (isset($data['content_max_width_px'])) {
            $data['content_max_width_px'] = max(320, min(2560, (int) $data['content_max_width_px']));
        }

        if (isset($data['hide_header_board_slugs']) && is_array($data['hide_header_board_slugs'])) {
            $data['hide_header_board_slugs'] = array_values(array_filter(array_map(
                static fn ($s) => is_string($s) ? trim($s) : '',
                $data['hide_header_board_slugs']
            ), static fn ($s) => $s !== ''));
        }

        $row->fill($data);
        $row->save();

        return $row->fresh() ?? $row;
    }


    /**
     * sirsoft-ecommerce basic_info 에서 사업자 고지용 필드 조회.
     * feat 테마와 동일 매핑: company_name, ceo_name, business_number,
     * mail_order_number, base_address+detail_address, phone, email.
     *
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
        $basic = $this->readEcommerceBasicInfo();

        $base = trim((string) ($basic['base_address'] ?? ''));
        $detail = trim((string) ($basic['detail_address'] ?? ''));
        $address = trim($base.($base !== '' && $detail !== '' ? ' ' : '').$detail);
        // Also accept a single "address" key if present
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
    }

    /**
     * @return array<string, mixed>
     */
    private function readEcommerceBasicInfo(): array
    {
        $basic = null;
        if (function_exists('module_setting')) {
            try {
                $basic = module_setting('sirsoft-ecommerce', 'basic_info', null);
            } catch (\Throwable) {
                $basic = null;
            }
        }
        if (! is_array($basic) || $basic === []) {
            // Fallback: storage category file (module_setting unavailable / empty)
            $path = storage_path('app/modules/sirsoft-ecommerce/settings/basic_info.json');
            if (is_readable($path)) {
                $decoded = json_decode((string) file_get_contents($path), true);
                $basic = is_array($decoded) ? $decoded : [];
            } else {
                $basic = [];
            }
        }

        return $basic;
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
