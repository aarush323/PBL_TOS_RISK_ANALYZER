import React from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

const plans = [
    {
        name: 'Current Build',
        price: 'Free',
        period: '',
        description: 'What is available in the app now.',
        features: [
            'Document analysis',
            'URL extraction',
            'Clause chat',
            'Risk scoring',
            'Single-user workflow',
        ],
        cta: 'Open App',
        popular: false,
    },
    {
        name: 'Team Plan',
        price: 'Planned',
        period: '',
        description: 'Not available in the product yet.',
        features: [
            'Shared workspaces',
            'Usage controls',
            'Team billing',
            'Admin settings',
            'Deployment support',
        ],
        cta: 'Open App',
        popular: true,
    },
];

export default function PricingSection({ onGetStarted }) {
    return (
        <section id="pricing" className="py-24 px-6 border-t border-zinc-900">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="text-center mb-16">
                    <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                        Access.
                        <span className="text-zinc-500"> No hidden packaging.</span>
                    </h2>
                    <p className="text-zinc-400 text-lg">
                        What exists today, and what is only planned.
                    </p>
                </div>

                {/* Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {plans.map((plan) => (
                        <div
                            key={plan.name}
                            className={`relative p-8 rounded-2xl border transition-all ${plan.popular
                                    ? 'bg-zinc-900/80 border-[#007AFF]/40 shadow-lg shadow-[#007AFF]/10'
                                    : 'bg-zinc-900/40 border-zinc-800/50 hover:border-zinc-700'
                                }`}
                        >
                            {plan.popular && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-[#007AFF] text-white text-xs font-bold uppercase tracking-wider">
                                    Planned
                                </div>
                            )}

                            <div className="mb-6">
                                <h3 className="text-lg font-semibold text-white mb-1">{plan.name}</h3>
                                <p className="text-sm text-zinc-500">{plan.description}</p>
                            </div>

                            <div className="flex items-baseline gap-1 mb-8">
                                <span className="text-4xl font-bold text-white">{plan.price}</span>
                                {plan.period && (
                                    <span className="text-zinc-500 text-sm">{plan.period}</span>
                                )}
                            </div>

                            <ul className="space-y-3 mb-8">
                                {plan.features.map((feature, i) => (
                                    <li key={i} className="flex items-center gap-3">
                                        <div className="w-5 h-5 rounded-full bg-[#007AFF]/10 flex items-center justify-center flex-shrink-0">
                                            <Check size={12} className="text-[#007AFF]" />
                                        </div>
                                        <span className="text-sm text-zinc-300">{feature}</span>
                                    </li>
                                ))}
                            </ul>

                            <Button
                                variant={plan.popular ? 'default' : 'outline'}
                                className="w-full h-12 text-sm"
                                onClick={onGetStarted}
                            >
                                {plan.cta}
                            </Button>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
