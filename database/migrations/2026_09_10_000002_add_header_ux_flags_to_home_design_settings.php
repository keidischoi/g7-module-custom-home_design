<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('home_design_settings', function (Blueprint $table) {
            if (! Schema::hasColumn('home_design_settings', 'header_search_icon_mode')) {
                $table->boolean('header_search_icon_mode')->default(true)->after('hide_desktop_top_nav')
                    ->comment('헤더 검색: 아이콘만 표시, 클릭 시 패널 슬라이드 (feat UX, 기본 ON)');
            }
            if (! Schema::hasColumn('home_design_settings', 'header_theme_click_toggle')) {
                $table->boolean('header_theme_click_toggle')->default(true)->after('header_search_icon_mode')
                    ->comment('다크모드: 드롭다운 없이 아이콘 클릭으로 light/dark 즉시 토글 (기본 ON)');
            }
        });

        // 0.2.5: stop hiding boards by default. Legacy seed was ["qna","inquiry"] which
        // made QnA/FAQ disappear even when the admin textarea looked empty after save bugs.
        // Reset only that exact legacy default — custom lists are preserved.
        $rows = DB::table('home_design_settings')->select('id', 'hide_header_board_slugs')->get();
        foreach ($rows as $row) {
            $raw = $row->hide_header_board_slugs;
            $decoded = is_string($raw) ? json_decode($raw, true) : $raw;
            if (! is_array($decoded)) {
                continue;
            }
            $normalized = array_values(array_map('strval', $decoded));
            sort($normalized);
            $legacy = ['inquiry', 'qna'];
            if ($normalized === $legacy) {
                DB::table('home_design_settings')->where('id', $row->id)->update([
                    'hide_header_board_slugs' => json_encode([], JSON_UNESCAPED_UNICODE),
                    'updated_at' => now(),
                ]);
            }
        }
    }

    public function down(): void
    {
        Schema::table('home_design_settings', function (Blueprint $table) {
            if (Schema::hasColumn('home_design_settings', 'header_theme_click_toggle')) {
                $table->dropColumn('header_theme_click_toggle');
            }
            if (Schema::hasColumn('home_design_settings', 'header_search_icon_mode')) {
                $table->dropColumn('header_search_icon_mode');
            }
        });
    }
};
