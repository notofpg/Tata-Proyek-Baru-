import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[100dvh] bg-slate-950 flex flex-col items-center justify-center text-slate-200 p-6 text-center font-sans">
          <h1 className="text-2xl font-bold text-red-400 mb-4">Ups, Terjadi Kesalahan</h1>
          <p className="text-slate-400 mb-8 max-w-md">
            Sistem mendeteksi error pada aplikasi saat menjalankan aksi. Silakan muat ulang atau reset jika terus berlanjut.
          </p>
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-left text-[10px] mb-8 text-red-300 w-full max-w-md overflow-x-auto font-mono whitespace-pre-wrap max-h-32">
            {this.state.error?.toString()}
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-colors"
            >
              Muat Ulang
            </button>
            <button
              onClick={() => {
                try {
                  localStorage.clear();
                } catch(e) {
                  console.error(e);
                }
                window.location.reload();
              }}
              className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition-colors"
            >
              Reset Data
            </button>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}
