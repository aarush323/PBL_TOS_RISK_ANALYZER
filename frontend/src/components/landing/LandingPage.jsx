import React from 'react';
import { GridBackground } from "@/components/ui/grid-background";
import Navbar from './Navbar';
import HeroSection from './HeroSection';
import FeaturesGrid from './FeaturesGrid';
import TechnicalProof from './TechnicalProof';
import Footer from './Footer';
import { useNavigate } from 'react-router-dom';

export default function LandingPage({ onGetStarted }) {
    const navigate = useNavigate();

    const handleAnalyze = (url) => {
        if (onGetStarted) {
            onGetStarted();
        } else {
            navigate('/app');
        }
    };

    return (
        <div className="min-h-screen text-zinc-50 font-sans selection:bg-blue-500/30 relative">
            <GridBackground />
            <Navbar onGetStarted={onGetStarted || (() => navigate('/app'))} />
            <HeroSection onAnalyze={handleAnalyze} onGetStarted={onGetStarted || (() => navigate('/app'))} />
            <FeaturesGrid />
            <TechnicalProof />
            <Footer />
        </div>
    );
}
