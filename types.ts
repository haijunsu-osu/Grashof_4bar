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