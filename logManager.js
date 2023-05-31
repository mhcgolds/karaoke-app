class LogManager
{
    constructor(timestamp)
    {
        this.fs = require('fs');
        this.path = require('path');
        this.logPath = this.path.join(__dirname, 'logs');
        this.lineBreak = '';

        if (timestamp)
        {
            this.timestamp = timestamp;
        }
        else 
        {
            this.timestamp = this.GetTimestamp();
        }

        this.fileName = `${this.timestamp}.json`;
        this.fullFileName = this.path.join(this.logPath, this.fileName);

        this.types = 
        {
            INFO: 1,
            ERROR: 2
        };
    }

    GetCurrentTimestamp()
    {
        return this.timestamp;
    }

    GetTimestamp()
    {
        return (new Date()).toISOString().replace(/\D/g, '-').substring(0, 19);
    }

    Log(code, type, message)
    {
        let logEntry = 
        {
            DateTime: this.GetTimestamp(),
            Code: code,
            Type: Object.keys(this.types)[type - 1],
            Message: message
        };

        this.fs.writeFileSync(this.fullFileName,  this.lineBreak + JSON.stringify(logEntry), {flag: 'a'});

        this.lineBreak = '\n';
    }
}

module.exports = LogManager;