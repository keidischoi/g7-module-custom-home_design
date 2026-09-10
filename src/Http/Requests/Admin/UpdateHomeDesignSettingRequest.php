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
            'content_max_width_px' => ['sometimes', 'integer', 'min:320', 'max:2560'],
            'hide_desktop_top_nav' => ['required', 'boolean'],
            'header_search_icon_mode' => ['required', 'boolean'],
            'header_theme_click_toggle' => ['required', 'boolean'],
            'business_info_enabled' => ['required', 'boolean'],
            // Comma-separated slugs (preferred) OR legacy JSON array / *_json
            'hide_header_board_slugs_text' => ['present', 'nullable', 'string'],
            'hide_header_board_slugs' => ['sometimes'],
            'hide_header_board_slugs_json' => ['sometimes', 'nullable'],
            'footer_link_groups' => ['sometimes', 'nullable'],
            'footer_link_groups_json' => ['present', 'nullable'],
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
            $this->merge(['content_max_width_px' => (int) $this->input('content_max_width_px')]);
        }

        // Slugs: prefer comma-separated text; always materialize the key for `present`
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
                $this->merge(['hide_header_board_slugs_text' => (string) $v]);
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
        $payload['hide_header_board_slugs_text'] = (string) $this->input('hide_header_board_slugs_text', '');
        $payload['footer_link_groups_json'] = (string) $this->input('footer_link_groups_json', '');

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
