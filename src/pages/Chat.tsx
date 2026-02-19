import React, { useState, useEffect, useRef } from 'react';
import { LogOut, Send, Paperclip, Plus, Search, User as UserIcon, X, Camera, Check, Trash2 } from 'lucide-react';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { useChats, useMessages, useAvatarEditor, useWebSocket, type Chat, type Message, type User } from '../hooks/useChat';
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
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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

    // Helper needed for ReactCrop
    const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
        const { width, height } = e.currentTarget;
        const initialCrop = centerCrop(
            makeAspectCrop({ unit: '%', width: 90 }, 1, width, height),
            width, height
        );
        avatarEditor.setCrop(initialCrop);
    };


    return (
        <div className="flex h-screen bg-nord0 text-nord6 overflow-hidden font-sans">
            {/* Sidebar */}
            <div className="w-80 border-r border-nord2 flex flex-col bg-nord1">
                <div className="p-6 border-b border-nord2 flex items-center justify-between bg-nord1/50 backdrop-blur-sm">
                    <div className="flex items-center space-x-3">
                        <div className="relative group">
                            {user?.avatar_path ? (
                                <img src={getAvatarUrl(user.avatar_path)!} alt={user.username} className="w-8 h-8 rounded-full object-cover border border-nord3" />
                            ) : (
                                <div className="w-8 h-8 bg-nord8 rounded-full flex items-center justify-center font-bold text-nord0 text-sm">
                                    {user?.username?.[0].toUpperCase()}
                                </div>
                            )}
                            <div className="absolute inset-0 bg-nord0/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full space-x-1">
                                <label className="cursor-pointer p-1 hover:text-nord8 transition-colors">
                                    <Camera size={12} className="text-nord6" />
                                    <input type="file" ref={avatarEditor.fileInputRef} className="hidden" accept="image/*" onChange={avatarEditor.onSelectFile} />
                                </label>
                                {user?.avatar_path && (
                                    <button onClick={avatarEditor.handleAvatarDelete} className="p-1 hover:text-nord11 transition-colors">
                                        <X size={12} className="text-nord6" />
                                    </button>
                                )}
                            </div>
                        </div>
                        <span className="font-light tracking-wide text-nord6">{user?.username}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                        <button onClick={avatarEditor.handleClearAllAvatars} className="p-2 hover:bg-nord2 rounded-xl transition-colors text-nord4 hover:text-nord11" title="Clear ALL avatars from folder (Admin)">
                            <Trash2 size={16} strokeWidth={1.5} className="text-nord3 hover:text-nord11" />
                        </button>
                        <button onClick={logout} className="p-2 hover:bg-nord2 rounded-xl transition-colors text-nord4 hover:text-nord11">
                            <LogOut size={18} strokeWidth={1.5} />
                        </button>
                    </div>
                </div>

                <div className="p-4">
                    <button onClick={() => setShowNewChat(true)} className="w-full py-2 bg-nord3 hover:bg-nord4 hover:text-nord0 text-nord6 rounded-xl flex items-center justify-center space-x-2 transition-all duration-200 border border-nord4/10 uppercase tracking-widest text-xs font-bold">
                        <Plus size={16} strokeWidth={2} />
                        <span>New Conversation</span>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto">
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
            <div className="flex-1 flex flex-col relative">
                {activeChat ? (
                    <>
                        <div className="p-4 border-b border-nord2 flex items-center bg-nord1/80 backdrop-blur-md sticky top-0 z-10">
                            {activeChat.is_group ? (
                                <div className="w-8 h-8 bg-nord10 rounded-full flex items-center justify-center mr-3">
                                    <UserIcon size={16} strokeWidth={1.5} className="text-nord6" />
                                </div>
                            ) : (
                                <div className="w-8 h-8 bg-nord3 rounded-full flex items-center justify-center mr-3 overflow-hidden">
                                    {activeChat.members.find(m => m.id !== user?.id)?.avatar_path ? (
                                        <img src={getAvatarUrl(activeChat.members.find(m => m.id !== user?.id)!.avatar_path)!} className="w-full h-full object-cover" />
                                    ) : (
                                        <UserIcon size={16} strokeWidth={1.5} className="text-nord4" />
                                    )}
                                </div>
                            )}
                            <div>
                                <h2 className="font-light tracking-tight text-nord6">{getChatName(activeChat)}</h2>
                                {isUserOnline(activeChat) ? (
                                    <span className="text-[10px] text-nord14 flex items-center uppercase tracking-widest font-bold">
                                        <span className="w-1.5 h-1.5 bg-nord14 rounded-full mr-2"></span> Online
                                    </span>
                                ) : (
                                    <span className="text-[10px] text-nord4 uppercase tracking-widest font-bold">Offline</span>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-nord0/30">
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

                        <form onSubmit={sendMessage} className="p-4 border-t border-nord2 flex items-center space-x-4 bg-nord1/50">
                            <label className="cursor-pointer p-2 hover:bg-nord2 rounded-xl block transition-colors">
                                <Paperclip size={20} strokeWidth={1.5} className="text-nord4 hover:text-nord8" />
                                <input type="file" className="hidden" onChange={handleFileUpload} />
                            </label>
                            <input
                                type="text"
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                placeholder="Write a message..."
                                className="flex-1 bg-nord2 border border-nord3 rounded-xl px-4 py-3 focus:outline-none focus:border-nord8 transition-all text-sm text-nord6 placeholder:text-nord4/50"
                            />
                            <button type="submit" disabled={!inputText.trim()} className="p-3 bg-nord8 hover:bg-nord7 disabled:opacity-30 disabled:grayscale rounded-xl text-nord0 transition-all duration-200">
                                <Send size={18} strokeWidth={2} />
                            </button>
                        </form>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-nord4 space-y-6 bg-nord0">
                        <div className="w-16 h-16 bg-nord1 border border-nord2 rounded-2xl flex items-center justify-center opacity-50">
                            <Send size={32} strokeWidth={1} className="text-nord4" />
                        </div>
                        <p className="text-sm uppercase tracking-[0.2em] font-light">Select a conversation</p>
                    </div>
                )}

                {/* New Chat Modal */}
                {showNewChat && (
                    <div className="absolute inset-0 bg-nord0/90 backdrop-blur-xl z-50 flex items-center justify-center p-4">
                        <div className="bg-nord1 w-full max-w-md rounded-2xl border border-nord3 shadow-2xl overflow-hidden">
                            <div className="p-6 border-b border-nord2 flex justify-between items-center bg-nord1">
                                <div className="flex items-center space-x-3">
                                    {newChatMode !== 'select' && (
                                        <button onClick={() => setNewChatMode('select')} className="text-nord4 hover:text-nord8 transition-colors p-1 -ml-1">
                                            <LogOut size={16} className="rotate-180" />
                                        </button>
                                    )}
                                    <h3 className="text-sm uppercase tracking-widest font-bold text-nord6">
                                        {newChatMode === 'select' ? 'New Conversation' : newChatMode === 'private' ? 'Direct Message' : 'Create Group'}
                                    </h3>
                                </div>
                                <button onClick={() => { setShowNewChat(false); setNewChatMode('select'); }} className="text-nord4 hover:text-nord11 transition-colors">
                                    <X size={20} strokeWidth={2} />
                                </button>
                            </div>

                            <div className="p-8 bg-nord0/50">
                                {newChatMode === 'select' ? (
                                    <div className="grid grid-cols-1 gap-4">
                                        <button onClick={() => { setNewChatMode('private'); setUsers([]); setSearchQuery(''); }} className="group p-6 bg-nord2/30 hover:bg-nord8 border border-nord3 hover:border-nord8 transition-all duration-300 text-left">
                                            <div className="flex items-center justify-between mb-2">
                                                <UserIcon size={24} className="text-nord8 group-hover:text-nord0 transition-colors" />
                                                <Plus size={16} className="text-nord4 group-hover:text-nord0/50" />
                                            </div>
                                            <h4 className="text-sm font-bold text-nord6 group-hover:text-nord0 transition-colors uppercase tracking-wider">Individual Chat</h4>
                                            <p className="text-[10px] text-nord4 group-hover:text-nord0/70 transition-colors mt-1">Start a direct one-on-one conversation</p>
                                        </button>

                                        <button onClick={() => { setNewChatMode('group'); setUsers([]); setSearchQuery(''); setSelectedUserIds([]); }} className="group p-6 bg-nord2/30 hover:bg-nord14 border border-nord3 hover:border-nord14 transition-all duration-300 text-left">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex -space-x-2">
                                                    <UserIcon size={20} className="text-nord14 group-hover:text-nord0 transition-colors bg-nord1 rounded-full p-0.5" />
                                                    <UserIcon size={20} className="text-nord14 group-hover:text-nord0 transition-colors bg-nord1 rounded-full p-0.5 border-l border-nord1" />
                                                </div>
                                                <Plus size={16} className="text-nord4 group-hover:text-nord0/50" />
                                            </div>
                                            <h4 className="text-sm font-bold text-nord6 group-hover:text-nord0 transition-colors uppercase tracking-wider">Group Chat</h4>
                                            <p className="text-[10px] text-nord4 group-hover:text-nord0/70 transition-colors mt-1">Collaborate with multiple users</p>
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        {newChatMode === 'group' && selectedUserIds.length > 0 && (
                                            <div className="mb-6 animate-in fade-in slide-in-from-top-2">
                                                <input type="text" value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="GROUP NAME (OPTIONAL)" className="w-full bg-nord2 border border-nord8/50 rounded-xl px-4 py-3 focus:outline-none focus:border-nord8 text-xs tracking-widest uppercase placeholder:text-nord4/30 font-bold" />
                                                <div className="mt-2 flex flex-wrap gap-2">
                                                    {selectedUserIds.map(id => {
                                                        const u = users.find(user => user.id === id);
                                                        return (
                                                            <div key={id} className="bg-nord3 px-2 py-1 text-[10px] items-center space-x-1 flex font-bold border border-nord4/10">
                                                                <span className="uppercase">{u?.username}</span>
                                                                <X size={10} className="cursor-pointer hover:text-nord11" onClick={() => toggleUserSelection(id)} />
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        <div className="relative mb-6">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-nord4" size={14} strokeWidth={2} />
                                            <input type="text" value={searchQuery} onChange={(e) => searchUsers(e.target.value)} autoFocus placeholder="SEARCH BY USERNAME..." className="w-full bg-nord2 border border-nord3 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-nord8 text-xs tracking-widest uppercase placeholder:text-nord4/30 font-bold" />
                                        </div>

                                        <div className="space-y-1 max-h-60 overflow-y-auto mb-6">
                                            {users.length > 0 ? users.map(u => (
                                                <div key={u.id} onClick={() => { if (newChatMode === 'private') createChat(u.id); else toggleUserSelection(u.id); }} className={`p-4 bg-nord2/30 hover:bg-nord2 border rounded-xl cursor-pointer flex items-center justify-between transition-all duration-200 ${selectedUserIds.includes(u.id) ? 'border-nord14 bg-nord2' : 'border-transparent'}`}>
                                                    <div className="flex items-center space-x-4">
                                                        <div className="relative">
                                                            {u.avatar_path ? <img src={getAvatarUrl(u.avatar_path)!} className="w-8 h-8 rounded-full object-cover border border-nord3" /> : <div className="w-8 h-8 bg-nord3 rounded-full flex items-center justify-center text-nord4"><UserIcon size={16} strokeWidth={2} /></div>}
                                                            {onlineUsers.has(u.id) && <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-nord14 border-2 border-nord0 rounded-full"></span>}
                                                        </div>
                                                        <span className="text-sm font-bold text-nord6 uppercase tracking-wider">{u.username}</span>
                                                    </div>
                                                    {newChatMode === 'group' ? (selectedUserIds.includes(u.id) ? <X size={14} className="text-nord11" /> : <Plus size={14} className="text-nord8" />) : <Send size={14} className="text-nord8 opacity-0 group-hover:opacity-100" />}
                                                </div>
                                            )) : searchQuery.length >= 2 ? <p className="text-center text-nord4 py-8 text-[10px] uppercase tracking-widest font-bold">No survivors found</p> : <p className="text-center text-nord4 py-8 text-[10px] uppercase tracking-widest opacity-50 font-bold">Search for a username</p>}
                                        </div>

                                        {newChatMode === 'group' && selectedUserIds.length > 0 && (
                                            <button onClick={() => createChat()} className="w-full py-4 bg-nord14 hover:bg-nord14/80 text-nord0 rounded-xl uppercase tracking-[0.2em] text-xs font-black transition-all shadow-lg active:translate-y-0.5">Initialize Group</button>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Avatar Editor Modal */}
                {avatarEditor.showAvatarEditor && (
                    <div className="absolute inset-0 bg-nord0/95 backdrop-blur-2xl z-[60] flex items-center justify-center p-4">
                        <div className="bg-nord1 w-full max-w-lg rounded-2xl border border-nord3 shadow-2xl flex flex-col max-h-[90vh]">
                            <div className="p-6 border-b border-nord2 flex justify-between items-center bg-nord1">
                                <h3 className="text-sm uppercase tracking-widest font-black text-nord6">Optimize Avatar</h3>
                                <button onClick={() => avatarEditor.setShowAvatarEditor(false)} className="text-nord4 hover:text-nord11 transition-colors">
                                    <X size={20} strokeWidth={2} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-auto p-8 flex flex-col items-center justify-center bg-nord0/40">
                                {avatarEditor.imgSrc && (
                                    <ReactCrop
                                        crop={avatarEditor.crop}
                                        onChange={(_, percentCrop) => avatarEditor.setCrop(percentCrop)}
                                        onComplete={(c) => avatarEditor.setCompletedCrop(c)}
                                        aspect={1}
                                        circularCrop
                                        className="max-h-[60vh] border-2 border-nord3/50"
                                    >
                                        <img
                                            ref={avatarEditor.imgRef}
                                            alt="Crop me"
                                            src={avatarEditor.imgSrc}
                                            className="max-w-full block"
                                            onLoad={onImageLoad}
                                        />
                                    </ReactCrop>
                                )}
                                <p className="mt-6 text-[10px] text-nord4 uppercase tracking-[0.2em] font-bold text-center">SELECT THE AREA TO BE DISPLAYED</p>
                            </div>

                            <div className="p-6 bg-nord1 border-t border-nord2">
                                <button onClick={avatarEditor.handleAvatarSave} className="w-full py-5 bg-nord8 hover:bg-nord7 text-nord0 rounded-xl uppercase tracking-[0.3em] text-xs font-black transition-all flex items-center justify-center space-x-3 shadow-xl active:translate-y-0.5">
                                    <Check size={18} strokeWidth={3} />
                                    <span>Synchronize Identity</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatPage;
