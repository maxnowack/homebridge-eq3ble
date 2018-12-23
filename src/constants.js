import dotProp from 'dot-prop';

export const TargetHeatingCoolingState = {
  OFF: 'TargetHeatingCoolingState.OFF',
  HEAT: 'TargetHeatingCoolingState.HEAT',
  AUTO: 'TargetHeatingCoolingState.AUTO',
  COOL: 'TargetHeatingCoolingState.COOL',
};

export const CurrentHeatingCoolingState = {
  OFF: 'CurrentHeatingCoolingState.OFF',
  HEAT: 'CurrentHeatingCoolingState.HEAT',
};

export function map(Characteristic, value) {
  return dotProp.get(Characteristic, value);
}
