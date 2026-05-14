import React, { useState } from 'react';
import { GridBackground } from "@/components/ui/grid-background";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Icons } from "@/components/ui/icons";

export default function HeroSection({ onAnalyze, onGetStarted }) {
    const [url, setUrl] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (url.trim()) {
            onAnalyze?.(url.trim());
        } else {
            onGetStarted?.();
        }
    };

    return (
        <div className="relative min-h-[78vh] flex flex-col items-center justify-center pt-24 pb-12 overflow-hidden">
            <div className="relative z-10 w-full max-w-xl mx-auto px-8 py-6 space-y-10">
                <div className="space-y-5 text-center">
                    <h2 className="text-4xl sm:text-5xl font-extrabold text-center bg-clip-text text-transparent bg-gradient-to-br from-gray-200 to-gray-600">
                        Review Terms Before You Agree.
                    </h2>
                    <p className="text-xl text-gray-400 max-w-lg mx-auto">
                        Paste a Terms of Service URL, upload a PDF, or add text.
                        Jurist AI extracts clauses, flags risky terms, and lets you inspect the exact language.
                    </p>
                </div>

                <form className="flex sm:flex-row flex-col gap-2 max-w-md mx-auto" onSubmit={handleSubmit}>
                    <Input
                        type="url"
                        value={url}
                        onChange={e => setUrl(e.target.value)}
                        placeholder="Paste a Terms of Service URL"
                        className="h-12 bg-gray-950/50 border-gray-800 text-white"
                    />
                    <Button
                        className="h-12 px-6 bg-black hover:bg-black/90 text-white border border-gray-800"
                        variant="ghost"
                        type="submit"
                    >
                        Open App
                    </Button>
                </form>

                <div className="flex flex-col items-center gap-6">
                    <div className="flex items-center gap-4">
                        <div className="flex -space-x-3">
                            <Avatar className="border-2 border-black w-12 h-12">
                                <AvatarFallback className="text-sm font-semibold text-white border-white/20 bg-purple-600">JD</AvatarFallback>
                            </Avatar>
                            <Avatar className="border-2 border-black w-12 h-12">
                                <AvatarFallback className="text-sm font-semibold text-white border-white/20 bg-blue-600">AS</AvatarFallback>
                            </Avatar>
                            <Avatar className="border-2 border-black w-12 h-12">
                                <AvatarFallback className="text-sm font-semibold text-white border-white/20 bg-blue-700">MK</AvatarFallback>
                            </Avatar>
                        </div>
                        <span className="font-bold text-gray-200">Works with URL, PDF, and pasted text</span>
                    </div>

                    <div className="flex gap-6 justify-center">
                        <a href="https://github.com/aarush323" className="text-gray-400 hover:text-gray-300" target="_blank" rel="noreferrer">
                            <Icons.gitHub className="w-5 h-5 fill-current" />
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
