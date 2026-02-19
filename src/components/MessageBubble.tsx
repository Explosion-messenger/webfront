import React from 'react';
import { format } from 'date-fns';
import { FileIcon, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { type Message, type User } from '../types';
import { useAuth } from '../context/AuthContext';

interface MessageBubbleProps {
    msg: Message;
    currentUser: User | null;
    onDelete: (id: number) => void;
}

const getAvatarUrl = (path?: string) => path ? `/avatars/${path}` : null;

const MessageBubble: React.FC<MessageBubbleProps> = ({ msg, currentUser, onDelete }) => {
    const { token } = useAuth();
    const isMe = msg.sender_id === currentUser?.id;
    const downloadUrl = (path: string) => `/files/download/${path}${token ? `?token=${token}` : ''}`;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            className={`flex ${isMe ? 'flex-row-reverse' : 'flex-row'} items-end space-x-2 ${isMe ? 'space-x-reverse' : ''}`}
        >
            {/* Avatar */}
            <div className="flex-shrink-0 mb-1">
                {msg.sender.avatar_path ? (
                    <img
                        src={getAvatarUrl(msg.sender.avatar_path)!}
                        alt={msg.sender.username}
                        className="w-8 h-8 rounded-xl object-cover border border-brand-border shadow-sm"
                    />
                ) : (
                    <div className="w-8 h-8 bg-slate-800 rounded-xl flex items-center justify-center text-[10px] font-bold text-brand-text border border-brand-border">
                        {msg.sender.username[0].toUpperCase()}
                    </div>
                )}
            </div>

            {/* Bubble */}
            <div className={`group relative max-w-[75%] p-4 rounded-2xl shadow-premium border transition-shadow ${isMe
                ? 'bg-brand-accent border-brand-accent/20 text-white rounded-br-none'
                : 'bg-brand-card border-brand-border text-brand-text rounded-bl-none'
                }`}>
                {!isMe && (
                    <span className="block text-[10px] uppercase tracking-widest font-bold text-brand-accent mb-1">
                        {msg.sender.username}
                    </span>
                )}

                {msg.text && <p className="whitespace-pre-wrap text-sm leading-relaxed font-normal">{msg.text}</p>}

                {msg.file && (
                    <div className="mt-2">
                        {msg.file.mime_type.startsWith('image/') ? (
                            <div className="rounded-lg overflow-hidden border border-white/10 shadow-lg bg-black/20">
                                <img
                                    src={downloadUrl(msg.file.path)}
                                    alt={msg.file.filename}
                                    className="max-w-full cursor-pointer hover:opacity-90 transition-opacity duration-300"
                                    onClick={() => window.open(downloadUrl(msg.file!.path), '_blank')}
                                />
                            </div>
                        ) : (
                            <a
                                href={downloadUrl(msg.file.path)}
                                target="_blank"
                                rel="noreferrer"
                                className={`flex items-center space-x-3 p-3 border rounded-xl transition-all text-xs ${isMe ? 'bg-white/10 border-white/10 hover:bg-white/20' : 'bg-brand-bg/50 border-brand-border hover:bg-brand-bg'
                                    }`}
                            >
                                <FileIcon size={14} strokeWidth={1.5} />
                                <span className="truncate">{msg.file.filename}</span>
                            </a>
                        )}
                    </div>
                )}

                <div className={`flex items-center mt-2 space-x-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <span className={`text-[9px] font-medium uppercase tracking-tighter ${isMe ? 'text-white/60' : 'text-brand-text-dim'}`}>
                        {format(new Date(msg.created_at), 'HH:mm')}
                    </span>
                    {isMe && (
                        <button
                            onClick={() => onDelete(msg.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-white/80 hover:text-white"
                            title="Delete message"
                        >
                            <Trash2 size={12} />
                        </button>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

export default MessageBubble;
