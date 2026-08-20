(() => {
  const form = document.querySelector('#ack-form');
  if (!form) return;

  const sentinel = document.querySelector('#memo-end');
  const checkbox = document.querySelector('#acknowledged');
  const button = document.querySelector('#submit-button');
  const reachedInput = document.querySelector('#reached-bottom');
  const message = document.querySelector('#lock-message');

  const unlock = () => {
    reachedInput.value = '1';
    checkbox.disabled = false;
    message.textContent = 'Памятка просмотрена до конца. Поставьте галочку для подтверждения.';
    message.classList.add('unlocked');
  };

  let observer = null;
  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        unlock();
        observer.disconnect();
      }
    }, { threshold: 0.1 });
    observer.observe(sentinel);
  }

  // Простая страховка для старых/капризных мобильных WebView.
  const checkBottom = () => {
    if (sentinel.getBoundingClientRect().top <= window.innerHeight) {
      unlock();
      observer?.disconnect();
      window.removeEventListener('scroll', checkBottom);
    }
  };
  window.addEventListener('scroll', checkBottom, { passive: true });
  checkBottom();

  checkbox.addEventListener('change', () => {
    button.disabled = !checkbox.checked;
  });

  form.addEventListener('submit', () => {
    button.disabled = true;
    button.textContent = 'Сохраняем…';
  });
})();
