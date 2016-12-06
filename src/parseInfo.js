import { TargetHeatingCoolingState, CurrentHeatingCoolingState } from './constants'

export default function parseInfo({ status: { manual, boost }, valvePosition, targetTemperature }) {
  const info = { boost }

  info.currentHeatingCoolingState = valvePosition
    ? CurrentHeatingCoolingState.HEAT
    : CurrentHeatingCoolingState.OFF

  info.targetHeatingCoolingState = (() => {
    if (targetTemperature <= 4.5) return TargetHeatingCoolingState.OFF
    if (targetTemperature >= 30 || boost) return TargetHeatingCoolingState.HEAT
    if (manual) return TargetHeatingCoolingState.COOL
    return TargetHeatingCoolingState.AUTO
  })()

  info.targetTemperature = targetTemperature < 10 ? 10 : targetTemperature

  return info
}
