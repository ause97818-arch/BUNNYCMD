/**
 * cmds/autoseen.js
 *
 * .autoseen on   -> jis kisi (khud ko chhod ke) ki chat se v message
 *                    aayega, wo turant seen (blue-tick) ho jayega
 * .autoseen off  -> default (DEFAULT bhi yehi hai)
 *
 * Per-session (multi-session-safe) — lib/chatPresence.js.
 */

const { isAutoSeen, setAutoSeen } = require('../lib/chatPresence');

module.exports = {
  command: ['autoseen'],
  description: 'Har incoming chat message auto-seen karne ka toggle. Usage: .autoseen on / off',

  run: async ({ sock, jid, msg, args }) => {
    if (!msg.key.fromMe) {
      await sock.sendMessage(jid, { text: '𝖳ʜɪs ᴄᴏᴍᴍᴀɴᴅ ᴏɴʟʏ ᴄᴀɴ ᴜsᴇ ᴏᴡɴᴇʀ.' }, { quoted: msg });
      return;
    }

    const sub = (args[0] || '').toLowerCase();

    if (sub === 'on') {
      setAutoSeen(sock, true);
      await sock.sendMessage(jid, { text: '𝖠ᴜᴛᴏ 𝖲ᴇᴇɴ : ᴏɴ ✅' }, { quoted: msg });
      return;
    }

    if (sub === 'off') {
      setAutoSeen(sock, false);
      await sock.sendMessage(jid, { text: '𝖠ᴜᴛᴏ 𝖲ᴇᴇɴ : ᴏғғ ❌' }, { quoted: msg });
      return;
    }

    await sock.sendMessage(
      jid,
      {
        text:
          '⚠️ 𝖴sᴀɢᴇ: `.autoseen on` / `.autoseen off`\n' +
          `𝖢ᴜʀʀᴇɴᴛ 𝖲ᴛs : *${isAutoSeen(sock) ? 'ᴏɴ' : 'ᴏғғ'}*`,
      },
      { quoted: msg }
    );
  },
};
