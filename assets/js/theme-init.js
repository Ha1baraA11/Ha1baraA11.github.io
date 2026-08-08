(function () {
  'use strict';

  if (window.top !== window.self) {
    document.documentElement.classList.add('frame-blocked');
    try {
      window.top.location.replace(window.self.location.href);
    } catch (error) {
      // Sandboxed cross-origin frames remain blank.
    }
    return;
  }

  document.documentElement.classList.add('js');
  try {
    var theme = localStorage.getItem('theme');
    if (theme === 'light') document.documentElement.setAttribute('data-theme', 'light');
    if (localStorage.getItem('lang') === 'zh') {
      document.documentElement.setAttribute('lang', 'zh-CN');
    }
  } catch (error) {
    // Storage can be unavailable in strict privacy modes; static defaults remain.
  }

})();
