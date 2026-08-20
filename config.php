<?php

declare(strict_types=1);

return [
    // Меняйте версию после каждого существенного изменения content/memo.html.
    'memo_version' => '2026-08-20-01',
    'timezone' => 'Europe/Moscow',
    'storage_path' => getenv('GUARD_GUIDE_STORAGE_PATH') ?: __DIR__ . '/storage/acknowledgements.json',
    'max_fio_length' => 180,
];
