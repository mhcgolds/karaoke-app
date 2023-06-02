class App 
{
    constructor(wnd, serverIp, logTimestamp, appPath)
    {
        this.wnd = wnd;
        this.templates = new Templates();

        // DOM Elements
        this.serverPort = document.querySelector('#server-port');
        this.playerList = document.querySelector('#player-list');
        this.videoTransaction = document.querySelector('#video-transaction');
        this.transactionText = document.querySelector('#transaction-text');
        this.audioApplause = document.querySelector('#audio-applause');
        this.messageContainer = document.querySelector('#message-container');
        this.messageContainerNo = document.querySelector('#message-container span.message-container-no');
        this.messageContainerYes = document.querySelector('#message-container span.message-container-yes');
        this.messageContainerText = document.querySelector('#message-container div.message-container-text');

        // Load managers
        this.appPath = decodeURIComponent(appPath);
        const path = require('path');
        const ConfigManager = require(path.join(this.appPath, 'configManager.js'));
        const LogManager = require(path.join(this.appPath, 'logManager.js'));

        this.configManager = new ConfigManager(this.appPath);
        this.logManager = new LogManager(logTimestamp);

        this.configManager.Load();

        // Params
        this.transactionTime = this.configManager.Get('app.transaction.waitTime');
        this.transactionFadeTime = this.configManager.Get('app.transaction.fadeTime');
        this.playlistItemFadeTime = this.configManager.Get('app.playlist.playlistItemFadeTime');

        this.queue = [];
        this.playStatus = -1;
        this.serverIp = serverIp;

        this.Init();
    }

    Init()
    {
        this.HidePlaylist();
        this.CreateVideoContainer(() => 
        {
            this.OpenSocket();
            //this.FetchWaitingPlaylistVideos();
        });

        this.GenerateQrCode();

        this.logManager.Log('APP101', this.logManager.types.INFO, 'App started');
    }

    CreateVideoContainer(onReady)
    {
        const YouTubePlayer = require('youtube-player');
        this.player = YouTubePlayer('video-player', 
        {
            width: '100%',
            height: '100%',
            playerVars: 
            {
                rel: 0,
                controls: 0,
                showinfo: 0,
                disablekb: 1,
                modestbranding: 1,
                iv_load_policy: 3,
            }
        });

        this.player.on('ready', (e) => 
        {
            this.videoPlayer = document.querySelector('#video-player');
            onReady();
        });

        this.player.on('stateChange', this.PlayerStateChange.bind(this));
    }

    QueueVideo(name, video)
    {
        let className = '';

        if (video !== this.lastVideoId)
        {
            className = 'd-none fadein-video';
        }

        const hidePlaylistVideoName = this.configManager.Get('app.playlist.hidePlaylistVideoName');
        if (hidePlaylistVideoName)
        {
            video = this.configManager.Get('app.playlist.hiddenVideoNameText', '');
        }

        this.playerList.appendChild(this.templates.RenderTemplate('player-list-item', {name, video, className}));
    }

    PlayNextVideo()
    {
        if (this.queue.length && !this.transactionIsShowing && this.playStatus !== 1)
        {
            this.waitingVideoOn = false;
            this.ShowVideoTransaction(this.queue[0], () => 
            {
                this.logManager.Log('APP102', this.logManager.types.INFO, `PLaying video. Id=${this.queue[0].videoId}`);

                this.RemoveFirstQueueVideo();
                this.player.playVideo().then(() => 
                {
                    this.playStatus = 1;
                });
            });
        }
        else if (!this.queue.length && !this.waitingVideoOn)
        {
            //this.PlayWaitingPlaylistVideo();
        }
    }

    PreloadVideo(videoId)
    {
        this.player.loadVideoById(videoId);
        this.player.stopVideo();
    }

    ClearQueue()
    {
        this.playerList.querySelectorAll('li').forEach(li => li.remove());
    }

    OpenSocket()
    {
        this.io = io();
        this.io.on('refresh-list', (data) => 
        {
            if (data.skip)
            {
                this.SkipVideo();
            }

            this.queue = data.users;
            this.RefreshQueue(this.queue);
        });

        this.io.on('queue-load-confirm', () => 
        {
            this.ShowQueueLoadConfirm();
        });

        this.RequestQueue();

        // Admin broadcasts
    }

    RefreshQueue(queue)
    {
        this.ClearQueue();

        if (queue)
        {
            let lastVideoId;
            queue.forEach(user => 
            {
                lastVideoId = user.videoId;
                this.QueueVideo(user.name, user.videoTitle);
            });

            if (lastVideoId && lastVideoId !== this.lastVideoId)
            {
                this.FlashLastVideo();
                this.lastVideoId = lastVideoId;
            }

            this.PlayNextVideo();
        }
    }

    RequestQueue()
    {
        this.io.emit('refresh-list');
    }

    PlayerStateChange(event)
    {
        if (this.waitingVideoOn)
        {
            if (event.data === 0 && !this.queue.length)
            {
                //this.PlayWaitingPlaylistVideo();
                return;
            }
        }

        this.RequestQueue();

        if (event.data === 0 || event.data === 5) // Video ended or cued
        {
            this.playStatus = 0; // Ready to play

            if (event.data === 0) // Video ended
            {
                this.PlayApplause();
            }
        }
    }

    RemoveFirstQueueVideo()
    {
        if (this.queue.length)
        {
            this.io.emit('remove-queue-item', this.queue[0].id);
            this.queue = this.queue.splice(1);
            $(this.playerList).find('li').first().fadeOut(this.playlistItemFadeTime);
        }
    }

    ShowVideoTransaction(video, callback)
    {
        if (!this.transactionIsShowing)
        {
            this.transactionIsShowing = true;
            this.PreloadVideo(video.videoId);
            $(this.videoPlayer).hide();
            $(this.transactionText).empty();
            $(this.videoTransaction)
                .removeClass('d-none')
                .hide()
                .fadeIn(this.transactionFadeTime, () => 
                {
                    $(this.transactionText)
                        .append(this.templates.RenderTemplate('transaction-text', { name: video.name, title: video.videoTitle, time: this.transactionTime }));

                    this.StartTransactionTimer(callback);
                });
        }
    }

    StartTransactionTimer(callback)
    {
        let currentTime = this.transactionTime;
        const $transactionTime = $('#transaction-time');
        const timer = () =>
        {
            if (currentTime > 1)
            {
                currentTime-= 1;
                $transactionTime.text(currentTime);
                this.transactionTimeout = window.setTimeout(timer, 1000);
            }
            else 
            {
                this.HideVideoTransaction(callback);
            }
        };

        // In case of skipping video, reset any timer that is currently running to start another video
        if (this.transactionTimeout)
        {
            window.clearTimeout(this.transactionTimeout);
        }

        timer();
    }

    ResetTransaction()
    {

    }

    HideVideoTransaction(callback)
    {
        $(this.videoTransaction).fadeOut(this.transactionFadeTime, () => 
        {
            $(this.videoPlayer).show();
            this.transactionIsShowing = false;
            callback();
        });
    }

    PlayApplause()
    {
        if (this.configManager.Get('app.transaction.playApplauseAudio'))
        {
            this.audioApplause.play();
        }
    }

    FlashLastVideo()
    {
        $(this.playerList)
            .find('li')
            .last()
                .hide()
                .fadeIn(this.playlistItemFadeTime);
    }

    GenerateQrCode()
    {
        if (this.configManager.Get('app.qrcode.show'))
        {
            var QRCode = require('qrcode');
            var canvas = document.getElementById('qr-code');
            const serverPort = this.configManager.Get('app.server.port', 3000);

            this.serverPort.innerText = serverPort;

            QRCode.toCanvas(canvas, `http://${this.serverIp}:${serverPort}/`, { width: 300, margin: 1 })
                .then(error => 
                {
                    if (error) console.error(error);
                });

            if (this.configManager.Get('app.qrcode.saveToFile', false))
            {
                const path = require('path');
                QRCode.toFile(path.join(this.appPath, 'qrcode.png'), `http://${this.serverIp}:${serverPort}/`, { width: 1000, margin: 1 })
                    .then(error => 
                    {
                        if (error) console.error(error);
                    });
            }
        }
    }

    FetchWaitingPlaylistVideos()
    {
        const playlistId = this.configManager.Get('app.playlist.waitVideoPlaylistId', null);

        if (playlistId)
        {
            (async function() 
            {
                const path = require('path');

                // path.resolve('../karaoke/core/youtube.js')
                const Youtube = require(path.resolve(path.join(__dirname, '../../../../../../core/youtube.js')));

                const youtube = new Youtube();
                this.waitingPlaylistData = await youtube.GetPlaylistVideos(playlistId);
                this.PlayNextVideo();
            }.bind(this))();
        }
    }

    HidePlaylist()
    {
        if (this.configManager.Get('app.playlist.hidePlaylist', false))
        {
            $('#playlist-column').addClass('d-none');
            $('#video-column').removeClass('col-md-10').addClass('col-md-12');
        }
    }

    PlayWaitingPlaylistVideo()
    {
        if (this.waitingPlaylistData)
        {
            // Get first not-played video
            const video = this.waitingPlaylistData.data.find(video => !video.played);

            if (video)
            {
                this.waitingVideoOn = true;
                this.PreloadVideo(video.videoId);
                this.player.playVideo();
                video.played = true;
                this.playStatus = 0;
            }
        }
    }

    IsVideoPlaying()
    {
        return (this.player.getPlayerState() !== 1);
    }

    SkipVideo()
    {
        this.transactionIsShowing = false;

        if (this.IsVideoPlaying())
        {
            this.player.pauseVideo();
            this.playStatus = 0;
            this.PlayNextVideo();
        }
    }

    ShowQueueLoadConfirm()
    {
        this.ShowMessage(
            'Há uma fila salva, deseja carrega-la ?', 
            1,
            () =>
            {
                this.io.emit('queue-load-confirm', null);
                this.RequestQueue();
                this.HideMessage();
            },
            () =>
            {
                this.HideMessage();
            });
    }

    // Types: 1- Yes or No
    ShowMessage(text, type, optionYes, optionNo)
    {
        if (type === 1)
        {
            $(this.messageContainerYes)
                .show()
                .on('click', optionYes.bind(this));

            $(this.messageContainerNo)
                .show()
                .on('click', optionNo.bind(this));
        }

        $(this.messageContainerText).text(text);
        $(this.messageContainer).show();
    }

    HideMessage()
    {
        $(this.messageContainer).hide();
    }
}