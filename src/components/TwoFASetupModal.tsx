import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, Copy, Check, AlertTriangle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import api from '../api';

interface TwoFASetupModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const TwoFASetupModal: React.FC<TwoFASetupModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [setupData, setSetupData] = useState<{ otp_auth_url: string; secret: string } | null>(null);
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchSetupData();
        }
    }, [isOpen]);

    const fetchSetupData = async () => {
        try {
            const response = await api.get('/2fa/setup');
            setSetupData(response.data);
        } catch (err: any) {
            setError('Failed to initiate 2FA setup');
        }
    };

    const handleEnable = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await api.post('/2fa/enable', { code });
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Invalid verification code');
        } finally {
            setLoading(false);
        }
    };

    const copySecret = () => {
        if (setupData?.secret) {
            navigator.clipboard.writeText(setupData.secret);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="w-full max-w-md bg-brand-sidebar border border-brand-border rounded-3xl shadow-premium overflow-hidden relative"
                >
                    <div className="p-6 border-b border-brand-border flex items-center justify-between bg-brand-surface/30">
                        <div className="flex items-center space-x-3">
                            <div className="p-2 bg-brand-accent/20 rounded-xl">
                                <Shield className="text-brand-accent" size={20} />
                            </div>
                            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white">Shield Activation</h2>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors text-brand-text-dim">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="p-8 space-y-6">
                        {error && (
                            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center space-x-3">
                                <AlertTriangle className="text-red-500 shrink-0" size={18} />
                                <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest">{error}</p>
                            </div>
                        )}

                        <div className="text-center space-y-2">
                            <p className="text-[11px] font-bold text-brand-text-dim uppercase tracking-widest leading-relaxed">
                                Scan this QR code with your <span className="text-white">Authenticator app</span> (Google, Authy, etc.) to enable two-factor synchronization.
                            </p>
                        </div>

                        <div className="flex justify-center p-4 bg-white rounded-3xl shadow-inner">
                            {setupData?.otp_auth_url ? (
                                <QRCodeSVG value={setupData.otp_auth_url} size={200} />
                            ) : (
                                <div className="w-[200px] h-[200px] flex items-center justify-center bg-slate-100 rounded-2xl animate-pulse">
                                    <Shield size={40} className="text-slate-300" />
                                </div>
                            )}
                        </div>

                        <div className="space-y-3">
                            <p className="text-[9px] font-black text-brand-text-dim uppercase tracking-[0.2em] text-center">Manual Entry Key</p>
                            <div className="flex items-center space-x-2 bg-slate-900 border border-brand-border rounded-2xl p-3">
                                <code className="flex-1 text-center font-mono text-brand-accent tracking-widest text-sm">
                                    {setupData?.secret || '•••• •••• •••• ••••'}
                                </code>
                                <button onClick={copySecret} className="p-2 hover:bg-white/5 rounded-xl transition-colors text-brand-text-dim">
                                    {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                                </button>
                            </div>
                        </div>

                        <form onSubmit={handleEnable} className="space-y-4 pt-2">
                            <div className="space-y-2 text-center">
                                <label className="text-[10px] uppercase tracking-[0.2em] font-black text-brand-text-dim">Enter Verification Code</label>
                                <input
                                    type="text"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                    className="w-full px-5 py-4 bg-slate-900 border border-brand-border rounded-2xl focus:outline-none focus:border-brand-accent text-center text-2xl font-black text-brand-accent tracking-[0.5em] transition-all"
                                    placeholder="000000"
                                    maxLength={6}
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading || !code}
                                className="glow-button w-full border-none py-4 text-xs font-black uppercase tracking-[0.35em] bg-brand-accent disabled:opacity-50"
                            >
                                {loading ? 'Synchronizing...' : 'Activate Shield'}
                            </button>
                        </form>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default TwoFASetupModal;
