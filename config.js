const path = require('path');

// ---------------------------------------------------------------------
process.env.FONTCONFIG_PATH = path.join(__dirname, 'fonts');

global.botname = '𝖡𝐔𝐍𝐍𝐘 𝐗𝐌𝐃 ⟩ -';
global.ownername = 'ʙᴜɴɴʏ ᴍ›';
global.ownernumber = '919332567742';

// CLOUDINARY CONFIG
global.cloudinary = {
  cloud_name: 'wdhnno7y',
  api_key: '982463635612222',
  api_secret: 'ssIU_uQOjDZbnPGUuT2vC4Wg-RA',
};

// SIGHTENGINE API CONFIG (Anti Bad Image/Video/Sticker)
global.sightengine = {
  api_user: '1953441966',
  api_secret: 'rjfHLyWhpNaFWRNTFrmAB9JstbaKFPzz',
};

// GEMINI (Google GenAI) CONFIG — used by cmds/gedit.js (.gedit image editing)
global.gemini = {
  apiKey: process.env.GEMINI_API_KEY || 'AQ.Ab8RN6IZCT195vCiYJcnq9ovrLoWgr7oPgexhMV4RpalabKS1Q',
  // gemini-2.5-flash-image is the confirmed-stable image-edit model as of
  // writing. If you have access to a newer preview (e.g.
  // gemini-3.1-flash-image-preview) and want to try it, override via env
  // instead of editing this file: GEMINI_IMAGE_MODEL=gemini-3.1-flash-image-preview
  model: process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image',
};

// TELEGRAM PAIR BOT CONFIG
global.telegram = {
  botToken: process.env.TELEGRAM_BOT_TOKEN || '8071172016:AAHGLEG2VSjqh8TbijPp-c_fFc9t33CPJ7E',
  groupChatId: process.env.TELEGRAM_GROUP_CHAT_ID || '-1004362748081',
  groupInviteLink: process.env.TELEGRAM_GROUP_INVITE_LINK || 'https://t.me/+DkD37giDBYI0NDZl',
  ownerLink: 'https://t.me/th3bunny',
};

module.exports = {
  botname: global.botname,
  ownername: global.ownername,
  ownernumber: global.ownernumber,
  cloudinary: global.cloudinary,
  sightengine: global.sightengine,
  gemini: global.gemini,
  telegram: global.telegram,
};