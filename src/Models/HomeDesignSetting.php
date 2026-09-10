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
 * @property string|null $business_company_name
 * @property string|null $business_representative
 * @property string|null $business_number
 * @property string|null $business_mail_order_number
 * @property string|null $business_address
 * @property string|null $business_phone
 * @property string|null $business_email
 */
class HomeDesignSetting extends Model
{
    public const SINGLETON_ID = 1;

    public const DEFAULT_CONTENT_MAX_WIDTH_PX = 1240;

    /** @var list<string> feat 테마와 동일한 기본 숨김 slug */
    public const DEFAULT_HIDE_BOARD_SLUGS = ['qna', 'inquiry'];

    protected $table = 'home_design_settings';

    protected $fillable = [
        'enabled',
        'content_max_width_px',
        'hide_desktop_top_nav',
        'hide_header_board_slugs',
        'footer_link_groups',
        'business_info_enabled',
        'business_company_name',
        'business_representative',
        'business_number',
        'business_mail_order_number',
        'business_address',
        'business_phone',
        'business_email',
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
     * @return array<string, mixed>
     */
    public function toPublicArray(): array
    {
        return [
            'enabled' => (bool) $this->enabled,
            'content_max_width_px' => (int) ($this->content_max_width_px ?: self::DEFAULT_CONTENT_MAX_WIDTH_PX),
            'hide_desktop_top_nav' => (bool) $this->hide_desktop_top_nav,
            'hide_header_board_slugs' => array_values($this->hide_header_board_slugs ?? []),
            'footer_link_groups' => $this->footer_link_groups,
            'business_info_enabled' => (bool) $this->business_info_enabled,
            'business_info' => [
                'companyName' => (string) ($this->business_company_name ?? ''),
                'representative' => (string) ($this->business_representative ?? ''),
                'businessNumber' => (string) ($this->business_number ?? ''),
                'mailOrderNumber' => (string) ($this->business_mail_order_number ?? ''),
                'address' => (string) ($this->business_address ?? ''),
                'phone' => (string) ($this->business_phone ?? ''),
                'email' => (string) ($this->business_email ?? ''),
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
            'enabled' => (bool) $this->enabled,
            'content_max_width_px' => (int) ($this->content_max_width_px ?: self::DEFAULT_CONTENT_MAX_WIDTH_PX),
            'hide_desktop_top_nav' => (bool) $this->hide_desktop_top_nav,
            'hide_header_board_slugs' => $slugs,
            'hide_header_board_slugs_json' => json_encode($slugs, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT),
            'footer_link_groups' => $groups,
            'footer_link_groups_json' => $groups === null
                ? ''
                : json_encode($groups, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT),
            'business_info_enabled' => (bool) $this->business_info_enabled,
            'business_company_name' => (string) ($this->business_company_name ?? ''),
            'business_representative' => (string) ($this->business_representative ?? ''),
            'business_number' => (string) ($this->business_number ?? ''),
            'business_mail_order_number' => (string) ($this->business_mail_order_number ?? ''),
            'business_address' => (string) ($this->business_address ?? ''),
            'business_phone' => (string) ($this->business_phone ?? ''),
            'business_email' => (string) ($this->business_email ?? ''),
        ];
    }
}
