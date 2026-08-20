<?php

declare(strict_types=1);

session_start([
    'cookie_httponly' => true,
    'cookie_samesite' => 'Lax',
    'cookie_secure' => ($_SERVER['HTTPS'] ?? '') !== '' && ($_SERVER['HTTPS'] ?? '') !== 'off',
    'use_strict_mode' => true,
]);

header('Content-Type: text/html; charset=UTF-8');
header('Cache-Control: no-store');
header("Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'");
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');

$config = require dirname(__DIR__) . '/config.php';
require dirname(__DIR__) . '/src/functions.php';
date_default_timezone_set($config['timezone']);

$error = '';
$fioValue = '';
$success = $_SESSION['success'] ?? null;
unset($_SESSION['success']);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $fioValue = is_string($_POST['fio'] ?? null) ? trim($_POST['fio']) : '';
    try {
        $fio = validateAcknowledgement($_POST, $_SESSION, $config['max_fio_length']);
        unset($_SESSION['submission_id']);
        $event = createEvent($fio, $config, $_SERVER);
        appendAcknowledgement($config['storage_path'], $event);
        $_SESSION['success'] = [
            'fio' => $fio,
            'confirmed_at' => $event['confirmed_at'],
            'memo_version' => $event['memo_version'],
        ];
        header('Location: ' . strtok($_SERVER['REQUEST_URI'] ?? '/', '?'), true, 303);
        exit;
    } catch (InvalidArgumentException | RuntimeException $exception) {
        $error = $exception->getMessage();
    } catch (Throwable $exception) {
        error_log('Guard guide error: ' . $exception->getMessage());
        $error = 'Не удалось зарегистрировать ознакомление. Попробуйте позже.';
    }
}

if (!isset($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}
if (!isset($_SESSION['submission_id'])) {
    $_SESSION['submission_id'] = bin2hex(random_bytes(24));
}
?>
<!doctype html>
<html lang="ru">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Памятка охранника</title>
    <link rel="stylesheet" href="style.css">
    <script src="app.js" defer></script>
</head>
<body>
<main class="page">
<?php if (is_array($success)): ?>
    <section class="card success" aria-labelledby="success-title">
        <div class="success-mark" aria-hidden="true">✓</div>
        <p class="eyebrow">Готово</p>
        <h1 id="success-title">Ознакомление зарегистрировано</h1>
        <p>Спасибо, <strong><?= h((string) $success['fio']) ?></strong>.</p>
        <dl>
            <div><dt>Дата и время</dt><dd><?= h((new DateTimeImmutable((string) $success['confirmed_at']))->format('d.m.Y H:i')) ?></dd></div>
            <div><dt>Версия памятки</dt><dd><?= h((string) $success['memo_version']) ?></dd></div>
        </dl>
        <a class="secondary-link" href="./">Вернуться к памятке</a>
    </section>
<?php else: ?>
    <header class="hero">
        <p class="eyebrow">Архангел · сотрудникам</p>
        <h1>Памятка сотрудника, прибывающего на вахту</h1>
        <p class="lead">Перед подтверждением внимательно прочитайте памятку до конца.</p>
    </header>

    <form method="post" id="ack-form" novalidate>
        <section class="card identity">
            <label for="fio">Фамилия, имя и отчество</label>
            <input id="fio" name="fio" type="text" value="<?= h($fioValue) ?>" maxlength="180" autocomplete="name" placeholder="Введите фамилию, имя и отчество полностью" required>
            <?php if ($error !== ''): ?><p class="error" role="alert"><?= h($error) ?></p><?php endif; ?>
        </section>

        <article class="card memo" aria-label="Текст памятки">
            <?php require dirname(__DIR__) . '/content/memo.php'; ?>
            <div id="memo-end" class="memo-end" aria-hidden="true"></div>
        </article>

        <section class="card confirmation" id="confirmation" aria-live="polite">
            <p class="lock-message" id="lock-message">Прокрутите памятку до конца, чтобы открыть подтверждение.</p>
            <label class="check-row">
                <input id="acknowledged" name="acknowledged" type="checkbox" value="1" disabled required>
                <span>Я подтверждаю, что ознакомился с памяткой</span>
            </label>
            <input id="reached-bottom" name="reached_bottom" type="hidden" value="0">
            <input type="hidden" name="csrf_token" value="<?= h((string) $_SESSION['csrf_token']) ?>">
            <input type="hidden" name="submission_id" value="<?= h((string) $_SESSION['submission_id']) ?>">
            <button id="submit-button" type="submit" disabled>Подтвердить ознакомление</button>
        </section>
    </form>
<?php endif; ?>
</main>
</body>
</html>
