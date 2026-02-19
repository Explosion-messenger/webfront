import React from 'react';
import { format } from 'date-fns';
import { User as UserIcon } from 'lucide-react';
import type { Chat, User } from '../hooks/useChat';

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
        <div
            onClick={onClick}
            className={`p-4 flex items-center space-x-3 cursor-pointer transition-all duration-200 border-l-2 ${isActive ? 'bg-nord2 border-nord8' : 'hover:bg-nord2/50 border-transparent'
                }`}
        >
            <div className="relative flex-shrink-0">
                {chat.is_group ? (
                    <div className="w-10 h-10 bg-nord10 rounded-full flex items-center justify-center">
                        <UserIcon size={20} strokeWidth={1.5} className="text-nord6" />
                    </div>
                ) : (
                    <>
                        {otherMember?.avatar_path ? (
                            <img
                                src={getAvatarUrl(otherMember.avatar_path)!}
                                alt={otherMember.username}
                                className="w-10 h-10 rounded-full object-cover"
                            />
                        ) : (
                            <div className="w-10 h-10 bg-nord3 rounded-full flex items-center justify-center">
                                <UserIcon size={20} strokeWidth={1.5} className="text-nord4" />
                            </div>
                        )}
                        {isOnline && (
                            <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-nord14 border-2 border-nord1 rounded-full" />
                        )}
                    </>
                )}
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline">
                    <h3 className="font-normal text-nord6 truncate">{getChatName()}</h3>
                    {chat.last_message && (
                        <span className="text-[10px] text-nord4 font-mono flex-shrink-0 ml-2">
                            {format(new Date(chat.last_message.created_at), 'HH:mm')}
                        </span>
                    )}
                </div>
                <p className="text-xs text-nord4 truncate font-light">
                    {chat.last_message?.text
                        || (chat.last_message?.file ? `📁 ${chat.last_message.file.filename}` : 'No history')}
                </p>
            </div>
        </div>
    );
};

export default ChatListItem;
