import React from 'react';

export function GridBackground() {
    return (
        <div
            className="fixed inset-0 pointer-events-none"
            style={{
                background: "linear-gradient(to bottom, #000000, #020617)",
                zIndex: 0,
            }}
        >
            <div
                className="absolute inset-0"
                style={{
                    backgroundImage: `
            linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)
          `,
                    backgroundSize: "60px 60px",
                }}
            />
            <div
                className="absolute inset-0"
                style={{
                    background: "radial-gradient(ellipse at 50% 0%, rgba(30, 64, 175, 0.4) 0%, transparent 70%)",
                }}
            />
            <div
                className="absolute inset-0 z-0 bg-black [mask-image:radial-gradient(ellipse_at_center,transparent_30%,black_100%)]"
            />
        </div>
    )
}
