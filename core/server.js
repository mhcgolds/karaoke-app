class Server
{
    constructor()
    {
        const app = require('./app');
        this.App = new app();
        this.admins = [];

        this.instanceId = Date.now();
    }

    Start(onListen)
    {
        this.SetupExpress(onListen);
        this.CreateRoutes();
    }

    SetupExpress(onListen)
    {
        const express = require('express');
        this.express = express();
        const port = 3000;
        const path = require('path');

        this.express.set('views', path.join(__dirname, '..', '/views'));
        this.express.set('view engine', 'ejs');
        this.express.engine('html', require('ejs').renderFile);

        this.express.use('/static', express.static(path.join(__dirname, '..', 'node_modules/bootstrap/dist')));
        this.express.use('/socketio', express.static(path.join(__dirname, '..', 'node_modules/socket.io/client-dist')));
        this.express.use('/app', express.static(path.join(__dirname, '..', 'app')));
        this.express.use('/assets', express.static(path.join(__dirname, '..', 'assets')));

        const httpServer = this.express.listen(port, () => 
        {
            if (onListen) onListen();
        });
        
        const { Server } = require("socket.io");
        this.io = new Server(httpServer);
        this.App.SetSocket(this.io);
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
    }

    CreateRoutes()
    {
        // Main screen
        this.express.get('/main', (req, res) => 
        {
            const ip = require('ip');
            res.render('index.html', { serverIp: ip.address() });
        });

        // Mobile routes
        const appTitle = config.Get('app.mobile.appTitle', 'Karaokê');
        const mobileSettings = JSON.stringify(
        {
            hidePlaylistVideoName: config.Get('app.playlist.hidePlaylistVideoName', false),
            hiddenVideoNameText: config.Get('app.playlist.hiddenVideoNameText', ''),
            emptyQueueMessage: config.Get('app.mobile.emptyQueueMessage', null),
            nextQueueMessage: config.Get('app.mobile.nextQueueMessage', null),
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
                  adminPassword = config.Get('app.admin.password', null);

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