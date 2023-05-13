class Youtube
{
    constructor()
    {
        this.searchPattern = config.Get('search.searchPattern');

        const { google } = require("googleapis");

        this.youtube = google.youtube(
        {
            version: "v3",
            auth: config.Get('search.youtubeApiKey'),
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
            return {
                success: false,
                data: e
            };
        }
    }
}

module.exports = Youtube;