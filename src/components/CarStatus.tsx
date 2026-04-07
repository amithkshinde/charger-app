import { useState, useMemo } from 'react';
import type { Charger } from './EvMapView';
import { getDistance } from '../utils/distance';

interface CarStatusProps {
    userLoc: [number, number] | null;
    chargers: Charger[];
    batteryPercent: number;
    setBatteryPercent: (val: number) => void;
    aec: number;
    setAec: (val: number) => void;
}

export default function CarStatus({ userLoc, chargers, batteryPercent, setBatteryPercent, aec, setAec }: CarStatusProps) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [dashRange, setDashRange] = useState<number>(240); // For reference only

    // Math calculation logic
    // 1. Calculated Raw Range: (Available Battery kWh * 1000) / AEC
    const availableEnergyTotal = 32.5 * (batteryPercent / 100);
    const calculatedRawRange = aec > 0 ? (availableEnergyTotal * 1000) / aec : 0;

    // 2. The 'Reality Check' Rule: Pick the lower one between Dash and Calculated
    const startingRange = dashRange > 0 ? Math.min(dashRange, calculatedRawRange) : calculatedRawRange;

    // 3. The 20% Buffer Application: Safe Range = Starting Range * 0.8
    const safeRange = startingRange * 0.8;

    // Filter "Shortlisted Chargers" (source === 'local') and sort by distance
    const shortlistedChargersList = useMemo(() => {
        if (!userLoc) return [];
        
        const shortlisted = chargers.filter(c => c.source === 'local');
        
        const mapped = shortlisted.map(c => {
            if (!c.lat || !c.lng) return null;
            const dist = getDistance(userLoc[0], userLoc[1], c.lat, c.lng);
            return {
                ...c,
                distance: dist
            };
        }).filter((c): c is (Charger & { distance: number }) => c !== null);

        // Sort from Nearest to Furthest
        return mapped.sort((a, b) => a.distance - b.distance);
    }, [chargers, userLoc]);

    // Format safe range nicely
    const displaySafeRange = safeRange.toFixed(1);

    return (
        <div className="bg-slate-900/80 p-6 md:p-8 rounded-3xl shadow-2xl border-2 border-slate-700/50 backdrop-blur-md mb-6 transition-all w-full">
            <div className="flex justify-between items-center mb-2 cursor-pointer" onClick={() => setIsCollapsed(!isCollapsed)}>
                <h2 className="text-xl md:text-2xl font-bold flex items-center gap-3 text-white m-0">
                    <svg className="w-6 h-6 md:w-8 md:h-8 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    Current Status
                </h2>
                <div className="flex items-center gap-4">
                    {isCollapsed && (
                        <div className="text-emerald-400 font-black tracking-tight text-lg">
                            Safe Range: {displaySafeRange} km
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
                                className="w-full bg-slate-800 text-white font-bold px-4 py-2 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none border border-slate-600 transition-all"
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
                                className="w-full bg-slate-800 text-white font-bold px-4 py-2 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none border border-slate-600 transition-all"
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
                                className="w-full bg-slate-800 text-white font-bold px-4 py-2 rounded-xl focus:ring-2 focus:ring-slate-500 outline-none border border-slate-600 transition-all"
                            />
                        </div>
                    </div>

                    <div className="bg-emerald-900/20 p-6 rounded-2xl border border-emerald-500/30 flex flex-col items-center justify-center mb-6">
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

                    <div className="border-t border-slate-700/50 pt-6">
                        <h3 className="text-lg font-bold text-white mb-4">Shortlisted Chargers within Reach</h3>
                        
                        {shortlistedChargersList.length === 0 ? (
                            <p className="text-slate-500 italic text-sm">Locating chargers...</p>
                        ) : (
                            <div className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                                {shortlistedChargersList
                                    .filter(charger => charger.distance <= safeRange)
                                    .map(charger => {
                                    return (
                                        <a 
                                            key={charger.id} 
                                            href={`https://www.google.com/maps/dir/?api=1&origin=${userLoc![0]},${userLoc![1]}&destination=${charger.lat},${charger.lng}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="bg-slate-800/60 p-4 rounded-xl flex items-center justify-between border border-slate-700/50 hover:bg-slate-700/80 hover:border-sky-500/50 transition-all cursor-pointer group"
                                        >
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-white line-clamp-1 group-hover:text-sky-400 transition-colors">{charger.name}</span>
                                                <span className="text-slate-400 text-sm mt-1">{charger.capacity}</span>
                                            </div>
                                            <div className="flex flex-col items-end whitespace-nowrap ml-4">
                                                <span className="font-bold text-slate-300">
                                                    {charger.distance.toFixed(1)} km
                                                </span>
                                                <span className="text-sky-400 text-xs font-bold bg-sky-400/10 px-2 py-1 rounded mt-1 flex items-center gap-1 group-hover:bg-sky-400/20 transition-colors">
                                                    Navigate ↗
                                                </span>
                                            </div>
                                        </a>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
