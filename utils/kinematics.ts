import { LinkLengths, JointCoordinates, GrashofType, LinkRole } from '../types.ts';

export const calculateJoints = (lengths: LinkLengths, thetaInput: number): JointCoordinates => {
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

export const determineGrashof = (lengths: LinkLengths): { type: GrashofType, shortest: LinkRole, longest: LinkRole } => {
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