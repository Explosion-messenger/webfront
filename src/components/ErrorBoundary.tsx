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
                <div className="flex flex-col items-center justify-center h-screen bg-nord0 text-nord11 p-6 text-center">
                    <h1 className="text-2xl font-black uppercase tracking-widest mb-4">System Anomaly Detected</h1>
                    <p className="text-nord4 text-sm max-w-md mb-8 opacity-70">
                        A critical error occurred in the neural interface. Please try refreshing the terminal.
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-8 py-3 bg-nord11 text-nord6 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-nord11/80 transition-all"
                    >
                        Reboot System
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
