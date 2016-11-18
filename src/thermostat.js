import EQ3BLE from 'eq3ble'

export default function createThermostat({ Service, Characteristic }) {
  return class EQ3Thermostat {
    constructor(log, config) {
      this.log = log
      this.address = config.address
      this.discoverTimeout = config.discoverTimeout || (3 * 60 * 1000) // 3 minutes
      this.connectionTimeout = config.connectionTimeout || (10 * 1000) // 10 seconds
      this.device = null
      this.info = null
      this.isConnected = false

      this.temperatureDisplayUnits = Characteristic.TemperatureDisplayUnits.CELSIUS

      this.thermostatService = new Service.Thermostat(this.name)
      this.discovered = this.discover()
      this.discovered.catch((err) => { throw err })
    }
    discover() {
      return new Promise((resolve, reject) => {
        this.log(`discovering thermostat (${this.address})`)
        const discoverTimeout = setTimeout(() => {
          this.log(`cannot discover thermostat (${this.address})`)
          reject(`discovering thermostat timed out (${this.address})`)
        }, this.discoverTimeout)
        EQ3BLE.discoverByAddress(this.address, (device) => {
          clearTimeout(discoverTimeout)
          this.device = device
          this.log(`discovered thermostat (${this.address})`)
          resolve()
        })
      })
    }
    connect() {
      return this.discovered.then(() => {
        this.connectionPromise = this.connectionPromise || new Promise((resolve, reject) => {
          clearTimeout(this.timeout)
          if (this.isConnected) {
            this.connectionPromise = null
            resolve()
            return
          }
          this.log(`connecting to thermostat (${this.address})`)
          this.connectTimeout = setTimeout(() => {
            this.log(`connection to thermostat timed out (${this.address})`)
            this.connectionPromise = null
            this.isConnected = false
            reject(new Error(`connection to thermostat timed out (${this.address})`))
          }, this.discoverTimeout)
          this.device.connectAndSetup().then(() => {
            clearTimeout(this.connectTimeout)
            this.log(`connected to thermostat (${this.address})`)
            this.connectionPromise = null
            this.isConnected = true
            resolve()
          }, (err) => {
            clearTimeout(this.connectTimeout)
            this.log(`cannot connect to thermostat (${this.address})`)
            this.connectionPromise = null
            this.isConnected = false
            reject(err || new Error(`cannot connect to thermostat (${this.address})`))
          })
        })
        return this.connectionPromise
      })
    }
    disconnect() {
      if (this.device) this.device.disconnect()
      this.isConnected = false
      this.connectionPromise = null
      this.log(`disconnected from thermostat (${this.address})`)
    }
    startDisconnectTimeout() {
      clearTimeout(this.timeout)
      this.timeout = setTimeout(this.disconnect.bind(this), this.connectionTimeout)
    }
    execAfterConnect(fn, ...args) {
      this.connect().then(() => {
        fn(...args)
        this.startDisconnectTimeout()
      }, (err) => {
        err.isError = true
        fn(...args.concat(err))
      })
    }
    getDeviceInfo() {
      this.log(`getting thermostat info (${this.address})`)
      return this.device.getInfo().then((info) => {
        this.log(`got thermostat info (${this.address})`)
        return info
      })
    }
    getCachedInfo() {
      return new Promise((resolve, reject) => {
        if (this.info) {
          resolve(this.info)
          return
        }
        this.infoPromise = this.infoPromise || this.getDeviceInfo()
        this.infoPromise.then((info) => {
          this.info = info
          this.infoPromise = null
          resolve(this.info)
          setTimeout(() => {
            this.info = null
          }, 250)
        }, reject)
      })
    }

    getCurrentHeatingCoolingState(callback, ...args) {
      const lastArg = args && args[args.length - 1]
      if (lastArg.isError) return callback(lastArg)
      return this.getCachedInfo().then(({ valvePosition }) => {
        if (valvePosition) {
          callback(null, Characteristic.CurrentHeatingCoolingState.HEAT)
        } else {
          callback(null, Characteristic.CurrentHeatingCoolingState.OFF)
        }
      }, deviceErr => callback(deviceErr))
    }
    getTargetHeatingCoolingState(callback, ...args) {
      const lastArg = args && args[args.length - 1]
      if (lastArg.isError) return callback(lastArg)
      return this.getCachedInfo().then(({ targetTemperature, status }) => {
        if (targetTemperature <= 4.5) {
          callback(null, Characteristic.TargetHeatingCoolingState.OFF)
        } else if (targetTemperature >= 30 || status.manual || status.boost) {
          callback(null, Characteristic.TargetHeatingCoolingState.HEAT)
        } else {
          callback(null, Characteristic.TargetHeatingCoolingState.AUTO)
        }
      }, deviceErr => callback(deviceErr))
    }
    getTargetTemperature(callback, ...args) {
      const lastArg = args && args[args.length - 1]
      if (lastArg.isError) return callback(lastArg)
      return this.getCachedInfo().then(({ targetTemperature }) => {
        callback(null, targetTemperature < 10 ? 10 : targetTemperature)
      }, deviceErr => callback(deviceErr))
    }
    getTemperatureDisplayUnits(callback, ...args) {
      const lastArg = args && args[args.length - 1]
      if (lastArg.isError) return callback(lastArg)
      return callback(null, this.temperatureDisplayUnits)
    }
    setTemperatureDisplayUnits(value, callback, ...args) {
      const lastArg = args && args[args.length - 1]
      if (lastArg.isError) return callback(lastArg)
      this.temperatureDisplayUnits = value
      return callback()
    }
    setTargetTemperature(value, callback, ...args) {
      const lastArg = args && args[args.length - 1]
      if (lastArg.isError) return callback(lastArg)
      return this.device.setTemperature(value).then(() => callback(),
        deviceErr => callback(deviceErr))
    }
    setTargetHeatingCoolingState(value, callback, ...args) {
      const lastArg = args && args[args.length - 1]
      if (lastArg.isError) return callback(lastArg)
      switch (value) {
        case Characteristic.TargetHeatingCoolingState.OFF:
          return this.device.turnOff().then(() => callback(), deviceErr => callback(deviceErr))
        case Characteristic.TargetHeatingCoolingState.HEAT:
          return this.device.turnOn().then(() => callback(), deviceErr => callback(deviceErr))
        case Characteristic.TargetHeatingCoolingState.AUTO:
          return this.device.automaticMode().then(() => callback(),
            deviceErr => callback(deviceErr))
        default: return callback('Unsupport mode')
      }
    }

    getServices() {
      const informationService = new Service.AccessoryInformation()

      informationService
        .setCharacteristic(Characteristic.Manufacturer, 'eq-3')
        .setCharacteristic(Characteristic.Model, 'CC-RT-BLE')

      this.thermostatService
        .getCharacteristic(Characteristic.CurrentHeatingCoolingState)
        .on('get', this.execAfterConnect.bind(this, this.getCurrentHeatingCoolingState.bind(this)))

      this.thermostatService
        .getCharacteristic(Characteristic.TargetHeatingCoolingState)
        .on('get', this.execAfterConnect.bind(this, this.getTargetHeatingCoolingState.bind(this)))
        .on('set', this.execAfterConnect.bind(this, this.setTargetHeatingCoolingState.bind(this)))

      this.thermostatService
        .getCharacteristic(Characteristic.CurrentTemperature)
        .on('get', this.execAfterConnect.bind(this, this.getTargetTemperature.bind(this)))

      this.thermostatService
        .getCharacteristic(Characteristic.TargetTemperature)
        .on('get', this.execAfterConnect.bind(this, this.getTargetTemperature.bind(this)))
        .on('set', this.execAfterConnect.bind(this, this.setTargetTemperature.bind(this)))

      this.thermostatService
        .getCharacteristic(Characteristic.TemperatureDisplayUnits)
        .on('get', this.execAfterConnect.bind(this, this.getTemperatureDisplayUnits.bind(this)))
        .on('set', this.execAfterConnect.bind(this, this.setTemperatureDisplayUnits.bind(this)))

      this.thermostatService
        .getCharacteristic(Characteristic.HeatingThresholdTemperature)
        .on('get', this.execAfterConnect.bind(this, this.getTargetTemperature.bind(this)))

      return [informationService, this.thermostatService]
    }
  }
}
