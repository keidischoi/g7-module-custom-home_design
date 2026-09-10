<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('home_design_settings', function (Blueprint $table) {
            $table->bigIncrements('id')->comment('설정 고유번호 (싱글톤 1행)');
            $table->boolean('enabled')->default(false)->comment('모듈 동작 활성 (신규 설치 기본 OFF)');
            $table->unsignedInteger('content_max_width_px')->default(1240)->comment('메인 콘텐츠 최대 폭(px)');
            $table->boolean('hide_desktop_top_nav')->default(false)->comment('데스크톱 상단 탭 네비 숨김');
            $table->json('hide_header_board_slugs')->nullable()->comment('헤더에서 숨길 게시판 slug 목록');
            $table->json('footer_link_groups')->nullable()->comment('푸터 linkGroups (미설정 시 테마 기본)');
            $table->boolean('business_info_enabled')->default(false)->comment('푸터 직전 사업자 고지 주입');
            $table->string('business_company_name', 255)->nullable()->comment('상호');
            $table->string('business_representative', 255)->nullable()->comment('대표자');
            $table->string('business_number', 64)->nullable()->comment('사업자등록번호');
            $table->string('business_mail_order_number', 128)->nullable()->comment('통신판매업신고');
            $table->string('business_address', 512)->nullable()->comment('사업장 주소');
            $table->string('business_phone', 64)->nullable()->comment('대표 전화');
            $table->string('business_email', 255)->nullable()->comment('대표 이메일');
            $table->timestamps();
        });

        if (DB::getDriverName() === 'mysql') {
            Schema::table('home_design_settings', function (Blueprint $table) {
                $table->comment('홈 디자인 설정 (싱글톤)');
            });
        }

        // feat/open-in-new-tab-1.1.51 기본 게시판 필터(qna, inquiry) + 폭 1240
        DB::table('home_design_settings')->insert([
            'id' => 1,
            'enabled' => false,
            'content_max_width_px' => 1240,
            'hide_desktop_top_nav' => false,
            'hide_header_board_slugs' => json_encode(['qna', 'inquiry'], JSON_UNESCAPED_UNICODE),
            'footer_link_groups' => null,
            'business_info_enabled' => false,
            'business_company_name' => null,
            'business_representative' => null,
            'business_number' => null,
            'business_mail_order_number' => null,
            'business_address' => null,
            'business_phone' => null,
            'business_email' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('home_design_settings');
    }
};
