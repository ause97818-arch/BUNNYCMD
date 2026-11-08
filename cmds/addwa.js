/**
 * cmds/addwa.js
 * .addwa — Group me WhatsApp ka official account (0@s.whatsapp.net) add karta hai,
 * bilkul waise hi jaise cmds/addmeta.js Meta AI ko add karta hai.
 *
 * Note: .lid pehle se alag command hai (number -> @lid resolve), isliye ye naye naam se hai.
 */

const path = require('path');
const { isBotGroupAdmin } = require(path.join(__dirname, '..', 'lib', 'event'));

const WA_JID = '0@s.whatsapp.net';

module.exports = {
  command: ['addwa', 'addzero'],
  description: 'Group me WhatsApp official account (0@s.whatsapp.net) add karein.',

  run: async ({ sock, jid, msg }) => {
    // 1. Group validation
    if (!jid || !jid.endsWith('@g.us')) {
      return await sock.sendMessage(
        jid,
        { text: '❌ Yeh command sirf WhatsApp groups me kaam karega.' },
        { quoted: msg }
      );
    }

    sock.sendMessage(jid, { react: { text: '⏳', key: msg.key } }).catch(() => {});

    try {
      // 2. Bot ka admin hona zaroori hai (WhatsApp requirement)
      const botIsAdmin = await isBotGroupAdmin(sock, jid);
      if (!botIsAdmin) {
        await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } }).catch(() => {});
        return await sock.sendMessage(
          jid,
          { text: '❌ Is command ke liye bot ka group me admin hona zaroori hai.' },
          { quoted: msg }
        );
      }

      // 3. Add
      // WhatsApp server is account pe kabhi reply hi nahi deta (query 60s tak latak jata tha, tab tak
      // sirf ⏳ dikhta tha) — isliye 20s ka timeout, aur raw response hamesha dikhata/log karta hu.
      const response = await Promise.race([
        sock.groupParticipantsUpdate(jid, [WA_JID], 'add'),
        new Promise((_, reject) => setTimeout(() => reject(new Error('WhatsApp server ne 20s me reply nahi diya (timeout)')), 20_000)),
      ]);
      console.error('[addwa] raw response:', JSON.stringify(response));
      const status = String(response?.[0]?.status || '');

      // 200/201/202 = add ya request queue, 409 = pehle se group me hai
      if (['200', '201', '202', '409'].includes(status)) {
        await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } }).catch(() => {});
        return await sock.sendMessage(
          jid,
          { text: '✅ WhatsApp (0@s.whatsapp.net) group me add ho gaya hai!' },
          { quoted: msg }
        );
      }

      await sock.sendMessage(jid, { react: { text: '⚠️', key: msg.key } }).catch(() => {});
      return await sock.sendMessage(
        jid,
        { text: `⚠️ Add nahi ho paaya (Status Code: ${status || 'Unknown'}).\nRaw: ${JSON.stringify(response)}` },
        { quoted: msg }
      );
    } catch (err) {
      console.error('[addwa error]', err);
      await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } }).catch(() => {});
      await sock.sendMessage(
        jid,
        { text: '❌ Error: ' + (err.message || 'Add karne me dikkat aayi.') },
        { quoted: msg }
      );
    }
  },
};