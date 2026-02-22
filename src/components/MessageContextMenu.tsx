import React, { useEffect, useRef } from 'react';
import { User as UserIcon, CheckCheck, Reply } from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { type Message, type Chat } from '../types';

interface MessageContextMenuProps {
    message: Message;
    chat: Chat;
    position: { x: number, y: number };
    onClose: () => void;
    onReactionToggle: (emoji: string) => void;
    onReply: (message: Message) => void;
    currentUserId?: number;
}

const getAvatarUrl = (path?: string) => path ? `/avatars/${path}` : null;

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '🍌', '🐳'];

const MessageContextMenu: React.FC<MessageContextMenuProps> = ({ message, chat, position, onClose, onReactionToggle, onReply, currentUserId }) => {
    const popupRef = useRef<HTMLDivElement>(null);

    const readers = message.read_by.map(rb => {
        const user = chat.members.find(m => m.id === rb.user_id);
        const userReactions = (message.reactions || []).filter(re => re.user_id === rb.user_id);
        return { user, read_at: rb.read_at, reactions: userReactions };
    }).filter(r => r.user !== undefined);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        const handleScroll = () => onClose();

        document.addEventListener('mousedown', handleClickOutside);
        window.addEventListener('scroll', handleScroll, true);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('scroll', handleScroll, true);
        };
    }, [onClose]);

    // Adjust position to keep popup within viewport
    const adjustedX = Math.min(position.x, window.innerWidth - 260);
    const adjustedY = Math.min(position.y, window.innerHeight - 400);

    return (
        <motion.div
            ref={popupRef}
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            style={{
                left: adjustedX,
                top: adjustedY,
                position: 'fixed'
            }}
            className="w-64 bg-brand-card/95 backdrop-blur-2xl border border-brand-border rounded-2xl shadow-3xl z-[70] overflow-hidden flex flex-col"
        >
            {/* Reactions Picker */}
            <div className="p-3 border-b border-brand-border bg-brand-sidebar/30">
                <div className="flex flex-wrap gap-2 justify-between">
                    {EMOJIS.map(emoji => {
                        const isSelected = message.reactions?.some(r => r.emoji === emoji && r.user_id === currentUserId);
                        return (
                            <motion.button
                                key={emoji}
                                whileHover={{ scale: 1.2, y: -2 }}
                                whileTap={{ scale: 1 }}
                                onClick={() => {
                                    onReactionToggle(emoji);
                                    onClose();
                                }}
                                className={`text-xl p-1.5 rounded-xl transition-colors ${isSelected ? 'bg-brand-accent/30 ring-1 ring-brand-accent' : 'hover:bg-white/10'}`}
                            >
                                {emoji}
                            </motion.button>
                        );
                    })}
                </div>
            </div>
            {/* Actions */}
            <div className="p-1 border-b border-brand-border flex items-center bg-brand-sidebar/40">
                <button
                    onClick={() => {
                        onReply(message);
                        onClose();
                    }}
                    className="flex-1 flex items-center justify-center space-x-2 py-2.5 hover:bg-brand-accent/20 transition-all group"
                >
                    <Reply size={16} className="text-brand-accent group-hover:scale-110 transition-transform" />
                    <span className="text-[11px] font-black uppercase tracking-wider text-white">Reply</span>
                </button>
            </div>

            {/* Read Status Header */}
            <div className="p-3 border-b border-brand-border flex items-center space-x-2 bg-brand-sidebar/50">
                <CheckCheck size={14} className="text-brand-accent" />
                <h3 className="text-[10px] uppercase tracking-[0.2em] font-black text-white/70">
                    {chat.is_group ? 'Read Audit' : 'Message Info'}
                </h3>
            </div>

            <div className="max-h-60 overflow-y-auto custom-scroll p-2 space-y-1">
                {chat.is_group ? (
                    readers.length > 0 ? (
                        readers.map((r, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2 hover:bg-white/5 rounded-xl transition-colors group">
                                <div className="flex items-center space-x-3 overflow-hidden">
                                    {r.user?.avatar_path ? (
                                        <img src={getAvatarUrl(r.user.avatar_path)!} className="w-6 h-6 rounded-lg object-cover border border-white/5 shrink-0" />
                                    ) : (
                                        <div className="w-6 h-6 bg-slate-800 rounded-lg flex items-center justify-center shrink-0">
                                            <UserIcon size={10} className="text-brand-text-dim" />
                                        </div>
                                    )}
                                    <div className="flex items-center space-x-2 overflow-hidden">
                                        <span className="text-[11px] font-bold text-white/90 truncate">{r.user?.username}</span>
                                        {r.reactions.length > 0 && (
                                            <div className="flex -space-x-1">
                                                {r.reactions.map((re, ridx) => (
                                                    <span key={ridx} className="text-[10px] filter drop-shadow-sm" title={re.emoji}>
                                                        {re.emoji}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <span className="text-[9px] font-medium text-brand-text-dim/40 uppercase group-hover:text-brand-text-dim/80 transition-colors shrink-0">
                                    {format(new Date(r.read_at), 'HH:mm')}
                                </span>
                            </div>
                        ))
                    ) : (
                        <div className="py-6 text-center">
                            <p className="text-[9px] font-bold uppercase tracking-widest text-brand-text-dim/30">No Logs Found</p>
                        </div>
                    )
                ) : (
                    <div className="p-2 space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] uppercase font-bold text-brand-text-dim">Sent</span>
                            <span className="text-[10px] font-medium text-white/70">{format(new Date(message.created_at), 'HH:mm, MMM d')}</span>
                        </div>
                        {readers.length > 0 && (
                            <div className="flex justify-between items-center">
                                <div className="flex items-center space-x-2">
                                    <span className="text-[10px] uppercase font-bold text-brand-accent">Read</span>
                                    {readers[0].reactions.length > 0 && (
                                        <span className="text-xs filter drop-shadow-sm">{readers[0].reactions[0].emoji}</span>
                                    )}
                                </div>
                                <span className="text-[10px] font-medium text-brand-accent">{format(new Date(readers[0].read_at), 'HH:mm, MMM d')}</span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default MessageContextMenu;
