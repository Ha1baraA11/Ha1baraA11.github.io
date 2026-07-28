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
      if (index >= scripts.length) return;
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

  function startProcessing(hexKey, ciphertext, ivValue) {
    var workerSource = [
      'self.onmessage = async function(event) {',
      '  function hexToBytes(hex) {',
      '    var bytes = new Uint8Array(hex.length / 2);',
      '    for (var i = 0; i < bytes.length; i += 1) bytes[i] = parseInt(hex.substr(i * 2, 2), 16);',
      '    return bytes;',
      '  }',
      '  function base64ToBytes(value) {',
      '    var binary = atob(value);',
      '    var bytes = new Uint8Array(binary.length);',
      '    for (var i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);',
      '    return bytes;',
      '  }',
      '  try {',
      '    var aesKey = await crypto.subtle.importKey("raw", hexToBytes(event.data.key), { name: "AES-GCM" }, false, ["decrypt"]);',
      '    var plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: base64ToBytes(event.data.iv) }, aesKey, base64ToBytes(event.data.ciphertext));',
      '    var result = new Uint8Array(plain);',
      '    if (result[0] === 0x50 && result[1] === 0x4b && result[2] === 0x30 && result[3] === 0x31) {',
      '      importScripts("/assets/js/pako.min.js");',
      '      result = pako.ungzip(result.slice(4));',
      '    }',
      '    self.postMessage({ ok: true, html: new TextDecoder().decode(result) });',
      '  } catch (error) {',
      '    self.postMessage({ ok: false });',
      '  }',
      '};'
    ].join('\n');

    var workerUrl = URL.createObjectURL(new Blob([workerSource], { type: 'application/javascript' }));
    var worker = new Worker(workerUrl);
    URL.revokeObjectURL(workerUrl);

    worker.onmessage = function (event) {
      worker.terminate();
      if (!event.data.ok) {
        setStatus('Processing failed.');
        returnHome(true);
        return;
      }
      loading.hidden = true;
      container.innerHTML = event.data.html;
      executeEmbeddedScripts();
    };

    worker.onerror = function () {
      worker.terminate();
      setStatus('Processing failed.');
      returnHome(true);
    };

    worker.postMessage({ key: hexKey, ciphertext: ciphertext, iv: ivValue });
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
