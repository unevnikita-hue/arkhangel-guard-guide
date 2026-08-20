(() => {
  const form = document.querySelector('#ack-form');
  const memo = document.querySelector('#memo');
  const checkbox = document.querySelector('#acknowledged');
  const button = document.querySelector('#submit-button');
  const message = document.querySelector('#lock-message');
  const error = document.querySelector('#form-error');

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

  fetch('content/memo.html')
    .then((response) => {
      if (!response.ok) throw new Error('memo');
      return response.text();
    })
    .then((html) => {
      memo.innerHTML = html + '<div id="memo-end" class="memo-end" aria-hidden="true"></div>';
      initAlarms();
      const sentinel = document.querySelector('#memo-end');
      let unlocked = false;
      let reachedEnd = false;
      const unlock = () => {
        if (unlocked) return;
        unlocked = true;
        checkbox.disabled = false;
        message.textContent = 'Памятка просмотрена до конца. Поставьте галочку для подтверждения.';
        message.classList.add('unlocked');
      };
      const tryUnlock = () => {
        if (reachedEnd && document.body.dataset.alarmsComplete === '1') unlock();
      };
      window.addEventListener('guard-guide:alarms-complete', tryUnlock);
      const checkBottom = () => {
        if (sentinel.getBoundingClientRect().top <= window.innerHeight) {
          reachedEnd = true;
          tryUnlock();
        }
      };
      if ('IntersectionObserver' in window) {
        new IntersectionObserver((entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            reachedEnd = true;
            tryUnlock();
          }
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
