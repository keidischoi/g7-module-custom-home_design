<?php

namespace Modules\Custom\HomeDesign\Http\Controllers\Admin;

use App\Http\Controllers\Api\Base\AdminBaseController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Custom\HomeDesign\Services\FaviconUploadService;

class FaviconUploadController extends AdminBaseController
{
    public function __construct(
        private FaviconUploadService $uploadService,
    ) {
        parent::__construct();
    }

    public function store(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'file' => ['required_without:image', 'file', 'mimes:ico,png,jpg,jpeg,gif,webp,svg', 'max:2048'],
                'image' => ['required_without:file', 'file', 'mimes:ico,png,jpg,jpeg,gif,webp,svg', 'max:2048'],
            ]);

            $file = $request->file('file') ?: $request->file('image');
            if ($file === null) {
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
}
