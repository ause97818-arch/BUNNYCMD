const os = require('os');
const crypto = require('crypto');
const {
  proto,
  generateWAMessageFromContent,
  prepareWAMessageMedia,
} = require('@whiskeysockets/baileys');

require('../config');

// Direct function calls
const aliveCmd = require('./alive');
const pingCmd = require('./ping');

const BOT_NAME = global.botname;
const SUPPORT_WHATSAPP = 'https://wa.me/+918509439482';
const SUPPORT_TELEGRAM = 'https://t.me/th3bunny';

// ================= MENU BUTTON-TAP ROUTING =================
const MENU_TTL_MS = 30 * 60 * 1000; // 30 minutes
const pendingMenuTaps = new Map();
const hookedSockets = new WeakSet();
const dispatchedTapIds = new Set();

function cleanupExpiredTaps() {
  const now = Date.now();
  for (const [id, expiresAt] of pendingMenuTaps) {
    if (expiresAt <= now) pendingMenuTaps.delete(id);
  }
}

function extractTappedButtonId(message) {
  const paramsJson = message.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson;
  if (paramsJson) {
    try {
      const parsed = JSON.parse(paramsJson);
      if (parsed?.id === '.alive') return 'alive';
      if (parsed?.id === '.ping') return 'ping';
    } catch (err) {
      // fall through
    }
  }

  if (message.buttonsResponseMessage?.selectedButtonId === '.alive') return 'alive';
  if (message.buttonsResponseMessage?.selectedButtonId === '.ping') return 'ping';

  const plainText = (
    message.conversation ||
    message.extendedTextMessage?.text ||
    message.interactiveResponseMessage?.body?.text ||
    message.buttonsResponseMessage?.selectedDisplayText ||
    ''
  ).trim().toLowerCase();

  const firstWord = plainText.split(/\s+/)[0] || '';
  if (firstWord.startsWith('alive')) return 'alive';
  if (firstWord.startsWith('ping')) return 'ping';
  return null;
}

function getStanzaId(message) {
  return (
    message.extendedTextMessage?.contextInfo?.stanzaId ||
    message.interactiveResponseMessage?.contextInfo?.stanzaId ||
    message.buttonsResponseMessage?.contextInfo?.stanzaId ||
    null
  );
}

async function handleMenuButtonTap(sock, m) {
  const message = m?.message;
  if (!message) return;

  const stanzaId = getStanzaId(message);
  if (!stanzaId || !pendingMenuTaps.has(stanzaId)) return;

  if (pendingMenuTaps.get(stanzaId) <= Date.now()) {
    pendingMenuTaps.delete(stanzaId);
    return;
  }

  const tapId = m.key?.id;
  if (tapId) {
    if (dispatchedTapIds.has(tapId)) return;
    dispatchedTapIds.add(tapId);
    setTimeout(() => dispatchedTapIds.delete(tapId), 5 * 60 * 1000);
  }

  const target = extractTappedButtonId(message);
  if (!target) return;

  const jid = m.key.remoteJid;

  try {
    if (target === 'alive') {
      await aliveCmd.run({ sock, jid, msg: m });
    } else {
      await pingCmd.run({ sock, jid, msg: m });
    }
  } catch (err) {
    console.error(`[BOT] menu button-tap (${target}) failed: ${err.message}`);
  }
}

function ensureMenuTapListener(sock) {
  if (hookedSockets.has(sock)) return;
  hookedSockets.add(sock);

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const m of messages) {
      try {
        await handleMenuButtonTap(sock, m);
      } catch (err) {
        console.error(`[BOT] menu button-tap listener failed: ${err.message}`);
      }
    }
  });
}

// ================= RUNTIME =================
function runtime(seconds) {
  seconds = Number(seconds);
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return [d ? d + 'd' : '', h ? h + 'h' : '', m ? m + 'm' : '', s ? s + 's' : '']
    .join(' ')
    .trim() || '0s';
}

// ================= BOLD SERIF CAP / SMALL MAP FOR COMMANDS =================
const boldMap = {
  a: '𝐚', b: '𝐛', c: '𝐜', d: '𝐝', e: '𝐞', f: '𝐟', g: '𝐠',
  h: '𝐡', i: '𝐢', j: '𝐣', k: '𝐤', l: '𝐥', m: '𝐦', n: '𝐧',
  o: '𝐨', p: '𝐩', q: '𝐪', r: '𝐫', s: '𝐬', t: '𝐭', u: '𝐮',
  v: '𝐯', w: '𝐰', x: '𝐱', y: '𝐲', z: '𝐳',
  A: '𝐀', B: '𝐁', C: '𝐂', D: '𝐃', E: '𝐄', F: '𝐅', G: '𝐆',
  H: '𝐇', I: '𝐈', J: '𝐉', K: '𝐊', L: '𝐋', M: '𝐌', N: '𝐍',
  O: '𝐎', P: '𝐏', Q: '𝐐', R: '𝐑', S: '𝐒', T: '𝐓', U: '𝐔',
  V: '𝐕', W: '𝐖', X: '𝐗', Y: '𝐘', Z: '𝐙',
};

function toBoldStyle(str) {
  const s = String(str);
  if (!s) return s;
  const first = s[0].toUpperCase();
  const rest = s.slice(1).toLowerCase();

  const formatted = first + rest;
  return formatted
    .split('')
    .map((ch) => boldMap[ch] || ch)
    .join('');
}

// ================= BOLD CAPS FOR CATEGORIES =================
const BOLD_CAPITAL_BASE = 0x1d400;
function toBoldCaps(str) {
  return String(str)
    .toUpperCase()
    .split('')
    .map((ch) => {
      if (ch >= 'A' && ch <= 'Z') {
        return String.fromCodePoint(BOLD_CAPITAL_BASE + (ch.charCodeAt(0) - 65));
      }
      return ch;
    })
    .join('');
}

// ================= COMMAND -> CATEGORY MAP =================
const CATEGORY_ORDER = ['GROUP', 'OWNER', 'DOWNLOADER', 'CONVERTER', 'MEDIA', 'TOOLS', 'FUN', 'GENERAL', 'BVG -V1', 'OTHER'];
const COMMAND_CATEGORY_MAP = {
  add: 'GROUP', antibadimg: 'GROUP', anticall: 'GROUP', antidelete: 'GROUP', antiforeign: 'GROUP', antivirus: 'GROUP',
  antilink: 'GROUP', antimention: 'GROUP', antimsg: 'GROUP', antirich: 'GROUP', antisticker: 'GROUP',
  cjoin: 'GROUP', clearmention: 'GROUP', close: 'GROUP', del: 'GROUP', frmv: 'GROUP', frmvpick: 'GROUP',
  fullgp: 'GROUP', gmen: 'GROUP', gmode: 'GROUP', gstatus: 'GROUP', gtable: 'GROUP', kick: 'GROUP', mee: 'GROUP', open: 'GROUP', tagall: 'GROUP', pin: 'GROUP', unpin: 'GROUP',
  promote: 'GROUP', demote: 'GROUP', gsv2: 'GROUP', spp: 'GROUP', stag: 'GROUP', tag: 'GROUP',
  tagadmin: 'GROUP', tagtable: 'GROUP', welcome: 'GROUP', setgdesc: 'GROUP',
  setgname: 'GROUP', addmeta: 'GROUP', anticarousel: 'GROUP', ban: 'GROUP', unban: 'GROUP', dgc: 'GROUP',

  alwaysonline: 'OWNER', audiofooter: 'DEMO', autorecording: 'OWNER', autoseen: 'OWNER',
  autotyping: 'OWNER', block: 'OWNER', blocklist: 'OWNER', chsts: 'OWNER', cleardisk: 'OWNER',
  cmusic: 'OWNER', cpost: 'OWNER', crm: 'OWNER', csong: 'OWNER', fullpp: 'OWNER', gsong: 'OWNER',
  listgc: 'OWNER', listprem: 'OWNER', mode: 'OWNER', owner: 'OWNER', owner2: 'OWNER', pair: 'OWNER',
  pay: 'OWNER', pay2: 'OWNER', pay3: 'OWNER', paytest: 'OWNER', run: 'OWNER', sts: 'OWNER',
  stsview: 'OWNER', sv: 'OWNER', tsession: 'OWNER', unblock: 'OWNER', zushy: 'OWNER', sudo: 'OWNER',
  setsudo: 'OWNER', addsudo: 'OWNER', delsudo: 'OWNER', sudolist: 'OWNER', listsudo: 'OWNER',
  autoreact: 'OWNER', addprem: 'OWNER', delprem: 'OWNER', developer: 'OWMER',

  cimg: 'DOWNLOADER', delmkv: 'DOWNLOADER', fb: 'DOWNLOADER', hd: 'DOWNLOADER', hdpro: 'DOWNLOADER',
  ig: 'DOWNLOADER', movie: 'DOWNLOADER', musicinfo: 'DOWNLOADER', pinterest: 'DOWNLOADER',
  play: 'DOWNLOADER', play2: 'DOWNLOADER', rplay: 'DOWNLOADER', rsong: 'DOWNLOADER', soundcloud: 'DOWNLOADER',
  tiktok: 'DOWNLOADER', tstick: 'DOWNLOADER', vv: 'DOWNLOADER', yt: 'DOWNLOADER', ytlink: 'DOWNLOADER',
  ytmp3: 'DOWNLOADER', ytmp4: 'DOWNLOADER', ytsearch: 'DOWNLOADER', lyrics: 'DOWNLOADER', mediafire: 'DOWNLOADER',

  sticker: 'CONVERTER', aisticker: 'CONVERTER', premsticker: 'CONVERTER', prempack: 'CONVERTER',
  vo: 'CONVERTER', url: 'CONVERTER', bass: 'CONVERTER', blown: 'CONVERTER', chipmunk: 'CONVERTER', chorus: 'CONVERTER',
  deep: 'CONVERTER', demon: 'CONVERTER', earrape: 'CONVERTER', echo: 'CONVERTER',
  fast: 'CONVERTER', fat: 'CONVERTER', flanger: 'CONVERTER', nightcore: 'CONVERTER',
  normalize: 'CONVERTER', phaser: 'CONVERTER', radio: 'CONVERTER', reverb: 'CONVERTER',
  reverse: 'CONVERTER', robot: 'CONVERTER', slow: 'CONVERTER', smooth: 'CONVERTER', toimg: 'CONVERTER', tomp3: 'CONVERTER', tts: 'CONVERTER',

  brat: 'MEDIA', brat2: 'MEDIA', edit2: 'MEDIA', motionpic: 'MEDIA', nude: 'MEDIA',
  reagirsticker: 'MEDIA', smiku: 'MEDIA', vidmusic: 'MEDIA', circle: 'MEDIA', vcircle: 'MEDIA',

  ckban: 'TOOLS', chr: 'TOOLS', fetchweb: 'TOOLS',
  id: 'TOOLS', jid: 'TOOLS', lid: 'TOOLS', mylid: 'TOOLS', sendmsg: 'TOOLS', weather: 'TOOLS', 

  cry: 'FUN', cuddle: 'FUN', bully: 'FUN', hug: 'FUN', awoo: 'FUN', lick: 'FUN',
  pat: 'FUN', smug: 'FUN', bonk: 'FUN', yeet: 'FUN', blush: 'FUN', handhold: 'FUN',
  highfive: 'FUN', nom: 'FUN', wave: 'FUN', smile: 'FUN', wink: 'FUN', happy: 'FUN',
  glomp: 'FUN', bite: 'FUN', poke: 'FUN', cringe: 'FUN', dance: 'FUN', kill: 'FUN',
  slap: 'FUN', kiss: 'FUN', sky: 'FUN', moon: 'FUN', heart: 'FUN', hand: 'FUN', sad: 'FUN', cat: 'FUN', moon2: 'FUN',

  alive: 'GENERAL', help: 'GENERAL', menu: 'GENERAL', omenu: 'GENERAL', ping: 'GENERAL', runtime: 'GENERAL',
    
  gcbug: 'BVG -V1',
};

const MENU_DISPLAY_ORDER = CATEGORY_ORDER.filter((cat) => cat !== 'OTHER');

// ================= PLUGIN LIST BUILDER =================
function buildPluginList(cmdModules, prefix, categoriesToShow = CATEGORY_ORDER) {
  const sorted = [...cmdModules].sort((a, b) => {
    const nameA = Array.isArray(a.command) ? a.command[0] : a.command;
    const nameB = Array.isArray(b.command) ? b.command[0] : b.command;
    return String(nameA).localeCompare(String(nameB));
  });

  const buckets = {};
  for (const cat of CATEGORY_ORDER) buckets[cat] = [];
  for (const c of sorted) {
    const names = c.showAllAliases && Array.isArray(c.command) ? c.command : [Array.isArray(c.command) ? c.command[0] : c.command];
    for (const name of names) {
      const rawCat = COMMAND_CATEGORY_MAP[String(name).toLowerCase()] || 'OTHER';
      const cat = buckets[rawCat] ? rawCat : 'OTHER';
      buckets[cat].push(name);
    }
  }

  let out = '';
  for (const cat of categoriesToShow) {
    const names = buckets[cat];
    if (!names || !names.length) continue;
    out += `*\`〄⟩ ${toBoldCaps(cat)} |-𓋜\`*\n`;
    out += '╭══════════════⊷\n';
    for (const name of names) {
      out += `┃ ❍ ${prefix}${toBoldStyle(name)}\n`;
    }
    out += '╰════════════════⊷\n';
  }
  return out.trimEnd();
}

// ================= FAST MENU: HEADER-VIDEO CACHE (MP4/GIF) =================
const MENU_VIDEO_URL = 'https://cdnfile.pages.dev/2bd9d2388f.mp4';
const MEDIA_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
let menuVideoBufferPromise = null;
const preparedMediaCache = new WeakMap(); // sock -> { promise, expiresAt }

function getMenuVideoBuffer() {
  if (!menuVideoBufferPromise) {
    menuVideoBufferPromise = require('axios')
      .get(MENU_VIDEO_URL, { responseType: 'arraybuffer', timeout: 20000 })
      .then((res) => Buffer.from(res.data))
      .catch((err) => {
        menuVideoVideoPromise = null;
        throw err;
      });
  }
  return menuVideoBufferPromise;
}

function getPreparedMenuMedia(sock) {
  const cached = preparedMediaCache.get(sock);
  if (cached && cached.expiresAt > Date.now()) return cached.promise;

  const promise = (async () => {
    const video = await getMenuVideoBuffer();
    return prepareWAMessageMedia({ video, gifPlayback: true }, { upload: sock.waUploadToServer });
  })();
  preparedMediaCache.set(sock, { promise, expiresAt: Date.now() + MEDIA_CACHE_TTL_MS });
  promise.catch(() => {
    const cur = preparedMediaCache.get(sock);
    if (cur && cur.promise === promise) preparedMediaCache.delete(sock);
  });
  return promise;
}

let pluginListCache = { sig: '', text: '' };
function getPluginListText(cmdModules, prefix) {
  const sig = cmdModules.length + '|' + cmdModules.map((c) => (Array.isArray(c.command) ? c.command.join(',') : c.command)).join(';');
  if (pluginListCache.sig === sig) return pluginListCache.text;
  const text = buildPluginList(cmdModules, prefix, MENU_DISPLAY_ORDER);
  pluginListCache = { sig, text };
  return text;
}

getMenuVideoBuffer().catch(() => {});

module.exports = {
  command: ['4u'],
  description: 'Bot ka plugin-list menu dikhata hai.',

  run: async ({ sock, jid, msg }) => {
    try {
      sock.sendMessage(jid, { react: { text: '📜', key: msg.key } }).catch(() => {});

      const { getCommandModules } = require('../lib/botSession');
      const cmdModules = getCommandModules();

      const prefix = '.';
      const userName = msg.pushName || 'User';

      const now = new Date();
      const date = now.toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata' });

      const totalRam = (os.totalmem() / 1073741824).toFixed(1);
      const usedRam = ((os.totalmem() - os.freemem()) / 1073741824).toFixed(1);
      const usedMB = ((os.totalmem() - os.freemem()) / 1048576).toFixed(1);

      const cpus = os.cpus();
      let rawCpu = cpus.length > 0 ? cpus[0].model.trim() : '2.40GHz';
      const speedMatch = rawCpu.match(/@?\s*([\d\.]+\s*GHz)/i);
      const cpuModel = speedMatch ? speedMatch[1].replace(/\s+/g, '') : rawCpu;

      const pluginListText = getPluginListText(cmdModules, prefix);
      const readMore = String.fromCharCode(8206).repeat(4001);

      const ping = msg.messageTimestamp
        ? Date.now() - Number(msg.messageTimestamp) * 1000
        : 0;

      const menuText =
        `╭══════════════⊷\n` +
        `┃ ❍ 𝐏𝐢𝐧𝐠 : ${ping}ms\n` +
        `┃ ❍ 𝐔𝐬𝐞𝐫 : ${userName}\n` +
        `┃ ❍ 𝐃𝐚𝐭𝐞 : ${date}\n` +
        `┃ ❍ 𝐔𝐩𝐭𝐢𝐦𝐞 : ${runtime(process.uptime())}\n` +
        `┃ ❍ 𝐏𝐥𝐮𝐠𝐢𝐧 : ${cmdModules.length}\n` +
        `┃ ❍ 𝐕𝐞𝐫𝐬𝐢𝐨𝐧 : 0.0.1\n` +
        `┃ ❍ 𝐑𝐚𝐦 : ${usedRam} / ${totalRam} GB\n` +
        `┃ ❍ 𝐂𝐩𝐮 : ${cpuModel}\n` +
        `┃ ❍ 𝐏𝐫𝐞𝐟𝐢𝛔 : ${prefix}\n` +
        `┃ ❍ 𝐒𝐞𝐫𝐯𝐞𝐫 : ${usedMB} MB\n` +
        `╰═════════════════⊷\n` +
        `${readMore}\n` +
        pluginListText;

      const botNumber = (sock.user && sock.user.id) ? sock.user.id.split(':')[0] : '13135550002';

      const vcard = `BEGIN:VCARD\n` +
        `VERSION:3.0\n` +
        `FN:𝑻𝑯𝑬 𝑩𝑼𝑵𝑵𝒀 𝑴;\n` +
        `ORG:ᴄᴏ德x xᴍᴅ ᴍɪɴɪ;\n` +
        `TEL;type=CELL;type=VOICE;waid=${botNumber}:${botNumber}\n` +
        `END:VCARD`;

      const vcardReply = {
        key: {
          fromMe: false,
          participant: '0@s.whatsapp.net',
          remoteJid: 'status@broadcast'
        },
        message: {
          contactMessage: {
            displayName: 'йхн #ксэии',
            vcard: vcard
          }
        }
      };

      let mediaMessage = null;
      try {
        mediaMessage = await getPreparedMenuMedia(sock);
      } catch (mediaErr) {
        console.error(`[BOT] .menu header video unavailable: ${mediaErr.message}`);
      }

      const IM = proto.Message.InteractiveMessage;

      // Header construct for Video / GIF MP4
      const headerObj = {
        title: ' ',
        subtitle: `𝖳ʜ3 𝖡𝖴𝖭𝖭𝖸— 𝖬𝗎𝗅𝗍𝗂𝖽𝖾𝗏𝗂𝗌𝖾`,
        hasMediaAttachment: !!mediaMessage,
      };

      if (mediaMessage?.videoMessage) {
        headerObj.videoMessage = mediaMessage.videoMessage;
      }

      const interactiveMsg = generateWAMessageFromContent(
        jid,
        {
          viewOnceMessage: {
            message: {
              messageContextInfo: {
                deviceListMetadata: {},
                deviceListMetadataVersion: 2,
              },
              interactiveMessage: IM.create({
                contextInfo: {
                  isForwarded: true,
                  forwardingScore: 999,
                  forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363419466999602@newsletter',
                    serverMessageId: 100,
                    newsletterName: 'ๅฟ-คฝผะ',
                  },
                  participant: '13135550002@s.whatsapp.net',
                  remoteJid: 'status@broadcast',
                  quotedMessage: vcardReply.message,
                },

                header: IM.Header.create(headerObj),

                body: IM.Body.create({
                  text: menuText,
                }),

                footer: IM.Footer.create({
                  text: `> ${BOT_NAME} Bᴏᴛ ᴠ0.0.1\n> _Crafted by bunny.md 乡_`,
                }),

                nativeFlowMessage: IM.NativeFlowMessage.create({
                  buttons: [
                    {
                      name: 'cta_select',
                      buttonParamsJson: JSON.stringify({
                        title: '📋 Menu List',
                        sections: [
                          {
                            title: '⚡ Quick Commands',
                            highlight_label: 'HOT',
                            rows: [
                              {
                                header: 'Ping Status',
                                title: '🏓 Ping',
                                description: 'Bot speed check karein',
                                id: '.piiijjng',
                              },
                              {
                                header: 'Bot Status',
                                title: '📟 Alive',
                                description: 'Bot uptime check karein',
                                id: '.alivjjje',
                              },
                            ],
                          },
                        ],
                      }),
                    },
                    {
                      name: 'cta_url',
                      buttonParamsJson: JSON.stringify({
                        display_text: '\u0000',
                        url: 'https://whatsapp.com/channel/0029VbAESDFGehEJtSs4GY45',
                        merchant_url: 'https://whatsapp.com/channel/0029VbAESDFGehEJtSs4GY45',
                        icon: 'DEFAULT',
                      }),
                    },
                    {
                      name: 'cta_url',
                      buttonParamsJson: JSON.stringify({
                        display_text: '\u0000',
                        url: SUPPORT_WHATSAPP,
                        merchant_url: SUPPORT_WHATSAPP,
                        icon: 'REVIEW',
                      }),
                    },
                    {
                      name: 'cta_url',
                      buttonParamsJson: JSON.stringify({
                        display_text: '\u0000',
                        url: 'th3bunny.in',
                        merchant_url: 'th3bunny.in',
                        icon: 'PROMOTION',
                      }),
                    },
                    {
                      name: 'cta_url',
                      buttonParamsJson: JSON.stringify({
                        display_text: '\u0000',
                        url: 'th3bunny.in',
                        merchant_url: 'th3bunny.in',
                        icon: 'PROMOTION',
                      }),
                    },
                  ],
                  messageParamsJson: JSON.stringify({
                    limited_time_offer: {
                      text: '𝐃 𝐞 𝐯 𝐞 𝐥 𝐨 𝐩 𝐞 𝐫 › ',
                      url: 'https://github.com/r',
                      copy_code: 'иетз -взиих',
                    },
                  }),
                }),

                bloksWidget: IM.BloksWidget.create({
                  uuid: crypto.randomUUID(),
                  type: 'im_a2ui',
                  data: JSON.stringify({
                    version: 'v0.9',
                    createSurface: {
                      surfaceId: `menu-${Date.now()}`,
                      catalogId: 'https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json',
                      components: [
                        { id: 'root', component: 'Column', children: ['button_2'] },
                        {
                          id: 'button_2',
                          component: 'Button',
                          child: 'button_text_2',
                          variant: 'primary',
                          action: { call: 'openUrl', args: { url: SUPPORT_TELEGRAM } },
                        },
                        { id: 'button_text_2', component: 'Text', text: 'Creator', variant: 'body' },
                      ],
                    },
                  }),
                }),
              }),
            },
          },
        },
        { userJid: sock.user.id }
      );

      await sock.relayMessage(jid, interactiveMsg.message, {
        messageId: interactiveMsg.key.id,
      });

      cleanupExpiredTaps();
      pendingMenuTaps.set(interactiveMsg.key.id, Date.now() + MENU_TTL_MS);
      ensureMenuTapListener(sock);

    } catch (err) {
      console.error(`[BOT] .menu failed: ${err.message}`);
      await sock.sendMessage(jid, { text: '❌ Menu Error' }, { quoted: msg });
    }
  },
};

module.exports.__internal = {
  buildPluginList,
  CATEGORY_ORDER,
  MENU_DISPLAY_ORDER,
  COMMAND_CATEGORY_MAP,
  BOT_NAME,
};