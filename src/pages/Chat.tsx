import React, { useState, useEffect, useRef } from 'react';
import { format, isSameDay } from 'date-fns';
import { LogOut, Send, Paperclip, Plus, Search, User as UserIcon, X, Camera, Check, Moon, Trash2, CheckSquare, ChevronUp, ChevronDown } from 'lucide-react';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { useChats, useMessages, useAvatarEditor, useWebSocket } from '../hooks/useChat';
import { type Chat, type Message, type User } from '../types';
import ChatListItem from '../components/ChatListItem';
import MessageBubble from '../components/MessageBubble';
import GroupSettingsModal from '../components/GroupSettingsModal';
import MessageContextMenu from '../components/MessageContextMenu';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import BigReaction from '../components/BigReaction';
import { centerCrop, makeAspectCrop } from 'react-image-crop';

const ChatPage: React.FC = () => {
    const { user, logout, token, refreshUser } = useAuth();
    const { chats, setChats, fetchChats } = useChats();
    const [activeChat, setActiveChat] = useState<Chat | null>(null);
    const { messages, setMessages, loading: messagesLoading } = useMessages(activeChat?.id || null);

    const [inputText, setInputText] = useState('');
    const [showNewChat, setShowNewChat] = useState(false);
    const [users, setUsers] = useState<User[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [userStatuses, setUserStatuses] = useState<Map<number, string>>(new Map());
    const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
    const [groupName, setGroupName] = useState('');
    const [newChatMode, setNewChatMode] = useState<'select' | 'private' | 'group'>('select');
    const [showGroupSettings, setShowGroupSettings] = useState(false);
    const [selectedMessageForReceipts, setSelectedMessageForReceipts] = useState<Message | null>(null);
    const [receiptsPosition, setReceiptsPosition] = useState<{ x: number, y: number }>({ x: 0, y: 0 });
    const [messageToDelete, setMessageToDelete] = useState<number | null>(null);
    const [typingUsers, setTypingUsers] = useState<Record<number, Record<number, { username: string, timestamp: number }>>>({});
    const typingTimeoutRef = useRef<Record<number, Record<number, ReturnType<typeof setTimeout>>>>({});

    // Message Selection & Search Navigation
    const [selectedMsgIds, setSelectedMsgIds] = useState<Set<number>>(new Set());
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [isMsgSearchOpen, setIsMsgSearchOpen] = useState(false);
    const [msgSearchQuery, setMsgSearchQuery] = useState('');
    const [searchMatchIds, setSearchMatchIds] = useState<number[]>([]);
    const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);
    const [highlightedMsgId, setHighlightedMsgId] = useState<number | null>(null);
    const [activeBigReaction, setActiveBigReaction] = useState<{ emoji: string, timestamp: number } | null>(null);
    const [unreadBottomCount, setUnreadBottomCount] = useState(0);
    const isAtBottomRef = useRef(true);

    // Chat Actions Context Menu
    const [chatMenuPos, setChatMenuPos] = useState<{ x: number, y: number } | null>(null);
    const [chatMenuTarget, setChatMenuTarget] = useState<Chat | null>(null);


    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const activeChatIdRef = useRef<number | null>(null);
    const lastMessagesLengthRef = useRef(0);
    const isInitialLoadRef = useRef(true);

    // Avatar Editor
    const avatarEditor = useAvatarEditor(
        async (formData) => {
            await api.post('/me/avatar', formData);
            await refreshUser();
        },
        async () => {
            await api.delete('/me/avatar');
            await refreshUser();
        }
    );

    useEffect(() => {
        fetchChats();
    }, []);

    useEffect(() => {
        activeChatIdRef.current = activeChat?.id || null;
        setInputText(''); // Clear input when switching chats
        setIsSelectionMode(false);
        setSelectedMsgIds(new Set());
        setUnreadBottomCount(0);
        isAtBottomRef.current = true;
        setIsMsgSearchOpen(false);
        setMsgSearchQuery('');
        setSearchMatchIds([]);
        setCurrentMatchIndex(-1);
        setHighlightedMsgId(null);
    }, [activeChat?.id]);

    useEffect(() => {
        // Disable browser context menu
        const handleContextMenu = (e: MouseEvent) => e.preventDefault();
        window.addEventListener('contextmenu', handleContextMenu);
        return () => window.removeEventListener('contextmenu', handleContextMenu);
    }, []);

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (showNewChat) {
                    setShowNewChat(false);
                    setNewChatMode('select');
                    setSelectedUserIds([]);
                    setGroupName('');
                }
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [showNewChat]);

    useEffect(() => {
        isInitialLoadRef.current = true;
        lastMessagesLengthRef.current = 0;
    }, [activeChat?.id]);

    useEffect(() => {
        if (messagesLoading || !messages.length || !isInitialLoadRef.current) return;

        const firstUnread = messages.find(m =>
            m.sender_id !== user?.id &&
            !m.read_by.some(r => r.user_id === user?.id)
        );

        if (firstUnread) {
            const el = document.getElementById(`msg-${firstUnread.id}`);
            if (el) {
                el.scrollIntoView({ behavior: 'auto', block: 'start' });
            } else {
                messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
            }
        } else {
            messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
        }

        isInitialLoadRef.current = false;
        lastMessagesLengthRef.current = messages.length;
    }, [messages, messagesLoading, user?.id]);

    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const handleScroll = () => {
            const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 100;
            isAtBottomRef.current = isAtBottom;
            if (isAtBottom) {
                setUnreadBottomCount(0);
                // Mark all current messages as read when hitting bottom
                if (messages.some(m => m.sender_id !== user?.id && !m.read_by.some(r => r.user_id === user?.id))) {
                    markChatRead();
                }
            }
        };

        container.addEventListener('scroll', handleScroll);
        return () => container.removeEventListener('scroll', handleScroll);
    }, [messages, user?.id]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        setUnreadBottomCount(0);
        markChatRead();
    };

    useEffect(() => {
        if (isInitialLoadRef.current || messagesLoading) return;

        const container = scrollContainerRef.current;
        if (!container) return;

        // Is user close to bottom? (within 150px)
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
        const lastMsg = messages[messages.length - 1];
        const isMyMsg = lastMsg?.sender_id === user?.id;
        const isNewMsg = messages.length > lastMessagesLengthRef.current;

        if (isNewMsg && (isNearBottom || isMyMsg)) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }

        lastMessagesLengthRef.current = messages.length;
    }, [messages, messagesLoading, user?.id]);

    const [isSending, setIsSending] = useState(false);

    // WebSocket Handlers
    const handleNewMessage = (msg: Message) => {
        if (Number(activeChatIdRef.current) === Number(msg.chat_id)) {
            setMessages(prev => {
                if (prev.find(m => m.id === msg.id)) return prev;
                return [...prev, msg];
            });
            if (!isAtBottomRef.current && msg.sender_id !== user?.id) {
                setUnreadBottomCount(prev => prev + 1);
            }
        }
        setChats(prev => {
            const chatExists = prev.find(c => c.id === msg.chat_id);
            if (chatExists) {
                return prev.map(c =>
                    c.id === msg.chat_id ? { ...c, last_message: msg } : c
                ).sort((a, b) => {
                    const dateA = a.last_message ? new Date(a.last_message.created_at).getTime() : 0;
                    const dateB = b.last_message ? new Date(b.last_message.created_at).getTime() : 0;
                    return dateB - dateA;
                });
            }
            fetchChats();
            return prev;
        });
    };

    const handleDeleteMessage = (messageId: number, chatId: number) => {
        if (Number(activeChatIdRef.current) === Number(chatId)) {
            setMessages(prev => prev.filter(m => m.id !== messageId));
        }
        setChats(prev => prev.map(c => {
            if (c.id === chatId && c.last_message?.id === messageId) {
                return { ...c, last_message: undefined };
            }
            return c;
        }));
    };

    const handleNewChat = (newChat: Chat) => {
        setChats(prev => {
            if (prev.find(c => c.id === newChat.id)) return prev;
            return [newChat, ...prev];
        });
    };

    const handleChatUpdated = (data: any) => {
        setChats(prev => {
            const exists = prev.find(c => c.id === data.id);
            if (!exists) {
                // If chat is missing (e.g. newly added), fetch it
                fetchChats();
                return prev;
            }
            return prev.map(c => {
                if (c.id === data.id) {
                    return { ...c, ...data };
                }
                return c;
            });
        });
        if (activeChatIdRef.current === data.id) {
            setActiveChat(prev => prev ? { ...prev, ...data } : null);
        }
    };

    const handleOnlineList = (data: Record<number, string>) => setUserStatuses(new Map(Object.entries(data).map(([id, status]) => [Number(id), status])));

    const handleMessageRead = (data: { message_id: number, chat_id: number, user_id: number, read_at: string }) => {
        setMessages(prev => prev.map(m => {
            if (m.id === data.message_id) {
                if (m.read_by.some(r => r.user_id === data.user_id)) return m;
                return { ...m, read_by: [...m.read_by, { user_id: data.user_id, read_at: data.read_at }] };
            }
            return m;
        }));
    };

    const handleUserStatus = (userId: number, status: string) => {
        setUserStatuses(prev => {
            const newMap = new Map(prev);
            if (status === 'offline') newMap.delete(userId);
            else newMap.set(userId, status);
            return newMap;
        });
    };

    const handleChatDeleted = (chatId: number) => {
        setChats(prev => prev.filter(c => c.id !== chatId));
        if (activeChatIdRef.current === chatId) {
            setActiveChat(null);
            setShowGroupSettings(false);
        }
    };

    const handleTyping = (data: { chat_id: number, user_id: number, username: string, is_typing: boolean }) => {
        setTypingUsers(prev => {
            const chatTyping = { ...(prev[data.chat_id] || {}) };
            if (data.is_typing) {
                chatTyping[data.user_id] = { username: data.username, timestamp: Date.now() };
            } else {
                delete chatTyping[data.user_id];
            }
            return { ...prev, [data.chat_id]: chatTyping };
        });

        // Auto-clear after 5 seconds if no "stopped typing" received
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
    };

    const handleUserUpdated = ({ id, avatar_path }: { id: number, username: string, avatar_path: string | null }) => {
        setChats(prev => prev.map(chat => ({
            ...chat,
            members: chat.members.map(m => m.id === id ? { ...m, avatar_path: avatar_path || undefined } : m)
        })));
        setMessages(prev => prev.map(msg => ({
            ...msg,
            sender: msg.sender_id === id ? { ...msg.sender, avatar_path: avatar_path || undefined } : msg.sender
        })));
        if (user?.id === id) {
            refreshUser();
        }
    };

    const handleToggleReaction = async (messageId: number, emoji: string) => {
        try {
            await api.post(`/messages/${messageId}/reactions`, { emoji });
        } catch (err) {
            console.error('Failed to toggle reaction:', err);
        }
    };

    const handleMessageReaction = (data: { message_id: number, chat_id: number, user_id: number, emoji: string, action: 'added' | 'removed' }) => {
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
    };

    const handleLeaveChat = async (chat: Chat) => {
        if (!window.confirm(`Are you sure you want to leave ${chat.is_group ? 'this group' : 'this chat'}?`)) return;
        try {
            await api.post(`/chats/${chat.id}/leave`);
            handleChatDeleted(chat.id);
        } catch (err) {
            console.error('Failed to leave chat:', err);
        } finally {
            setChatMenuPos(null);
            setChatMenuTarget(null);
        }
    };

    const handleDeleteChatAccount = async (chat: Chat) => {
        if (!window.confirm('Are you sure you want to delete this chat and ALL its history for everyone? This cannot be undone.')) return;
        try {
            await api.delete(`/chats/${chat.id}`);
            // No need to manually call handleChatDeleted, WS will broadcast it
        } catch (err) {
            console.error('Failed to delete chat:', err);
        } finally {
            setChatMenuPos(null);
            setChatMenuTarget(null);
        }
    };

    const onChatContextMenu = (e: React.MouseEvent, chat: Chat) => {
        e.preventDefault();
        setChatMenuPos({ x: e.clientX, y: e.clientY });
        setChatMenuTarget(chat);
    };

    const markMessageRead = async (messageId: number) => {
        try {
            await api.post(`/messages/${messageId}/read`);
        } catch (err) {
            console.error('Failed to mark message read:', err);
        }
    };

    const markChatRead = async () => {
        if (!activeChat) return;
        try {
            await api.post(`/chats/${activeChat.id}/read`);
        } catch (err) {
            console.error('Failed to mark chat as read:', err);
        }
    };

    const deleteMessage = async (messageId: number) => {
        try {
            await api.delete(`/messages/${messageId}`);
            setMessages(prev => prev.filter(m => m.id !== messageId));
        } catch (err) {
            console.error('Failed to delete message:', err);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedMsgIds.size === 0) return;
        if (!window.confirm(`Are you sure you want to delete ${selectedMsgIds.size} messages?`)) return;

        try {
            const ids = Array.from(selectedMsgIds);
            await api.post('/messages/bulk/delete', { message_ids: ids });
            setMessages(prev => prev.filter(m => !selectedMsgIds.has(m.id)));
            setSelectedMsgIds(new Set());
            setIsSelectionMode(false);
        } catch (err) {
            console.error('Failed bulk delete:', err);
        }
    };

    const toggleMsgSelection = (id: number) => {
        setSelectedMsgIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleSelectionMode = () => {
        setIsSelectionMode(!isSelectionMode);
        setSelectedMsgIds(new Set());
    };

    const { sendJson } = useWebSocket(
        token,
        handleNewMessage,
        handleDeleteMessage,
        handleNewChat,
        handleChatUpdated,
        handleOnlineList,
        handleUserStatus,
        handleMessageRead,
        handleTyping,
        handleChatDeleted,
        handleUserUpdated,
        handleMessageReaction
    );

    // Inactivity / Away Status Logic
    const lastSentStatusRef = useRef<'online' | 'away'>('online');

    useEffect(() => {
        if (!token || !user) return;

        let inactivityTimer: ReturnType<typeof setTimeout>;

        const updateStatus = (newStatus: 'online' | 'away') => {
            if (lastSentStatusRef.current === newStatus) return;
            sendJson({ type: 'user_status_update', status: newStatus });
            lastSentStatusRef.current = newStatus;

            // Immediately update local state for current user to fix top-left UI
            if (user?.id) {
                setUserStatuses(prev => {
                    const newMap = new Map(prev);
                    newMap.set(user.id, newStatus);
                    return newMap;
                });
            }
        };

        const resetTimer = () => {
            clearTimeout(inactivityTimer);
            updateStatus('online');

            inactivityTimer = setTimeout(() => {
                updateStatus('away');
            }, 60000); // 1 minute
        };

        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
        events.forEach(name => document.addEventListener(name, resetTimer));

        // Initial setup
        resetTimer();

        return () => {
            events.forEach(name => document.removeEventListener(name, resetTimer));
            clearTimeout(inactivityTimer);
        };
    }, [token, user?.id]);

    // Send typing status
    const lastSentTypingTimeRef = useRef<Record<number, number>>({});

    useEffect(() => {
        if (!activeChat || !token) return;

        const now = Date.now();
        const lastSent = lastSentTypingTimeRef.current[activeChat.id] || 0;
        const isCurrentlyTyping = inputText.length > 0;

        // If user deleted all text, send "stopped typing" immediately
        if (!isCurrentlyTyping && lastSent !== 0) {
            sendJson({
                type: 'typing',
                chat_id: activeChat.id,
                is_typing: false
            });
            lastSentTypingTimeRef.current[activeChat.id] = 0;
            return;
        }

        // Send "typing" update if it's the first time or every 2 seconds (heartbeat)
        if (isCurrentlyTyping && (now - lastSent > 2000)) {
            sendJson({
                type: 'typing',
                chat_id: activeChat.id,
                is_typing: true
            });
            lastSentTypingTimeRef.current[activeChat.id] = now;
        }

        // Set local timeout to send "stopped" if user stops typing
        if (isCurrentlyTyping) {
            const timeout = setTimeout(() => {
                sendJson({
                    type: 'typing',
                    chat_id: activeChat.id,
                    is_typing: false
                });
                lastSentTypingTimeRef.current[activeChat.id] = 0;
            }, 3000);
            return () => clearTimeout(timeout);
        }
    }, [inputText, activeChat?.id]);

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputText.trim() || !activeChat || isSending) return;

        const text = inputText;
        setInputText('');
        setIsSending(true);
        try {
            await api.post('/messages/send', { chat_id: activeChat.id, text });
        } catch (err) {
            console.error(err);
            setInputText(text); // Restore on error
        } finally {
            setIsSending(false);
        }
    };


    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !activeChat) return;
        const formData = new FormData();
        formData.append('file', file);
        try {
            const uploadResp = await api.post('/files/upload', formData);
            await api.post('/messages/send', { chat_id: activeChat.id, file_id: uploadResp.data.id });
        } catch (err) { console.error(err); }
    };



    const searchUsers = async (q: string) => {
        setSearchQuery(q);
        if (q.length < 2) { setUsers([]); return; }
        try {
            const resp = await api.get(`/users?q=${q}`);
            setUsers(resp.data);
        } catch (err) { console.error(err); }
    };

    const createChat = async (singleRecipientId?: number) => {
        try {
            const isGroup = selectedUserIds.length > 0;
            const payload = {
                recipient_id: isGroup ? undefined : singleRecipientId,
                member_ids: isGroup ? selectedUserIds : undefined,
                name: isGroup ? groupName : undefined,
                is_group: isGroup
            };
            const resp = await api.post('/chats/create', payload);
            const newChat = resp.data;
            setChats((prev) => {
                const exists = prev.find(c => c.id === newChat.id);
                if (exists) return prev;
                return [newChat, ...prev];
            });
            setActiveChat(newChat);
            setShowNewChat(false);
            setGroupName('');
            setSelectedUserIds([]);
            setNewChatMode('select');
        } catch (err) {
            console.error('Failed to create chat:', err);
        }
    };

    const toggleUserSelection = (userId: number) => {
        setSelectedUserIds(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
    };

    // Message Search Logic
    useEffect(() => {
        if (!msgSearchQuery.trim() || !messages.length) {
            setSearchMatchIds([]);
            setCurrentMatchIndex(-1);
            return;
        }

        const matches = messages
            .filter(m => m.text?.toLowerCase().includes(msgSearchQuery.toLowerCase()))
            .map(m => m.id);

        setSearchMatchIds(matches);
        if (matches.length > 0) {
            setCurrentMatchIndex(matches.length - 1); // Start from the newest match
            scrollToMatch(matches[matches.length - 1]);
        } else {
            setCurrentMatchIndex(-1);
        }
    }, [msgSearchQuery, messages]);

    const scrollToMatch = (msgId: number) => {
        setTimeout(() => {
            const el = document.getElementById(`msg-${msgId}`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setHighlightedMsgId(msgId);
                setTimeout(() => setHighlightedMsgId(null), 2000);
            }
        }, 100);
    };

    const nextMatch = () => {
        if (searchMatchIds.length === 0) return;
        const nextIndex = (currentMatchIndex + 1) % searchMatchIds.length;
        setCurrentMatchIndex(nextIndex);
        scrollToMatch(searchMatchIds[nextIndex]);
    };

    const prevMatch = () => {
        if (searchMatchIds.length === 0) return;
        const prevIndex = (currentMatchIndex - 1 + searchMatchIds.length) % searchMatchIds.length;
        setCurrentMatchIndex(prevIndex);
        scrollToMatch(searchMatchIds[prevIndex]);
    };

    const getChatName = (chat: Chat) => {
        if (chat.is_group && chat.name) return chat.name;
        if (chat.is_group) return chat.members.map(m => m.username).join(', ');
        const otherMember = chat.members.find(m => m.id !== user?.id);
        return otherMember?.username || 'Unknown';
    };

    const getUserStatus = (chat: Chat): string | undefined => {
        if (chat.is_group) return undefined;
        const otherMember = chat.members.find(m => m.id !== user?.id);
        return otherMember ? userStatuses.get(otherMember.id) || 'offline' : 'offline';
    };

    const getAvatarUrl = (path?: string) => path ? `/avatars/${path}` : null;

    const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
        const { width, height } = e.currentTarget;
        const initialCrop = centerCrop(
            makeAspectCrop({ unit: '%', width: 90 }, 1, width, height),
            width, height
        );
        avatarEditor.setCrop(initialCrop);
    };

    return (
        <div className="flex h-full w-full bg-brand-bg text-brand-text overflow-hidden font-sans relative">
            <div className="radar-glow" />

            {/* Sidebar */}
            <div className="w-80 border-r border-brand-border flex flex-col bg-brand-sidebar z-10 shrink-0">
                <div className="p-6 border-b border-brand-border flex items-center justify-between shrink-0">
                    <div className="flex items-center space-x-3">
                        <div className="relative group">
                            {user?.avatar_path ? (
                                <img src={getAvatarUrl(user.avatar_path)!} alt={user.username} className="w-10 h-10 rounded-2xl object-cover border border-brand-border shadow-lg" />
                            ) : (
                                <div className="w-10 h-10 bg-brand-accent rounded-2xl flex items-center justify-center font-bold text-white shadow-glow">
                                    {user?.username?.[0].toUpperCase()}
                                </div>
                            )}
                            {userStatuses.get(user?.id || 0) === 'away' ? (
                                <div className="absolute -bottom-1 -right-1 bg-brand-sidebar rounded-full p-0.5">
                                    <Moon size={12} fill="currentColor" className="text-brand-away shadow-glow-yellow" />
                                </div>
                            ) : (
                                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 border-2 border-brand-sidebar rounded-full shadow-glow-green" />
                            )}
                            <div className="absolute inset-0 bg-brand-bg/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all rounded-2xl scale-90 group-hover:scale-100 space-x-2">
                                <label className="cursor-pointer p-1.5 hover:bg-brand-accent rounded-lg transition-colors">
                                    <Camera size={14} className="text-white" />
                                    <input type="file" ref={avatarEditor.fileInputRef} className="hidden" accept="image/*" onChange={avatarEditor.onSelectFile} />
                                </label>
                                {user?.avatar_path && (
                                    <button onClick={avatarEditor.handleAvatarDelete} className="p-1.5 hover:bg-red-500 rounded-lg transition-colors">
                                        <X size={14} className="text-white" />
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-col">
                            <span className="font-semibold text-sm tracking-tight">{user?.username}</span>
                            {userStatuses.get(user?.id || 0) === 'away' ? (
                                <span className="text-[10px] text-brand-away font-bold uppercase tracking-widest animate-pulse">Away</span>
                            ) : (
                                <span className="text-[10px] text-green-500 font-bold uppercase tracking-widest">Active</span>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center space-x-1">
                        <button onClick={logout} className="p-2 hover:bg-brand-bg rounded-xl transition-colors text-brand-text-dim hover:text-white">
                            <LogOut size={18} strokeWidth={1.5} />
                        </button>
                    </div>
                </div>

                <div className="p-4 shrink-0">
                    <button onClick={() => setShowNewChat(true)} className="glow-button w-full border-none py-3 text-[10px] tracking-[0.2em] font-black uppercase">
                        New Connection
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-1 py-2 custom-scroll">
                    {chats.map(chat => (
                        <ChatListItem
                            key={chat.id}
                            chat={chat}
                            currentUser={user}
                            isActive={activeChat?.id === chat.id}
                            userStatus={getUserStatus(chat)}
                            typingUsers={Object.values(typingUsers[chat.id] || {})}
                            onClick={() => setActiveChat(chat)}
                            onContextMenu={(e) => onChatContextMenu(e, chat)}
                        />
                    ))}
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col relative z-10 bg-brand-bg/30 min-w-0">
                <AnimatePresence mode="wait">
                    {activeChat ? (
                        <div key={activeChat.id} className="flex-1 flex flex-col min-h-0">
                            <div
                                className={`p-4 glass-header flex items-center justify-between shrink-0 ${activeChat.is_group ? 'cursor-pointer hover:bg-white/5 transition-colors' : ''}`}
                                onClick={() => activeChat.is_group && setShowGroupSettings(true)}
                            >
                                <div className="flex items-center min-w-0">
                                    <div className="relative mr-4 shrink-0">
                                        {activeChat.is_group ? (
                                            <div className="w-10 h-10 bg-slate-800 rounded-2xl flex items-center justify-center border border-slate-700 overflow-hidden">
                                                {activeChat.avatar_path ? (
                                                    <img src={getAvatarUrl(activeChat.avatar_path)!} className="w-full h-full object-cover" />
                                                ) : (
                                                    <UserIcon size={20} strokeWidth={1.5} className="text-brand-text-dim" />
                                                )}
                                            </div>
                                        ) : (
                                            <div className="w-10 h-10 bg-slate-800 rounded-2xl flex items-center justify-center overflow-hidden border border-brand-border shadow-lg">
                                                {activeChat.members.find(m => m.id !== user?.id)?.avatar_path ? (
                                                    <img src={getAvatarUrl(activeChat.members.find(m => m.id !== user?.id)!.avatar_path)!} className="w-full h-full object-cover" />
                                                ) : (
                                                    <UserIcon size={20} strokeWidth={1.5} className="text-brand-text-dim" />
                                                )}
                                            </div>
                                        )}
                                        {!activeChat.is_group && (
                                            (() => {
                                                const status = getUserStatus(activeChat);
                                                if (status === 'online') return <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-500 border-2 border-brand-sidebar rounded-full shadow-glow-green" />;
                                                if (status === 'away') return (
                                                    <div className="absolute -bottom-2 -right-2 bg-brand-sidebar rounded-full p-0.5 border-none">
                                                        <Moon size={14} fill="currentColor" className="text-brand-away shadow-glow-yellow" />
                                                    </div>
                                                );
                                                return null;
                                            })()
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <h2 className="font-bold text-lg tracking-tight text-white truncate">{getChatName(activeChat)}</h2>
                                        <div className="flex items-center space-x-2">
                                            {(() => {
                                                const typingInChat = Object.values(typingUsers[activeChat.id] || {});
                                                if (typingInChat.length > 0) {
                                                    let text = '';
                                                    if (!activeChat.is_group) {
                                                        text = 'typing';
                                                    } else {
                                                        if (typingInChat.length === 1) {
                                                            text = `${typingInChat[0].username} is typing`;
                                                        } else if (typingInChat.length === 2) {
                                                            text = `${typingInChat[0].username}, ${typingInChat[1].username} are typing`;
                                                        } else {
                                                            text = `${typingInChat[0].username}, ${typingInChat[1].username} and ${typingInChat.length - 2} others are typing`;
                                                        }
                                                    }
                                                    return (
                                                        <div className="flex items-center space-x-1.5 overflow-hidden">
                                                            <span className="text-[10px] font-black text-green-400 uppercase tracking-[0.2em]">{text}</span>
                                                            <div className="flex space-x-1 mb-0.5">
                                                                <span className="w-1 h-1 bg-green-400 rounded-full animate-pulse-dot" style={{ animationDelay: '0ms' }} />
                                                                <span className="w-1 h-1 bg-green-400 rounded-full animate-pulse-dot" style={{ animationDelay: '200ms' }} />
                                                                <span className="w-1 h-1 bg-green-400 rounded-full animate-pulse-dot" style={{ animationDelay: '400ms' }} />
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                                return (
                                                    <p className={`text-[10px] font-bold uppercase tracking-[0.15em] truncate ${getUserStatus(activeChat) === 'away' ? 'text-brand-away' : 'text-brand-text-dim'}`}>
                                                        {activeChat.is_group ? `${activeChat.members.length} Members` : getUserStatus(activeChat) === 'online' ? 'Online' : getUserStatus(activeChat) === 'away' ? 'Away' : 'Offline'}
                                                    </p>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                                    <div className={`flex items-center bg-slate-900/50 rounded-xl transition-all ${isMsgSearchOpen ? 'w-64 px-3' : 'w-0 overflow-hidden'}`}>
                                        <input
                                            type="text"
                                            value={msgSearchQuery}
                                            onChange={(e) => setMsgSearchQuery(e.target.value)}
                                            placeholder="Search messages..."
                                            className="bg-transparent border-none outline-none text-xs text-white w-full py-2"
                                        />
                                        {isMsgSearchOpen && searchMatchIds.length > 0 && (
                                            <div className="flex items-center space-x-1 shrink-0 px-2 border-l border-white/10 ml-2">
                                                <span className="text-[9px] font-bold text-brand-text-dim uppercase whitespace-nowrap">
                                                    {currentMatchIndex + 1}/{searchMatchIds.length}
                                                </span>
                                                <button onClick={prevMatch} className="p-1 hover:text-white text-brand-text-dim transition-colors">
                                                    <ChevronUp size={14} />
                                                </button>
                                                <button onClick={nextMatch} className="p-1 hover:text-white text-brand-text-dim transition-colors">
                                                    <ChevronDown size={14} />
                                                </button>
                                            </div>
                                        )}
                                        {msgSearchQuery && (
                                            <button onClick={() => { setMsgSearchQuery(''); setSearchMatchIds([]); setCurrentMatchIndex(-1); }} className="text-brand-text-dim hover:text-white ml-2">
                                                <X size={12} />
                                            </button>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => {
                                            setIsMsgSearchOpen(!isMsgSearchOpen);
                                            if (isMsgSearchOpen) setMsgSearchQuery('');
                                        }}
                                        className={`p-2 rounded-xl transition-colors ${isMsgSearchOpen ? 'bg-brand-accent text-white' : 'text-brand-text-dim hover:text-brand-accent'}`}
                                    >
                                        <Search size={20} />
                                    </button>
                                    <button
                                        onClick={toggleSelectionMode}
                                        className={`p-2 rounded-xl transition-colors ${isSelectionMode ? 'bg-brand-accent text-white' : 'text-brand-text-dim hover:text-brand-accent'}`}
                                        title="Select Messages"
                                    >
                                        <CheckSquare size={20} />
                                    </button>
                                    {isSelectionMode && selectedMsgIds.size > 0 && (
                                        <button
                                            onClick={handleBulkDelete}
                                            className="p-2 bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all shadow-glow-yellow"
                                            title={`Delete ${selectedMsgIds.size} messages`}
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scroll">
                                <AnimatePresence mode="popLayout">
                                    {!messagesLoading ? (
                                        messages.map((msg, index) => {
                                            const prevMsg = messages[index - 1];
                                            const showDate = !prevMsg || !isSameDay(new Date(msg.created_at), new Date(prevMsg.created_at));

                                            return (
                                                <React.Fragment key={msg.id}>
                                                    {showDate && (
                                                        <div className="flex justify-center my-8 first:mt-2">
                                                            <div className="px-5 py-1.5 rounded-full bg-brand-sidebar/50 border border-brand-border text-[10px] font-black text-brand-text-dim uppercase tracking-[0.2em] shadow-lg backdrop-blur-md">
                                                                {format(new Date(msg.created_at), 'd MMMM, yyyy')}
                                                            </div>
                                                        </div>
                                                    )}
                                                    <MessageBubble
                                                        msg={msg}
                                                        currentUser={user}
                                                        isGroup={activeChat.is_group}
                                                        onDelete={setMessageToDelete}
                                                        onRead={markMessageRead}
                                                        onReadReceiptsClick={(m, pos) => {
                                                            setSelectedMessageForReceipts(m);
                                                            setReceiptsPosition(pos);
                                                        }}
                                                        onReactionToggle={handleToggleReaction}
                                                        isSelectionMode={isSelectionMode}
                                                        isSelected={selectedMsgIds.has(msg.id)}
                                                        onSelect={() => toggleMsgSelection(msg.id)}
                                                        isHighlighted={highlightedMsgId === msg.id}
                                                    />
                                                </React.Fragment>
                                            );
                                        })
                                    ) : (
                                        <div className="flex flex-col space-y-4 animate-pulse">
                                            {[1, 2, 3].map(i => (
                                                <div key={i} className={`h-16 w-2/3 rounded-2xl bg-brand-card/20 ${i % 2 === 0 ? 'self-end' : 'self-start'}`} />
                                            ))}
                                        </div>
                                    )}
                                </AnimatePresence>
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Scroll to bottom button */}
                            <AnimatePresence>
                                {unreadBottomCount > 0 && (
                                    <motion.button
                                        initial={{ opacity: 0, y: 20, scale: 0.8 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 20, scale: 0.8 }}
                                        onClick={scrollToBottom}
                                        className="absolute bottom-28 right-8 z-40 bg-brand-accent text-white p-3 rounded-full shadow-glow flex items-center space-x-2 group hover:scale-110 active:scale-95 transition-all"
                                    >
                                        <div className="relative">
                                            <ChevronDown size={24} className="group-hover:translate-y-0.5 transition-transform" />
                                            <span className="absolute -top-4 -right-4 bg-red-500 text-[10px] font-black w-6 h-6 rounded-full border-2 border-brand-bg flex items-center justify-center shadow-lg">
                                                {unreadBottomCount > 99 ? '99+' : unreadBottomCount}
                                            </span>
                                        </div>
                                        <span className="text-[10px] uppercase font-black tracking-widest pr-2 hidden group-hover:block">Scroll to latest</span>
                                    </motion.button>
                                )}
                            </AnimatePresence>

                            <div className="p-6 border-t border-brand-border bg-brand-sidebar/50 shrink-0">
                                <form onSubmit={sendMessage} className="flex items-center space-x-4">
                                    <label className="cursor-pointer p-3 bg-slate-800 hover:bg-slate-700 rounded-2xl transition-all border border-brand-border shrink-0">
                                        <Paperclip size={20} strokeWidth={1.5} className="text-brand-text-dim hover:text-brand-accent" />
                                        <input type="file" className="hidden" onChange={handleFileUpload} />
                                    </label>
                                    <div className="flex-1 relative min-w-0">
                                        <input
                                            type="text"
                                            value={inputText}
                                            onChange={(e) => setInputText(e.target.value)}
                                            placeholder="Compose a secure message..."
                                            className="w-full bg-slate-900 border border-brand-border rounded-2xl px-6 py-4 focus:outline-none focus:border-brand-accent transition-all text-sm text-white placeholder:text-brand-text-dim/60 shadow-inner"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={!inputText.trim() || isSending}
                                        className="p-4 bg-brand-accent hover:bg-brand-accent/80 disabled:opacity-20 rounded-2xl text-white transition-all shadow-glow active:scale-95 shrink-0"
                                    >
                                        <Send size={20} strokeWidth={2} />
                                    </button>
                                </form>
                            </div>
                        </div>
                    ) : (
                        <div key="welcome" className="flex-1 flex flex-col items-center justify-center text-brand-text-dim space-y-6">
                            <div className="w-24 h-24 bg-brand-card/50 border border-brand-border rounded-3xl flex items-center justify-center shadow-premium relative">
                                <Send size={40} strokeWidth={1} className="text-brand-accent" />
                                <div className="absolute inset-0 bg-brand-accent/10 blur-2xl rounded-full" />
                            </div>
                            <div className="text-center">
                                <p className="text-xs uppercase tracking-[0.4em] font-bold text-brand-accent opacity-80 mb-2">Encrypted Messenger</p>
                                <p className="text-lg font-light tracking-tight text-white/50 italic">Waiting for connection...</p>
                            </div>
                        </div>
                    )}
                </AnimatePresence>

                {/* New Chat Modal */}
                <AnimatePresence>
                    {showNewChat && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => { setShowNewChat(false); setNewChatMode('select'); setSelectedUserIds([]); setGroupName(''); }}
                            className="absolute inset-0 bg-brand-bg/95 backdrop-blur-2xl z-50 flex items-center justify-center p-6"
                        >
                            <motion.div
                                initial={{ scale: 0.95, y: 10 }}
                                animate={{ scale: 1, y: 0 }}
                                exit={{ scale: 0.95, y: 10 }}
                                onClick={(e: React.MouseEvent) => e.stopPropagation()}
                                className="bg-brand-card w-full max-w-lg rounded-[2.5rem] border border-brand-border shadow-3xl overflow-hidden flex flex-col max-h-full"
                            >
                                <div className="p-8 border-b border-brand-border flex justify-between items-center bg-brand-sidebar/50 shrink-0">
                                    <div className="flex items-center space-x-4">
                                        {newChatMode !== 'select' && (
                                            <button onClick={() => { setNewChatMode('select'); setSelectedUserIds([]); }} className="text-brand-text-dim hover:text-white transition-colors">
                                                <LogOut size={20} className="rotate-180" />
                                            </button>
                                        )}
                                        <h3 className="text-sm uppercase tracking-[0.25em] font-black text-white">
                                            {newChatMode === 'select' ? 'Core Functions' : newChatMode === 'private' ? 'Direct Interface' : 'Group Initialization'}
                                        </h3>
                                    </div>
                                    <button onClick={() => { setShowNewChat(false); setNewChatMode('select'); setSelectedUserIds([]); }} className="text-brand-text-dim hover:text-white transition-colors">
                                        <X size={24} strokeWidth={2} />
                                    </button>
                                </div>

                                <div className="p-10 bg-brand-bg/20 overflow-y-auto custom-scroll">
                                    {newChatMode === 'select' ? (
                                        <div className="grid grid-cols-1 gap-6">
                                            <button onClick={() => { setNewChatMode('private'); setUsers([]); setSearchQuery(''); setSelectedUserIds([]); }} className="group p-8 premium-card hover:border-brand-accent transition-colors duration-300 text-left">
                                                <UserIcon size={32} className="text-brand-accent mb-4 group-hover:scale-110 transition-transform" />
                                                <h4 className="text-lg font-bold text-white mb-1 uppercase tracking-wider">Secure DM</h4>
                                                <p className="text-xs text-brand-text-dim uppercase tracking-widest font-bold opacity-60">End-to-end encrypted link</p>
                                            </button>

                                            <button onClick={() => { setNewChatMode('group'); setUsers([]); setSearchQuery(''); setSelectedUserIds([]); }} className="group p-8 premium-card hover:border-green-500 transition-colors duration-300 text-left">
                                                <div className="flex -space-x-4 mb-4">
                                                    <UserIcon size={32} className="text-green-500 bg-brand-card rounded-2xl p-1.5 border border-brand-border" />
                                                    <UserIcon size={32} className="text-green-500 bg-brand-card rounded-2xl p-1.5 border border-brand-border" />
                                                </div>
                                                <h4 className="text-lg font-bold text-white mb-1 uppercase tracking-wider">Group Node</h4>
                                                <p className="text-xs text-brand-text-dim uppercase tracking-widest font-bold opacity-60">Multi-point synchronization</p>
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="animate-in fade-in duration-300">
                                            {newChatMode === 'group' && selectedUserIds.length > 0 && (
                                                <div className="mb-8">
                                                    <input type="text" value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="GROUP IDENTITY" className="w-full bg-slate-900 border border-brand-accent rounded-2xl px-6 py-4 focus:outline-none text-xs tracking-[0.25em] uppercase font-black placeholder:text-brand-text-dim/30" />
                                                    <div className="mt-4 flex flex-wrap gap-2">
                                                        {selectedUserIds.map(id => {
                                                            const u = users.find(user => user.id === id);
                                                            return (
                                                                <div key={id} className="bg-brand-accent/10 border border-brand-accent/30 rounded-lg px-3 py-1.5 text-[10px] items-center space-x-2 flex font-black text-brand-accent">
                                                                    <span className="uppercase tracking-widest">{u?.username}</span>
                                                                    <X size={12} className="cursor-pointer hover:scale-125 transition-transform" onClick={() => toggleUserSelection(id)} />
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}

                                            <div className="relative mb-8">
                                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-accent" size={18} strokeWidth={2} />
                                                <input type="text" value={searchQuery} onChange={(e) => searchUsers(e.target.value)} autoFocus placeholder="SCAN USER BASE..." className="w-full bg-slate-900 border border-brand-border rounded-2xl pl-12 pr-6 py-4 focus:outline-none focus:border-brand-accent text-xs tracking-[.4em] uppercase font-black placeholder:text-brand-text-dim/30" />
                                            </div>

                                            <div className="space-y-4 mb-8">
                                                {users.map(u => (
                                                    <div
                                                        key={u.id}
                                                        onClick={() => { if (newChatMode === 'private') createChat(u.id); else toggleUserSelection(u.id); }}
                                                        className={`p-4 premium-card flex items-center justify-between cursor-pointer group ${selectedUserIds.includes(u.id) ? 'border-brand-accent bg-brand-accent/5' : 'hover:border-slate-700'}`}
                                                    >
                                                        <div className="flex items-center space-x-4">
                                                            {u.avatar_path ? <img src={getAvatarUrl(u.avatar_path)!} className="w-10 h-10 rounded-xl object-cover border border-brand-border" /> : <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-brand-text-dim"><UserIcon size={18} /></div>}
                                                            <span className="text-sm font-bold text-white uppercase tracking-widest">{u.username}</span>
                                                        </div>
                                                        {newChatMode === 'group' ? (selectedUserIds.includes(u.id) ? <X size={18} className="text-brand-accent" /> : <Plus size={18} className="text-brand-text-dim group-hover:text-brand-accent" />) : <Send size={18} className="text-brand-accent opacity-0 group-hover:opacity-100 transition-opacity" />}
                                                    </div>
                                                ))}
                                            </div>

                                            {newChatMode === 'group' && selectedUserIds.length > 0 && (
                                                <button onClick={() => createChat()} className="glow-button w-full border-none py-4 text-xs tracking-[0.3em] font-black uppercase">Initialize Interface</button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Avatar Editor Modal */}
                <AnimatePresence>
                    {avatarEditor.showAvatarEditor && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-brand-bg/95 backdrop-blur-2xl z-[60] flex items-center justify-center p-6"
                        >
                            <motion.div
                                initial={{ scale: 0.95 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0.95 }}
                                className="bg-brand-card w-full max-w-xl rounded-[2.5rem] border border-brand-border shadow-3xl overflow-hidden flex flex-col max-h-[90vh]"
                            >
                                <div className="p-8 border-b border-brand-border flex justify-between items-center bg-brand-sidebar/50 shrink-0">
                                    <h3 className="text-xs uppercase tracking-[0.3em] font-black text-white">Neural Reprofiling</h3>
                                    <button onClick={() => avatarEditor.setShowAvatarEditor(false)} className="text-brand-text-dim hover:text-white transition-colors">
                                        <X size={24} strokeWidth={2} />
                                    </button>
                                </div>

                                <div className="p-10 flex flex-col items-center justify-center bg-brand-bg/40 overflow-hidden">
                                    {avatarEditor.imgSrc && (
                                        <ReactCrop
                                            crop={avatarEditor.crop}
                                            onChange={(_, percentCrop) => avatarEditor.setCrop(percentCrop)}
                                            onComplete={(c) => avatarEditor.setCompletedCrop(c)}
                                            aspect={1}
                                            circularCrop
                                            className="max-h-[50vh] border-2 border-brand-border rounded-xl overflow-hidden shadow-2xl"
                                        >
                                            <img
                                                ref={avatarEditor.imgRef}
                                                alt="Crop target"
                                                src={avatarEditor.imgSrc}
                                                className="max-w-full block"
                                                onLoad={onImageLoad}
                                            />
                                        </ReactCrop>
                                    )}
                                </div>

                                <div className="p-8 bg-brand-sidebar/50 border-t border-brand-border shrink-0">
                                    <button onClick={avatarEditor.handleAvatarSave} className="glow-button w-full border-none py-5 text-sm tracking-[0.4em] font-black uppercase flex items-center justify-center space-x-4">
                                        <Check size={20} strokeWidth={4} />
                                        <span>Update Profile</span>
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Group Settings Modal */}
                <AnimatePresence>
                    {showGroupSettings && activeChat && (
                        <GroupSettingsModal
                            chat={activeChat}
                            currentUser={user}
                            userStatuses={userStatuses}
                            onClose={() => setShowGroupSettings(false)}
                            onUpdate={(updatedChat) => {
                                setChats(prev => prev.map(c => c.id === updatedChat.id ? updatedChat : c));
                                setActiveChat(updatedChat);
                            }}
                            onDelete={(chatId) => {
                                setChats(prev => prev.filter(c => c.id !== chatId));
                                setActiveChat(null);
                                setShowGroupSettings(false);
                            }}
                        />
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {selectedMessageForReceipts && activeChat && (
                        <MessageContextMenu
                            message={selectedMessageForReceipts}
                            chat={activeChat}
                            position={receiptsPosition}
                            onClose={() => setSelectedMessageForReceipts(null)}
                            onReactionToggle={(emoji) => handleToggleReaction(selectedMessageForReceipts.id, emoji)}
                            currentUserId={user?.id}
                        />
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {messageToDelete && (
                        <ConfirmDeleteModal
                            onConfirm={() => {
                                deleteMessage(messageToDelete);
                                setMessageToDelete(null);
                            }}
                            onCancel={() => setMessageToDelete(null)}
                        />
                    )}
                </AnimatePresence>

                {/* Chat Context Menu */}
                <AnimatePresence>
                    {chatMenuPos && chatMenuTarget && (
                        <>
                            <div
                                className="fixed inset-0 z-[60]"
                                onClick={() => { setChatMenuPos(null); setChatMenuTarget(null); }}
                                onContextMenu={(e) => { e.preventDefault(); setChatMenuPos(null); setChatMenuTarget(null); }}
                            />
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                style={{
                                    position: 'fixed',
                                    left: Math.min(chatMenuPos.x, window.innerWidth - 200),
                                    top: Math.min(chatMenuPos.y, window.innerHeight - 150),
                                    zIndex: 100
                                }}
                                className="w-48 bg-brand-sidebar/95 backdrop-blur-xl border border-brand-border rounded-2xl shadow-2xl overflow-hidden p-1.5"
                            >
                                <div className="px-3 py-2 border-b border-brand-border/50 mb-1">
                                    <p className="text-[10px] font-black text-brand-text-dim uppercase tracking-widest truncate">
                                        {chatMenuTarget.is_group ? chatMenuTarget.name : chatMenuTarget.members.find(m => m.id !== user?.id)?.username}
                                    </p>
                                </div>

                                <button
                                    onClick={() => handleLeaveChat(chatMenuTarget)}
                                    className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-brand-text-dim hover:text-white hover:bg-white/5 transition-all text-sm group"
                                >
                                    <LogOut size={16} className="group-hover:text-amber-500 transition-colors" />
                                    <span>Leave Chat</span>
                                </button>

                                {!chatMenuTarget.is_group && (
                                    <button
                                        onClick={() => handleDeleteChatAccount(chatMenuTarget)}
                                        className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-red-400 hover:text-white hover:bg-red-500/20 transition-all text-sm group"
                                    >
                                        <Trash2 size={16} className="group-hover:text-red-500 transition-colors" />
                                        <span>Delete for both</span>
                                    </button>
                                )}
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
                {/* Big Reaction Animation Area */}
                <AnimatePresence>
                    {activeBigReaction && (
                        <BigReaction
                            key={activeBigReaction.timestamp}
                            emoji={activeBigReaction.emoji}
                            onComplete={() => setActiveBigReaction(null)}
                        />
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default ChatPage;
