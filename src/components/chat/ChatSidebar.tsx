import React from 'react';
import { Camera, LogOut, Moon, Send, X } from 'lucide-react';
import { type Chat, type User } from '../../types';
import ChatListItem from '../ChatListItem';

export interface ChatSidebarProps {
    currentUser: User | null;
    userStatuses: Map<number, string>;
    typingUsers: Record<number, Record<number, { username: string; timestamp: number }>>;
    chats: Chat[];
    activeChatId: number | null;
    chatsLoading: boolean;
    chatsError: string | null;
    onLogout: () => void;
    onShowNewChat: () => void;
    onFetchChats: () => void;
    onChatSelect: (chatId: number) => void;
    onChatContextMenu: (e: React.MouseEvent, chat: Chat) => void;
    // Avatar controls
    avatarFileInputRef: React.RefObject<HTMLInputElement | null>;
    onSelectAvatarFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onDeleteAvatar: () => void;
}

const getAvatarUrl = (path?: string) => path ? `/avatars/${path}` : null;

const ChatSidebar: React.FC<ChatSidebarProps> = ({
    currentUser,
    userStatuses,
    typingUsers,
    chats,
    activeChatId,
    chatsLoading,
    chatsError,
    onLogout,
    onShowNewChat,
    onFetchChats,
    onChatSelect,
    onChatContextMenu,
    avatarFileInputRef,
    onSelectAvatarFile,
    onDeleteAvatar
}) => {
    const getUserStatus = (chat: Chat): string | undefined => {
        if (chat.is_group) return undefined;
        const otherMember = chat.members.find(m => m.id !== currentUser?.id);
        return otherMember ? userStatuses.get(otherMember.id) || 'offline' : 'offline';
    };

    return (
        <div className="w-80 glass-panel flex flex-col z-10 shrink-0 overflow-hidden">
            <div className="p-6 border-b border-brand-border/30 flex items-center justify-between shrink-0">
                <div className="flex items-center space-x-3">
                    <div className="relative group">
                        {currentUser?.avatar_path ? (
                            <img src={getAvatarUrl(currentUser.avatar_path)!} alt={currentUser.username} className="w-10 h-10 rounded-2xl object-cover border border-white/50 shadow-sm" />
                        ) : (
                            <div className="w-10 h-10 bg-gradient-to-br from-gray-700 to-gray-900 rounded-2xl flex items-center justify-center font-bold text-white shadow-glow">
                                {currentUser?.username?.[0].toUpperCase()}
                            </div>
                        )}
                        {userStatuses.get(currentUser?.id || 0) === 'away' ? (
                            <div className="absolute -bottom-1 -right-1 bg-brand-sidebar rounded-full p-0.5">
                                <Moon size={12} fill="currentColor" className="text-brand-away shadow-glow-yellow" />
                            </div>
                        ) : (
                            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 border-2 border-brand-sidebar rounded-full shadow-glow-green" />
                        )}
                        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all rounded-2xl scale-90 group-hover:scale-100 space-x-2">
                            <label className="cursor-pointer p-1.5 hover:bg-black/10 rounded-lg transition-colors">
                                <Camera size={14} className="text-brand-text" />
                                <input type="file" ref={avatarFileInputRef} className="hidden" accept="image/*" onChange={onSelectAvatarFile} />
                            </label>
                            {currentUser?.avatar_path && (
                                <button onClick={onDeleteAvatar} className="p-1.5 hover:bg-red-500 rounded-lg transition-colors">
                                    <X size={14} className="text-white" />
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="flex flex-col">
                        <span className="font-semibold text-sm tracking-tight">{currentUser?.username}</span>
                        {userStatuses.get(currentUser?.id || 0) === 'away' ? (
                            <span className="text-[10px] text-brand-away font-bold uppercase tracking-widest animate-pulse">Away</span>
                        ) : (
                            <span className="text-[10px] text-green-500 font-bold uppercase tracking-widest">Active</span>
                        )}
                    </div>
                </div>
                <div className="flex items-center space-x-1">
                    <button onClick={onLogout} className="p-2 hover:bg-brand-bg rounded-xl transition-colors text-brand-text-dim hover:text-white" title="Logout">
                        <LogOut size={18} strokeWidth={1.5} />
                    </button>
                </div>
            </div>

            <div className="p-4 shrink-0 space-y-3">
                <button onClick={onShowNewChat} className="glow-button w-full border border-white/40 py-3 text-[10px] tracking-[0.2em] font-black uppercase">
                    New Instance
                </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1 py-2 custom-scroll">
                {chatsLoading ? (
                    <div className="flex flex-col space-y-2 p-4 animate-pulse">
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="h-16 bg-black/5 rounded-2xl" />
                        ))}
                    </div>
                ) : chatsError ? (
                    <div className="p-6 text-center">
                        <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest mb-3">{chatsError}</p>
                        <button onClick={onFetchChats} className="text-[10px] text-brand-accent hover:underline font-black uppercase tracking-widest">Retry Pull</button>
                    </div>
                ) : chats.length > 0 ? (
                    chats.map(chat => (
                        <ChatListItem
                            key={chat.id}
                            chat={chat}
                            currentUser={currentUser}
                            isActive={activeChatId === chat.id}
                            userStatus={getUserStatus(chat)}
                            typingUsers={Object.values(typingUsers[chat.id] || {})}
                            onClick={() => onChatSelect(chat.id)}
                            onContextMenu={(e) => onChatContextMenu(e, chat)}
                        />
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-brand-text-dim opacity-50 select-none">
                        <Send size={40} strokeWidth={1} className="mb-4" />
                        <p className="text-[10px] font-black uppercase tracking-[0.2em]">No Active Instances</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatSidebar;
