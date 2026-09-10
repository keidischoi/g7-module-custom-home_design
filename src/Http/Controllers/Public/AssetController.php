<?php

namespace Modules\Custom\HomeDesign\Http\Controllers\Public;

use Illuminate\Http\Response;
use Illuminate\Routing\Controller;

/**
 * Serve module static assets (JS) from resources/assets.
 *
 * Path resolution must survive both modules/custom-home_design and
 * modules/_bundled/custom-home_design installs (same bug class as cas_hero_carousel).
 */
class AssetController extends Controller
{
    public function homeDesignJs(): Response
    {
        $path = $this->resolveAssetPath('home-design.js');
        if ($path === null) {
            // Soft stub so the layout script id does not surface as a hard layout/component
            // load failure when the file is temporarily missing during deploy.
            return response('/* custom-home_design: home-design.js missing */', 200, [
                'Content-Type' => 'application/javascript; charset=UTF-8',
                'Cache-Control' => 'no-store',
            ]);
        }

        $js = (string) file_get_contents($path);

        return response($js, 200, [
            'Content-Type' => 'application/javascript; charset=UTF-8',
            'Cache-Control' => 'public, max-age=60',
        ]);
    }

    private function resolveAssetPath(string $file): ?string
    {
        $candidates = [
            // Controllers/Public → 4 levels up = module root (normal layout)
            dirname(__DIR__, 4).'/resources/assets/'.$file,
            // Defensive: some installers flatten Http nesting
            dirname(__DIR__, 3).'/resources/assets/'.$file,
        ];

        if (function_exists('base_path')) {
            $candidates[] = base_path('modules/custom-home_design/resources/assets/'.$file);
            $candidates[] = base_path('modules/_bundled/custom-home_design/resources/assets/'.$file);
        }

        foreach ($candidates as $candidate) {
            if (is_string($candidate) && is_file($candidate)) {
                return $candidate;
            }
        }

        return null;
    }
}
