import { useState } from 'react';

interface ChargingAssistantProps {
    batteryPercent: number;
    setBatteryPercent: (val: number) => void;
    aec: number;
    setAec: (val: number) => void;
}

export default function ChargingAssistant({ batteryPercent, setBatteryPercent, aec, setAec }: ChargingAssistantProps) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [mode, setMode] = useState<'target' | 'amount'>('target');
    
    // Target Mode States
    const [targetPercent, setTargetPercent] = useState<number>(80);
    
    // Amount Mode States
    const [rechargeAmount, setRechargeAmount] = useState<number>(500);
    
    // Shared States
    const [costPerUnit, setCostPerUnit] = useState<number>(25);
    const [chargerSpeed, setChargerSpeed] = useState<number>(30); // 30kW by default
    
    const batteryCapacity = 35; // Logic specifically requested 35kWh

    // Target Calculation
    const safeTarget = Math.max(batteryPercent, targetPercent);
    const targetUnitsNeeded = batteryCapacity * (safeTarget - batteryPercent) / 100;
    const targetEstimatedCost = targetUnitsNeeded * costPerUnit;

    // Amount Calculation
    const amountUnitsPurchased = costPerUnit > 0 ? rechargeAmount / costPerUnit : 0;
    const amountGainPercent = (amountUnitsPurchased / batteryCapacity) * 100;
    const amountFinalPercent = Math.min(100, batteryPercent + amountGainPercent);
    const amountRangeBonus = aec > 0 ? (amountUnitsPurchased * 1000) / aec : 0;

    // View Selectors
    const activeUnits = mode === 'target' ? targetUnitsNeeded : amountUnitsPurchased;
    const activeCost = mode === 'target' ? targetEstimatedCost : rechargeAmount;

    // Time Estimate (Universal based on Active Units)
    const timeHours = chargerSpeed > 0 ? activeUnits / chargerSpeed : 0;
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
                            Estimate: ₹{activeCost.toFixed(2)}
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
                    
                    {/* Top Shared Form Row */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="bg-slate-950/40 p-3 rounded-xl flex flex-col border border-slate-700/30">
                            <label className="text-slate-400 text-xs mb-1 font-medium">Synced Battery (%)</label>
                            <input 
                                type="number" min="0" max="100" 
                                value={batteryPercent} 
                                onChange={(e) => setBatteryPercent(Number(e.target.value))}
                                className="w-full bg-transparent text-emerald-400 font-bold outline-none border-b border-slate-600 focus:border-emerald-500 pb-1"
                            />
                        </div>
                        <div className="bg-slate-950/40 p-3 rounded-xl flex flex-col border border-slate-700/30">
                            <label className="text-slate-400 text-xs mb-1 font-medium">Synced AEC (Wh/km)</label>
                            <input 
                                type="number" min="50" max="300" 
                                value={aec} 
                                onChange={(e) => setAec(Number(e.target.value))}
                                className="w-full bg-transparent text-sky-400 font-bold outline-none border-b border-slate-600 focus:border-sky-500 pb-1"
                            />
                        </div>
                    </div>

                    {/* Mode Toggle */}
                    <div className="flex bg-slate-950 p-1 rounded-xl mb-6 border border-slate-800">
                        <button 
                            className={`flex-1 py-2 md:py-2.5 text-sm font-bold rounded-lg transition-colors ${mode === 'target' ? 'bg-amber-500/20 text-amber-400' : 'text-slate-400 hover:text-white'}`}
                            onClick={() => setMode('target')}
                        >
                            Charge by Target
                        </button>
                        <button 
                            className={`flex-1 py-2 md:py-2.5 text-sm font-bold rounded-lg transition-colors ${mode === 'amount' ? 'bg-amber-500/20 text-amber-400' : 'text-slate-400 hover:text-white'}`}
                            onClick={() => setMode('amount')}
                        >
                            Charge by Amount
                        </button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                        
                        {mode === 'target' && (
                            <div className="bg-slate-950/50 p-4 rounded-2xl flex flex-col border border-slate-700/30">
                                <label className="text-slate-400 text-xs md:text-sm mb-2 font-medium">Target %</label>
                                <input 
                                    type="number" min="0" max="100" 
                                    value={targetPercent} 
                                    onChange={(e) => setTargetPercent(Number(e.target.value))}
                                    className="w-full bg-slate-800 text-white font-bold px-3 py-2 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none border border-slate-600 transition-all text-center"
                                />
                            </div>
                        )}

                        {mode === 'amount' && (
                            <div className="bg-slate-950/50 p-4 rounded-2xl flex flex-col border border-slate-700/30">
                                <label className="text-slate-400 text-xs md:text-sm mb-2 font-medium">Recharge Amount (₹)</label>
                                <input 
                                    type="number" min="0" 
                                    value={rechargeAmount} 
                                    onChange={(e) => setRechargeAmount(Number(e.target.value))}
                                    className="w-full bg-slate-800 text-amber-400 font-bold px-3 py-2 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none border border-amber-500/50 transition-all text-center"
                                />
                            </div>
                        )}

                        {/* Shared Standard Inputs */}
                        <div className="bg-slate-950/50 p-4 rounded-2xl flex flex-col border border-slate-700/30">
                            <label className="text-slate-400 text-xs md:text-sm mb-2 font-medium">Cost / kWh (₹)</label>
                            <input 
                                type="number" min="0" 
                                value={costPerUnit} 
                                onChange={(e) => setCostPerUnit(Number(e.target.value))}
                                className="w-full bg-slate-800 text-white font-bold px-3 py-2 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none border border-slate-600 transition-all text-center"
                            />
                        </div>
                        
                        <div className="bg-slate-950/50 p-4 rounded-2xl flex flex-col border border-slate-700/30 col-span-2 md:col-span-1">
                            <label className="text-slate-400 text-xs md:text-sm mb-2 font-medium">Speed (kW)</label>
                            <input 
                                type="number" min="1" 
                                value={chargerSpeed} 
                                onChange={(e) => setChargerSpeed(Number(e.target.value))}
                                className="w-full bg-slate-800 text-white font-bold px-3 py-2 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none border border-slate-600 transition-all text-center"
                            />
                        </div>
                    </div>

                    <div className={`p-6 rounded-2xl border mb-4 flex flex-col items-center justify-center text-center ${mode === 'target' ? 'bg-amber-900/20 border-amber-500/30' : 'bg-sky-900/20 border-sky-500/30'}`}>
                        {mode === 'target' ? (
                            <div className="text-amber-400/90 text-sm md:text-base font-bold tracking-wide">
                                You need to purchase <span className="text-white text-xl mx-1">{activeUnits.toFixed(2)}</span> units to reach your target.
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2">
                                <div className="text-sky-400/90 text-sm md:text-base font-bold tracking-wide">
                                    You will get <span className="text-white text-xl mx-1">{activeUnits.toFixed(2)}</span> units.
                                </div>
                                <div className="text-slate-300 font-bold">
                                    Battery will reach <span className="text-white text-lg">{amountFinalPercent.toFixed(1)}%</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className={`grid gap-4 ${mode === 'amount' ? 'grid-cols-2 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-2'}`}>
                        {mode === 'target' && (
                            <div className="bg-slate-800/60 p-5 rounded-2xl border border-slate-700/50 flex flex-col items-center justify-center">
                                <div className="text-slate-400 text-sm mb-1 font-medium">Estimated Cost</div>
                                <div className="text-3xl font-black text-amber-400 tracking-tight">₹{activeCost.toFixed(2)}</div>
                            </div>
                        )}

                        {mode === 'amount' && (
                            <div className="bg-slate-800/60 p-5 rounded-2xl border border-slate-700/50 flex flex-col items-center justify-center">
                                <div className="text-slate-400 text-sm mb-1 font-medium">Bonus Range</div>
                                <div className="text-3xl font-black text-sky-400 tracking-tight">+{amountRangeBonus.toFixed(1)} <span className="text-lg">km</span></div>
                            </div>
                        )}

                        <div className="bg-slate-800/60 p-5 rounded-2xl border border-slate-700/50 flex flex-col items-center justify-center">
                            <div className="text-slate-400 text-sm mb-1 font-medium">Wait Time</div>
                            <div className="text-3xl font-black text-emerald-400 tracking-tight">{displayTime}</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
