import { useState, useEffect } from 'react';

interface CarStatusProps {
    batteryPercent: number;
    setBatteryPercent: (val: number) => void;
    aec: number;
    setAec: (val: number) => void;
    dashRange: number;
    setDashRange: (val: number) => void;
    safeRange: number;
}

export default function CarStatus({ 
    batteryPercent, 
    setBatteryPercent, 
    aec, 
    setAec, 
    dashRange, 
    setDashRange,
    safeRange
}: CarStatusProps) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [animatedRange, setAnimatedRange] = useState(0);

    // Smooth count-up animation for Safe Range
    useEffect(() => {
        const duration = 1000;
        const start = animatedRange;
        const end = safeRange;
        const startTime = performance.now();

        const animate = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeOutQuad = (t: number) => t * (2 - t);
            const current = start + (end - start) * easeOutQuad(progress);
            
            setAnimatedRange(current);

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }, [safeRange]);

    return (
        <div className="glass-card p-6 md:p-8 rounded-[2.5rem] shadow-2xl w-full">
            <div className="flex justify-between items-center mb-4 cursor-pointer" onClick={() => setIsCollapsed(!isCollapsed)}>
                <h2 className="text-xl md:text-2xl font-black flex items-center gap-3 text-white m-0 uppercase italic tracking-tighter">
                    <svg className="w-6 h-6 md:w-8 md:h-8 text-electric-mint" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    Telemetrics
                </h2>
                <div className="flex items-center gap-4">
                    {isCollapsed && (
                        <div className="text-electric-mint font-black tracking-tighter text-xl">
                            {animatedRange.toFixed(0)} <span className="text-xs uppercase">km</span>
                        </div>
                    )}
                    <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors" aria-label="Toggle Collapse">
                        {isCollapsed ? (
                            <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                        ) : (
                            <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" /></svg>
                        )}
                    </button>
                </div>
            </div>

            {!isCollapsed && (
                <div className="mt-8 animate-fade-in space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Battery Input */}
                        <div className="bg-white/[0.02] p-6 rounded-3xl flex flex-col border border-white/5 shadow-inner">
                            <label className="text-slate-500 text-[10px] uppercase tracking-widest mb-4 font-black">
                                Battery (%)
                            </label>
                            <input 
                                type="number" 
                                value={batteryPercent} 
                                onChange={(e) => setBatteryPercent(Number(e.target.value))}
                                className="w-full bg-transparent text-white text-3xl font-black focus:text-electric-mint outline-none transition-all text-left"
                            />
                        </div>

                        {/* AEC Input */}
                        <div className="bg-white/[0.02] p-6 rounded-3xl flex flex-col border border-white/5 shadow-inner">
                            <label className="text-slate-500 text-[10px] uppercase tracking-widest mb-4 font-black">
                                AEC (Wh/km)
                            </label>
                            <input 
                                type="number" 
                                value={aec} 
                                onChange={(e) => setAec(Number(e.target.value))}
                                className="w-full bg-transparent text-white text-3xl font-black focus:text-electric-mint outline-none transition-all text-left"
                            />
                        </div>

                        {/* Dash Range Input */}
                        <div className="bg-white/[0.02] p-6 rounded-3xl flex flex-col border border-white/5 shadow-inner">
                            <label className="text-slate-500 text-[10px] uppercase tracking-widest mb-4 font-black">
                                Dash (km)
                            </label>
                            <input 
                                type="number" 
                                value={dashRange} 
                                onChange={(e) => setDashRange(Number(e.target.value))}
                                className="w-full bg-transparent text-white text-3xl font-black focus:text-electric-mint outline-none transition-all text-left"
                            />
                        </div>
                    </div>

                    <div className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-electric-mint/20 to-transparent rounded-[2rem] blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                        <div className="relative bg-white/[0.02] p-8 rounded-[2rem] border border-white/5 flex flex-col items-center justify-center overflow-hidden">
                            {batteryPercent <= 20 && (
                                <div className="w-full bg-soft-coral/10 border border-soft-coral/20 text-soft-coral text-[11px] font-black uppercase tracking-widest py-3 rounded-2xl mb-6 text-center animate-pulse">
                                    ⚠️ Critically Low Range Logic
                                </div>
                            )}
                            <div className="text-slate-500 text-[10px] md:text-xs mb-2 font-black tracking-[0.3em] uppercase opacity-70">Calculated Safe Range</div>
                            <div className="text-6xl md:text-8xl font-[900] text-white tracking-tighter flex items-baseline gap-2">
                                {animatedRange.toFixed(0)}
                                <span className="text-xl md:text-2xl font-black text-electric-mint uppercase italic">km</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
