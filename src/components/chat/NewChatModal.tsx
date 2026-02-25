import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, X, User as UserIcon, Plus, Search, Send } from 'lucide-react';
import { type Chat, type User } from '../../types';
import api from '../../api';

export interface NewChatModalProps {
    show: boolean;
    onClose: () => void;
    onChatCreated: (chat: Chat) => void;
}

const getAvatarUrl = (path?: string) => path ? `/avatars/${path}` : null;

const NewChatModal: React.FC<NewChatModalProps> = ({ show, onClose, onChatCreated }) => {
    const [mode, setMode] = useState<'select' | 'private' | 'group'>('select');
    const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
    const [groupName, setGroupName] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [users, setUsers] = useState<User[]>([]);

    useEffect(() => {
        if (show) {
            setMode('select');
            setSelectedUserIds([]);
            setGroupName('');
            setSearchQuery('');
            setUsers([]);
        }
    }, [show]);

    const searchUsers = async (q: string) => {
        setSearchQuery(q);
        if (q.length < 2) { setUsers([]); return; }
        try {
            const resp = await api.get(`/users?q=${q}`);
            setUsers(resp.data);
        } catch (err) { console.error(err); }
    };

    const toggleUserSelection = (userId: number) => {
        setSelectedUserIds(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
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
            onChatCreated(resp.data);
            onClose();
        } catch (err) {
            console.error('Failed to create chat:', err);
        }
    };

    const handleClose = () => {
        onClose();
    };

    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={handleClose}
                    className="absolute inset-0 bg-black/20 backdrop-blur-2xl z-50 flex items-center justify-center p-6"
                >
                    <motion.div
                        initial={{ scale: 0.95, y: 10 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.95, y: 10 }}
                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                        className="bg-white/60 backdrop-blur-xl w-full max-w-lg rounded-[2.5rem] border border-white/50 shadow-premium overflow-hidden flex flex-col max-h-full"
                    >
                        <div className="p-8 border-b border-white/40 flex justify-between items-center bg-white/40 shrink-0">
                            <div className="flex items-center space-x-4">
                                {mode !== 'select' && (
                                    <button onClick={() => { setMode('select'); setSelectedUserIds([]); }} className="text-brand-text-dim hover:text-brand-text transition-colors">
                                        <LogOut size={20} className="rotate-180" />
                                    </button>
                                )}
                                <h3 className="text-sm uppercase tracking-[0.25em] font-black text-brand-text">
                                    {mode === 'select' ? 'Provision Gateway' : mode === 'private' ? 'Direct Instance' : 'Cluster Initialization'}
                                </h3>
                            </div>
                            <button onClick={handleClose} className="text-brand-text-dim hover:text-brand-text transition-colors">
                                <X size={24} strokeWidth={2} />
                            </button>
                        </div>

                        <div className="p-10 bg-transparent overflow-y-auto custom-scroll">
                            {mode === 'select' ? (
                                <div className="grid grid-cols-1 gap-6">
                                    <button onClick={() => { setMode('private'); setUsers([]); setSearchQuery(''); setSelectedUserIds([]); }} className="group p-8 bg-white/40 border border-white/50 shadow-sm rounded-3xl hover:border-brand-accent transition-colors duration-300 text-left">
                                        <UserIcon size={32} className="text-brand-accent mb-4 group-hover:scale-110 transition-transform" />
                                        <h4 className="text-lg font-black text-brand-text mb-1 uppercase tracking-wider">Direct Instance</h4>
                                        <p className="text-xs text-brand-text-dim uppercase tracking-widest font-bold opacity-80">1-on-1 Encrypted Link</p>
                                    </button>

                                    <button onClick={() => { setMode('group'); setUsers([]); setSearchQuery(''); setSelectedUserIds([]); }} className="group p-8 bg-white/40 border border-white/50 shadow-sm rounded-3xl hover:border-green-500 transition-colors duration-300 text-left">
                                        <div className="flex -space-x-4 mb-4">
                                            <UserIcon size={32} className="text-green-500 bg-white/60 rounded-2xl p-1.5 border border-white/50 shadow-sm" />
                                            <UserIcon size={32} className="text-green-500 bg-white/60 rounded-2xl p-1.5 border border-white/50 shadow-sm" />
                                        </div>
                                        <h4 className="text-lg font-black text-brand-text mb-1 uppercase tracking-wider">Cluster Instance</h4>
                                        <p className="text-xs text-brand-text-dim uppercase tracking-widest font-bold opacity-80">Multi-point synchronization</p>
                                    </button>
                                </div>
                            ) : (
                                <div className="animate-in fade-in duration-300">
                                    {mode === 'group' && selectedUserIds.length > 0 && (
                                        <div className="mb-8">
                                            <input type="text" value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="CLUSTER IDENTITY" className="w-full bg-white/60 border border-white/50 rounded-2xl px-6 py-4 focus:outline-none focus:border-brand-accent text-xs text-brand-text tracking-[0.25em] uppercase font-black placeholder:text-brand-text-dim/60 shadow-sm" />
                                            <div className="mt-4 flex flex-wrap gap-2">
                                                {selectedUserIds.map(id => {
                                                    const u = users.find(user => user.id === id);
                                                    return (
                                                        <div key={id} className="bg-brand-accent/10 border border-brand-accent/30 rounded-lg px-3 py-1.5 text-[10px] items-center space-x-2 flex font-black text-brand-accent shadow-sm">
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
                                        <input type="text" value={searchQuery} onChange={(e) => searchUsers(e.target.value)} autoFocus placeholder="SCAN USER BASE..." className="w-full bg-white/60 border border-white/50 rounded-2xl pl-12 pr-6 py-4 focus:outline-none focus:border-brand-accent text-xs text-brand-text tracking-[.4em] uppercase font-black placeholder:text-brand-text-dim/60 shadow-sm" />
                                    </div>

                                    <div className="space-y-4 mb-8">
                                        {users.map(u => (
                                            <div
                                                key={u.id}
                                                onClick={() => { if (mode === 'private') createChat(u.id); else toggleUserSelection(u.id); }}
                                                className={`p-4 bg-white/40 border border-white/50 shadow-sm rounded-2xl flex items-center justify-between cursor-pointer group ${selectedUserIds.includes(u.id) ? 'border-brand-accent bg-brand-accent/5' : 'hover:border-brand-accent/50'}`}
                                            >
                                                <div className="flex items-center space-x-4">
                                                    {u.avatar_path ? <img src={getAvatarUrl(u.avatar_path)!} className="w-10 h-10 rounded-xl object-cover border border-white/40 shadow-sm" /> : <div className="w-10 h-10 bg-white/60 shadow-sm backdrop-blur-md rounded-xl flex items-center justify-center text-brand-text-dim border border-white/40"><UserIcon size={18} /></div>}
                                                    <span className="text-sm font-black text-brand-text uppercase tracking-widest">{u.username}</span>
                                                </div>
                                                {mode === 'group' ? (selectedUserIds.includes(u.id) ? <X size={18} className="text-brand-accent" /> : <Plus size={18} className="text-brand-text-dim group-hover:text-brand-accent" />) : <Send size={18} className="text-brand-accent opacity-0 group-hover:opacity-100 transition-opacity" />}
                                            </div>
                                        ))}
                                    </div>

                                    {mode === 'group' && selectedUserIds.length > 0 && (
                                        <button onClick={() => createChat()} className="glow-button w-full border-none py-4 text-xs tracking-[0.3em] font-black uppercase">Initialize Interface</button>
                                    )}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default NewChatModal;
