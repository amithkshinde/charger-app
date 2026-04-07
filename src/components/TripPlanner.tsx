import { useState } from 'react';
import type { Charger } from './EvMapView';
import { getDistance } from '../utils/distance';

export default function TripPlanner({ userLoc, chargers }: { userLoc: [number, number] | null, chargers: Charger[] }) {
    const [destination, setDestination] = useState('');
    const [loading, setLoading] = useState(false);
    const [tripResult, setTripResult] = useState<{ distance: number, needsCharge: boolean, bufferMsg: string, suggestedStop: Charger | null, finalDestLabel: string } | null>(null);

    const handlePlanTrip = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!destination.trim() || !userLoc) return;

        setLoading(true);
        setTripResult(null);

        try {
            // Free Nominatim Geocoder fetching automatically.
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(destination)}`, {
                headers: { 'User-Agent': 'PunchEv-Dashboard-App/1.0' }
            });
            const data = await res.json();

            if (!data || data.length === 0) {
                alert('Could not find that destination. Try adding a city/state.');
                setLoading(false);
                return;
            }

            const destLat = parseFloat(data[0].lat);
            const destLng = parseFloat(data[0].lon);
            const matchedName = data[0].display_name.split(',')[0];

            const resolvedDist = getDistance(userLoc[0], userLoc[1], destLat, destLng);
            // Math.round logic
            const distStr = Math.round(resolvedDist);

            let suggestedStop = null;
            const needsCharge = resolvedDist > 180;

            if (needsCharge && chargers.length > 0) {
                const reachableChargers = chargers.map(c => ({
                    ...c,
                    distToUser: getDistance(userLoc[0], userLoc[1], c.lat, c.lng)
                })).filter(c => c.distToUser > 50 && c.distToUser <= 180);

                reachableChargers.sort((a, b) => b.distToUser - a.distToUser);

                if (reachableChargers.length > 0) {
                    suggestedStop = reachableChargers[0];
                } else {
                    let nearestC = null;
                    let minD = Infinity;
                    chargers.forEach(c => {
                        const d = getDistance(userLoc[0], userLoc[1], c.lat, c.lng);
                        if (d < minD) { nearestC = c; minD = d; }
                    });
                    suggestedStop = nearestC;
                }
            }

            setTripResult({
                distance: distStr,
                needsCharge,
                bufferMsg: "Assumes 20% battery safety margin on arrival at next point.",
                suggestedStop,
                finalDestLabel: matchedName
            });

        } catch (err) {
            alert('Error fetching route data.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-slate-900/80 p-6 md:p-8 rounded-3xl shadow-lg border-2 border-slate-700/50 backdrop-blur-sm">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 text-slate-100">
                <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
                Plan Your Trip
            </h2>

            <form onSubmit={handlePlanTrip} className="space-y-6">
                <div className="flex flex-col gap-2">
                    <label className="block text-sm font-medium text-slate-400">Where do you want to go?</label>
                    <input
                        type="text"
                        placeholder="e.g. Mahabaleshwar or Bangalore Airport"
                        className="w-full bg-slate-950 border-2 border-slate-700 rounded-2xl px-6 py-4 text-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/30 transition-all font-medium"
                        value={destination}
                        onChange={(e) => setDestination(e.target.value)}
                        required
                        disabled={loading}
                    />
                </div>

                <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white text-xl font-bold py-5 px-6 rounded-2xl transition-all shadow-xl shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-[0.98]"
                    disabled={!userLoc || loading}
                >
                    {!userLoc ? "Waiting for GPS..." : (loading ? "Geocoding Destination..." : "Find Route")}
                </button>
            </form>

            {tripResult && (
                <div className={`mt-8 p-6 rounded-2xl border-2 ${tripResult.needsCharge ? 'bg-rose-950/40 border-rose-500/30' : 'bg-emerald-950/40 border-emerald-500/30'} flex flex-col gap-4 transition-all shadow-inner`}>
                    <div className="flex flex-col gap-4">
                        <div className="flex items-start gap-4">
                            {tripResult.needsCharge ? (
                                <svg className="w-10 h-10 text-rose-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            ) : (
                                <svg className="w-10 h-10 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            )}
                            <div>
                                <h3 className={`font-black text-2xl tracking-tight ${tripResult.needsCharge ? 'text-rose-100' : 'text-emerald-100'}`}>
                                    {tripResult.needsCharge ? 'Charging Stop Required' : 'Trip Attainable Without Stopping'}
                                </h3>
                                <p className={`text-lg mt-2 mb-3 font-medium ${tripResult.needsCharge ? 'text-rose-200/80' : 'text-emerald-200/80'}`}>
                                    {tripResult.finalDestLabel} is approx <strong className="text-white">{tripResult.distance} km</strong> away.
                                </p>
                                <div className="text-sm text-slate-300 bg-slate-900/80 p-3 rounded-xl inline-block border border-slate-700">
                                    <span className="font-bold text-slate-100">Safety Policy:</span> {tripResult.bufferMsg}
                                </div>
                            </div>
                        </div>

                        {tripResult.needsCharge && tripResult.suggestedStop && (
                            <div className="mt-4 p-5 bg-slate-950/80 border-2 border-emerald-500/40 rounded-2xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 text-emerald-500/10 transform group-hover:scale-110 transition-transform">
                                    <svg className="w-24 h-24 rotate-12" fill="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                </div>
                                <h4 className="text-emerald-400 font-bold mb-2 text-sm uppercase tracking-widest">Suggested Pit Stop</h4>
                                <div className="text-white font-black text-3xl tracking-tight mb-2 relative z-10">{tripResult.suggestedStop.name}</div>
                                <div className="text-slate-400 text-lg font-medium relative z-10">Available Power: {tripResult.suggestedStop.capacity || 'Fast Charging'}</div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
