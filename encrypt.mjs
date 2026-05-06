#!/usr/bin/env node

/**
 * encrypt.mjs — Content encryption helper for the hidden letters page.
 *
 * Usage:
 *   First init:   node encrypt.mjs --init --input letter.html --password "xxx"
 *   Update:       node encrypt.mjs --input letter.html --password "xxx"
 *
 * Reads existing SALT from auth.js (unless --init), generates fresh IV each run,
 * encrypts with AES-256-GCM, verifies decryption, and outputs values to paste.
 */

import { readFileSync, existsSync } from 'node:fs';
import { randomBytes, createHash, pbkdf2Sync } from 'node:crypto';
import { webcrypto } from 'node:crypto';

const AES_GCM = 'AES-GCM';
const PBKDF2_ITERATIONS = 100000;
const AUTH_JS_PATH = new URL('./assets/js/auth.js', import.meta.url).pathname;

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

// ---- Encrypt ----

const iv = randomBytes(12);

async function encrypt(plaintext, keyBytes, ivBytes) {
  const cryptoKey = await webcrypto.subtle.importKey(
    'raw', keyBytes, AES_GCM, false, ['encrypt']
  );
  const enc = new TextEncoder();
  const ciphertext = await webcrypto.subtle.encrypt(
    { name: AES_GCM, iv: ivBytes },
    cryptoKey, enc.encode(plaintext)
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
  return new TextDecoder().decode(plainBuf);
}

const ciphertextBytes = await encrypt(plaintext, derivedKey, iv);
const ciphertextB64 = Buffer.from(ciphertextBytes).toString('base64');
const ivB64 = iv.toString('base64');

// ---- Verify ----

const decrypted = await decrypt(ciphertextB64, derivedKey, iv);
if (decrypted !== plaintext) {
  console.error('VERIFICATION FAILED: decrypted text does not match original!');
  process.exit(1);
}
console.log('[OK] Decryption verified — ciphertext matches plaintext.\n');

// ---- Output ----

if (isInit) {
  console.log('=== Paste into auth.js (replace PLACEHOLDER values) ===');
  console.log(`SALT_HEX = '${saltHex}';`);
  console.log(`VERIFIER = '${verifierHex}';`);
  console.log('');
}

console.log('=== Paste into letters/k7x9m2/index.html ===');
console.log(`Ciphertext (base64):\n${ciphertextB64}`);
console.log(`\nIV (base64):\n${ivB64}`);
console.log('');
console.log('Done. Copy the values above into the corresponding HTML elements.');
