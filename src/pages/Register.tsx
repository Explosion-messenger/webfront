import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../api';

const Register: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            await api.post('/register', { username, password });
            navigate('/login');
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Registration failed');
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
                        <p className="text-brand-accent text-[10px] font-bold tracking-[0.4em] uppercase opacity-80">Allocate Identity</p>
                    </motion.div>
                </div>

                {error && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        className="p-4 text-xs font-bold uppercase tracking-widest text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl"
                    >
                        {error}
                    </motion.div>
                )}

                <form className="space-y-6" onSubmit={handleSubmit}>
                    <div className="space-y-2">
                        <label className="block text-[10px] uppercase tracking-[0.2em] font-black text-brand-text-dim ml-1">Desired Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full px-5 py-4 bg-slate-900 border border-brand-border rounded-2xl focus:outline-none focus:border-brand-accent text-white transition-all shadow-inner"
                            required
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
                        />
                    </div>
                    <button
                        type="submit"
                        className="glow-button w-full border-none py-4 text-xs font-black uppercase tracking-[0.35em] mt-4 shadow-[0_0_20px_rgba(34,197,94,0.2)] bg-brand-accent"
                    >
                        Register Node
                    </button>
                </form>

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
