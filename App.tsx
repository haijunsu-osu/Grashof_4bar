import React, { useState, useEffect, useRef, useCallback } from 'react';
import LinkageCanvas from './components/LinkageCanvas';
import Controls from './components/Controls';
import InfoPanel from './components/InfoPanel';
import { calculateJoints, determineGrashof } from './utils/kinematics';
import { LinkLengths, JointCoordinates } from './types';
import { Settings } from 'lucide-react';

const App: React.FC = () => {
  // Mechanism State
  const [lengths, setLengths] = useState<LinkLengths>({
    frame: 200,   // d
    input: 80,    // a
    coupler: 180, // b
    output: 140   // c
  });

  // Simulation State
  const [angle, setAngle] = useState<number>(90);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(1);
  const directionRef = useRef<number>(1); // 1 for CW, -1 for CCW
  
  // Derived State
  const joints: JointCoordinates = calculateJoints(lengths, angle);
  const grashofInfo = determineGrashof(lengths);
  const requestRef = useRef<number>();

  const handleLengthChange = (key: keyof LinkLengths, value: number) => {
    setLengths(prev => ({ ...prev, [key]: value }));
  };

  const animate = useCallback(() => {
    setAngle(prevAngle => {
      const step = speed * directionRef.current;
      const nextAngle = prevAngle + step;
      
      // Check if next angle is valid
      const nextJoints = calculateJoints(lengths, nextAngle);
      
      if (nextJoints.isValid) {
        return nextAngle;
      } else {
        // Hit a limit! Reverse direction
        directionRef.current *= -1;
        // Bounce back slightly to avoid getting stuck in invalid state
        return prevAngle + (speed * directionRef.current);
      }
    });
    
    requestRef.current = requestAnimationFrame(animate);
  }, [lengths, speed]);

  useEffect(() => {
    if (isPlaying) {
      requestRef.current = requestAnimationFrame(animate);
    } else {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying, animate]);

  // If geometry changes and current angle becomes invalid, 
  // we usually just let the visualization show "Broken" or the loop auto-corrects.
  // But strictly for static visual updates:
  useEffect(() => {
     if (!joints.isValid && !isPlaying) {
        // Optional: Auto-find valid angle could go here, 
        // but showing the broken state is educational.
     }
  }, [joints.isValid, isPlaying]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-lg">
             <Settings className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Grashof Explorer</h1>
            <p className="text-sm text-slate-500">Interactive 4-Bar Linkage Simulator</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Visualization & Info */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Canvas */}
          <div className="h-[400px] md:h-[500px]">
             <LinkageCanvas 
               coords={joints} 
               lengths={lengths} 
               shortestRole={grashofInfo.shortest}
               longestRole={grashofInfo.longest}
             />
          </div>
          
          {/* Info Panel */}
          <InfoPanel grashofInfo={grashofInfo} lengths={lengths} />
        </div>

        {/* Right Column: Controls */}
        <div className="lg:col-span-4 h-fit">
          <Controls 
            lengths={lengths}
            onLengthChange={handleLengthChange}
            angle={angle}
            onAngleChange={setAngle}
            isPlaying={isPlaying}
            onTogglePlay={() => setIsPlaying(!isPlaying)}
            speed={speed}
            onSpeedChange={setSpeed}
          />
          
          <div className="mt-6 text-xs text-slate-400 text-center">
            <p>Designed for educational purposes.</p>
            <p>Calculations use vector loop equations with intersection logic.</p>
          </div>
        </div>

      </main>
    </div>
  );
};

export default App;