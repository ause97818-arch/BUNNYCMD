/**
 * cmds/antibot.js
 *
 * .antibot on      -> bot ka message DELETE (sirf delete)
 * .antibot off     -> band, koi action nahi
 * .antibot delete  -> bot ka message DELETE
 * .antibot kick    -> bot ka message DELETE + bhejne wale ko KICK
 *
 * "Bot message" = message-ID "3EB0" se shuru hota hai. Sirf normal members par —
 * group-admin par koi action nahi. Config per session + per group
 * (`data/antibot-<number>.json`), detector lib/event.js (`handleAntibot`) me hai.
 * Usage text antilink.js style.
 */

const { isGroupJid, isBotGroupAdmin, getAntibotConfig, setAntibot } = require('../lib/event');
const { getPrefixes } = require('../lib/prefixStore');

function getFakeQuoted(sock) {
  const botNumber = sock?.user?.id ? sock.user.id.split(':')[0] : '0';
  const vcard =
    `BEGIN:VCARD\n` +
    `VERSION:3.0\n` +
    `FN:𝑻𝑯𝑬 𝑩𝑼𝑵𝑵𝒀 𝑴;\n` +
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
  command: ['antibot'],
  description: 'Blocks WhatsApp bot messages in a group. Usage: .antibot on / off / delete / kick',

  run: async ({ sock, jid, msg, args }) => {
    const fakeQuoted = getFakeQuoted(sock);
    const p = getPrefixes(sock)[0];

    if (!msg.key.fromMe) {
      await sock.sendMessage(jid, { text: 'Oops, sorry! Only owner can use this command.' }, { quoted: fakeQuoted });
      return;
    }

    if (!isGroupJid(jid)) {
      await sock.sendMessage(jid, { text: `You can use this ${p}antibot command only in groups.` }, { quoted: fakeQuoted });
      return;
    }

    const choice = (args[0] || '').toLowerCase();

    if (!['on', 'off', 'delete', 'kick'].includes(choice)) {
      const { enabled, mode } = getAntibotConfig(sock, jid);
      const statusText = enabled ? 'Enable' : 'Disable';
      const modeText = !enabled ? 'No Action' : mode === 'kick' ? 'Delete + Kick' : 'Delete Only';

      const MENU_TEXT =
        `❗Usage: ${p}antibot \`‹ Use this cmd in group ›\`\n` +
        `– You can block WhatsApp bot messages from members in group.\n\n` +
        `   • ${p}antibot on \n` +
        `   › \`Enable Anti Bot in a group (only delete the bot message).\`\n` +
        `   • ${p}antibot off \n` +
        `   › \`Disable Anti Bot in a group (no action).\`\n` +
        `   • ${p}antibot delete \n` +
        `   › \`Delete the bot message.\`\n` +
        `   • ${p}antibot kick \n` +
        `   › \`Delete the bot message and kick the user.\`\n\n` +
        `– Group admins are not affected, only normal members.\n\n` +
        `❗ Anti Bot :\n` +
        `– Current  › \`${statusText}\`\n` +
        `– Mode  › \`${modeText}\``;

      await sock.sendMessage(jid, { text: MENU_TEXT }, { quoted: fakeQuoted });
      return;
    }

    if (choice === 'off') {
      setAntibot(sock, jid, false);
      await sock.sendMessage(jid, { text: 'Anti bot disabled for this group.' }, { quoted: fakeQuoted });
      return;
    }

    const botIsAdmin = await isBotGroupAdmin(sock, jid);
    if (!botIsAdmin) {
      await sock.sendMessage(jid, { text: 'Need admin in this group to use this command.' }, { quoted: fakeQuoted });
      return;
    }

    if (choice === 'kick') {
      setAntibot(sock, jid, true, 'kick');
      await sock.sendMessage(jid, { text: 'Anti bot mode set to kick + delete.' }, { quoted: fakeQuoted });
      return;
    }

    setAntibot(sock, jid, true, 'delete');
    await sock.sendMessage(
      jid,
      {
        text:
          choice === 'on'
            ? 'Anti bot enabled for this group. Bot messages will be deleted.'
            : 'Anti bot mode set to delete only.',
      },
      { quoted: fakeQuoted }
    );
  },
};
