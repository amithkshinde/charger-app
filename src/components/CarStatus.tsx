import { useState } from 'react';

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

    // Format safe range nicely
    const displaySafeRange = safeRange.toFixed(1);

    return (
        <div className="bg-slate-900/80 p-6 md:p-8 rounded-3xl shadow-2xl border-2 border-slate-700/50 backdrop-blur-md mb-6 transition-all w-full">
            <div className="flex justify-between items-center mb-2 cursor-pointer" onClick={() => setIsCollapsed(!isCollapsed)}>
                <h2 className="text-xl md:text-2xl font-bold flex items-center gap-3 text-white m-0">
                    <svg className="w-6 h-6 md:w-8 md:h-8 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    Trip Telemetrics
                </h2>
                <div className="flex items-center gap-4">
                    {isCollapsed && (
                        <div className="text-emerald-400 font-black tracking-tight text-lg">
                            Safe: {displaySafeRange} km
                        </div>
                    )}
                    <button className="text-slate-400 hover:text-white transition-colors" aria-label="Toggle Collapse">
                        {isCollapsed ? (
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        ) : (
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                        )}
                    </button>
                </div>
            </div>

            {!isCollapsed && (
                <div className="mt-6 animation-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        {/* Battery Input */}
                        <div className="bg-slate-950/50 p-5 rounded-2xl flex flex-col border border-slate-700/30">
                            <label className="text-slate-400 text-sm mb-3 font-medium">
                                Current Battery (%)
                            </label>
                            <input 
                                type="number" 
                                min="0" 
                                max="100" 
                                value={batteryPercent} 
                                onChange={(e) => setBatteryPercent(Number(e.target.value))}
                                className="w-full bg-slate-800 text-white font-bold px-4 py-2 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none border border-slate-600 transition-all text-center"
                            />
                        </div>

                        {/* AEC Input */}
                        <div className="bg-slate-950/50 p-5 rounded-2xl flex flex-col border border-slate-700/30">
                            <label className="text-slate-400 text-sm mb-3 font-medium">
                                Current AEC (Wh/km)
                            </label>
                            <input 
                                type="number" 
                                min="50" 
                                max="300" 
                                value={aec} 
                                onChange={(e) => setAec(Number(e.target.value))}
                                className="w-full bg-slate-800 text-white font-bold px-4 py-2 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none border border-slate-600 transition-all text-center"
                            />
                        </div>

                        {/* Dash Range Input */}
                        <div className="bg-slate-950/50 p-5 rounded-2xl flex flex-col border border-slate-700/30">
                            <label className="text-slate-400 text-sm mb-3 font-medium">
                                Dash Range (km)
                            </label>
                            <input 
                                type="number" 
                                min="0" 
                                value={dashRange} 
                                onChange={(e) => setDashRange(Number(e.target.value))}
                                className="w-full bg-slate-800 text-white font-bold px-4 py-2 rounded-xl focus:ring-2 focus:ring-slate-500 outline-none border border-slate-600 transition-all text-center"
                            />
                        </div>
                    </div>

                    <div className="bg-emerald-900/20 p-6 rounded-2xl border border-emerald-500/30 flex flex-col items-center justify-center">
                        {batteryPercent <= 20 && (
                            <div className="w-full bg-red-900/40 border border-red-500/50 text-red-400 font-bold p-3 rounded-xl mb-4 text-center shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                                ⚠️ CRITICAL: Battery below safety buffer. Charge immediately!
                            </div>
                        )}
                        <div className="text-emerald-400/80 text-lg md:text-xl mb-1 font-bold tracking-wide uppercase text-center mt-2">Safe Reachable Range (with 20% Buffer)</div>
                        <div className="text-5xl md:text-6xl font-black text-emerald-400 tracking-tighter text-center">
                            {displaySafeRange} <span className="text-2xl font-bold">km</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
