class App 
{
    constructor()
    {
        this.users = [];
        this.admins = [];

        const Youtube = require('./youtube.js');
        this.youtube = new Youtube();

        // Tests
        if (config.Get('devMode.active'))
        {
            console.log('Dev mode ACTIVE');

            const videoList = config.Get('devMode.initialVideos', null);

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

            this.RefreshClientQueue();

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
    }

    SocketEmit(event, data)
    {
        if (this.io)
        {
            this.io.emit(event, data);
        }
    }

    RefreshClientQueue(skip)
    {
        this.SocketEmit('refresh-list', { users: this.GetQueue(), skip: !!skip });
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
                user.videoTitle = null
                this.RefreshClientQueue();
            }
        }
    }
}

module.exports = App;