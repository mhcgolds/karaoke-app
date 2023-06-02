class Server
{
    constructor(settings)
    {
        const app = require('./app');
        this.App = new app(settings);
        this.admins = [];
        this.settings = settings;

        this.instanceId = Date.now();

        const ConfigManager = require('../configManager.js');
        const LogManager = require('../logManager.js');

        this.configManager = new ConfigManager(this.settings.appPath);
        this.logManager = new LogManager(this.settings.logTimestamp);

        this.configManager.Load();
    }

    Start(onListen)
    {
        this.SetupExpress(onListen);
        this.CreateRoutes();
    }

    SetupExpress(onListen)
    {
        const port = this.configManager.Get('app.server.port', 3000);
        const path = require('path');
        const express = require('express');

        this.express = express();
        this.express.set('views', path.join(__dirname, '..', '/views'));
        this.express.set('view engine', 'ejs');
        this.express.engine('html', require('ejs').renderFile);
        this.express.use('/static', express.static(path.join(__dirname, '..', 'node_modules/bootstrap/dist')));
        this.express.use('/socketio', express.static(path.join(__dirname, '..', 'node_modules/socket.io/client-dist')));
        this.express.use('/app', express.static(path.join(__dirname, '..', 'app')));
        this.express.use('/assets', express.static(path.join(__dirname, '..', 'assets')));

        try 
        {
            const httpServer = this.express.listen(port, () => 
            {
                this.logManager.Log('SRV101', this.logManager.types.INFO, `Server started at port "${port}"`);
                if (onListen) onListen.call(this);
            });
        
            const { Server } = require("socket.io");
            this.io = new Server(httpServer);
            this.App.SetSocket(this.io);
        }
        catch (e)
        {
            this.logManager.Log('SRV901', this.logManager.types.ERROR, e);
        }
    }

    GetUserIp(req)
    {
        return req.socket.remoteAddress.replace(/^.+(?=:):/, '');
    }

    IsUserAdmin(req)
    {
        const userIp = this.GetUserIp(req);
        return !!this.admins.find(ip => ip === userIp);
    }

    AddAdmin(req)
    {
        const userIp = this.GetUserIp(req);
        this.admins.push(userIp);
        this.App.AddAdmin(userIp);
        this.logManager.Log('SRV102', this.logManager.types.INFO, `Admin logged in. Ip=${userIp}`);
    }

    CreateRoutes()
    {
        // Main screen
        this.express.get('/main', (req, res) => 
        {
            const ip = require('ip');
            res.render('index.html', 
            { 
                serverIp: ip.address(), 
                logTimestamp: this.logManager.GetCurrentTimestamp(), 
                appPath: encodeURIComponent(this.settings.appPath)
            });
        });

        // Mobile routes
        const appTitle = this.configManager.Get('app.mobile.appTitle', 'Karaokê');
        const mobileSettings = JSON.stringify(
        {
            hidePlaylistVideoName: this.configManager.Get('app.playlist.hidePlaylistVideoName', false),
            hiddenVideoNameText: this.configManager.Get('app.playlist.hiddenVideoNameText', ''),
            emptyQueueMessage: this.configManager.Get('app.mobile.emptyQueueMessage', null),
            nextQueueMessage: this.configManager.Get('app.mobile.nextQueueMessage', null),
            appTitle
        });

        this.express.get('/', (req, res) => 
        {
            res.render('user.html', { serverInstanceId: this.instanceId, mobileSettings, appTitle });
        });

        this.express.get('/signin', (req, res) => 
        {
            res.render('signin.html', { serverInstanceId: this.instanceId, mobileSettings, appTitle });
        });

        this.express.get('/list', (req, res) => 
        {
            res.render('list.html', { serverInstanceId: this.instanceId, mobileSettings, appTitle });
        });

        this.express.get('/save-user', (req, res) => 
        {
            const userId = this.App.AddUser(req.query.name);
            res.send(userId);
        });

        this.express.get('/queue-add', (req, res) => 
        {
            const result = this.App.QueueVideo(req.query.videoId, req.query.videoTitle, req.query.userId);
            res.send(result);
        });

        this.express.get('/queue-list', (req, res) => 
        {
            const result = this.App.GetQueue();
            res.send(result);
        });

        this.express.get('/search', (req, res) => 
        {
            (async function()
            {
                const result = await this.App.Search(req.query.q);

                if (result.success)
                {
                    res.send(result.data);
                }
                else 
                {
                    res.status(500);
                    res.send(result.data);
                }
            }.bind(this))();
        });

        // Mobile admin
        this.express.get('/admin', (req, res) => 
        {
            if (this.IsUserAdmin(req))
            {
                res.render('admin.html', { serverInstanceId: this.instanceId, mobileSettings, appTitle, admin: true });
            }
            else 
            {
                res.redirect('/login');
            }
        });

        this.express.get('/login', (req, res) => 
        {
            if (!this.IsUserAdmin(req))
            {
                res.render('login.html', { serverInstanceId: this.instanceId, mobileSettings, appTitle });
            }
            else 
            {
                res.redirect('/admin');
            }
        });

        this.express.get('/auth', (req, res) => 
        {
            const userPassword = req.query.password,
                  adminPassword = this.configManager.Get('app.admin.password', null);

            if (!adminPassword)
            {
                res.status(500);
                res.send('A senha do administrador não foi definida na configuração!');
            }
            else if (!userPassword || userPassword !== adminPassword)
            {
                res.status(500);
                res.send('Senha inválida.');
            }
            else 
            {
                this.AddAdmin(req);
                res.send(true);
            }
        });
    }
}

module.exports = Server;