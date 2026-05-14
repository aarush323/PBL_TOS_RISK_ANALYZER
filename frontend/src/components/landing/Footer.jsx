import React from 'react';
import { Scale } from 'lucide-react';

const footerLinks = {
    Product: ['Features', 'Pricing', 'Compare', 'API Docs'],
    Resources: ['Documentation', 'Blog', 'Changelog'],
    Legal: ['Privacy Policy', 'Terms of Service', 'Cookie Policy'],
};

export default function Footer() {
    return (
        <footer className="border-t border-zinc-900 py-16 px-6">
            <div className="max-w-6xl mx-auto">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
                    {/* Brand col */}
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-[#007AFF] to-[#0056cc] flex items-center justify-center">
                                <Scale size={14} className="text-white" />
                            </div>
                            <span className="text-sm font-bold text-white">Jurist AI</span>
                        </div>
                        <p className="text-xs text-zinc-500 leading-relaxed">
                            Terms review software for checking clauses before you agree.
                        </p>
                    </div>

                    {/* Link cols */}
                    {Object.entries(footerLinks).map(([title, links]) => (
                        <div key={title}>
                            <h4 className="text-xs text-zinc-400 uppercase tracking-wider font-semibold mb-4">{title}</h4>
                            <ul className="space-y-2">
                                {links.map((link) => (
                                    <li key={link}>
                                        <a href="#" className="text-sm text-zinc-500 hover:text-white transition-colors">
                                            {link}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                {/* Bottom bar */}
                <div className="flex flex-col sm:flex-row justify-between items-center pt-8 border-t border-zinc-900 gap-4">
                    <p className="text-xs text-zinc-600">
                        © {new Date().getFullYear()} Jurist AI. All rights reserved.
                    </p>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-xs text-zinc-500">Service status shown in app</span>
                    </div>
                </div>
            </div>
        </footer>
    );
}
