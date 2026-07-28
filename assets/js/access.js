(function () {
  'use strict';

  var SALT_HEX = 'b5ccd7af17b33c7b40e2a8c08f410a91';
  var PBKDF2_ITERATIONS = 600000;

  function hexToBytes(hex) {
    var bytes = new Uint8Array(hex.length / 2);
    for (var i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
    }
    return bytes;
  }

  function bytesToHex(bytes) {
    return Array.from(bytes).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
  }

  async function deriveRawKey(password) {
    var enc = new TextEncoder();
    var keyMaterial = await crypto.subtle.importKey(
      'raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']
    );
    var bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt: hexToBytes(SALT_HEX), iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
      keyMaterial, 256
    );
    return new Uint8Array(bits);
  }

  async function deriveKeyHex(password) {
    var rawKey = await deriveRawKey(password);
    return bytesToHex(rawKey);
  }

  window.AccessAuth = {
    deriveKeyHex: deriveKeyHex
  };
})();
