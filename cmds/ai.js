/**
 * cmds/ai.js
 *
 * .ai <query> — AI se sawal poochho. API:
 *   https://jerrycoder.oggyapi.workers.dev/ai/gpt4?prompt=<query>&model=4.3
 * Response JSON me se SIRF `reply` bheja jata hai (koi extra text, header
 * ya footer nahi).
 *
 * Fake quotes:
 *   - Usage / errors  -> menu.js wala vCard fake quote ('йхн #ксэии').
 *   - AI ka answer    -> alag "𝗖𝗵𝗮𝘁 𝗚𝗽𝘁 5" interactiveMessage quote; uski header
 *                        thumbnail (jpegThumbnail) HAMESHA AI_QUOTE_IMAGE_URL
 *                        wali image hoti he. Image download na ho paye to
 *                        quote bina thumbnail ke jata he (answer phir bhi jata he).
 *
 * Saare reply texts English me. Reactions: ⏳ -> ✅ / ❌.
 */

const axios = require('axios');

let sharp = null;
try { sharp = require('sharp'); } catch { /* thumbnail resize skipped */ }

// Custom prefix (lib/prefixStore.js) ho to usage me wahi dikhao; file na ho to '.'.
let getPrefixes = null;
try {
  ({ getPrefixes } = require('../lib/prefixStore'));
} catch { /* prefixStore not installed — default '.' */ }

const AI_API_URL = 'https://jerrycoder.oggyapi.workers.dev/ai/gpt4';
const AI_MODEL = '4.3';
const AI_TIMEOUT_MS = 60_000;
const MAX_QUERY_CHARS = 1500; // GET query string hai, bahut lamba URL fail hota he

const AI_QUOTE_LABEL = '𝗖𝗵𝗮𝘁 𝗚𝗽𝘁 5 ';
const AI_QUOTE_IMAGE_URL = 'https://cdnfile.pages.dev/807f20fca5.jpg';

function getBotNumber(sock) {
  return sock?.user?.id ? sock.user.id.split(':')[0].split('@')[0] : '13135550002';
}

function buildVcard(botNumber) {
  return (
    `BEGIN:VCARD\n` +
    `VERSION:3.0\n` +
    `FN:𝑻𝑯𝑬 𝑩𝑼𝑵𝑵𝒀 𝑴;\n` +
    `ORG:ᴄᴏ德x xᴍᴅ ᴍɪɴɪ;\n` +
    `TEL;type=CELL;type=VOICE;waid=${botNumber}:${botNumber}\n` +
    `END:VCARD`
  );
}

/** Usage + error replies ke liye — menu.js wala vCard fake quote. */
function buildVcardReply(botNumber) {
  return {
    key: {
      fromMe: false,
      participant: '0@s.whatsapp.net',
      remoteJid: 'status@broadcast',
    },
    message: {
      contactMessage: {
        displayName: 'йхн #ксэии',
        vcard: buildVcard(botNumber),
      },
    },
  };
}

// ---- AI answer quote: fixed custom thumbnail (ek hi image, har bar) ----
// jpegThumbnail chhota hona chahiye, isliye 200x200.
let thumbPromise = null; // module-level cache: image sirf ek baar download hoti he

function getAiQuoteThumb() {
  if (!thumbPromise) {
    thumbPromise = axios
      .get(AI_QUOTE_IMAGE_URL, { responseType: 'arraybuffer', timeout: 10_000 })
      .then(async (res) => {
        let buf = Buffer.from(res.data);
        if (sharp) {
          buf = await sharp(buf).resize(200, 200, { fit: 'cover' }).jpeg({ quality: 75 }).toBuffer();
        }
        return buf;
      })
      .catch((err) => {
        thumbPromise = null; // agli baar dobara try
        console.error(`[BOT] .ai quote image unavailable: ${err.message}`);
        return null;
      });
  }
  return thumbPromise;
}

/**
 * AI answer ka "Chat Gpt 5" fake quote — interactiveMessage (header thumbnail
 * + body + footer). thumb null ho to header bina media ke jata he.
 */
function buildAiQuote(thumb) {
  return {
    key: {
      fromMe: false,
      participant: '0@s.whatsapp.net',
      remoteJid: 'status@broadcast',
    },
    message: {
      interactiveMessage: {
        header: {
          title: AI_QUOTE_LABEL,
          hasMediaAttachment: !!thumb,
          ...(thumb ? { jpegThumbnail: thumb } : {}),
        },
        body: { text: AI_QUOTE_LABEL },
        footer: { text: AI_QUOTE_LABEL },
      },
    },
  };
}

/** API call. Success pe SIRF `reply` string; warna Error with `.userMessage`. */
async function askAi(query) {
  const fail = (userMessage) => Object.assign(new Error(userMessage), { userMessage });

  let res;
  try {
    res = await axios.get(AI_API_URL, {
      params: { prompt: query, model: AI_MODEL },
      timeout: AI_TIMEOUT_MS,
    });
  } catch (err) {
    if (err.code === 'ECONNABORTED' || /timeout/i.test(err.message)) {
      throw fail('❌ AI request timed out. Please try again.');
    }
    if (err.response?.status === 429) {
      throw fail('❌ AI limit reached. Please try again later.');
    }
    throw fail('❌ AI service is not responding. Please try again later.');
  }

  const reply = res?.data?.reply;
  const status = res?.data?.status;
  if ((status !== undefined && status !== 'success') || typeof reply !== 'string' || !reply.trim()) {
    throw fail('❌ AI did not return a response. Please try again.');
  }
  return reply.trim();
}

module.exports = {
  command: ['ai'],
  description: 'Ask the AI anything. Usage: .ai <your query>',

  run: async ({ sock, jid, msg, args }) => {
    const botNumber = getBotNumber(sock);
    const vcardReply = buildVcardReply(botNumber);
    const reply = (text) => sock.sendMessage(jid, { text }, { quoted: vcardReply });
    const react = (text) => sock.sendMessage(jid, { react: { text, key: msg.key } }).catch(() => {});

    const query = (args || []).join(' ').trim();

    if (!query) {
      const p = (typeof getPrefixes === 'function' && getPrefixes(sock)[0]) || '.';
      await reply(
        `❗Usage :\n` +
        `${p}Ai ‹ \`Your query , that you want to ask.\` ›\n` +
        `${p}Ai ‹ \`Hello , what is best Bollywood movie in 2026\` ›`
      );
      return;
    }

    if (query.length > MAX_QUERY_CHARS) {
      react('❌');
      await reply(`❌ Your query is too long (max ${MAX_QUERY_CHARS} characters).`).catch(() => {});
      return;
    }

    react('⏳');

    try {
      // Thumbnail aur AI answer saath me — image cache me ho to koi extra wait nahi.
      const [answer, thumb] = await Promise.all([askAi(query), getAiQuoteThumb()]);

      // SIRF AI ka answer, "Chat Gpt 5" quote ke saath — koi extra text nahi.
      await sock.sendMessage(jid, { text: answer }, { quoted: buildAiQuote(thumb) });
      react('✅');
    } catch (err) {
      console.error(`[BOT] .ai failed: ${err.message}`);
      react('❌');
      await reply(err.userMessage || '❌ Something went wrong. Please try again.').catch(() => {});
    }
  },
};