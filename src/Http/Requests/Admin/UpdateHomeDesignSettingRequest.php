<?php

namespace Modules\Custom\HomeDesign\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Modules\Custom\HomeDesign\Models\HomeDesignSetting;

class UpdateHomeDesignSettingRequest extends FormRequest
{
    private const BOOL_KEYS = [
        'hide_desktop_top_nav',
        'header_search_icon_mode',
        'header_theme_click_toggle',
        'business_info_enabled',
    ];

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'content_max_width_px' => ['sometimes', 'integer', 'min:320', 'max:2560'],
            'hide_desktop_top_nav' => ['sometimes', 'boolean'],
            'header_search_icon_mode' => ['sometimes', 'boolean'],
            'header_theme_click_toggle' => ['sometimes', 'boolean'],
            'business_info_enabled' => ['sometimes', 'boolean'],
            'hide_header_board_slugs_text' => ['sometimes', 'nullable', 'string'],
            'hide_header_board_slugs' => ['sometimes', 'nullable'],
            'hide_header_board_slugs_json' => ['sometimes', 'nullable'],
            'hide_home_box_ids_text' => ['sometimes', 'nullable', 'string'],
            'hide_home_box_ids' => ['sometimes', 'nullable'],
            'home_custom_html' => ['sometimes', 'nullable', 'string'],
            'favicon_url' => ['sometimes', 'nullable', 'string', 'max:2048'],
            'footer_link_groups' => ['sometimes', 'nullable'],
            'footer_link_groups_json' => ['sometimes', 'nullable', 'string'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $boolMerge = [];
        foreach (self::BOOL_KEYS as $boolKey) {
            if ($this->exists($boolKey)) {
                $boolMerge[$boolKey] = $this->coerceBool($this->input($boolKey));
            } else {
                $boolMerge[$boolKey] = false;
            }
        }
        $this->merge($boolMerge);

        if ($this->exists('content_max_width_px')) {
            $raw = $this->input('content_max_width_px');
            $px = (is_string($raw) && (trim($raw) === '' || ! is_numeric(trim($raw))))
                ? HomeDesignSetting::DEFAULT_CONTENT_MAX_WIDTH_PX
                : (int) $raw;
            if ($px < 320 || $px > 2560) {
                $px = HomeDesignSetting::DEFAULT_CONTENT_MAX_WIDTH_PX;
            }
            $this->merge(['content_max_width_px' => $px]);
        }

        if (! $this->exists('hide_header_board_slugs_text')) {
            $this->merge(['hide_header_board_slugs_text' => '']);
        } else {
            $v = $this->input('hide_header_board_slugs_text');
            $this->merge(['hide_header_board_slugs_text' => is_array($v) ? implode(', ', $v) : (string) ($v ?? '')]);
        }

        if (! $this->exists('hide_home_box_ids_text')) {
            $this->merge(['hide_home_box_ids_text' => '']);
        } else {
            $v = $this->input('hide_home_box_ids_text');
            $this->merge(['hide_home_box_ids_text' => is_array($v) ? implode(', ', $v) : (string) ($v ?? '')]);
        }

        if (! $this->exists('home_custom_html')) {
            $this->merge(['home_custom_html' => '']);
        } else {
            $this->merge(['home_custom_html' => (string) ($this->input('home_custom_html') ?? '')]);
        }

        if (! $this->exists('footer_link_groups_json')) {
            $this->merge(['footer_link_groups_json' => '']);
        } else {
            $fg = $this->input('footer_link_groups_json');
            $this->merge([
                'footer_link_groups_json' => is_array($fg)
                    ? json_encode($fg, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT)
                    : (string) ($fg ?? ''),
            ]);
        }

        if ($this->exists('favicon_url')) {
            $this->merge(['favicon_url' => trim((string) ($this->input('favicon_url') ?? ''))]);
        }

        if ($this->exists('enabled')) {
            $all = $this->all();
            unset($all['enabled']);
            $this->replace($all);
        }
    }

    public function settingsPayload(): array
    {
        $payload = $this->validated();
        $payload['hide_header_board_slugs_text'] = (string) $this->input('hide_header_board_slugs_text', '');
        $payload['hide_home_box_ids_text'] = (string) $this->input('hide_home_box_ids_text', '');
        $payload['home_custom_html'] = (string) $this->input('home_custom_html', '');
        $payload['footer_link_groups_json'] = (string) $this->input('footer_link_groups_json', '');
        if ($this->exists('favicon_url')) {
            $payload['favicon_url'] = trim((string) $this->input('favicon_url', ''));
        }

        foreach (self::BOOL_KEYS as $boolKey) {
            $payload[$boolKey] = $this->coerceBool($this->input($boolKey, false));
        }

        if (! array_key_exists('content_max_width_px', $payload)) {
            $payload['content_max_width_px'] = HomeDesignSetting::DEFAULT_CONTENT_MAX_WIDTH_PX;
        }

        return $payload;
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
            if (in_array($trim, ['', '0', 'false', 'off', 'no', 'null'], true)) {
                return false;
            }
            if (in_array($trim, ['1', 'true', 'on', 'yes'], true)) {
                return true;
            }
        }

        return (bool) $v;
    }
}
