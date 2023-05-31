const { app, BrowserWindow, Menu } = require('electron');
const Server = require('./core/server.js');
const ConfigManager = require('./configManager.js');
const LogManager = require('./logManager.js');
const path = require('path');

//require('@electron/remote/main').initialize();

var serverInstance;
global.config = new ConfigManager();
global.logManager = new LogManager();

logManager.Log('STARTUP', logManager.types.INFO, 'Starting up application');

(async () => 
{
    await config.Load();

    const devMode = config.Get('devMode.active');
    const serverPort = config.Get('app.server.port', 3000);

    const createWindow = function() {
        const win = new BrowserWindow({
            width: 800,
            height: 600,
            frame: true,
            fullscreen: !devMode,
            autoHideMenuBar: true,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false,
                enableRemoteModule: true,
                preload: path.join(__dirname, 'preload.js'),
            }
        });

        if (devMode)
        {
            win.maximize();
            win.webContents.openDevTools();
        }

        win.webContents.openDevTools();

        Menu.setApplicationMenu(Menu.buildFromTemplate(
        [{
            id: '1',
            label: 'Fechar',
            click: app.quit
        }]));

        //require('@electron/remote/main').enable(win.webContents);

        win.loadURL(`http://localhost:${serverPort}/main`).then(() => 
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