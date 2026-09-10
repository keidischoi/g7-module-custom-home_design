<?php

namespace Modules\Custom\HomeDesign\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class UpdateHomeDesignSettingRequest extends FormRequest
{
    /** Full-form boolean keys — missing (unchecked / stripped false) ⇒ false. */
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

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            // module-level `enabled` is unused (module manager activation is enough)
            'content_max_width_px' => ['sometimes', 'integer', 'min:320', 'max:2560'],
            'hide_desktop_top_nav' => ['required', 'boolean'],
            'header_search_icon_mode' => ['required', 'boolean'],
            'header_theme_click_toggle' => ['required', 'boolean'],
            'hide_header_board_slugs' => ['sometimes'],
            'hide_header_board_slugs_json' => ['sometimes', 'nullable'],
            'footer_link_groups' => ['sometimes', 'nullable'],
            'footer_link_groups_json' => ['sometimes', 'nullable'],
            'business_info_enabled' => ['required', 'boolean'],
        ];
    }

    protected function prepareForValidation(): void
    {
        // Admin settings form is a full replace. Layout engines often omit JSON keys
        // whose expression evaluates to false — treat missing checkbox keys as false
        // so unchecked boxes actually persist off.
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
     * Also treat string "false" from layout expression stringification.
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
