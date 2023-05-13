const { app, BrowserWindow } = require('electron');
const Server = require('./core/server.js');
const ConfigManager = require('./configManager.js');
const path = require('path');

var serverInstance;
global.config = new ConfigManager();

(async () => 
{
    await config.Load();

    const devMode = config.Get('devMode.active');

    const createWindow = function() {
        const win = new BrowserWindow({
            width: 800,
            height: 600,
            frame: !devMode,
            fullscreen: !devMode,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false,
                preload: path.join(__dirname, 'preload.js'),
            }
        });

        if (devMode)
        {
            win.maximize();
        }

        win.loadURL('http://localhost:3000/main').then(() => 
        {
            this.App.AfterLoad();
        });
    }

    const startExpress = () => 
    {
        serverInstance = new Server();
        serverInstance.Start(createWindow);
    }

    app.whenReady().then(() => {
        startExpress();
    });

})();