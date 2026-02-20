import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api';

const Register: React.FC = () => {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await api.post('/register', { username, email, password });
            setIsVerifying(true);
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await api.post('/verify-email', { username, code: verificationCode });
            navigate('/login');
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Verification failed');
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
                className="w-full max-w-md p-10 space-y-8 premium-card z-10"
            >
                <div className="text-center">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                    >
                        <h1 className="text-4xl font-black text-white tracking-widest uppercase mb-2">Join Node</h1>
                        <p className="text-brand-accent text-[10px] font-bold tracking-[0.4em] uppercase opacity-80">
                            {isVerifying ? 'Confirm Identity' : 'Allocate Identity'}
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
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="space-y-6"
                            onSubmit={handleRegister}
                        >
                            <div className="space-y-2">
                                <label className="block text-[10px] uppercase tracking-[0.2em] font-black text-brand-text-dim ml-1">Desired Username</label>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full px-5 py-4 bg-slate-900 border border-brand-border rounded-2xl focus:outline-none focus:border-brand-accent text-white transition-all shadow-inner"
                                    required
                                    disabled={loading}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-[10px] uppercase tracking-[0.2em] font-black text-brand-text-dim ml-1">Secure Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-5 py-4 bg-slate-900 border border-brand-border rounded-2xl focus:outline-none focus:border-brand-accent text-white transition-all shadow-inner"
                                    required
                                    disabled={loading}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-[10px] uppercase tracking-[0.2em] font-black text-brand-text-dim ml-1">Access Password</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-5 py-4 bg-slate-900 border border-brand-border rounded-2xl focus:outline-none focus:border-brand-accent text-white transition-all shadow-inner"
                                    required
                                    disabled={loading}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="glow-button w-full border-none py-4 text-xs font-black uppercase tracking-[0.35em] mt-4 shadow-[0_0_20px_rgba(34,197,94,0.2)] bg-brand-accent disabled:opacity-50"
                            >
                                {loading ? 'Processing...' : 'Register Node'}
                            </button>
                        </motion.form>
                    ) : (
                        <motion.form
                            key="verify"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6"
                            onSubmit={handleVerifyEmail}
                        >
                            <div className="text-center p-4 bg-brand-accent/5 rounded-2xl border border-brand-accent/10 mb-4">
                                <p className="text-[10px] font-bold text-brand-text-dim uppercase tracking-widest leading-relaxed">
                                    A transmission has been sent to <span className="text-brand-accent">{email}</span>. <br />
                                    Enter the verification key to activate your node.
                                </p>
                            </div>
                            <div className="space-y-2">
                                <label className="block text-[10px] uppercase tracking-[0.2em] font-black text-brand-text-dim ml-1">Verification Key</label>
                                <input
                                    type="text"
                                    value={verificationCode}
                                    onChange={(e) => setVerificationCode(e.target.value)}
                                    className="w-full px-5 py-4 bg-slate-900 border border-brand-border rounded-2xl focus:outline-none focus:border-brand-accent text-center text-2xl font-black text-brand-accent tracking-[0.5em] transition-all shadow-inner"
                                    placeholder="000000"
                                    maxLength={6}
                                    required
                                    disabled={loading}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="glow-button w-full border-none py-4 text-xs font-black uppercase tracking-[0.35em] mt-4 shadow-[0_0_20px_rgba(34,197,94,0.2)] bg-brand-accent disabled:opacity-50"
                            >
                                {loading ? 'Verifying...' : 'Validate Node'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsVerifying(false)}
                                className="w-full py-2 text-[9px] font-bold text-brand-text-dim hover:text-white uppercase tracking-widest transition-colors"
                            >
                                Back to Registration
                            </button>
                        </motion.form>
                    )}
                </AnimatePresence>

                <p className="text-center text-brand-text-dim text-[10px] font-bold uppercase tracking-widest pt-4">
                    Already specialized?{' '}
                    <Link to="/login" className="text-brand-accent hover:text-white transition-colors ml-2 underline underline-offset-4">
                        Login Identity
                    </Link>
                </p>
            </motion.div>
        </div>
    );
};

export default Register;

