class User
{
    constructor(wnd, serverInstanceId, settings, isAdmin)
    {
        this.wnd = wnd;
        this.templates = new Templates();
        this.userId = this.wnd.sessionStorage.getItem('user-id');
        this.serverInstanceId = serverInstanceId;
        this.settings = settings;
        this.adminMode = !!isAdmin;

        // DOM elements
        this.videoSearch = this.wnd.document.querySelector('#video-search');
        this.container = this.wnd.document.querySelector('#container');
        this.queueList = this.wnd.document.querySelector('#queue-list');
        this.nextMessage = this.wnd.document.querySelector('#next-message');

        // Admin stuff
        //this.queueModal = new bootstrap.Modal(this.wnd.document.querySelector('#queue-modal'));
        this.modalUserId = null;

        if (this.nextMessage)
        {
            this.nextMessage.innerHTML = this.settings.nextQueueMessage;
        }

        this.Init();
    }

    Init()
    {
        if (!this.IsAdmin())
        {
            this.CheckUserName();
        }

        this.OpenSocket();
        this.Events();
        
        if (this.IsAdmin())
        {
            this.SetAdminMode();
        }
    }

    CheckUserName()
    {
        this.userName = this.wnd.sessionStorage.getItem('user-name');
        this.instanceId = this.wnd.sessionStorage.getItem('server-instance-id');

        if (!this.userName || (this.instanceId !== this.serverInstanceId))
        {
            this.wnd.sessionStorage.removeItem('user-id');
            this.wnd.sessionStorage.removeItem('user-name');
            this.wnd.sessionStorage.removeItem('server-instance-id');

            this.wnd.location.href = '/signin';
        }
    }

    Events()
    {
        if (this.videoSearch)
        {
            this.videoSearch.addEventListener('keyup', () => 
            {
                if (this.typingTimer)
                {
                    this.wnd.window.clearTimeout(this.typingTimer);
                }

                this.typingTimer = this.wnd.window.setTimeout(this.SearchSong.bind(this), 600);
            });
        }

        if (this.container)
        {
            this.container.addEventListener('click', e => 
            {
                const videoId = e.target.dataset.id;

                if (videoId)
                {
                    this.QueueVideo(videoId, e.target.dataset.title);
                }
            });
        }
    }

    SearchSong()
    {
        const queryString = this.videoSearch.value;

        fetch(`/search?q=${queryString}`)
            .then(res => res.json())
            .then(items => 
            {
                if (!items.errors)
                {
                    this.ClearList();
                    items.forEach(item => 
                    {
                        this.AddListItem(item.videoId, item.title, item.thumbnail);
                    });
                }
                else
                {
                    this.wnd.window.alert(items.errors[0].message);
                }
            })
            .catch(e => this.wnd.window.alert(e));
    }

    ClearList()
    {
        this.container.querySelectorAll('div.list-item').forEach(el => el.parentNode.parentNode.remove());
    }

    AddListItem(videoId, title, image)
    {
        this.container.appendChild(this.templates.RenderTemplate('search-list-item', 
        {
            id: videoId,
            image: image,
            title: title,
            admin: this.IsAdmin()
        }));
    }

    QueueVideo(videoId, videoTitle)
    {
        fetch(`/queue-add?videoId=${videoId}&userId=${this.userId}&videoTitle=${videoTitle}`)
            .then(res => res.text())
            .then(res => 
            {
                if (res === 'true')
                {
                    this.wnd.window.alert('Video adicionado à fila!');
                    this.wnd.location.href = '/list';
                }
                else 
                {
                    this.wnd.window.alert('Você já tem um vídeo na fila. Só poderá incluir outro após canta-lo.');
                }
            })
            .catch(e => 
            {
                this.wnd.window.alert('Erro ao enviar video');
            });
    }

    OpenSocket()
    {
        this.io = io();
        this.io.on('refresh-list', (data) => 
        {
            this.queue = data.users;
            this.RefreshQueue(this.queue);
        });

        this.RequestQueue();
    }

    RefreshQueue(queue)
    {
        // Clear list
        this.queueList.innerText = '';

        if (queue && queue.length)
        {
            let hideAdminModal = true;
            queue.forEach(listItem => 
            {
                let video = listItem.videoTitle;
                if (listItem.id !== this.userId && this.settings.hidePlaylistVideoName)
                {
                    video = this.settings.hiddenVideoNameText;
                }

                if (this.IsAdmin() && this.modalUserId && this.modalUserId === listItem.id)
                {
                    hideAdminModal = false;
                }

                this.queueList.appendChild(this.templates.RenderTemplate('queue-list-item', { name: listItem.name, video, id: listItem.id }));
            });

            if (this.nextMessage)
            {
                if (queue[0].id === this.userId)
                {
                    this.nextMessage.style.display = 'inline-block';
                }
                else 
                {
                    this.nextMessage.style.display = 'none';
                }
            }

            if (this.IsAdmin() && hideAdminModal)
            {
                this.queueModal.hide();
            }
        }
        else 
        {
            this.queueList.innerHTML = this.settings.emptyQueueMessage || 'A fila está vazia! Aproveite para colocar uma música!';
            
            if (this.IsAdmin())
            {
                this.queueModal.hide();
            }
        }
    }

    RequestQueue()
    {
        this.io.emit('refresh-list');
    }

    IsAdmin()
    {
        return this.adminMode;
    }

    SetAdminMode()
    {
        this.wnd.document.querySelector('#skip-video').addEventListener('click', (e) =>
        {
            this.io.emit('skip-video');
        });

        this.queueList.addEventListener('click', (e) => 
        {
            if (e.target.classList.value.indexOf('queue-card'))
            {
                this.ShowQueueItemMenu(e.target.dataset.userid);
            }
        });

        this.wnd.document.querySelector('div.modal-body').addEventListener('click', (e) =>
        {
            if (e.target.id === 'remove-video')
            {
                this.io.emit('remove-video', { userId: this.modalUserId });
            }
        });
    }

    ShowQueueItemMenu(userId)
    {
        const user = this.GetQueueUser(userId);

        if (user)
        {
            const modalBody = this.queueModal._element.querySelector('div.modal-body');

            modalBody.innerHTML = '';
            modalBody.appendChild(this.templates.RenderTemplate('queue-admin-video', 
            {
                videoTitle: user.videoTitle
            }));

            this.modalUserId = userId;

            this.queueModal.show();
        }
    }

    GetQueueUser(userId)
    {
        if (this.queue && this.queue.length)
        {
            return this.queue.find(item => item.id === userId);
        }

        return null;
    }
}