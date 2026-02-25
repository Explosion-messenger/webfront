import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Paperclip, Send } from 'lucide-react';
import { type Message } from '../../types';

export interface ChatInputProps {
    inputText: string;
    setInputText: (text: string) => void;
    isSending: boolean;
    replyToMessage: Message | null;
    onClearReply: () => void;
    onSendMessage: (e: React.FormEvent) => void;
    onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const ChatInput: React.FC<ChatInputProps> = ({
    inputText,
    setInputText,
    isSending,
    replyToMessage,
    onClearReply,
    onSendMessage,
    onFileUpload
}) => {
    return (
        <div className="p-6 border-t border-brand-border bg-brand-sidebar/50 shrink-0">
            <AnimatePresence>
                {replyToMessage && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="flex items-center space-x-3 p-3 bg-brand-accent/10 border-l-4 border-brand-accent rounded-r-xl mb-4 relative group">
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] uppercase font-black text-brand-accent tracking-tighter mb-1">
                                    Replying to {replyToMessage.sender.username}
                                </p>
                                <p className="text-xs text-brand-text-dim truncate">
                                    {replyToMessage.text || (replyToMessage.file ? 'Attached File' : 'Message')}
                                </p>
                            </div>
                            <button
                                onClick={onClearReply}
                                className="p-1 hover:text-white transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            <form onSubmit={onSendMessage} className="flex items-center space-x-4">
                <label className="cursor-pointer p-3 bg-slate-800 hover:bg-slate-700 rounded-2xl transition-all border border-brand-border shrink-0">
                    <Paperclip size={20} strokeWidth={1.5} className="text-brand-text-dim hover:text-brand-accent" />
                    <input type="file" className="hidden" onChange={onFileUpload} />
                </label>
                <div className="flex-1 relative min-w-0">
                    <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="Compose a secure message..."
                        className="w-full bg-slate-900 border border-brand-border rounded-2xl px-6 py-4 focus:outline-none focus:border-brand-accent transition-all text-sm text-white placeholder:text-brand-text-dim/60 shadow-inner"
                    />
                </div>
                <button
                    type="submit"
                    disabled={!inputText.trim() || isSending}
                    className="p-4 bg-brand-accent hover:bg-brand-accent/80 disabled:opacity-20 rounded-2xl text-white transition-all shadow-glow active:scale-95 shrink-0"
                >
                    <Send size={20} strokeWidth={2} />
                </button>
            </form>
        </div>
    );
};

export default ChatInput;
