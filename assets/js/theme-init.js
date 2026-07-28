(function () {
  'use strict';

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
