(() => {
  const initAlarms = () => {
    const triggers = [...document.querySelectorAll('.alarm-trigger')];
    const dialog = document.querySelector('#alarm-dialog');
    const title = document.querySelector('#alarm-title');
    const answer = document.querySelector('#alarm-answer');
    const page = document.querySelector('main');
    if (!triggers.length || !dialog || !title || !answer) return;

    const pending = [];
    let current = null;
    let answered = 0;
    const showAlarm = (trigger) => {
      current = trigger;
      title.textContent = trigger.dataset.alarmMessage;
      answer.textContent = trigger.dataset.alarmAnswer;
      dialog.hidden = false;
      document.body.classList.add('alarm-open');
      page.inert = true;
      page.setAttribute('aria-hidden', 'true');
      answer.focus();
    };
    const showNext = () => {
      if (!current && pending.length) showAlarm(pending.shift());
    };
    const enqueue = (trigger) => {
      if (trigger.dataset.alarmSeen === '1') return;
      trigger.dataset.alarmSeen = '1';
      pending.push(trigger);
      showNext();
    };

    answer.addEventListener('click', () => {
      const completed = current;
      dialog.hidden = true;
      document.body.classList.remove('alarm-open');
      page.inert = false;
      page.removeAttribute('aria-hidden');
      current = null;
      answered += 1;
      completed?.focus({ preventScroll: true });
      if (answered === triggers.length) {
        document.body.dataset.alarmsComplete = '1';
        window.dispatchEvent(new CustomEvent('guard-guide:alarms-complete'));
      }
      showNext();
    });
    dialog.addEventListener('keydown', (event) => {
      if (event.key === 'Tab') {
        event.preventDefault();
        answer.focus();
      }
    });

    const checkAlarms = () => triggers.forEach((trigger) => {
      if (trigger.getBoundingClientRect().top < window.innerHeight * 0.8) enqueue(trigger);
    });
    window.addEventListener('scroll', checkAlarms, { passive: true });
    checkAlarms();

    if ('IntersectionObserver' in window) {
      const alarmObserver = new IntersectionObserver((entries) => {
        entries.filter((entry) => entry.isIntersecting).forEach((entry) => {
          alarmObserver.unobserve(entry.target);
          enqueue(entry.target);
        });
      }, { threshold: 0.55 });
      triggers.forEach((trigger) => alarmObserver.observe(trigger));
    }
  };

  const form = document.querySelector('#ack-form');
  if (!form) return;

  initAlarms();

  const sentinel = document.querySelector('#memo-end');
  const checkbox = document.querySelector('#acknowledged');
  const button = document.querySelector('#submit-button');
  const reachedInput = document.querySelector('#reached-bottom');
  const message = document.querySelector('#lock-message');
  let reachedEnd = false;

  const unlock = () => {
    reachedInput.value = '1';
    checkbox.disabled = false;
    message.textContent = 'Памятка просмотрена до конца. Поставьте галочку для подтверждения.';
    message.classList.add('unlocked');
  };
  const tryUnlock = () => {
    if (reachedEnd && document.body.dataset.alarmsComplete === '1') unlock();
  };
  window.addEventListener('guard-guide:alarms-complete', tryUnlock);

  let observer = null;
  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        reachedEnd = true;
        tryUnlock();
        observer.disconnect();
      }
    }, { threshold: 0.1 });
    observer.observe(sentinel);
  }

  // Простая страховка для старых/капризных мобильных WebView.
  const checkBottom = () => {
    if (sentinel.getBoundingClientRect().top <= window.innerHeight) {
      reachedEnd = true;
      tryUnlock();
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
