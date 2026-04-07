import { useState } from 'react';

export default function ChargingAssistant() {
    const [isCollapsed, setIsCollapsed] = useState(false);
    
    const [currentPercent, setCurrentPercent] = useState<number>(20);
    const [targetPercent, setTargetPercent] = useState<number>(80);
    const [costPerUnit, setCostPerUnit] = useState<number>(25);
    const [chargerSpeed, setChargerSpeed] = useState<number>(30); // 30kW by default
    
    // Safety boundaries
    const safeTarget = Math.max(currentPercent, targetPercent);
    const batteryCapacity = 35; // Logic specifically requested 35kWh
    
    // Formula: Units = 35 * (Target % - Current %) / 100
    const unitsNeeded = batteryCapacity * (safeTarget - currentPercent) / 100;
    
    // Estimated Cost = Units * Cost per Unit
    const estimatedCost = unitsNeeded * costPerUnit;
    
    // Time Estimate = Units / Charger Speed (hours)
    const timeHours = chargerSpeed > 0 ? unitsNeeded / chargerSpeed : 0;
    const timeMinutes = Math.round(timeHours * 60);
    const formattedHours = Math.floor(timeMinutes / 60);
    const formattedMins = timeMinutes % 60;
    const displayTime = timeMinutes > 0 
        ? `${formattedHours > 0 ? `${formattedHours}h ` : ''}${formattedMins}m`
        : '0m';

    return (
        <div className="bg-slate-900/80 p-6 md:p-8 rounded-3xl shadow-2xl border-2 border-slate-700/50 backdrop-blur-md mb-6 transition-all w-full">
            <div className="flex justify-between items-center mb-2 cursor-pointer" onClick={() => setIsCollapsed(!isCollapsed)}>
                <h2 className="text-xl md:text-2xl font-bold flex items-center gap-3 text-white m-0">
                    <svg className="w-6 h-6 md:w-8 md:h-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    Charging Assistant
                </h2>
                <div className="flex items-center gap-4">
                    {isCollapsed && (
                        <div className="text-amber-400 font-bold text-sm md:text-base">
                            Estimate: ₹{estimatedCost.toFixed(2)}
                        </div>
                    )}
                    <button className="text-slate-400 hover:text-white transition-colors" aria-label="Toggle Collapse">
                        {isCollapsed ? (
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        ) : (
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                        )}
                    </button>
                </div>
            </div>

            {!isCollapsed && (
                <div className="mt-6 animation-fade-in">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        {/* Current Battery % */}
                        <div className="bg-slate-950/50 p-4 rounded-2xl flex flex-col border border-slate-700/30">
                            <label className="text-slate-400 text-xs md:text-sm mb-2 font-medium">Current %</label>
                            <input 
                                type="number" min="0" max="100" 
                                value={currentPercent} 
                                onChange={(e) => setCurrentPercent(Number(e.target.value))}
                                className="w-full bg-slate-800 text-white font-bold px-3 py-2 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none border border-slate-600 transition-all text-center"
                            />
                        </div>

                        {/* Target Battery % */}
                        <div className="bg-slate-950/50 p-4 rounded-2xl flex flex-col border border-slate-700/30">
                            <label className="text-slate-400 text-xs md:text-sm mb-2 font-medium">Target %</label>
                            <input 
                                type="number" min="0" max="100" 
                                value={targetPercent} 
                                onChange={(e) => setTargetPercent(Number(e.target.value))}
                                className="w-full bg-slate-800 text-white font-bold px-3 py-2 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none border border-slate-600 transition-all text-center"
                            />
                        </div>

                        {/* Cost Per Unit */}
                        <div className="bg-slate-950/50 p-4 rounded-2xl flex flex-col border border-slate-700/30">
                            <label className="text-slate-400 text-xs md:text-sm mb-2 font-medium">Cost / kWh (₹)</label>
                            <input 
                                type="number" min="0" 
                                value={costPerUnit} 
                                onChange={(e) => setCostPerUnit(Number(e.target.value))}
                                className="w-full bg-slate-800 text-white font-bold px-3 py-2 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none border border-slate-600 transition-all text-center"
                            />
                        </div>

                        {/* Charger Speed */}
                        <div className="bg-slate-950/50 p-4 rounded-2xl flex flex-col border border-slate-700/30">
                            <label className="text-slate-400 text-xs md:text-sm mb-2 font-medium">Speed (kW)</label>
                            <input 
                                type="number" min="1" 
                                value={chargerSpeed} 
                                onChange={(e) => setChargerSpeed(Number(e.target.value))}
                                className="w-full bg-slate-800 text-white font-bold px-3 py-2 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none border border-slate-600 transition-all text-center"
                            />
                        </div>
                    </div>

                    <div className="bg-amber-900/20 p-6 rounded-2xl border border-amber-500/30 flex flex-col items-center justify-center mb-4">
                        <div className="text-amber-400/90 text-sm md:text-base mb-1 font-bold tracking-wide text-center">
                            You need to purchase <span className="text-white text-xl mx-1">{unitsNeeded.toFixed(2)}</span> units to reach your target.
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-slate-800/60 p-5 rounded-2xl border border-slate-700/50 flex flex-col items-center justify-center">
                            <div className="text-slate-400 text-sm mb-1 font-medium">Estimated Cost</div>
                            <div className="text-3xl font-black text-amber-400 tracking-tight">₹{estimatedCost.toFixed(2)}</div>
                        </div>
                        
                        <div className="bg-slate-800/60 p-5 rounded-2xl border border-slate-700/50 flex flex-col items-center justify-center">
                            <div className="text-slate-400 text-sm mb-1 font-medium">Estimated Time</div>
                            <div className="text-3xl font-black text-emerald-400 tracking-tight">{displayTime}</div>
                            <div className="text-slate-500 text-xs mt-1">At {chargerSpeed} kW max speed</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
