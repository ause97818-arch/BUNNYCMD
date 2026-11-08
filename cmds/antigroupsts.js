/**
 * cmds/antigroupsts.js
 *
 * .antigroupsts on    -> group status detect: status DELETE + status lagane wale ko WARNING
 * .antigroupsts off   -> disable
 * .antigroupsts kick  -> group status DELETE + status lagane wale ko turant KICK
 * .antigroupsts delete -> SIRF group status DELETE (na warning, na kick)
 * (on / kick / delete kisi bhi order me ek-dusre ko replace karte hai)
 *
 * Sirf normal members ke liye — group-admin ka group status allow hai (koi
 * action nahi). Config per session + per group (`data/antigroupsts-<number>.json`),
 * detector lib/event.js (`handleAntigroupsts`) me hai. Usage text antilink.js style.
 */

const { isGroupJid, isBotGroupAdmin, getAntigroupstsConfig, setAntigroupsts } = require('../lib/event');
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
  command: ['antigroupsts'],
  description: 'Group status detect on/off/kick/delete. Usage: .antigroupsts on / off / kick / delete',

  run: async ({ sock, jid, msg, args }) => {
    const fakeQuoted = getFakeQuoted(sock);
    const p = getPrefixes(sock)[0];

    if (!msg.key.fromMe) {
      await sock.sendMessage(jid, { text: 'Oops, sorry! Only owner can use this command.' }, { quoted: fakeQuoted });
      return;
    }

    if (!isGroupJid(jid)) {
      await sock.sendMessage(jid, { text: `You can use this ${p}antigroupsts command only in groups.` }, { quoted: fakeQuoted });
      return;
    }

    const choice = (args[0] || '').toLowerCase();

    if (!['on', 'off', 'kick', 'delete'].includes(choice)) {
      const { enabled, mode } = getAntigroupstsConfig(sock, jid);
      const statusText = enabled ? 'Enable' : 'Disable';
      const modeText = mode === 'kick' ? 'Delete + Kick' : mode === 'delete' ? 'Delete Only' : 'Delete + Warn';

      const MENU_TEXT =
        `❗Usage: ${p}antigroupsts \`‹ Use this cmd in group ›\`\n` +
        `– You can avoid group status post in group by members.\n\n` +
        `   • ${p}antigroupsts on \n` +
        `   › \`Enable Anti Group Status in a group (delete the status + warn the user).\`\n` +
        `   • ${p}antigroupsts off \n` +
        `   › \`Disable Anti Group Status in a group.\`\n` +
        `   • ${p}antigroupsts kick \n` +
        `   › \`Delete the group status and kick the user who posted it.\`\n` +
        `   • ${p}antigroupsts delete \n` +
        `   › \`Only delete the group status that sent (no warning, no kick).\`\n\n` +
        `– Group admins are not affected, only normal members.\n\n` +
        `❗ Anti Group Status :\n` +
        `– Current  › \`${statusText}\`\n` +
        `– Mode  › \`${modeText}\``;

      await sock.sendMessage(jid, { text: MENU_TEXT }, { quoted: fakeQuoted });
      return;
    }

    if (choice === 'off') {
      setAntigroupsts(sock, jid, false);
      await sock.sendMessage(jid, { text: 'Anti group status disabled for this group.' }, { quoted: fakeQuoted });
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
      setAntigroupsts(sock, jid, true, 'warn');
      await sock.sendMessage(
        jid,
        { text: 'Anti group status enabled for this group. Status will be deleted and the user will get a warning.' },
        { quoted: fakeQuoted }
      );
      return;
    }

    if (choice === 'delete') {
      setAntigroupsts(sock, jid, true, 'delete');
      await sock.sendMessage(
        jid,
        { text: 'Anti group status mode set to delete only.' },
        { quoted: fakeQuoted }
      );
      return;
    }

    setAntigroupsts(sock, jid, true, 'kick');
    await sock.sendMessage(
      jid,
      { text: 'Anti group status mode set to kick + delete.' },
      { quoted: fakeQuoted }
    );
  },
};
