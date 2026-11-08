/**
 * cmds/autorecording.js
 *
 * .autorecording on   -> jis kisi (khud ko chhod ke) ki chat se message
 *                         aayega, us jid ko "recording audio..." dikhega
 * .autorecording off  -> default (DEFAULT bhi yehi hai)
 *
 * Per-session (multi-session-safe) — lib/chatPresence.js.
 */

const { isAutoRecording, setAutoRecording } = require('../lib/chatPresence');

module.exports = {
  command: ['autorecording'],
  description: 'Har incoming chat me "recording audio..." dikhane ka toggle. Usage: .autorecording on / off',

  run: async ({ sock, jid, msg, args }) => {
    if (!msg.key.fromMe) {
      await sock.sendMessage(jid, { text: '𝖳ʜɪs ᴄᴏᴍᴍᴀɴᴅ ᴏɴʟʏ ᴄᴀɴ ᴜsᴇ ᴏᴡɴᴇʀ.' }, { quoted: msg });
      return;
    }

    const sub = (args[0] || '').toLowerCase();

    if (sub === 'on') {
      setAutoRecording(sock, true);
      await sock.sendMessage(jid, { text: '𝖠ᴜᴛᴏ 𝖱ᴇᴄᴏʀᴅɪɴɢ : ᴏɴ ✅' }, { quoted: msg });
      return;
    }

    if (sub === 'off') {
      setAutoRecording(sock, false);
      await sock.sendMessage(jid, { text: '𝖠ᴜᴛᴏ 𝖱ᴇᴄᴏʀᴅɪɴɢ : ᴏғғ ❌' }, { quoted: msg });
      return;
    }

    await sock.sendMessage(
      jid,
      {
        text:
          '⚠️ 𝖴sᴀɢᴇ: `.autorecording on` / `.autorecording off`\n' +
          `𝖢ᴜʀʀᴇɴᴛ 𝖲ᴛs : *${isAutoRecording(sock) ? 'ᴏɴ' : 'ᴏғғ'}*`,
      },
      { quoted: msg }
    );
  },
};
