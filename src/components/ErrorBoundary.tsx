import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false
    };

    public static getDerivedStateFromError(_: Error): State {
        return { hasError: true };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center h-screen bg-brand-bg text-red-500 p-6 text-center relative overflow-hidden font-sans">
                    <div className="radar-glow opacity-20" />

                    <div className="z-10 flex flex-col items-center">
                        <div className="w-20 h-20 bg-red-500/10 border border-red-500/20 rounded-3xl flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(239,68,68,0.1)]">
                            <span className="text-4xl font-black">!</span>
                        </div>
                        <h1 className="text-3xl font-black uppercase tracking-[0.3em] mb-4 text-white">System Anomaly</h1>
                        <p className="text-brand-text-dim text-sm max-w-md mb-10 uppercase tracking-widest font-bold opacity-60">
                            Neural interface link corrupted. Protocol synchronization failed.
                        </p>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-10 py-5 bg-red-500 text-white rounded-2xl font-black uppercase tracking-[0.4em] text-[10px] hover:bg-red-600 transition-all shadow-[0_0_20px_rgba(239,68,68,0.3)] active:scale-95"
                        >
                            Execute Reboot
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
