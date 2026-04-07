import { useMemo } from 'react';
import type { Charger } from './EvMapView';
import { getDistance } from '../utils/distance';

interface ChargerListProps {
    userLoc: [number, number] | null;
    chargers: Charger[];
    safeRange: number;
}

export default function ChargerList({ userLoc, chargers, safeRange }: ChargerListProps) {
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

    return (
        <div className="bg-slate-900/80 p-6 md:p-8 rounded-3xl shadow-2xl border-2 border-slate-700/50 backdrop-blur-md mb-6 transition-all w-full">
            <h2 className="text-xl md:text-2xl font-bold flex items-center gap-3 text-white m-0 mb-6">
                <svg className="w-6 h-6 md:w-8 md:h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                My Shortlisted Chargers
            </h2>

            {shortlistedChargersList.length === 0 ? (
                <p className="text-slate-500 italic text-sm text-center py-6">Locating chargers...</p>
            ) : (
                <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-2 custom-scrollbar pb-6">
                    {shortlistedChargersList
                        .map(charger => {
                        const isReachable = charger.distance <= safeRange;
                        return (
                            <a 
                                key={charger.id} 
                                href={`https://www.google.com/maps/dir/?api=1&origin=${userLoc![0]},${userLoc![1]}&destination=${charger.lat},${charger.lng}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`p-4 rounded-xl flex items-center justify-between border transition-all cursor-pointer group ${isReachable ? 'bg-slate-800/60 border-slate-700/50 hover:bg-slate-700/80 hover:border-indigo-500/50' : 'bg-red-900/10 border-red-900/30 opacity-75 grayscale'}`}
                            >
                                <div className="flex flex-col overflow-hidden max-w-[65%]">
                                    <span className={`font-semibold line-clamp-1 transition-colors ${isReachable ? 'text-white group-hover:text-indigo-400' : 'text-red-300'}`}>{charger.name}</span>
                                    <span className="text-slate-400 text-sm mt-1">{charger.capacity}</span>
                                </div>
                                <div className="flex flex-col items-end whitespace-nowrap ml-4">
                                    <span className="font-bold text-slate-300">
                                        {charger.distance.toFixed(1)} km
                                    </span>
                                    {isReachable ? (
                                        <span className="text-indigo-400 text-xs font-bold bg-indigo-400/10 px-2 py-1 rounded mt-1 flex items-center gap-1 group-hover:bg-indigo-400/20 transition-colors">
                                            Navigate ↗
                                        </span>
                                    ) : (
                                        <span className="text-red-400 text-xs font-bold bg-red-400/10 px-2 py-1 rounded mt-1">
                                            Unreachable
                                        </span>
                                    )}
                                </div>
                            </a>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
