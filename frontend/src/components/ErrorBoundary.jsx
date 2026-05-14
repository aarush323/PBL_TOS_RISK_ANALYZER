import React from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("ErrorBoundary caught an error:", error, errorInfo);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
        if (this.props.onReset) this.props.onReset();
        else window.location.href = '/';
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center animate-fade-in">
                    <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
                        <AlertCircle size={32} className="text-red-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-3">Something went wrong</h2>
                    <p className="text-white/50 max-w-md mb-8">
                        An unexpected error occurred while rendering this view. This usually happens if the analysis data is corrupted or incomplete.
                    </p>

                    <div className="bg-black/40 border border-white/10 rounded-lg p-4 mb-8 max-w-lg w-full text-left">
                        <p className="text-[10px] text-white/30 uppercase font-bold mb-2">Error Details</p>
                        <p className="text-xs font-mono text-red-400 break-all">{this.state.error?.message || 'Unknown error'}</p>
                    </div>

                    <div className="flex gap-4">
                        <button
                            onClick={this.handleReset}
                            className="flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold hover:shadow-lg hover:shadow-red-500/30 transition-all"
                        >
                            <RefreshCw size={18} />
                            <span>Reset View</span>
                        </button>
                        <button
                            onClick={() => window.location.href = '/'}
                            className="flex items-center gap-2 px-6 py-3 rounded-lg bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 transition-all"
                        >
                            <Home size={18} />
                            <span>Go to Dashboard</span>
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
