/**
 * cmds/autotyping.js
 *
 * .autotyping on   -> jis kisi (khud ko chhod ke) ki chat se message
 *                      aayega, us jid ko "typing..." dikhega
 * .autotyping off  -> default (DEFAULT bhi yehi hai)
 *
 * Per-session (multi-session-safe) — lib/chatPresence.js.
 */

const { isAutoTyping, setAutoTyping } = require('../lib/chatPresence');

module.exports = {
  command: ['autotyping'],
  description: 'Har incoming chat me "typing..." dikhane ka toggle. Usage: .autotyping on / off',

  run: async ({ sock, jid, msg, args }) => {
    if (!msg.key.fromMe) {
      await sock.sendMessage(jid, { text: '𝖳ʜɪs ᴄᴏᴍᴍᴀɴᴅ ᴏɴʟʏ ᴄᴀɴ ᴜsᴇ ᴏᴡɴᴇʀ.' }, { quoted: msg });
      return;
    }

    const sub = (args[0] || '').toLowerCase();

    if (sub === 'on') {
      setAutoTyping(sock, true);
      await sock.sendMessage(jid, { text: '𝖠ᴜᴛᴏ 𝖳ʏᴘɪɴɢ : ᴏɴ ✅' }, { quoted: msg });
      return;
    }

    if (sub === 'off') {
      setAutoTyping(sock, false);
      await sock.sendMessage(jid, { text: '𝖠ᴜᴛᴏ 𝖳ʏᴘɪɴɢ : ᴏғғ ❌' }, { quoted: msg });
      return;
    }

    await sock.sendMessage(
      jid,
      {
        text:
          '⚠️ 𝖴sᴀɢᴇ: `.autotyping on` / `.autotyping off`\n' +
          `𝖢ᴜʀʀᴇɴᴛ 𝖲ᴛs : *${isAutoTyping(sock) ? 'ᴏɴ' : 'ᴏғғ'}*`,
      },
      { quoted: msg }
    );
  },
};
