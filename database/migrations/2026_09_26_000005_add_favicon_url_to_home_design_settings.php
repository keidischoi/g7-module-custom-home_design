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
            if (! Schema::hasColumn('home_design_settings', 'favicon_url')) {
                $table->string('favicon_url', 1024)->nullable()->after('home_custom_html')
                    ->comment('사이트 파비콘 URL (관리자 업로더)');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('home_design_settings')) {
            return;
        }
        Schema::table('home_design_settings', function (Blueprint $table) {
            if (Schema::hasColumn('home_design_settings', 'favicon_url')) {
                $table->dropColumn('favicon_url');
            }
        });
    }
};
