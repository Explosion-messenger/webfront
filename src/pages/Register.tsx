import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api';
import { QRCodeSVG } from 'qrcode.react';

const Register: React.FC = () => {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [setupData, setSetupData] = useState<{ secret: string; otp_auth_url: string; setup_token: string } | null>(null);
    const [otpCode, setOtpCode] = useState('');
    const navigate = useNavigate();

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const response = await api.post('/register/setup', { username, email: email || null, password });
            setSetupData(response.data);
            setIsVerifying(true);
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Registration initialization failed');
        } finally {
            setLoading(false);
        }
    };

    const handleConfirm = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await api.post('/register/confirm', {
                setup_token: setupData?.setup_token,
                code: otpCode
            });
            navigate('/login');
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-brand-bg px-4 relative overflow-hidden">
            <div className="radar-glow" />

            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="w-full max-w-md p-10 space-y-8 glass-panel z-10"
            >
                <div className="text-center">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                    >
                        <h1 className="text-4xl font-black text-brand-text tracking-widest uppercase mb-2">Provision Node</h1>
                        <p className="text-brand-accent text-[10px] font-bold tracking-[0.4em] uppercase opacity-80">
                            {isVerifying ? 'Activate Secure Link' : 'Allocate Instance'}
                        </p>
                    </motion.div>
                </div>

                <AnimatePresence mode="wait">
                    {error && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="p-4 text-xs font-bold uppercase tracking-widest text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl overflow-hidden"
                        >
                            {error}
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence mode="wait">
                    {!isVerifying ? (
                        <motion.form
                            key="register"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-6"
                            onSubmit={handleRegister}
                        >
                            <div className="space-y-2">
                                <label className="block text-[10px] uppercase tracking-[0.2em] font-black text-brand-text-dim ml-1">Desired Username</label>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full px-5 py-4 bg-white/50 border border-brand-border rounded-2xl focus:outline-none focus:border-brand-accent text-brand-text transition-all shadow-inner"
                                    required
                                    disabled={loading}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-[10px] uppercase tracking-[0.2em] font-black text-brand-text-dim ml-1">Secure Email (Optional)</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-5 py-4 bg-white/50 border border-brand-border rounded-2xl focus:outline-none focus:border-brand-accent text-brand-text transition-all shadow-inner"
                                    disabled={loading}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="block text-[10px] uppercase tracking-[0.2em] font-black text-brand-text-dim ml-1">Access Password</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-5 py-4 bg-white/50 border border-brand-border rounded-2xl focus:outline-none focus:border-brand-accent text-brand-text transition-all shadow-inner"
                                    required
                                    minLength={6}
                                    disabled={loading}
                                />
                                <p className="text-[9px] text-brand-text-dim/60 ml-1">Complexity requirement: Minimum 6 characters</p>
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="glow-button w-full border-none py-4 text-xs font-black uppercase tracking-[0.35em] mt-4 shadow-[0_0_20px_rgba(34,197,94,0.2)] bg-brand-accent disabled:opacity-50"
                            >
                                {loading ? 'Processing...' : 'Generate Instance Code'}
                            </button>
                        </motion.form>
                    ) : (
                        <motion.form
                            key="confirm"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="space-y-6"
                            onSubmit={handleConfirm}
                        >
                            <div className="text-center space-y-4">
                                <p className="text-[10px] font-bold text-brand-text-dim uppercase tracking-widest leading-relaxed">
                                    Instance reserved. <br />
                                    Scan to link your authenticator.
                                </p>

                                {setupData && (
                                    <div className="p-4 bg-white rounded-2xl inline-block shadow-premium overflow-hidden border-4 border-brand-accent/20">
                                        <QRCodeSVG value={setupData.otp_auth_url} size={180} />
                                    </div>
                                )}

                                <div className="space-y-1">
                                    <p className="text-[9px] font-black text-brand-text-dim uppercase tracking-widest">Manual Setup Key</p>
                                    <code className="block bg-white/50 border border-brand-border p-2 rounded-lg text-brand-text text-xs font-mono select-all uppercase">
                                        {setupData?.secret}
                                    </code>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-[10px] uppercase tracking-[0.2em] font-black text-brand-text-dim ml-1">Authentication Code</label>
                                <input
                                    type="text"
                                    value={otpCode}
                                    onChange={(e) => setOtpCode(e.target.value)}
                                    className="w-full px-5 py-4 bg-white/50 border border-brand-border rounded-2xl focus:outline-none focus:border-brand-accent text-center text-2xl font-black text-brand-accent tracking-[0.5em] transition-all shadow-inner"
                                    placeholder="000 000"
                                    maxLength={6}
                                    required
                                    disabled={loading}
                                    autoFocus
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="glow-button w-full border-none py-4 text-xs font-black uppercase tracking-[0.35em] mt-4 shadow-[0_0_20px_rgba(34,197,94,0.2)] bg-brand-accent disabled:opacity-50"
                            >
                                {loading ? 'Initializing...' : 'Join Network'}
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setIsVerifying(false);
                                    setSetupData(null);
                                    setOtpCode('');
                                }}
                                className="w-full py-2 text-[9px] font-bold text-brand-text-dim hover:text-white uppercase tracking-widest transition-colors"
                            >
                                Reallocate Identity
                            </button>
                        </motion.form>
                    )}
                </AnimatePresence>

                <p className="text-center text-brand-text-dim text-[10px] font-bold uppercase tracking-widest pt-4">
                    Already specialized?{' '}
                    <Link to="/login" className="text-brand-accent hover:opacity-70 transition-opacity ml-2 underline underline-offset-4">
                        Login to Instance
                    </Link>
                </p>
            </motion.div>
        </div>
    );
};

export default Register;

