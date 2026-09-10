<?php

namespace Modules\Custom\HomeDesign;

use App\Extension\AbstractModule;

/**
 * 홈 디자인 모듈
 *
 * 공식 sirsoft-basic 기준 메뉴 위치·아이콘·홈 화면 디자인을
 * Event Hook / Layout Extensions로 제공한다. (테마 직접 수정 없음)
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
                        'ko' => '홈 메뉴·아이콘·레이아웃 설정',
                        'en' => 'Configure home menu, icons, and layout',
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
        return [];
    }

    /**
     * @return array<int, class-string>
     */
    public function getHookListeners(): array
    {
        return [];
    }
}
