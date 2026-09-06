import React, { useState } from 'react';
import { Globe, MapPin, AlertTriangle, ShieldAlert, DollarSign, Activity } from 'lucide-react';
import { HeatmapRegion } from '../../types/graph';

interface RiskHeatmapViewProps {
  regions: HeatmapRegion[];
}

export function RiskHeatmapView({ regions }: RiskHeatmapViewProps) {
  const [selectedRegion, setSelectedRegion] = useState<HeatmapRegion>(regions[0]);

  const totalFraudVolume = regions.reduce((sum, r) => sum + r.totalVolume, 0);
  const totalFraudCases = regions.reduce((sum, r) => sum + r.fraudCount, 0);
  const avgRisk = Math.round(regions.reduce((sum, r) => sum + r.avgRiskScore, 0) / (regions.length || 1));

  return (
    <div className="w-full h-full min-h-[620px] bg-slate-950 rounded-2xl border border-slate-800 p-6 flex flex-col justify-between overflow-hidden">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-rose-400" />
            <h3 className="text-base font-bold text-white">Geographical & Syndicate Risk Heatmap</h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Regional fraud concentration, proxy routing hubs, and offshore mule depository density.
          </p>
        </div>

        {/* Global Stats Banner */}
        <div className="flex items-center gap-4 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs">
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Global Exposure</span>
            <span className="text-sm font-bold text-slate-100">${totalFraudVolume.toLocaleString()}</span>
          </div>
          <div className="h-6 w-px bg-slate-800" />
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Flagged Hotspots</span>
            <span className="text-sm font-bold text-rose-400">{regions.length} Jurisdictions</span>
          </div>
          <div className="h-6 w-px bg-slate-800" />
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Mean Threat Index</span>
            <span className="text-sm font-bold text-amber-400">{avgRisk}/100</span>
          </div>
        </div>
      </div>

      {/* Grid Content: Region Selector List & Detail Card */}
      <div className="flex-1 grid grid-cols-12 gap-6 py-6 overflow-hidden">
        {/* Left List of Regions */}
        <div className="col-span-5 space-y-2.5 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-800">
          {regions.map(region => {
            const isSelected = selectedRegion?.id === region.id;
            return (
              <div
                key={region.id}
                onClick={() => setSelectedRegion(region)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900 border-blue-500 shadow-xl ring-1 ring-blue-500/20'
                    : 'bg-slate-900/40 border-slate-800 hover:border-slate-700 hover:bg-slate-900/70'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <MapPin className={`w-4 h-4 ${region.riskTier === 'CRITICAL' ? 'text-rose-400' : 'text-amber-400'}`} />
                    <span className="font-bold text-sm text-slate-200">{region.name}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[9.5px] font-bold ${
                    region.riskTier === 'CRITICAL' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-amber-500/20 text-amber-300'
                  }`}>
                    {region.avgRiskScore}/100 Risk
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-slate-800/80 text-[11px]">
                  <div>
                    <span className="text-slate-500 block text-[9.5px]">Type</span>
                    <span className="font-semibold text-slate-300">{region.type}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9.5px]">Volume</span>
                    <span className="font-bold text-slate-200">${(region.totalVolume / 1000).toFixed(0)}k</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9.5px]">Incidents</span>
                    <span className="font-bold text-rose-400">{region.fraudCount}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Detail Card & Coordinates Radar */}
        <div className="col-span-7 bg-slate-900/70 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
          {selectedRegion ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <span className="text-[10px] uppercase font-bold text-blue-400 tracking-wider">
                    Regional Ingress Analysis
                  </span>
                  <h4 className="text-lg font-bold text-white mt-0.5">{selectedRegion.name}</h4>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">GPS Coordinates</span>
                  <div className="font-mono text-xs text-slate-300 mt-0.5">
                    {selectedRegion.lat.toFixed(4)}° N, {selectedRegion.lng.toFixed(4)}° E
                  </div>
                </div>
              </div>

              {/* Metric Highlights */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Identified Exposure</span>
                  <span className="text-lg font-black text-rose-400 mt-1 block">
                    ${selectedRegion.totalVolume.toLocaleString()}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Flagged Entity Nodes</span>
                  <span className="text-lg font-black text-amber-400 mt-1 block">
                    {selectedRegion.flaggedEntities} Entities
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Threat Classification</span>
                  <span className="text-lg font-black text-slate-200 mt-1 block">
                    {selectedRegion.riskTier}
                  </span>
                </div>
              </div>

              {/* Active Clusters Operating in Region */}
              <div className="p-4 rounded-xl bg-slate-950/90 border border-rose-900/40 space-y-2">
                <div className="flex items-center gap-2 text-rose-400 font-bold text-xs">
                  <ShieldAlert className="w-4 h-4" />
                  <span>Active Fraud Syndicates Operating in this Zone</span>
                </div>
                <div className="space-y-1.5">
                  {selectedRegion.activeClusters.map((clusterName, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-lg bg-rose-950/20 border border-rose-800/40 text-xs font-semibold text-rose-200 flex items-center justify-between"
                    >
                      <span>🚨 {clusterName}</span>
                      <span className="text-[10px] text-rose-400 uppercase font-bold">Monitored</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-500 text-sm">
              Select a regional hotspot to view geospatial threat intelligence.
            </div>
          )}

          <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Data synced with global sanction lists & IP reputation relays</span>
            <span className="text-blue-400 font-semibold">Updated Real-Time</span>
          </div>
        </div>
      </div>
    </div>
  );
}
