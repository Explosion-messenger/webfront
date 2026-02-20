import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import { QRCodeSVG } from 'qrcode.react';

const Login: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [otpCode, setOtpCode] = useState('');
    const [requires2FA, setRequires2FA] = useState(false);
    const [needs2FASetup, setNeeds2FASetup] = useState(false);
    const [setupData, setSetupData] = useState<{ otp_auth_url: string; secret: string } | null>(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const [isPasswordless, setIsPasswordless] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            if (isPasswordless) {
                setRequires2FA(true);
                setLoading(false);
                return;
            }

            const formData = new FormData();
            formData.append('username', username);
            formData.append('password', password);

            const response = await api.post('/login', formData);

            if (response.data.requires_2fa) {
                setRequires2FA(true);
            } else if (response.data.needs_2fa_setup) {
                setNeeds2FASetup(true);
                setSetupData({
                    otp_auth_url: response.data.otp_auth_url,
                    secret: response.data.secret
                });
            } else {
                login(response.data.access_token);
                navigate('/');
            }
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    const handle2FAVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const response = await api.post(`/login/2fa?username=${encodeURIComponent(username)}`, { code: otpCode });
            login(response.data.access_token);
            navigate('/');
        } catch (err: any) {
            setError(err.response?.data?.detail || '2FA verification failed. Note: Passwordless login only works if 2FA is already enabled.');
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
                        <h1 className="text-4xl font-black text-white tracking-widest uppercase mb-2">Explosion</h1>
                        <p className="text-brand-accent text-[10px] font-bold tracking-[0.4em] uppercase opacity-80">
                            {requires2FA ? 'Authorize Transmission' : isPasswordless ? 'Neural Bypass' : 'Synchronize Identity'}
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
                    {!requires2FA && !needs2FASetup ? (
                        <motion.form
                            key="login"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="space-y-6"
                            onSubmit={handleSubmit}
                        >
                            <div className="space-y-2">
                                <label className="block text-[10px] uppercase tracking-[0.2em] font-black text-brand-text-dim ml-1">Username</label>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full px-5 py-4 bg-slate-900 border border-brand-border rounded-2xl focus:outline-none focus:border-brand-accent text-white transition-all shadow-inner"
                                    required
                                    disabled={loading}
                                />
                            </div>
                            {!isPasswordless && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="space-y-2"
                                >
                                    <label className="block text-[10px] uppercase tracking-[0.2em] font-black text-brand-text-dim ml-1">Password</label>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full px-5 py-4 bg-slate-900 border border-brand-border rounded-2xl focus:outline-none focus:border-brand-accent text-white transition-all shadow-inner"
                                        required={!isPasswordless}
                                        disabled={loading}
                                    />
                                </motion.div>
                            )}
                            <button
                                type="submit"
                                disabled={loading}
                                className="glow-button w-full border-none py-4 text-xs font-black uppercase tracking-[0.35em] mt-4 disabled:opacity-50"
                            >
                                {loading ? 'Processing...' : isPasswordless ? 'Request Code' : 'Initialize'}
                            </button>

                            <button
                                type="button"
                                onClick={() => setIsPasswordless(!isPasswordless)}
                                className="w-full py-2 text-[9px] font-bold text-brand-text-dim hover:text-brand-accent uppercase tracking-widest transition-colors"
                            >
                                {isPasswordless ? 'Back to Password' : 'Use 2FA Neural Bypass'}
                            </button>
                        </motion.form>
                    ) : needs2FASetup && setupData ? (
                        <motion.form
                            key="2fa-setup"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="space-y-6"
                            onSubmit={handle2FAVerify}
                        >
                            <div className="text-center space-y-4">
                                <p className="text-[10px] font-bold text-brand-text-dim uppercase tracking-widest leading-relaxed">
                                    Finalizing specialization. <br />
                                    Scan QR with your Authenticator app.
                                </p>

                                <div className="p-4 bg-white rounded-2xl inline-block shadow-premium overflow-hidden border-4 border-brand-accent/20">
                                    <QRCodeSVG value={setupData.otp_auth_url} size={180} />
                                </div>

                                <div className="space-y-1">
                                    <p className="text-[9px] font-black text-brand-text-dim uppercase tracking-widest">Manual Node Key</p>
                                    <code className="block bg-slate-900/50 p-2 rounded-lg text-brand-accent text-xs font-mono select-all">
                                        {setupData.secret}
                                    </code>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-[10px] uppercase tracking-[0.2em] font-black text-brand-text-dim ml-1">Confirmation Code</label>
                                <input
                                    type="text"
                                    value={otpCode}
                                    onChange={(e) => setOtpCode(e.target.value)}
                                    className="w-full px-5 py-4 bg-slate-900 border border-brand-border rounded-2xl focus:outline-none focus:border-brand-accent text-center text-2xl font-black text-brand-accent tracking-[0.5em] transition-all shadow-inner"
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
                                className="glow-button w-full border-none py-4 text-xs font-black uppercase tracking-[0.35em] mt-4 bg-brand-accent shadow-[0_0_20px_rgba(34,197,94,0.3)]"
                            >
                                {loading ? 'Configuring...' : 'Establish Link'}
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setNeeds2FASetup(false);
                                    setSetupData(null);
                                }}
                                className="w-full py-2 text-[9px] font-bold text-brand-text-dim hover:text-white uppercase tracking-widest transition-colors"
                            >
                                Reset Identity Request
                            </button>
                        </motion.form>
                    ) : (
                        <motion.form
                            key="2fa"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6"
                            onSubmit={handle2FAVerify}
                        >
                            <div className="text-center p-4 bg-brand-accent/5 rounded-2xl border border-brand-accent/10 mb-4">
                                <p className="text-[10px] font-bold text-brand-text-dim uppercase tracking-widest leading-relaxed">
                                    {isPasswordless ? 'Passwordless mode active.' : 'A second layer of security is active.'} <br />
                                    Enter the code from your authenticator app.
                                </p>
                            </div>
                            <div className="space-y-2">
                                <label className="block text-[10px] uppercase tracking-[0.2em] font-black text-brand-text-dim ml-1">Authenticator Code</label>
                                <input
                                    type="text"
                                    value={otpCode}
                                    onChange={(e) => setOtpCode(e.target.value)}
                                    className="w-full px-5 py-4 bg-slate-900 border border-brand-border rounded-2xl focus:outline-none focus:border-brand-accent text-center text-2xl font-black text-brand-accent tracking-[0.5em] transition-all shadow-inner"
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
                                {loading ? 'Authorizing...' : 'Verify Identity'}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setRequires2FA(false);
                                    if (isPasswordless) setIsPasswordless(false);
                                }}
                                className="w-full py-2 text-[9px] font-bold text-brand-text-dim hover:text-white uppercase tracking-widest transition-colors"
                            >
                                Back to Start
                            </button>
                        </motion.form>
                    )}
                </AnimatePresence>

                <p className="text-center text-brand-text-dim text-[10px] font-bold uppercase tracking-widest pt-4">
                    New entity?{' '}
                    <Link to="/register" className="text-brand-accent hover:text-white transition-colors ml-2 underline underline-offset-4">
                        Register Node
                    </Link>
                </p>
            </motion.div>
        </div>
    );
};

export default Login;

