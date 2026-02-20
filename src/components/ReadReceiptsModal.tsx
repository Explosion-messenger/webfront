import React from 'react';
import { X, User as UserIcon, CheckCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { type Message, type Chat } from '../types';

interface ReadReceiptsModalProps {
    message: Message;
    chat: Chat;
    onClose: () => void;
}

const getAvatarUrl = (path?: string) => path ? `/avatars/${path}` : null;

const ReadReceiptsModal: React.FC<ReadReceiptsModalProps> = ({ message, chat, onClose }) => {
    // Find member details for those who read
    const readers = message.read_by.map(rb => {
        const user = chat.members.find(m => m.id === rb.user_id);
        return { user, read_at: rb.read_at };
    }).filter(r => r.user !== undefined);

    React.useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-brand-bg/90 backdrop-blur-xl z-[60] flex items-center justify-center p-6"
        >
            <motion.div
                initial={{ scale: 0.95, y: 10 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 10 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-brand-card w-full max-w-sm rounded-[2rem] border border-brand-border shadow-3xl overflow-hidden flex flex-col max-h-[70vh]"
            >
                <div className="p-6 border-b border-brand-border flex justify-between items-center bg-brand-sidebar/50 shrink-0">
                    <div className="flex items-center space-x-3 text-brand-accent">
                        <CheckCheck size={18} />
                        <h3 className="text-xs uppercase tracking-[0.2em] font-black text-white">Seen By</h3>
                    </div>
                    <button onClick={onClose} className="text-brand-text-dim hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scroll p-6 space-y-4">
                    {readers.length > 0 ? (
                        readers.map((r, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 premium-card">
                                <div className="flex items-center space-x-3">
                                    {r.user?.avatar_path ? (
                                        <img src={getAvatarUrl(r.user.avatar_path)!} className="w-8 h-8 rounded-lg object-cover border border-brand-border" />
                                    ) : (
                                        <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center">
                                            <UserIcon size={14} className="text-brand-text-dim" />
                                        </div>
                                    )}
                                    <span className="text-sm font-bold text-white uppercase tracking-wider">{r.user?.username}</span>
                                </div>
                                <span className="text-[9px] font-medium text-brand-text-dim/60 uppercase">
                                    {format(new Date(r.read_at), 'HH:mm')}
                                </span>
                            </div>
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center py-10 text-brand-text-dim/40 space-y-2">
                            <CheckCheck size={32} opacity={0.2} />
                            <p className="text-[10px] font-bold uppercase tracking-widest">No transmissions intercepted yet</p>
                        </div>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
};

export default ReadReceiptsModal;
