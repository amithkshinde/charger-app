import { useState, useMemo } from 'react';
import type { Charger } from './EvMapView';
import { getDistance } from '../utils/distance';

interface PlanTripProps {
    userLoc: [number, number] | null;
    chargers: Charger[];
    batteryPercent: number;
    aec: number;
    safeRange: number;
}

export default function PlanTrip({ userLoc, chargers, batteryPercent, aec, safeRange }: PlanTripProps) {
    const [destName, setDestName] = useState<string>('');
    const [destDist, setDestDist] = useState<number>(100);

    const result = useMemo(() => {
        if (!userLoc || destDist <= 0) return null;

        if (destDist <= safeRange) {
            return { type: 'direct' };
        }

        // Needs a stop
        const localChargers = chargers.filter(c => c.source === 'local');
        
        // Map distance
        const mapped = localChargers.map(c => {
            if (!c.lat || !c.lng) return null;
            const dist = getDistance(userLoc[0], userLoc[1], c.lat, c.lng);
            return { ...c, distance: dist };
        }).filter((c): c is (Charger & { distance: number }) => c !== null);

        // Find chargers roughly 120km to 160km away
        const viableStops = mapped.filter(c => c.distance >= 120 && c.distance <= 160);

        if (viableStops.length === 0) {
            return { type: 'no_charger' };
        }

        // Find the one closest to the 140km optimal point to minimize multiple stops
        viableStops.sort((a, b) => Math.abs(a.distance - 140) - Math.abs(b.distance - 140));
        
        const bestStop = viableStops[0];
        
        // Estimate arrival battery at the stop
        const energyUsed = (bestStop.distance * aec) / 1000;
        const arrivalPercent = Math.max(0, batteryPercent - ((energyUsed / 35) * 100));

        return { type: 'stop', stop: bestStop, arrivalPercent };

    }, [userLoc, chargers, safeRange, destDist, batteryPercent, aec]);

    return (
        <div className="bg-slate-900/80 p-6 md:p-8 rounded-3xl shadow-2xl border-2 border-slate-700/50 backdrop-blur-md mb-6 transition-all w-full">
            <h2 className="text-xl md:text-2xl font-bold flex items-center gap-3 text-white m-0 mb-6">
                <svg className="w-6 h-6 md:w-8 md:h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
                Smart Co-Pilot
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-950/40 p-4 rounded-xl flex flex-col border border-slate-700/30">
                    <label className="text-slate-400 text-xs mb-1 font-medium">Destination Name</label>
                    <input 
                        type="text" 
                        placeholder="e.g. Goa"
                        value={destName} 
                        onChange={(e) => setDestName(e.target.value)}
                        className="w-full bg-transparent text-white font-bold outline-none border-b border-slate-600 focus:border-emerald-500 pb-1"
                    />
                </div>
                <div className="bg-slate-950/40 p-4 rounded-xl flex flex-col border border-slate-700/30">
                    <label className="text-slate-400 text-xs mb-1 font-medium">Distance (km)</label>
                    <input 
                        type="number" min="1" 
                        value={destDist} 
                        onChange={(e) => setDestDist(Number(e.target.value))}
                        className="w-full bg-transparent text-emerald-400 font-bold outline-none border-b border-slate-600 focus:border-emerald-500 pb-1"
                    />
                </div>
            </div>

            <div className="p-6 rounded-2xl border mb-4 bg-slate-950 flex flex-col justify-center min-h-[160px]">
                {!result && (
                    <div className="text-slate-500 text-center font-medium">Enter destination tracking details above to calculate route.</div>
                )}
                
                {result?.type === 'direct' && (
                    <div className="text-center animation-fade-in flex flex-col items-center">
                        <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mb-4">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <h3 className="text-2xl font-black text-emerald-400 tracking-tight">Direct Trip Possible!</h3>
                        <p className="text-slate-300 font-medium mt-2">No charging stops needed for this {destDist}km journey.</p>
                    </div>
                )}

                {result?.type === 'no_charger' && (
                    <div className="text-center animation-fade-in flex flex-col items-center">
                        <div className="w-16 h-16 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center mb-4">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        </div>
                        <h3 className="text-xl font-bold text-red-400">Warning: No Verified Stops</h3>
                        <p className="text-slate-400 mt-2 text-sm max-w-sm">We couldn't find a reliable saved charger in the 120km-160km optimal zone for this {destDist}km journey. Please evaluate your route carefully.</p>
                    </div>
                )}

                {result?.type === 'stop' && (
                    <div className="text-center animation-fade-in">
                        <div className="inline-block bg-sky-900/40 border border-sky-500/50 text-sky-400 font-black text-xs uppercase px-3 py-1 rounded-full mb-4 tracking-widest">
                            Optimal Stop Found
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2 leading-tight">
                            Stop at <br className="md:hidden" /><span className="text-emerald-400">{result.stop!.name}</span>
                        </h3>
                        <div className="text-lg text-slate-300 font-medium bg-slate-900/50 p-4 rounded-xl shadow-inner border border-white/5">
                            Stop after driving <span className="font-black text-white">{result.stop!.distance.toFixed(1)} km</span>.<br/>
                            Arrive with approx <span className={`font-black ${result.arrivalPercent! > 20 ? 'text-emerald-400' : 'text-red-400'}`}>{result.arrivalPercent!.toFixed(1)}%</span> battery.
                        </div>
                    </div>
                )}
            </div>
            {result?.type === 'stop' && (
                 <a 
                    href={`https://www.google.com/maps/dir/?api=1&origin=${userLoc![0]},${userLoc![1]}&destination=${result.stop!.lat},${result.stop!.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-center py-4 rounded-xl transition-colors shadow-lg"
                 >
                     Navigate to Stop ↗
                 </a>
            )}
        </div>
    );
}
