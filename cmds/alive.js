/**
 * cmds/alive.js
 *
 * .alive — replies (as a reply to the triggering message) mentioning
 * whoever ran the command, showing how long the bot process has been up.
 */

const { jidNormalizedUser } = require('@whiskeysockets/baileys');

function pad2(n) {
  return String(n).padStart(2, '0');
}

module.exports = {
  command: ['alive'],
  description: "Replies with the bot's uptime, mentioning whoever ran the command.",

  run: async ({ sock, jid, msg }) => {
    // Who actually sent .ping: in a group, the sender is msg.key.participant;
    // in a private chat where someone else messages the bot, it's
    // msg.key.remoteJid; if the owner sent it from their own linked
    // account (fromMe: true), the "sender" is the bot's own JID.
    const rawSenderJid = msg.key.fromMe
      ? sock.user.id
      : (msg.key.participant || msg.key.remoteJid);
    const senderJid = jidNormalizedUser(rawSenderJid);
    const senderNumber = senderJid.split('@')[0];

    const totalSeconds = Math.floor(process.uptime());
    const hours = pad2(Math.floor(totalSeconds / 3600));
    const minutes = pad2(Math.floor((totalSeconds % 3600) / 60));
    const seconds = pad2(totalSeconds % 60);

    const text =
      `𝐇ᴇʏ! @${senderNumber}\n` +
      `𝐈'ᴍ 𝐀ʟɪᴠᴇ 𝐅ʀᴏᴍ : ${hours}ʜ, ${minutes}ᴍ, ${seconds}s.`;

    await sock.sendMessage(
      jid,
      {
        text,
        // `mentions` is what makes "@<number>" render as an actual
        // clickable/highlighted WhatsApp mention instead of plain text.
        mentions: [senderJid],
      },
      // `quoted: msg` makes this land as a reply bubble to the .alive message.
      { quoted: msg }
    );
  },
};
