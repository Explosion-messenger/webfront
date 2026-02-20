import React, { useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { FileIcon, Trash2, Check, CheckCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { type Message, type User } from '../types';
import { useAuth } from '../context/AuthContext';

interface MessageBubbleProps {
    msg: Message;
    currentUser: User | null;
    isGroup: boolean;
    onDelete: (id: number) => void;
    onRead?: (id: number) => void;
    onReadReceiptsClick?: (msg: Message, pos: { x: number, y: number }) => void;
    isSelectionMode?: boolean;
    isSelected?: boolean;
    onSelect?: (id: number) => void;
    isHighlighted?: boolean;
}

const getAvatarUrl = (path?: string) => path ? `/avatars/${path}` : null;

const MessageBubble: React.FC<MessageBubbleProps> = ({ msg, currentUser, isGroup, onDelete, onRead, onReadReceiptsClick, isSelectionMode, isSelected, onSelect, isHighlighted }) => {
    const { token } = useAuth();
    const isMe = msg.sender_id === currentUser?.id;
    const downloadUrl = (path: string) => `/files/download/${path}${token ? `?token=${token}` : ''}`;
    const bubbleRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isMe || !onRead || !currentUser || !bubbleRef.current) return;

        const alreadyRead = msg.read_by?.some(r => r.user_id === currentUser.id);
        if (alreadyRead) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    onRead(msg.id);
                    observer.disconnect();
                }
            },
            { threshold: 0.5 }
        );

        observer.observe(bubbleRef.current);
        return () => observer.disconnect();
    }, [msg.id, isMe, onRead, currentUser, msg.read_by]);

    const renderTicks = () => {
        if (!isMe) return null;

        const readCount = msg.read_by?.length || 0;
        const isReadByOthers = readCount > 0;

        if (!isReadByOthers) {
            return <Check size={13} strokeWidth={3} className="text-white/60" />;
        }

        if (isGroup) {
            if (readCount === 1) {
                return <CheckCheck size={13} strokeWidth={3} className="text-[#bf97ff] drop-shadow-[0_0_3px_rgba(191,151,255,0.8)]" />;
            }
            return <CheckCheck size={13} strokeWidth={3} className="text-[#22c55e] drop-shadow-[0_0_3px_rgba(34,197,94,0.8)]" />;
        }

        return <CheckCheck size={13} strokeWidth={3} className="text-[#22c55e]" />;
    };

    return (
        <motion.div
            id={`msg-${msg.id}`}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{
                opacity: 1,
                scale: isHighlighted ? [1, 1.05, 1] : 1,
                backgroundColor: isHighlighted ? 'rgba(var(--color-brand-accent-rgb), 0.3)' : 'transparent'
            }}
            transition={{
                duration: isHighlighted ? 0.5 : 0.2,
                repeat: isHighlighted ? 1 : 0
            }}
            className={`flex ${isMe ? 'flex-row-reverse' : 'flex-row'} items-end space-x-2 ${isMe ? 'space-x-reverse' : ''} ${isSelectionMode ? 'cursor-pointer' : ''} p-2 rounded-3xl transition-colors`}
            onClick={() => isSelectionMode && isMe && onSelect?.(msg.id)}
        >
            {isSelectionMode && isMe && (
                <div className="flex-shrink-0 self-center px-2">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-brand-accent border-brand-accent shadow-glow' : 'border-brand-border bg-brand-card/20'}`}>
                        {isSelected && <Check size={12} strokeWidth={4} className="text-white" />}
                    </div>
                </div>
            )}
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
            <div
                ref={bubbleRef}
                onContextMenu={(e) => {
                    if (isGroup) {
                        e.preventDefault();
                        onReadReceiptsClick?.(msg, { x: e.clientX, y: e.clientY });
                    }
                }}
                className={`group relative max-w-[75%] p-4 rounded-2xl shadow-premium border transition-shadow ${isMe
                    ? `bg-brand-accent border-brand-accent/20 text-white rounded-br-none ${isSelected ? 'ring-2 ring-white/50 ring-offset-2 ring-offset-brand-bg shadow-glow' : ''}`
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
                        <div className="flex items-center space-x-2">
                            <div
                                className={isGroup && (msg.read_by?.length || 0) > 0 ? 'transition-transform' : ''}
                            >
                                {renderTicks()}
                            </div>
                            <button
                                onClick={() => onDelete(msg.id)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-white/80 hover:text-white"
                                title="Delete message"
                            >
                                <Trash2 size={12} />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

export default MessageBubble;
