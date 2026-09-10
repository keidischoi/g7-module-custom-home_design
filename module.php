<?php

namespace Modules\Custom\HomeDesign;

use App\Extension\AbstractModule;

/**
 * 홈 디자인 모듈
 *
 * 공식 gnuboard sirsoft-basic 기준 메뉴·콘텐츠 폭·푸터 사업자 고지를
 * Event Hook / Layout Extensions / 주입 JS 로 제공한다. (테마 파일 수정 없음)
 *
 * 참고: keidischoi/g7-template-sirsoft-basic feat/open-in-new-tab-1.1.51 의
 * Header/Footer 레이아웃 차이(게시판 필터, businessInfo, linkGroups, 폭)를
 * 공식 테마 컴포넌트에 의존하지 않는 방식으로 이식한다.
 * 광고 배너는 custom-ad_slots 모듈을 사용한다.
 */
class Module extends AbstractModule
{
    /**
     * @return array<int, array<string, mixed>>
     */
    public function getRoles(): array
    {
        return [];
    }

    /**
     * @return array<string, mixed>
     */
    public function getPermissions(): array
    {
        return [
            'name' => [
                'ko' => '홈 디자인',
                'en' => 'Home Design',
            ],
            'description' => [
                'ko' => '홈 디자인 모듈 권한',
                'en' => 'Home design module permissions',
            ],
            'categories' => [
                [
                    'identifier' => 'design',
                    'resource_route_key' => null,
                    'owner_key' => null,
                    'name' => [
                        'ko' => '홈 디자인',
                        'en' => 'Home Design',
                    ],
                    'description' => [
                        'ko' => '홈 메뉴·레이아웃·사업자 고지 설정',
                        'en' => 'Configure home menu, layout, and business notice',
                    ],
                    'permissions' => [
                        [
                            'action' => 'read',
                            'name' => [
                                'ko' => '설정 조회',
                                'en' => 'View settings',
                            ],
                            'description' => [
                                'ko' => '홈 디자인 설정 조회',
                                'en' => 'View home design settings',
                            ],
                            'type' => 'admin',
                            'roles' => ['admin', 'manager'],
                        ],
                        [
                            'action' => 'update',
                            'name' => [
                                'ko' => '설정 수정',
                                'en' => 'Update settings',
                            ],
                            'description' => [
                                'ko' => '홈 디자인 설정 수정',
                                'en' => 'Update home design settings',
                            ],
                            'type' => 'admin',
                            'roles' => ['admin', 'manager'],
                        ],
                    ],
                ],
            ],
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function getAdminMenus(): array
    {
        return [
            [
                'name' => [
                    'ko' => '홈 디자인',
                    'en' => 'Home Design',
                ],
                'slug' => 'custom-home_design',
                'url' => '/admin/home-design',
                'icon' => 'fas fa-home',
                'order' => 81,
                'permission' => 'custom-home_design.design.read',
            ],
        ];
    }


    /**
     * Explicit routes map (belt-and-suspenders with AbstractModule auto-detect).
     * Ensures src/routes/api.php is registered when the module is installed.
     *
     * @return array<string, string>
     */
    public function getRoutes(): array
    {
        $api = $this->getModulePath().'/src/routes/api.php';
        $routes = [];
        if (is_file($api)) {
            $routes['api'] = $api;
        }

        return $routes;
    }

    /**
     * @return array<int, class-string>
     */
    public function getHookListeners(): array
    {
        return [
            \Modules\Custom\HomeDesign\Listeners\HomeDesignLayoutListener::class,
        ];
    }
}
