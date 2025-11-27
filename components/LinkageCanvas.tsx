import React from 'react';
import { JointCoordinates, LinkLengths, LinkRole } from '../types';

interface LinkageCanvasProps {
  coords: JointCoordinates;
  lengths: LinkLengths;
  shortestRole: LinkRole;
  longestRole: LinkRole;
}

const LinkageCanvas: React.FC<LinkageCanvasProps> = ({ coords, lengths, shortestRole, longestRole }) => {
  const { Ax, Ay, Bx, By, Cx, Cy, Dx, Dy, isValid } = coords;

  // ViewBox Configuration
  // We need to center the mechanism. 
  // A is at (0,0), D is at (frame, 0).
  // Y is positive down in SVG, so we need to flip Y for math->screen or just accept math coords and flip whole SVG.
  // Let's flip Y inside the drawing logic by negating Y values.
  
  const centerX = (Ax + Dx) / 2;
  const centerY = 0; 
  const scale = 1; 
  const padding = Math.max(lengths.input, lengths.output) + lengths.coupler + 50;
  
  const viewBoxMinX = centerX - lengths.frame/2 - padding;
  const viewBoxMinY = centerY - padding;
  const viewBoxWidth = lengths.frame + padding * 2;
  const viewBoxHeight = padding * 2;

  // Color helper
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
        className="transform scale-y-[-1]" // Flip coordinate system so Y points up
      >
        {/* Grid/Ground Guide */}
        <line x1={-1000} y1={0} x2={1000} y2={0} stroke="#e2e8f0" strokeWidth="2" />

        {isValid ? (
          <>
            {/* FRAME (Link 1) - Drawn specifically to look grounded */}
            <g>
              <line x1={Ax} y1={Ay} x2={Dx} y2={Dy} className={`${getLinkColor(LinkRole.FRAME)} opacity-50`} strokeWidth={getStrokeWidth(LinkRole.FRAME)} strokeDasharray="10,5" />
              {/* Ground symbols */}
              <path d={`M ${Ax-10} ${Ay-10} L ${Ax+10} ${Ay-10} L ${Ax} ${Ay} Z`} fill="#94a3b8" />
              <path d={`M ${Dx-10} ${Dy-10} L ${Dx+10} ${Dy-10} L ${Dx} ${Dy} Z`} fill="#94a3b8" />
            </g>

            {/* INPUT (Link 2) */}
            <line x1={Ax} y1={Ay} x2={Bx} y2={By} className={getLinkColor(LinkRole.INPUT)} strokeWidth={getStrokeWidth(LinkRole.INPUT)} strokeLinecap="round" />
            
            {/* COUPLER (Link 3) */}
            <line x1={Bx} y1={By} x2={Cx} y2={Cy} className={getLinkColor(LinkRole.COUPLER)} strokeWidth={getStrokeWidth(LinkRole.COUPLER)} strokeLinecap="round" />
            
            {/* OUTPUT (Link 4) */}
            <line x1={Cx} y1={Cy} x2={Dx} y2={Dy} className={getLinkColor(LinkRole.OUTPUT)} strokeWidth={getStrokeWidth(LinkRole.OUTPUT)} strokeLinecap="round" />

            {/* JOINTS */}
            <circle cx={Ax} cy={Ay} r={6} fill="white" stroke="#1e293b" strokeWidth="2" />
            <circle cx={Bx} cy={By} r={6} fill="white" stroke="#1e293b" strokeWidth="2" />
            <circle cx={Cx} cy={Cy} r={6} fill="white" stroke="#1e293b" strokeWidth="2" />
            <circle cx={Dx} cy={Dy} r={6} fill="white" stroke="#1e293b" strokeWidth="2" />

            {/* LABELS (Need to be flipped back because of global SVG flip) */}
            <g transform="scale(1, -1)">
                <text x={Ax} y={-Ay + 25} textAnchor="middle" className="text-xs fill-slate-500 font-bold">Frame (A)</text>
                <text x={Dx} y={-Dy + 25} textAnchor="middle" className="text-xs fill-slate-500 font-bold">Frame (D)</text>
                <text x={Bx} y={-By - 15} textAnchor="middle" className="text-xs fill-slate-600 font-bold">B</text>
                <text x={Cx} y={-Cy - 15} textAnchor="middle" className="text-xs fill-slate-600 font-bold">C</text>
                
                {/* Midpoint Labels for Links */}
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
      
      {/* Legend Overlay */}
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

export default LinkageCanvas;