/**
 * cmds/menu2.js
 *
 * Carousel Menu Plugin fixed — No external dependencies like moment-timezone required!
 */

const { generateWAMessageFromContent, prepareWAMessageMedia } = require("@whiskeysockets/baileys");

const DEMO_THUMB_URL = 'https://i.ibb.co/6xZy3hY/d9bf618856ec.jpg';

module.exports = {
  command: ['cmen'],
  description: 'sʜᴏᴡ ʙᴏᴛ ᴍᴇɴᴜ (Carousel Cards)',

  run: async ({ sock, jid, msg }) => {
    try {
      // 1. Uptime Calculation
      const uptimeSeconds = process.uptime();
      const days = Math.floor(uptimeSeconds / 86400);
      const hours = Math.floor((uptimeSeconds % 86400) / 3600);
      const minutes = Math.floor((uptimeSeconds % 3600) / 60);
      const seconds = Math.floor(uptimeSeconds % 60);
      const uptimeString = `${days}d ${hours}h ${minutes}m ${seconds}s`;

      // 2. Native Date & Time (IST Timezone supported without moment-timezone)
      const now = new Date();
      const optionsDate = { timeZone: 'Asia/Kolkata', day: '2-digit', month: '2-digit', year: 'numeric' };
      const optionsTime = { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
      
      const date = now.toLocaleDateString('en-GB', optionsDate); // DD/MM/YYYY format
      const time = now.toLocaleTimeString('en-GB', optionsTime); // HH:mm:ss format
      const userName = msg.pushName || 'User';

      // 3. Prepare Image Header Buffer
      let imageMsg = {};
      try {
        const media = await prepareWAMessageMedia({ image: { url: DEMO_THUMB_URL } }, { upload: sock.waUploadToServer });
        imageMsg = media.imageMessage;
      } catch (e) {
        // Fallback agar image fetch na ho
      }

      // 4. Carousel Cards Setup with exact user buttons & widgets
      const cards = [
        // Slide 1
        {
          header: { title: "🕸️ 𝐒𝐘𝐂𝐇𝐎 –𝐗𝐌𝐃 🕸️", hasMediaAttachment: !!imageMsg, imageMessage: imageMsg },
          body: {
            text: `╭──────────────⊷\n│→ ʙᴏᴛ ɴᴀᴍᴇ : sʏᴄʜᴏ ᴍɪɴɪ\n│→ ᴜsᴇʀ : ${userName}\n│→ ᴀᴄᴛɪᴠᴇ ᴜsᴇʀ : 87\n│→ ᴘʀᴇғɪx : .\n│→ ᴜᴘᴛɪᴍᴇ : ${uptimeString}\n│→ ᴘʟᴀᴛғᴏʀᴍ : linux\n│→ ᴅᴀᴛᴇ : ${date}\n│→ ᴛɪᴍᴇ : ${time}\n│ \n│      ᴍᴜʟᴛɪ-ᴅᴇᴠɪsᴇ \n╰───────────────⊷\n\n> © 𝐁ᴜɴny : 𝐁ᴏᴛᴢ 🌝🩷💦`
          },
          nativeFlowMessage: {
            buttons: [
              {
                name: ""
              },
              {
                name: "single_select",
                buttonParamsJson: "{\"title\":\"\\u0000\",\"sections\":[{\"title\":\"𝖡𝐔𝐍𝐍𝐘 𝐗𝐌𝐃 ⟩ -z\",\"highlight_label\":\"𝖡𝐔𝐍𝐍𝐘 𝐗𝐌𝐃 ⟩ - MENU\",\"rows\":[{\"title\":\"Full Menu\",\"id\":\".menu2\"}]},{\"highlight_label\":\"𝖡𝐔𝐍𝐍𝐘 𝐗𝐌𝐃 ⟩ - MENU\",\"rows\":[{\"title\":\"Help\",\"id\":\".help\"}]},{\"highlight_label\":\"𝖡𝐔𝐍𝐍𝐘 𝐗𝐌𝐃 ⟩ - MENU\",\"rows\":[{\"title\":\"Support Links\",\"id\":\".link\"}]}],\"icon\":\"DEFAULT\"}"
              },
              {
                name: "single_select",
                buttonParamsJson: "{\"title\":\"\\u0000\",\"sections\":[{\"title\":\"𝖡𝐔𝐍𝐍𝐘 𝐗𝐌𝐃 ⟩ -z\",\"highlight_label\":\"ɪɴꜰᴏʀᴍᴀꜱɪ\",\"rows\":[{\"title\":\"ᴘɪɴɢ\",\"id\":\".ping\"}]},{\"highlight_label\":\"ɪɴꜰᴏʀᴍᴀꜱɪ\",\"rows\":[{\"title\":\"ᴏᴡɴᴇʀ\",\"id\":\".owner\"}]}],\"icon\":\"REVIEW\"}"
              },
              {
                name: "cta_url",
                buttonParamsJson: "{\"display_text\":\"\\u0000\",\"url\":\"https:\\/\\/wa.me\\/+918509439482\",\"merchant_url\":\"https:\\/\\/wa.me\\/+918509439482\",\"icon\":\"PROMOTION\"}"
              }
            ],
            messageParamsJson: "{\"limited_time_offer\":{\"text\":\"𝖡𝐔𝐍𝐍𝐘 𝐗𝐌𝐃 ⟩ -\",\"url\":\"https://t.me/th3bunny\",\"copy_code\":\"𝖡𝐔𝐍𝐍𝐘 𝐗𝐌𝐃 ⟩ -Support\",\"expiration_time\":1790101166062}}"
          },
          bloksWidget: {
            uuid: "bd883966-bf57-410e-a6e2-5fad7fbe8e86",
            data: "{\"version\":\"v0.9\",\"createSurface\":{\"surfaceId\":\"otest2-1790014766062\",\"catalogId\":\"https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json\",\"components\":[{\"id\":\"root\",\"component\":\"Column\",\"children\":[\"information\",\"hello_card\",\"button_2\"]},{\"id\":\"information\",\"component\":\"Card\",\"child\":\"information_card\"},{\"id\":\"information_card\",\"component\":\"Column\",\"children\":[\"title_text\",\"Divider8\",\"infor_text\"]},{\"id\":\"title_text\",\"component\":\"Text\",\"text\":\"𝖡𝐔𝐍𝐍𝐘 𝐗𝐌𝐃 ⟩ -\",\"variant\":\"h3\"},{\"id\":\"Divider8\",\"component\":\"Divider\"},{\"id\":\"infor_text\",\"component\":\"Text\",\"text\":\"》𝐂𝐫𝐞𝐚𝐭𝐨𝐫 : ʙᴜɴɴʏ ᴍ›\\n》𝐒𝐭𝐚𝐭𝐮𝐬 : Public\\n》𝐏𝐢𝐧𝐠 : 857 ms\\n》𝐑𝐮𝐧𝐭𝐢𝐦𝐞 : 0D 5H 6M 25S\\n──────────────────\\n𝐍𝐚𝐦𝐞 : 𝖲ᴏᴍɴᴀᴛʜ 𝖬ᴀʜᴀи́ᴛᴀ\\n𝐍𝐮𝐦𝐛𝐞𝐫 : 255869002473566\\n──────────────────\",\"variant\":\"body\"},{\"id\":\"hello_card\",\"component\":\"Card\",\"child\":\"hello_card_content\"},{\"id\":\"hello_card_content\",\"component\":\"Column\",\"children\":[\"Divider9\",\"hello_text\"]},{\"id\":\"Divider9\",\"component\":\"Divider\"},{\"id\":\"hello_text\",\"component\":\"Text\",\"text\":\"Hello, 𝖲ᴏᴍɴᴀᴛʜ 𝖬ᴀʜᴀи́ᴛᴀ. I am 𝖡𝐔𝐍𝐍𝐘 𝐗𝐌𝐃 ⟩ -, a whatsapp assistant bot. Is there anything I can help you with? Please press the button to display the next menu page\",\"variant\":\"body\"},{\"id\":\"button_2\",\"component\":\"Button\",\"child\":\"button_text_2\",\"variant\":\"primary\",\"action\":{\"call\":\"openUrl\",\"args\":{\"url\":\"https://t.me/th3bunny\"}}},{\"id\":\"button_text_2\",\"component\":\"Text\",\"text\":\"Creator\",\"variant\":\"body\"}]}}",
            type: "im_a2ui"
          }
        },

        // Slide 2
        {
          header: { title: "> 🕸️ 🏠 𝐌𝐀𝐈𝐍 🕸️", hasMediaAttachment: !!imageMsg, imageMessage: imageMsg },
          body: {
            text: `╭──────────────⊷\n│ • .ᴍᴇɴᴜ\n│ • .ᴍᴇɴᴜ2\n│ • .ᴀʟɪᴠᴇ\n│ • .ᴘɪɴɢ\n│ • .ᴏᴡɴᴇʀ\n│ • .ᴘᴀɴᴇʟ\n│ • .ꜱᴇᴛᴘʀᴇꜰɪx\n│ • .ᴀᴜᴛᴏʀᴇᴀᴄᴛ\n│ • .ᴛᴀɢᴀʟʟ\n│ • .ɢꜱᴛᴀᴛᴜꜱ\n│ • .ɢꜱ\n╰───────────────⊷\n\n> © 𝐁ᴜɴɴʏ : 𝐁ᴏᴛᴢ 🌝🩷💦`
          },
          nativeFlowMessage: {
            buttons: [
              {
                name: ""
              },
              {
                name: "single_select",
                buttonParamsJson: "{\"title\":\"\\u0000\",\"sections\":[{\"title\":\"𝖡𝐔𝐍𝐍𝐘 𝐗𝐌𝐃 ⟩ -z\",\"highlight_label\":\"𝖡𝐔𝐍𝐍𝐘 𝐗𝐌𝐃 ⟩ - MENU\",\"rows\":[{\"title\":\"Full Menu\",\"id\":\".menu2\"}]},{\"highlight_label\":\"𝖡𝐔𝐍𝐍𝐘 𝐗𝐌𝐃 ⟩ - MENU\",\"rows\":[{\"title\":\"Help\",\"id\":\".help\"}]},{\"highlight_label\":\"𝖡𝐔𝐍𝐍𝐘 𝐗𝐌𝐃 ⟩ - MENU\",\"rows\":[{\"title\":\"Support Links\",\"id\":\".link\"}]}],\"icon\":\"DEFAULT\"}"
              },
              {
                name: "single_select",
                buttonParamsJson: "{\"title\":\"\\u0000\",\"sections\":[{\"title\":\"𝖡𝐔𝐍𝐍𝐘 𝐗𝐌𝐃 ⟩ -z\",\"highlight_label\":\"ɪɴꜰᴏʀᴍᴀꜱɪ\",\"rows\":[{\"title\":\"ᴘɪɴɢ\",\"id\":\".ping\"}]},{\"highlight_label\":\"ɪɴꜰᴏʀᴍᴀꜱɪ\",\"rows\":[{\"title\":\"ᴏᴡɴᴇʀ\",\"id\":\".owner\"}]}],\"icon\":\"REVIEW\"}"
              },
              {
                name: "cta_url",
                buttonParamsJson: "{\"display_text\":\"\\u0000\",\"url\":\"https:\\/\\/wa.me\\/+918509439482\",\"merchant_url\":\"https:\\/\\/wa.me\\/+918509439482\",\"icon\":\"PROMOTION\"}"
              }
            ],
            messageParamsJson: "{\"limited_time_offer\":{\"text\":\"𝖡𝐔𝐍𝐍𝐘 𝐗𝐌𝐃 ⟩ -\",\"url\":\"https://t.me/th3bunny\",\"copy_code\":\"𝖡𝐔𝐍𝐍𝐘 𝐗𝐌𝐃 ⟩ -Support\",\"expiration_time\":1790101166062}}"
          },
          bloksWidget: {
            uuid: "bd883966-bf57-410e-a6e2-5fad7fbe8e86",
            data: "{\"version\":\"v0.9\",\"createSurface\":{\"surfaceId\":\"otest2-1790014766062\",\"catalogId\":\"https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json\",\"components\":[{\"id\":\"root\",\"component\":\"Column\",\"children\":[\"information\",\"hello_card\",\"button_2\"]},{\"id\":\"information\",\"component\":\"Card\",\"child\":\"information_card\"},{\"id\":\"information_card\",\"component\":\"Column\",\"children\":[\"title_text\",\"Divider8\",\"infor_text\"]},{\"id\":\"title_text\",\"component\":\"Text\",\"text\":\"𝖡𝐔𝐍𝐍𝐘 𝐗𝐌𝐃 ⟩ -\",\"variant\":\"h3\"},{\"id\":\"Divider8\",\"component\":\"Divider\"},{\"id\":\"infor_text\",\"component\":\"Text\",\"text\":\"》𝐂𝐫𝐞𝐚𝐭𝐨𝐫 : ʙᴜɴɴʏ ᴍ›\\n》𝐒𝐭𝐚𝐭𝐮𝐬 : Public\\n》𝐏𝐢𝐧𝐠 : 857 ms\\n》𝐑𝐮𝐧𝐭𝐢𝐦𝐞 : 0D 5H 6M 25S\\n──────────────────\\n𝐍𝐚𝐦𝐞 : 𝖲ᴏᴍɴᴀᴛʜ 𝖬ᴀʜᴀи́ᴛᴀ\\n𝐍𝐮𝐦𝐛𝐞𝐫 : 255869002473566\\n──────────────────\",\"variant\":\"body\"},{\"id\":\"hello_card\",\"component\":\"Card\",\"child\":\"hello_card_content\"},{\"id\":\"hello_card_content\",\"component\":\"Column\",\"children\":[\"Divider9\",\"hello_text\"]},{\"id\":\"Divider9\",\"component\":\"Divider\"},{\"id\":\"hello_text\",\"component\":\"Text\",\"text\":\"Hello, 𝖲ᴏᴍɴᴀᴛʜ 𝖬ᴀʜᴀи́ᴛᴀ. I am 𝖡𝐔𝐍𝐍𝐘 𝐗𝐌𝐃 ⟩ -, a whatsapp assistant bot. Is there anything I can help you with? Please press the button to display the next menu page\",\"variant\":\"body\"},{\"id\":\"button_2\",\"component\":\"Button\",\"child\":\"button_text_2\",\"variant\":\"primary\",\"action\":{\"call\":\"openUrl\",\"args\":{\"url\":\"https://t.me/th3bunny\"}}},{\"id\":\"button_text_2\",\"component\":\"Text\",\"text\":\"Creator\",\"variant\":\"body\"}]}}",
            type: "im_a2ui"
          }
        },

        // Slide 3
        {
          header: { title: "> 🕸️ 🤖 𝐀𝐈 🕸️", hasMediaAttachment: !!imageMsg, imageMessage: imageMsg },
          body: {
            text: `╭──────────────⊷\n│ • .ɢᴇᴍɪɴɪ\n│ • .ᴀɪ\n╰───────────────⊷\n\n> © 𝐁ᴜɴɴʏ : 𝐁ᴏᴛᴢ 🌝🩷💦`
          },
          nativeFlowMessage: {
            buttons: [
              {
                name: ""
              },
              {
                name: "single_select",
                buttonParamsJson: "{\"title\":\"\\u0000\",\"sections\":[{\"title\":\"𝖡𝐔𝐍𝐍𝐘 𝐗𝐌𝐃 ⟩ -z\",\"highlight_label\":\"𝖡𝐔𝐍𝐍𝐘 𝐗𝐌𝐃 ⟩ - MENU\",\"rows\":[{\"title\":\"Full Menu\",\"id\":\".menu2\"}]},{\"highlight_label\":\"𝖡𝐔𝐍𝐍𝐘 𝐗𝐌𝐃 ⟩ - MENU\",\"rows\":[{\"title\":\"Help\",\"id\":\".help\"}]},{\"highlight_label\":\"𝖡𝐔𝐍𝐍𝐘 𝐗𝐌𝐃 ⟩ - MENU\",\"rows\":[{\"title\":\"Support Links\",\"id\":\".link\"}]}],\"icon\":\"DEFAULT\"}"
              },
              {
                name: "single_select",
                buttonParamsJson: "{\"title\":\"\\u0000\",\"sections\":[{\"title\":\"𝖡𝐔𝐍𝐍𝐘 𝐗𝐌𝐃 ⟩ -z\",\"highlight_label\":\"ɪɴꜰᴏʀᴍᴀꜱɪ\",\"rows\":[{\"title\":\"ᴘɪɴɢ\",\"id\":\".ping\"}]},{\"highlight_label\":\"ɪɴꜰᴏʀᴍᴀꜱɪ\",\"rows\":[{\"title\":\"ᴏᴡɴᴇʀ\",\"id\":\".owner\"}]}],\"icon\":\"REVIEW\"}"
              },
              {
                name: "cta_url",
                buttonParamsJson: "{\"display_text\":\"\\u0000\",\"url\":\"https:\\/\\/wa.me\\/+918509439482\",\"merchant_url\":\"https:\\/\\/wa.me\\/+918509439482\",\"icon\":\"PROMOTION\"}"
              }
            ],
            messageParamsJson: "{\"limited_time_offer\":{\"text\":\"𝖡𝐔𝐍𝐍𝐘 𝐗𝐌𝐃 ⟩ -\",\"url\":\"https://t.me/th3bunny\",\"copy_code\":\"𝖡𝐔𝐍𝐍𝐘 𝐗𝐌𝐃 ⟩ -Support\",\"expiration_time\":1790101166062}}"
          },
          bloksWidget: {
            uuid: "bd883966-bf57-410e-a6e2-5fad7fbe8e86",
            data: "{\"version\":\"v0.9\",\"createSurface\":{\"surfaceId\":\"otest2-1790014766062\",\"catalogId\":\"https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json\",\"components\":[{\"id\":\"root\",\"component\":\"Column\",\"children\":[\"information\",\"hello_card\",\"button_2\"]},{\"id\":\"information\",\"component\":\"Card\",\"child\":\"information_card\"},{\"id\":\"information_card\",\"component\":\"Column\",\"children\":[\"title_text\",\"Divider8\",\"infor_text\"]},{\"id\":\"title_text\",\"component\":\"Text\",\"text\":\"𝖡𝐔𝐍𝐍𝐘 𝐗𝐌𝐃 ⟩ -\",\"variant\":\"h3\"},{\"id\":\"Divider8\",\"component\":\"Divider\"},{\"id\":\"infor_text\",\"component\":\"Text\",\"text\":\"》𝐂𝐫𝐞𝐚𝐭𝐨𝐫 : ʙᴜɴɴʏ ᴍ›\\n》𝐒𝐭𝐚𝐭𝐮𝐬 : Public\\n》𝐏𝐢𝐧𝐠 : 857 ms\\n》𝐑𝐮𝐧𝐭𝐢𝐦𝐞 : 0D 5H 6M 25S\\n──────────────────\\n𝐍𝐚𝐦𝐞 : 𝖲ᴏᴍɴᴀᴛʜ 𝖬ᴀʜᴀи́ᴛᴀ\\n𝐍𝐮𝐦𝐛𝐞𝐫 : 255869002473566\\n──────────────────\",\"variant\":\"body\"},{\"id\":\"hello_card\",\"component\":\"Card\",\"child\":\"hello_card_content\"},{\"id\":\"hello_card_content\",\"component\":\"Column\",\"children\":[\"Divider9\",\"hello_text\"]},{\"id\":\"Divider9\",\"component\":\"Divider\"},{\"id\":\"hello_text\",\"component\":\"Text\",\"text\":\"Hello, 𝖲ᴏᴍɴᴀᴛʜ 𝖬ᴀʜᴀи́ᴛᴀ. I am 𝖡𝐔𝐍𝐍𝐘 𝐗𝐌𝐃 ⟩ -, a whatsapp assistant bot. Is there anything I can help you with? Please press the button to display the next menu page\",\"variant\":\"body\"},{\"id\":\"button_2\",\"component\":\"Button\",\"child\":\"button_text_2\",\"variant\":\"primary\",\"action\":{\"call\":\"openUrl\",\"args\":{\"url\":\"https://t.me/th3bunny\"}}},{\"id\":\"button_text_2\",\"component\":\"Text\",\"text\":\"Creator\",\"variant\":\"body\"}]}}",
            type: "im_a2ui"
          }
        },

        // Slide 4
        {
          header: { title: "> 🕸️ 📥 ᴅᴏᴡɴʟᴏᴀᴅ 🕸️", hasMediaAttachment: !!imageMsg, imageMessage: imageMsg },
          body: {
            text: `╭──────────────⊷\n│ • .ɪɴꜱᴛᴀ\n│ • .ɪɢ\n│ • .ʀᴇᴇʟ\n│ • .ꜰʙ\n│ • .ᴘʟᴀʏ\n│ • .ꜱᴏɴɢ\n│ • .ᴛɪᴋᴛᴏᴋ\n╰───────────────⊷\n\n> © 𝐁ᴜɴɴʏ : 𝐁ᴏᴛᴢ 🌝🩷💦`
          },
          nativeFlowMessage: {
            buttons: [
              {
                name: ""
              },
              {
                name: "single_select",
                buttonParamsJson: "{\"title\":\"\\u0000\",\"sections\":[{\"title\":\"𝖡𝐔𝐍𝐍𝐘 𝐗𝐌𝐃 ⟩ -z\",\"highlight_label\":\"𝖡𝐔𝐍𝐍𝐘 𝐗𝐌𝐃 ⟩ - MENU\",\"rows\":[{\"title\":\"Full Menu\",\"id\":\".menu2\"}]},{\"highlight_label\":\"𝖡𝐔𝐍𝐍𝐘 𝐗𝐌𝐃 ⟩ - MENU\",\"rows\":[{\"title\":\"Help\",\"id\":\".help\"}]},{\"highlight_label\":\"𝖡𝐔𝐍𝐍𝐘 𝐗𝐌𝐃 ⟩ - MENU\",\"rows\":[{\"title\":\"Support Links\",\"id\":\".link\"}]}],\"icon\":\"DEFAULT\"}"
              },
              {
                name: "single_select",
                buttonParamsJson: "{\"title\":\"\\u0000\",\"sections\":[{\"title\":\"𝖡𝐔𝐍𝐍𝐘 𝐗𝐌𝐃 ⟩ -z\",\"highlight_label\":\"ɪɴꜰᴏʀᴍᴀꜱɪ\",\"rows\":[{\"title\":\"ᴘɪɴɢ\",\"id\":\".ping\"}]},{\"highlight_label\":\"ɪɴꜰᴏʀᴍᴀꜱɪ\",\"rows\":[{\"title\":\"ᴏᴡɴᴇʀ\",\"id\":\".owner\"}]}],\"icon\":\"REVIEW\"}"
              },
              {
                name: "cta_url",
                buttonParamsJson: "{\"display_text\":\"\\u0000\",\"url\":\"https:\\/\\/wa.me\\/+918509439482\",\"merchant_url\":\"https:\\/\\/wa.me\\/+918509439482\",\"icon\":\"PROMOTION\"}"
              }
            ],
            messageParamsJson: "{\"limited_time_offer\":{\"text\":\"𝖡𝐔𝐍𝐍𝐘 𝐗𝐌𝐃 ⟩ -\",\"url\":\"https://t.me/th3bunny\",\"copy_code\":\"𝖡𝐔𝐍𝐍𝐘 𝐗𝐌𝐃 ⟩ -Support\",\"expiration_time\":1790101166062}}"
          },
          bloksWidget: {
            uuid: "bd883966-bf57-410e-a6e2-5fad7fbe8e86",
            data: "{\"version\":\"v0.9\",\"createSurface\":{\"surfaceId\":\"otest2-1790014766062\",\"catalogId\":\"https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json\",\"components\":[{\"id\":\"root\",\"component\":\"Column\",\"children\":[\"information\",\"hello_card\",\"button_2\"]},{\"id\":\"information\",\"component\":\"Card\",\"child\":\"information_card\"},{\"id\":\"information_card\",\"component\":\"Column\",\"children\":[\"title_text\",\"Divider8\",\"infor_text\"]},{\"id\":\"title_text\",\"component\":\"Text\",\"text\":\"𝖡𝐔𝐍𝐍𝐘 𝐗𝐌𝐃 ⟩ -\",\"variant\":\"h3\"},{\"id\":\"Divider8\",\"component\":\"Divider\"},{\"id\":\"infor_text\",\"component\":\"Text\",\"text\":\"》𝐂𝐫𝐞𝐚𝐭𝐨𝐫 : ʙᴜɴɴʏ ᴍ›\\n》𝐒𝐭𝐚𝐭𝐮𝐬 : Public\\n》𝐏𝐢𝐧𝐠 : 857 ms\\n》𝐑𝐮𝐧𝐭𝐢𝐦𝐞 : 0D 5H 6M 25S\\n──────────────────\\n𝐍𝐚𝐦𝐞 : 𝖲ᴏᴍɴᴀᴛʜ 𝖬ᴀʜᴀи́ᴛᴀ\\n𝐍𝐮𝐦𝐛𝐞𝐫 : 255869002473566\\n──────────────────\",\"variant\":\"body\"},{\"id\":\"hello_card\",\"component\":\"Card\",\"child\":\"hello_card_content\"},{\"id\":\"hello_card_content\",\"component\":\"Column\",\"children\":[\"Divider9\",\"hello_text\"]},{\"id\":\"Divider9\",\"component\":\"Divider\"},{\"id\":\"hello_text\",\"component\":\"Text\",\"text\":\"Hello, 𝖲ᴏᴍɴᴀᴛʜ 𝖬ᴀʜᴀи́ᴛᴀ. I am 𝖡𝐔𝐍𝐍𝐘 𝐗𝐌𝐃 ⟩ -, a whatsapp assistant bot. Is there anything I can help you with? Please press the button to display the next menu page\",\"variant\":\"body\"},{\"id\":\"button_2\",\"component\":\"Button\",\"child\":\"button_text_2\",\"variant\":\"primary\",\"action\":{\"call\":\"openUrl\",\"args\":{\"url\":\"https://t.me/th3bunny\"}}},{\"id\":\"button_text_2\",\"component\":\"Text\",\"text\":\"Creator\",\"variant\":\"body\"}]}}",
            type: "im_a2ui"
          }
        },

        // Slide 5
        {
          header: { title: "> 🕸️ 👑 ᴏᴡɴᴇʀ 🕸️", hasMediaAttachment: !!imageMsg, imageMessage: imageMsg },
          body: {
            text: `╭──────────────⊷\n│ • .ᴏᴡɴᴇʀ\n│ • .ᴘᴀɴᴇʟ\n│ • .ꜱᴇᴛᴘʀᴇꜰɪx\n│ • .ᴀᴜᴛᴏʀᴇᴀᴄᴛ\n│ • .ᴘᴀɪʀ\n│ • .ʟᴏɢᴏᴜᴛ\n╰───────────────⊷\n\n> © 𝐁ᴜɴɴʏ : 𝐁ᴏᴛᴢ 🌝🩷💦`
          },
          nativeFlowMessage: {
            buttons: [
              {
                name: ""
              },
              {
                name: "single_select",
                buttonParamsJson: "{\"title\":\"\\u0000\",\"sections\":[{\"title\":\"𝖡𝐔𝐍𝐍𝐘 𝐗𝐌𝐃 ⟩ -z\",\"highlight_label\":\"𝖡𝐔𝐍𝐍𝐘 𝐗𝐌𝐃 ⟩ - MENU\",\"rows\":[{\"title\":\"Full Menu\",\"id\":\".menu2\"}]},{\"highlight_label\":\"𝖡𝐔𝐍𝐍𝐘 𝐗𝐌𝐃 ⟩ - MENU\",\"rows\":[{\"title\":\"Help\",\"id\":\".help\"}]},{\"highlight_label\":\"𝖡𝐔𝐍𝐍𝐘 𝐗𝐌𝐃 ⟩ - MENU\",\"rows\":[{\"title\":\"Support Links\",\"id\":\".link\"}]}],\"icon\":\"DEFAULT\"}"
              },
              {
                name: "single_select",
                buttonParamsJson: "{\"title\":\"\\u0000\",\"sections\":[{\"title\":\"𝖡𝐔𝐍𝐍𝐘 𝐗𝐌𝐃 ⟩ -z\",\"highlight_label\":\"ɪɴꜰᴏʀᴍᴀꜱɪ\",\"rows\":[{\"title\":\"ᴘɪɴɢ\",\"id\":\".ping\"}]},{\"highlight_label\":\"ɪɴꜰᴏʀᴍᴀꜱɪ\",\"rows\":[{\"title\":\"ᴏᴡɴᴇʀ\",\"id\":\".owner\"}]}],\"icon\":\"REVIEW\"}"
              },
              {
                name: "cta_url",
                buttonParamsJson: "{\"display_text\":\"\\u0000\",\"url\":\"https:\\/\\/wa.me\\/+918509439482\",\"merchant_url\":\"https:\\/\\/wa.me\\/+918509439482\",\"icon\":\"PROMOTION\"}"
              }
            ],
            messageParamsJson: "{\"limited_time_offer\":{\"text\":\"𝖡𝐔𝐍𝐍𝐘 𝐗𝐌𝐃 ⟩ -\",\"url\":\"https://t.me/th3bunny\",\"copy_code\":\"𝖡𝐔𝐍𝐍𝐘 𝐗𝐌𝐃 ⟩ -Support\",\"expiration_time\":1790101166062}}"
          },
          bloksWidget: {
            uuid: "bd883966-bf57-410e-a6e2-5fad7fbe8e86",
            data: "{\"version\":\"v0.9\",\"createSurface\":{\"surfaceId\":\"otest2-1790014766062\",\"catalogId\":\"https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json\",\"components\":[{\"id\":\"root\",\"component\":\"Column\",\"children\":[\"information\",\"hello_card\",\"button_2\"]},{\"id\":\"information\",\"component\":\"Card\",\"child\":\"information_card\"},{\"id\":\"information_card\",\"component\":\"Column\",\"children\":[\"title_text\",\"Divider8\",\"infor_text\"]},{\"id\":\"title_text\",\"component\":\"Text\",\"text\":\"𝖡𝐔𝐍𝐍𝐘 𝐗𝐌𝐃 ⟩ -\",\"variant\":\"h3\"},{\"id\":\"Divider8\",\"component\":\"Divider\"},{\"id\":\"infor_text\",\"component\":\"Text\",\"text\":\"》𝐂𝐫𝐞𝐚𝐭𝐨𝐫 : ʙᴜɴɴʏ ᴍ›\\n》𝐒𝐭𝐚𝐭𝐮𝐬 : Public\\n》𝐏𝐢𝐧𝐠 : 857 ms\\n》𝐑𝐮𝐧𝐭𝐢𝐦𝐞 : 0D 5H 6M 25S\\n──────────────────\\n𝐍𝐚𝐦𝐞 : 𝖲ᴏᴍɴᴀᴛʜ 𝖬ᴀʜᴀи́ᴛᴀ\\n𝐍𝐮𝐦𝐛𝐞𝐫 : 255869002473566\\n──────────────────\",\"variant\":\"body\"},{\"id\":\"hello_card\",\"component\":\"Card\",\"child\":\"hello_card_content\"},{\"id\":\"hello_card_content\",\"component\":\"Column\",\"children\":[\"Divider9\",\"hello_text\"]},{\"id\":\"Divider9\",\"component\":\"Divider\"},{\"id\":\"hello_text\",\"component\":\"Text\",\"text\":\"Hello, 𝖲ᴏᴍɴᴀᴛʜ 𝖬ᴀʜᴀи́ᴛᴀ. I am 𝖡𝐔𝐍𝐍𝐘 𝐗𝐌𝐃 ⟩ -, a whatsapp assistant bot. Is there anything I can help you with? Please press the button to display the next menu page\",\"variant\":\"body\"},{\"id\":\"button_2\",\"component\":\"Button\",\"child\":\"button_text_2\",\"variant\":\"primary\",\"action\":{\"call\":\"openUrl\",\"args\":{\"url\":\"https://t.me/th3bunny\"}}},{\"id\":\"button_text_2\",\"component\":\"Text\",\"text\":\"Creator\",\"variant\":\"body\"}]}}",
            type: "im_a2ui"
          }
        }
      ];

      // 5. Generate Carousel Message Payload
      const sentPayload = generateWAMessageFromContent(jid, {
        viewOnceMessage: {
          message: {
            interactiveMessage: {
              header: {
                title: "",
                hasMediaAttachment: false
              },
              body: { text: "*Swipe left to explore more features ➔*" },
              footer: { text: "> © 𝐁ᴜɴɴʏ : 𝐁ᴏᴛᴢ 🌝🩷💦" },
              carouselMessage: {
                cards: cards
              }
            }
          }
        }
      }, { quoted: msg });

      // 6. Relay the message
      await sock.relayMessage(sentPayload.key.remoteJid, sentPayload.message, { messageId: sentPayload.key.id });

    } catch (error) {
      console.error(error);
      await sock.sendMessage(jid, { text: `❌ Error:\n${error.message}` }, { quoted: msg });
    }
  },
};