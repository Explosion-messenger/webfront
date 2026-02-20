import React, { useEffect, useRef } from 'react';
import { User as UserIcon, CheckCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { type Message, type Chat } from '../types';

interface ReadReceiptsPopupProps {
    message: Message;
    chat: Chat;
    position: { x: number, y: number };
    onClose: () => void;
}

const getAvatarUrl = (path?: string) => path ? `/avatars/${path}` : null;

const ReadReceiptsPopup: React.FC<ReadReceiptsPopupProps> = ({ message, chat, position, onClose }) => {
    const popupRef = useRef<HTMLDivElement>(null);

    const readers = message.read_by.map(rb => {
        const user = chat.members.find(m => m.id === rb.user_id);
        return { user, read_at: rb.read_at };
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
    const adjustedY = Math.min(position.y, window.innerHeight - 300);

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
            className="w-60 bg-brand-card/95 backdrop-blur-2xl border border-brand-border rounded-2xl shadow-3xl z-[70] overflow-hidden flex flex-col"
        >
            <div className="p-3 border-b border-brand-border flex items-center space-x-2 bg-brand-sidebar/50">
                <CheckCheck size={14} className="text-brand-accent" />
                <h3 className="text-[10px] uppercase tracking-[0.2em] font-black text-white/70">Read Audit</h3>
            </div>

            <div className="max-h-60 overflow-y-auto custom-scroll p-2 space-y-1">
                {readers.length > 0 ? (
                    readers.map((r, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 hover:bg-white/5 rounded-xl transition-colors group">
                            <div className="flex items-center space-x-3">
                                {r.user?.avatar_path ? (
                                    <img src={getAvatarUrl(r.user.avatar_path)!} className="w-6 h-6 rounded-lg object-cover border border-white/5" />
                                ) : (
                                    <div className="w-6 h-6 bg-slate-800 rounded-lg flex items-center justify-center">
                                        <UserIcon size={10} className="text-brand-text-dim" />
                                    </div>
                                )}
                                <span className="text-[11px] font-bold text-white/90 truncate max-w-[100px]">{r.user?.username}</span>
                            </div>
                            <span className="text-[9px] font-medium text-brand-text-dim/40 uppercase group-hover:text-brand-text-dim/80 transition-colors">
                                {format(new Date(r.read_at), 'HH:mm')}
                            </span>
                        </div>
                    ))
                ) : (
                    <div className="py-6 text-center">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-brand-text-dim/30">No Logs Found</p>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default ReadReceiptsPopup;
