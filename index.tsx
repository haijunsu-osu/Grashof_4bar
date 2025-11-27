import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import { Settings, Play, Pause, RotateCw } from 'lucide-react';

// --- TYPES ---
export interface LinkLengths {
  frame: number;   // d
  input: number;   // a
  coupler: number; // b
  output: number;  // c
}

export interface JointCoordinates {
  Ax: number;
  Ay: number;
  Bx: number;
  By: number;
  Cx: number;
  Cy: number;
  Dx: number;
  Dy: number;
  isValid: boolean;
}

export enum GrashofType {
  CRANK_ROCKER = "Crank-Rocker",
  DOUBLE_CRANK = "Double-Crank (Drag-Link)",
  DOUBLE_ROCKER_I = "Double-Rocker (Type I)",
  DOUBLE_ROCKER_II = "Double-Rocker (Type II - Non-Grashof)",
  CHANGE_POINT = "Change Point (Neutral)",
  INVALID = "Invalid Geometry"
}

export enum LinkRole {
  FRAME = "frame",
  INPUT = "input",
  COUPLER = "coupler",
  OUTPUT = "output"
}

// --- KINEMATICS UTILS ---
const calculateJoints = (lengths: LinkLengths, thetaInput: number): JointCoordinates => {
  const { frame: d, input: a, coupler: b, output: c } = lengths;
  
  // Convert angle to radians
  const theta = (thetaInput * Math.PI) / 180;

  // Joint A is origin (0,0) - visually offset later
  const Ax = 0;
  const Ay = 0;

  // Joint D is fixed on X axis at distance d
  const Dx = d;
  const Dy = 0;

  // Joint B is determined by input angle
  const Bx = a * Math.cos(theta);
  const By = a * Math.sin(theta);

  // Joint C is intersection of circle centered at B (radius b) and D (radius c)
  // Distance between B and D
  const distBD = Math.sqrt(Math.pow(Dx - Bx, 2) + Math.pow(Dy - By, 2));

  // Check assembly validity (Triangle inequality)
  if (distBD > b + c || distBD < Math.abs(b - c) || distBD === 0) {
    return { Ax, Ay, Bx, By, Cx: NaN, Cy: NaN, Dx, Dy, isValid: false };
  }

  // Law of Cosines to find angle BDC (alpha) relative to line BD
  // c^2 + distBD^2 - 2*c*distBD*cos(alpha) = b^2
  // cos(alpha) = (c^2 + distBD^2 - b^2) / (2 * c * distBD)
  const cosAlpha = (c * c + distBD * distBD - b * b) / (2 * c * distBD);
  const alpha = Math.acos(Math.min(Math.max(cosAlpha, -1), 1)); // Clamp for float errors

  // Angle of line DB relative to horizontal
  const angleDB = Math.atan2(By - Dy, Bx - Dx);

  // Two solutions possible (elbow up/down). We conventionally pick one.
  // We subtract alpha to keep the standard configuration
  const thetaOutput = angleDB - alpha; 

  const Cx = Dx + c * Math.cos(thetaOutput);
  const Cy = Dy + c * Math.sin(thetaOutput);

  return { Ax, Ay, Bx, By, Cx, Cy, Dx, Dy, isValid: true };
};

const determineGrashof = (lengths: LinkLengths): { type: GrashofType, shortest: LinkRole, longest: LinkRole } => {
  const map = [
    { role: LinkRole.FRAME, len: lengths.frame },
    { role: LinkRole.INPUT, len: lengths.input },
    { role: LinkRole.COUPLER, len: lengths.coupler },
    { role: LinkRole.OUTPUT, len: lengths.output },
  ];

  // Find S and L
  let shortest = map[0];
  let longest = map[0];

  for (const item of map) {
    if (item.len < shortest.len) shortest = item;
    if (item.len > longest.len) longest = item;
  }

  const S = shortest.len;
  const L = longest.len;
  
  // Calculate P + Q (sum of other two)
  const totalSum = map.reduce((acc, curr) => acc + curr.len, 0);
  const PQ = totalSum - S - L;

  // Assembly check
  if (L > S + PQ) {
     return { type: GrashofType.INVALID, shortest: shortest.role, longest: longest.role };
  }

  const threshold = 0.01; // Floating point tolerance

  if (Math.abs((S + L) - PQ) < threshold) {
    return { type: GrashofType.CHANGE_POINT, shortest: shortest.role, longest: longest.role };
  }

  if (S + L < PQ) {
    // Grashof Class I
    if (shortest.role === LinkRole.FRAME) return { type: GrashofType.DOUBLE_CRANK, shortest: shortest.role, longest: longest.role };
    if (shortest.role === LinkRole.INPUT || shortest.role === LinkRole.OUTPUT) return { type: GrashofType.CRANK_ROCKER, shortest: shortest.role, longest: longest.role };
    if (shortest.role === LinkRole.COUPLER) return { type: GrashofType.DOUBLE_ROCKER_I, shortest: shortest.role, longest: longest.role };
  }

  // Grashof Class II (S + L > P + Q)
  return { type: GrashofType.DOUBLE_ROCKER_II, shortest: shortest.role, longest: longest.role };
};

// --- COMPONENT: LINKAGE CANVAS ---
interface LinkageCanvasProps {
  coords: JointCoordinates;
  lengths: LinkLengths;
  shortestRole: LinkRole;
  longestRole: LinkRole;
}

const LinkageCanvas: React.FC<LinkageCanvasProps> = ({ coords, lengths, shortestRole, longestRole }) => {
  const { Ax, Ay, Bx, By, Cx, Cy, Dx, Dy, isValid } = coords;

  const centerX = (Ax + Dx) / 2;
  const centerY = 0; 
  const padding = Math.max(lengths.input, lengths.output) + lengths.coupler + 50;
  
  const viewBoxMinX = centerX - lengths.frame/2 - padding;
  const viewBoxMinY = centerY - padding;
  const viewBoxWidth = lengths.frame + padding * 2;
  const viewBoxHeight = padding * 2;

  const getLinkColor = (role: LinkRole) => {
    if (role === shortestRole) return "stroke-green-600";
    if (role === longestRole) return "stroke-red-500";
    return "stroke-slate-700";
  };

  const getStrokeWidth = (role: LinkRole) => {
     if (role === shortestRole) return 6;
     return 4;
  }

  return (
    <div className="w-full h-full bg-slate-100 rounded-lg border border-slate-200 overflow-hidden relative shadow-inner">
      <svg 
        width="100%" 
        height="100%" 
        viewBox={`${viewBoxMinX} ${viewBoxMinY} ${viewBoxWidth} ${viewBoxHeight}`}
        preserveAspectRatio="xMidYMid meet"
        className="transform scale-y-[-1]" 
      >
        <line x1={-2000} y1={0} x2={2000} y2={0} stroke="#e2e8f0" strokeWidth="2" />

        {isValid ? (
          <>
            <g>
              <line x1={Ax} y1={Ay} x2={Dx} y2={Dy} className={`${getLinkColor(LinkRole.FRAME)} opacity-50`} strokeWidth={getStrokeWidth(LinkRole.FRAME)} strokeDasharray="10,5" />
              <path d={`M ${Ax-10} ${Ay-10} L ${Ax+10} ${Ay-10} L ${Ax} ${Ay} Z`} fill="#94a3b8" />
              <path d={`M ${Dx-10} ${Dy-10} L ${Dx+10} ${Dy-10} L ${Dx} ${Dy} Z`} fill="#94a3b8" />
            </g>

            <line x1={Ax} y1={Ay} x2={Bx} y2={By} className={getLinkColor(LinkRole.INPUT)} strokeWidth={getStrokeWidth(LinkRole.INPUT)} strokeLinecap="round" />
            <line x1={Bx} y1={By} x2={Cx} y2={Cy} className={getLinkColor(LinkRole.COUPLER)} strokeWidth={getStrokeWidth(LinkRole.COUPLER)} strokeLinecap="round" />
            <line x1={Cx} y1={Cy} x2={Dx} y2={Dy} className={getLinkColor(LinkRole.OUTPUT)} strokeWidth={getStrokeWidth(LinkRole.OUTPUT)} strokeLinecap="round" />

            <circle cx={Ax} cy={Ay} r={6} fill="white" stroke="#1e293b" strokeWidth="2" />
            <circle cx={Bx} cy={By} r={6} fill="white" stroke="#1e293b" strokeWidth="2" />
            <circle cx={Cx} cy={Cy} r={6} fill="white" stroke="#1e293b" strokeWidth="2" />
            <circle cx={Dx} cy={Dy} r={6} fill="white" stroke="#1e293b" strokeWidth="2" />

            <g transform="scale(1, -1)">
                <text x={Ax} y={-Ay + 25} textAnchor="middle" className="text-xs fill-slate-500 font-bold">Frame (A)</text>
                <text x={Dx} y={-Dy + 25} textAnchor="middle" className="text-xs fill-slate-500 font-bold">Frame (D)</text>
                <text x={Bx} y={-By - 15} textAnchor="middle" className="text-xs fill-slate-600 font-bold">B</text>
                <text x={Cx} y={-Cy - 15} textAnchor="middle" className="text-xs fill-slate-600 font-bold">C</text>
                
                <text x={(Ax+Bx)/2 - 10} y={-(Ay+By)/2} className="text-[10px] fill-slate-400">Input</text>
                <text x={(Bx+Cx)/2} y={-(By+Cy)/2 - 10} textAnchor="middle" className="text-[10px] fill-slate-400">Coupler</text>
                <text x={(Cx+Dx)/2 + 10} y={-(Cy+Dy)/2} className="text-[10px] fill-slate-400">Output</text>
            </g>
          </>
        ) : (
           <g transform="scale(1, -1)">
             <text x={centerX} y={-centerY} textAnchor="middle" className="text-red-500 font-bold text-lg">
               Impossible Configuration
             </text>
             <text x={centerX} y={-centerY + 25} textAnchor="middle" className="text-slate-500 text-sm">
               Link lengths cannot form a closed loop at this angle.
             </text>
           </g>
        )}
      </svg>
      
      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm p-3 rounded-lg shadow border border-slate-200 text-xs">
          <div className="flex items-center mb-1">
            <div className="w-3 h-3 rounded-full bg-green-600 mr-2"></div>
            <span>Shortest Link (S)</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
            <span>Longest Link (L)</span>
          </div>
      </div>
    </div>
  );
};

// --- COMPONENT: CONTROLS ---
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
                value={(angle % 360 + 360) % 360}
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

// --- COMPONENT: INFO PANEL ---
interface InfoPanelProps {
  grashofInfo: { type: GrashofType, shortest: LinkRole, longest: LinkRole };
  lengths: LinkLengths;
}

const InfoPanel: React.FC<InfoPanelProps> = ({ grashofInfo, lengths }) => {
  const { frame: d, input: a, coupler: b, output: c } = lengths;
  const vals = [a, b, c, d].sort((x, y) => x - y);
  const S = vals[0];
  const L = vals[3];
  const P = vals[1];
  const Q = vals[2];
  
  const sumSL = S + L;
  const sumPQ = P + Q;
  const isGrashof = sumSL <= sumPQ;

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
      <h2 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">Analysis</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
           <div className="mb-4">
             <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold block mb-1">Mechanism Type</span>
             <span className={`text-xl font-bold ${grashofInfo.type === GrashofType.INVALID ? 'text-red-600' : 'text-indigo-600'}`}>
               {grashofInfo.type}
             </span>
           </div>

           <div className="mb-4">
             <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold block mb-1">Grashof Condition</span>
             <div className="flex items-center gap-3 font-mono text-sm bg-slate-50 p-2 rounded border border-slate-100">
                <div className={sumSL <= sumPQ ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
                   S + L = {sumSL}
                </div>
                <div className="text-slate-400">
                   {sumSL < sumPQ ? "<" : sumSL > sumPQ ? ">" : "="}
                </div>
                <div className="text-slate-700">
                   P + Q = {sumPQ}
                </div>
             </div>
             <p className="text-xs text-slate-400 mt-1 italic">
               {isGrashof 
                 ? "Condition Met: At least one link can rotate fully." 
                 : "Condition Failed: No link makes a full revolution (Triple Rocker)."}
             </p>
           </div>
        </div>

        <div className="space-y-2 text-sm text-slate-600">
             <div className="flex justify-between border-b border-slate-50 pb-1">
               <span>Shortest Link (S)</span>
               <span className="font-medium capitalize text-green-600">{grashofInfo.shortest} ({S})</span>
             </div>
             <div className="flex justify-between border-b border-slate-50 pb-1">
               <span>Longest Link (L)</span>
               <span className="font-medium capitalize text-red-500">{grashofInfo.longest} ({L})</span>
             </div>
             <div className="mt-4 p-3 bg-blue-50 text-blue-800 rounded text-xs leading-relaxed">
                <strong>Did you know?</strong> 
                {grashofInfo.type === GrashofType.CRANK_ROCKER && " In a Crank-Rocker, the shortest link is adjacent to the frame and acts as the input."}
                {grashofInfo.type === GrashofType.DOUBLE_CRANK && " In a Double-Crank (Drag-Link), the shortest link is the frame. Both input and output rotate fully."}
                {grashofInfo.type === GrashofType.DOUBLE_ROCKER_I && " In a Grashof Double-Rocker, the coupler is the shortest link. It makes a full turn relative to the others, but input/output only rock."}
                {grashofInfo.type === GrashofType.DOUBLE_ROCKER_II && " In a Non-Grashof Double-Rocker, no link can rotate 360 degrees."}
             </div>
        </div>
      </div>
    </div>
  );
};

// --- MAIN APP COMPONENT ---
const App: React.FC = () => {
  const [lengths, setLengths] = useState<LinkLengths>({
    frame: 200,   // d
    input: 80,    // a
    coupler: 180, // b
    output: 140   // c
  });

  const [angle, setAngle] = useState<number>(90);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(1);
  const directionRef = useRef<number>(1);
  
  const joints: JointCoordinates = calculateJoints(lengths, angle);
  const grashofInfo = determineGrashof(lengths);
  const requestRef = useRef<number>(0);

  const handleLengthChange = (key: keyof LinkLengths, value: number) => {
    setLengths(prev => ({ ...prev, [key]: value }));
  };

  const animate = useCallback(() => {
    setAngle(prevAngle => {
      const step = speed * directionRef.current;
      const nextAngle = prevAngle + step;
      
      const nextJoints = calculateJoints(lengths, nextAngle);
      
      if (nextJoints.isValid) {
        return nextAngle;
      } else {
        directionRef.current *= -1;
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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
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

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="h-[400px] md:h-[500px]">
             <LinkageCanvas 
               coords={joints} 
               lengths={lengths} 
               shortestRole={grashofInfo.shortest}
               longestRole={grashofInfo.longest}
             />
          </div>
          <InfoPanel grashofInfo={grashofInfo} lengths={lengths} />
        </div>

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
          </div>
        </div>
      </main>
    </div>
  );
};

// --- MOUNTING ---
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);