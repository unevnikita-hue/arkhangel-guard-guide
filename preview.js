(() => {
  const form = document.querySelector('#ack-form');
  const memo = document.querySelector('#memo');
  const checkbox = document.querySelector('#acknowledged');
  const button = document.querySelector('#submit-button');
  const message = document.querySelector('#lock-message');
  const error = document.querySelector('#form-error');

  fetch('content/memo.html')
    .then((response) => {
      if (!response.ok) throw new Error('memo');
      return response.text();
    })
    .then((html) => {
      memo.innerHTML = html + '<div id="memo-end" class="memo-end" aria-hidden="true"></div>';
      const sentinel = document.querySelector('#memo-end');
      let unlocked = false;
      const unlock = () => {
        if (unlocked) return;
        unlocked = true;
        checkbox.disabled = false;
        message.textContent = 'Памятка просмотрена до конца. Поставьте галочку для подтверждения.';
        message.classList.add('unlocked');
      };
      const checkBottom = () => {
        if (sentinel.getBoundingClientRect().top <= window.innerHeight) unlock();
      };
      if ('IntersectionObserver' in window) {
        new IntersectionObserver((entries) => {
          if (entries.some((entry) => entry.isIntersecting)) unlock();
        }, { threshold: 0.1 }).observe(sentinel);
      }
      window.addEventListener('scroll', checkBottom, { passive: true });
      checkBottom();
    })
    .catch(() => {
      memo.innerHTML = '<p class="error">Не удалось загрузить памятку.</p>';
    });

  checkbox.addEventListener('change', () => {
    button.disabled = !checkbox.checked;
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const fio = document.querySelector('#fio').value.trim().replace(/\s+/g, ' ');
    if (!fio) {
      error.textContent = 'Введите ФИО.';
      error.hidden = false;
      document.querySelector('#fio').focus();
      return;
    }
    error.hidden = true;
    form.hidden = true;
    document.querySelector('.hero').hidden = true;
    document.querySelector('#success-fio').textContent = fio;
    document.querySelector('#success-time').textContent = new Intl.DateTimeFormat('ru-RU', { dateStyle: 'short', timeStyle: 'short' }).format(new Date());
    document.querySelector('#success').hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
})();
