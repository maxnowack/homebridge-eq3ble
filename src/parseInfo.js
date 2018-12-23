import { TargetHeatingCoolingState, CurrentHeatingCoolingState, map } from './constants';

function parseTargetState({ targetTemperature, manualMode, boost }) {
  if (targetTemperature <= 4.5) return TargetHeatingCoolingState.OFF;
  if (targetTemperature >= 30 || boost) return TargetHeatingCoolingState.HEAT;
  if (manualMode) return TargetHeatingCoolingState.COOL;
  return TargetHeatingCoolingState.AUTO;
}

export default function parseInfo(data, Characteristic) {
  const {
    boost,
    valvePosition,
    targetTemperature,
  } = data;
  const info = { boost, targetTemperature };

  info.currentHeatingCoolingState = map(Characteristic, valvePosition
    ? CurrentHeatingCoolingState.HEAT
    : CurrentHeatingCoolingState.OFF);

  info.targetHeatingCoolingState = map(Characteristic, parseTargetState(data));

  return info;
}
