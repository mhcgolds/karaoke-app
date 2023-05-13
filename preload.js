const ConfigManager = require('./configManager.js');
const configManager = new ConfigManager();

(async () => 
{
    await configManager.Load();

    window.config = configManager;
})();