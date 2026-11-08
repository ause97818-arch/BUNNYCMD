/**
 * cmds/antivirus.js
 *
 * GROUP (bot us group me admin hona chahiye):
 *   .antivirus           -> current status + menu
 *   .antivirus on        -> enable, mode = "delete" (default)
 *   .antivirus off       -> disable
 *   .antivirus delete    -> enable, mode = "delete" (sirf delete, kick nahi)
 *   .antivirus kick      -> enable, mode = "kick" (delete + non-admin sender kick)
 *
 * PRIVATE (1:1 chat):
 *   .antivirus           -> current status + menu
 *   .antivirus on        -> enable, mode = "delete" (default)
 *   .antivirus off       -> disable
 *   .antivirus delete    -> enable, mode = "delete" (sirf delete)
 *   .antivirus block     -> enable, mode = "block" (delete + sender block)
 *
 * Sirf OWNER (`msg.key.fromMe`) chala sakta hai.
 */

const {
  isGroupJid,
  isBotGroupAdmin,
  getAntivirusGroupConfig,
  setAntivirusGroup,
  getAntivirusPrivateConfig,
  setAntivirusPrivate,
} = require('../lib/event');

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
  command: ['antivirus'],
  description:
    'Bug/virus-payload detect+delete. Group: +kick option. Private: +block option. Usage: .antivirus on/off/delete/kick/block',

  run: async ({ sock, jid, msg, args }) => {
    const fakeQuoted = getFakeQuoted(sock);

    if (!msg.key.fromMe) {
      await sock.sendMessage(jid, { text: 'Oops, sorry! Only owner can use this command.' }, { quoted: fakeQuoted });
      return;
    }

    const isGroup = isGroupJid(jid);
    const choice = (args[0] || '').toLowerCase();
    const validChoices = isGroup ? ['on', 'off', 'delete', 'kick'] : ['on', 'off', 'delete', 'block'];

    // Status & Menu display matching other anti-commands style
    if (!validChoices.includes(choice)) {
      const { enabled, mode } = isGroup ? getAntivirusGroupConfig(sock, jid) : getAntivirusPrivateConfig(sock, jid);
      const statusText = enabled ? `Enable (Mode: ${mode.toUpperCase()})` : 'Disable';

      const MENU_TEXT = isGroup 
        ? `❗Usage: \`.antivirus\` \`‹ Use this cmd in group ›\`\n` +
          `– Auto-scan and delete virus / crash bug payloads in the group.\n\n` +
          `   • \`.antivirus on\` / \`.antivirus delete\` \n` +
          `   › \`Enable Anti-Virus (Delete mode).\`\n` +
          `   • \`.antivirus kick\` \n` +
          `   › \`Enable Anti-Virus (Delete + Kick sender).\`\n` +
          `   • \`.antivirus off\` \n` +
          `   › \`Disable Anti-Virus in group.\`\n\n` +
          `❗ Anti-Virus Status :\n` +
          `– Current  › \`${statusText}\`\n\n` +
          `_Note: Bot must be group admin to enable._`
        : `❗Usage: \`.antivirus\` \`‹ Use this cmd in private chat ›\`\n` +
          `– Auto-scan and delete virus / crash bug payloads in 1:1 chat.\n\n` +
          `   • \`.antivirus on\` / \`.antivirus delete\` \n` +
          `   › \`Enable Anti-Virus (Delete mode).\`\n` +
          `   • \`.antivirus block\` \n` +
          `   › \`Enable Anti-Virus (Delete + Block sender).\`\n` +
          `   • \`.antivirus off\` \n` +
          `   › \`Disable Anti-Virus.\`\n\n` +
          `❗ Anti-Virus Status :\n` +
          `– Current  › \`${statusText}\``;

      await sock.sendMessage(jid, { text: MENU_TEXT }, { quoted: fakeQuoted });
      return;
    }

    if (choice === 'off') {
      if (isGroup) setAntivirusGroup(sock, jid, false);
      else setAntivirusPrivate(sock, jid, false);
      await sock.sendMessage(jid, { text: 'Anti-virus successfully disabled for this chat.' }, { quoted: fakeQuoted });
      return;
    }

    if (isGroup) {
      const botIsAdmin = await isBotGroupAdmin(sock, jid);
      if (!botIsAdmin) {
        await sock.sendMessage(
          jid,
          { text: 'Need admin in this group to use this command.' },
          { quoted: fakeQuoted }
        );
        return;
      }

      if (choice === 'on' || choice === 'delete') {
        setAntivirusGroup(sock, jid, true, 'delete');
        await sock.sendMessage(jid, { text: 'Anti-virus successfully enabled (Delete mode) for this group.' }, { quoted: fakeQuoted });
        return;
      }

      // choice === 'kick'
      setAntivirusGroup(sock, jid, true, 'kick');
      await sock.sendMessage(
        jid,
        { text: 'Anti-virus mode successfully set to Kick + Delete for this group.' },
        { quoted: fakeQuoted }
      );
      return;
    }

    // Private chat options
    if (choice === 'on' || choice === 'delete') {
      setAntivirusPrivate(sock, jid, true, 'delete');
      await sock.sendMessage(jid, { text: 'Anti-virus successfully enabled (Delete mode) for this chat.' }, { quoted: fakeQuoted });
      return;
    }

    // choice === 'block'
    setAntivirusPrivate(sock, jid, true, 'block');
    await sock.sendMessage(
      jid,
      { text: 'Anti-virus mode successfully set to Block + Delete for this chat.' },
      { quoted: fakeQuoted }
    );
  },
};