import { useState } from 'react';
import type { Charger } from './EvMapView';
import { getDistance } from '../utils/distance';
import { getBearing, getCrossTrackDistance } from '../utils/bearing';

interface PlanTripProps {
    userLoc: [number, number] | null;
    chargers: Charger[];
    batteryPercent: number;
    aec: number;
    safeRange: number; // Global Safe Range based on current battery
}

type Waypoint = {
    type: 'start' | 'stop' | 'destination';
    name: string;
    lat: number;
    lng: number;
    distanceFromPrev: number;
    cumulativeDistance: number;
    arrivalSOC: number;
    chargeTimeMins?: number;
    chargerData?: Charger;
}

export default function PlanTrip({ userLoc, chargers, batteryPercent, aec, safeRange }: PlanTripProps) {
    const [destName, setDestName] = useState<string>('');
    const [isCalculating, setIsCalculating] = useState(false);
    
    // Route state
    const [routeError, setRouteError] = useState<string | null>(null);
    const [itinerary, setItinerary] = useState<Waypoint[]>([]);

    const calculateRoute = async () => {
        if (!userLoc) {
            setRouteError("Need current location.");
            return;
        }
        if (!destName.trim()) {
            setRouteError("Please enter a destination name.");
            return;
        }

        setIsCalculating(true);
        setRouteError(null);
        setItinerary([]);

        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(destName)}&format=json&limit=1`);
            const data = await res.json();

            if (!data || data.length === 0) {
                throw new Error("Destination not found. Try adding a city name.");
            }

            const destLat = parseFloat(data[0].lat);
            const destLng = parseFloat(data[0].lon);
            const verifiedDestName = data[0].display_name.split(',')[0];

            let currentLat = userLoc[0];
            let currentLng = userLoc[1];
            let currentSOC = batteryPercent;
            let currentCumulative = 0;
            
            const availableEnergyFull = 32.5; 
            const maxRawRange = aec > 0 ? (availableEnergyFull * 1000) / aec : 0;
            const absoluteMaxSafeRange = maxRawRange * 0.8;

            let safeRangeRemaining = safeRange; 

            let stops: Waypoint[] = [];
            stops.push({ 
                type: 'start', 
                name: 'Current Location', 
                lat: currentLat, 
                lng: currentLng, 
                distanceFromPrev: 0, 
                cumulativeDistance: 0, 
                arrivalSOC: currentSOC 
            });

            let iterations = 0;
            const MAX_ITERATIONS = 10;

            while (iterations < MAX_ITERATIONS) {
                iterations++;
                const distToDest = getDistance(currentLat, currentLng, destLat, destLng);
                
                if (distToDest <= safeRangeRemaining) {
                    const energyUsed = (distToDest * aec) / 1000;
                    const destArrivalSOC = Math.max(0, currentSOC - ((energyUsed / availableEnergyFull) * 100));
                    
                    stops.push({ 
                        type: 'destination', 
                        name: verifiedDestName, 
                        lat: destLat, 
                        lng: destLng, 
                        distanceFromPrev: distToDest, 
                        cumulativeDistance: currentCumulative + distToDest, 
                        arrivalSOC: destArrivalSOC 
                    });
                    break;
                }

                // Filter chargers using Highway Path Cross-Track math (5km limit)
                const localChargers = chargers.filter(c => c.source === 'local' && c.lat && c.lng);
                
                let viableChargers = localChargers.map(c => {
                    const dist = getDistance(currentLat, currentLng, c.lat, c.lng);
                    const dtTrack = Math.abs(getCrossTrackDistance(currentLat, currentLng, destLat, destLng, c.lat!, c.lng!));
                    const bearToDest = getBearing(currentLat, currentLng, destLat, destLng);
                    const bearToCharger = getBearing(currentLat, currentLng, c.lat!, c.lng!);
                    let angleDiff = Math.abs(bearToDest - bearToCharger) % 360;
                    if (angleDiff > 180) angleDiff = 360 - angleDiff;
                    
                    return { charger: c, distance: dist, crossTrack: dtTrack, angleDiff };
                });

                viableChargers = viableChargers.filter(c => 
                    c.distance > 40 && 
                    c.distance <= safeRangeRemaining && 
                    c.crossTrack <= 5 && 
                    c.angleDiff < 90 
                );

                if (viableChargers.length === 0) {
                    throw new Error("NO CHARGERS FOUND ON THIS ROUTE. Please check your shortlisted list.");
                }

                const targetHop = Math.min(140, safeRangeRemaining - 10);
                viableChargers.sort((a, b) => Math.abs(a.distance - targetHop) - Math.abs(b.distance - targetHop));

                const optimalStop = viableChargers[0];
                const energyUsed = (optimalStop.distance * aec) / 1000;
                const arrivalPercent = Math.max(0, currentSOC - ((energyUsed / availableEnergyFull) * 100));
                
                const energyNeededTo80 = Math.max(0, (0.80 - arrivalPercent / 100) * availableEnergyFull);
                const chargeTime = Math.round((energyNeededTo80 / 25) * 60);

                currentCumulative += optimalStop.distance;

                stops.push({
                    type: 'stop',
                    name: optimalStop.charger.name,
                    lat: optimalStop.charger.lat!,
                    lng: optimalStop.charger.lng!,
                    distanceFromPrev: optimalStop.distance,
                    cumulativeDistance: currentCumulative,
                    arrivalSOC: arrivalPercent,
                    chargeTimeMins: chargeTime,
                    chargerData: optimalStop.charger
                });

                currentLat = optimalStop.charger.lat!;
                currentLng = optimalStop.charger.lng!;
                currentSOC = 80; 
                safeRangeRemaining = absoluteMaxSafeRange; 
            }

            setItinerary(stops);

        } catch (err: any) {
            setRouteError(err.message);
        } finally {
            setIsCalculating(false);
        }
    };

    const generateGoogleMapsURL = () => {
        if (itinerary.length < 2 || !userLoc) return '#';
        const origin = `${userLoc[0]},${userLoc[1]}`;
        const destinationPoint = itinerary[itinerary.length - 1];
        const dest = `${destinationPoint.lat},${destinationPoint.lng}`;
        const midStops = itinerary.filter(i => i.type === 'stop');
        let waypointsQuery = '';
        if (midStops.length > 0) {
            waypointsQuery = `&waypoints=${midStops.map(s => `${s.lat},${s.lng}`).join('|')}`;
        }
        return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}${waypointsQuery}&travelmode=driving`;
    };

    return (
        <div className="glass-card p-6 md:p-8 rounded-[2.5rem] shadow-2xl w-full">
            <h2 className="text-xl md:text-2xl font-black flex items-center gap-3 text-white m-0 uppercase italic tracking-tighter mb-8">
                <svg className="w-6 h-6 md:w-8 md:h-8 text-electric-mint" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
                Trip Planner
            </h2>

            <div className="bg-white/[0.02] p-6 rounded-3xl border border-white/5 mb-8 space-y-4">
                <div className="flex-1 w-full">
                    <label className="text-slate-500 text-[10px] uppercase tracking-widest mb-3 block font-black">Destination</label>
                    <input 
                        type="text" 
                        placeholder="ENTER CITY / LANDMARK"
                        value={destName} 
                        onChange={(e) => setDestName(e.target.value)}
                        className="w-full bg-transparent text-white text-xl font-black focus:text-electric-mint outline-none transition-all placeholder:text-slate-700"
                        onKeyDown={(e) => e.key === 'Enter' && calculateRoute()}
                    />
                </div>
                <button 
                    onClick={calculateRoute}
                    disabled={isCalculating || !destName.trim()}
                    className="w-full btn-automotive bg-electric-mint/10 border border-electric-mint/20 text-electric-mint hover:bg-electric-mint/20 text-sm italic tracking-widest uppercase disabled:opacity-30 disabled:pointer-events-none"
                >
                    {isCalculating ? 'CALCULATING PATH...' : 'PLAN ROUTE'}
                </button>
            </div>

            <div className="space-y-6">
                {routeError && (
                    <div className="bg-soft-coral/10 text-soft-coral p-6 rounded-3xl border border-soft-coral/20 font-black text-xs uppercase tracking-widest text-center animate-pulse">
                        {routeError}
                    </div>
                )}

                {itinerary.length === 0 && !routeError && !isCalculating && (
                    <div className="text-slate-600 flex flex-col items-center justify-center font-black italic mt-12 text-center px-8 uppercase tracking-widest text-[10px] opacity-50">
                        <svg className="w-12 h-12 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        Ready for highway analysis
                    </div>
                )}
                
                {itinerary.length > 0 && (
                    <div className="space-y-4 animate-fade-in relative pl-8 pb-4">
                        <div className="absolute left-[15px] top-6 bottom-6 w-[2px] bg-gradient-to-b from-electric-mint via-slate-800 to-transparent"></div>
                        
                        {itinerary.map((point, idx) => (
                            <div key={idx} className="relative group">
                                <div className={`absolute -left-[31px] top-2 w-4 h-4 rounded-full border-4 border-midnight-deep z-10 transition-transform group-hover:scale-125
                                    ${point.type === 'start' ? 'bg-sky-400' : point.type === 'stop' ? 'bg-amber-400' : 'bg-electric-mint'}
                                `}></div>
                                
                                <div className="bg-white/[0.03] p-5 rounded-3xl border border-white/5 transition-all hover:bg-white/[0.06] hover:border-white/10">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-black text-white uppercase italic tracking-tighter">{point.name}</h3>
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                            {point.cumulativeDistance > 0 ? `${point.cumulativeDistance.toFixed(0)} km` : 'START'}
                                        </span>
                                    </div>
                                    
                                    {point.type === 'start' && (
                                        <div className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                            ENERGY: <span className="text-white">{point.arrivalSOC.toFixed(0)}%</span>
                                        </div>
                                    )}
                                    
                                    {point.type === 'stop' && (
                                        <div className="space-y-3">
                                            <div className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                                ARRIVAL: <span className="text-white">{point.arrivalSOC.toFixed(0)}%</span>
                                            </div>
                                            <div className="bg-electric-mint/10 border border-electric-mint/20 text-electric-mint text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl inline-flex items-center gap-2">
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                Charge {point.chargeTimeMins}m to 80%
                                            </div>
                                        </div>
                                    )}
                                    
                                    {point.type === 'destination' && (
                                        <div className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                            RESERVE: <span className="text-electric-mint">{point.arrivalSOC.toFixed(0)}%</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {itinerary.length > 0 && (
                     <a 
                        href={generateGoogleMapsURL()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-automotive w-full bg-electric-mint text-midnight-deep text-sm font-black italic tracking-widest uppercase shadow-[0_0_40px_rgba(45,212,191,0.2)] hover:scale-[1.02] active:scale-95 transition-all"
                     >
                         ULTIMATE NAVIGATION MODE
                     </a>
                )}
            </div>
        </div>
    );
}
