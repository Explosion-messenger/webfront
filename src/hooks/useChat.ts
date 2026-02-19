import { useState, useEffect, useRef } from 'react';
import api from '../api';

export interface User {
    id: number;
    username: string;
    avatar_path?: string;
}

export interface MessageFile {
    id: number;
    filename: string;
    path: string;
    mime_type: string;
    size: number;
}

export interface Message {
    id: number;
    chat_id: number;
    sender_id: number;
    sender: User;
    text?: string;
    file?: MessageFile;
    created_at: string;
}

export interface Chat {
    id: number;
    name?: string;
    is_group: boolean;
    members: User[];
    last_message?: Message;
}

export function useWebSocket(
    token: string | null,
    onNewMessage: (msg: Message) => void,
    onDeleteMessage: (messageId: number, chatId: number) => void,
    onNewChat: (chat: Chat) => void,
    onOnlineList: (ids: number[]) => void,
    onUserStatus: (userId: number, online: boolean) => void,
) {
    const ws = useRef<WebSocket | null>(null);

    useEffect(() => {
        if (!token) return;

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const socketUrl = `${protocol}//${window.location.host}/ws?token=${token}`;
        const socket = new WebSocket(socketUrl);

        socket.onmessage = async (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'new_message') {
                    onNewMessage(data.data);
                } else if (data.type === 'delete_message') {
                    onDeleteMessage(data.data.message_id, data.data.chat_id);
                } else if (data.type === 'new_chat') {
                    onNewChat(data.data);
                } else if (data.type === 'online_list') {
                    onOnlineList(data.data);
                } else if (data.type === 'user_status') {
                    onUserStatus(data.data.user_id, data.data.online);
                }
            } catch (err) {
                console.error('WS parse error:', err);
            }
        };

        socket.onclose = () => {
            if (token) setTimeout(() => { }, 3000); // reconnect handled by effect re-run
        };

        socket.onerror = (err) => console.error('WS error:', err);

        ws.current = socket;
        return () => socket.close();
    }, [token]);

    return ws;
}

export function useChats() {
    const [chats, setChats] = useState<Chat[]>([]);

    const fetchChats = async () => {
        try {
            const resp = await api.get('/chats');
            const sorted = resp.data.sort((a: Chat, b: Chat) => {
                const da = a.last_message ? new Date(a.last_message.created_at).getTime() : 0;
                const db = b.last_message ? new Date(b.last_message.created_at).getTime() : 0;
                return db - da;
            });
            setChats(sorted);
        } catch (err) {
            console.error(err);
        }
    };

    return { chats, setChats, fetchChats };
}

export function useMessages(activeChatId: number | null) {
    const [messages, setMessages] = useState<Message[]>([]);

    useEffect(() => {
        if (!activeChatId) { setMessages([]); return; }
        api.get(`/messages/${activeChatId}`)
            .then(r => setMessages(r.data))
            .catch(console.error);
    }, [activeChatId]);

    return { messages, setMessages };
}

export function useAvatarEditor(refreshUser: () => Promise<void>) {
    const [showAvatarEditor, setShowAvatarEditor] = useState(false);
    const [imgSrc, setImgSrc] = useState('');
    const [crop, setCrop] = useState<any>();
    const [completedCrop, setCompletedCrop] = useState<any>();
    const imgRef = useRef<HTMLImageElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setCrop(undefined);
            const reader = new FileReader();
            reader.onload = () => {
                setImgSrc(reader.result?.toString() || '');
                setShowAvatarEditor(true);
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    const handleAvatarSave = async () => {
        if (!completedCrop || !imgRef.current) return;
        const canvas = document.createElement('canvas');
        const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
        const scaleY = imgRef.current.naturalHeight / imgRef.current.height;
        canvas.width = completedCrop.width;
        canvas.height = completedCrop.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(
            imgRef.current,
            completedCrop.x * scaleX,
            completedCrop.y * scaleY,
            completedCrop.width * scaleX,
            completedCrop.height * scaleY,
            0, 0,
            completedCrop.width,
            completedCrop.height
        );

        canvas.toBlob(async (blob) => {
            if (!blob) return;
            const formData = new FormData();
            formData.append('file', blob, 'avatar.jpg');
            try {
                await api.post('/me/avatar', formData);
                await refreshUser();
                setShowAvatarEditor(false);
                setImgSrc('');
            } catch (err) {
                console.error(err);
            }
        }, 'image/jpeg');
    };

    const handleAvatarDelete = async () => {
        if (!window.confirm('Delete avatar?')) return;
        try {
            await api.delete('/me/avatar');
            await refreshUser();
        } catch (err) {
            console.error(err);
        }
    };

    const handleClearAllAvatars = async () => {
        if (!window.confirm('Clear ALL avatars from the server? THIS CANNOT BE UNDONE.')) return;
        try {
            await api.delete('/admin/avatars/clear');
            await refreshUser();
        } catch (err) {
            console.error(err);
        }
    };

    return {
        showAvatarEditor, setShowAvatarEditor,
        imgSrc, crop, setCrop, completedCrop, setCompletedCrop,
        imgRef, fileInputRef,
        onSelectFile, handleAvatarSave, handleAvatarDelete, handleClearAllAvatars,
    };
}
