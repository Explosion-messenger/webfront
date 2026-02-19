import React, { useState, useEffect, useRef } from 'react';
import { LogOut, Send, Paperclip, Plus, Search, User as UserIcon, X, Camera, Check, Trash2 } from 'lucide-react';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { useChats, useMessages, useAvatarEditor, useWebSocket } from '../hooks/useChat';
import { type Chat, type Message, type User } from '../types';
import ChatListItem from '../components/ChatListItem';
import MessageBubble from '../components/MessageBubble';
import { centerCrop, makeAspectCrop } from 'react-image-crop';

const ChatPage: React.FC = () => {
    const { user, logout, token, refreshUser } = useAuth();
    const { chats, setChats, fetchChats } = useChats();
    const [activeChat, setActiveChat] = useState<Chat | null>(null);
    const { messages, setMessages } = useMessages(activeChat?.id || null);

    const [inputText, setInputText] = useState('');
    const [showNewChat, setShowNewChat] = useState(false);
    const [users, setUsers] = useState<User[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [onlineUsers, setOnlineUsers] = useState<Set<number>>(new Set());
    const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
    const [groupName, setGroupName] = useState('');
    const [newChatMode, setNewChatMode] = useState<'select' | 'private' | 'group'>('select');

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const activeChatIdRef = useRef<number | null>(null);

    // Avatar Editor
    const avatarEditor = useAvatarEditor(refreshUser);

    useEffect(() => {
        fetchChats();
    }, []);

    useEffect(() => {
        activeChatIdRef.current = activeChat?.id || null;
    }, [activeChat?.id]);

    useEffect(() => {
        // Immediate scroll to bottom without delay to prevent "jumping"
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }, [messages]);

    // WebSocket Handlers
    const handleNewMessage = (msg: Message) => {
        if (Number(activeChatIdRef.current) === Number(msg.chat_id)) {
            setMessages(prev => {
                if (prev.find(m => m.id === msg.id)) return prev;
                return [...prev, msg];
            });
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

    const handleOnlineList = (ids: number[]) => setOnlineUsers(new Set(ids));

    const handleUserStatus = (userId: number, online: boolean) => {
        setOnlineUsers(prev => {
            const newSet = new Set(prev);
            if (online) newSet.add(userId);
            else newSet.delete(userId);
            return newSet;
        });
    };

    useWebSocket(token, handleNewMessage, handleDeleteMessage, handleNewChat, handleOnlineList, handleUserStatus);

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputText.trim() || !activeChat) return;
        try {
            await api.post('/messages/send', { chat_id: activeChat.id, text: inputText });
            setInputText('');
        } catch (err) { console.error(err); }
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

    const deleteMessage = async (messageId: number) => {
        try { await api.delete(`/messages/${messageId}`); } catch (err) { console.error(err); }
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
            setNewChatMode('select');
        } catch (err) { console.error(err); }
    };

    const toggleUserSelection = (userId: number) => {
        setSelectedUserIds(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
    };

    const getChatName = (chat: Chat) => {
        if (chat.is_group && chat.name) return chat.name;
        if (chat.is_group) return chat.members.map(m => m.username).join(', ');
        const otherMember = chat.members.find(m => m.id !== user?.id);
        return otherMember?.username || 'Unknown';
    };

    const isUserOnline = (chat: Chat) => {
        if (chat.is_group) return false;
        const otherMember = chat.members.find(m => m.id !== user?.id);
        return otherMember ? onlineUsers.has(otherMember.id) : false;
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
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="w-80 border-r border-brand-border flex flex-col bg-brand-sidebar z-10 shrink-0"
            >
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
                            <span className="text-[10px] text-green-500 font-bold uppercase tracking-widest">Active</span>
                        </div>
                    </div>
                    <div className="flex items-center">
                        {user?.is_admin && (
                            <button onClick={avatarEditor.handleClearAllAvatars} className="p-2 hover:bg-brand-bg rounded-xl transition-colors text-brand-text-dim hover:text-red-500" title="Admin Clear">
                                <Trash2 size={18} strokeWidth={1.5} />
                            </button>
                        )}
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
                            isOnline={isUserOnline(chat)}
                            onClick={() => setActiveChat(chat)}
                        />
                    ))}
                </div>
            </motion.div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col relative z-10 bg-brand-bg/30 min-w-0">
                <AnimatePresence mode="wait">
                    {activeChat ? (
                        <div key={activeChat.id} className="flex-1 flex flex-col min-h-0">
                            <div className="p-4 glass-header flex items-center justify-between shrink-0">
                                <div className="flex items-center min-w-0">
                                    <div className="relative mr-4 shrink-0">
                                        {activeChat.is_group ? (
                                            <div className="w-10 h-10 bg-slate-800 rounded-2xl flex items-center justify-center border border-slate-700">
                                                <UserIcon size={20} strokeWidth={1.5} className="text-brand-text-dim" />
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
                                        {!activeChat.is_group && isUserOnline(activeChat) && (
                                            <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-brand-sidebar rounded-full shadow-glow-green" />
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <h2 className="font-bold text-lg tracking-tight text-white truncate">{getChatName(activeChat)}</h2>
                                        <p className="text-[10px] font-bold text-brand-text-dim uppercase tracking-[0.15em] truncate">
                                            {activeChat.is_group ? `${activeChat.members.length} Members` : isUserOnline(activeChat) ? 'Online' : 'Offline'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex space-x-2 shrink-0">
                                    <button className="p-2 text-brand-text-dim hover:text-brand-accent transition-colors">
                                        <Search size={20} />
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scroll">
                                {messages.map((msg) => (
                                    <MessageBubble
                                        key={msg.id}
                                        msg={msg}
                                        currentUser={user}
                                        onDelete={deleteMessage}
                                    />
                                ))}
                                <div ref={messagesEndRef} />
                            </div>

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
                                        disabled={!inputText.trim()}
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
            </div>
        </div>
    );
};

export default ChatPage;
