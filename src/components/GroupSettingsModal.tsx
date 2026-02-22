import React, { useState } from 'react';
import { X, Search, User as UserIcon, Plus, Trash2, Camera, LogOut, Check, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import api from '../api';
import { type Chat, type User } from '../types';
import { useAvatarEditor } from '../hooks/useChat';

interface GroupSettingsModalProps {
    chat: Chat;
    onClose: () => void;
    onUpdate: (updatedChat: Chat) => void;
    onDelete: (chatId: number) => void;
    currentUser: User | null;
    userStatuses: Map<number, string>;
}

const GroupSettingsModal: React.FC<GroupSettingsModalProps> = ({ chat, onClose, onUpdate, onDelete, currentUser, userStatuses }) => {
    const [name, setName] = useState(chat.name || '');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<User[]>([]);
    const [isUpdating, setIsUpdating] = useState(false);
    const membership = chat.members.find(m => m.id === currentUser?.id);
    const isOwner = membership?.is_chat_owner;
    const isAdmin = membership?.is_chat_admin || isOwner;

    const avatarEditor = useAvatarEditor(
        async (formData) => {
            const resp = await api.post(`/chats/${chat.id}/avatar`, formData);
            onUpdate(resp.data);
        }
    );

    React.useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !avatarEditor.showAvatarEditor) onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose, avatarEditor.showAvatarEditor]);

    const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
        const { width, height } = e.currentTarget;
        const initialCrop = centerCrop(
            makeAspectCrop({ unit: '%', width: 90 }, 1, width, height),
            width, height
        );
        avatarEditor.setCrop(initialCrop);
    };

    const handleUpdateName = async () => {
        if (!name.trim() || name === chat.name) return;
        setIsUpdating(true);
        try {
            const resp = await api.patch(`/chats/${chat.id}`, { name });
            onUpdate(resp.data);
        } catch (err) {
            console.error(err);
        } finally {
            setIsUpdating(false);
        }
    };

    const handleSearch = async (q: string) => {
        setSearchQuery(q);
        if (q.length < 2) {
            setSearchResults([]);
            return;
        }
        try {
            const resp = await api.get(`/users?q=${q}`);
            // Filter out existing members
            const existingIds = chat.members.map(m => m.id);
            setSearchResults(resp.data.filter((u: User) => !existingIds.includes(u.id)));
        } catch (err) {
            console.error(err);
        }
    };

    const handleAddMember = async (userId: number) => {
        try {
            const resp = await api.post(`/chats/${chat.id}/members`, { user_id: userId });
            onUpdate(resp.data);
            setSearchQuery('');
            setSearchResults([]);
        } catch (err) {
            console.error(err);
        }
    };

    const handleRemoveMember = async (userId: number) => {
        try {
            const resp = await api.delete(`/chats/${chat.id}/members/${userId}`);
            if (resp.data.status === 'ok') {
                if (userId === currentUser?.id) {
                    onDelete(chat.id);
                    onClose();
                } else {
                    // This case shouldn't happen with the current backend response for member removal
                    // unless the chat was deleted. But if it returns the updated chat:
                    onUpdate({
                        ...chat,
                        members: chat.members.filter(m => m.id !== userId)
                    });
                }
            } else {
                onUpdate(resp.data);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleToggleAdmin = async (userId: number, currentAdminStatus: boolean) => {
        try {
            const resp = await api.patch(`/chats/${chat.id}/members/${userId}/admin`, {
                user_id: userId,
                is_admin: !currentAdminStatus
            });
            onUpdate(resp.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleDeleteChat = async () => {
        if (!window.confirm('Are you sure you want to delete this group? This action cannot be undone.')) return;
        try {
            await api.delete(`/chats/${chat.id}`);
            onDelete(chat.id);
            onClose();
        } catch (err) {
            console.error(err);
        }
    };

    const getAvatarUrl = (path?: string) => path ? `/avatars/${path}` : null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-brand-bg/95 backdrop-blur-2xl z-50 flex items-center justify-center p-6"
        >
            <motion.div
                initial={{ scale: 0.95, y: 10 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 10 }}
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
                className="bg-brand-card w-full max-w-2xl rounded-[2.5rem] border border-brand-border shadow-3xl overflow-hidden flex flex-col max-h-[90vh]"
            >
                <div className="p-8 border-b border-brand-border flex justify-between items-center bg-brand-sidebar/50 shrink-0">
                    <h3 className="text-sm uppercase tracking-[0.25em] font-black text-white">Group Intelligence</h3>
                    <button onClick={onClose} className="text-brand-text-dim hover:text-white transition-colors">
                        <X size={24} strokeWidth={2} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scroll p-10 bg-brand-bg/20 space-y-10">
                    {/* Header Info */}
                    <div className="flex flex-col items-center space-y-6">
                        <div className="relative group">
                            <div className="w-32 h-32 bg-slate-800 rounded-[2.5rem] flex items-center justify-center overflow-hidden border-2 border-brand-border shadow-2xl relative">
                                {chat.avatar_path ? (
                                    <img src={getAvatarUrl(chat.avatar_path)!} className="w-full h-full object-cover" alt="Group Avatar" />
                                ) : (
                                    <UserIcon size={48} className="text-brand-text-dim" />
                                )}
                                {isAdmin && (
                                    <div className="absolute inset-0 bg-brand-bg/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                                        <label className="cursor-pointer p-3 bg-brand-accent rounded-2xl hover:scale-110 transition-transform shadow-glow">
                                            <Camera size={24} className="text-white" />
                                            <input type="file" ref={avatarEditor.fileInputRef} className="hidden" accept="image/*" onChange={avatarEditor.onSelectFile} />
                                        </label>
                                    </div>
                                )}
                            </div>
                            <div className="absolute -bottom-2 -right-2 bg-brand-accent p-2 rounded-xl shadow-glow">
                                <Check size={16} className="text-white" />
                            </div>
                        </div>

                        <div className="w-full max-w-md space-y-4">
                            <div className="relative">
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="GROUP NAME"
                                    disabled={!isAdmin}
                                    className={`w-full bg-slate-900/50 border border-brand-border rounded-2xl px-6 py-4 focus:outline-none focus:border-brand-accent text-sm tracking-widest uppercase font-bold text-white text-center ${!isAdmin && 'opacity-70 cursor-not-allowed'}`}
                                />
                                {name !== chat.name && (
                                    <button
                                        onClick={handleUpdateName}
                                        disabled={isUpdating}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-brand-accent hover:scale-110 transition-transform"
                                    >
                                        <Check size={20} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        {/* Members List */}
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h4 className="text-[10px] uppercase tracking-[0.3em] font-black text-brand-text-dim">Authorized Personnel</h4>
                                <span className="text-[10px] bg-brand-accent/20 text-brand-accent px-2 py-1 rounded-md font-black">{chat.members.length}</span>
                            </div>
                            <div className="space-y-3">
                                {chat.members.map(member => (
                                    <div key={member.id} className="p-4 premium-card flex items-center justify-between group">
                                        <div className="flex items-center space-x-4">
                                            <div className="relative">
                                                {member.avatar_path ? (
                                                    <img src={getAvatarUrl(member.avatar_path)!} className="w-8 h-8 rounded-lg object-cover border border-brand-border" />
                                                ) : (
                                                    <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center">
                                                        <UserIcon size={14} className="text-brand-text-dim" />
                                                    </div>
                                                )}
                                                {userStatuses.get(member.id) === 'online' && (
                                                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 border-2 border-brand-card rounded-full shadow-glow-green" />
                                                )}
                                                {userStatuses.get(member.id) === 'away' && (
                                                    <div className="absolute -bottom-1 -right-1 bg-brand-card rounded-full p-0.5">
                                                        <Moon size={10} fill="currentColor" className="text-brand-away shadow-glow-yellow" />
                                                    </div>
                                                )}
                                            </div>
                                            <span className="text-sm font-bold text-white uppercase tracking-wider">{member.username}</span>
                                            {member.is_chat_owner ? (
                                                <span className="text-[8px] bg-brand-accent/20 text-brand-accent px-1.5 py-0.5 rounded uppercase font-black tracking-tighter shadow-glow-green border border-brand-accent/30">Owner</span>
                                            ) : member.is_chat_admin ? (
                                                <span className="text-[8px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded uppercase font-black border border-slate-600">Admin</span>
                                            ) : null}
                                            {member.id === currentUser?.id && (
                                                <span className="text-[8px] bg-slate-800/80 text-brand-text-dim px-1.5 py-0.5 rounded uppercase font-black border border-brand-border/30">You</span>
                                            )}
                                        </div>
                                        <div className="flex items-center space-x-1">
                                            {isOwner && member.id !== currentUser?.id && (
                                                <button
                                                    onClick={() => handleToggleAdmin(member.id, member.is_chat_admin || false)}
                                                    className={`p-2 rounded-lg transition-all ${member.is_chat_admin ? 'text-red-400 hover:bg-red-400/10' : 'text-brand-accent hover:bg-brand-accent/10'}`}
                                                    title={member.is_chat_admin ? "Dismiss as Admin" : "Promote to Admin"}
                                                >
                                                    {member.is_chat_admin ? <X size={14} /> : <Plus size={14} />}
                                                </button>
                                            )}
                                            {chat.members.length > 1 && (isAdmin || member.id === currentUser?.id) && (
                                                <button
                                                    onClick={() => handleRemoveMember(member.id)}
                                                    className="p-2 text-brand-text-dim hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                                >
                                                    {member.id === currentUser?.id ? <LogOut size={16} /> : <Trash2 size={16} />}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Add Members */}
                        <div className="space-y-6">
                            <h4 className="text-[10px] uppercase tracking-[0.3em] font-black text-brand-text-dim">Extend Access</h4>
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-accent" size={18} />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => handleSearch(e.target.value)}
                                    placeholder="SCAN DATABASE..."
                                    className="w-full bg-slate-900 border border-brand-border rounded-2xl pl-12 pr-6 py-4 focus:outline-none focus:border-brand-accent text-xs tracking-[.4em] uppercase font-black placeholder:text-brand-text-dim/30"
                                />
                            </div>

                            <AnimatePresence>
                                {searchResults.length > 0 && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="space-y-3 mt-4"
                                    >
                                        {searchResults.map(u => (
                                            <div
                                                key={u.id}
                                                className="p-4 premium-card flex items-center justify-between hover:border-brand-accent cursor-pointer group"
                                                onClick={() => handleAddMember(u.id)}
                                            >
                                                <div className="flex items-center space-x-4">
                                                    {u.avatar_path ? (
                                                        <img src={getAvatarUrl(u.avatar_path)!} className="w-8 h-8 rounded-lg object-cover border border-brand-border" />
                                                    ) : (
                                                        <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center">
                                                            <UserIcon size={14} className="text-brand-text-dim" />
                                                        </div>
                                                    )}
                                                    <span className="text-sm font-bold text-white uppercase tracking-wider">{u.username}</span>
                                                </div>
                                                <Plus size={18} className="text-brand-accent" />
                                            </div>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>

                <div className="p-8 bg-brand-sidebar/50 border-t border-brand-border flex items-center justify-between shrink-0">
                    {isOwner ? (
                        <button
                            onClick={handleDeleteChat}
                            className="px-6 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-red-500 hover:bg-red-500/10 rounded-xl transition-all flex items-center space-x-2"
                        >
                            <Trash2 size={16} />
                            <span>Purge Group</span>
                        </button>
                    ) : (
                        <div />
                    )}
                    <button
                        onClick={() => handleRemoveMember(currentUser?.id || 0)}
                        className="px-6 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-brand-text-dim hover:text-white rounded-xl transition-all flex items-center space-x-2"
                    >
                        <LogOut size={16} />
                        <span>Sever Link</span>
                    </button>
                </div>
            </motion.div>

            {/* Avatar Editor Modal for Group */}
            <AnimatePresence>
                {avatarEditor.showAvatarEditor && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                        className="absolute inset-0 bg-brand-bg/95 backdrop-blur-2xl z-[60] flex items-center justify-center p-6"
                    >
                        <motion.div
                            initial={{ scale: 0.95 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.95 }}
                            className="bg-brand-card w-full max-w-xl rounded-[2.5rem] border border-brand-border shadow-3xl overflow-hidden flex flex-col max-h-[90vh]"
                        >
                            <div className="p-8 border-b border-brand-border flex justify-between items-center bg-brand-sidebar/50 shrink-0">
                                <h3 className="text-xs uppercase tracking-[0.3em] font-black text-white">Group Visual Identity</h3>
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
                                    <span>Update Group Sync</span>
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default GroupSettingsModal;
