import React from 'react';
import { format } from 'date-fns';
import { FileIcon, Trash2 } from 'lucide-react';
import { type Message, type User } from '../types';

interface MessageBubbleProps {
    msg: Message;
    currentUser: User | null;
    onDelete: (id: number) => void;
}

const getAvatarUrl = (path?: string) => path ? `/avatars/${path}` : null;

const MessageBubble: React.FC<MessageBubbleProps> = ({ msg, currentUser, onDelete }) => {
    const isMe = msg.sender_id === currentUser?.id;

    return (
        <div className={`flex ${isMe ? 'flex-row-reverse' : 'flex-row'} items-end space-x-2 ${isMe ? 'space-x-reverse' : ''}`}>
            {/* Avatar */}
            <div className="flex-shrink-0 mb-1">
                {msg.sender.avatar_path ? (
                    <img
                        src={getAvatarUrl(msg.sender.avatar_path)!}
                        alt={msg.sender.username}
                        className="w-8 h-8 rounded-full object-cover border border-nord3 shadow-sm"
                    />
                ) : (
                    <div className="w-8 h-8 bg-nord3 rounded-full flex items-center justify-center text-[10px] font-bold text-nord6 border border-nord4/10">
                        {msg.sender.username[0].toUpperCase()}
                    </div>
                )}
            </div>

            {/* Bubble */}
            <div className={`group relative max-w-[75%] p-4 rounded-2xl shadow-lg border transition-all ${isMe
                ? 'bg-nord10 border-nord9 text-nord6 message-bubble-right rounded-br-none'
                : 'bg-nord2 border-nord3 text-nord6 message-bubble-left rounded-bl-none'
                }`}>
                {!isMe && (
                    <span className="block text-[10px] uppercase tracking-widest font-black text-nord8 mb-1 opacity-70">
                        {msg.sender.username}
                    </span>
                )}

                {msg.text && <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.text}</p>}

                {msg.file && (
                    <div className="mt-2">
                        {msg.file.mime_type.startsWith('image/') ? (
                            <img
                                src={`/files/download/${msg.file.path}`}
                                alt={msg.file.filename}
                                className="max-w-full rounded-lg cursor-pointer border border-white/10 hover:border-nord8 transition-all"
                                onClick={() => window.open(`/files/download/${msg.file?.path}`, '_blank')}
                            />
                        ) : (
                            <a
                                href={`/files/download/${msg.file.path}`}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center space-x-3 p-3 bg-nord0/30 border border-white/5 rounded-xl hover:bg-nord0/50 transition-all text-xs"
                            >
                                <FileIcon size={14} strokeWidth={1.5} />
                                <span className="truncate">{msg.file.filename}</span>
                            </a>
                        )}
                    </div>
                )}

                <div className={`flex items-center mt-2 space-x-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <span className="text-[9px] font-mono opacity-50">
                        {format(new Date(msg.created_at), 'HH:mm')}
                    </span>
                    {isMe && (
                        <button
                            onClick={() => onDelete(msg.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:text-nord11"
                            title="Delete message"
                        >
                            <Trash2 size={12} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MessageBubble;
