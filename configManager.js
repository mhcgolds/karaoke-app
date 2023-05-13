class ConfigManager
{
    constructor()
    {
    }

    async Load()
    {
        const fs = require('fs');
        const path = require('path');

        try 
        {
            this.content = await fs.promises.readFile(path.join(__dirname, 'config.json'));
        }
        catch (e)
        {
            console.error('Error loading configuration', e);
            return;
        }
        
        if (this.content)
        {
            this.config = JSON.parse(this.content);
        }
    }

    // Set the kay value using dot notation, ex. 'app.transation.waitTime'
    Get(key, defaultValue)
    {
        const sections = key.split('.');
        let value, currentObj;

        sections.forEach(section => 
        {
            if (!currentObj && this.config[section])
            {
                currentObj = this.config[section];
            }
            else if ((currentObj[section] instanceof Object) && !(currentObj[section] instanceof Array))
            {
                currentObj = currentObj[section]
            }
            else 
            {
                value = currentObj[section];
            }
        });

        if (value === undefined)
        {
            if (!defaultValue)
            {
                console.log(`ConfigManager: Key '${key}' not found`);
            }
            else 
            {
                return defaultValue;
            }
        }
        else 
        {
            return value;
        }
    }
}

module.exports = ConfigManager;