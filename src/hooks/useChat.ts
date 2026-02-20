import { useState, useEffect, useRef } from 'react';
import api from '../api';
import { type Message, type Chat } from '../types';

export function useWebSocket(
    token: string | null,
    onNewMessage: (msg: Message) => void,
    onDeleteMessage: (messageId: number, chatId: number) => void,
    onNewChat: (chat: Chat) => void,
    onChatUpdated: (data: any) => void,
    onOnlineList: (data: Record<number, string>) => void,
    onUserStatus: (userId: number, status: string) => void,
    onMessageRead: (data: { message_id: number, chat_id: number, user_id: number, read_at: string }) => void,
    onTyping: (data: { chat_id: number, user_id: number, username: string, is_typing: boolean }) => void,
    onChatDeleted: (chatId: number) => void,
) {
    const ws = useRef<WebSocket | null>(null);
    const reconnectAttempt = useRef(0);
    const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isMounted = useRef(true);

    // Store callbacks in refs to avoid stale closures
    const onNewMessageRef = useRef(onNewMessage);
    const onDeleteMessageRef = useRef(onDeleteMessage);
    const onNewChatRef = useRef(onNewChat);
    const onChatUpdatedRef = useRef(onChatUpdated);
    const onOnlineListRef = useRef(onOnlineList);
    const onUserStatusRef = useRef(onUserStatus);
    const onMessageReadRef = useRef(onMessageRead);
    const onTypingRef = useRef(onTyping);
    const onChatDeletedRef = useRef(onChatDeleted);

    // Keep refs up to date on every render
    useEffect(() => {
        onNewMessageRef.current = onNewMessage;
        onDeleteMessageRef.current = onDeleteMessage;
        onNewChatRef.current = onNewChat;
        onChatUpdatedRef.current = onChatUpdated;
        onOnlineListRef.current = onOnlineList;
        onUserStatusRef.current = onUserStatus;
        onMessageReadRef.current = onMessageRead;
        onTypingRef.current = onTyping;
        onChatDeletedRef.current = onChatDeleted;
    }, [onNewMessage, onDeleteMessage, onNewChat, onChatUpdated, onOnlineList, onUserStatus, onMessageRead, onTyping, onChatDeleted]);

    useEffect(() => {
        isMounted.current = true;
        if (!token) return;

        const connect = () => {
            if (!isMounted.current) return;

            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const socketUrl = `${protocol}//${window.location.host}/ws?token=${token}`;
            const socket = new WebSocket(socketUrl);

            socket.onopen = () => {
                reconnectAttempt.current = 0;
            };

            socket.onmessage = async (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'new_message') {
                        onNewMessageRef.current(data.data);
                    } else if (data.type === 'delete_message') {
                        onDeleteMessageRef.current(data.data.message_id, data.data.chat_id);
                    } else if (data.type === 'new_chat') {
                        onNewChatRef.current(data.data);
                    } else if (data.type === 'chat_updated') {
                        onChatUpdatedRef.current(data.data);
                    } else if (data.type === 'online_list') {
                        onOnlineListRef.current(data.data);
                    } else if (data.type === 'user_status') {
                        onUserStatusRef.current(data.data.user_id, data.data.status);
                    } else if (data.type === 'message_read') {
                        onMessageReadRef.current(data.data);
                    } else if (data.type === 'typing') {
                        onTypingRef.current(data.data);
                    } else if (data.type === 'chat_deleted') {
                        onChatDeletedRef.current(data.data.chat_id);
                    }
                } catch (err) {
                    console.error('WS parse error:', err);
                }
            };

            socket.onclose = () => {
                if (!isMounted.current) return;
                // Exponential backoff: 1s, 2s, 4s, 8s, ... capped at 30s
                const delay = Math.min(1000 * Math.pow(2, reconnectAttempt.current), 30000);
                console.log(`WS closed. Reconnecting in ${delay / 1000}s (attempt ${reconnectAttempt.current + 1})...`);
                reconnectAttempt.current += 1;
                reconnectTimer.current = setTimeout(connect, delay);
            };

            socket.onerror = (err) => console.error('WS error:', err);

            ws.current = socket;
        };

        connect();

        return () => {
            isMounted.current = false;
            if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
            ws.current?.close();
        };
    }, [token]);

    const sendJson = (data: any) => {
        if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify(data));
        }
    };

    return { ws, sendJson };
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
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setMessages([]);
        if (!activeChatId) {
            setLoading(false);
            return;
        }

        setLoading(true);
        api.get(`/messages/${activeChatId}`)
            .then(r => setMessages(r.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [activeChatId]);

    return { messages, setMessages, loading };
}

export function useAvatarEditor(onSave: (formData: FormData) => Promise<void>, onDelete?: () => Promise<void>) {
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
                await onSave(formData);
                setShowAvatarEditor(false);
                setImgSrc('');
            } catch (err) {
                console.error(err);
            }
        }, 'image/jpeg');
    };

    const handleAvatarDelete = async () => {
        if (!onDelete || !window.confirm('Delete avatar?')) return;
        try {
            await onDelete();
        } catch (err) {
            console.error(err);
        }
    };

    return {
        showAvatarEditor, setShowAvatarEditor,
        imgSrc, crop, setCrop, completedCrop, setCompletedCrop,
        imgRef, fileInputRef,
        onSelectFile, handleAvatarSave, handleAvatarDelete,
    };
}
