(function () {
  'use strict';

  var keyName = 'page_key';
  var timestampName = 'page_ts';
  var maxAge = 120000;
  var loading = document.getElementById('loading');
  var container = document.getElementById('page-container');

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

  if (!key || !timestamp || (Date.now() - Number(timestamp)) > maxAge) {
    window.location.replace('/');
    return;
  }

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
        if (typeof window.openLetter === 'function') window.openLetter(card);
      });
    });

    container.querySelectorAll('[onclick="closeLetter()"]').forEach(function (trigger) {
      trigger.removeAttribute('onclick');
      trigger.addEventListener('click', function () {
        if (typeof window.closeLetter === 'function') window.closeLetter();
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
    try {
      var aesKey = await crypto.subtle.importKey('raw', hexToBytes(hexKey), { name: 'AES-GCM' }, false, ['decrypt']);
      var plain = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: base64ToBytes(ivValue) }, aesKey, base64ToBytes(ciphertext)
      );
      result = new Uint8Array(plain);
    } catch (error) {
      setStatus('Password could not unlock this content.');
      returnHome(true);
      return;
    }

    try {
      if (result[0] === 0x50 && result[1] === 0x4b && result[2] === 0x30 && result[3] === 0x31) {
        if (!window.pako) throw new Error('decompressor');
        result = window.pako.ungzip(result.slice(4));
      }
      loading.hidden = true;
      container.innerHTML = new TextDecoder().decode(result);
      executeEmbeddedScripts();
    } catch (error) {
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
    })
    .catch(function () {
      setStatus('Failed to load content.');
      returnHome(false);
    });
})();
