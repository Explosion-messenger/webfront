import React from 'react';
import { User as UserIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { type Chat, type User } from '../types';

interface ChatListItemProps {
    chat: Chat;
    currentUser: User | null;
    isActive: boolean;
    isOnline: boolean;
    onClick: () => void;
}

const getAvatarUrl = (path?: string) => path ? `/avatars/${path}` : null;

const ChatListItem: React.FC<ChatListItemProps> = ({ chat, currentUser, isActive, isOnline, onClick }) => {
    const getChatName = () => {
        if (chat.is_group && chat.name) return chat.name;
        if (chat.is_group) return chat.members.map(m => m.username).join(', ');
        return chat.members.find(m => m.id !== currentUser?.id)?.username || 'Unknown';
    };

    const otherMember = chat.members.find(m => m.id !== currentUser?.id);

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            whileHover={{ x: 4, backgroundColor: 'rgba(30, 41, 59, 0.4)' }}
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            className={`p-4 flex items-center space-x-4 cursor-pointer transition-all duration-200 border-l-2 relative overflow-hidden ${isActive ? 'bg-brand-accent/10 border-brand-accent' : 'border-transparent'
                }`}
        >
            <div className="relative flex-shrink-0 z-10">
                {chat.is_group ? (
                    <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center border border-slate-700 shadow-lg">
                        <UserIcon size={24} strokeWidth={1.5} className="text-brand-text-dim" />
                    </div>
                ) : (
                    <>
                        {otherMember?.avatar_path ? (
                            <img
                                src={getAvatarUrl(otherMember.avatar_path)!}
                                alt={otherMember.username}
                                className="w-12 h-12 rounded-2xl object-cover border border-slate-700 shadow-glow shadow-brand-accent/5"
                            />
                        ) : (
                            <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center border border-slate-700">
                                <UserIcon size={24} strokeWidth={1.5} className="text-brand-text-dim" />
                            </div>
                        )}
                        {isOnline && (
                            <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-500 border-2 border-brand-sidebar rounded-full shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                        )}
                    </>
                )}
            </div>

            <div className="flex-1 min-w-0 z-10">
                <div className="flex justify-between items-baseline mb-0.5">
                    <h3 className="text-sm font-semibold truncate text-brand-text tracking-tight">
                        {getChatName()}
                    </h3>
                    {chat.last_message && (
                        <span className="text-[10px] text-brand-text-dim font-medium uppercase tracking-wider">
                            {new Date(chat.last_message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    )}
                </div>
                {chat.last_message && (
                    <p className="text-xs text-brand-text-dim truncate font-normal leading-tight">
                        {chat.last_message.sender_id === currentUser?.id ? 'You: ' : ''}
                        {chat.last_message.text || 'Shared a file'}
                    </p>
                )}
            </div>

            {isActive && (
                <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-brand-accent/5 to-transparent pointer-events-none" />
            )}
        </motion.div>
    );
};

export default ChatListItem;
