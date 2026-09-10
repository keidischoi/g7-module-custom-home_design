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
            'enabled' => ['sometimes', 'boolean'],
            'content_max_width_px' => ['sometimes', 'integer', 'min:320', 'max:2560'],
            'hide_desktop_top_nav' => ['sometimes', 'boolean'],
            'hide_header_board_slugs' => ['sometimes'],
            'hide_header_board_slugs_json' => ['sometimes', 'nullable', 'string'],
            'footer_link_groups' => ['sometimes', 'nullable'],
            'footer_link_groups_json' => ['sometimes', 'nullable', 'string'],
            'business_info_enabled' => ['sometimes', 'boolean'],
        ];
    }

    protected function prepareForValidation(): void
    {
        foreach (['enabled', 'hide_desktop_top_nav', 'business_info_enabled'] as $boolKey) {
            if ($this->exists($boolKey)) {
                $v = $this->input($boolKey);
                if (is_string($v)) {
                    $this->merge([$boolKey => filter_var($v, FILTER_VALIDATE_BOOLEAN)]);
                }
            }
        }
        if ($this->exists('content_max_width_px')) {
            $this->merge(['content_max_width_px' => (int) $this->input('content_max_width_px')]);
        }
    }
}
