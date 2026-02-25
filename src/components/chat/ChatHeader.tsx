import React from 'react';
import { Search, X, ChevronUp, ChevronDown, CheckSquare, Trash2, User as UserIcon, Moon } from 'lucide-react';
import { type Chat, type User } from '../../types';

export interface ChatHeaderProps {
    activeChat: Chat;
    currentUser: User | null;
    userStatuses: Map<number, string>;
    typingUsers: Record<number, { username: string; timestamp: number }>;
    onGroupSettingsClick: () => void;
    // Search
    isMsgSearchOpen: boolean;
    setIsMsgSearchOpen: (open: boolean) => void;
    msgSearchQuery: string;
    setMsgSearchQuery: (query: string) => void;
    searchMatchIds: number[];
    currentMatchIndex: number;
    onPrevMatch: () => void;
    onNextMatch: () => void;
    onClearSearch: () => void;
    // Selection
    isSelectionMode: boolean;
    toggleSelectionMode: () => void;
    selectedMsgIdsSize: number;
    onBulkDelete: () => void;
}

const getAvatarUrl = (path?: string) => path ? `/avatars/${path}` : null;

const ChatHeader: React.FC<ChatHeaderProps> = ({
    activeChat,
    currentUser,
    userStatuses,
    typingUsers,
    onGroupSettingsClick,
    isMsgSearchOpen,
    setIsMsgSearchOpen,
    msgSearchQuery,
    setMsgSearchQuery,
    searchMatchIds,
    currentMatchIndex,
    onPrevMatch,
    onNextMatch,
    onClearSearch,
    isSelectionMode,
    toggleSelectionMode,
    selectedMsgIdsSize,
    onBulkDelete
}) => {
    const getChatName = (chat: Chat) => {
        if (chat.is_group && chat.name) return chat.name;
        if (chat.is_group) return chat.members.map(m => m.username).join(', ');
        const otherMember = chat.members.find(m => m.id !== currentUser?.id);
        return otherMember?.username || 'Unknown';
    };

    const getUserStatus = (chat: Chat): string | undefined => {
        if (chat.is_group) return undefined;
        const otherMember = chat.members.find(m => m.id !== currentUser?.id);
        return otherMember ? userStatuses.get(otherMember.id) || 'offline' : 'offline';
    };

    const status = getUserStatus(activeChat);
    const typingInChat = Object.values(typingUsers || {});

    return (
        <div
            className={`p-4 glass-header flex items-center justify-between shrink-0 ${activeChat.is_group ? 'cursor-pointer hover:bg-white/5 transition-colors' : ''}`}
            onClick={() => activeChat.is_group && onGroupSettingsClick()}
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
                            {activeChat.members.find(m => m.id !== currentUser?.id)?.avatar_path ? (
                                <img src={getAvatarUrl(activeChat.members.find(m => m.id !== currentUser?.id)!.avatar_path)!} className="w-full h-full object-cover" />
                            ) : (
                                <UserIcon size={20} strokeWidth={1.5} className="text-brand-text-dim" />
                            )}
                        </div>
                    )}
                    {!activeChat.is_group && (
                        (() => {
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
                        {typingInChat.length > 0 ? (
                            <div className="flex items-center space-x-1.5 overflow-hidden">
                                <span className="text-[10px] font-black text-green-400 uppercase tracking-[0.2em]">
                                    {(!activeChat.is_group) ? 'typing' :
                                        (typingInChat.length === 1) ? `${typingInChat[0].username} is typing` :
                                            (typingInChat.length === 2) ? `${typingInChat[0].username}, ${typingInChat[1].username} are typing` :
                                                `${typingInChat[0].username}, ${typingInChat[1].username} and ${typingInChat.length - 2} others are typing`}
                                </span>
                                <div className="flex space-x-1 mb-0.5">
                                    <span className="w-1 h-1 bg-green-400 rounded-full animate-pulse-dot" style={{ animationDelay: '0ms' }} />
                                    <span className="w-1 h-1 bg-green-400 rounded-full animate-pulse-dot" style={{ animationDelay: '200ms' }} />
                                    <span className="w-1 h-1 bg-green-400 rounded-full animate-pulse-dot" style={{ animationDelay: '400ms' }} />
                                </div>
                            </div>
                        ) : (
                            <p className={`text-[10px] font-bold uppercase tracking-[0.15em] truncate ${status === 'away' ? 'text-brand-away' : 'text-brand-text-dim'}`}>
                                {activeChat.is_group ? `${activeChat.members.length} Members` : status === 'online' ? 'Online' : status === 'away' ? 'Away' : 'Offline'}
                            </p>
                        )}
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
                            <button onClick={onPrevMatch} className="p-1 hover:text-white text-brand-text-dim transition-colors">
                                <ChevronUp size={14} />
                            </button>
                            <button onClick={onNextMatch} className="p-1 hover:text-white text-brand-text-dim transition-colors">
                                <ChevronDown size={14} />
                            </button>
                        </div>
                    )}
                    {msgSearchQuery && (
                        <button onClick={onClearSearch} className="text-brand-text-dim hover:text-white ml-2">
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
                {isSelectionMode && selectedMsgIdsSize > 0 && (
                    <button
                        onClick={onBulkDelete}
                        className="p-2 bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all shadow-glow-yellow"
                        title={`Delete ${selectedMsgIdsSize} messages`}
                    >
                        <Trash2 size={20} />
                    </button>
                )}
            </div>
        </div>
    );
};

export default ChatHeader;
