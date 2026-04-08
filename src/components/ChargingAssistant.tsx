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
        <div className="glass-card p-6 md:p-8 rounded-[2.5rem] shadow-2xl w-full">
            <div className="flex justify-between items-center mb-4 cursor-pointer" onClick={() => setIsCollapsed(!isCollapsed)}>
                <h2 className="text-xl md:text-2xl font-black flex items-center gap-3 text-white m-0 uppercase italic tracking-tighter">
                    <svg className="w-6 h-6 md:w-8 md:h-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    Smart Refill
                </h2>
                <div className="flex items-center gap-4">
                    {isCollapsed && (
                        <div className="text-amber-400 font-black tracking-tighter text-xl">
                            ₹{activeCost.toFixed(0)}
                        </div>
                    )}
                    <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors" aria-label="Toggle Collapse">
                        {isCollapsed ? (
                            <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                        ) : (
                            <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" /></svg>
                        )}
                    </button>
                </div>
            </div>

            {!isCollapsed && (
                <div className="mt-8 animate-fade-in space-y-8">
                    
                    {/* Synced Telemetrics Row */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/[0.02] p-4 rounded-2xl flex flex-col border border-white/5 shadow-inner">
                            <label className="text-slate-500 text-[9px] uppercase tracking-widest mb-1 font-black opacity-60">Synced SoC (%)</label>
                            <input 
                                type="number" 
                                value={batteryPercent} 
                                onChange={(e) => setBatteryPercent(Number(e.target.value))}
                                className="w-full bg-transparent text-white text-lg font-black focus:text-electric-mint outline-none transition-all text-left"
                            />
                        </div>
                        <div className="bg-white/[0.02] p-4 rounded-2xl flex flex-col border border-white/5 shadow-inner">
                            <label className="text-slate-500 text-[9px] uppercase tracking-widest mb-1 font-black opacity-60">Synced AEC (Wh/km)</label>
                            <input 
                                type="number" 
                                value={aec} 
                                onChange={(e) => setAec(Number(e.target.value))}
                                className="w-full bg-transparent text-white text-lg font-black focus:text-electric-mint outline-none transition-all text-left"
                            />
                        </div>
                    </div>

                    {/* Mode Toggle with Glass Effect */}
                    <div className="flex bg-black/30 p-1.5 rounded-2xl border border-white/5">
                        <button 
                            className={`flex-1 btn-automotive rounded-xl text-sm font-black transition-all duration-300 ${mode === 'target' ? 'bg-white/10 text-white shadow-xl' : 'text-slate-500 hover:text-slate-300'}`}
                            onClick={() => setMode('target')}
                        >
                            BY TARGET
                        </button>
                        <button 
                            className={`flex-1 btn-automotive rounded-xl text-sm font-black transition-all duration-300 ${mode === 'amount' ? 'bg-white/10 text-white shadow-xl' : 'text-slate-500 hover:text-slate-300'}`}
                            onClick={() => setMode('amount')}
                        >
                            BY AMOUNT
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        
                        {mode === 'target' && (
                            <div className="bg-white/[0.02] p-6 rounded-3xl flex flex-col border border-white/5 shadow-inner">
                                <label className="text-slate-500 text-[10px] uppercase tracking-widest mb-4 font-black">Target %</label>
                                <input 
                                    type="number"
                                    value={targetPercent} 
                                    onChange={(e) => setTargetPercent(Number(e.target.value))}
                                    className="w-full bg-transparent text-white text-3xl font-black focus:text-electric-mint outline-none transition-all text-left"
                                />
                            </div>
                        )}

                        {mode === 'amount' && (
                            <div className="bg-white/[0.02] p-6 rounded-3xl flex flex-col border border-white/5 shadow-inner">
                                <label className="text-slate-500 text-[10px] uppercase tracking-widest mb-4 font-black">Amount (₹)</label>
                                <input 
                                    type="number"
                                    value={rechargeAmount} 
                                    onChange={(e) => setRechargeAmount(Number(e.target.value))}
                                    className="w-full bg-transparent text-white text-3xl font-black focus:text-electric-mint outline-none transition-all text-left"
                                />
                            </div>
                        )}

                        <div className="bg-white/[0.02] p-6 rounded-3xl flex flex-col border border-white/5 shadow-inner">
                            <label className="text-slate-500 text-[10px] uppercase tracking-widest mb-4 font-black">Cost / kWh (₹)</label>
                            <input 
                                type="number"
                                value={costPerUnit} 
                                onChange={(e) => setCostPerUnit(Number(e.target.value))}
                                className="w-full bg-transparent text-white text-3xl font-black focus:text-electric-mint outline-none transition-all text-left"
                            />
                        </div>
                        
                        <div className="bg-white/[0.02] p-6 rounded-3xl flex flex-col border border-white/5 shadow-inner">
                            <label className="text-slate-500 text-[10px] uppercase tracking-widest mb-4 font-black">Charger (kW)</label>
                            <input 
                                type="number"
                                value={chargerSpeed} 
                                onChange={(e) => setChargerSpeed(Number(e.target.value))}
                                className="w-full bg-transparent text-white text-3xl font-black focus:text-electric-mint outline-none transition-all text-left"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white/[0.03] p-8 rounded-[2rem] border border-white/5 flex flex-col items-center justify-center text-center">
                            <div className="text-slate-500 text-[10px] mb-3 font-black tracking-widest uppercase opacity-70">ENERGY GAIN</div>
                            <div className="text-5xl font-[900] text-white tracking-tighter flex items-baseline gap-2">
                                {activeUnits.toFixed(1)}
                                <span className="text-lg font-black text-electric-mint uppercase italic">kWh</span>
                            </div>
                            {mode === 'amount' && (
                                <div className="text-xs font-bold text-slate-400 mt-2">
                                    Target reached: <span className="text-white">{amountFinalPercent.toFixed(0)}%</span>
                                </div>
                            )}
                        </div>

                        <div className="bg-white/[0.03] p-8 rounded-[2rem] border border-white/5 flex flex-col items-center justify-center text-center">
                            <div className="text-slate-500 text-[10px] mb-3 font-black tracking-widest uppercase opacity-70">
                                {mode === 'target' ? 'TOTAL COST' : 'BONUS RANGE'}
                            </div>
                            <div className="text-5xl font-[900] text-white tracking-tighter flex items-baseline gap-2">
                                {mode === 'target' ? activeCost.toFixed(0) : amountRangeBonus.toFixed(0)}
                                <span className="text-lg font-black text-electric-mint uppercase italic">
                                    {mode === 'target' ? '₹' : 'km'}
                                </span>
                            </div>
                            <div className="text-xs font-bold text-slate-400 mt-2 flex items-center gap-2">
                                <svg className="w-3 h-3 text-electric-mint" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                {displayTime} wait
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
