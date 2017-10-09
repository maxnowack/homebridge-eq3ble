import parseInfo from './parseInfo';

let Characteristic;
let Service;

export function setup(homebridge) {
  Characteristic = homebridge.hap.Characteristic; // eslint-disable-line prefer-destructuring
  Service = homebridge.hap.Service; // eslint-disable-line prefer-destructuring
}

export default class EQ3BLEAccessory {
  constructor(log, device, disableBoostSwitch) {
    this.state = {};
    this.log = log;
    this.name = device.address;
    this.address = device.address;
    this.disableBoostSwitch = disableBoostSwitch;
    this.temperatureDisplayUnits = Characteristic.TemperatureDisplayUnits.CELSIUS;

    this.thermostat = device;

    this.thermostatService = new Service.Thermostat(this.name);
    this.informationService = new Service.AccessoryInformation();
    this.boostService = new Service.Switch(`${this.name} boost mode`);

    this.currentTemperature = null;

    this.setupServices();
  }

  getServices() {
    const services = [
      this.informationService,
      this.thermostatService,
    ];
    if (!this.disableBoostSwitch) services.push(this.boostService);
    return services;
  }

  setBoost(boost, callback) {
    if (boost === this.state.boost) {
      callback(null);
      return;
    }
    this.state.boost = boost;
    this.log('set boost', this.name, boost);
    this.thermostat.setBoost(boost)
      .then(() => {
        this.thermostat.getInfo();
        callback(null);
      })
      .catch(err => callback(err));
  }
  setThermostatState(state) {
    switch (state) {
      case Characteristic.TargetHeatingCoolingState.OFF: return this.thermostat.turnOff();
      case Characteristic.TargetHeatingCoolingState.HEAT: return this.thermostat.turnOn();
      case Characteristic.TargetHeatingCoolingState.AUTO: return this.thermostat.automaticMode();
      case Characteristic.TargetHeatingCoolingState.COOL: return this.thermostat.manualMode();
      default: throw new Error('Unsupported mode');
    }
  }
  setTargetHeatingCoolingState(state, callback) {
    if (state === this.state.targetHeatingCoolingState) {
      callback(null);
      return;
    }
    this.state.targetHeatingCoolingState = state;
    this.log('set state', this.name, state);
    this.setThermostatState(state)
      .then(() => {
        this.thermostat.getInfo();
        callback(null);
      })
      .catch(err => callback(err));
  }
  setTargetTemperature(temperature, callback) {
    if (temperature === this.state.targetTemperature) {
      callback(null);
      return;
    }
    this.state.targetTemperature = temperature;
    this.log('set temperature', this.name, temperature);
    this.thermostat.setTemperature(temperature)
      .then(() => {
        this.thermostat.getInfo();
        callback(null);
      })
      .catch(err => callback(err));
  }

  setupServices() {
    this.boostService.setCharacteristic(Characteristic.Name, `${this.name} Boost Mode`);

    this.informationService
      .setCharacteristic(Characteristic.Manufacturer, 'eq-3')
      .setCharacteristic(Characteristic.Model, 'CC-RT-BLE');

    const boostOn = this.boostService.getCharacteristic(Characteristic.On);
    const currHeatingCoolingState = this.thermostatService
      .getCharacteristic(Characteristic.CurrentHeatingCoolingState);
    const targetHeatingCoolingState = this.thermostatService
      .getCharacteristic(Characteristic.TargetHeatingCoolingState);
    const currentTemperature = this.thermostatService
      .getCharacteristic(Characteristic.CurrentTemperature)
      .setProps({
        minValue: -100,
        maxValue: 100,
      });
    const targetTemperature = this.thermostatService
      .getCharacteristic(Characteristic.TargetTemperature)
      .setProps({
        minValue: 4.5,
        maxValue: 30,
      });
    const heatingThresholdTemperature = this.thermostatService
      .getCharacteristic(Characteristic.HeatingThresholdTemperature);

    boostOn
      .on('get', callback => callback(null, this.state.boost))
      .on('set', this.setBoost.bind(this));

    currHeatingCoolingState
      .on('get', callback => callback(null, this.state.currentHeatingCoolingState));

    targetHeatingCoolingState
      .on('get', callback => callback(null, this.state.targetHeatingCoolingState))
      .on('set', this.setTargetHeatingCoolingState.bind(this));

    currentTemperature
      .on('get', callback => callback(null, this.state.targetTemperature));

    targetTemperature
      .on('get', callback => callback(null, this.state.targetTemperature))
      .on('set', this.setTargetTemperature.bind(this));

    heatingThresholdTemperature
      .on('get', callback => callback(null, this.state.targetTemperature));

    this.thermostat.on('update', (data) => {
      this.log('update', this.thermostat.address, data);
      this.state = parseInfo(data, Characteristic);
      boostOn.setValue(this.state.boost);
      currHeatingCoolingState.setValue(this.state.currentHeatingCoolingState);
      targetHeatingCoolingState.setValue(this.state.targetHeatingCoolingState);
      targetTemperature.setValue(this.state.targetTemperature);
      heatingThresholdTemperature.setValue(this.state.targetTemperature);
      currentTemperature.setValue(this.state.targetTemperature);
    });

    this.thermostat.getInfo();
    setInterval(() => this.thermostat.getInfo(), 10 * 60 * 1000);
  }
}
