const { isBotGroupAdmin } = require('../lib/event');
const { areJidsSameUser } = require('@whiskeysockets/baileys');
const {
  getAntiforeignConfig,
  setAntiforeignEnabled,
  addAntiforeignCodes,
  removeAntiforeignCodes,
  parseCodesArg,
} = require('../lib/antiforeign');
const groupSendCache = require('../lib/groupSendCache');

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

async function isSenderGroupAdmin(sock, groupJid, senderJid) {
  try {
    const metadata = await groupSendCache.getMetadata(sock, groupJid);
    return metadata.participants.some(
      (p) => areJidsSameUser(p.id, senderJid) && (p.admin === 'admin' || p.admin === 'superadmin')
    );
  } catch (err) {
    console.error(`[BOT] cmds/antiforeign.js: isSenderGroupAdmin fail for ${groupJid}:${err.message}`);
    return false;
  }
}

module.exports = {
  command: ['antiforeign'],
  description: 'Set kiye gaye country codes ke naye-join members ko group se turant auto-kick karta hai. Usage: .antiforeign on/off/set +91.../del +91...',

  run: async ({ sock, jid, msg, args }) => {
    const fakeQuoted = getFakeQuoted(sock);

    if (!jid.endsWith('@g.us')) {
      await sock.sendMessage(jid, { text: 'This command can only be used in groups.' }, { quoted: fakeQuoted });
      return;
    }

    const sub = String(args?.[0] || '').toLowerCase();
    
    const botIsAdmin = await isBotGroupAdmin(sock, jid);
    if (!botIsAdmin) {
      await sock.sendMessage(jid, { text: 'Need admin in this group to use this command.' }, { quoted: fakeQuoted });
      return;
    }

    const senderJid = msg.key.participant || msg.key.remoteJid;
    const senderIsAdmin = await isSenderGroupAdmin(sock, jid, senderJid);
    if (!senderIsAdmin) {
      await sock.sendMessage(jid, { text: 'Only group admins can use this command.' }, { quoted: fakeQuoted });
      return;
    }

    if (!sub) {
      const config = getAntiforeignConfig(sock, jid);
      const statusText = config.enabled ? 'Enable' : 'Disable';
      const codesText = config.codes.length > 0 ? config.codes.map((c) => `+${c}`).join(', ') : 'None set';

      const MENU_TEXT =
        `❗Usage: .antiforeign \`‹ Use this cmd in group ›\`\n` +
        `– You can restrict specific country code members from joining the group.\n\n` +
        `   • .antiforeign on \n` +
        `   › \`Enable Anti-Foreign in a group.\`\n` +
        `   • .antiforeign off \n` +
        `   › \`Disable Anti-Foreign in a group.\`\n` +
        `   • .antiforeign set +91, +92 \n` +
        `   › \`Set blocked country codes.\`\n` +
        `   • .antiforeign del +91 \n` +
        `   › \`Remove specific country code.\`\n\n` +
        `❗ Anti-Foreign Status :\n` +
        `– Current  › \`${statusText}\`\n` +
        `– Codes    › \`${codesText}\``;

      await sock.sendMessage(jid, { text: MENU_TEXT }, { quoted: fakeQuoted });
      return;
    }

    if (sub === 'on') {
      const config = getAntiforeignConfig(sock, jid);
      if (config.codes.length === 0) {
        await sock.sendMessage(
          jid,
          {
            text:
              `❗ Anti-Foreign: ON\n` +
              `- But, country codes are not set for this group.\n` +
              `Usage: .antiforeign set +91, +92 ...`,
          },
          { quoted: fakeQuoted }
        );
        return;
      }
      setAntiforeignEnabled(sock, jid, true);
      await sock.sendMessage(
        jid,
        { text: 'Anti-foreign successfully enabled for this group!' },
        { quoted: fakeQuoted }
      );
      return;
    }

    if (sub === 'off') {
      setAntiforeignEnabled(sock, jid, false);
      await sock.sendMessage(
        jid,
        { text: 'Anti-foreign successfully disabled for this group!' },
        { quoted: fakeQuoted }
      );
      return;
    }

    if (sub === 'set') {
      const codes = parseCodesArg(args.slice(1));
      if (codes.length === 0) {
        await sock.sendMessage(
          jid,
          { text: 'Usage: .antiforeign set +91, +92, +7' },
          { quoted: fakeQuoted }
        );
        return;
      }
      const updated = addAntiforeignCodes(sock, jid, codes);
      await sock.sendMessage(
        jid,
        {
          text:
            `Anti-foreign codes successfully set for this group!\n` +
            `- Set country codes : ${updated.codes.map((c) => `+${c}`).join(', ')}`,
        },
        { quoted: fakeQuoted }
      );
      return;
    }

    if (sub === 'del' || sub === 'dlt' || sub === 'delete') {
      const config = getAntiforeignConfig(sock, jid);
      if (config.codes.length === 0) {
        await sock.sendMessage(
          jid,
          {
            text:
              `❗ Set country codes first!\n` +
              `- Then use .antiforeign del +91, +92 ...`,
          },
          { quoted: fakeQuoted }
        );
        return;
      }
      const codesToRemove = parseCodesArg(args.slice(1));
      if (codesToRemove.length === 0) {
        await sock.sendMessage(
          jid,
          { text: 'Usage: .antiforeign del +91, +92' },
          { quoted: fakeQuoted }
        );
        return;
      }
      const { removed } = removeAntiforeignCodes(sock, jid, codesToRemove);
      if (removed.length === 0) {
        await sock.sendMessage(
          jid,
          { text: 'None of the provided codes were found in this group set-list.' },
          { quoted: fakeQuoted }
        );
        return;
      }
      await sock.sendMessage(
        jid,
        {
          text:
            `Anti-foreign code successfully deleted for this group!\n` +
            `- Deleted country codes : ${removed.map((c) => `+${c}`).join(', ')}`,
        },
        { quoted: fakeQuoted }
      );
      return;
    }

    await sock.sendMessage(
      jid,
      { text: 'Usage: .antiforeign on / off / set +91... / del +91...' },
      { quoted: fakeQuoted }
    );
  },
};