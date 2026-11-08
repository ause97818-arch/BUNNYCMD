/**
 * cmds/antidelete.js
 *
 * .antidelete        -> status menu (ON/OFF + kitne messages cache me hai)
 * .antidelete on     -> enable — ab se har "Delete for everyone" ka
 *                       report + original text/media bot ke apne self-chat
 *                       (linked account ka khud ka number) me aayega
 * .antidelete off    -> disable
 *
 * Asal detect+cache+forward ka kaam lib/antidelete.js me hota hai (wired
 * into lib/botSession.js aur lib/multiSession.js dono ke messages.upsert
 * listener me) — ye command sirf on/off switch + status hai, antilink.js
 * jaisa hi shape.
 */

const { getAntideleteConfig, setAntidelete, getCacheSize } = require('../lib/antidelete');

module.exports = {
  command: ['antidelete'],
  description: 'Deleted messages/media ko apne self-chat me forward karta hai. Usage: .antidelete on / off',

  run: async ({ sock, jid, msg, args }) => {
    if (!msg.key.fromMe) {
      await sock.sendMessage(
        jid,
        { text: 'ᴏᴘsss , sᴏʀʀʏ! ᴏɴʟʏ ᴏᴡɴᴇʀ ᴄᴀɴ ᴜsᴇᴅ ᴛʜɪs ᴄᴏᴍᴍᴀɴᴅ.' },
        { quoted: msg }
      );
      return;
    }

    const choice = (args[0] || '').toLowerCase();

    if (choice === 'on') {
      setAntidelete(sock, true);
      await sock.sendMessage(
        jid,
        {
          text:
            `✅ *𝖠ɴᴛɪᴅᴇʟᴇᴛᴇ ᴇɴᴀʙʟᴇᴅ*\n` +
            `Ab se koi bhi (khud ke alawa) delete kiya hua message/media ` +
            `aapke apne self-chat me forward hoga.`,
        },
        { quoted: msg }
      );
      return;
    }

    if (choice === 'off') {
      setAntidelete(sock, false);
      await sock.sendMessage(jid, { text: '❌ *𝖠ɴᴛɪᴅᴇʟᴇᴛᴇ ᴅɪsᴀʙʟᴇᴅ.*' }, { quoted: msg });
      return;
    }

    // Args ke bina — status dikhao
    const { enabled } = getAntideleteConfig(sock);
    const status = enabled ? 'ON ✅' : 'OFF ❌';
    const cached = getCacheSize(sock);

    await sock.sendMessage(
      jid,
      {
        text:
          `🛡️ *𝖠ɴᴛɪᴅᴇʟᴇᴛᴇ*\n\n` +
          `┃ Sᴛᴀᴛᴜs: ${status}\n` +
          `┃ Cᴀᴄʜᴇᴅ: ${cached} msg(s)\n` +
          `┃﹏﹏﹏﹏﹏﹏﹏﹏﹏\n` +
          `┃ \`.antidelete on\`  — enable\n` +
          `┃ \`.antidelete off\` — disable`,
      },
      { quoted: msg }
    );
  },
};
