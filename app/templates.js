class Templates
{
    constructor()
    {
        this.templates = {};

        this.RegisterTemplates();
    }

    RegisterTemplates()
    {
        this.templates['player-list-item'] = 
        {
            parentElement: 'li',
            content: '<div class="card w-100"><div class="card-body"><h5 class="card-title main-playlist-item-name">${data.name}</h5><h6 class="card-subtitle mb-2 main-playlist-item-title">${data.video}</h6></div></div>'
        };

        this.templates['search-list-item'] = 
        {
            parentElement: 'div',
            content: '<div class="card"><div class="row list-item m-1"><div class="col col-5" data-id="${data.id}" data-title="${data.title}"><img src="${data.image}"></div><div class="col col-7 search-item-title" data-id="${data.id}" data-title="${data.title}">${data.title}</div></div></div>'
        };

        this.templates['queue-list-item'] = 
        {
            parentElement: 'div',
            content: '<div class="card w-100 mb-3 queue-card" data-userid="${data.id}"><div class="card-body queue-card" data-userid="${data.id}"><h5 class="card-title search-item-name queue-card" data-userid="${data.id}">${data.name}</h5><h6 class="card-subtitle mb-2 search-item-title queue-card" data-userid="${data.id}">${data.video}</h6></div></div>'
        };

        this.templates['transaction-text'] = 
        {
            parentElement: 'div',
            content: '<p class="text-center transaction-text-name">${data.name}</p><p class="text-center transaction-text-title">${data.title}</p><p class="text-center transaction-text-time">Começa em <span id="transaction-time" data-time="${data.time}">${data.time}</span> segundos...</p>'
        };

        this.templates['queue-admin-video'] = 
        {
            parentElement: 'div',
            content: '<div class="row"><div class="col col-md-12"><p>${data.videoTitle}</p></div></div><div class="row text-end"><div class="col col-md-12"><p><button class="btn btn-primary" type="button" id="change-video">Alterar</button></p></div></div><div class="row text-end"><div class="col col-md-12"><p><button class="btn btn-danger" type="button" id="remove-video">Remover</button></p></div></div>'
        };
    }

    RenderTemplate(name, data)
    {
        const template = this.templates[name];
        const fn = new Function('data', "return `" + template.content + "`");
        const el = document.createElement(template.parentElement);
        el.innerHTML = fn(data);
        return el;
    }
}