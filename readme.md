
# Config.json: 

 - `devMode`:
    - `active`: (bool) When active it doesn't starts up application on full screen mode and allow to use `initialVideos` option
    - `initialVideos`: (array of strings) A list of ids of videos that would be added to playlist at the app startup for testing purposes
 - `app`: 
    - `transaction`: 
        - `waitTime`: (int) The amount of time in seconds the transaction will be showed before starts next video
        - `fadeTime`: (int) The fadeIn/fadeOut time in miliseconds to show/hide the transaction overlay
        - `playApplauseAudio`: (bool) Should play or not the applause audio when a video ends
    - `playlist`:
        - `playlistItemFadeTime`: (int) The fadeIn/fadeOut time in miliseconds that videos cards in playlist will be added/removed
        - `waitVideoPlaylistId`: (string) The id of a youtube playlist to be played when no video is queued. Remove this option to disabled it.
        - `hidePlaylist`: (bool) Set true to hide the entire playlist
        - `hidePlaylistVideoName`: (bool) Set true to hide the video name from playlist. Will hide in mobile's queue as well.
        - `hiddenVideoNameText`: (string) When video name is hidden by `hidePlaylistVideoName`, this text replaces the video title. Can be empty as well.
    - `qrcode`:
        - `show`: (bool) Should show or not the qrcode image
    - `queue`:
        - `showLoadConfirmationAtStartup`: (bool) If a queue is detected on startup, __true__ asks if it should be loaded, __false__ loads it automatically.
    - `server`:
        - `port`: The server port that the app should run. Default is 3000.
- `search`:
    - `youtubeApiKey`: (string) The api key 
    - `searchPattern`: (string) An string to be used for seaching the video. Use `<busca>` to be replaced by user's search term. Ex. `"<busca> karaoke"`.