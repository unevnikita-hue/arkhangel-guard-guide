<?php

declare(strict_types=1);

require dirname(__DIR__) . '/src/functions.php';

$failures = 0;
function check(bool $condition, string $message): void { global $failures; if (!$condition) { $failures++; fwrite(STDERR, "FAIL: {$message}\n"); } }
function rejects(callable $callback, string $message): void { try { $callback(); check(false, $message); } catch (Throwable) { check(true, $message); } }

$session = ['csrf_token' => 'csrf', 'submission_id' => 'once'];
$valid = ['csrf_token' => 'csrf', 'submission_id' => 'once', 'fio' => '  Иванов   Иван Иванович  ', 'reached_bottom' => '1', 'acknowledged' => '1'];
check(validateAcknowledgement($valid, $session, 180) === 'Иванов Иван Иванович', 'ФИО очищается');
rejects(fn() => validateAcknowledgement(array_replace($valid, ['fio' => '']), $session, 180), 'пустое ФИО отклоняется');
rejects(fn() => validateAcknowledgement(array_diff_key($valid, ['acknowledged' => true]), $session, 180), 'нет checkbox');
rejects(fn() => validateAcknowledgement(array_replace($valid, ['reached_bottom' => '0']), $session, 180), 'нет прокрутки');
rejects(fn() => validateAcknowledgement(array_replace($valid, ['csrf_token' => 'bad']), $session, 180), 'неверный CSRF');

$directory = sys_get_temp_dir() . '/guard-guide-' . bin2hex(random_bytes(5));
$path = $directory . '/acknowledgements.json';
$first = ['id' => 'ack_1', 'fio' => '<Иванов & "Иван">'];
$second = ['id' => 'ack_2', 'fio' => 'Петров Пётр'];
appendAcknowledgement($path, $first);
appendAcknowledgement($path, $second);
$items = json_decode((string) file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);
check(count($items) === 2, 'старые записи не перезаписываются');
check($items[0]['fio'] === $first['fio'], 'UTF-8 и спецсимволы сохраняются');

file_put_contents($path, '{broken');
rejects(fn() => appendAcknowledgement($path, ['id' => 'ack_3']), 'повреждённый JSON отклоняется');
check(file_get_contents($path) === '{broken', 'повреждённый JSON не уничтожается');

@unlink($path); @unlink($path . '.lock'); @rmdir($directory);
if ($failures > 0) { exit(1); }
fwrite(STDOUT, "OK: все проверки пройдены\n");
