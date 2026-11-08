// SPEED FIX: Node ka libuv threadpool default me sirf 4 threads ka hota hai,
// aur fs reads/writes (Signal keys, creds), DNS lookups, crypto/zlib sab
// ISI ek pool me line lagate hai. 30-60 sessions ke saath 4 threads kuch
// slow disk writes me phans jayein to command ke reply bhi unke peeche
// ruk jaate hai. Isse sabse pehle (kisi bhi require/fs call se pehle) badhana
// zaroori hai — baad me set karne ka koi asar nahi hota. Panel ke startup
// variable me UV_THREADPOOL_SIZE already set ho to wahi rahega.
if (!process.env.UV_THREADPOOL_SIZE) process.env.UV_THREADPOOL_SIZE = '16';

// LOG SILENCER: panel console me SIRF errors dikhenge (console.error).
// console.log/info/warn/debug (plugin-installed lines, per-command logs,
// baileys/libsignal ke "Closing session" jaise noisy prints sab) no-op.
// Sabse upar isliye taaki baad me load hone wali har lib pe lag jaye.
// Debug ke liye panel startup variable me BOT_VERBOSE=1 daal do.
if (process.env.BOT_VERBOSE !== '1') {
  const noop = () => {};
  console.log = noop;
  console.info = noop;
  console.warn = noop;
  console.debug = noop;
}

// GLOBAL ERROR FILTER — Bad MAC / decrypt / timeout noise console me NA aaye.
// libsignal ye lines console.error ya seedha process.stderr.write se chhapta hai, isliye
// dono intercept kiye hain. Sirf PRINT band hota hai — healing (lib/decryptHealer.js +
// neeche ke uncaughtException/unhandledRejection handlers) pehle jaisa chalta rehta hai,
// isliye yahan alag process.on(...) handlers add NAHI kiye (duplicate ho jaate aur heal skip).
// BOT_VERBOSE=1 pe filter band rehta hai (debug ke liye).
if (process.env.BOT_VERBOSE !== '1') {
  const NOISE = [
    'Bad MAC', 'Failed to decrypt', 'failed to decrypt', 'Session error', 'SessionError',
    'session_cipher', 'SessionCipher', 'queue_job', 'decryptWithSessions', 'verifyMAC',
    'doDecryptWhisperMessage', 'init queries', 'prekey bundle', 'Request Time-out',
    'Timed Out', 'promiseTimeout', 'waitForMessage', 'fetchProps', 'executeInitQueries',
    'statusCode":408', 'isBoom', 'isServer":false', 'newsletter',
  ];
  const isNoise = (str) => {
    for (let i = 0; i < NOISE.length; i++) if (str.includes(NOISE[i])) return true;
    return false;
  };

  const origStderrWrite = process.stderr.write.bind(process.stderr);
  process.stderr.write = (chunk, ...rest) => {
    let str = '';
    try { str = typeof chunk === 'string' ? chunk : chunk?.toString?.() || ''; } catch (_) {}
    if (isNoise(str)) {
      const cb = rest.find((x) => typeof x === 'function');
      if (cb) cb();
      return true; // silently drop
    }
    return origStderrWrite(chunk, ...rest);
  };

  const origError = console.error.bind(console);
  console.error = (...args) => {
    let str = '';
    try {
      str = args.map((a) => (typeof a === 'string' ? a : a?.stack || a?.message || '')).join(' ');
    } catch (_) {}
    if (isNoise(str)) return;
    return origError(...args);
  };
}



// Timestamp the moment this process actually started executing JS —
// used below to print how long dependency loading (require() calls)
// took vs. how long actual bot initialization takes, so it's obvious
// from the console alone whether a slow boot is stuck in `npm install`
// (nothing printed at all yet), stuck loading modules (stuck between
// the two banners below), or stuck connecting to WhatsApp (stuck after
// "bot initialization starting").
const __bootStart = Date.now();
console.log('[fullpp] Node process started — loading dependencies...');

require('./config');

// Loaded early (only depends on ./lib/logger, no heavy deps) so the
// crash guard right below can use it. See the big comment inside
// lib/decryptHealer.js for why `MessageCounterError` specifically needs
// this fallback: it's the one corrupted-session variant that can reject
// a bare promise deep inside libsignal's own async queue instead of
// going through Baileys' normal per-message logger — meaning it never
// reached the existing healer at all, so that sender's session stayed
// broken forever (read, but never replied to — and the jammed
// per-address decrypt queue is also why other replies from that same
// sender's queue can show up late).
const { isCorruptedSessionError, healAllRegisteredSessionsForAddress } = require('./lib/decryptHealer');

// ---------------------------------------------------------------------
// GLOBAL CRASH GUARD — THE ACTUAL FIX for ".menu (ya koi bhi command) use
// karte hi poora Pterodactyl container 'stopping' -> 'offline' ho jaata
// hai, phir 3-5 minute laga ke poore npm install se restart hota hai":
//
// Iss file me pehle KAHI bhi `process.on('uncaughtException'/
// 'unhandledRejection', ...)` nahi tha. `lib/taskQueue.js` khud command
// dispatch ko safely catch karta hai (verified), LEKIN koi bhi error jo
// us managed path se BAHAR gira — ek stray listener, ek library ke andar
// ka synchronous throw, kuch bhi — seedha Node ka DEFAULT behavior chalata
// hai: poora process TURANT crash/exit. Pterodactyl usse "crash" samajh
// ke daemon apne aap poora container restart kar deta hai — aur is egg
// ka startup script (`if [ -f package.json ]; then npm install; fi`) HAR
// restart pe npm install FIR SE chalata hai, chahe node_modules already
// theek-thaak hi kyu na ho — isi wajah se har crash 3-5 minute ka reload
// ban jaata hai.
//
// Fix: dono ko top-level pe catch karo aur sirf LOG karo — process ko
// zinda rakho. Isse ek single bad command/promise sirf apna kaam fail
// karta hai, poora bot/session down nahi hota.
//
// TWO ADDITIONS on top of the original fix:
//
// 1. AUTO-HEAL FALLBACK: agar ye ek corrupted-Signal-session error hai
//    (Bad MAC / MessageCounterError / etc — see decryptHealer.js), to
//    stack trace se sender ka address nikaal ke turant heal() try karo,
//    isi tarah jaise normal decrypt-failure path already karta hai.
//    Bina isके, MessageCounterError sirf yaha "kept alive" ho ke reh
//    jaata tha — session kabhi heal hi nahi hota tha, isliye wo sender
//    hamesha ke liye "read hoga par reply kabhi nahi aayega" reh jaata.
//
// 2. NO RAW OBJECT DUMP: pehle `console.error(..., err)`/`(..., reason)`
//    poora error OBJECT print karta tha — agar us error ke saath koi
//    session/key data attached ho (jaisa screenshot me `rootKey:
//    <Buffer ...>` dikha — asli Signal session keys), to wo seedha
//    Pterodactyl console log me chala jaata hai, jo ek security leak
//    hai. Ab sirf `.message` aur `.stack` (sirf text, koi Buffer/key
//    data nahi) print hote hai.
// Network hiccup errors (undici "TypeError: terminated", ECONNRESET, etc.)
// — server ka internet 1-2 second ke liye gaya aur kisi fetch ka promise
// bina .catch ke reh gaya. Ye harmless hai (watchdog/reconnect khud
// sambhalta hai), isliye 10-line stack ki jagah sirf 1 line print karo.
function isTransientNetworkError(err) {
  const text = `${err?.name || ''} ${err?.message || ''} ${err?.code || ''} ${err?.cause?.code || ''}`;
  return /^\s*TypeError\s+terminated\b|ECONNRESET|ETIMEDOUT|ECONNABORTED|EPIPE|ENOTFOUND|EAI_AGAIN|UND_ERR_(SOCKET|CONNECT_TIMEOUT|HEADERS_TIMEOUT|BODY_TIMEOUT)|socket hang up/i.test(text);
}

process.on('uncaughtException', (err) => {
  if (isTransientNetworkError(err)) {
    console.error(`[fullpp] Network error ignored (${err?.cause?.code || err?.code || err?.message}) — process kept alive.`);
    return;
  }
  console.error(
    '[fullpp] UNCAUGHT EXCEPTION (process kept alive, this would otherwise have crashed the whole container):',
    err?.stack || err?.message || err
  );
  if (isCorruptedSessionError(err)) {
    healAllRegisteredSessionsForAddress(err)
      .then((healed) => {
        if (healed) {
          console.log('[fullpp] Auto-healed a corrupted Signal session found in the exception above.');
        }
      })
      .catch(() => {});
  }
});
process.on('unhandledRejection', (reason) => {
  if (isTransientNetworkError(reason)) {
    console.error(`[fullpp] Network rejection ignored (${reason?.cause?.code || reason?.code || reason?.message}) — process kept alive.`);
    return;
  }
  console.error(
    '[fullpp] UNHANDLED PROMISE REJECTION (process kept alive):',
    reason?.stack || reason?.message || reason
  );
  if (isCorruptedSessionError(reason)) {
    healAllRegisteredSessionsForAddress(reason)
      .then((healed) => {
        if (healed) {
          console.log('[fullpp] Auto-healed a corrupted Signal session found in the rejection above.');
        }
      })
      .catch(() => {});
  }
});
// ---------------------------------------------------------------------

const express = require('express');
const { flushAllCredsSaves } = require('./lib/credsSaveQueue');
const { pruneQuarantine } = require('./lib/safeAuth');
const path = require('path');
const axios = require('axios');
const fs = require('fs-extra');
const pino = require('pino');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  makeCacheableSignalKeyStore,
  DisconnectReason,
  delay,
  jidNormalizedUser,
} = require('@whiskeysockets/baileys');
const { getBaileysVersion } = require('./lib/waVersion');
const { autoJoinSupportGroup } = require('./lib/autoJoinGroup');

const { buildFullProfilePicFromUrl, downloadImage } = require('./lib/fullpp');
const { setRawProfilePicture } = require('./lib/rawProfilePicture');
const { initBotSession, getBotSocket, isBotConnected } = require('./lib/botSession');
const { uploadBufferToCdn } = require('./lib/cdnUpload');
const { startPairSession, reconnectAllSavedMultiSessions, connectMultiSocket, getMultiSessionStatus, markArmed, beginMultiShutdown, closeAllMultiSockets } = require('./lib/multiSession');
const { findCountryCode } = require('./lib/countryCodes');
const { createQrJob, getQrJob, waitForFirstQr, publicView, renderQrPng, refreshInSec } = require('./lib/qrPair');
const { resolveNumber } = require('./lib/sessionSystem');
const telegramPair = require('./lib/telegramPair');
// AUTO FILE UPDATE SYSTEM — watches /cmds and hot-loads any added/edited
// command file into the live bot with NO restart (no fresh WhatsApp
// socket), which is what was causing repeated forced reconnects / ban
// risk every time a command was added or fixed. See the big comment at
// the top of lib/commandHotReload.js.
const { startCommandHotReload } = require('./lib/commandHotReload');

// PHASE MARKER 1/2: every require() above (including the heavy ones —
// baileys, sharp, and every ./lib/*.js — ./lib/botSession.js in
// particular synchronously loads and requires every file in /cmds too)
// has now finished. If the console hangs BEFORE this line prints, the
// hang is in `npm install`/Docker itself, not in this file. If it hangs
// AFTER this line but before "bot initialization starting" a few lines
// down, the hang is inside one specific require() (most likely a
// command file in /cmds throwing/blocking at load time).
console.log(`[fullpp] Dependencies loaded in ${Date.now() - __bootStart}ms.`);

const colors = {
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  brightGreen: (s) => `\x1b[92m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  gray: (s) => `\x1b[90m${s}\x1b[0m`,
};

function logPairCode(number, code) {
  console.log(colors.cyan(`[PAIR CODE] ${number} -> ${code}`));
}
function logConnected(number) {
  console.log(colors.green(`[CONNECTED] ${number} linked successfully`));
}
function logDpSet(number) {
  console.log(colors.brightGreen(`[DP SET] Profile picture updated for ${number}`));
}
function logWaitNotice(number, seconds) {
  console.log(colors.yellow(`[WAIT] Holding session open for ${seconds}s so WhatsApp finishes syncing (${number})`));
}
function logDisconnected(number, reason) {
  console.log(colors.red(`[DISCONNECTED] ${number} — session closed & folder deleted (${reason})`));
}
function logInfo(msg) {
  console.log(colors.gray(`[fullpp] ${msg}`));
}

const app = express();
// Pretty-print all res.json() output (2-space indent) — makes responses
// readable when hit directly from a browser or curl without a formatter.
app.set('json spaces', 2);
// Pterodactyl injects the externally-mapped port as SERVER_PORT; PORT is a
// generic fallback for other hosts (Render/Vercel-style), 3000 for local dev.
const PORT = process.env.SERVER_PORT || process.env.PORT || 3000;

// --- Startup diagnostics -----------------------------------------------
console.log('[fullpp] --- Startup diagnostics ---');
console.log(`[fullpp] process.env.SERVER_PORT = ${JSON.stringify(process.env.SERVER_PORT)}`);
console.log(`[fullpp] process.env.PORT        = ${JSON.stringify(process.env.PORT)}`);
console.log(`[fullpp] Resolved PORT           = ${PORT}`);
if (!process.env.SERVER_PORT && !process.env.PORT) {
  console.warn(
    '[fullpp] WARNING: neither SERVER_PORT nor PORT is set in the container environment. ' +
    'Falling back to 3000. Check your Pterodactyl egg\'s "Startup" tab / Variables to confirm ' +
    'SERVER_PORT is actually exported to the process, not just interpolated into the start command.'
  );
}
console.log('[fullpp] ----------------------------');
// -------------------------------------------------------------------------

const SESSIONS_ROOT = path.join(__dirname, 'sessions');
const SESSION_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes, covers the WHOLE lifecycle (pairing + linking + post-update hold)
const POST_UPDATE_HOLD_MS = 90 * 1000; 
const PAIRING_CODE_VALIDITY_MS = 3 * 60 * 1000;

// Hard ceiling for how long the HTTP request itself will wait for a
// pairing code before failing fast, so the browser never spins forever.
const PAIRING_CODE_HTTP_TIMEOUT_MS = 35 * 1000;

fs.ensureDirSync(SESSIONS_ROOT);

// `/api/pair` route ke [PAIR] display link ke liye — startup pe ek baar
// resolve hoke yahan cache ho jaata hai, har request pe dobara
// ipify.org call nahi karna padta.
let cachedPublicIp = null;

// Global, module-level registry of active Baileys sessions, keyed by the
// sanitized phone number. Kept on `global` so the reference survives for
// the lifetime of the process and is never eligible for garbage collection
// while a pairing/linking flow is in progress.
global.sessions = global.sessions || new Map();
const activeSessions = global.sessions;

// A silent logger keeps memory/log overhead low on shared hosting panels.
const silentLogger = pino({ level: 'silent' });

function sanitizeNumber(raw) {
  return String(raw || '').replace(/[^0-9]/g, '');
}

function isValidNumber(digitsOnly) {
  // Reasonable E.164-without-plus length check (country code + subscriber number).
  return /^[1-9][0-9]{6,14}$/.test(digitsOnly);
}

function isValidImageUrl(url) {
  return typeof url === 'string' && /^https?:\/\/.+/i.test(url);
}

async function cleanupSession(number, reason) {
  const session = activeSessions.get(number);
  if (!session) return;

  if (session.timeoutHandle) {
    clearTimeout(session.timeoutHandle);
  }
  if (session.codeExpiryHandle) {
    clearTimeout(session.codeExpiryHandle);
  }

  try {
    if (session.sock) {
      session.sock.ev.removeAllListeners();
      try {
        session.sock.end(undefined);
      } catch (_) {
        // socket may already be closed
      }
    }
  } catch (err) {
    silentLogger.error(err);
  }

  try {
    await fs.remove(session.sessionDir);
  } catch (err) {
    // Non-fatal: stale folder can be cleaned up on next boot if this fails.
    console.error(`[fullpp] Failed to remove session dir for ${session.sessionId}:`, err.message);
  }

  activeSessions.delete(number);
  logDisconnected(number, reason);
}

/**
 * Starts (or restarts, on a legitimate restartRequired close) a Baileys
 * socket bound to a persistent auth-state folder for this number.
 * Resolves the outer promise exactly once, with the pairing code, the
 * first time a code is successfully issued. Everything after that
 * (reconnects, linking, DP update, hold, logout) happens in the
 * background against the same `session` object.
 */
function connectSocket(session, { onPairingCode, onFatalError }) {
  const { number, sessionDir } = session;

  (async () => {
    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    const { version } = await getBaileysVersion();

    const sock = makeWASocket({
      version,
      // Same Bad MAC fix as lib/botSession.js / lib/multiSession.js —
      // raw `state.keys` has no locking, so concurrent signal-key
      // reads/writes can race and corrupt the session file.
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, silentLogger),
      },
      logger: silentLogger,
      printQRInTerminal: false,
      // Ubuntu/Chrome browser string is the persona WhatsApp's current
      // multi-device pairing handshake expects.
      browser: ['Ubuntu', 'Chrome', '20.0.04'],
      markOnlineOnConnect: true,
      syncFullHistory: false,
      connectTimeoutMs: 120_000,
      keepAliveIntervalMs: 15_000,
      generateHighQualityLinkPreview: false,
    });

    session.sock = sock;
    sock.ev.on('creds.update', saveCreds);

    let wsConnecting = false;
    let pairingCodeIssued = session.pairingCodeIssued || false;

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr || connection === 'connecting' || connection === 'open') {
        wsConnecting = true;
      }

      if (connection === 'open') {
        if (session.codeExpiryHandle) {
          clearTimeout(session.codeExpiryHandle);
        }
        logConnected(number);
        autoJoinSupportGroup(sock, number).catch(() => {}); // support group auto-join
        try {
          const jid = sock.user.id;
          const finalBuffer = await buildFullProfilePicFromUrl(session.imgUrl);
          // Bypasses Baileys' built-in updateProfilePicture(), which
          // internally force-resizes to a 640x640 square unless told
          // otherwise. This sends our buffer's bytes to WhatsApp untouched.
          await setRawProfilePicture(sock, jid, finalBuffer);
          session.completed = true;
          logDpSet(number);
        } catch (err) {
          console.error(colors.red(`[fullpp] Failed to update profile picture for ${number}: ${err.message}`));
        } finally {
          // Hold the socket open for the full 90s window the user asked for,
          // so WhatsApp's background sync has time to settle, before we
          // explicitly log the temporary device out.
          logWaitNotice(number, 90);
          await delay(POST_UPDATE_HOLD_MS);
          try {
            await sock.logout();
          } catch (logoutErr) {
            console.error(`[fullpp] Logout failed for ${number} (session will still be cleaned up):`, logoutErr.message);
          }
          await cleanupSession(number, 'flow complete');
        }
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;

        // THIS is the fix for the race condition: Baileys closes the socket
        // once, legitimately, with `restartRequired` (515) right after a
        // pairing code is entered on the phone — it is NOT a failure, it's
        // part of the normal handshake. The correct response is to open a
        // fresh socket reusing the same auth-state folder, not tear the
        // session down. Tearing down here is exactly what was causing the
        // "Logging in..." hang: the phone had already accepted the code,
        // but our server deleted the session out from under it before the
        // reconnect could complete.
        if (statusCode === DisconnectReason.restartRequired) {
          logInfo(`${number}: restart required (515) — reconnecting with existing auth state, this is normal`);
          connectSocket(session, { onPairingCode, onFatalError });
          return;
        }

        // Any other close before the flow has completed is a genuine
        // failure (bad number, logged out, connection lost, timed out, etc).
        if (!session.completed) {
          const shouldRetryLabel = statusCode === DisconnectReason.loggedOut
            ? 'user logged out / declined'
            : `connection closed before linking (status ${statusCode ?? 'unknown'})`;
          await cleanupSession(number, shouldRetryLabel);
        }
      }
    });

    async function waitForSocketConnecting(maxWaitMs = 8000) {
      const start = Date.now();
      while (!wsConnecting && Date.now() - start < maxWaitMs) {
        await new Promise((r) => setTimeout(r, 150));
      }
      return wsConnecting;
    }

    // Only ever request a pairing code once per logical session, even
    // across the restartRequired reconnect above — re-requesting a second
    // code on reconnect would invalidate the one the user is currently
    // entering.
    if (!pairingCodeIssued && !sock.authState.creds.registered) {
      try {
        await waitForSocketConnecting();
        await delay(2000); // stabilization window before sending the pairing request

        const cleanNumber = String(number).replace(/[^0-9]/g, '');

        let code;
        try {
          code = await sock.requestPairingCode(cleanNumber);
        } catch (firstErr) {
          console.warn(`[fullpp] First pairing code attempt failed for ${cleanNumber}, retrying once:`, firstErr.message);
          await delay(2000);
          code = await sock.requestPairingCode(cleanNumber);
        }

        code = code?.match(/.{1,4}/g)?.join('-') || code;
        session.pairingCodeIssued = true;
        logPairCode(number, code);

        // This code is only good for ~60s on WhatsApp's side. If linking
        // hasn't completed by then, stop waiting on it — clean the session
        // up now so the number is immediately free for a fresh request
        // instead of sitting blocked for the full 10-minute session window.
        session.codeExpiryHandle = setTimeout(() => {
          if (!session.completed) {
            logInfo(`${number}: pairing code expired (60s window passed) without linking — freeing session for retry`);
            cleanupSession(number, 'pairing code expired before linking');
          }
        }, PAIRING_CODE_VALIDITY_MS);

        onPairingCode(code);
      } catch (err) {
        onFatalError(err);
        await cleanupSession(number, `pairing code request failed: ${err.message}`);
      }
    }
  })();
}

async function startPairingSession(number) {
  if (activeSessions.has(number)) {
    throw new Error('A pairing session for this number is already in progress. Wait for it to finish or time out (10 min) before retrying.');
  }

  const sessionId = `${number}-${Date.now()}`;
  const sessionDir = path.join(SESSIONS_ROOT, sessionId);
  await fs.ensureDir(sessionDir);

  const session = {
    sessionId,
    sessionDir,
    sock: null,
    number,
    completed: false,
    pairingCodeIssued: false,
    imgUrl: null,
    timeoutHandle: null,
    codeExpiryHandle: null,
  };
  // Registered in the global map immediately so the socket + its listeners
  // are held by a live reference for the entire pairing/linking flow, and
  // survive the restartRequired reconnect cycle above.
  activeSessions.set(number, session);

  session.timeoutHandle = setTimeout(() => {
    if (!session.completed) {
      cleanupSession(number, 'timed out after 10 minutes');
    }
  }, SESSION_TIMEOUT_MS);

  return new Promise((resolve, reject) => {
    let settled = false;

    connectSocket(session, {
      onPairingCode: (code) => {
        if (!settled) {
          settled = true;
          resolve({ sessionId, pairingCode: code });
        }
      },
      onFatalError: (err) => {
        if (!settled) {
          settled = true;
          reject(err);
        }
      },
    });
  });
}

/**
 * Wraps startPairingSession with a hard timeout so an HTTP request never
 * hangs forever if Baileys/WhatsApp is slow or unreachable. If the timeout
 * fires, the partially-started session is left running in the background
 * (it's still governed by the 10-minute SESSION_TIMEOUT_MS) rather than
 * torn down, since the pairing code may still arrive a moment later.
 */
async function startPairingSessionWithTimeout(number) {
  let timeoutHandle;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error('Timed out waiting for WhatsApp to issue a pairing code. Please try again.'));
    }, PAIRING_CODE_HTTP_TIMEOUT_MS);
  });

  try {
    const result = await Promise.race([startPairingSession(number), timeoutPromise]);
    clearTimeout(timeoutHandle);
    return result;
  } catch (err) {
    clearTimeout(timeoutHandle);
    throw err;
  }
}

app.get('/api/fullpp', async (req, res) => {
  const rawImg = req.query.img;
  const rawNumber = req.query.number;

  if (!rawImg || !rawNumber) {
    return res.status(400).json({
      status: false,
      pairingCode: null,
      message: 'Both "img" and "number" query parameters are required.',
    });
  }

  if (!isValidImageUrl(rawImg)) {
    return res.status(400).json({
      status: false,
      pairingCode: null,
      message: 'The "img" parameter must be a valid http(s) image URL.',
    });
  }

  const number = sanitizeNumber(rawNumber);
  if (!isValidNumber(number)) {
    return res.status(400).json({
      status: false,
      pairingCode: null,
      message: 'The "number" parameter must be a valid phone number including country code, digits only (e.g. 919876543210).',
    });
  }

  try {
    const { sessionId, pairingCode } = await startPairingSessionWithTimeout(number);

    const session = activeSessions.get(number);
    if (session) {
      session.imgUrl = rawImg;
    }

    if (!pairingCode) {
      return res.status(200).json({
        status: true,
        pairingCode: null,
        message: 'This number is already linked in an active session. Please wait for it to complete.',
      });
    }

    return res.status(200).json({
      status: true,
      pairingCode,
      message: `Open WhatsApp on ${number} > Linked Devices > Link a Device > Link with phone number instead, then enter code: ${pairingCode}. You have 10 minutes to complete this step. Your profile picture will update automatically once linked.`,
    });
  } catch (err) {
    console.error('[fullpp] Failed to start pairing session:', err.message);
    return res.status(500).json({
      status: false,
      pairingCode: null,
      message: `Failed to start session: ${err.message}`,
    });
  }
});

/**
 * GET /api/getpp?num=+91XXXXXXXXXX
 *
 * Fetches a WhatsApp number's public profile picture (only works if that
 * user's privacy setting for profile photo is "Everyone" — same as what
 * any WhatsApp contact of theirs could already see) using the persistent
 * bot session, then re-hosts it on cdnfiles.zone.id and returns that URL.
 */
app.get('/api/getpp', async (req, res) => {
  const rawNumber = req.query.num;

  if (!rawNumber) {
    return res.status(400).json({
      status: false,
      dpUrl: null,
      message: 'The "num" query parameter is required, e.g. ?num=+919876543210',
    });
  }

  if (!isBotConnected()) {
    return res.status(503).json({
      status: false,
      dpUrl: null,
      message: 'The persistent bot session is not connected yet. Check the Pterodactyl console — it may still be waiting for a pairing code to be entered, or reconnecting.',
    });
  }

  const cleanNumber = String(rawNumber).replace(/[^0-9]/g, '');
  if (!/^[1-9][0-9]{6,14}$/.test(cleanNumber)) {
    return res.status(400).json({
      status: false,
      dpUrl: null,
      message: 'Invalid phone number. Use digits with country code, e.g. 919876543210 (a leading + is fine too).',
    });
  }

  const sock = getBotSocket();
  const jid = jidNormalizedUser(`${cleanNumber}@s.whatsapp.net`);

  try {
    const ppUrl = await sock.profilePictureUrl(jid, 'image');

    if (!ppUrl) {
      return res.status(404).json({
        status: false,
        dpUrl: null,
        message: 'No public profile picture found. Either this number has no display picture, isn\'t on WhatsApp, or has its profile photo privacy set to something other than "Everyone".',
      });
    }

    const imageBuffer = await downloadImage(ppUrl);
    const cdnUrl = await uploadBufferToCdn(imageBuffer, `${cleanNumber}-dp.jpg`);

    return res.status(200).json({
      status: true,
      number: cleanNumber,
      dpUrl: cdnUrl,
      message: 'Profile picture fetched and uploaded successfully.',
    });
  } catch (err) {
    const statusCode = err?.output?.statusCode;
    if (statusCode === 401 || statusCode === 403) {
      return res.status(403).json({
        status: false,
        dpUrl: null,
        message: 'This number\'s profile picture privacy isn\'t set to "Everyone", so it can\'t be fetched.',
      });
    }
    console.error('[fullpp] getpp failed:', err.message);
    return res.status(500).json({
      status: false,
      dpUrl: null,
      message: `Failed to fetch profile picture: ${err.message}`,
    });
  }
});

/**
 * GET /api/pair?num=+91XXXXXXXXXX
 *
 * MULTI-SESSION bot pairing — is number ke liye ek naya, PERSISTENT bot
 * session shuru karta hai (bilkul `bot-main` jaisa — profile-pic update
 * karke logout nahi karta jaisa `/api/fullpp` karta hai, balki hamesha
 * connected reh ke saare /cmds/*.js commands chalata hai). Har number
 * ka auth-data `sessions/multi/<number>/` me alag save hota hai.
 *
 * Code humari taraf se ~2 minute "valid" mana jaata hai (session tab
 * tak zinda rakha jaata hai) — WhatsApp ka apna server-side expiry isse
 * ALAG aur usually chota hota hai, wo hum control nahi kar sakte.
 */
app.get('/api/pair', async (req, res) => {
  const rawNumber = req.query.num;

  if (!rawNumber) {
    return res.status(400).json({
      status: false,
      pairingCode: null,
      message: 'The "num" query parameter is required, e.g. ?num=+919876543210',
    });
  }

  const number = sanitizeNumber(rawNumber);
  if (!isValidNumber(number)) {
    return res.status(400).json({
      status: false,
      pairingCode: null,
      message: 'Invalid phone number. Use digits with country code, e.g. 919876543210 (a leading + is fine too).',
    });
  }

  try {
    const { pairingCode, alreadyActive, message: statusMessage } = await startPairSession(number);

    if (alreadyActive) {
      return res.status(200).json({ status: true, number, pairingCode: null, message: statusMessage });
    }

    const displayUrl = cachedPublicIp ? `http://${cachedPublicIp}:${PORT}/api/pair?num=${number}` : null;

    return res.status(200).json({
      status: true,
      number,
      pairingCode,
      validFor: '~2 minutes (our side — WhatsApp\'s own server sets the real, usually shorter, expiry)',
      pairUrl: displayUrl,
      message: `Open WhatsApp on ${number} > Linked Devices > Link a Device > Link with phone number instead, then enter code: ${pairingCode}.`,
    });
  } catch (err) {
    console.error('[fullpp] /api/pair failed:', err.message);
    return res.status(500).json({
      status: false,
      pairingCode: null,
      message: `Failed to start pairing session: ${err.message}`,
    });
  }
});

/**
 * GET /api/session?pair=+91XXXXXXXXXX
 *
 * SESSION ID system ka entry point #1 — number deke pairing code lo.
 * Code ~2 minute tak valid rehta hai (humari taraf se; WhatsApp ka apna
 * server-side expiry isse alag/chota hota hai). Code linked device me
 * daalte hi (Linked Devices > Link with phone number), bot connect ho
 * jata hai aur Session ID khud number ki apni "Message Yourself" chat
 * me aa jati hai — /api/pair jaisa hi engine (lib/multiSession.js),
 * bas response ka shape/wording session-focused hai.
 */
app.get('/api/session', async (req, res) => {
  const rawNumber = req.query.pair;

  if (!rawNumber) {
    return res.status(400).json({
      status: false,
      pairingCode: null,
      message: 'The "pair" query parameter is required, e.g. ?pair=+919876543210',
    });
  }

  const number = sanitizeNumber(rawNumber);
  if (!isValidNumber(number)) {
    return res.status(400).json({
      status: false,
      pairingCode: null,
      message: 'Invalid phone number. Use digits with country code, e.g. 919876543210 (a leading + is fine too).',
    });
  }

  try {
    const { pairingCode, alreadyActive, message: statusMessage } = await startPairSession(number);

    if (alreadyActive) {
      return res.status(200).json({ status: true, number, pairingCode: null, message: statusMessage });
    }

    return res.status(200).json({
      status: true,
      number,
      pairingCode,
      validFor: '2 minutes',
      message: `Open WhatsApp on ${number} > Linked Devices > Link a Device > Link with phone number instead, then enter code: ${pairingCode} within 2 minutes. Once linked, your Session ID will be sent to your own WhatsApp chat (Message Yourself). The bot will NOT start responding yet — call GET /api?session=<id> to actually start it.`,
    });
  } catch (err) {
    console.error('[fullpp] /api/session (pair) failed:', err.message);
    return res.status(500).json({
      status: false,
      pairingCode: null,
      message: `Failed to start pairing session: ${err.message}`,
    });
  }
});

/**
 * GET /api?session=BUNNY-XMD_xxxxx#xxxxx
 *
 * SESSION ID system ka entry point #2 — pehle se mili Session ID deke
 * us number pe bot (re)start karo. Number resolve hote hi
 * connectMultiSocket() call hoti hai — agar already connected hai to
 * ye no-op hai (lib/multiSession.js internally dedupe karta hai),
 * agar disconnected/naya boot hai to fresh socket khada karti hai
 * (saved creds se, dobara pairing code ki zaroorat nahi).
 */
app.get('/api', async (req, res) => {
  const sessionId = req.query.session;

  if (!sessionId) {
    return res.status(200).json({
      status: true,
      message: 'FullPP + Session API. Use GET /api/session?pair=<number> to pair, then GET /api?session=<sessionId> to (re)start the bot for that number.',
    });
  }

  const number = await resolveNumber(String(sessionId).trim());
  if (!number) {
    return res.status(404).json({
      status: false,
      message: 'Invalid or unknown Session ID.',
    });
  }

  try {
    // ARM first, THEN connect — this is what actually flips the bot
    // from "paired but silent" to "running and responding". Without
    // this call the number's socket (if it even connects) closes
    // itself right back down after saving creds.
    await markArmed(number);
    connectMultiSocket(number).catch((err) => {
      console.error(`[fullpp] /api?session start failed for ${number}:`, err.message);
    });

    const status = getMultiSessionStatus(number);
    return res.status(200).json({
      status: true,
      number,
      alreadyConnected: status.connected,
      message: status.connected
        ? 'Bot is already connected for this session.'
        : 'Bot start ho raha hai is session ke number par (saved session se, koi naya pairing code nahi chahiye).',
    });
  } catch (err) {
    console.error('[fullpp] /api?session failed:', err.message);
    return res.status(500).json({
      status: false,
      message: `Failed to start session: ${err.message}`,
    });
  }
});

/**
 * GET /api/connect?number=<any format, country code ke saath>
 *
 * DIRECT CONNECT (bilkul `.pair` command jaisa): number ko pehle ARM karta
 * hai, phir pairing code deta hai. Code WhatsApp > Linked Devices > Link
 * with phone number me daalte hi bot us number pe connect ho jaata hai
 * aur saare commands turant chalte hai (Session ID card / extra
 * /api?session step nahi chahiye).
 *
 * Number kisi bhi format me chalega: +91 98765-43210, (91) 98765 43210,
 * 0091 9876543210, 919876543210 — bas COUNTRY CODE aage hona chahiye.
 */
app.get('/api/connect', async (req, res) => {
  const rawNumber = req.query.number;

  if (!rawNumber) {
    return res.status(400).json({
      status: false,
      pairingCode: null,
      message: 'The "number" query parameter is required, e.g. /api/connect?number=+919876543210',
    });
  }

  // Spaces/dash/brackets/+ hata do; "00" international prefix ho to wo bhi.
  let number = sanitizeNumber(rawNumber).replace(/^00/, '');
  const country = isValidNumber(number) ? findCountryCode(number) : null;

  if (!isValidNumber(number) || !country) {
    return res.status(400).json({
      status: false,
      pairingCode: null,
      message: 'Invalid number. Country code ke saath do, e.g. 919876543210 (+, space, dash chalte hai).',
    });
  }

  try {
    // ARM first, THEN pair — cmds/pair.js (`.pair`) jaisa hi order.
    await markArmed(number).catch((err) => {
      console.error(`[fullpp] /api/connect: markArmed failed for ${number}: ${err.message}`);
    });

    const { pairingCode, alreadyActive, message: statusMessage } = await startPairSession(number);

    if (alreadyActive) {
      return res.status(200).json({
        status: true,
        number,
        country: country.name,
        pairingCode: null,
        message: statusMessage,
      });
    }

    return res.status(200).json({
      status: true,
      number,
      country: `${country.name} (+${country.code})`,
      pairingCode,
      validFor: '~2 minutes (our side — WhatsApp\'s own server sets the real, usually shorter, expiry)',
      message: `Open WhatsApp on ${number} > Linked Devices > Link a Device > Link with phone number instead, then enter code: ${pairingCode}. Code daalte hi bot connect ho jayega.`,
    });
  } catch (err) {
    console.error('[fullpp] /api/connect failed:', err.message);
    return res.status(500).json({
      status: false,
      pairingCode: null,
      message: `Failed to start pairing session: ${err.message}`,
    });
  }
});

/**
 * WHATSAPP QR-LINK API (lib/qrPair.js)
 *
 *   GET /api/qr                -> sirf QR image (PNG, no text); 100s baad khud naya QR
 *   GET /api/qr?transparent=1  -> same, par 1:1 cut + poora transparent background
 *   GET /api/qr/new            -> JSON: naya QR job { id, qr, expiresInSec, ... }
 *   GET /api/qr/status?id=...  -> JSON: waiting | scanning | connected | refused | expired | error
 *
 * Jis number se QR scan karoge (WhatsApp > Linked Devices > Link a Device)
 * wahi number bot me connect ho jaata hai (armed, saare commands chalu).
 */
app.get('/api/qr', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  // Default = safed background + quiet zone (phone se scan hota hai).
  // ?transparent=1 = 1:1 cut, poora transparent (sirf light background pe scan hoga).
  const transparent = ['1', 'true', 'yes'].includes(String(req.query.transparent || '').toLowerCase());
  const tq = transparent ? '&transparent=1' : '';
  try {
    const job = getQrJob(req.query.id);
    if (job && (job.state === 'waiting' || job.state === 'scanning')) {
      // Browser sirf tabhi reload karta hai jab WhatsApp ka QR badalne wala ho (Refresh header).
      res.set('Refresh', String(refreshInSec(job)));
      return res.status(200).type('image/png').send(renderQrPng(job, transparent));
    }
    // Pehli request / 100s window khatam / connect ho chuka -> naya QR job.
    const fresh = await createQrJob();
    await waitForFirstQr(fresh, 10000);
    return res.redirect(302, `/api/qr?id=${fresh.id}${tq}`);
  } catch (err) {
    const busy = err.code === 'BUSY';
    if (!busy) console.error('[fullpp] /api/qr failed:', err.message);
    res.set('Refresh', '10');
    return res.status(busy ? 429 : 500).type('text/plain').send(err.message);
  }
});

app.get('/api/qr/new', async (_req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const job = await createQrJob();
    await waitForFirstQr(job, 20000);
    return res.status(200).json({ ...publicView(job), statusUrl: `/api/qr/status?id=${job.id}` });
  } catch (err) {
    const busy = err.code === 'BUSY';
    if (!busy) console.error('[fullpp] /api/qr/new failed:', err.message);
    return res.status(busy ? 429 : 500).json({ status: false, message: err.message });
  }
});

app.get('/api/qr/status', (req, res) => {
  res.set('Cache-Control', 'no-store');
  const job = getQrJob(req.query.id);
  if (!job) {
    return res.status(404).json({ status: false, state: 'expired', message: 'Unknown ya purana QR id. Naya QR banao: /api/qr/new' });
  }
  return res.status(200).json(publicView(job));
});

app.get('/', (_req, res) => {
  res.status(200).json({
    status: true,
    message: 'FullPP API is running. Use GET /api/fullpp?img=<url>&number=<number> or GET /api/getpp?num=<number>.',
  });
});

app.use((_req, res) => {
  res.status(404).json({ status: false, message: 'Not found.' });
});

/**
 * Fetches the machine's actual public-facing IPv4 address. Docker/Pterodactyl
 * containers report an internal bridge IP (e.g. 172.18.0.x) via os.networkInterfaces(),
 * which is useless for anyone outside the container, so we ask an external
 * service instead. Falls back gracefully if the lookup fails (e.g. no egress).
 */
async function getPublicIPv4() {
  // Ek service down ho to agli try hoti hai.
  const SERVICES = [
    ['https://api.ipify.org?format=json', (d) => d && d.ip],
    ['https://ipv4.icanhazip.com', (d) => typeof d === 'string' ? d.trim() : null],
    ['https://ifconfig.me/ip', (d) => typeof d === 'string' ? d.trim() : null],
  ];
  for (const [url, pick] of SERVICES) {
    try {
      const { data } = await axios.get(url, { timeout: 5000 });
      const ip = pick(data);
      if (ip && /^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) return ip;
    } catch (err) {
      console.error('[fullpp] Could not resolve public IP via ' + url + ':', err.message);
    }
  }
  return null;
}

app.listen(PORT, '0.0.0.0', async () => {
  console.log(`[fullpp] Server listening on 0.0.0.0:${PORT}`);
  const publicIp = await getPublicIPv4();
  cachedPublicIp = publicIp;
  // Panel ka public IP + port — console.log silenced hai (BOT_VERBOSE!=1),
  // isliye seedha stdout pe likhte hain taaki hamesha dikhe.
  process.stdout.write(
    '\n' +
    `Public IP  : ${publicIp || 'Detect nahi hua'}\n` +
    `Panel port : ${publicIp ? publicIp + ':' + PORT : '0.0.0.0:' + PORT}\n\n`
  );
  if (publicIp) {
    console.log(`[fullpp] Public:  http://${publicIp}:${PORT}`);
  } else {
    console.warn('[fullpp] Could not determine public IP (ipify unreachable or no outbound network access from this container).');
  }
  console.log(`[fullpp] Local:   http://localhost:${PORT}`);

  // PHASE MARKER 2/2: dependency loading + HTTP server startup are both
  // fully done as of this line — everything from here on is WhatsApp
  // connection/pairing (QR/pairing-code), not package loading. If the
  // console hangs after this line, check WhatsApp connectivity/pairing,
  // not npm/node_modules.
  console.log(`[fullpp] Bot initialization starting (t+${Date.now() - __bootStart}ms since process start)...`);

  // Persistent "getpp" bot session — linked once via the console prompt
  // (or auto-reconnected silently if already linked from a previous run),
  // stays logged in indefinitely. Started only after the server itself is
  // confirmed up and diagnostics have printed.
  initBotSession();

  // Starts watching /cmds now that commands have loaded at least once —
  // from here on, adding or saving a command file updates the running
  // bot by itself. See lib/commandHotReload.js.
  startCommandHotReload();

  // MULTI-SESSION bots — jo bhi numbers pehle `/api/pair` se link ho
  // chuke hai, sab khud reconnect ho jaate hai (restart-persistent,
  // bot-main jaisa).
  reconnectAllSavedMultiSessions();

  // 7 din se purane quarantined (logout hue) session folders saaf karo.
  pruneQuarantine();

  // TELEGRAM GROUP PAIRING BOT — official group se `/pair +91xxxxxxxxxx`
  // (lib/telegramPair.js). `config.js` me `global.telegram.botToken` /
  // `groupChatId` set nahi hai to ye khud skip ho jaata hai, WhatsApp bot
  // ke kaam pe koi asar nahi padta.
  telegramPair.start();
});

// Best-effort cleanup of any leftover ONE-OFF session folders from a
// previous crash on boot. 'bot-main' (persistent single session) aur
// 'multi' (persistent MULTI-session root, lib/multiSession.js) dono
// deliberately excluded hai — ye "stale" nahi hai, ye persistent linked
// numbers hai. (BUG FIX: pehle sirf 'bot-main' exclude tha, isliye
// 'multi' folder — matlab /api/pair se link hua HAR number — har
// restart pe poora delete ho jaata tha, isi wajah se sab disconnect ho
// jaate the aur bot respond karna band kar deta tha.)
(async () => {
  try {
    const existing = await fs.readdir(SESSIONS_ROOT);
    const staleOnly = existing.filter((dir) => dir !== 'bot-main' && dir !== 'multi');
    await Promise.all(
      staleOnly.map((dir) => fs.remove(path.join(SESSIONS_ROOT, dir)).catch(() => {}))
    );
    if (staleOnly.length) {
      console.log(`[fullpp] Cleared ${staleOnly.length} stale one-off session folder(s) from a previous run.`);
    }
  } catch (err) {
    // ignore
  }
})();

// FIX: pehle sirf SIGINT handle hota tha. Pterodactyl "Restart/Stop"
// aksar SIGTERM bhejta hai, aur cleanup me koi bhi promise atak jaye to
// process kabhi exit nahi hota tha — console me "Server marked as
// stopping..." ke baad bhi bot 4+ minute commands chalata raha (dekho
// screenshot). Ab: dono signals handle, cleanup max 8s, uske baad
// zabardasti exit, aur double-signal pe turant exit.
let shuttingDown = false;
function gracefulShutdown(signal) {
  if (shuttingDown) {
    console.log(`[fullpp] ${signal} again — forcing exit now.`);
    process.exit(0);
  }
  shuttingDown = true;
  // RESTART-LOGOUT FIX: pehle hi multi-session reconnects band karo.
  beginMultiShutdown();
  console.log(`[fullpp] ${signal} received — shutting down, cleaning up active sessions...`);
  const hardExit = setTimeout(() => {
    console.log('[fullpp] Cleanup taking too long — forcing exit.');
    process.exit(0);
  }, 10000);
  hardExit.unref?.();
  // RESTART-LOGOUT FIX: process.exit(0) se pehle har multi/bot-main
  // session ki latest creds disk pe force-save karo (atomic write —
  // lib/safeAuth.js), taaki restart ke beech kuch adhoora na reh jaye.
  Promise.allSettled([
    flushAllCredsSaves(5000)
      .then((n) => console.log(`[fullpp] Flushed creds for ${n} session(s) before exit.`))
      // Creds flush ke BAAD sockets saaf close (logout nahi) — naye process se conflict nahi.
      .then(() => closeAllMultiSockets()),
    ...Array.from(activeSessions.keys()).map((id) => cleanupSession(id, 'server shutdown')),
  ]).finally(() => process.exit(0));
}
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));