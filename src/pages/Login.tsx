import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';

const Login: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            const formData = new FormData();
            formData.append('username', username);
            formData.append('password', password);

            const response = await api.post('/login', formData);
            login(response.data.access_token);
            navigate('/');
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Login failed');
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-nord0 px-4">
            <div className="w-full max-w-md p-8 space-y-6 bg-nord1 rounded-none shadow-2xl border border-nord2">
                <h1 className="text-3xl font-light text-center text-nord6 tracking-tight">Welcome</h1>
                <p className="text-center text-nord4 font-light">Sign in to continue</p>

                {error && (
                    <div className="p-3 text-sm text-nord11 bg-nord11/10 border border-nord11/20 rounded-none">
                        {error}
                    </div>
                )}

                <form className="space-y-4" onSubmit={handleSubmit}>
                    <div>
                        <label className="block mb-2 text-xs uppercase tracking-widest font-semibold text-nord4">Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full px-4 py-2 bg-nord2 border border-nord3 rounded-none focus:outline-none focus:border-nord8 text-nord6 transition-colors"
                            required
                        />
                    </div>
                    <div>
                        <label className="block mb-2 text-xs uppercase tracking-widest font-semibold text-nord4">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-2 bg-nord2 border border-nord3 rounded-none focus:outline-none focus:border-nord8 text-nord6 transition-colors"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full py-3 px-4 bg-nord9 hover:bg-nord10 text-nord0 font-bold rounded-none transition duration-200 uppercase tracking-widest text-sm"
                    >
                        Sign In
                    </button>
                </form>

                <p className="text-center text-nord4 text-sm">
                    New here?{' '}
                    <Link to="/register" className="text-nord8 hover:text-nord7 transition-colors">
                        Create an account
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default Login;
