(function () {
  'use strict';

  var lang = 'en';
  try {
    if (localStorage.getItem('lang') === 'zh') lang = 'zh';
  } catch (error) {
    // English is the static fallback when storage is unavailable.
  }

  document.documentElement.setAttribute('lang', lang === 'zh' ? 'zh-CN' : 'en');
  document.querySelectorAll('[data-' + lang + ']').forEach(function (element) {
    element.innerHTML = element.getAttribute('data-' + lang);
  });
  document.dispatchEvent(new CustomEvent('site:languagechange', { detail: { lang: lang } }));

  var progress = document.getElementById('reading-progress');
  if (!progress) return;

  var scheduled = false;
  function updateProgress() {
    var height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    var percent = height ? Math.min(100, Math.max(0, (window.scrollY / height) * 100)) : 0;
    progress.style.transform = 'translate(' + (-100 + percent) + 'vw,0)';
    scheduled = false;
  }

  window.addEventListener('scroll', function () {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(updateProgress);
  }, { passive: true });
})();
