/**
 * cmds/add.js
 *
 * .add +91XXXXXXXXXX [+91XXXXXXXXXX ...]
 *
 * Group me number(s) ko directly ADD karta hai (kick.js ka opposite —
 * same admin-permission pattern follow karta hai).
 *
 * REQUIREMENTS:
 *   - Sirf GROUP me chalta hai.
 *   - BOT khud group me ADMIN hona chahiye (WhatsApp requirement — bina
 *     admin power ke koi participant add nahi kar sakta).
 *   - COMMAND chalane wala bhi group-ADMIN hona chahiye (ya bot-owner,
 *     fromMe) — warna koi bhi random member arbitrary numbers group me
 *     spam kar sakta tha. (kick.js is check ke bina hai — .add ke liye
 *     ye extra safety zaroori lagi, jaisa .welcome me bhi hai.)
 *
 * WhatsApp har number ke liye alag status code deta hai (already in
 * group / privacy-restricted / not on WhatsApp / etc.) — sab handle
 * kiya hai, har number ka result alag se dikhta hai.
 */

const { isGroupJid, isBotGroupAdmin, isSenderGroupAdmin } = require('../lib/event');

const MIN_DIGITS = 7;
const MAX_DIGITS = 15; // E.164 max

/** "+91 98765-43210" jaisi kisi bhi format se saaf digits nikalta hai. */
function toDigits(raw) {
  return (raw || '').replace(/\D/g, '');
}

/**
 * WhatsApp ke group-participant status codes ko readable message me
 * convert karta hai. Codes standard WhatsApp XMPP responses hain.
 */
function describeStatus(status) {
  switch (String(status)) {
    case '200':
      return { ok: true, label: '✅ Added' };
    case '403':
      return { ok: false, label: '⚠️ Privacy-restricted (invite bhejni padegi)' };
    case '404':
      return { ok: false, label: '❌ WhatsApp pe nahi mila' };
    case '408':
      return { ok: false, label: '⚠️ Invite bhej di gayi (direct add nahi hua)' };
    case '409':
      return { ok: false, label: 'ℹ️ Already group me hai' };
    default:
      return { ok: false, label: `❌ Fail (code ${status})` };
  }
}

module.exports = {
  command: ['add'],
  description: 'Number(s) ko group me add karta hai (bot + sender dono admin hone chahiye). Usage: .add +91XXXXXXXXXX',

  run: async ({ sock, jid, msg, args }) => {
    // 1) Sirf group me.
    if (!isGroupJid(jid)) {
      await sock.sendMessage(jid, { text: '❌𝖳ʜɪs ᴄᴏᴍᴍᴀɴᴅ ᴏɴʟʏ ᴄᴀɴ ᴜsᴇ ɪɴ ɢʀᴏᴜᴘs.' }, { quoted: msg });
      return;
    }

    // 2) Bot khud admin hona chahiye.
    const botIsAdmin = await isBotGroupAdmin(sock, jid);
    if (!botIsAdmin) {
      await sock.sendMessage(jid, { text: '❌𝖭ᴇᴇᴅ ᴀᴅᴍɪɴ ғᴏʀ ᴜsᴇᴅ ᴛʜɪs ᴄᴏᴍᴍᴀɴᴅ .' }, { quoted: msg });
      return;
    }

    // 3) Sender bhi admin hona chahiye (ya bot-owner khud, fromMe).
    const senderJid = msg.key.participant || msg.key.remoteJid;
    const senderIsAllowed = msg.key.fromMe || (await isSenderGroupAdmin(sock, jid, senderJid));
    if (!senderIsAllowed) {
      await sock.sendMessage(jid, { text: '❌ Sirf group ADMINS ye command chala sakte hai.' }, { quoted: msg });
      return;
    }

    // 4) Number(s) parse karo — usage message agar kuch nahi diya.
    if (!args || args.length === 0) {
      await sock.sendMessage(
        jid,
        { text: '𝖴sᴀɢᴇ: .add +919883444xxx23\n𝖮ʀ multiple: .add +919883444xxx23 +919883444xxx23' },
        { quoted: msg }
      );
      return;
    }

    const seen = new Set();
    const invalid = [];
    const targets = []; // { digits, jid }

    for (const raw of args) {
      const digits = toDigits(raw);
      if (digits.length < MIN_DIGITS || digits.length > MAX_DIGITS) {
        invalid.push(raw);
        continue;
      }
      if (seen.has(digits)) continue; // dedupe
      seen.add(digits);
      targets.push({ digits, jid: `${digits}@s.whatsapp.net` });
    }

    if (targets.length === 0) {
      await sock.sendMessage(
        jid,
        { text: `❌ Koi valid number nahi mila.\n𝖴sᴀɢᴇ: .add +91XXXXXXXXXX` },
        { quoted: msg }
      );
      return;
    }

    // 5) Bot khud ko add karne ki koshish na kare (galti se).
    const botOwnDigits = (sock.user?.id || '').split(':')[0].split('@')[0];
    const filteredTargets = targets.filter((t) => t.digits !== botOwnDigits);
    if (filteredTargets.length !== targets.length) {
      invalid.push('(bot ka apna number skip kiya)');
    }

    if (filteredTargets.length === 0) {
      await sock.sendMessage(jid, { text: '𝖨 ᴄᴀɴɴᴏᴛ ᴀᴅᴅ ᴍʏsᴇʟғ 😅!!' }, { quoted: msg });
      return;
    }

    try {
      const results = await sock.groupParticipantsUpdate(
        jid,
        filteredTargets.map((t) => t.jid),
        'add'
      );

      const lines = [];
      const mentions = [];

      for (const t of filteredTargets) {
        const r = results.find((res) => res.jid === t.jid || res.jid?.startsWith(t.digits));
        const { label } = describeStatus(r?.status);
        lines.push(`${label} — @${t.digits}`);
        mentions.push(t.jid);
      }

      if (invalid.length) {
        lines.push('', `❌ Invalid/skipped: ${invalid.join(', ')}`);
      }

      await sock.sendMessage(
        jid,
        { text: lines.join('\n'), mentions },
        { quoted: msg }
      );
    } catch (err) {
      console.error(`[BOT] .add failed in ${jid}: ${err.message}`);
      await sock.sendMessage(jid, { text: `Add fail ho gaya: ${err.message}` }, { quoted: msg });
    }
  },
};
