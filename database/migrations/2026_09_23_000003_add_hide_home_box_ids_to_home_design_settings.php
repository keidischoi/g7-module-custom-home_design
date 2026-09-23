<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('home_design_settings')) {
            return;
        }

        Schema::table('home_design_settings', function (Blueprint $table) {
            if (! Schema::hasColumn('home_design_settings', 'hide_home_box_ids')) {
                $table->json('hide_home_box_ids')->nullable()->after('hide_header_board_slugs')
                    ->comment('홈에서 숨길 박스 id/게시판 slug/제목 키워드 목록');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('home_design_settings')) {
            return;
        }
        Schema::table('home_design_settings', function (Blueprint $table) {
            if (Schema::hasColumn('home_design_settings', 'hide_home_box_ids')) {
                $table->dropColumn('hide_home_box_ids');
            }
        });
    }
};
