import { useEffect, useState } from 'react'
import CarStatus from './components/CarStatus'
import NearestCharger from './components/NearestCharger'
import EvMapView from './components/EvMapView'
import ChargingAssistant from './components/ChargingAssistant'
import ChargerList from './components/ChargerList'
import PlanTrip from './components/PlanTrip'
import type { Charger } from './components/EvMapView'

type Tab = 'dashboard' | 'plan' | 'calc' | 'list';

function App() {
  const [localChargers, setLocalChargers] = useState<Charger[]>([])
  const [ocmChargers, setOcmChargers] = useState<Charger[]>([])
  const [customChargers, setCustomChargers] = useState<Charger[]>([])
  const [userLoc, setUserLoc] = useState<[number, number] | null>(null)
  
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');

  // Global car parameters
  const [batteryPercent, setBatteryPercent] = useState<number>(100);
  const [aec, setAec] = useState<number>(140);
  const [dashRange, setDashRange] = useState<number>(240); 

  // Math calculation logic for global Dash Range
  const availableEnergyTotal = 32.5 * (batteryPercent / 100);
  const calculatedRawRange = aec > 0 ? (availableEnergyTotal * 1000) / aec : 0;
  const startingRange = dashRange > 0 ? Math.min(dashRange, calculatedRawRange) : calculatedRawRange;
  const safeRange = startingRange * 0.8;

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

    const cachedCustom = localStorage.getItem('customChargers');
    if (cachedCustom) {
      try {
        setCustomChargers(JSON.parse(cachedCustom));
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

  const addCustomCharger = (newCharger: Omit<Charger, 'id' | 'source'>) => {
    const charger: Charger = {
      ...newCharger,
      id: `custom-${Date.now()}`,
      source: 'local' // Treat custom as local for routing
    };
    const updated = [...customChargers, charger];
    setCustomChargers(updated);
    localStorage.setItem('customChargers', JSON.stringify(updated));
  };

  const allChargers = [...localChargers, ...ocmChargers, ...customChargers];

  return (
    <div className="min-h-screen pb-24 bg-slate-950 font-sans text-slate-200">
      <header className="pt-6 pb-2 px-4 md:px-8 text-center sticky top-0 bg-slate-950/80 backdrop-blur-md z-10 border-b border-white/5 shadow-md">
        <h1 className="text-2xl md:text-3xl font-extrabold bg-gradient-to-r from-sky-400 to-emerald-400 bg-clip-text text-transparent tracking-tight">
          Punch.EV Co-Pilot
        </h1>
      </header>

      <main className="w-full max-w-3xl mx-auto p-4 md:p-6 mt-4">
        {/* DASHBOARD TAB */}
        <div className={activeTab === 'dashboard' ? 'block animation-fade-in' : 'hidden'}>
          <NearestCharger userLoc={userLoc} chargers={allChargers} />
          <EvMapView userLoc={userLoc} chargers={allChargers} />
          <CarStatus 
            batteryPercent={batteryPercent}
            setBatteryPercent={setBatteryPercent}
            aec={aec}
            setAec={setAec}
            dashRange={dashRange}
            setDashRange={setDashRange}
            safeRange={safeRange}
          />
        </div>

        {/* PLAN TRIP TAB */}
        <div className={activeTab === 'plan' ? 'block animation-fade-in' : 'hidden'}>
          <PlanTrip 
            userLoc={userLoc}
            chargers={allChargers}
            batteryPercent={batteryPercent}
            aec={aec}
            safeRange={safeRange}
          />
        </div>

        {/* CHARGING CALC TAB */}
        <div className={activeTab === 'calc' ? 'block animation-fade-in' : 'hidden'}>
          <ChargingAssistant 
            batteryPercent={batteryPercent}
            setBatteryPercent={setBatteryPercent}
            aec={aec}
            setAec={setAec}
          />
        </div>

        {/* MY LIST TAB */}
        <div className={activeTab === 'list' ? 'block animation-fade-in' : 'hidden'}>
          <ChargerList 
            userLoc={userLoc} 
            chargers={allChargers} 
            safeRange={safeRange} 
            onAddCharger={addCustomCharger}
          />
        </div>
      </main>

      {/* BOTTOM NAV BAR */}
      <nav className="fixed bottom-0 left-0 right-0 h-20 bg-slate-900/90 backdrop-blur-xl border-t border-slate-700/50 flex justify-around items-center px-2 pb-4 pt-2 z-50 shadow-2xl">
        <button 
          onClick={() => setActiveTab('dashboard')} 
          className={`flex flex-col items-center justify-center w-full transition-colors ${activeTab === 'dashboard' ? 'text-sky-400' : 'text-slate-500 hover:text-slate-300'}`}
        >
          <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
          <span className="text-[10px] font-bold uppercase tracking-wider">Dash</span>
        </button>
        
        <button 
          onClick={() => setActiveTab('plan')} 
          className={`flex flex-col items-center justify-center w-full transition-colors ${activeTab === 'plan' ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}
        >
          <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
          <span className="text-[10px] font-bold uppercase tracking-wider">Plan Trip</span>
        </button>
        
        <button 
          onClick={() => setActiveTab('calc')} 
          className={`flex flex-col items-center justify-center w-full transition-colors ${activeTab === 'calc' ? 'text-amber-400' : 'text-slate-500 hover:text-slate-300'}`}
        >
          <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
          <span className="text-[10px] font-bold uppercase tracking-wider">Calc</span>
        </button>
        
        <button 
          onClick={() => setActiveTab('list')} 
          className={`flex flex-col items-center justify-center w-full transition-colors ${activeTab === 'list' ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
        >
          <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
          <span className="text-[10px] font-bold uppercase tracking-wider">My List</span>
        </button>
      </nav>
    </div>
  )
}

export default App
