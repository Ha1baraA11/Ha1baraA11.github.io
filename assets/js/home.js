(function () {
  'use strict';

  var langToggle = document.querySelector('.lang-toggle');
  var tagline = document.getElementById('tagline');
  var taglineTexts = {
    en: 'A personal blog about code, AI, and building things.',
    zh: '一个关于代码、AI 与创造的个人博客。'
  };
  var currentLang = 'en';

  try {
    if (localStorage.getItem('lang') === 'zh') currentLang = 'zh';
  } catch (error) {
    // English is the static fallback when storage is unavailable.
  }

  function applyLanguage(lang) {
    document.documentElement.setAttribute('lang', lang === 'zh' ? 'zh-CN' : 'en');
    document.querySelectorAll('[data-' + lang + ']').forEach(function (element) {
      element.innerHTML = element.getAttribute('data-' + lang);
    });
    langToggle.setAttribute('aria-label', lang === 'zh' ? '切换到英文' : 'Switch to Chinese');

    tagline.textContent = '';
    var text = taglineTexts[lang];
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      tagline.textContent = text;
      return;
    }

    var index = 0;
    var cursor = document.createElement('span');
    cursor.className = 'typing-cursor';
    tagline.appendChild(cursor);

    function typeNextCharacter() {
      if (index >= text.length) return;
      tagline.insertBefore(document.createTextNode(text.charAt(index)), cursor);
      index += 1;
      window.setTimeout(typeNextCharacter, 55);
    }

    window.setTimeout(typeNextCharacter, 200);
  }

  applyLanguage(currentLang);
  langToggle.addEventListener('click', function () {
    currentLang = currentLang === 'en' ? 'zh' : 'en';
    try {
      localStorage.setItem('lang', currentLang);
    } catch (error) {
      // The active page can still switch even when storage is unavailable.
    }
    applyLanguage(currentLang);
    updateThemeToggle();
  });

  var themeToggle = document.getElementById('theme-toggle');
  var root = document.documentElement;

  function updateThemeToggle() {
    var isLight = root.getAttribute('data-theme') === 'light';
    var label;
    if (currentLang === 'zh') {
      label = isLight ? '使用深色主题' : '使用浅色主题';
    } else {
      label = isLight ? 'Use dark theme' : 'Use light theme';
    }
    themeToggle.setAttribute('aria-label', label);
    themeToggle.setAttribute('aria-pressed', isLight ? 'true' : 'false');
  }

  updateThemeToggle();
  themeToggle.addEventListener('click', function () {
    var useLight = root.getAttribute('data-theme') !== 'light';
    if (useLight) {
      root.setAttribute('data-theme', 'light');
    } else {
      root.removeAttribute('data-theme');
    }

    try {
      if (useLight) localStorage.setItem('theme', 'light');
      else localStorage.removeItem('theme');
    } catch (error) {
      // The active page can still switch even when storage is unavailable.
    }
    updateThemeToggle();
  });

  var fadeTargets = document.querySelectorAll('.fade-in');
  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.1 });
    fadeTargets.forEach(function (target) { observer.observe(target); });
  } else {
    fadeTargets.forEach(function (target) { target.classList.add('visible'); });
  }

  var progress = document.getElementById('reading-progress');
  var progressScheduled = false;
  function updateProgress() {
    var height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    var percent = height ? Math.min(100, Math.max(0, (window.scrollY / height) * 100)) : 0;
    progress.style.transform = 'translate(' + (-100 + percent) + 'vw,0)';
    progressScheduled = false;
  }
  window.addEventListener('scroll', function () {
    if (progressScheduled) return;
    progressScheduled = true;
    window.requestAnimationFrame(updateProgress);
  }, { passive: true });

  var modal = document.getElementById('auth-modal');
  var input = document.getElementById('auth-password');
  var submitButton = document.getElementById('auth-submit');
  var errorMessage = document.getElementById('auth-error');
  var trigger = document.getElementById('hero-title-container');
  var submitting = false;

  function showError(message) {
    errorMessage.textContent = message;
    errorMessage.hidden = false;
    input.classList.add('shake');
    window.setTimeout(function () { input.classList.remove('shake'); }, 400);
  }

  function showAuthModal(message) {
    if (modal.open) return;
    errorMessage.hidden = true;
    input.value = '';
    input.disabled = false;
    submitButton.disabled = false;
    submitting = false;
    modal.showModal();
    input.focus();
    if (message) showError(message);
  }

  function hideAuthModal() {
    if (submitting) return;
    if (modal.open) modal.close();
    input.value = '';
    errorMessage.hidden = true;
    trigger.focus();
  }

  async function submitPassword() {
    if (submitting || !input.value) return;
    submitting = true;
    input.disabled = true;
    submitButton.disabled = true;

    try {
      var key = await window.AccessAuth.deriveKeyHex(input.value);
      sessionStorage.setItem('page_key', key);
      sessionStorage.setItem('page_ts', Date.now().toString());
      window.location.href = '/p/k7x9m2/?v=4';
    } catch (error) {
      showError('Something went wrong');
      window.setTimeout(function () {
        input.disabled = false;
        submitButton.disabled = false;
        submitting = false;
        input.focus();
      }, 2000);
    }
  }

  input.addEventListener('keydown', function (event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      submitPassword();
    }
    if (event.key === 'Escape') hideAuthModal();
  });
  submitButton.addEventListener('click', submitPassword);
  modal.addEventListener('click', function (event) {
    if (event.target === modal) hideAuthModal();
  });
  modal.addEventListener('cancel', function (event) {
    if (submitting) {
      event.preventDefault();
      return;
    }
    hideAuthModal();
  });

  var holdTimer = null;
  function startHold(event) {
    event.preventDefault();
    trigger.classList.add('hero-pressing');
    holdTimer = window.setTimeout(function () {
      holdTimer = null;
      trigger.classList.remove('hero-pressing');
      showAuthModal();
    }, 800);
  }
  function cancelHold() {
    if (holdTimer) window.clearTimeout(holdTimer);
    holdTimer = null;
    trigger.classList.remove('hero-pressing');
  }

  trigger.addEventListener('pointerdown', startHold);
  trigger.addEventListener('pointerup', cancelHold);
  trigger.addEventListener('pointerleave', cancelHold);
  trigger.addEventListener('pointercancel', cancelHold);
  trigger.addEventListener('contextmenu', function (event) { event.preventDefault(); });
  trigger.addEventListener('keydown', function (event) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    cancelHold();
    showAuthModal();
  });

  try {
    if (sessionStorage.getItem('page_error') === '1') {
      sessionStorage.removeItem('page_error');
      showAuthModal('Wrong password');
    }
  } catch (error) {
    // Session storage is required only for the optional protected page.
  }
})();
