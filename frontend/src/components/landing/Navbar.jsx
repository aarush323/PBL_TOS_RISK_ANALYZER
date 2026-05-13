import React from 'react';
import { Scale, Menu, ArrowRight } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';

export default function Navbar({ onGetStarted }) {
    const [mobileOpen, setMobileOpen] = React.useState(false);
    const [scrolled, setScrolled] = React.useState(false);
    const { token, user } = useAppContext();
    const isSignedIn = Boolean(token);

    React.useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const navLinks = [
        { label: 'How It Works', href: '#technical' },
    ];

    const scrollTo = (href) => {
        setMobileOpen(false);
        const el = document.querySelector(href);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled
                ? 'bg-[#020817]/90 backdrop-blur-xl border-b border-zinc-800/50 shadow-lg shadow-black/20'
                : 'bg-transparent'
            }`}>
            <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
                {/* Brand */}
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#007AFF] to-[#0044cc] flex items-center justify-center shadow-lg shadow-[#007AFF]/20">
                        <Scale size={15} className="text-white" />
                    </div>
                    <span className="text-base font-bold text-white tracking-tight">Jurist AI</span>
                </div>

                {/* Desktop links — centered */}
                <div className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
                    {navLinks.map((link) => (
                        <button
                            key={link.href}
                            onClick={() => scrollTo(link.href)}
                            className="px-4 py-2 text-[13px] text-zinc-500 hover:text-white transition-colors"
                        >
                            {link.label}
                        </button>
                    ))}
                </div>

                {/* CTA */}
                <div className="hidden md:flex items-center gap-2">
                    <button
                        onClick={onGetStarted}
                        className="px-4 py-2 text-[13px] text-zinc-400 hover:text-white transition-colors"
                    >
                        {isSignedIn ? (user?.username || user?.email?.split('@')[0] || 'Signed In') : 'Sign In'}
                    </button>
                    <button
                        onClick={onGetStarted}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#007AFF] text-white text-[13px] font-medium hover:bg-[#0066dd] transition-colors"
                    >
                        {isSignedIn ? 'Open App' : 'Get Started'}
                        <ArrowRight size={14} />
                    </button>
                </div>

                {/* Mobile toggle */}
                <button className="md:hidden text-zinc-400 hover:text-white" onClick={() => setMobileOpen(!mobileOpen)}>
                    <Menu size={22} />
                </button>
            </div>

            {/* Mobile menu */}
            {mobileOpen && (
                <div className="md:hidden bg-[#020817]/95 backdrop-blur-xl border-t border-zinc-800/50 px-6 py-4 space-y-1">
                    {navLinks.map((link) => (
                        <button
                            key={link.href}
                            onClick={() => scrollTo(link.href)}
                            className="block w-full text-left px-4 py-3 text-sm text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg"
                        >
                            {link.label}
                        </button>
                    ))}
                    <div className="pt-3 border-t border-zinc-800/50">
                        <button onClick={onGetStarted} className="w-full px-4 py-3 rounded-lg bg-[#007AFF] text-white text-sm font-medium">
                            {isSignedIn ? 'Open App' : 'Get Started'}
                        </button>
                    </div>
                </div>
            )}
        </nav>
    );
}
