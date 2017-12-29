import Thermostat from './Thermostat'
import MQTTClient from './MQTTClient'
import callbackify from './callbackify'
import { map as mapValue } from './constants'

function thermostatFactory({ Service, Characteristic }) {
  return class EQ3Thermostat {
    constructor(log, config) {
      this.log = log
      this.name = config.name
      this.address = config.address.toLowerCase()
      this.manualOnly = config.manual || false
      this.discoverTimeout = config.discoverTimeout || (60 * 1000) // 1 minute
      this.connectionTimeout = config.connectionTimeout || (10 * 1000) // 10 seconds
      this.disableBoostSwitch = false
      this.temperatureDisplayUnits = Characteristic.TemperatureDisplayUnits.CELSIUS

      this.thermostat = new Thermostat({
        address: this.address,
        manual: this.manualOnly,
        discoverTimeout: this.discoverTimeout,
        connectionTimeout: this.connectionTimeout,
      })

      this.thermostatService = new Service.Thermostat(this.name)
      this.informationService = new Service.AccessoryInformation()
      this.boostService = new Service.Switch(`${this.name} boost mode`)

      this.currentTemperature = null
      if (config.currentTemperature) {
        const mqttTemperature = new MQTTClient(config.currentTemperature)
        mqttTemperature.on('change', (temperature) => {
          this.thermostatService.setCharacteristic(Characteristic.CurrentTemperature, temperature)
          this.currentTemperature = temperature
        })
      }

      this.setupServices()
    }
    getServices() {
      return [
        this.informationService,
        this.thermostatService,
        !this.disableBoostSwitch && this.boostService,
      ]
    }
    setupServices() {
      this.boostService.setCharacteristic(Characteristic.Name, 'Boost Mode')

      this.informationService
        .setCharacteristic(Characteristic.Manufacturer, 'eq-3')
        .setCharacteristic(Characteristic.Model, 'CC-RT-BLE')

      const boostOn = this.boostService.getCharacteristic(Characteristic.On)
      const currentHeatingCoolingState = this.thermostatService
        .getCharacteristic(Characteristic.CurrentHeatingCoolingState)
      const targetHeatingCoolingState = this.thermostatService
        .getCharacteristic(Characteristic.TargetHeatingCoolingState)
      const currentTemperature = this.thermostatService
        .getCharacteristic(Characteristic.CurrentTemperature)
        .setProps({
          minValue: -100,
          maxValue: 100,
        })
      const targetTemperature = this.thermostatService
        .getCharacteristic(Characteristic.TargetTemperature)
        .setProps({
          minValue: 4.5,
          maxValue: 30,
        })
      const heatingThresholdTemperature = this.thermostatService
        .getCharacteristic(Characteristic.HeatingThresholdTemperature)

      boostOn
        .on('get', callbackify(() => this.getInfoValue('boost')))
        .on('set', callbackify(boost => this.thermostat.setBoost(boost)))

      currentHeatingCoolingState
        .on('get', callbackify(() => this.getInfoValue('currentHeatingCoolingState')))

      targetHeatingCoolingState
        .on('get', callbackify(() => this.getInfoValue('targetHeatingCoolingState')))
        .on('set', callbackify(state => this.thermostat.setTargetHeatingCoolingState(state)))

      currentTemperature
        .on('get', this.currentTemperature == null
          ? callbackify(() => this.getInfoValue('targetTemperature'))
          : callback => callback(null, this.currentTemperature))

      targetTemperature
        .on('get', callbackify(() => this.getInfoValue('targetTemperature')))
        .on('set', callbackify(temperature => this.thermostat.setTargetTemperature(temperature)))

      heatingThresholdTemperature
        .on('get', callbackify(() => this.getInfoValue('targetTemperature')))

      this.thermostat.on('info', (info) => {
        boostOn.setValue(info.boost)
        currentHeatingCoolingState.setValue(mapValue(Characteristic,
          info.currentHeatingCoolingState))
        targetHeatingCoolingState.setValue(mapValue(Characteristic,
          info.targetHeatingCoolingState))
        targetTemperature.setValue(info.targetTemperature)
        heatingThresholdTemperature.setValue(info.targetTemperature)

        if (this.currentTemperature == null) {
          currentTemperature.setValue(info.targetTemperature)
        }
      })
    }
    getInfoValue(what) {
      return this.thermostat.getCachedInfo().then(info => info[what])
    }
  }
}

module.exports = function register(homebridge) {
  const Service = homebridge.hap.Service
  const Characteristic = homebridge.hap.Characteristic

  homebridge.registerAccessory('homebridge-eq3ble', 'EQ3-Thermostat', thermostatFactory({
    Service,
    Characteristic,
  }))
}
