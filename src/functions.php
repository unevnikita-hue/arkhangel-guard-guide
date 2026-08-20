<?php

declare(strict_types=1);

function h(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function normalizeFio(mixed $value, int $maxLength): string
{
    if (!is_string($value)) {
        throw new InvalidArgumentException('Введите ФИО.');
    }

    $fio = trim(preg_replace('/\s+/u', ' ', $value) ?? '');
    if ($fio === '') {
        throw new InvalidArgumentException('Введите ФИО.');
    }
    if (mb_strlen($fio, 'UTF-8') > $maxLength) {
        throw new InvalidArgumentException('ФИО слишком длинное.');
    }

    return $fio;
}

function normalizeNamePart(mixed $value, string $label, int $maxLength): string
{
    if (!is_string($value)) {
        throw new InvalidArgumentException("Введите {$label}.");
    }
    $part = trim(preg_replace('/\s+/u', ' ', $value) ?? '');
    if ($part === '') {
        throw new InvalidArgumentException("Введите {$label}.");
    }
    if (mb_strlen($part, 'UTF-8') > $maxLength) {
        throw new InvalidArgumentException(ucfirst($label) . ' слишком длинное.');
    }
    return $part;
}

function validateAcknowledgement(array $post, array $session, int $maxFioLength): string
{
    $csrf = is_string($post['csrf_token'] ?? null) ? $post['csrf_token'] : '';
    $expectedCsrf = is_string($session['csrf_token'] ?? null) ? $session['csrf_token'] : '';
    if ($csrf === '' || $expectedCsrf === '' || !hash_equals($expectedCsrf, $csrf)) {
        throw new RuntimeException('Сессия формы устарела. Обновите страницу.');
    }

    $submission = is_string($post['submission_id'] ?? null) ? $post['submission_id'] : '';
    $expectedSubmission = is_string($session['submission_id'] ?? null) ? $session['submission_id'] : '';
    if ($submission === '' || $expectedSubmission === '' || !hash_equals($expectedSubmission, $submission)) {
        throw new RuntimeException('Форма уже отправлена или устарела. Обновите страницу.');
    }
    if (($post['reached_bottom'] ?? '') !== '1') {
        throw new InvalidArgumentException('Прокрутите памятку до конца.');
    }
    if (($post['acknowledged'] ?? '') !== '1') {
        throw new InvalidArgumentException('Подтвердите ознакомление с памяткой.');
    }
    if (($post['personal_data_consent'] ?? '') !== '1') {
        throw new InvalidArgumentException('Подтвердите согласие на обработку персональных данных.');
    }

    $fio = implode(' ', [
        normalizeNamePart($post['last_name'] ?? null, 'фамилию', 59),
        normalizeNamePart($post['first_name'] ?? null, 'имя', 59),
        normalizeNamePart($post['middle_name'] ?? null, 'отчество', 59),
    ]);
    if (mb_strlen($fio, 'UTF-8') > $maxFioLength) {
        throw new InvalidArgumentException('ФИО слишком длинное.');
    }
    return $fio;
}

function appendAcknowledgement(string $path, array $event): void
{
    $directory = dirname($path);
    if (!is_dir($directory) && !mkdir($directory, 0770, true) && !is_dir($directory)) {
        throw new RuntimeException('Не удалось создать каталог журнала.');
    }

    $lock = fopen($path . '.lock', 'c');
    if ($lock === false || !flock($lock, LOCK_EX)) {
        if (is_resource($lock)) {
            fclose($lock);
        }
        throw new RuntimeException('Не удалось заблокировать журнал.');
    }

    $temporary = null;
    try {
        $items = [];
        if (is_file($path)) {
            $raw = file_get_contents($path);
            if ($raw === false) {
                throw new RuntimeException('Не удалось прочитать журнал.');
            }
            if (trim($raw) !== '') {
                try {
                    $decoded = json_decode($raw, true, 512, JSON_THROW_ON_ERROR);
                } catch (JsonException $exception) {
                    throw new RuntimeException('Журнал повреждён; запись остановлена без изменения файла.', 0, $exception);
                }
                if (!is_array($decoded) || !array_is_list($decoded)) {
                    throw new RuntimeException('Журнал имеет неверную структуру; запись остановлена.');
                }
                $items = $decoded;
            }
        }

        $items[] = $event;
        $json = json_encode($items, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR) . "\n";
        $temporary = tempnam($directory, '.ack-');
        if ($temporary === false) {
            throw new RuntimeException('Не удалось подготовить запись журнала.');
        }
        $written = file_put_contents($temporary, $json, LOCK_EX);
        if ($written === false || $written !== strlen($json)) {
            throw new RuntimeException('Журнал записан не полностью; исходный файл сохранён.');
        }
        if (!chmod($temporary, 0660)) {
            throw new RuntimeException('Не удалось установить безопасные права журнала.');
        }
        if (!rename($temporary, $path)) {
            throw new RuntimeException('Не удалось сохранить журнал.');
        }
        $temporary = null;
    } finally {
        if (is_string($temporary) && is_file($temporary)) {
            unlink($temporary);
        }
        flock($lock, LOCK_UN);
        fclose($lock);
    }
}

function requestText(array $server, string $key, int $maxLength): string
{
    $value = isset($server[$key]) && is_string($server[$key]) ? trim($server[$key]) : '';
    return mb_substr($value, 0, $maxLength, 'UTF-8');
}

function createEvent(string $fio, array $config, array $server): array
{
    $now = new DateTimeImmutable('now', new DateTimeZone($config['timezone']));

    return [
        'id' => 'ack_' . bin2hex(random_bytes(12)),
        'fio' => $fio,
        'memo_version' => $config['memo_version'],
        'confirmed_at' => $now->format(DateTimeInterface::ATOM),
        'ip' => requestText($server, 'REMOTE_ADDR', 45),
        'user_agent' => requestText($server, 'HTTP_USER_AGENT', 500),
        'referer' => requestText($server, 'HTTP_REFERER', 1000),
        'personal_data_consent' => true,
        'status' => 'acknowledged',
    ];
}
