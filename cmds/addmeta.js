/**
 * cmds/addmeta.js
 * .addmeta — Group me Meta AI official bot ko add karne ke liye
 *
 * Har JID ko 20s timeout ke saath try karta hai, aur FAIL hone par har JID ka
 * asli server status + bot ka FRESH admin status (cache nahi) reply me dikhata hai,
 * taaki 401 jaise error ki asli wajah pata chale.
 */

const path = require('path');
const { areJidsSameUser } = require('@whiskeysockets/baileys');
const { isBotGroupAdmin } = require(path.join(__dirname, '..', 'lib', 'event'));

// Primary and Fallback JIDs for Meta AI
// (867051314767696@bot = Meta AI ka bot-id, mere khayal se — unverified, isliye last me)
const META_AI_JIDS = [
  '13135550002@s.whatsapp.net',
  '867051314767696@bot',
  '11111111111@bot'
];

const withTimeout = (p, ms, label) =>
  Promise.race([
    p,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${label}: ${ms / 1000}s timeout`)), ms)),
  ]);

module.exports = {
  command: ['addmeta', 'metaadd'],
  description: 'Group me official Meta AI ko add karein.',

  run: async ({ sock, jid, msg }) => {
    // 1. Group validation check
    if (!jid || !jid.endsWith('@g.us')) {
      return await sock.sendMessage(
        jid,
        { text: '❌ Yeh command sirf WhatsApp groups me kaam karega.' },
        { quoted: msg }
      );
    }

    sock.sendMessage(jid, { react: { text: '⏳', key: msg.key } }).catch(() => {});

    try {
      // 2. Admin verification using lib/event.js
      const botIsAdmin = await isBotGroupAdmin(sock, jid);

      if (!botIsAdmin) {
        await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } }).catch(() => {});
        return await sock.sendMessage(
          jid,
          { text: '❌ 𝖭ᴇᴇᴅ ᴀᴅᴍɪɴ ɪɴ ᴛʜɪs ɢʀᴏᴜᴘ ғᴏʀ ᴜsᴇᴅ ᴛʜɪs ᴄᴏᴍᴍᴀɴᴅ.' },
          { quoted: msg }
        );
      }

      // 3. Try adding Meta AI with each JID, collect real status of each
      let success = false;
      const tried = [];

      for (const targetJid of META_AI_JIDS) {
        try {
          const response = await withTimeout(
            sock.groupParticipantsUpdate(jid, [targetJid], 'add'),
            20_000,
            targetJid
          );
          console.error(`[addmeta] ${targetJid} ->`, JSON.stringify(response));

          const resStatus = String(response?.[0]?.status || '');
          tried.push(`${targetJid} → ${resStatus || 'no status'}`);

          // HTTP 200, 201, or 202 signify successful addition or request queued
          if (['200', '201', '202', '409'].includes(resStatus)) {
            success = true;
            break;
          }
        } catch (e) {
          console.error(`[addmeta] JID ${targetJid} try failed:`, e.message);
          tried.push(`${targetJid} → error: ${e.message}`);
        }
      }

      if (success) {
        await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } }).catch(() => {});
        return await sock.sendMessage(
          jid,
          { text: '✅ **Meta AI successfully group me add ho gaya hai!**' },
          { quoted: msg }
        );
      }

      // Failure diagnostics: FRESH metadata (cache bypass) se bot ka asli admin status + group add-mode
      let diag = '';
      try {
        const meta = await withTimeout(sock.groupMetadata(jid), 10_000, 'groupMetadata');
        const candidates = [sock.user?.id, sock.user?.lid].filter(Boolean);
        const me = meta.participants.find((p) => candidates.some((c) => areJidsSameUser(p.id, c)));
        diag =
          `\n\nBot admin (fresh check): ${me ? (me.admin || 'NOT admin') : 'participant list me nahi mila'}` +
          `\nMember add mode: ${meta.memberAddMode === undefined ? 'unknown' : meta.memberAddMode ? 'all members' : 'admins only'}`;
      } catch (e) {
        diag = `\n\nFresh metadata fetch fail: ${e.message}`;
      }

      await sock.sendMessage(jid, { react: { text: '⚠️', key: msg.key } }).catch(() => {});
      return await sock.sendMessage(
        jid,
        { text: `⚠️ Meta AI add nahi ho paaya.\n\n${tried.join('\n')}${diag}` },
        { quoted: msg }
      );
    } catch (err) {
      console.error('[addmeta error]', err);
      await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } }).catch(() => {});
      await sock.sendMessage(
        jid,
        { text: '❌ Error: ' + (err.message || 'Meta AI add karne me dikkat aayi.') },
        { quoted: msg }
      );
    }
  },
};