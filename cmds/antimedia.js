const { isGroupJid, isBotGroupAdmin } = require('../lib/event');
const {
  buildFakeQuoted,
  getConfig,
  setEnabled,
  formatItems,
  warmGroup,
} = require('../lib/antimedia');

module.exports = {
  command: ['antimedia', 'amtimedia'],
  description: 'Group anti-media on/off/mode. Usage: .antimedia on / off / delete / kick',

  run: async ({ sock, jid, msg, args }) => {
    const fakeQuoted = buildFakeQuoted(sock);
    const reply = (text) => sock.sendMessage(jid, { text }, { quoted: fakeQuoted });

    if (!msg.key.fromMe) {
      await reply('Oops, sorry! Only owner can use this command.');
      return;
    }

    if (!isGroupJid(jid)) {
      await reply('You can use this .antimedia command only in groups.');
      return;
    }

    const choice = (args[0] || '').toLowerCase();

    if (!['on', 'off', 'delete', 'kick'].includes(choice)) {
      const cfg = getConfig(sock, jid);
      const statusText = cfg.enabled ? 'Enable' : 'Disable';
      const modeText = cfg.mode === 'kick' ? 'Delete + Kick' : 'Delete';

      const MENU_TEXT =
        `❗Usage: .antimedia \`‹ Use this cmd in group ›\`\n` +
        `– Block the media / file types you choose, sent by members in the group.\n\n` +
        `   • .antimedia on \n` +
        `   › \`Enable Anti-Media (default mode: delete).\`\n` +
        `   • .antimedia off \n` +
        `   › \`Disable Anti-Media in a group.\`\n` +
        `   • .antimedia delete \n` +
        `   › \`Only delete the blocked media.\`\n` +
        `   • .antimedia kick \n` +
        `   › \`Delete the blocked media and kick the sender.\`\n\n` +
        `   • .setantimedia image, video, .pdf, .js \n` +
        `   › \`Add types / extensions to the block list.\`\n` +
        `   • .delantimedia .pdf, .js \n` +
        `   › \`Remove only these from the block list.\`\n\n` +
        `❗ Anti-Media Status :\n` +
        `– Current  › \`${statusText}\`\n` +
        `– Mode  › \`${modeText}\`\n` +
        `– Blocked  › \`${formatItems(cfg)}\``;

      await reply(MENU_TEXT);
      return;
    }

    if (choice === 'off') {
      setEnabled(sock, jid, false);
      await reply('Anti-Media disabled for this group.');
      return;
    }

    const botIsAdmin = await isBotGroupAdmin(sock, jid);
    if (!botIsAdmin) {
      await reply('Need admin in this group to use this command.');
      return;
    }

    if (choice === 'kick') {
      const cfg = setEnabled(sock, jid, true, 'kick');
      warmGroup(sock, jid);
      const hint = cfg.types.length || cfg.exts.length
        ? ''
        : '\nNo media is blocked yet. Use .setantimedia image, video, .pdf ...';
      await reply(`Anti-Media mode set to delete + kick.${hint}`);
      return;
    }

    // 'on' and 'delete' -> default mode is always delete
    const cfg = setEnabled(sock, jid, true, 'delete');
    warmGroup(sock, jid);
    const hint = cfg.types.length || cfg.exts.length
      ? ''
      : '\nNo media is blocked yet. Use .setantimedia image, video, .pdf ...';
    await reply(
      (choice === 'on' ? 'Anti-Media enabled for this group (mode: delete).' : 'Anti-Media mode set to delete.') + hint
    );
  },
};
