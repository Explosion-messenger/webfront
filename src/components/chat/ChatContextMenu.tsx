import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Trash2 } from 'lucide-react';
import { type Chat, type User } from '../../types';

export interface ChatContextMenuProps {
    pos: { x: number; y: number } | null;
    target: Chat | null;
    currentUser: User | null;
    onClose: () => void;
    onLeaveChat: (chat: Chat) => void;
    onDeleteChat: (chat: Chat) => void;
}

const ChatContextMenu: React.FC<ChatContextMenuProps> = ({
    pos,
    target,
    currentUser,
    onClose,
    onLeaveChat,
    onDeleteChat
}) => {
    return (
        <AnimatePresence>
            {pos && target && (
                <>
                    <div
                        className="fixed inset-0 z-[60]"
                        onClick={onClose}
                        onContextMenu={(e) => { e.preventDefault(); onClose(); }}
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        style={{
                            position: 'fixed',
                            left: Math.min(pos.x, window.innerWidth - 200),
                            top: Math.min(pos.y, window.innerHeight - 150),
                            zIndex: 100
                        }}
                        className="w-48 bg-brand-sidebar/95 backdrop-blur-xl border border-brand-border rounded-2xl shadow-2xl overflow-hidden p-1.5"
                    >
                        <div className="px-3 py-2 border-b border-brand-border/50 mb-1">
                            <p className="text-[10px] font-black text-brand-text-dim uppercase tracking-widest truncate">
                                {target.is_group ? target.name : target.members.find(m => m.id !== currentUser?.id)?.username}
                            </p>
                        </div>

                        <button
                            onClick={() => onLeaveChat(target)}
                            className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-brand-text-dim hover:text-white hover:bg-white/5 transition-all text-sm group"
                        >
                            <LogOut size={16} className="group-hover:text-amber-500 transition-colors" />
                            <span>Leave Chat</span>
                        </button>

                        {!target.is_group && (
                            <button
                                onClick={() => onDeleteChat(target)}
                                className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-red-400 hover:text-white hover:bg-red-500/20 transition-all text-sm group"
                            >
                                <Trash2 size={16} className="group-hover:text-red-500 transition-colors" />
                                <span>Delete for both</span>
                            </button>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default ChatContextMenu;
