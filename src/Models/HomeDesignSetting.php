<?php

namespace Modules\Custom\HomeDesign\Models;

use Illuminate\Database\Eloquent\Model;
use Modules\Custom\HomeDesign\Services\FaviconUploadService;

class HomeDesignSetting extends Model
{
    public const SINGLETON_ID = 1;

    public const DEFAULT_CONTENT_MAX_WIDTH_PX = 1240;

    public const DEFAULT_HIDE_BOARD_SLUGS = [];

    protected $table = 'home_design_settings';

    protected $guarded = [];

    protected $fillable = [
        'enabled',
        'content_max_width_px',
        'hide_desktop_top_nav',
        'header_search_icon_mode',
        'header_theme_click_toggle',
        'hide_header_board_slugs',
        'hide_home_box_ids',
        'home_custom_html',
        'favicon_url',
        'footer_link_groups',
        'business_info_enabled',
    ];

    protected $casts = [
        'enabled' => 'boolean',
        'content_max_width_px' => 'integer',
        'hide_desktop_top_nav' => 'boolean',
        'header_search_icon_mode' => 'boolean',
        'header_theme_click_toggle' => 'boolean',
        'hide_header_board_slugs' => 'array',
        'hide_home_box_ids' => 'array',
        'footer_link_groups' => 'array',
        'business_info_enabled' => 'boolean',
    ];

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
            'enabled' => true,
            'content_max_width_px' => (int) ($this->content_max_width_px ?: self::DEFAULT_CONTENT_MAX_WIDTH_PX),
            'hide_desktop_top_nav' => (bool) $this->hide_desktop_top_nav,
            'header_search_icon_mode' => $this->header_search_icon_mode !== null
                ? (bool) $this->header_search_icon_mode
                : true,
            'header_theme_click_toggle' => $this->header_theme_click_toggle !== null
                ? (bool) $this->header_theme_click_toggle
                : true,
            'hide_header_board_slugs' => array_values($this->hide_header_board_slugs ?? []),
            'hide_home_box_ids' => array_values($this->hide_home_box_ids ?? []),
            'home_custom_html' => (string) ($this->home_custom_html ?? ''),
            'favicon_url' => (string) ($this->favicon_url ?? ''),
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

    public function toAdminArray(): array
    {
        $slugs = array_values($this->hide_header_board_slugs ?? []);
        $homeBoxes = array_values($this->hide_home_box_ids ?? []);
        $groups = $this->footer_link_groups;
        $favicon = (string) ($this->favicon_url ?? '');

        return [
            'enabled' => true,
            'content_max_width_px' => (int) ($this->content_max_width_px ?: self::DEFAULT_CONTENT_MAX_WIDTH_PX),
            'hide_desktop_top_nav' => (bool) $this->hide_desktop_top_nav,
            'header_search_icon_mode' => $this->header_search_icon_mode !== null
                ? (bool) $this->header_search_icon_mode
                : true,
            'header_theme_click_toggle' => $this->header_theme_click_toggle !== null
                ? (bool) $this->header_theme_click_toggle
                : true,
            'hide_header_board_slugs' => $slugs,
            'hide_header_board_slugs_text' => $slugs === [] ? '' : implode(', ', $slugs),
            'hide_header_board_slugs_json' => $slugs === []
                ? '[]'
                : json_encode($slugs, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT),
            'hide_home_box_ids' => $homeBoxes,
            'hide_home_box_ids_text' => $homeBoxes === [] ? '' : implode(', ', $homeBoxes),
            'home_custom_html' => (string) ($this->home_custom_html ?? ''),
            'favicon_url' => $favicon,
            'uploader_favicon_url' => array_slice(FaviconUploadService::uploaderFilesFromUrl($favicon), 0, 1),
            'footer_link_groups' => $groups,
            'footer_link_groups_json' => $groups === null
                ? ''
                : json_encode($groups, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT),
            'business_info_enabled' => (bool) $this->business_info_enabled,
        ];
    }
}
