<?php

namespace Modules\Custom\HomeDesign\Services;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Modules\Custom\HomeDesign\Models\HomeDesignSetting;

class FaviconUploadService
{
    private const DIR = 'custom-home_design/favicon';

    public function storeImage(UploadedFile $file): array
    {
        $ext = strtolower((string) ($file->getClientOriginalExtension() ?: $file->extension() ?: 'png'));
        $allowed = ['ico', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'];
        if (! in_array($ext, $allowed, true)) {
            $ext = 'png';
        }
        $hash = (string) Str::uuid();
        $storedFilename = $hash.'.'.$ext;
        $relative = self::DIR.'/'.$storedFilename;

        $contents = file_get_contents($file->getRealPath());
        if ($contents === false) {
            throw new \RuntimeException('Failed to read uploaded file.');
        }

        $url = $this->putAndUrl($relative, $contents);
        $size = (int) $file->getSize();
        $mime = (string) ($file->getMimeType() ?: 'image/png');
        $original = (string) $file->getClientOriginalName();

        return [
            'id' => self::encodeId($relative),
            'hash' => $hash,
            'original_filename' => $original,
            'name' => $original,
            'mime_type' => $mime,
            'size' => $size,
            'size_formatted' => $this->formatBytes($size),
            'download_url' => $url,
            'url' => $url,
            'thumbnail_url' => $url,
            'order' => 0,
            'is_image' => true,
            'uploaded' => true,
            'path' => $relative,
        ];
    }

    public function ensureColumn(): bool
    {
        try {
            if (! Schema::hasTable('home_design_settings')) {
                return false;
            }
            if (Schema::hasColumn('home_design_settings', 'favicon_url')) {
                return true;
            }
            Schema::table('home_design_settings', function (Blueprint $table) {
                $table->string('favicon_url', 1024)->nullable();
            });

            return Schema::hasColumn('home_design_settings', 'favicon_url');
        } catch (\Throwable) {
            return false;
        }
    }

    public function persistSettingUrl(string $url): void
    {
        if (! $this->ensureColumn()) {
            return;
        }

        try {
            $exists = DB::table('home_design_settings')
                ->where('id', HomeDesignSetting::SINGLETON_ID)
                ->exists();
            if ($exists) {
                DB::table('home_design_settings')
                    ->where('id', HomeDesignSetting::SINGLETON_ID)
                    ->update(['favicon_url' => $url, 'updated_at' => now()]);
            }
        } catch (\Throwable) {
        }
    }

    public function deleteByUploadId(int|string $uploadId): array
    {
        $raw = trim(urldecode((string) $uploadId));
        if ($raw === '' || strcasecmp($raw, 'noop') === 0) {
            return ['id' => $raw !== '' ? $raw : 'noop', 'deleted' => false, 'path' => null];
        }

        $path = self::decodeId($raw);
        if ($path === null || ! str_starts_with($path, self::DIR.'/')) {
            return ['id' => $raw, 'deleted' => false, 'path' => null];
        }

        $deleted = false;
        try {
            if (Storage::disk('public')->exists($path)) {
                $deleted = Storage::disk('public')->delete($path);
            }
        } catch (\Throwable) {
            $deleted = false;
        }

        return ['id' => $raw, 'deleted' => $deleted, 'path' => $path];
    }

    public static function uploaderFilesFromUrl(?string $url): array
    {
        if (! is_string($url) || trim($url) === '') {
            return [];
        }

        $url = trim($url);
        $path = null;
        if (preg_match('#(custom-home_design/favicon/[A-Za-z0-9._-]+)#', $url, $m)) {
            $path = $m[1];
        }

        $id = $path !== null
            ? self::encodeId($path)
            : ('ext-'.substr(hash('sha256', $url), 0, 16));
        $name = $path !== null ? basename($path) : 'favicon';

        return [[
            'id' => $id,
            'hash' => $path !== null ? pathinfo($path, PATHINFO_FILENAME) : $id,
            'original_filename' => $name,
            'name' => $name,
            'mime_type' => 'image/*',
            'size' => 0,
            'size_formatted' => '',
            'download_url' => $url,
            'url' => $url,
            'thumbnail_url' => $url,
            'order' => 0,
            'is_image' => true,
            'uploaded' => true,
            'path' => $path,
        ]];
    }

    public static function encodeId(string $relativePath): string
    {
        return rtrim(strtr(base64_encode($relativePath), '+/', '-_'), '=');
    }

    public static function decodeId(string $uploadId): ?string
    {
        $pad = strlen($uploadId) % 4;
        if ($pad > 0) {
            $uploadId .= str_repeat('=', 4 - $pad);
        }
        $decoded = base64_decode(strtr($uploadId, '-_', '+/'), true);
        if (! is_string($decoded) || $decoded === '') {
            return null;
        }

        return $decoded;
    }

    private function putAndUrl(string $relative, string $contents): string
    {
        Storage::disk('public')->put($relative, $contents);

        try {
            $url = Storage::disk('public')->url($relative);
            if (is_string($url) && $url !== '') {
                return $url;
            }
        } catch (\Throwable) {
        }

        return '/storage/'.$relative;
    }

    private function formatBytes(int $bytes): string
    {
        if ($bytes < 1024) {
            return $bytes.' B';
        }
        if ($bytes < 1048576) {
            return round($bytes / 1024, 1).' KB';
        }

        return round($bytes / 1048576, 1).' MB';
    }
}
