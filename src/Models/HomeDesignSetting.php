<?php

namespace Modules\Custom\HomeDesign\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * 홈 디자인 설정 (싱글톤 id=1)
 *
 * @property int $id
 * @property bool $enabled
 * @property int $content_max_width_px
 * @property bool $hide_desktop_top_nav
 * @property array|null $hide_header_board_slugs
 * @property array|null $footer_link_groups
 * @property bool $business_info_enabled
 * @property string|null $business_company_name Legacy unused (0.2.2+: ecommerce basic_info)
 * @property string|null $business_representative Legacy unused
 * @property string|null $business_number Legacy unused
 * @property string|null $business_mail_order_number Legacy unused
 * @property string|null $business_address Legacy unused
 * @property string|null $business_phone Legacy unused
 * @property string|null $business_email Legacy unused
 */
class HomeDesignSetting extends Model
{
    public const SINGLETON_ID = 1;

    public const DEFAULT_CONTENT_MAX_WIDTH_PX = 1240;

    /** @var list<string> feat 테마와 동일한 기본 숨김 slug */
    public const DEFAULT_HIDE_BOARD_SLUGS = ['qna', 'inquiry'];

    protected $table = 'home_design_settings';

    /** business_* string columns kept in DB but no longer fillable (0.2.2+) */
    protected $fillable = [
        'enabled',
        'content_max_width_px',
        'hide_desktop_top_nav',
        'hide_header_board_slugs',
        'footer_link_groups',
        'business_info_enabled',
    ];

    protected $casts = [
        'enabled' => 'boolean',
        'content_max_width_px' => 'integer',
        'hide_desktop_top_nav' => 'boolean',
        'hide_header_board_slugs' => 'array',
        'footer_link_groups' => 'array',
        'business_info_enabled' => 'boolean',
    ];

    /**
     * @param  array<string, string>|null  $ecommerceBusinessInfo  from HomeDesignSettingService::getEcommerceBusinessInfo()
     * @return array<string, mixed>
     */
    public function toPublicArray(?array $ecommerceBusinessInfo = null): array
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
        $bi = $ecommerceBusinessInfo ?? $empty;

        return [
            'enabled' => true, // module activation is the gate; settings toggle removed in 0.2.4
            'content_max_width_px' => (int) ($this->content_max_width_px ?: self::DEFAULT_CONTENT_MAX_WIDTH_PX),
            'hide_desktop_top_nav' => (bool) $this->hide_desktop_top_nav,
            'hide_header_board_slugs' => array_values($this->hide_header_board_slugs ?? []),
            'footer_link_groups' => $this->footer_link_groups,
            'business_info_enabled' => (bool) $this->business_info_enabled,
            'business_info' => [
                'companyName' => (string) ($bi['companyName'] ?? ''),
                'representative' => (string) ($bi['representative'] ?? ''),
                'businessNumber' => (string) ($bi['businessNumber'] ?? ''),
                'mailOrderNumber' => (string) ($bi['mailOrderNumber'] ?? ''),
                'address' => (string) ($bi['address'] ?? ''),
                'phone' => (string) ($bi['phone'] ?? ''),
                'email' => (string) ($bi['email'] ?? ''),
            ],
        ];
    }

    /**
     * Admin form-friendly payload (JSON fields as pretty strings for Textarea).
     *
     * @return array<string, mixed>
     */
    public function toAdminArray(): array
    {
        $slugs = array_values($this->hide_header_board_slugs ?? []);
        $groups = $this->footer_link_groups;

        return [
            // Keep key for older clients; always true — use G7 module enable/disable.
            'enabled' => true,
            'content_max_width_px' => (int) ($this->content_max_width_px ?: self::DEFAULT_CONTENT_MAX_WIDTH_PX),
            'hide_desktop_top_nav' => (bool) $this->hide_desktop_top_nav,
            'hide_header_board_slugs' => $slugs,
            'hide_header_board_slugs_json' => json_encode($slugs, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT),
            'footer_link_groups' => $groups,
            'footer_link_groups_json' => $groups === null
                ? ''
                : json_encode($groups, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT),
            'business_info_enabled' => (bool) $this->business_info_enabled,
        ];
    }
}
