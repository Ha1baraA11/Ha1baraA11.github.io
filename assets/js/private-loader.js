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

  var keyName = 'page_key';
  var timestampName = 'page_ts';
  var maxAge = 120000;
  var loading = document.getElementById('loading');
  var container = document.getElementById('page-container');
  var letterListScrollY = null;

  function setStatus(message) {
    loading.replaceChildren();
    var status = document.createElement('p');
    status.textContent = message;
    loading.appendChild(status);
  }

  function returnHome(authFailed) {
    if (authFailed) {
      try {
        sessionStorage.setItem('page_error', '1');
      } catch (error) {
        // The home page will simply reopen without an error message.
      }
    }
    window.setTimeout(function () { window.location.replace('/'); }, 2000);
  }

  var key;
  var timestamp;
  try {
    key = sessionStorage.getItem(keyName);
    timestamp = sessionStorage.getItem(timestampName);
    sessionStorage.removeItem(keyName);
    sessionStorage.removeItem(timestampName);
  } catch (error) {
    window.location.replace('/');
    return;
  }

  var parsedTimestamp = Number(timestamp);
  var keyAge = Date.now() - parsedTimestamp;
  timestamp = null;
  if (!key || !/^[0-9a-f]{64}$/i.test(key) || !Number.isFinite(parsedTimestamp) || keyAge < 0 || keyAge > maxAge) {
    key = null;
    window.location.replace('/');
    return;
  }

  function clearSensitiveState() {
    key = null;
    parsedTimestamp = null;
    if (container) container.replaceChildren();
  }

  window.addEventListener('pagehide', clearSensitiveState);
  window.addEventListener('pageshow', function (event) {
    if (event.persisted) window.location.replace('/');
  });

  var iv = document.getElementById('payload-iv').textContent.trim();
  if (!iv || iv === 'PLACEHOLDER_IV') {
    setStatus('Content unavailable.');
    return;
  }

  function executeEmbeddedScripts() {
    var scripts = Array.from(container.querySelectorAll('script'));
    function executeAt(index) {
      if (index >= scripts.length) {
        document.dispatchEvent(new Event('DOMContentLoaded'));
        bindContentInteractions();
        return;
      }
      var oldScript = scripts[index];
      var source = oldScript.textContent || '';
      if (!source.trim()) {
        oldScript.remove();
        executeAt(index + 1);
        return;
      }

      var scriptUrl = URL.createObjectURL(new Blob([source], { type: 'application/javascript' }));
      var newScript = document.createElement('script');
      newScript.src = scriptUrl;
      newScript.onload = function () {
        URL.revokeObjectURL(scriptUrl);
        executeAt(index + 1);
      };
      newScript.onerror = function () {
        URL.revokeObjectURL(scriptUrl);
        setStatus('Content unavailable.');
      };
      oldScript.replaceWith(newScript);
    }
    executeAt(0);
  }

  function bindContentInteractions() {
    container.querySelectorAll('[onclick="openLetter(this)"]').forEach(function (card) {
      card.removeAttribute('onclick');
      card.addEventListener('click', function () {
        letterListScrollY = window.scrollY;
        if (typeof window.openLetter === 'function') window.openLetter(card);
      });
    });

    container.querySelectorAll('[onclick="closeLetter()"]').forEach(function (trigger) {
      trigger.removeAttribute('onclick');
      trigger.addEventListener('click', function () {
        if (typeof window.closeLetter === 'function') window.closeLetter();
        if (letterListScrollY === null) return;

        var scrollY = letterListScrollY;
        letterListScrollY = null;
        window.requestAnimationFrame(function () {
          window.scrollTo(0, scrollY);
        });
      });
    });
  }

  function hexToBytes(hex) {
    var bytes = new Uint8Array(hex.length / 2);
    for (var i = 0; i < bytes.length; i += 1) bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
    return bytes;
  }

  function base64ToBytes(value) {
    var binary = atob(value);
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  async function startProcessing(hexKey, ciphertext, ivValue) {
    var result;
    var keyBytes;
    try {
      keyBytes = hexToBytes(hexKey);
      hexKey = null;
      var aesKey = await crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['decrypt']);
      keyBytes.fill(0);
      var plain = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: base64ToBytes(ivValue) }, aesKey, base64ToBytes(ciphertext)
      );
      result = new Uint8Array(plain);
    } catch (error) {
      if (keyBytes) keyBytes.fill(0);
      setStatus('Password could not unlock this content.');
      returnHome(true);
      return;
    }

    try {
      if (result[0] === 0x50 && result[1] === 0x4b && result[2] === 0x30 && result[3] === 0x31) {
        if (!window.pako) throw new Error('decompressor');
        result = window.pako.ungzip(result.slice(4));
      }
      var decodedContent = new TextDecoder().decode(result);
      result.fill(0);
      loading.hidden = true;
      container.innerHTML = decodedContent;
      decodedContent = null;
      executeEmbeddedScripts();
    } catch (error) {
      if (result) result.fill(0);
      setStatus('Content unavailable.');
      returnHome(false);
    }
  }

  fetch('/p/k7x9m2/data.bin', { cache: 'no-store' })
    .then(function (response) {
      if (!response.ok) throw new Error('load');
      return response.text();
    })
    .then(function (ciphertext) {
      if (!ciphertext || ciphertext.length < 10) {
        setStatus('Content unavailable.');
        return;
      }
      startProcessing(key, ciphertext, iv);
      key = null;
    })
    .catch(function () {
      setStatus('Failed to load content.');
      returnHome(false);
    });
})();
