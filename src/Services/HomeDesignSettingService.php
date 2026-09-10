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
            'enabled' => false,
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
