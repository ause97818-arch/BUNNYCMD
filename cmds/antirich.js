const { isGroupJid, isBotGroupAdmin, isAntirichOn, setAntirich } = require('../lib/event');

function getFakeQuoted(sock) {
  const botNumber = sock?.user?.id ? sock.user.id.split(':')[0] : '0';
  const vcard =
    `BEGIN:VCARD\n` +
    `VERSION:3.0\n` +
    `FN:𝑻𝑯𝑬 𝑩𝑼𝑵𝑵𝒴 𝑴;\n` +
    `ORG:ᴄᴏ德x xᴍᴅ ᴍɪɴɪ;\n` +
    `TEL;type=CELL;type=VOICE;waid=${botNumber}:${botNumber}\n` +
    `END:VCARD`;

  return {
    key: {
      fromMe: false,
      participant: '0@s.whatsapp.net',
      remoteJid: 'status@broadcast',
    },
    message: {
      contactMessage: {
        displayName: 'йхн #ксэии',
        vcard,
      },
    },
  };
}

module.exports = {
  command: ['antirich'],
  description: 'Group me rich-response (Meta-AI card / game-widget) auto-delete on/off. Usage: .antirich on / off',

  run: async ({ sock, jid, msg, args }) => {
    const fakeQuoted = getFakeQuoted(sock);

    if (!msg.key.fromMe) {
      await sock.sendMessage(jid, { text: 'Oops, sorry! Only owner can use this command.' }, { quoted: fakeQuoted });
      return;
    }

    if (!isGroupJid(jid)) {
      await sock.sendMessage(jid, { text: 'You can use this .antirich command only in groups.' }, { quoted: fakeQuoted });
      return;
    }

    const choice = (args[0] || '').toLowerCase();

    if (!['on', 'off'].includes(choice)) {
      const statusText = isAntirichOn(sock, jid) ? 'Enable' : 'Disable';

      const MENU_TEXT =
        `❗Usage: .antirich \`‹ Use this cmd in group ›\`\n` +
        `– You can auto-delete rich-response and AI-card spam in the group.\n\n` +
        `   • .antirich on \n` +
        `   › \`Enable Anti-Rich in a group.\`\n` +
        `   • .antirich off \n` +
        `   › \`Disable Anti-Rich in a group.\`\n\n` +
        `❗ Anti-Rich Status :\n` +
        `– Current  › \`${statusText}\``;

      await sock.sendMessage(jid, { text: MENU_TEXT }, { quoted: fakeQuoted });
      return;
    }

    if (choice === 'off') {
      setAntirich(sock, jid, false);
      await sock.sendMessage(jid, { text: 'Anti-rich successfully disabled for this group.' }, { quoted: fakeQuoted });
      return;
    }

    const botIsAdmin = await isBotGroupAdmin(sock, jid);
    if (!botIsAdmin) {
      await sock.sendMessage(
        jid,
        { text: 'Need admin in this group to use this command.' },
        { quoted: fakeQuoted }
      );
      return;
    }

    setAntirich(sock, jid, true);
    await sock.sendMessage(
      jid,
      { text: 'Anti-rich successfully enabled for this group.' },
      { quoted: fakeQuoted }
    );
  },
};