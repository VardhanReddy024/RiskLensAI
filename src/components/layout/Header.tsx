import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTransactions } from '../../context/TransactionContext';
import { 
  Shield, 
  ChevronDown, 
  Radio, 
  CheckCircle2,
  ShieldCheck,
  LogOut,
  LogIn,
  Sparkles
} from 'lucide-react';

interface HeaderProps {
  onNavigate: (page: string) => void;
  activePage: string;
}

export function Header({ onNavigate, activePage }: HeaderProps) {
  const { currentUser, isAuthenticated, logout } = useAuth();
  const { isStreaming, toggleStreaming } = useTransactions();
  const [showProfileCard, setShowProfileCard] = useState<boolean>(false);

  const handleLogout = async () => {
    setShowProfileCard(false);
    await logout();
    onNavigate('landing');
  };

  return (
    <header className="sticky top-3.5 z-40 w-full px-4 sm:px-6 lg:px-8 mb-3">
      <div className="max-w-7xl mx-auto floating-glass-nav px-4 sm:px-5 py-2.5 sm:py-3 flex items-center justify-between gap-3 sm:gap-4">
        
        {/* Brand & Tagline */}
        <div 
          className="flex items-center gap-3 cursor-pointer group select-none" 
          onClick={() => onNavigate(isAuthenticated ? 'dashboard' : 'landing')}
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-[14px] bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center shadow-[0_2px_10px_rgba(79,70,229,0.3)] text-white group-hover:scale-105 transition-transform duration-200 shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm sm:text-base font-extrabold tracking-tight text-slate-900">
                RiskLens <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">AI</span>
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50/90 text-blue-700 border border-blue-200/80 shadow-2xs">
                v2.4 PROD
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium hidden md:block">
              Predict Fraud. Prevent Loss. Protect Trust.
            </p>
          </div>
        </div>

        {/* Center: Multi-Agent AI Investigation Engine & Live Controls */}
        {isAuthenticated && (
          <div className="hidden lg:flex items-center gap-3">
            {/* Multi-Agent AI Investigation Engine Pill */}
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-50/80 border border-slate-200/80 text-xs font-medium shadow-2xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="font-bold text-slate-700">
                Multi-Agent AI Investigation Engine
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-slate-500 font-mono text-[11px]">
                Active Surveillance
              </span>
            </div>

            {/* Live Feed Toggle */}
            <button
              onClick={toggleStreaming}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                isStreaming
                  ? 'bg-rose-50 text-rose-700 border border-rose-200/90 shadow-2xs animate-pulse'
                  : 'btn-premium-secondary text-slate-700'
              }`}
            >
              <Radio className={`w-3.5 h-3.5 ${isStreaming ? 'text-rose-600' : 'text-slate-500'}`} />
              {isStreaming ? 'Live Stream Active' : 'Simulate Live Stream'}
            </button>
          </div>
        )}

        {/* Top Right: Authenticated User Profile OR Login Action */}
        <div className="flex items-center gap-3">
          {isAuthenticated && currentUser ? (
            <div className="relative">
              <button
                onClick={() => setShowProfileCard(prev => !prev)}
                className="flex items-center gap-2.5 sm:gap-3 p-1.5 sm:px-3 sm:py-1.5 rounded-2xl bg-slate-50/90 hover:bg-slate-100/90 border border-slate-200/90 text-xs font-medium text-slate-800 transition-all duration-150 shadow-2xs group cursor-pointer"
              >
                {/* Google Profile Picture with Online status pip */}
                <div className="relative shrink-0">
                  <img
                    src={currentUser.avatarUrl}
                    alt={currentUser.displayName}
                    className="w-8 h-8 rounded-xl object-cover ring-2 ring-blue-500/30 group-hover:ring-blue-500 transition-all bg-blue-100"
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full ring-1 ring-emerald-400">
                    <span className="animate-ping absolute inset-0 rounded-full bg-emerald-400 opacity-60"></span>
                  </span>
                </div>

                {/* Name, Role & Email Details */}
                <div className="text-left hidden sm:block">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-900 text-xs leading-none">
                      {currentUser.displayName}
                    </span>
                    <span className="inline-flex items-center px-1.5 py-0.2 rounded-md bg-blue-100 text-blue-800 font-bold text-[9px] uppercase tracking-wider">
                      {currentUser.role}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                    <span className="truncate max-w-[170px] font-mono text-[10px]">{currentUser.email}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-emerald-600 font-bold text-[10px] flex items-center gap-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      Online
                    </span>
                  </div>
                </div>

                <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-colors ml-0.5" />
              </button>

              {/* Expanded Profile Card Popover */}
              {showProfileCard && (
                <div className="absolute right-0 mt-2.5 w-80 sm:w-96 bg-white/95 backdrop-blur-2xl rounded-2xl shadow-[0_16px_48px_-8px_rgba(15,23,42,0.15)] border border-slate-200/90 p-5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  
                  {/* Profile Card Header: Google Avatar, Name, Email, Role, Online */}
                  <div className="flex items-start gap-3.5 pb-4 border-b border-slate-100">
                    <div className="relative shrink-0">
                      <img
                        src={currentUser.avatarUrl}
                        alt={currentUser.displayName}
                        className="w-12 h-12 rounded-2xl object-cover ring-2 ring-blue-500/40 shadow-xs bg-blue-100"
                      />
                      <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full"></span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="font-extrabold text-sm text-slate-900 truncate">
                          {currentUser.displayName}
                        </h4>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-extrabold shrink-0 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          {currentUser.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-mono truncate mt-0.5">
                        {currentUser.email}
                      </p>
                      <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-bold">
                        <ShieldCheck className="w-3 h-3 text-blue-600" />
                        {currentUser.role}
                      </div>
                    </div>
                  </div>

                  {/* Session & Provider Connection */}
                  <div className="py-3.5 space-y-2.5 border-b border-slate-100 text-xs">
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="text-slate-400 font-medium">Session Source</span>
                      <span className="font-bold text-slate-800 flex items-center gap-1.5 text-[11px] bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200/80">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        {currentUser.connection}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="text-slate-400 font-medium">Department</span>
                      <span className="font-semibold text-slate-800 truncate max-w-[180px]">
                        {currentUser.department}
                      </span>
                    </div>
                  </div>

                  {/* Authority Clearances */}
                  <div className="pt-3 space-y-2">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Active Operational Clearances
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-700">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>Command Center</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>Live Stream</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>AI Investigation</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>SAR Reporting</span>
                      </div>
                    </div>
                  </div>

                  {/* Action footer with Logout */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <button
                      onClick={handleLogout}
                      className="px-3 py-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 rounded-xl hover:bg-rose-50 transition-colors flex items-center gap-1.5 border border-rose-200/80 cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                    <button
                      onClick={() => setShowProfileCard(false)}
                      className="px-3 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      Close
                    </button>
                  </div>

                </div>
              )}
            </div>
          ) : (
            /* Unauthenticated state CTA */
            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigate('login')}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-2 cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Enterprise Sign In</span>
              </button>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}
