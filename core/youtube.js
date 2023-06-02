class Youtube
{
    constructor(settings)
    {
        this.settings = settings;
        const ConfigManager = require('../configManager.js');
        const LogManager = require('../logManager.js');

        this.configManager = new ConfigManager(this.settings.appPath);
        this.logManager = new LogManager(this.settings.logTimestamp);

        this.configManager.Load();

        this.searchPattern = this.configManager.Get('search.searchPattern');

        const { google } = require("googleapis");
        this.google = google;
        this.fs = require('fs');

        this.jsonFilename = './youtube.json';
        this.jsonObject = 
        {
            count: 0,
            datetime: Date.now(),
            keyIndex: 0
        };

        this.youtubeKeys = this.configManager.Get('search.youtubeApiKeys');

        this.JsonFileCheck();
    }

    SetupYoutubeApi()
    {
        this.youtube = this.google.youtube(
        {
            version: "v3",
            auth: this.youtubeKeys[this.jsonObject.keyIndex]
        });
    }

    async Search(queryString)
    {
        try 
        {
            const response = await this.youtube.search.list(
            {
                part: 'snippet',
                q: this.searchPattern.replace(/\<busca\>/g, queryString),
                safeSearch: 'strict',
                type: 'video',
                videoDuration: 'medium',
                videoEmbeddable: true,
                maxResults: 15
            });

            this.JsonFileWrite(true);

            let list = [];
            response.data.items.forEach(item =>
            {
                list.push(
                {
                    videoId: item.id.videoId,
                    title: item.snippet.title,
                    thumbnail: item.snippet.thumbnails.default.url
                });
            });

            return {
                success: true,
                data: list
            };
        }
        catch (e)
        {
            console.log(response);
            this.logManager.Log('YT201', this.logManager.types.ERROR, e);
            return {
                success: false,
                data: e
            };
        }
    }

    async GetPlaylistVideos(playlistId)
    {
        try 
        {
            const response = await this.youtube.playlistItems.list(
            {
                part: 'snippet,contentDetails',
                playlistId: playlistId,
                maxResults: 50
            });

            let list = [];
            response.data.items.forEach(item =>
            {
                list.push(
                {
                    videoId: item.contentDetails.videoId,
                    title: item.snippet.title,
                    thumbnail: item.snippet.thumbnails.default.url
                });
            });

            return {
                success: true,
                data: list
            };
        }
        catch (e)
        {
            this.logManager.Log('YT202', this.logManager.types.ERROR, e);
            return {
                success: false,
                data: e
            };
        }
    }

    JsonFileCheck()
    {
        this.fs.readFile(this.jsonFilename, { flag: 'a+' }, function(err, data)
        {
            // No file or empty data, creates a new file
            if (!data || !data.length) 
            {
                this.JsonFileWrite();
            }
            else 
            {
                const content = JSON.parse(data);

                // If last registered datetime is lower than 24 hours ago, the file is old and need to be updated
                if (content.datetime < (Date.now() - (60 * 60 * 24)))
                {
                    this.JsonFileWrite();
                }
                else
                {
                    // If file isn't old, it could be a app crash, power off or anything that restarted the app, so youtube data needs to be reloaded
                    this.jsonObject = content;
                }
            }
        }.bind(this));
    }

    JsonFileWrite(increaseCounter)
    {
        if (increaseCounter)
        {
            // If search counter reaches 99 or more, resets it and increase keyIndex to change key for next 100 searches
            if (this.jsonObject.count >= 99)
            {
                this.jsonObject.count = 0;
                this.jsonObject.keyIndex++;
                this.SetupYoutubeApi();
            }
            else 
            {
                this.jsonObject.count++;
            }

            this.jsonObject.datetime = Date.now();
        }
        else 
        {
            this.SetupYoutubeApi();
        }

        this.fs.writeFile(this.jsonFilename, JSON.stringify(this.jsonObject), (data) => {});
    }
}

module.exports = Youtube;