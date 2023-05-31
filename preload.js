const ConfigManager = require('./configManager.js');
const configManager = new ConfigManager();

window.logManager = require('./logManager.js');

(async () => 
{
    await configManager.Load();

    window.config = configManager;
})();