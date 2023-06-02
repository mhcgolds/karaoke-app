const { app, BrowserWindow, Menu } = require('electron');
const Server = require('./core/server.js');
const ConfigManager = require('./configManager.js');
const LogManager = require('./logManager.js');
const Settings = require('./core/settings.js');
const path = require('path');

//require('@electron/remote/main').initialize();

var serverInstance;
var appPath = app.getAppPath();
var config = new ConfigManager(app.getAppPath());
var logManager = new LogManager();
var settings = new Settings(appPath, logManager.GetCurrentTimestamp());

logManager.Log('STARTUP', logManager.types.INFO, 'Starting up application');
config.Load();

const devMode = config.Get('devMode.active', false);
const serverPort = config.Get('app.server.port', 3000);

const createWindow = function() 
{
    const win = new BrowserWindow(
    {
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

app.whenReady().then(() => 
{
    serverInstance = new Server(settings);
    serverInstance.Start(createWindow);
});