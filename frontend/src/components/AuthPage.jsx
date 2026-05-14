import React from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { Scale, Mail, Lock, User, ArrowRight, ShieldCheck, Zap, Command, ChevronRight } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';

export default function AuthPage() {
  const { isAuthLoading, authMode, setAuthMode, handleAuth, toasts } = useAppContext();
  const isLoginMode = authMode === 'login';

  return (
    <div className="min-h-screen bg-[var(--color-surface)] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Dynamic Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[var(--color-primary)]/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[var(--color-primary)]/5 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <Motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[480px] relative z-10"
      >
        <div className="p-12 rounded-[3rem] bg-[var(--color-surface-glass)] backdrop-blur-3xl border border-[var(--color-border)] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.5)] relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[var(--color-primary)] to-transparent opacity-40" />
          
          <div className="flex flex-col items-center text-center mb-12">
            <Motion.div 
              whileHover={{ rotate: 360 }}
              transition={{ duration: 0.7 }}
              className="w-20 h-20 rounded-3xl bg-[var(--color-primary)] text-white flex items-center justify-center mb-8 shadow-2xl shadow-blue-500/40 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
              <Scale size={32} className="relative z-10" />
            </Motion.div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-3">
                <span className="text-[10px] font-black text-[var(--color-primary)] uppercase tracking-[0.4em]">Intelligence Gateway</span>
                <div className="w-1 h-1 rounded-full bg-[var(--color-border)]" />
                <span className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest opacity-40">v4.0.1</span>
              </div>
              <h1 className="text-4xl font-black text-[var(--color-text)] tracking-tighter uppercase leading-none">
                {isLoginMode ? 'Tactical Entry' : 'Node Creation'}<span className="text-[var(--color-primary)]">.</span>
              </h1>
              <p className="text-xs font-bold text-[var(--color-text-subtle)] uppercase tracking-[0.2em] opacity-60">
                {isLoginMode ? 'Access your legal intelligence stream.' : 'Initialize your secure corporate node.'}
              </p>
            </div>
          </div>

          <form key={authMode} className="space-y-6" onSubmit={handleAuth} autoComplete="on">
            <AnimatePresence mode="wait">
              {!isLoginMode && (
                <Motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2 overflow-hidden"
                >
                  <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.3em] ml-4">Codename</label>
                  <div className="relative group/field">
                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] group-focus-within/field:text-[var(--color-primary)] transition-colors">
                      <User size={18} />
                    </div>
                    <input 
                      type="text" 
                      name="username" 
                      className="w-full h-16 pl-14 pr-6 rounded-2xl bg-[var(--color-surface-2)] border border-[var(--color-border)] text-sm font-bold text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/10 transition-all placeholder:text-[var(--color-text-subtle)] placeholder:opacity-30" 
                      placeholder="USER_IDENTIFIER" 
                      autoComplete="username" 
                      required 
                      minLength={3} 
                      maxLength={30} 
                    />
                  </div>
                </Motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.3em] ml-4">Access Uplink</label>
              <div className="relative group/field">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] group-focus-within/field:text-[var(--color-primary)] transition-colors">
                  <Mail size={18} />
                </div>
                <input 
                  type="email" 
                  name="email" 
                  className="w-full h-16 pl-14 pr-6 rounded-2xl bg-[var(--color-surface-2)] border border-[var(--color-border)] text-sm font-bold text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/10 transition-all placeholder:text-[var(--color-text-subtle)] placeholder:opacity-30" 
                  placeholder="CORPORATE_MAIL_ENDPOINT" 
                  autoComplete={isLoginMode ? 'username' : 'email'} 
                  required 
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.3em] ml-4">Encryption Key</label>
              <div className="relative group/field">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] group-focus-within/field:text-[var(--color-primary)] transition-colors">
                  <Lock size={18} />
                </div>
                <input 
                  type="password" 
                  name="password" 
                  className="w-full h-16 pl-14 pr-6 rounded-2xl bg-[var(--color-surface-2)] border border-[var(--color-border)] text-sm font-bold text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/10 transition-all placeholder:text-[var(--color-text-subtle)] placeholder:opacity-30" 
                  placeholder="••••••••••••" 
                  autoComplete={isLoginMode ? 'current-password' : 'new-password'} 
                  required 
                />
              </div>
            </div>

            {!isLoginMode && (
              <Motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-2 overflow-hidden"
              >
                <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.3em] ml-4">Verify Key</label>
                <div className="relative group/field">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] group-focus-within/field:text-[var(--color-primary)] transition-colors">
                    <ShieldCheck size={18} />
                  </div>
                  <input 
                    type="password" 
                    name="confirmPassword" 
                    className="w-full h-16 pl-14 pr-6 rounded-2xl bg-[var(--color-surface-2)] border border-[var(--color-border)] text-sm font-bold text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/10 transition-all placeholder:text-[var(--color-text-subtle)] placeholder:opacity-30" 
                    placeholder="••••••••••••" 
                    autoComplete="new-password" 
                    required 
                  />
                </div>
              </Motion.div>
            )}

            <button 
              className="w-full h-18 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white rounded-[2rem] text-[10px] font-black uppercase tracking-[0.4em] transition-all shadow-2xl shadow-blue-500/30 flex items-center justify-center gap-4 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed group/btn" 
              type="submit" 
              disabled={isAuthLoading}
            >
              {isAuthLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  {isLoginMode ? 'Initialize Stream' : 'Deploy Node'}
                  <ArrowRight size={16} className="group-hover/btn:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-12 pt-8 border-t border-[var(--color-border)] text-center">
            <p className="text-[10px] font-black text-[var(--color-text-subtle)] uppercase tracking-widest opacity-60">
              {isLoginMode ? "No active authorization? " : "Authorization existing? "}
              <button 
                onClick={() => setAuthMode(isLoginMode ? 'signup' : 'login')}
                className="text-[var(--color-primary)] hover:underline ml-2"
              >
                {isLoginMode ? 'REQUEST ACCESS' : 'RE-VERIFY'}
              </button>
            </p>
          </div>
        </div>

        {/* Global Notifications */}
        <div className="fixed bottom-12 right-12 flex flex-col gap-4 pointer-events-none">
          <AnimatePresence>
            {toasts.map(t => (
              <Motion.div 
                key={t.id}
                initial={{ opacity: 0, x: 20, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 20, scale: 0.9 }}
                className={`pointer-events-auto flex items-center gap-4 px-8 py-5 rounded-[2rem] border ${t.isError ? 'bg-[var(--color-error)]/10 border-[var(--color-error)]/20' : 'bg-[var(--color-success)]/10 border-[var(--color-success)]/20'} shadow-2xl backdrop-blur-xl`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${t.isError ? 'bg-[var(--color-error)]' : 'bg-[var(--color-success)]'}`}>
                  {t.isError ? <X size={14} /> : <ShieldCheck size={14} />}
                </div>
                <span className="text-[10px] font-black text-[var(--color-text)] uppercase tracking-widest">
                  {t.message}
                </span>
              </Motion.div>
            ))}
          </AnimatePresence>
        </div>
      </Motion.div>
    </div>
  );
}
