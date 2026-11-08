const { isGroupJid, isBotGroupAdmin } = require('../lib/event');
const { getFakeQuoted, getAntisumConfig, setAntisum } = require('../lib/antisum');

module.exports = {
  command: ['antisum'],
  description: 'Group anti-raid shield on/off/kick. Usage: .antisum on / off / kick',

  run: async ({ sock, jid, msg, args }) => {
    const fakeQuoted = getFakeQuoted(sock);
    const send = (text) => sock.sendMessage(jid, { text }, { quoted: fakeQuoted });

    if (!msg.key.fromMe) {
      await send('Oops, sorry! Only owner can use this command.');
      return;
    }

    if (!isGroupJid(jid)) {
      await send('You can use this .antisum command only in groups.');
      return;
    }

    const choice = (args[0] || '').toLowerCase();

    if (!['on', 'off', 'kick'].includes(choice)) {
      const { enabled, mode } = getAntisumConfig(sock, jid);
      const statusText = enabled ? 'Enable' : 'Disable';
      const modeText = mode === 'kick' ? 'Kick' : 'Remove';

      const MENU_TEXT =
        `❗Usage: .antisum \`‹ Use this cmd in group ›\`\n` +
        `– Instantly blocks fake-account raid attacks in the group.\n\n` +
        `   • .antisum on \n` +
        `   › \`Remove the fake account the moment it is added.\`\n` +
        `   • .antisum off \n` +
        `   › \`Disable Antisum in a group.\`\n` +
        `   • .antisum kick \n` +
        `   › \`Remove the fake account, kick the attacker who added it and revoke the group invite link.\`\n\n` +
        `❗ Antisum Status :\n` +
        `– Current  › \`${statusText}\`\n` +
        `– Mode  › \`${modeText}\``;

      await send(MENU_TEXT);
      return;
    }

    if (choice === 'off') {
      setAntisum(sock, jid, false);
      await send('Antisum disabled for this group.');
      return;
    }

    const botIsAdmin = await isBotGroupAdmin(sock, jid);
    if (!botIsAdmin) {
      await send('Need admin in this group to use this command.');
      return;
    }

    if (choice === 'on') {
      setAntisum(sock, jid, true, 'remove');
      await send('Antisum enabled for this group.\nMode: remove fake accounts instantly.');
      return;
    }

    setAntisum(sock, jid, true, 'kick');
    await send('Antisum mode set to kick.\nFake accounts and the attacker who added them will be removed, and the invite link will be revoked.');
  },
};
