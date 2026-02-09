
import React, { ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-[#1a202c] flex items-center justify-center p-8 text-white font-sans">
                    <div className="max-w-md w-full bg-[#2d3748] p-8 rounded-2xl shadow-2xl border border-[#4a5568]">
                        <div className="text-4xl mb-6">⚠️</div>
                        <h1 className="text-2xl font-bold mb-4">Application Error</h1>
                        <p className="text-gray-400 mb-6 italic text-sm">
                            Something went wrong  Your data remains safe on the server.
                        </p>
                        <div className="bg-black/30 p-4 rounded-lg mb-8 font-mono text-xs overflow-auto max-h-32 text-red-400">
                            {this.state.error?.message}
                        </div>
                        <button
                            onClick={() => window.location.reload()}
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg active:scale-95"
                        >
                            Reload Application
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
