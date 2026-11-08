const { isGroupJid, isBotGroupAdmin, getAntilinkConfig, setAntilink } = require('../lib/event');

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
  command: ['antilink'],
  description: 'Group me link-detect on/off/mode. Usage: .antilink on / off / delete / kick',

  run: async ({ sock, jid, msg, args }) => {
    const fakeQuoted = getFakeQuoted(sock);

    if (!msg.key.fromMe) {
      await sock.sendMessage(jid, { text: 'Oops, sorry! Only owner can use this command.' }, { quoted: fakeQuoted });
      return;
    }

    if (!isGroupJid(jid)) {
      await sock.sendMessage(jid, { text: 'You can use this .antilink command only in groups.' }, { quoted: fakeQuoted });
      return;
    }

    const choice = (args[0] || '').toLowerCase();

    if (!['on', 'off', 'delete', 'kick'].includes(choice)) {
      const { enabled, mode } = getAntilinkConfig(sock, jid);
      const statusText = enabled ? 'Enable' : 'Disable';
      const modeText = mode ? mode.charAt(0).toUpperCase() + mode.slice(1) : 'Delete';

      const MENU_TEXT =
        `❗Usage: .antilink \`‹ Use this cmd in group ›\`\n` +
        `– You can avoid link post in group by members.\n\n` +
        `   • .antilink on \n` +
        `   › \`Enable Antilink In a group.\`\n` +
        `   • .antilink off \n` +
        `   › \`Disable Antilink In a group.\`\n` +
        `   • .antilink delete \n` +
        `   › \`Only delete the link that sent.\`\n` +
        `   • .antilink kick \n` +
        `   › \`Delete the link and kick the link sender user.\`\n\n` +
        `❗ Antilink Status :\n` +
        `– Current  › \`${statusText}\`\n` +
        `– Mode  › \`${modeText}\``;

      await sock.sendMessage(jid, { text: MENU_TEXT }, { quoted: fakeQuoted });
      return;
    }

    if (choice === 'off') {
      setAntilink(sock, jid, false);
      await sock.sendMessage(jid, { text: 'Antilink disabled for this group.' }, { quoted: fakeQuoted });
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

    if (choice === 'on') {
      setAntilink(sock, jid, true, 'delete');
      await sock.sendMessage(jid, { text: 'Antilink enabled for this group.' }, { quoted: fakeQuoted });
      return;
    }

    if (choice === 'delete') {
      setAntilink(sock, jid, true, 'delete');
      await sock.sendMessage(jid, { text: 'Antilink mode set to delete.' }, { quoted: fakeQuoted });
      return;
    }

    setAntilink(sock, jid, true, 'kick');
    await sock.sendMessage(
      jid,
      { text: 'Antilink mode set to kick + delete.' },
      { quoted: fakeQuoted }
    );
  },
};