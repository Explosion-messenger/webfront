import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
        <div className="flex items-center justify-center min-h-screen bg-nord0 px-4">
            <div className="w-full max-w-md p-8 space-y-6 bg-nord1 rounded-none shadow-2xl border border-nord2">
                <h1 className="text-3xl font-light text-center text-nord6 tracking-tight">Join</h1>
                <p className="text-center text-nord4 font-light">Create a new account</p>

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
                        className="w-full py-3 px-4 bg-nord14 hover:bg-nord14/80 text-nord0 font-bold rounded-none transition duration-200 uppercase tracking-widest text-sm"
                    >
                        Register
                    </button>
                </form>

                <p className="text-center text-nord4 text-sm">
                    Already specialized?{' '}
                    <Link to="/login" className="text-nord8 hover:text-nord7 transition-colors">
                        Login here
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default Register;
