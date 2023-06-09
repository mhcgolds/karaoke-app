class App 
{
    constructor(settings)
    {
        this.users = [];
        this.admins = [];
        this.settings = settings;

        const ConfigManager = require('../configManager.js');
        const LogManager = require('../logManager.js');

        this.configManager = new ConfigManager(this.settings.appPath);
        this.logManager = new LogManager(this.settings.logTimestamp);

        this.configManager.Load();

        const Youtube = require('./youtube.js');
        this.youtube = new Youtube(settings);

        this.fs = require('fs');
        const path = require('path');

        this.jsonFilename = path.join(this.settings.appPath, 'data.json');

        this.JsonFileCheck();
        this.CheckForDevMode();
    }

    CheckForDevMode()
    {
        // Tests
        if (this.configManager.Get('devMode.active'))
        {
            console.log('Dev mode ACTIVE');
            this.logManager.Log('API101', this.logManager.types.INFO, 'Dev mode ON');

            const videoList = this.configManager.Get('devMode.initialVideos', null);

            if (videoList)
            {
                const userId = this.AddUser('Usuário Teste');
                videoList.forEach((videoId, index) => 
                {
                    this.QueueVideo(videoId, `Video teste #${index}`, userId, true);
                });
            }
        }
    }

    AddUser(name)
    {
        if (!this.users.find(user => user.name.toUpperCase() === name.toUpperCase()))
        {
            const userId = Date.now().toString();
            this.users.push(
            {
                id: userId,
                name,
                videoId: null,
                videoTitle: null,
                order: null
            });

            this.logManager.Log('API101', this.logManager.types.INFO, `User added '${name}'`);

            return userId;
        }
        else 
        {
            // Name already taken
            return false;
        }
    }

    QueueVideo(videoId, videoTitle, userId, admin)
    {
        const user = this.users.find(user => user.id == userId);

        if ((user && !user.videoId) || admin)
        {
            const order = this.users.reduce((order, user) => (user.order && user.order > order) ? user.order : order, []);

            user.videoId = videoId;
            user.videoTitle = videoTitle;
            user.order = isNaN(order) ? 1 : (order + 1);
            this.RefreshClientQueue();

            this.logManager.Log('API102', this.logManager.types.INFO, `Video queued. Id=${videoId} User=${userId}`);

            return true;
        }

        return false;
    }

    GetQueue()
    {
        return this.users.filter(user => user.videoId);
    }

    SetSocket(io)
    {
        this.io = io;
        
        this.io.on('connection', (socket) => 
        {
            let userIp = this.ClearIp(socket.handshake.address);

            socket.on('remove-queue-item', this.RemoveQueueItem.bind(this));
            socket.on('refresh-list', this.RefreshClientQueue.bind(this));
            socket.on('queue-load-confirm', this.JsonFillDataConfirm.bind(this));

            this.RefreshClientQueue();
            this.EmitQueueLoadConfirm();

            // Admin listeners
            socket.on('skip-video', this.AdminSkipVideo.bind(this, userIp));
            socket.on('remove-video', this.AdminRemoveVideo.bind(this, userIp));
        });
    }

    RemoveQueueItem(userId)
    {
        const user = this.users.find(user => user.id == userId);
        user.videoId = null;
        user.videoTitle = null;
        user.order = null;

        this.JsonWriteData();
    }

    SocketEmit(event, data)
    {
        if (this.io)
        {
            this.io.emit(event, data);
        }
        else 
        {
            console.log('Socket not set', event, data);
        }
    }

    RefreshClientQueue(skip)
    {
        this.SocketEmit('refresh-list', { users: this.GetQueue(), skip: !!skip });
        this.JsonWriteData();
    }

    Search(searchQuery)
    {
        return this.youtube.Search(searchQuery);
    }

    AddAdmin(userId)
    {
        this.admins.push(userId);
    }

    IsAdmin(userIp)
    {
        return !!this.admins.find(ip => ip === userIp);
    }

    ClearIp(ip)
    {
        return ip.replace(/^.+(?=:):/, '');
    }

    AdminSkipVideo(userIp)
    {
        if (this.IsAdmin(userIp))
        {
            let nextUser = this.GetNextVideo();
            if (nextUser)
            {
                this.RemoveQueueItem(nextUser.id);
            }

            this.RefreshClientQueue(true);
        }
    }

    GetNextVideo()
    {
        let nextUser,
            latestOrder;

        this.users.forEach(user => 
        {
            if (user.order && (!latestOrder || user.order < latestOrder))
            {
                nextUser = user;
                latestOrder = user.order;
            }
        });

        return nextUser;
    }

    AdminRemoveVideo(userIp, data)
    {
        if (this.IsAdmin(userIp))
        {
            const user = this.users.find(user => user.id = data.userId);

            if (user)
            {
                user.order = null;
                user.videoId = null;
                user.videoTitle = null;

                this.RefreshClientQueue();
            }
        }
    }

    // Checks for a json file for queue. 
    // If found loads it, otherwise, creates it
    JsonFileCheck()
    {
        this.fs.readFile(this.jsonFilename, { flag: 'a+' }, function(err, data)
        {
            this.JsonFillData(data);
        }.bind(this));
    }

    JsonFillData(data)
    {
        if (data)
        {
            try 
            {
                data = JSON.parse(data);
            }
            catch (e)
            {
                return;
            }

            if ((!data || !data.length) && !this.configManager.Get('app.queue.showLoadConfirmationAtStartup', false))
            {
                this.users = data;
            }
            else 
            {
                this.tempJsonData = data;
            }
        }
    }

    JsonFillDataConfirm()
    {
        this.users = this.tempJsonData;
        this.RefreshClientQueue();
    }

    JsonWriteData()
    {
        try 
        {
            const content = this.users.filter(item => item.videoId);
            this.fs.writeFile(this.jsonFilename, JSON.stringify(content), (data) => {});
        }
        catch (e)
        {
            console.log('App.js: Error writing to json file', e);
        }
    }

    AfterLoad()
    {
        this.EmitQueueLoadConfirm();
    }

    EmitQueueLoadConfirm()
    {
        // Send socket signal to window if this.tempJsonData is filled
        if (this.io && this.tempJsonData.length)
        {
            this.SocketEmit('queue-load-confirm');
        }
    }
}

module.exports = App;