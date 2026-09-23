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
            if (! Schema::hasColumn('home_design_settings', 'home_custom_html')) {
                $table->longText('home_custom_html')->nullable()->after('hide_home_box_ids')
                    ->comment('홈 캐러셀 아래·박스 위에 삽입할 관리자 커스텀 HTML');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('home_design_settings')) {
            return;
        }
        Schema::table('home_design_settings', function (Blueprint $table) {
            if (Schema::hasColumn('home_design_settings', 'home_custom_html')) {
                $table->dropColumn('home_custom_html');
            }
        });
    }
};
