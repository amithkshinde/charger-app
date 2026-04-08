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
        <div className="glass-card p-6 rounded-[2.5rem] shadow-2xl relative overflow-hidden transition-all">
            {/* Background Accent */}
            <div className={`absolute -right-12 -top-12 w-48 h-48 rounded-full blur-[80px] opacity-20 ${isOutOfSafeRange ? 'bg-soft-coral' : 'bg-electric-mint'}`}></div>

            <div className="flex flex-col gap-6 relative z-10">
                <div className="flex justify-between items-center">
                    <h2 className="text-[10px] uppercase tracking-[0.3em] font-black text-slate-500 italic">
                        Proximity Alert
                    </h2>
                    {userLoc && (
                        <div className="flex items-center gap-2">
                            <span className="relative flex h-2 w-2">
                                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isOutOfSafeRange ? 'bg-soft-coral' : 'bg-electric-mint'}`}></span>
                                <span className={`relative inline-flex rounded-full h-2 w-2 ${isOutOfSafeRange ? 'bg-soft-coral' : 'bg-electric-mint'}`}></span>
                            </span>
                            <span className="text-[10px] font-black text-white/50 uppercase tracking-widest">LIVE</span>
                        </div>
                    )}
                </div>

                {userLoc ? (
                    nearest ? (
                        <a
                            href={`https://www.google.com/maps/dir/?api=1&origin=${userLoc[0]},${userLoc[1]}&destination=${nearest.lat},${nearest.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-white/5 p-6 rounded-3xl border border-white/5 hover:bg-white/10 active:scale-[0.98] transition-all group block shadow-inner"
                        >
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                                <div className="space-y-1">
                                    <div className="text-2xl font-black text-white tracking-tighter uppercase italic group-hover:text-electric-mint transition-colors">
                                        {nearest.name}
                                    </div>
                                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                        {nearest.capacity || 'CCS2 FAST'} • 
                                        <span className="text-white/40">{nearest.source === 'local' ? 'SAVED POOL' : 'NETWORK LIVE'}</span>
                                    </div>
                                </div>
                                <div className="text-left sm:text-right">
                                    <div className={`text-5xl font-[900] tracking-tighter transition-all ${isOutOfSafeRange ? 'text-soft-coral' : 'text-white'}`}>
                                        {minDistance.toFixed(0)}
                                        <span className="text-xl font-black uppercase italic ml-1 opacity-50">km</span>
                                    </div>
                                    {isOutOfSafeRange && (
                                        <div className="text-soft-coral text-[10px] font-black mt-1 uppercase tracking-widest">RANGE WARNING</div>
                                    )}
                                </div>
                            </div>
                        </a>
                    ) : (
                        <div className="p-8 text-center text-slate-700 font-black italic uppercase tracking-widest text-xs">
                            No chargers in your local pool
                        </div>
                    )
                ) : (
                    <div className="text-white flex items-center justify-center gap-4 p-8 bg-white/5 rounded-3xl animate-pulse">
                        <div className="h-4 w-4 rounded-full bg-electric-mint"></div>
                        <span className="text-xs font-black uppercase tracking-[0.2em] italic">Acquiring Satellites...</span>
                    </div>
                )}
            </div>
        </div>
    )
}
