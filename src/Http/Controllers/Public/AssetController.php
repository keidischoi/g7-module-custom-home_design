<?php

namespace Modules\Custom\HomeDesign\Http\Controllers\Public;

use Illuminate\Http\Response;
use Illuminate\Routing\Controller;

/**
 * Serve module static assets (JS) from resources/assets.
 */
class AssetController extends Controller
{
    public function homeDesignJs(): Response
    {
        // Controllers/Public → 4 levels up = module root
        $path = dirname(__DIR__, 4).'/resources/assets/home-design.js';
        if (! is_file($path)) {
            return response('/* missing */', 200, [
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
}
