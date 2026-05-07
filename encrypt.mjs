#!/usr/bin/env node

/**
 * encrypt.mjs — Content encryption helper for the hidden letters page.
 *
 * Usage:
 *   First init:   node encrypt.mjs --init --input letter.html --password "xxx"
 *   Update:       node encrypt.mjs --input letter.html --password "xxx"
 *
 * Reads existing SALT from auth.js (unless --init), generates fresh IV each run,
 * compresses with gzip, encrypts with AES-256-GCM, verifies, and outputs values.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { randomBytes, createHash, pbkdf2Sync, webcrypto } from 'node:crypto';
import { gzipSync, gunzipSync } from 'node:zlib';

const AES_GCM = 'AES-GCM';
const PBKDF2_ITERATIONS = 100000;
const AUTH_JS_PATH = new URL('./assets/js/auth.js', import.meta.url).pathname;
const DATA_BIN_PATH = new URL('./letters/k7x9m2/data.bin', import.meta.url).pathname;
const MAGIC = Buffer.from('PK01');

// ---- Args ----

const args = process.argv.slice(2);
const isInit = args.includes('--init');
const inputIdx = args.indexOf('--input');
const pwIdx = args.indexOf('--password');

if (inputIdx === -1 || pwIdx === -1) {
  console.error('Usage: node encrypt.mjs [--init] --input <file> --password <password>');
  process.exit(1);
}

const inputFile = args[inputIdx + 1];
const password = args[pwIdx + 1];

if (!existsSync(inputFile)) {
  console.error(`File not found: ${inputFile}`);
  process.exit(1);
}

const plaintext = readFileSync(inputFile, 'utf-8');

// ---- SALT handling ----

function readSaltFromAuthJs() {
  if (!existsSync(AUTH_JS_PATH)) {
    console.error(`auth.js not found at ${AUTH_JS_PATH}`);
    process.exit(1);
  }
  const src = readFileSync(AUTH_JS_PATH, 'utf-8');
  const match = src.match(/SALT_HEX\s*=\s*'([0-9a-fA-F]+)'/);
  if (!match || match[1].includes('PLACEHOLDER')) return null;
  return match[1];
}

let saltHex;
if (isInit) {
  saltHex = randomBytes(16).toString('hex');
  console.log('[INIT] Generated new SALT');
} else {
  saltHex = readSaltFromAuthJs();
  if (!saltHex) {
    console.error('No existing SALT found in auth.js. Run with --init first.');
    process.exit(1);
  }
  console.log('[UPDATE] Using existing SALT from auth.js');
}

const salt = Buffer.from(saltHex, 'hex');

// ---- Key derivation ----

const derivedKey = pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, 32, 'sha256');
const verifierHex = createHash('sha256').update(derivedKey).digest('hex');

// ---- Compress + Encrypt ----

console.log(`[INFO] Plaintext size: ${(plaintext.length / 1024).toFixed(1)} KB`);

const compressed = gzipSync(Buffer.from(plaintext, 'utf-8'));
console.log(`[INFO] Compressed size: ${(compressed.length / 1024).toFixed(1)} KB (${((1 - compressed.length / plaintext.length) * 100).toFixed(0)}% reduction)`);

// Payload = PK01 magic marker + gzip data
const payload = Buffer.concat([MAGIC, compressed]);
console.log(`[INFO] Payload size (with marker): ${(payload.length / 1024).toFixed(1)} KB`);

const iv = randomBytes(12);

async function encrypt(data, keyBytes, ivBytes) {
  const cryptoKey = await webcrypto.subtle.importKey(
    'raw', keyBytes, AES_GCM, false, ['encrypt']
  );
  const ciphertext = await webcrypto.subtle.encrypt(
    { name: AES_GCM, iv: ivBytes },
    cryptoKey, data
  );
  return new Uint8Array(ciphertext);
}

async function decrypt(ciphertextB64, keyBytes, ivBytes) {
  const cryptoKey = await webcrypto.subtle.importKey(
    'raw', keyBytes, AES_GCM, false, ['decrypt']
  );
  const ctBytes = Buffer.from(ciphertextB64, 'base64');
  const plainBuf = await webcrypto.subtle.decrypt(
    { name: AES_GCM, iv: ivBytes },
    cryptoKey, ctBytes
  );
  return new Uint8Array(plainBuf);
}

const ciphertextBytes = await encrypt(payload, derivedKey, iv);
const ciphertextB64 = Buffer.from(ciphertextBytes).toString('base64');
const ivB64 = iv.toString('base64');

console.log(`[INFO] Ciphertext (base64) size: ${(ciphertextB64.length / 1024).toFixed(1)} KB`);

// ---- Verify ----

const decryptedPayload = await decrypt(ciphertextB64, derivedKey, iv);

// Check magic marker
if (decryptedPayload[0] !== 0x50 || decryptedPayload[1] !== 0x4B ||
    decryptedPayload[2] !== 0x30 || decryptedPayload[3] !== 0x31) {
  console.error('VERIFICATION FAILED: missing PK01 magic marker!');
  process.exit(1);
}

const decompressed = gunzipSync(Buffer.from(decryptedPayload.slice(4)));
const decryptedText = decompressed.toString('utf-8');

if (decryptedText !== plaintext) {
  console.error('VERIFICATION FAILED: decrypted text does not match original!');
  process.exit(1);
}
console.log('[OK] Verification passed — compress → encrypt → decrypt → decompress matches plaintext.\n');

// ---- Output ----

if (isInit) {
  console.log('=== Paste into auth.js (replace PLACEHOLDER values) ===');
  console.log(`SALT_HEX = '${saltHex}';`);
  console.log(`VERIFIER = '${verifierHex}';`);
  console.log('');
}

// Write ciphertext to data.bin
writeFileSync(DATA_BIN_PATH, ciphertextB64);
console.log(`[OK] Ciphertext written to letters/k7x9m2/data.bin (${(ciphertextB64.length / 1024).toFixed(1)} KB)`);

console.log(`\nIV (base64): ${ivB64}`);
console.log('Paste the IV into the <script id="encrypted-iv"> element in letters/k7x9m2/index.html');
console.log('\nDone.');
