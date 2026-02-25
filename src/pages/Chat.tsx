import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { format, isSameDay } from 'date-fns';
import { ChevronDown, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { useChats, useMessages, useAvatarEditor, useWebSocket } from '../hooks/useChat';
import { type Chat, type Message } from '../types';
import MessageBubble from '../components/MessageBubble';
import GroupSettingsModal from '../components/GroupSettingsModal';
import MessageContextMenu from '../components/MessageContextMenu';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import BigReaction from '../components/BigReaction';

import AvatarCropModal from '../components/chat/AvatarCropModal';
import ChatContextMenu from '../components/chat/ChatContextMenu';
import NewChatModal from '../components/chat/NewChatModal';
import ChatInput from '../components/chat/ChatInput';
import ChatHeader from '../components/chat/ChatHeader';
import ChatSidebar from '../components/chat/ChatSidebar';

const ChatPage: React.FC = () => {
    const { user, logout, token, refreshUser } = useAuth();
    const navigate = useNavigate();
    const { chatId: urlChatId } = useParams();
    const { chats, setChats, fetchChats, loading: chatsLoading, error: chatsError } = useChats();
    const [activeChat, setActiveChat] = useState<Chat | null>(null);
    const { messages, setMessages, loading: messagesLoading } = useMessages(activeChat?.id || null);

    const [inputText, setInputText] = useState('');
    const [showNewChat, setShowNewChat] = useState(false);
    const [userStatuses, setUserStatuses] = useState<Map<number, string>>(new Map());
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
    const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);

    // Chat Actions Context Menu
    const [chatMenuPos, setChatMenuPos] = useState<{ x: number, y: number } | null>(null);
    const [chatMenuTarget, setChatMenuTarget] = useState<Chat | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const activeChatIdRef = useRef<number | null>(null);
    const lastMessagesLengthRef = useRef(0);
    const isInitialLoadRef = useRef(true);

    // Avatar Editor for Current User
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
    }, [user?.id]);

    useEffect(() => {
        if (urlChatId && chats.length > 0) {
            const foundChat = chats.find(c => c.id === Number(urlChatId));
            if (foundChat) {
                setActiveChat(foundChat);
                localStorage.setItem('activeChatId', urlChatId);
            }
        } else if (!urlChatId) {
            const lastChatId = localStorage.getItem('activeChatId');
            if (lastChatId && chats.length > 0) {
                const foundChat = chats.find(c => c.id === Number(lastChatId));
                if (foundChat) {
                    navigate(`/${lastChatId}`);
                } else {
                    setActiveChat(null);
                }
            } else {
                setActiveChat(null);
            }
        }
    }, [urlChatId, chats, navigate]);

    useEffect(() => {
        if (!activeChat) {
            activeChatIdRef.current = null;
            return;
        }

        activeChatIdRef.current = activeChat.id;
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

        // Clear unread count locally and on backend
        if (activeChat.unread_count > 0) {
            setChats(prev => prev.map(c =>
                c.id === activeChat.id ? { ...c, unread_count: 0 } : c
            ));
            markChatRead();
        }
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
                return prev.map(c => {
                    if (c.id !== msg.chat_id) return c;
                    // Increment unread count if the message is from someone else and this chat isn't active
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
        // If the current user read a message, decrement unread_count for that chat
        if (data.user_id === user?.id) {
            setChats(prev => prev.map(c =>
                c.id === data.chat_id
                    ? { ...c, unread_count: Math.max(0, (c.unread_count || 0) - 1) }
                    : c
            ));
        }
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
            navigate('/');
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
        const replyId = replyToMessage?.id;
        setInputText('');
        setReplyToMessage(null);
        setIsSending(true);
        try {
            await api.post('/messages/send', {
                chat_id: activeChat.id,
                text,
                reply_to_id: replyId
            });
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
            await api.post('/messages/send', {
                chat_id: activeChat.id,
                file_id: uploadResp.data.id,
                reply_to_id: replyToMessage?.id
            });
            setReplyToMessage(null);
        } catch (err) { console.error(err); }
    };

    const handleChatCreated = (newChat: Chat) => {
        setChats(prev => {
            const exists = prev.find(c => c.id === newChat.id);
            if (exists) return prev;
            return [newChat, ...prev];
        });
        navigate(`/${newChat.id}`);
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

    return (
        <div className="flex h-full w-full bg-brand-bg text-brand-text overflow-hidden font-sans relative">
            <div className="radar-glow" />

            {/* Sidebar */}
            <ChatSidebar
                currentUser={user}
                userStatuses={userStatuses}
                typingUsers={typingUsers}
                chats={chats}
                activeChatId={activeChat?.id || null}
                chatsLoading={chatsLoading}
                chatsError={chatsError}
                onLogout={logout}
                onShowNewChat={() => setShowNewChat(true)}
                onFetchChats={fetchChats}
                onChatSelect={(id) => navigate(`/${id}`)}
                onChatContextMenu={onChatContextMenu}
                avatarFileInputRef={avatarEditor.fileInputRef}
                onSelectAvatarFile={avatarEditor.onSelectFile}
                onDeleteAvatar={avatarEditor.handleAvatarDelete}
            />

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col relative z-10 bg-brand-bg/30 min-w-0">
                <AnimatePresence mode="wait">
                    {activeChat ? (
                        <div key={activeChat.id} className="flex-1 flex flex-col min-h-0">
                            <ChatHeader
                                activeChat={activeChat}
                                currentUser={user}
                                userStatuses={userStatuses}
                                typingUsers={typingUsers[activeChat.id] || {}}
                                onGroupSettingsClick={() => setShowGroupSettings(true)}
                                isMsgSearchOpen={isMsgSearchOpen}
                                setIsMsgSearchOpen={setIsMsgSearchOpen}
                                msgSearchQuery={msgSearchQuery}
                                setMsgSearchQuery={setMsgSearchQuery}
                                searchMatchIds={searchMatchIds}
                                currentMatchIndex={currentMatchIndex}
                                onPrevMatch={prevMatch}
                                onNextMatch={nextMatch}
                                onClearSearch={() => {
                                    setMsgSearchQuery('');
                                    setSearchMatchIds([]);
                                    setCurrentMatchIndex(-1);
                                }}
                                isSelectionMode={isSelectionMode}
                                toggleSelectionMode={toggleSelectionMode}
                                selectedMsgIdsSize={selectedMsgIds.size}
                                onBulkDelete={handleBulkDelete}
                            />

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

                            <ChatInput
                                inputText={inputText}
                                setInputText={setInputText}
                                isSending={isSending}
                                replyToMessage={replyToMessage}
                                onClearReply={() => setReplyToMessage(null)}
                                onSendMessage={sendMessage}
                                onFileUpload={handleFileUpload}
                            />
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

                <NewChatModal
                    show={showNewChat}
                    onClose={() => setShowNewChat(false)}
                    onChatCreated={handleChatCreated}
                />

                <AvatarCropModal
                    show={avatarEditor.showAvatarEditor}
                    onClose={() => avatarEditor.setShowAvatarEditor(false)}
                    imgSrc={avatarEditor.imgSrc}
                    crop={avatarEditor.crop}
                    setCrop={avatarEditor.setCrop}
                    setCompletedCrop={avatarEditor.setCompletedCrop}
                    onSave={avatarEditor.handleAvatarSave}
                    imgRef={avatarEditor.imgRef}
                />

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
                                navigate('/');
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
                            onReply={setReplyToMessage}
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
                <ChatContextMenu
                    pos={chatMenuPos}
                    target={chatMenuTarget}
                    currentUser={user}
                    onClose={() => {
                        setChatMenuPos(null);
                        setChatMenuTarget(null);
                    }}
                    onLeaveChat={handleLeaveChat}
                    onDeleteChat={handleDeleteChatAccount}
                />

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
