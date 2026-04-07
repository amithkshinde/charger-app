import { useEffect, useState } from 'react'
import CarStatus from './components/CarStatus'
import NearestCharger from './components/NearestCharger'
import EvMapView from './components/EvMapView'
import ChargingAssistant from './components/ChargingAssistant'
import type { Charger } from './components/EvMapView'

function App() {
  const [localChargers, setLocalChargers] = useState<Charger[]>([])
  const [ocmChargers, setOcmChargers] = useState<Charger[]>([])
  const [userLoc, setUserLoc] = useState<[number, number] | null>(null)

  // 1. Initialize LocalStorage caching & fetch local json
  useEffect(() => {
    const cachedLoc = localStorage.getItem('lastKnownLoc');
    if (cachedLoc) {
      try {
        const parsed = JSON.parse(cachedLoc);
        if (Array.isArray(parsed) && parsed.length === 2) {
          setUserLoc(parsed as [number, number]);
        }
      } catch (e) { }
    }

    fetch('/my_chargers.json')
      .then(res => res.json())
      .then((data: any[]) => {
        const withSource = data.map(d => ({ ...d, source: 'local' as const }));
        setLocalChargers(withSource);
      })
      .catch(err => console.error("Could not load local chargers", err))
  }, []);

  // 2. Fetch fresh geolocation and cache it
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc: [number, number] = [position.coords.latitude, position.coords.longitude];
          setUserLoc(loc);
          localStorage.setItem('lastKnownLoc', JSON.stringify(loc));
        },
        (err) => {
          console.warn("GPS resolving failed", err)
        }
      )
    }
  }, []);

  // 3. Trigger OCM Fetch whenever userLoc stabilizes
  useEffect(() => {
    if (!userLoc) return;

    // Fetch from Open Charge Map (ConnectionTypeId 33 is CCS2, radius 100km)
    const OCM_URL = `https://api.openchargemap.io/v3/poi/?output=json&latitude=${userLoc[0]}&longitude=${userLoc[1]}&distance=100&distanceunit=KM&connectiontypeid=33&maxresults=50`;

    fetch(OCM_URL)
      .then(res => res.json())
      .then((data: any[]) => {
        const mappedOCM: Charger[] = data.map(poi => ({
          id: `ocm-${poi.ID}`,
          name: poi.AddressInfo?.Title || 'OCM Charger',
          lat: poi.AddressInfo?.Latitude,
          lng: poi.AddressInfo?.Longitude,
          capacity: poi.Connections?.[0]?.PowerKW ? `${poi.Connections[0].PowerKW}kW CCS2` : 'CCS2/Punch.ev Ready',
          source: 'ocm' as const
        }));
        setOcmChargers(mappedOCM);
      })
      .catch(err => console.error("Could not fetch OCM API", err));

  }, [userLoc]);

  const allChargers = [...localChargers, ...ocmChargers];

  return (
    <div className="min-h-screen p-3 sm:p-8 flex flex-col items-center pb-24 overflow-x-hidden">
      <div className="w-full max-w-lg md:max-w-3xl flex flex-col space-y-4 md:space-y-6">
        <header className="mb-2 mt-4 px-2">
          <h1 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-sky-400 to-emerald-400 bg-clip-text text-transparent tracking-tight leading-tight">
            Punch.EV Dash
          </h1>
          <p className="text-slate-400 mt-1 md:mt-2 md:text-lg">Live Map synced with Open Charge Map</p>
        </header>

        <NearestCharger userLoc={userLoc} chargers={allChargers} />

        <EvMapView userLoc={userLoc} chargers={allChargers} />

        <CarStatus userLoc={userLoc} chargers={allChargers} />

        <ChargingAssistant />

        <footer className="pt-8 pb-4 text-center text-slate-500 text-xs md:text-sm">
          Powered by React • Leaflet • Open Charge Map (Free)
        </footer>
      </div>
    </div>
  )
}

export default App
