<?php

namespace Modules\Custom\HomeDesign\Http\Controllers\Admin;

use App\Http\Controllers\Api\Base\AdminBaseController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;
use Modules\Custom\HomeDesign\Services\FaviconUploadService;

class FaviconUploadController extends AdminBaseController
{
    public function __construct(
        private FaviconUploadService $uploadService,
    ) {
        parent::__construct();
    }

    public function formDefaults(Request $request): JsonResponse
    {
        return $this->success('custom-home_design::messages.upload.success', [
            'upload_token' => (string) Str::uuid(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        try {
            $file = $this->resolveFile($request);
            if (! $file instanceof UploadedFile) {
                return $this->error('custom-home_design::messages.upload.file_required', 422);
            }

            $payload = $this->uploadService->storeImage($file);

            return response()->json([
                'success' => true,
                'message' => __('custom-home_design::messages.upload.success'),
                'data' => [
                    'data' => $payload,
                    'download_url' => $payload['download_url'] ?? null,
                    'url' => $payload['url'] ?? null,
                    'path' => $payload['path'] ?? null,
                    'id' => $payload['id'] ?? null,
                    'persisted' => $payload['persisted'] ?? true,
                    'favicon_url' => $payload['favicon_url'] ?? ($payload['url'] ?? null),
                ],
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            throw $e;
        } catch (\Exception $e) {
            return $this->error('custom-home_design::messages.upload.failed', 500, $e->getMessage());
        }
    }

    public function destroy(Request $request, int|string $uploadId): JsonResponse
    {
        try {
            $result = $this->uploadService->deleteByUploadId($uploadId);

            return $this->success('custom-home_design::messages.upload.delete_success', [
                'data' => true,
                'id' => $result['id'],
                'deleted' => $result['deleted'],
                'path' => $result['path'],
            ]);
        } catch (\Exception $e) {
            return $this->success('custom-home_design::messages.upload.delete_success', [
                'data' => true,
                'id' => (string) $uploadId,
                'deleted' => false,
                'error' => $e->getMessage(),
            ]);
        }
    }

    private function resolveFile(Request $request): ?UploadedFile
    {
        foreach (['file', 'image', 'upload', 'favicon', 'favicon_url'] as $key) {
            $file = $request->file($key);
            if ($file instanceof UploadedFile) {
                return $file;
            }
            if (is_array($file)) {
                foreach ($file as $item) {
                    if ($item instanceof UploadedFile) {
                        return $item;
                    }
                }
            }
        }
        $files = $request->file('files');
        if ($files instanceof UploadedFile) {
            return $files;
        }
        if (is_array($files)) {
            foreach ($files as $item) {
                if ($item instanceof UploadedFile) {
                    return $item;
                }
            }
        }

        return null;
    }
}
