import { useMemo, useState } from 'react';
import type { Charger } from './EvMapView';
import { getDistance } from '../utils/distance';

interface ChargerListProps {
    userLoc: [number, number] | null;
    chargers: Charger[];
    safeRange: number;
    onAddCharger: (newCharger: Omit<Charger, 'id' | 'source'>) => void;
}

export default function ChargerList({ userLoc, chargers, safeRange, onAddCharger }: ChargerListProps) {
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        lat: '',
        lng: '',
        capacity: '',
    });

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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onAddCharger({
            name: formData.name,
            lat: parseFloat(formData.lat),
            lng: parseFloat(formData.lng),
            capacity: formData.capacity,
        });
        setFormData({ name: '', lat: '', lng: '', capacity: '' });
        setShowForm(false);
    };

    return (
        <div className="glass-card p-6 md:p-8 rounded-[2.5rem] shadow-2xl w-full transition-all">
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-xl md:text-2xl font-black flex items-center gap-3 text-white m-0 uppercase italic tracking-tighter">
                    <svg className="w-6 h-6 md:w-8 md:h-8 text-electric-mint" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                    Charger Pool
                </h2>
                <button 
                    onClick={() => setShowForm(!showForm)}
                    className={`btn-automotive text-xs font-black uppercase tracking-widest transition-all ${showForm ? 'bg-soft-coral/10 text-soft-coral border border-soft-coral/20' : 'bg-white/10 text-white border border-white/10'}`}
                >
                    {showForm ? 'DISCARD' : '+ ADD NEW'}
                </button>
            </div>

            {showForm && (
                <form onSubmit={handleSubmit} className="bg-black/40 p-6 rounded-3xl border border-white/5 mb-8 animate-fade-in space-y-6 shadow-inner">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-slate-500 text-[10px] uppercase tracking-widest font-black ml-2">Location Name</label>
                            <input 
                                required
                                value={formData.name}
                                onChange={e => setFormData({...formData, name: e.target.value})}
                                placeholder="E.G. ZEON MALL HUB" 
                                className="w-full bg-white/[0.03] text-white p-4 rounded-2xl border border-white/5 outline-none focus:border-electric-mint transition-all"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-slate-500 text-[10px] uppercase tracking-widest font-black ml-2">Charger Type</label>
                            <input 
                                required
                                value={formData.capacity}
                                onChange={e => setFormData({...formData, capacity: e.target.value})}
                                placeholder="E.G. 60KW CCS2" 
                                className="w-full bg-white/[0.03] text-white p-4 rounded-2xl border border-white/5 outline-none focus:border-electric-mint transition-all"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-slate-500 text-[10px] uppercase tracking-widest font-black ml-2">Latitude</label>
                            <input 
                                required
                                type="number" step="any"
                                value={formData.lat}
                                onChange={e => setFormData({...formData, lat: e.target.value})}
                                placeholder="15.1234" 
                                className="w-full bg-white/[0.03] text-white p-4 rounded-2xl border border-white/5 outline-none focus:border-electric-mint transition-all"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-slate-500 text-[10px] uppercase tracking-widest font-black ml-2">Longitude</label>
                            <input 
                                required
                                type="number" step="any"
                                value={formData.lng}
                                onChange={e => setFormData({...formData, lng: e.target.value})}
                                placeholder="75.1234" 
                                className="w-full bg-white/[0.03] text-white p-4 rounded-2xl border border-white/5 outline-none focus:border-electric-mint transition-all"
                            />
                        </div>
                    </div>
                    <button type="submit" className="w-full btn-automotive bg-electric-mint text-midnight-deep font-black uppercase tracking-widest text-sm italic shadow-xl">
                        REGISTER CHARGER
                    </button>
                </form>
            )}

            {shortlistedChargersList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 opacity-30">
                    <svg className="w-16 h-16 mb-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                    <p className="text-slate-500 italic text-[10px] font-black uppercase tracking-widest">Awaiting pool injection...</p>
                </div>
            ) : (
                <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-4 custom-scrollbar">
                    {shortlistedChargersList.map(charger => {
                        const isReachable = charger.distance <= safeRange;
                        return (
                            <a 
                                key={charger.id} 
                                href={`https://www.google.com/maps/dir/?api=1&origin=${userLoc![0]},${userLoc![1]}&destination=${charger.lat},${charger.lng}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`p-6 rounded-[2rem] flex items-center justify-between border transition-all animate-fade-in group shadow-sm ${isReachable ? 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/10' : 'bg-soft-coral/5 border-soft-coral/10 grayscale opacity-60'}`}
                            >
                                <div className="space-y-1 max-w-[60%]">
                                    <h3 className={`font-black uppercase italic tracking-tighter truncate transition-colors ${isReachable ? 'text-white' : 'text-soft-coral group-hover:text-red-400'}`}>{charger.name}</h3>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{charger.capacity}</p>
                                </div>
                                <div className="text-right flex flex-col items-end gap-2">
                                    <div className="text-xl font-black text-white tracking-tighter">
                                        {charger.distance.toFixed(0)}
                                        <span className="text-[10px] font-black uppercase italic text-slate-500 ml-1">KM</span>
                                    </div>
                                    {isReachable ? (
                                        <div className="text-electric-mint text-[9px] font-black uppercase tracking-widest px-3 py-1 bg-electric-mint/10 rounded-full border border-electric-mint/20">
                                            REACHABLE
                                        </div>
                                    ) : (
                                        <div className="text-soft-coral text-[9px] font-black uppercase tracking-widest px-3 py-1 bg-soft-coral/10 rounded-full border border-soft-coral/20">
                                            OUT OF RANGE
                                        </div>
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
