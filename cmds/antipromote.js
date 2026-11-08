/**
 * cmds/antipromote.js
 *
 * .antipromote on   — whoever promotes a member AND the promoted member are demoted
 * .antipromote kick — whoever promotes a member is kicked, the promoted member is demoted
 * .antipromote off  — disable
 *
 * All logic lives in lib/antiadmin.js. Owner only, groups only.
 */
module.exports = require('../lib/antiadmin').buildCommand('promote');