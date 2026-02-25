import React from 'react';
import { X, AlertTriangle, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface ConfirmDeleteModalProps {
    onConfirm: () => void;
    onCancel: () => void;
}

const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({ onConfirm, onCancel }) => {
    React.useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onCancel();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onCancel]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-black/20 backdrop-blur-2xl z-[70] flex items-center justify-center p-6"
        >
            <motion.div
                initial={{ scale: 0.95, y: 10 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 10 }}
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
                className="bg-white/60 backdrop-blur-xl w-full max-w-sm rounded-[2rem] border border-white/50 shadow-premium overflow-hidden flex flex-col"
            >
                <div className="p-6 border-b border-white/40 flex justify-between items-center bg-white/40 shrink-0">
                    <div className="flex items-center space-x-3 text-red-500">
                        <AlertTriangle size={18} />
                        <h3 className="text-xs uppercase tracking-[0.2em] font-black text-brand-text">Security Protocol</h3>
                    </div>
                    <button onClick={onCancel} className="text-brand-text-dim hover:text-brand-text transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-8 flex flex-col items-center text-center space-y-6">
                    <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500">
                        <Trash2 size={32} />
                    </div>
                    <div className="space-y-2">
                        <h4 className="text-sm font-black uppercase tracking-widest text-brand-text">Purge Message?</h4>
                        <p className="text-[10px] text-brand-text-dim uppercase tracking-widest leading-loose">
                            This data packet will be permanently deleted from cloud storage. This action cannot be reversed.
                        </p>
                    </div>
                </div>

                <div className="p-6 bg-white/40 border-t border-white/40 flex flex-col space-y-3">
                    <button
                        onClick={onConfirm}
                        className="w-full py-4 bg-red-500 hover:bg-red-400 text-white text-[10px] font-black uppercase tracking-[0.3em] rounded-xl transition-all shadow-glow-red active:scale-[0.98]"
                    >
                        Execute Purge
                    </button>
                    <button
                        onClick={onCancel}
                        className="w-full py-4 text-brand-text-dim hover:text-brand-text text-[10px] font-black uppercase tracking-[0.3em] transition-all"
                    >
                        Abort Mission
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default ConfirmDeleteModal;
