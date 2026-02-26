import { useRef, useCallback } from 'react';
import { type Chat, type Message } from '../types';

interface WebSocketHandlers {
    onNewMessage: (msg: Message) => void;
    onDeleteMessage: (messageId: number, chatId: number) => void;
    onNewChat: (chat: Chat) => void;
    onChatUpdated: (data: any) => void;
    onOnlineList: (data: Record<number, string>) => void;
    onUserStatus: (userId: number, status: string) => void;
    onMessageRead: (data: { message_id: number, chat_id: number, user_id: number, read_at: string }) => void;
    onTyping: (data: { chat_id: number, user_id: number, username: string, is_typing: boolean }) => void;
    onChatDeleted: (chatId: number) => void;
    onUserUpdated: (data: { id: number, username: string, avatar_path: string | null }) => void;
    onMessageReaction: (data: { message_id: number, chat_id: number, user_id: number, emoji: string, action: 'added' | 'removed' }) => void;
}

export function useChatWebSocketHandlers(
    activeChatId: number | null,
    user: any,
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
    setChats: React.Dispatch<React.SetStateAction<Chat[]>>,
    fetchChats: () => Promise<void>,
    isAtBottom: boolean,
    setUnreadBottomCount: React.Dispatch<React.SetStateAction<number>>,
    setUserStatuses: React.Dispatch<React.SetStateAction<Map<number, string>>>,
    setTypingUsers: React.Dispatch<React.SetStateAction<Record<number, Record<number, { username: string, timestamp: number }>>>>,
    setActiveBigReaction: React.Dispatch<React.SetStateAction<{ emoji: string, timestamp: number } | null>>,
    setActiveChat: React.Dispatch<React.SetStateAction<Chat | null>>,
    navigate: (path: string) => void,
    setShowGroupSettings: React.Dispatch<React.SetStateAction<boolean>>
): WebSocketHandlers {
    const activeChatIdRef = useRef(activeChatId);
    activeChatIdRef.current = activeChatId;

    const typingTimeoutRef = useRef<Record<number, Record<number, ReturnType<typeof setTimeout>>>>({});

    const handleNewMessage = useCallback((msg: Message) => {
        if (Number(activeChatIdRef.current) === Number(msg.chat_id)) {
            setMessages(prev => {
                if (prev.find(m => m.id === msg.id)) return prev;
                return [...prev, msg];
            });
            if (!isAtBottom && msg.sender_id !== user?.id) {
                setUnreadBottomCount(prev => prev + 1);
            }
        }
        setChats(prev => {
            const chatExists = prev.find(c => c.id === msg.chat_id);
            if (chatExists) {
                return prev.map(c => {
                    if (c.id !== msg.chat_id) return c;
                    const isActive = Number(activeChatIdRef.current) === Number(msg.chat_id);
                    const isMyMsg = msg.sender_id === user?.id;
                    const newUnread = (!isActive && !isMyMsg) ? (c.unread_count || 0) + 1 : c.unread_count;
                    return { ...c, last_message: msg, unread_count: newUnread };
                }).sort((a, b) => {
                    const dateA = a.last_message ? new Date(a.last_message.created_at).getTime() : 0;
                    const dateB = b.last_message ? new Date(b.last_message.created_at).getTime() : 0;
                    return dateB - dateA;
                });
            }
            fetchChats();
            return prev;
        });
    }, [isAtBottom, user?.id, setMessages, setUnreadBottomCount, setChats, fetchChats]);

    const handleDeleteMessage = useCallback((messageId: number, chatId: number) => {
        if (Number(activeChatIdRef.current) === Number(chatId)) {
            setMessages(prev => prev.filter(m => m.id !== messageId));
        }
        setChats(prev => prev.map(c => {
            if (c.id === chatId && c.last_message?.id === messageId) {
                return { ...c, last_message: undefined };
            }
            return c;
        }));
    }, [setMessages, setChats]);

    const handleNewChat = useCallback((newChat: Chat) => {
        setChats(prev => {
            if (prev.find(c => c.id === newChat.id)) return prev;
            return [newChat, ...prev];
        });
    }, [setChats]);

    const handleChatUpdated = useCallback((data: any) => {
        setChats(prev => {
            const exists = prev.find(c => c.id === data.id);
            if (!exists) {
                fetchChats();
                return prev;
            }
            return prev.map(c => c.id === data.id ? { ...c, ...data } : c);
        });
        if (activeChatIdRef.current === data.id) {
            setActiveChat(prev => prev ? { ...prev, ...data } : null);
        }
    }, [setChats, fetchChats, setActiveChat]);

    const handleOnlineList = useCallback((data: Record<number, string>) => {
        setUserStatuses(new Map(Object.entries(data).map(([id, status]) => [Number(id), status])));
    }, [setUserStatuses]);

    const handleUserStatus = useCallback((userId: number, status: string) => {
        setUserStatuses(prev => {
            const newMap = new Map(prev);
            if (status === 'offline') newMap.delete(userId);
            else newMap.set(userId, status);
            return newMap;
        });
    }, [setUserStatuses]);

    const handleMessageRead = useCallback((data: { message_id: number, chat_id: number, user_id: number, read_at: string }) => {
        setMessages(prev => prev.map(m => {
            if (m.id === data.message_id) {
                if (m.read_by.some(r => r.user_id === data.user_id)) return m;
                return { ...m, read_by: [...m.read_by, { user_id: data.user_id, read_at: data.read_at }] };
            }
            return m;
        }));
        if (data.user_id === user?.id) {
            setChats(prev => prev.map(c =>
                c.id === data.chat_id ? { ...c, unread_count: Math.max(0, (c.unread_count || 0) - 1) } : c
            ));
        }
    }, [setMessages, user?.id, setChats]);

    const handleTyping = useCallback((data: { chat_id: number, user_id: number, username: string, is_typing: boolean }) => {
        setTypingUsers(prev => {
            const chatTyping = { ...(prev[data.chat_id] || {}) };
            if (data.is_typing) {
                chatTyping[data.user_id] = { username: data.username, timestamp: Date.now() };
            } else {
                delete chatTyping[data.user_id];
            }
            return { ...prev, [data.chat_id]: chatTyping };
        });

        if (data.is_typing) {
            if (typingTimeoutRef.current[data.chat_id]?.[data.user_id]) {
                clearTimeout(typingTimeoutRef.current[data.chat_id][data.user_id]);
            }
            const timeout = setTimeout(() => {
                handleTyping({ ...data, is_typing: false });
            }, 5000);

            typingTimeoutRef.current[data.chat_id] = {
                ...(typingTimeoutRef.current[data.chat_id] || {}),
                [data.user_id]: timeout
            };
        }
    }, [setTypingUsers]);

    const handleChatDeleted = useCallback((chatId: number) => {
        setChats(prev => prev.filter(c => c.id !== chatId));
        if (activeChatIdRef.current === chatId) {
            navigate('/');
            setShowGroupSettings(false);
        }
    }, [setChats, navigate, setShowGroupSettings]);

    const handleUserUpdated = useCallback(({ id, avatar_path }: { id: number, username: string, avatar_path: string | null }) => {
        setChats(prev => prev.map(chat => ({
            ...chat,
            members: chat.members.map(m => m.id === id ? { ...m, avatar_path: avatar_path || undefined } : m)
        })));
        setMessages(prev => prev.map(msg => ({
            ...msg,
            sender: msg.sender_id === id ? { ...msg.sender, avatar_path: avatar_path || undefined } : msg.sender
        })));
        // Note: We leave refreshUser up to user's auth context internally or handled via app layout if needed.
    }, [setChats, setMessages]);

    const handleMessageReaction = useCallback((data: { message_id: number, chat_id: number, user_id: number, emoji: string, action: 'added' | 'removed' }) => {
        setMessages(prev => prev.map(m => {
            if (m.id === data.message_id) {
                if (data.action === 'added') {
                    if (m.reactions.some(r => r.user_id === data.user_id && r.emoji === data.emoji)) return m;
                    return {
                        ...m,
                        reactions: [...m.reactions, {
                            id: Math.random(),
                            user_id: data.user_id,
                            emoji: data.emoji,
                            created_at: new Date().toISOString()
                        }]
                    };
                } else {
                    return {
                        ...m,
                        reactions: m.reactions.filter(r => !(r.user_id === data.user_id && r.emoji === data.emoji))
                    };
                }
            }
            return m;
        }));

        if (data.action === 'added') {
            setActiveBigReaction({ emoji: data.emoji, timestamp: Date.now() });
        }

        setChats(prev => prev.map(c => {
            if (c.last_message?.id === data.message_id) {
                const m = c.last_message;
                let newReactions = m.reactions;
                if (data.action === 'added') {
                    if (!newReactions.some(r => r.user_id === data.user_id && r.emoji === data.emoji)) {
                        newReactions = [...newReactions, {
                            id: Math.random(),
                            user_id: data.user_id,
                            emoji: data.emoji,
                            created_at: new Date().toISOString()
                        }];
                    }
                } else {
                    newReactions = newReactions.filter(r => !(r.user_id === data.user_id && r.emoji === data.emoji));
                }
                return { ...c, last_message: { ...m, reactions: newReactions } };
            }
            return c;
        }));
    }, [setMessages, setActiveBigReaction, setChats]);

    return {
        onNewMessage: handleNewMessage,
        onDeleteMessage: handleDeleteMessage,
        onNewChat: handleNewChat,
        onChatUpdated: handleChatUpdated,
        onOnlineList: handleOnlineList,
        onUserStatus: handleUserStatus,
        onMessageRead: handleMessageRead,
        onTyping: handleTyping,
        onChatDeleted: handleChatDeleted,
        onUserUpdated: handleUserUpdated,
        onMessageReaction: handleMessageReaction
    };
}
