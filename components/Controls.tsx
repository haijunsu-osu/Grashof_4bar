import React from 'react';
import { LinkLengths } from '../types';
import { Play, Pause, RotateCw, RotateCcw } from 'lucide-react';

interface ControlsProps {
  lengths: LinkLengths;
  onLengthChange: (key: keyof LinkLengths, value: number) => void;
  angle: number;
  onAngleChange: (angle: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  speed: number;
  onSpeedChange: (speed: number) => void;
}

const Controls: React.FC<ControlsProps> = ({ 
  lengths, 
  onLengthChange, 
  angle, 
  onAngleChange, 
  isPlaying, 
  onTogglePlay,
  speed,
  onSpeedChange
}) => {
  const sliders = [
    { key: 'input', label: 'Input Link (a)', min: 20, max: 200 },
    { key: 'coupler', label: 'Coupler Link (b)', min: 20, max: 300 },
    { key: 'output', label: 'Output Link (c)', min: 20, max: 200 },
    { key: 'frame', label: 'Frame (d)', min: 50, max: 300 },
  ];

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-full flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <RotateCw className="w-5 h-5 text-indigo-600" />
          Link Configuration
        </h2>
        
        <div className="space-y-5">
          {sliders.map((s) => (
            <div key={s.key}>
              <div className="flex justify-between mb-1">
                <label className="text-sm font-medium text-slate-600">{s.label}</label>
                <span className="text-sm font-bold text-indigo-600">{lengths[s.key as keyof LinkLengths]}</span>
              </div>
              <input
                type="range"
                min={s.min}
                max={s.max}
                value={lengths[s.key as keyof LinkLengths]}
                onChange={(e) => onLengthChange(s.key as keyof LinkLengths, parseInt(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-slate-100 pt-6">
        <h2 className="text-lg font-bold text-slate-800 mb-4">Simulation Control</h2>
        
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={onTogglePlay}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-medium transition-colors ${
              isPlaying 
                ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' 
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
          >
            {isPlaying ? <><Pause size={18} /> Pause</> : <><Play size={18} /> Animate</>}
          </button>
        </div>

        <div className="space-y-4">
           <div>
              <div className="flex justify-between mb-1">
                <label className="text-sm font-medium text-slate-600">Input Angle (θ)</label>
                <span className="text-sm font-mono text-slate-500">{Math.round(angle)}°</span>
              </div>
              <input
                type="range"
                min={0}
                max={360}
                value={(angle % 360 + 360) % 360} // Normalize for slider
                onChange={(e) => {
                    if (isPlaying) onTogglePlay();
                    onAngleChange(parseInt(e.target.value));
                }}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
           </div>

           <div>
              <div className="flex justify-between mb-1">
                <label className="text-sm font-medium text-slate-600">Animation Speed</label>
              </div>
              <input
                type="range"
                min={0.2}
                max={5}
                step={0.1}
                value={Math.abs(speed)}
                onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-500"
              />
           </div>
        </div>
      </div>
    </div>
  );
};

export default Controls;