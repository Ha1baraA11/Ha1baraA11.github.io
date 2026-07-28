(function () {
  'use strict';

  document.documentElement.classList.add('js');
  try {
    var theme = localStorage.getItem('theme');
    if (theme === 'light') document.documentElement.setAttribute('data-theme', 'light');
  } catch (error) {
    // Storage can be unavailable in strict privacy modes; dark-first remains the fallback.
  }

})();
