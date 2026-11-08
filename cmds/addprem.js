/**
 * cmds/addprem.js
 * .addprem — OWNER ONLY. Adds a user to the premium list (this bot
 * number's own list — see lib/premiumStore.js).
 *
 * Usage:
 *   Reply to someone's message with `.addprem`
 *   OR
 *   `.addprem 91xxxxxxxxxx`
 */

const { isOwner, addPremium } = require('../lib/premiumStore');

module.exports = {
  command: ['addprem'],
  description: 'OWNER-ONLY. Adds a user to the premium list.',

  run: async ({ sock, jid, msg, args }) => {
    if (!(await isOwner(sock, jid, msg))) {
      await sock.sendMessage(jid, { text: '❌ Only the owner can use this command.' }, { quoted: msg });
      return;
    }

    // Target: whoever this message quotes, else the number passed as
    // an argument.
    let targetJid = null;
    const quotedParticipant = msg.message?.extendedTextMessage?.contextInfo?.participant;
    if (quotedParticipant) {
      targetJid = quotedParticipant;
    } else if (args[0]) {
      const num = args[0].replace(/[^0-9]/g, '');
      if (num) targetJid = `${num}@s.whatsapp.net`;
    }

    if (!targetJid) {
      await sock.sendMessage(
        jid,
        { text: '❌ *Usage:*\nReply to a user with `.addprem`\nOR\n`.addprem 91xxxxxxxxxx`' },
        { quoted: msg }
      );
      return;
    }

    const result = await addPremium(sock, jid, targetJid);

    if (!result.ok && result.reason === 'invalid') {
      await sock.sendMessage(jid, { text: '❌ Invalid number.' }, { quoted: msg });
      return;
    }
    if (!result.ok && result.reason === 'already') {
      await sock.sendMessage(jid, { text: 'ℹ️ This user is already premium.' }, { quoted: msg });
      return;
    }

    await sock.sendMessage(jid, { text: 'User added to premium successfully.' }, { quoted: msg });
  },
};
