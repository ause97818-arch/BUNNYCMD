/**
 * cmds/audiofooter.js
 *
 * .audiofooter — demo of the "Native Flow with Audio Footer" feature added
 * by the rabbitxmd/baileys fork: a text message with music playing in the
 * footer, plus two native-flow quick buttons ("Good, Next" / "Skip") —
 * all in one bubble.
 *
 * audioFooter.url points at a hosted CDN file (cdnfiles.zone.id) instead
 * of a local path, since this bot has no local audio file to point to.
 *
 * If your installed fork build doesn't actually support these fields yet
 * (audioFooter / nativeFlow), sock.sendMessage will either ignore the
 * unknown keys or throw. The catch block below reports that clearly
 * instead of silently failing or crashing the bot.
 */

module.exports = {
  command: ['audiofooter'],
  description: 'Demo: "Native Flow with Audio Footer" — audio playing in the footer + quick native-flow buttons, in one message.',

  run: async ({ sock, jid, msg }) => {
    try {
      await sock.sendMessage(
        jid,
        {
          text: '🔈 Music in the footer!',
          audioFooter: {
            url: 'https://cdnfiles.zone.id/aud/dpsttekjrswuu5f5ftg1.mp3',
          },
          nativeFlow: [
            {
              text: '👍🏻 Good, Next',
              id: '#Next',
              icon: 'review',
            },
            {
              text: '👎🏻 Skip',
              id: '#Skip',
              icon: 'default',
            },
          ],
        },
        { quoted: msg }
      );
    } catch (e) {
      console.error('[.audiofooter] error:', e);
      await sock.sendMessage(
        jid,
        {
          text:
            `Error:\n${e.message}\n\n` +
            `Ye feature (Native Flow with Audio Footer) is fork build me support nahi ho raha lagta hai. ` +
            `Confirm karo ki package.json me @whiskeysockets/baileys asal me rabbitxmd/baileys (ya usi jaisi ` +
            `itsliaaa-based fork) se resolve ho raha hai, aur node_modules fresh reinstall kiya hai.`,
        },
        { quoted: msg }
      );
    }
  },
};
