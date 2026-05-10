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
        <div className="relative min-h-screen flex flex-col items-center justify-center pt-20 overflow-hidden">
            <div className="relative z-10 w-full max-w-xl mx-auto p-8 space-y-12">
                <div className="space-y-6 text-center">
                    <h2 className="text-4xl sm:text-5xl font-extrabold text-center bg-clip-text text-transparent bg-gradient-to-br from-gray-200 to-gray-600">
                        Decode Legal Risk in Seconds.
                    </h2>
                    <p className="text-xl text-gray-400 max-w-lg mx-auto">
                        AI-powered Terms of Service analysis that finds what companies hide in the fine print.
                        Don't let legal jargon trap you implicitly.
                    </p>
                </div>

                <form className="flex sm:flex-row flex-col gap-2 max-w-md mx-auto" onSubmit={handleSubmit}>
                    <Input
                        type="url"
                        value={url}
                        onChange={e => setUrl(e.target.value)}
                        placeholder="Paste a ToS URL (Optional)"
                        className="h-12 bg-gray-950/50 border-gray-800 text-white"
                    />
                    <Button
                        className="h-12 px-6 bg-black hover:bg-black/90 text-white border border-gray-800"
                        variant="ghost"
                        type="submit"
                    >
                        Get Started
                    </Button>
                </form>

                <div className="flex flex-col items-center gap-8">
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
                        <span className="font-bold text-gray-200">2,400+ documents analyzed</span>
                    </div>

                    <div className="flex gap-6 justify-center">
                        <a href="#" className="text-gray-400 hover:text-gray-300">
                            <Icons.twitter className="w-5 h-5 fill-current" />
                        </a>
                        <a href="https://github.com/aarush323" className="text-gray-400 hover:text-gray-300" target="_blank" rel="noreferrer">
                            <Icons.gitHub className="w-5 h-5 fill-current" />
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
