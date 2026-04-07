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

                // Filter chargers using Highway Path Cross-Track math (15km limit)
                const localChargers = chargers.filter(c => c.source === 'local' && c.lat && c.lng);
                
                let viableChargers = localChargers.map(c => {
                    const dist = getDistance(currentLat, currentLng, c.lat, c.lng);
                    const dtTrack = Math.abs(getCrossTrackDistance(currentLat, currentLng, destLat, destLng, c.lat!, c.lng!));
                    // Check if it's forward (angle check)
                    const bearToDest = getBearing(currentLat, currentLng, destLat, destLng);
                    const bearToCharger = getBearing(currentLat, currentLng, c.lat!, c.lng!);
                    let angleDiff = Math.abs(bearToDest - bearToCharger) % 360;
                    if (angleDiff > 180) angleDiff = 360 - angleDiff;
                    
                    return { charger: c, distance: dist, crossTrack: dtTrack, angleDiff };
                });

                viableChargers = viableChargers.filter(c => 
                    c.distance > 40 && 
                    c.distance <= safeRangeRemaining && 
                    c.crossTrack <= 15 && // Accounting for highway curves
                    c.angleDiff < 90 // Moving forward
                );

                if (viableChargers.length === 0) {
                    throw new Error("NO CHARGERS FOUND ON THIS ROUTE. Please check your shortlisted list.");
                }

                // Optimization: Aim for ~140km hop if available, otherwise furthest possible within safe bounds
                const targetHop = Math.min(140, safeRangeRemaining - 10);
                viableChargers.sort((a, b) => Math.abs(a.distance - targetHop) - Math.abs(b.distance - targetHop));

                const optimalStop = viableChargers[0];

                const energyUsed = (optimalStop.distance * aec) / 1000;
                const arrivalPercent = Math.max(0, currentSOC - ((energyUsed / availableEnergyFull) * 100));
                
                // Calculate time to reach 80% (assuming 25kW avg)
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
                currentSOC = 80; // Charge to 80% as per user standard
                safeRangeRemaining = absoluteMaxSafeRange; 
            }

            if (iterations === MAX_ITERATIONS) {
                throw new Error("Route is too complex (exceeded limit).");
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
        <div className="bg-slate-900/80 p-6 md:p-8 rounded-3xl shadow-2xl border-2 border-slate-700/50 backdrop-blur-md mb-6 transition-all w-full">
            <h2 className="text-xl md:text-2xl font-bold flex items-center gap-3 text-white m-0 mb-6">
                <svg className="w-6 h-6 md:w-8 md:h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
                Ultimate Trip Planner
            </h2>

            <div className="bg-slate-950/40 p-5 rounded-xl border border-slate-700/30 mb-6 flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 w-full">
                    <label className="text-slate-400 text-sm mb-2 block font-medium">Destination</label>
                    <input 
                        type="text" 
                        placeholder="e.g. Mantralayam"
                        value={destName} 
                        onChange={(e) => setDestName(e.target.value)}
                        className="w-full bg-slate-800 text-white font-bold px-4 py-3 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none border border-slate-600 transition-all shadow-inner"
                        onKeyDown={(e) => e.key === 'Enter' && calculateRoute()}
                    />
                </div>
                <button 
                    onClick={calculateRoute}
                    disabled={isCalculating || !destName.trim()}
                    className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white font-bold px-8 py-3 rounded-xl transition-colors shadow-lg"
                >
                    {isCalculating ? 'Routing...' : 'Plan Route'}
                </button>
            </div>

            <div className="p-4 md:p-6 rounded-2xl border mb-4 bg-slate-950 min-h-[200px]">
                {routeError && (
                    <div className="bg-red-500/20 text-red-400 p-5 rounded-xl border border-red-500/30 font-bold mb-4 text-center">
                        {routeError}
                    </div>
                )}

                {itinerary.length === 0 && !routeError && !isCalculating && (
                    <div className="text-slate-500 h-full flex items-center justify-center font-medium italic mt-8 text-center px-4">
                        Search a destination to generate an optimized itinerary with safe highway offsets.
                    </div>
                )}
                
                {itinerary.length > 0 && (
                    <div className="flex flex-col animation-fade-in relative pl-4 mt-2">
                        <div className="absolute left-[27px] top-4 bottom-8 w-1 bg-slate-800 rounded-full"></div>
                        {itinerary.map((point, idx) => (
                            <div key={idx} className="relative z-10 flex gap-4 md:gap-6 mb-8 items-start">
                                <div className={`w-8 h-8 rounded-full border-4 border-slate-950 flex items-center justify-center shrink-0 mt-1 shadow-xl
                                    ${point.type === 'start' ? 'bg-sky-500' : point.type === 'stop' ? 'bg-amber-500' : 'bg-emerald-500'}
                                `}>
                                    <div className="w-2 h-2 rounded-full bg-slate-950"></div>
                                </div>
                                <div className="flex-1 bg-slate-800/60 p-4 rounded-2xl border border-white/5 shadow-md">
                                    <h3 className="font-bold text-lg text-white mb-1 leading-tight">{point.name}</h3>
                                    {point.type === 'start' && <div className="text-sm text-slate-400">Start with <span className="text-sky-400 font-bold">{point.arrivalSOC.toFixed(1)}%</span> SOC</div>}
                                    {point.type === 'stop' && (
                                        <div className="text-sm text-slate-300">
                                            Arrive with <span className="text-amber-400 font-bold">{point.arrivalSOC.toFixed(1)}%</span> after {point.distanceFromPrev.toFixed(0)}km<br/>
                                            <span className="text-emerald-400 font-bold text-xs uppercase bg-emerald-400/10 px-2 py-0.5 rounded mt-2 inline-block">Charge {point.chargeTimeMins} mins to reach 80%</span>
                                        </div>
                                    )}
                                    {point.type === 'destination' && (
                                        <div className="text-sm text-slate-300">
                                            Reach with <span className="text-emerald-400 font-bold">{point.arrivalSOC.toFixed(1)}%</span> SOC<br/>
                                            <span className="text-slate-500 text-xs font-bold mt-1 block">Trip Distance: {point.cumulativeDistance.toFixed(0)} km</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {itinerary.length > 0 && (
                 <a 
                    href={generateGoogleMapsURL()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-lg text-center py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                 >
                     Ultimate Navigation Mode ↗
                 </a>
            )}
        </div>
    );
}
