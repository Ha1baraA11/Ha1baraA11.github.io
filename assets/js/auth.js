(function () {
  'use strict';

  var SALT_HEX = '15f1ae5a6c02386a8e75a1643b0e5248';
  var VERIFIER = 'e8818adc2fd6767b32b4b27bdf623a45f304d5d88f441e6f8cd4884cb362ec1a';
  var PBKDF2_ITERATIONS = 100000;

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

  function b64ToBytes(b64) {
    var bin = atob(b64);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
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

  async function verify(password) {
    var rawKey = await deriveRawKey(password);
    var hash = await crypto.subtle.digest('SHA-256', rawKey);
    return bytesToHex(new Uint8Array(hash)) === VERIFIER;
  }

  async function deriveKeyHex(password) {
    var rawKey = await deriveRawKey(password);
    return bytesToHex(rawKey);
  }

  async function verifyAndDeriveHex(password) {
    var rawKey = await deriveRawKey(password);
    var hash = await crypto.subtle.digest('SHA-256', rawKey);
    var ok = bytesToHex(new Uint8Array(hash)) === VERIFIER;
    return { ok: ok, hexKey: ok ? bytesToHex(rawKey) : null };
  }

  window.LettersAuth = {
    verify: verify,
    deriveKeyHex: deriveKeyHex,
    verifyAndDeriveHex: verifyAndDeriveHex
  };
})();
