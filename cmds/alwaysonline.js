/**
 * cmds/alwaysonline.js
 *
 * .alwaysonline on   -> account hamesha "online" dikhega (sabko, hamesha)
 * .alwaysonline off  -> default WhatsApp behavior — jab genuinely active
 *                        ho tabhi online dikhega. DEFAULT STATE bhi yehi
 *                        hai (pehli baar bot chalne pe OFF).
 *
 * FIXED: pehle ye lib/botSession.js ke GLOBAL (single, module-level)
 * `isAlwaysOnline`/`setAlwaysOnline` use karta tha — jo sirf ek hi
 * `currentSock` (bot-main persistent session) ko track karta tha. Isliye
 * jab kisi bhi MULTI-SESSION number se `.alwaysonline off` chalaya jaata
 * tha, wo us number ke socket ko chhuta hi nahi tha — sirf bot-main ka
 * global flag change hota tha. 10-12 sessions me se kisi ek pe OFF karne
 * se koi asar nahi padta tha (aur sabhi sessions same global loop share
 * kar rahe the, isliye ek session ka toggle doosre sessions ko bhi
 * prabhavit kar sakta tha).
 *
 * FIX: ab ye SEEDHA `sock` (jo command dispatch se already milta hai)
 * lib/chatPresence.js ke `isAutoOnline`/`setAutoOnline` ko pass karta
 * hai — wahi already-correct PER-SESSION pattern jo autotyping/
 * autorecording/autoseen use karte hai (`sock.user.id` se botNumber
 * nikal ke alag JSON file + alag setInterval loop per number). Har
 * session ka apna independent ON/OFF state aur apna interval hai; ek
 * number ka toggle doosre 9-11 numbers ko bilkul touch nahi karta.
 */

const { isAutoOnline, setAutoOnline } = require('../lib/chatPresence');

module.exports = {
  command: ['alwaysonline'],
  description: 'Account ko hamesha online dikhane ka toggle. Usage: .alwaysonline on / off',

  run: async ({ sock, jid, msg, args }) => {
    if (!msg.key.fromMe) {
      await sock.sendMessage(jid, { text: '𝖳ʜɪs ᴄᴏᴍᴍᴀɴᴅ ᴏɴʟʏ ᴄᴀɴ ᴜsᴇ ᴏᴡɴᴇʀ.' }, { quoted: msg });
      return;
    }

    const sub = (args[0] || '').toLowerCase();

    if (sub === 'on') {
      setAutoOnline(sock, true);
      await sock.sendMessage(
        jid,
        { text: '𝖠ʟᴡᴀʏs 𝖮ɴʟɪɴᴇ : ᴏɴ' },
        { quoted: msg }
      );
      return;
    }

    if (sub === 'off') {
      setAutoOnline(sock, false);
      await sock.sendMessage(
        jid,
        { text: '𝖠ʟᴡᴀʏs 𝖮ɴʟɪɴᴇ: ᴏғғ' },
        { quoted: msg }
      );
      return;
    }

    await sock.sendMessage(
      jid,
      {
        text:
          '⚠️ 𝖴sᴀɢᴇ: `.𝖠ʟᴡᴀʏsᴏɴʟɪɴᴇ ᴏɴ` / `.𝖠ʟᴡᴀʏsᴏɴʟɪɴᴇ ᴏғғ`\n' +
          `𝖢ᴜʀʀᴇɴᴛ 𝖲ᴛs (𝗍𝗁𝗂𝗌 𝗌𝖾𝗌𝗌𝗂𝗈𝗇) : *${isAutoOnline(sock) ? 'ᴏɴ' : 'ᴏғғ'}*`,
      },
      { quoted: msg }
    );
  },
};
