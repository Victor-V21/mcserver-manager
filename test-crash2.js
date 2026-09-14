const { ProcessService } = require('./server/dist/services/process.service.js');
const { ConfigService } = require('./server/dist/services/config.service.js');
const path = require('path');

async function test() {
  const config = ConfigService.getInstance();
  config.config = { rootPath: path.join(__dirname, 'test') };
  const proc = ProcessService.getInstance();
  
  console.log("Starting server...");
  proc.start().catch(console.error);
  
  for (let i = 0; i < 8; i++) {
    await new Promise(r => setTimeout(r, 1000));
    console.log(`[Sec ${i+1}] Crash Diagnostic:`, proc.getStatus().crashDiagnostic);
  }
  proc.stop();
}
test();
