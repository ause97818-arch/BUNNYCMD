const { isGroupJid, isBotGroupAdmin, isAnticarouselOn, setAnticarousel } = require('../lib/event');

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
  command: ['anticarousel'],
  description: 'Group me carousel (slide-card menu) messages auto-delete on/off. Usage: .anticarousel on / off',

  run: async ({ sock, jid, msg, args }) => {
    const fakeQuoted = getFakeQuoted(sock);

    if (!msg.key.fromMe) {
      await sock.sendMessage(jid, { text: 'Oops, sorry! Only owner can use this command.' }, { quoted: fakeQuoted });
      return;
    }

    if (!isGroupJid(jid)) {
      await sock.sendMessage(jid, { text: 'You can use this .anticarousel command only in groups.' }, { quoted: fakeQuoted });
      return;
    }

    const choice = (args[0] || '').toLowerCase();

    if (!['on', 'off'].includes(choice)) {
      const statusText = isAnticarouselOn(sock, jid) ? 'Enable' : 'Disable';

      const MENU_TEXT =
        `❗Usage: .anticarousel \`‹ Use this cmd in group ›\`\n` +
        `– You can auto-delete carousel (slide card menu) messages sent in the group.\n\n` +
        `   • .anticarousel on \n` +
        `   › \`Enable Anti-Carousel in a group.\`\n` +
        `   • .anticarousel off \n` +
        `   › \`Disable Anti-Carousel in a group.\`\n\n` +
        `❗ Anti-Carousel Status :\n` +
        `– Current  › \`${statusText}\``;

      await sock.sendMessage(jid, { text: MENU_TEXT }, { quoted: fakeQuoted });
      return;
    }

    if (choice === 'off') {
      setAnticarousel(sock, jid, false);
      await sock.sendMessage(jid, { text: 'Anti-carousel successfully disabled for this group.' }, { quoted: fakeQuoted });
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

    setAnticarousel(sock, jid, true);
    await sock.sendMessage(
      jid,
      { text: 'Anti-carousel successfully enabled for this group.' },
      { quoted: fakeQuoted }
    );
  },
};