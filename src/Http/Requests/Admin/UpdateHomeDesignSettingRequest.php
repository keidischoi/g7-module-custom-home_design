<?php

namespace Modules\Custom\HomeDesign\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Modules\Custom\HomeDesign\Models\HomeDesignSetting;

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
        // IMPORTANT: do NOT use `present` on optional text/JSON fields.
        // G7 apiCall often omits empty-string keys from the JSON body → present → 422
        // ("입력값을 확인해 주세요."). prepareForValidation defaults missing keys.
        return [
            'content_max_width_px' => ['sometimes', 'integer', 'min:320', 'max:2560'],
            'hide_desktop_top_nav' => ['sometimes', 'boolean'],
            'header_search_icon_mode' => ['sometimes', 'boolean'],
            'header_theme_click_toggle' => ['sometimes', 'boolean'],
            'business_info_enabled' => ['sometimes', 'boolean'],
            // Comma-separated slugs (preferred) OR legacy JSON array / *_json
            'hide_header_board_slugs_text' => ['sometimes', 'nullable', 'string'],
            'hide_header_board_slugs' => ['sometimes', 'nullable'],
            'hide_header_board_slugs_json' => ['sometimes', 'nullable'],
            'footer_link_groups' => ['sometimes', 'nullable'],
            // Empty / omitted footer JSON must pass (service stores null)
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
            if (is_string($raw) && (trim($raw) === '' || ! is_numeric(trim($raw)))) {
                $px = HomeDesignSetting::DEFAULT_CONTENT_MAX_WIDTH_PX;
            } else {
                $px = (int) $raw;
            }
            if ($px < 320 || $px > 2560) {
                $px = HomeDesignSetting::DEFAULT_CONTENT_MAX_WIDTH_PX;
            }
            $this->merge(['content_max_width_px' => $px]);
        }

        // Slugs: prefer comma-separated text; materialize key when G7 omitted empty string
        if (! $this->exists('hide_header_board_slugs_text')) {
            if ($this->exists('hide_header_board_slugs_json')) {
                $this->merge([
                    'hide_header_board_slugs_text' => $this->jsonSlugsToCsv($this->input('hide_header_board_slugs_json')),
                ]);
            } elseif ($this->exists('hide_header_board_slugs')) {
                $this->merge([
                    'hide_header_board_slugs_text' => $this->arraySlugsToCsv($this->input('hide_header_board_slugs')),
                ]);
            } else {
                $this->merge(['hide_header_board_slugs_text' => '']);
            }
        } else {
            $v = $this->input('hide_header_board_slugs_text');
            if (is_array($v)) {
                $this->merge(['hide_header_board_slugs_text' => $this->arraySlugsToCsv($v)]);
            } elseif ($v === null) {
                $this->merge(['hide_header_board_slugs_text' => '']);
            } else {
                // Accept legacy JSON-array string in the text field too
                $str = (string) $v;
                $trim = trim($str);
                if ($trim !== '' && ($trim[0] === '[' || $trim[0] === '{')) {
                    $this->merge(['hide_header_board_slugs_text' => $this->jsonSlugsToCsv($trim)]);
                } else {
                    $this->merge(['hide_header_board_slugs_text' => $str]);
                }
            }
        }

        if (! $this->exists('footer_link_groups_json')) {
            if ($this->exists('footer_link_groups')) {
                $groups = $this->input('footer_link_groups');
                $this->merge([
                    'footer_link_groups_json' => is_array($groups)
                        ? json_encode($groups, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT)
                        : (string) ($groups ?? ''),
                ]);
            } else {
                $this->merge(['footer_link_groups_json' => '']);
            }
        }

        $fg = $this->input('footer_link_groups_json');
        if (is_array($fg)) {
            $this->merge([
                'footer_link_groups_json' => json_encode($fg, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT),
            ]);
        } elseif ($fg === null) {
            $this->merge(['footer_link_groups_json' => '']);
        } else {
            $this->merge(['footer_link_groups_json' => (string) $fg]);
        }

        if ($this->exists('enabled')) {
            $all = $this->all();
            unset($all['enabled']);
            $this->replace($all);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function settingsPayload(): array
    {
        $payload = $this->validated();
        // Always pass through optional text fields even when omitted from body
        // (G7 may strip empty strings; prepareForValidation already defaulted them).
        $payload['hide_header_board_slugs_text'] = (string) $this->input('hide_header_board_slugs_text', '');
        // Checkbox UI sends the array; keep it so Service can prefer it over text.
        if ($this->exists('hide_header_board_slugs') && is_array($this->input('hide_header_board_slugs'))) {
            $payload['hide_header_board_slugs'] = array_values($this->input('hide_header_board_slugs'));
        }
        $payload['footer_link_groups_json'] = (string) $this->input('footer_link_groups_json', '');

        foreach (self::BOOL_KEYS as $boolKey) {
            $payload[$boolKey] = $this->coerceBool($this->input($boolKey, false));
        }

        if (! array_key_exists('content_max_width_px', $payload)) {
            $payload['content_max_width_px'] = HomeDesignSetting::DEFAULT_CONTENT_MAX_WIDTH_PX;
        }

        return $payload;
    }

    private function arraySlugsToCsv(mixed $slugs): string
    {
        if (! is_array($slugs)) {
            return is_string($slugs) ? $slugs : '';
        }
        $parts = [];
        foreach ($slugs as $s) {
            if (! is_string($s) && ! is_numeric($s)) {
                continue;
            }
            $t = trim((string) $s);
            if ($t !== '') {
                $parts[] = $t;
            }
        }

        return implode(', ', $parts);
    }

    private function jsonSlugsToCsv(mixed $raw): string
    {
        if (is_array($raw)) {
            return $this->arraySlugsToCsv($raw);
        }
        if (! is_string($raw) || trim($raw) === '') {
            return '';
        }
        $decoded = json_decode($raw, true);
        if (is_array($decoded)) {
            return $this->arraySlugsToCsv($decoded);
        }

        // Already comma text
        return trim($raw);
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
}
