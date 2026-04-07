import { getDistance } from '../utils/distance';
import type { Charger } from './EvMapView';

export default function NearestCharger({ userLoc, chargers }: { userLoc: [number, number] | null, chargers: Charger[] }) {
    let nearest: Charger | null = null;
    let minDistance = Infinity;

    if (userLoc && chargers.length > 0) {
        for (const c of chargers) {
            const dist = getDistance(userLoc[0], userLoc[1], c.lat, c.lng);
            if (dist < minDistance) {
                minDistance = dist;
                nearest = c;
            }
        }
    }

    const isOutOfSafeRange = minDistance > 180;

    return (
        <div className={`p-8 rounded-3xl shadow-2xl border-2 mb-6 transition-all relative overflow-hidden ${isOutOfSafeRange ? 'bg-red-900/30 border-red-500/50' : 'bg-gradient-to-r from-sky-500/10 to-indigo-500/10 border-sky-500/30'}`}>
            <div className="flex flex-col gap-4">
                <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
                    <svg className={`w-8 h-8 ${isOutOfSafeRange ? 'text-red-400' : 'text-sky-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    Nearest Charger
                </h2>

                {userLoc ? (
                    nearest ? (
                        <a
                            href={`https://www.google.com/maps/dir/?api=1&origin=${userLoc[0]},${userLoc[1]}&destination=${nearest.lat},${nearest.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-950/60 hover:bg-slate-800/80 active:scale-[0.99] p-6 rounded-2xl border border-white/5 cursor-pointer transition-all shadow-lg group"
                        >
                            <div className="absolute top-4 right-4 sm:top-auto sm:bottom-4 md:right-6 bg-emerald-500/20 text-emerald-400 p-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                            </div>

                            <div>
                                <div className="font-extrabold text-white text-2xl tracking-tight">{nearest.name}</div>
                                <div className="text-slate-400 text-lg mt-1 font-medium flex items-center gap-2">
                                    <span>{nearest.capacity || 'Fast Charger'} • {nearest.source === 'local' ? 'Saved' : 'OCM Live'}</span>
                                    <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full border border-slate-700">Tap to Navigate</span>
                                </div>
                            </div>
                            <div className="text-left sm:text-right pr-6 sm:pr-8">
                                <div className={`text-5xl font-black tracking-tighter transition-colors ${isOutOfSafeRange ? 'text-red-400 group-hover:text-red-300' : 'bg-gradient-to-br from-indigo-400 to-sky-400 bg-clip-text text-transparent group-hover:from-sky-300 group-hover:to-emerald-300'}`}>
                                    {minDistance.toFixed(1)} <span className={`text-xl font-medium ${isOutOfSafeRange ? 'text-red-300' : 'text-slate-400'}`}>km</span>
                                </div>
                                {isOutOfSafeRange && <div className="text-red-400 text-sm font-bold mt-2 uppercase tracking-wider">Beyond Safe Range!</div>}
                            </div>
                        </a>
                    ) : (
                        <div className="text-slate-400 text-lg">No saved chargers found.</div>
                    )
                ) : (
                    <div className="text-slate-300 flex items-center gap-3 mt-2 p-6 bg-slate-900/40 rounded-2xl text-xl">
                        <span className="relative flex h-4 w-4">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-4 w-4 bg-sky-500"></span>
                        </span>
                        Acquiring GPS Signal...
                    </div>
                )}
            </div>
        </div>
    )
}
