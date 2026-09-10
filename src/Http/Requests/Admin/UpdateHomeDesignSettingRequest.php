<?php

namespace Modules\Custom\HomeDesign\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class UpdateHomeDesignSettingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            // module-level `enabled` is unused (module manager activation is enough)
            'content_max_width_px' => ['sometimes', 'integer', 'min:320', 'max:2560'],
            'hide_desktop_top_nav' => ['sometimes', 'boolean'],
            'header_search_icon_mode' => ['sometimes', 'boolean'],
            'header_theme_click_toggle' => ['sometimes', 'boolean'],
            'hide_header_board_slugs' => ['sometimes'],
            'hide_header_board_slugs_json' => ['sometimes', 'nullable'],
            'footer_link_groups' => ['sometimes', 'nullable'],
            'footer_link_groups_json' => ['sometimes', 'nullable'],
            'business_info_enabled' => ['sometimes', 'boolean'],
        ];
    }

    protected function prepareForValidation(): void
    {
        foreach (['hide_desktop_top_nav', 'header_search_icon_mode', 'header_theme_click_toggle', 'business_info_enabled'] as $boolKey) {
            if ($this->exists($boolKey)) {
                $this->merge([$boolKey => $this->coerceBool($this->input($boolKey))]);
            }
        }
        if ($this->exists('content_max_width_px')) {
            $this->merge(['content_max_width_px' => (int) $this->input('content_max_width_px')]);
        }

        // If the layout engine embeds JSON textareas as arrays/objects, re-encode to strings
        // so the service decode path stays consistent.
        foreach (['hide_header_board_slugs_json', 'footer_link_groups_json'] as $jsonKey) {
            if (! $this->exists($jsonKey)) {
                continue;
            }
            $v = $this->input($jsonKey);
            if (is_array($v)) {
                $this->merge([
                    $jsonKey => json_encode($v, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT),
                ]);
            } elseif ($v === null) {
                $this->merge([$jsonKey => '']);
            } else {
                $this->merge([$jsonKey => (string) $v]);
            }
        }

        // Drop legacy module-enable flag from payload if a stale client still sends it.
        if ($this->exists('enabled')) {
            $all = $this->all();
            unset($all['enabled']);
            $this->replace($all);
        }
    }

    /**
     * Never use bare (bool)$v — (bool)"false" === true in PHP.
     */
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
}
