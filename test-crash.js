const { ProcessService } = require('./server/dist/services/process.service.js');
const { ConfigService } = require('./server/dist/services/config.service.js');
const { RconService } = require('./server/dist/services/rcon.service.js');
const path = require('path');
const fs = require('fs');

async function test() {
  const config = ConfigService.getInstance();
  // Override root path for test
  config.config = { rootPath: path.join(__dirname, 'test') };
  const proc = ProcessService.getInstance();
  await proc.start();
  
  // wait 2s
  await new Promise(r => setTimeout(r, 2000));
  const status = proc.getStatus();
  console.log("Crash Diagnostic:", status.crashDiagnostic);
}
test();
