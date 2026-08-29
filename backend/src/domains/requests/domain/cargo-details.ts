export interface RequestDimensions {
  length?: number
  width?: number
  height?: number
}

export interface RequestCargoDetails {
  weight?: number
  volume?: number
  dimensions?: RequestDimensions
  palletCount?: number
  fragility?: string
  options?: Record<string, boolean>
}
