/**
 * ============================================================================
 * UNIVERSAL ENTRY POINT FOR HOSTINGER / PHUSION PASSENGER / NODE.JS MANAGER
 * ============================================================================
 */

const { server } = require('./server/license-server.js');

const port = process.env.PORT || process.env.LICENSE_SERVER_PORT || 3001;

if (!server.listening) {
  server.listen(port, () => {
    console.log(`Node.js App running on port ${port}`);
  });
}

module.exports = server;
