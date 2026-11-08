/**
 * cmds/aconvater.js
 *
 * Audio effects — ek hi file me 20 commands:
 *   .bass .blown .chipmunk .chorus .deep .demon .earrape .echo .fast .fat
 *   .flanger .nightcore .normalize .phaser .radio .reverb .reverse .robot
 *   .slow .smooth
 * Aur `.aconvater` (list) / `.aconvater <effect>` bhi chalta hai.
 *
 * Usage: kisi audio / voice note pe reply karke effect ka command likho.
 *
 * Dispatcher `cmd.run()` ko ye nahi batata ki kaunsa alias type hua tha,
 * isliye command-word raw message text se nikala jaata hai (cmds/reactgif.js
 * jaisa). Saari replies menu.js wale vcard fake-quote ke saath jaati hain,
 * texts English me. `showAllAliases: true` ki wajah se menu me saari
 * commands dikhti hain (menu.js me ye sab CONVERTER category me hain).
 */

const fs = require('fs-extra');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

ffmpeg.setFfmpegPath(ffmpegPath);

const CMD_PREFIX = '.';
const PROCESS_TIMEOUT_MS = 90_000;
const MAX_AUDIO_BYTES = 25 * 1024 * 1024; // 25 MB

// Pitch-based effects ke liye pehle 44.1kHz pe laate hain — voice notes
// aksar 48kHz opus hote hain aur seedha `asetrate=44100*x` galat pitch deta.
const RS = 'aresample=44100';

// ── EFFECT MAP ──────────────────────────────────────────────────────────
const EFFECTS = {
  bass: 'bass=g=10',
  blown: 'acrusher=level_in=1:level_out=1:bits=8:mode=log',
  chipmunk: `${RS},asetrate=44100*1.5,aresample=44100`,
  chorus: 'chorus=0.7:0.9:55:0.4:0.25:2',
  deep: `${RS},asetrate=44100*0.75,aresample=44100`,
  demon: `${RS},asetrate=44100*0.6,aresample=44100`,
  earrape: 'volume=20',
  echo: 'aecho=0.8:0.9:1000:0.3',
  fast: 'atempo=1.5',
  fat: `${RS},asetrate=44100*0.8,aresample=44100`,
  flanger: 'flanger',
  nightcore: `${RS},asetrate=44100*1.25,aresample=44100,atempo=1.1`,
  normalize: 'loudnorm',
  phaser: 'aphaser',
  radio: 'highpass=f=300,lowpass=f=3000',
  reverb: 'aecho=0.8:0.9:60:0.4',
  reverse: 'areverse',
  robot: "afftfilt=real='hypot(re,im)*cos(0)':imag='hypot(re,im)*sin(0)'",
  slow: 'atempo=0.7',
  smooth: 'highpass=f=60,lowpass=f=9000,acompressor=threshold=0.125:ratio=3',
};

const EFFECT_NAMES = Object.keys(EFFECTS);

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** menu.js jaisa vcard fake quote (contactMessage). */
function buildVcardReply(sock) {
  const botNumber =
    sock.user && sock.user.id ? sock.user.id.split(':')[0].split('@')[0] : '13135550002';

  const vcard =
    `BEGIN:VCARD\n` +
    `VERSION:3.0\n` +
    `FN:𝑻𝑯𝑬 𝑩𝑼𝑵𝑵𝒀 𝑴;\n` +
    `ORG:ᴄᴏ德x xᴍᴅ ᴍɪɴɪ;\n` +
    `TEL;type=CELL;type=VOICE;waid=${botNumber}:${botNumber}\n` +
    `END:VCARD`;

  return {
    key: {
      fromMe: false,
      participant: '0@s.whatsapp.net',
      remoteJid: 'status@broadcast',
    },
    message: {
      contactMessage: {
        displayName: 'йхн #ксэии',
        vcard,
      },
    },
  };
}

/** Typed command-word (raw text se). */
function extractCommandName(msg) {
  const text =
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.imageMessage?.caption ||
    msg.message?.videoMessage?.caption ||
    '';
  if (!text.startsWith(CMD_PREFIX)) return null;
  return (text.slice(CMD_PREFIX.length).trim().split(/\s+/)[0] || '').toLowerCase();
}

/** Replied message ka contextInfo. */
function getQuotedInfo(msg) {
  const m = msg.message || {};
  const direct = m.extendedTextMessage?.contextInfo;
  if (direct?.quotedMessage) return direct;
  for (const value of Object.values(m)) {
    const ctx = value && typeof value === 'object' ? value.contextInfo : null;
    if (ctx?.quotedMessage) return ctx;
  }
  return null;
}

function usageText(effect) {
  return (
    `❗Usage :\n` +
    `.${effect} \`‹ Reply to an audio ›\`\n` +
    `— This Cmd Use for convate to ${effect} the audio.`
  );
}

function effectListText() {
  return (
    `🎧 Audio Effects\n\n` +
    `❗Usage :\n.<effect> \`‹ Reply to an audio ›\`\n.aconvater <effect> \`‹ Reply to an audio ›\`\n\n` +
    `Effects:\n` +
    EFFECT_NAMES.map((n) => `➦ .${n}`).join('\n')
  );
}

/** ffmpeg run — timeout + stderr ke saath readable error. */
function applyEffect(inputPath, outputPath, filter) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const stderrLines = [];
    const finish = (fn, arg) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn(arg);
    };
    const timer = setTimeout(
      () => finish(reject, new Error('Processing timed out')),
      PROCESS_TIMEOUT_MS
    );

    ffmpeg(inputPath)
      .audioFilters(filter)
      .noVideo()
      .outputOptions(['-c:a aac', '-b:a 128k'])
      .format('mp4')
      .on('stderr', (line) => stderrLines.push(line))
      .on('end', () => finish(resolve))
      .on('error', (err) => {
        const detail = stderrLines.slice(-3).join(' | ');
        finish(reject, new Error(detail ? `${err.message} (${detail})` : err.message));
      })
      .save(outputPath);
  });
}

/* ------------------------------------------------------------------ */
/* Command                                                             */
/* ------------------------------------------------------------------ */

module.exports = {
  command: ['aconvater', ...EFFECT_NAMES],
  showAllAliases: true,
  description:
    'Audio effects (.bass, .deep, .nightcore, .reverb ... 20 effects). Usage: .<effect> (reply to an audio)',

  // Test ke liye export (plugin loader ise ignore karta hai)
  _EFFECTS: EFFECTS,
  _applyEffect: applyEffect,

  run: async ({ sock, jid, msg, args }) => {
    const vcardReply = buildVcardReply(sock);
    const reply = (text) => sock.sendMessage(jid, { text }, { quoted: vcardReply });

    const id = crypto.randomBytes(6).toString('hex');
    const inputPath = path.join(os.tmpdir(), `aconv_in_${id}`);
    const outputPath = path.join(os.tmpdir(), `aconv_out_${id}.m4a`);

    try {
      // Effect: direct alias (.bass) ya `.aconvater <effect>`
      let word = extractCommandName(msg);
      if (word === 'aconvater') word = String(args?.[0] || '').toLowerCase();

      if (!word) {
        await reply(effectListText());
        return;
      }
      if (!EFFECTS[word]) {
        await reply(`❌ Invalid effect: ${word}\n\n${effectListText()}`);
        return;
      }

      const quotedInfo = getQuotedInfo(msg);
      const quotedMessage = quotedInfo?.quotedMessage;

      if (!quotedMessage) {
        await reply(usageText(word));
        return;
      }

      const audioMsg = quotedMessage.audioMessage;
      if (!audioMsg) {
        await reply('❌ Please reply to an audio or voice note only.\n\n' + usageText(word));
        return;
      }

      if (Number(audioMsg.fileLength) > MAX_AUDIO_BYTES) {
        await reply('❌ Audio is too large (max 25 MB).');
        return;
      }

      sock.sendMessage(jid, { react: { text: '🎧', key: msg.key } }).catch(() => {});

      const fakeMsg = {
        key: {
          remoteJid: jid,
          fromMe: false,
          id: quotedInfo.stanzaId,
          participant: quotedInfo.participant,
        },
        message: quotedMessage,
      };

      const media = await downloadMediaMessage(fakeMsg, 'buffer', {});
      if (!media || !media.length) {
        await reply('❌ Failed to download the audio.');
        return;
      }

      await fs.writeFile(inputPath, media);
      await applyEffect(inputPath, outputPath, EFFECTS[word]);

      const buffer = await fs.readFile(outputPath);
      await sock.sendMessage(
        jid,
        { audio: buffer, mimetype: 'audio/mp4' },
        { quoted: vcardReply }
      );

      sock.sendMessage(jid, { react: { text: '✅', key: msg.key } }).catch(() => {});
    } catch (err) {
      console.error('[.aconvater] error:', err);
      await reply(`❌ Audio effect error:\n${err.message}`).catch(() => {});
    } finally {
      fs.remove(inputPath).catch(() => {});
      fs.remove(outputPath).catch(() => {});
    }
  },
};
