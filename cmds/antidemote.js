/**
 * cmds/antidemote.js
 *
 * .antidemote on   — whoever demotes an admin is demoted, the demoted admin is promoted back
 * .antidemote kick — whoever demotes an admin is kicked, the demoted admin is promoted back
 * .antidemote off  — disable
 *
 * All logic lives in lib/antiadmin.js. Owner only, groups only.
 */
module.exports = require('../lib/antiadmin').buildCommand('demote');