import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect } from 'react';
import L from 'leaflet';
import { getDistance } from '../utils/distance';

const createCustomIcon = (color: string) => {
    return L.divIcon({
        className: 'custom-icon',
        html: `<div style="background-color: ${color}; width: 1.5rem; height: 1.5rem; border-radius: 50%; border: 3px solid #1e293b; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.5);"></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        popupAnchor: [0, -12]
    });
};

const userIcon = createCustomIcon('#ef4444'); // User loc (Red)
const localIcon = createCustomIcon('#eab308'); // Yellow/Gold for local
const ocmIcon = createCustomIcon('#3b82f6'); // Blue for OCM
const dangerIcon = createCustomIcon('#dc2626'); // Darker Red for >180km

function ChangeView({ center }: { center: [number, number] }) {
    const map = useMap();
    useEffect(() => {
        map.setView(center, map.getZoom() || 7);
    }, [center, map]);
    return null;
}

export type Charger = {
    id: string;
    name: string;
    lat: number;
    lng: number;
    capacity?: string;
    source?: 'local' | 'ocm';
};

export default function EvMapView({
    userLoc,
    chargers
}: {
    userLoc: [number, number] | null,
    chargers: Charger[]
}) {
    const defaultCenter: [number, number] = [17.3850, 78.4867];

    return (
        <div className="bg-slate-900/80 p-2 md:p-4 rounded-3xl shadow-2xl border-2 border-slate-700/50 mb-6 relative z-0" style={{ height: '400px' }}>
            <MapContainer center={userLoc || defaultCenter} zoom={7} scrollWheelZoom={true} style={{ height: '100%', width: '100%', borderRadius: '1rem', zIndex: 1 }}>
                <TileLayer
                    attribution='&copy; OSM'
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />
                {userLoc && <ChangeView center={userLoc} />}
                {userLoc && (
                    <Marker position={userLoc} icon={userIcon}>
                        <Popup><strong>My Location</strong></Popup>
                    </Marker>
                )}
                {chargers.map(c => {
                    let dist = 0;
                    if (userLoc) {
                        dist = getDistance(userLoc[0], userLoc[1], c.lat, c.lng);
                    }

                    const isDanger = userLoc && dist > 180;
                    const mapIcon = isDanger ? dangerIcon : (c.source === 'local' ? localIcon : ocmIcon);

                    return (
                        <Marker key={c.id} position={[c.lat, c.lng]} icon={mapIcon}>
                            <Popup>
                                <div style={{ minWidth: '150px' }}>
                                    {isDanger && <div style={{ color: '#ef4444', fontWeight: 'bold', marginBottom: '2px' }}>⚠️ Out of Range (&gt;180km)</div>}
                                    <strong style={{ fontSize: '1.1em' }}>{c.name}</strong><br />
                                    <div style={{ color: '#666', fontSize: '0.9em', marginTop: '4px' }}>
                                        {c.source === 'local' ? '🌟 Saved Extracted Charger' : '⚡ Live OpenChargeMap'}
                                    </div>
                                    {userLoc && (
                                        <div style={{ marginTop: '4px', fontWeight: 'bold', color: isDanger ? '#ef4444' : '#10b981' }}>
                                            Distance: {dist.toFixed(1)} km
                                        </div>
                                    )}
                                    <div style={{ marginTop: '4px', fontStyle: 'italic', color: '#888' }}>
                                        {c.capacity || 'CCS2 Native Plug'}
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    )
                })}
            </MapContainer>
        </div>
    )
}
