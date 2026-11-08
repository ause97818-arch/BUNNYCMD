const { getAnticallMode, setAnticall, setAnticallMsg, deleteAnticallState } = require('../lib/anticall');

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

function getRawText(msg) {
  const m = msg?.message;
  return (
    m?.conversation ||
    m?.extendedTextMessage?.text ||
    m?.imageMessage?.caption ||
    m?.videoMessage?.caption ||
    ''
  );
}

module.exports = {
  command: ['anticall'],
  description: 'Private chat se aane wale voice/video call handle karo. Usage: .anticall on / block / off',

  run: async ({ sock, jid, msg, args }) => {
    const fakeQuoted = getFakeQuoted(sock);

    if (!msg.key.fromMe) {
      await sock.sendMessage(jid, { text: 'Oops, sorry! Only owner can use this command.' }, { quoted: fakeQuoted });
      return;
    }

    const choice = String(args?.[0] || '').toLowerCase();

    if (choice === 'on') {
      setAnticall(sock, 'on');
      await sock.sendMessage(jid, { text: 'Anticall successfully enabled (cut only). ✅' }, { quoted: fakeQuoted });
      return;
    }

    if (choice === 'block') {
      setAnticall(sock, 'block');
      await sock.sendMessage(jid, { text: 'Anticall successfully enabled (cut + block). 🚫' }, { quoted: fakeQuoted });
      return;
    }

    if (choice === 'off') {
      setAnticall(sock, 'off');
      await sock.sendMessage(jid, { text: 'Anticall successfully disabled. ✅' }, { quoted: fakeQuoted });
      return;
    }

    if (choice === 'setmsg') {
      const rawText = getRawText(msg);
      const match = rawText.match(/^\S+\s+setmsg\s([\s\S]*)$/i);
      const customMsg = match ? match[1] : '';

      if (!customMsg.trim()) {
        await sock.sendMessage(
          jid,
          { text: 'Usage: .anticall setmsg <your message>\n\n(Ye msg sirf "cut only" mode me kaam karta hai, "block" mode me nahi.)' },
          { quoted: fakeQuoted }
        );
        return;
      }

      setAnticallMsg(sock, customMsg);
      await sock.sendMessage(jid, { text: 'Successfully set your anticall msg! ✅' }, { quoted: fakeQuoted });
      return;
    }

    if (choice === 'delete') {
      await deleteAnticallState(sock);
      await sock.sendMessage(
        jid,
        { text: 'Anticall setting (this session) deleted — reset to default (off). 🗑️' },
        { quoted: fakeQuoted }
      );
      return;
    }

    const currentMode = getAnticallMode(sock);
    const statusText = currentMode === 'off' ? 'Disable' : 'Enable';
    const modeText = currentMode === 'block' ? 'Cut + Block' : currentMode === 'on' ? 'Cut Only' : 'Disable';

    const MENU_TEXT =
      `❗Usage: .anticall \`‹ Use this for Avoid Calls ›\`\n` +
      `– You can avoid call from anyone.\n\n` +
      `   • .anticall on \n` +
      `   › \`Only cut the coming call.\`\n` +
      `   • .anticall block \n` +
      `   › \`Cut the coming call and block the calling user.\`\n` +
      `   • .anticall off \n` +
      `   › \`Disable Anticall.\`\n\n` +
      `❗ .Anticall Status :\n` +
      `– Current  › \`${statusText}\`\n` +
      `– Mode  › \`${modeText}\``;

    await sock.sendMessage(jid, { text: MENU_TEXT }, { quoted: fakeQuoted });
  },
};