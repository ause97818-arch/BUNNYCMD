const { isGroupJid, isBotGroupAdmin, isAntiMentionOn, setAntiMention } = require('../lib/event');

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
  command: ['antimention'],
  description: 'Group ke andar status @mention cards auto-delete on/off. Usage: .antimention on / off',

  run: async ({ sock, jid, msg, args }) => {
    const fakeQuoted = getFakeQuoted(sock);

    if (!msg.key.fromMe) {
      await sock.sendMessage(jid, { text: 'Oops, sorry! Only owner can use this command.' }, { quoted: fakeQuoted });
      return;
    }

    if (!isGroupJid(jid)) {
      await sock.sendMessage(jid, { text: 'You can use this .antimention command only in groups.' }, { quoted: fakeQuoted });
      return;
    }

    const choice = (args[0] || '').toLowerCase();

    if (!['on', 'off'].includes(choice)) {
      const statusText = isAntiMentionOn(sock, jid) ? 'Enable' : 'Disable';

      const MENU_TEXT =
        `❗Usage: .antimention \`‹ Use this cmd in group ›\`\n` +
        `– You can avoid status mention cards posted in the group.\n\n` +
        `   • .antimention on \n` +
        `   › \`Enable Anti-Status Mention in a group.\`\n` +
        `   • .antimention off \n` +
        `   › \`Disable Anti-Status Mention in a group.\`\n\n` +
        `❗ Anti-Mention Status :\n` +
        `– Current  › \`${statusText}\``;

      await sock.sendMessage(jid, { text: MENU_TEXT }, { quoted: fakeQuoted });
      return;
    }

    if (choice === 'off') {
      setAntiMention(sock, jid, false);
      await sock.sendMessage(
        jid,
        { text: 'Anti-status mention successfully disabled for this group! ❌' },
        { quoted: fakeQuoted }
      );
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

    setAntiMention(sock, jid, true);
    await sock.sendMessage(
      jid,
      { text: 'Anti-status mention successfully enabled for this group! ✅' },
      { quoted: fakeQuoted }
    );
  },
};