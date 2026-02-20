import React, { useState, useEffect, useRef } from 'react';
import { LogOut, Send, Paperclip, Plus, Search, User as UserIcon, X, Camera, Check } from 'lucide-react';
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
import ReadReceiptsModal from '../components/ReadReceiptsModal';
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
    const [onlineUsers, setOnlineUsers] = useState<Set<number>>(new Set());
    const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
    const [groupName, setGroupName] = useState('');
    const [newChatMode, setNewChatMode] = useState<'select' | 'private' | 'group'>('select');
    const [showGroupSettings, setShowGroupSettings] = useState(false);
    const [selectedMessageForReceipts, setSelectedMessageForReceipts] = useState<Message | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const activeChatIdRef = useRef<number | null>(null);

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
    }, [activeChat?.id]);

    useEffect(() => {
        // Immediate scroll to bottom without delay to prevent "jumping"
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }, [messages]);

    const [isSending, setIsSending] = useState(false);

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

    const handleChatUpdated = (data: any) => {
        setChats(prev => prev.map(c => {
            if (c.id === data.id) {
                return { ...c, ...data };
            }
            return c;
        }));
        if (activeChatIdRef.current === data.id) {
            setActiveChat(prev => prev ? { ...prev, ...data } : null);
        }
    };

    const handleOnlineList = (ids: number[]) => setOnlineUsers(new Set(ids));

    const handleMessageRead = (data: { message_id: number, chat_id: number, user_id: number, read_at: string }) => {
        setMessages(prev => prev.map(m => {
            if (m.id === data.message_id) {
                if (m.read_by.some(r => r.user_id === data.user_id)) return m;
                return { ...m, read_by: [...m.read_by, { user_id: data.user_id, read_at: data.read_at }] };
            }
            return m;
        }));
    };

    const handleUserStatus = (userId: number, online: boolean) => {
        setOnlineUsers(prev => {
            const newSet = new Set(prev);
            if (online) newSet.add(userId);
            else newSet.delete(userId);
            return newSet;
        });
    };

    useWebSocket(token, handleNewMessage, handleDeleteMessage, handleNewChat, handleChatUpdated, handleOnlineList, handleUserStatus, handleMessageRead);

    const markMessageRead = async (messageId: number) => {
        try {
            await api.post(`/messages/${messageId}/read`);
        } catch (err) {
            console.error('Failed to mark message read:', err);
        }
    };

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
            setSelectedUserIds([]);
            setNewChatMode('select');
        } catch (err) {
            console.error('Failed to create chat:', err);
        }
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
                            isOnline={isUserOnline(chat)}
                            onClick={() => setActiveChat(chat)}
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
                                <AnimatePresence mode="popLayout">
                                    {!messagesLoading ? (
                                        messages.map((msg) => (
                                            <MessageBubble
                                                key={msg.id}
                                                msg={msg}
                                                currentUser={user}
                                                isGroup={activeChat.is_group}
                                                onDelete={deleteMessage}
                                                onRead={markMessageRead}
                                                onReadReceiptsClick={setSelectedMessageForReceipts}
                                            />
                                        ))
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
                            className="absolute inset-0 bg-brand-bg/95 backdrop-blur-2xl z-50 flex items-center justify-center p-6"
                        >
                            <motion.div
                                initial={{ scale: 0.95, y: 10 }}
                                animate={{ scale: 1, y: 0 }}
                                exit={{ scale: 0.95, y: 10 }}
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
                            onlineUsers={onlineUsers}
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
                        <ReadReceiptsModal
                            message={selectedMessageForReceipts}
                            chat={activeChat}
                            onClose={() => setSelectedMessageForReceipts(null)}
                        />
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default ChatPage;
