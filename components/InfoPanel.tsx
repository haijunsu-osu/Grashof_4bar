import React from 'react';
import { GrashofType, LinkLengths, LinkRole } from '../types';

interface InfoPanelProps {
  grashofInfo: { type: GrashofType, shortest: LinkRole, longest: LinkRole };
  lengths: LinkLengths;
}

const InfoPanel: React.FC<InfoPanelProps> = ({ grashofInfo, lengths }) => {
  const { frame: d, input: a, coupler: b, output: c } = lengths;
  
  // Identify S, L, P, Q explicitly for display
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

export default InfoPanel;