import EQ3BLE from 'eq3ble'
import mqtt from 'mqtt'

export default function createThermostat({ Service, Characteristic }) {
  return class EQ3Thermostat {
    constructor(log, config) {
      this.log = log
      this.name = config.name
      this.address = config.address
      this.discoverTimeout = config.discoverTimeout || (60 * 1000) // 1 minute
      this.connectionTimeout = config.connectionTimeout || (10 * 1000) // 10 seconds
      this.disableBoostSwitch = false
      this.device = null
      this.info = null
      this.isConnected = false

      this.temperatureDisplayUnits = Characteristic.TemperatureDisplayUnits.CELSIUS

      this.thermostatService = new Service.Thermostat(this.name)
      this.informationService = new Service.AccessoryInformation()
      this.boostService = new Service.Switch(`${this.name} boost mode`)
      this.currentTemperature = null

      if (config.currentTemperature) {
        this.mqttClient = mqtt.connect(config.currentTemperature.url, {
          keepalive: 10,
          clientId: 'mqttjs_'.concat(Math.random().toString(16).substr(2, 8)),
          protocolId: 'MQTT',
          protocolVersion: 4,
          clean: true,
          reconnectPeriod: 1000,
          connectTimeout: 30 * 1000,
          will: {
            topic: 'WillMsg',
            payload: 'Connection Closed abnormally..!',
            qos: 0,
            retain: false,
          },
          username: config.currentTemperature.username,
          password: config.currentTemperature.password,
          rejectUnauthorized: false,
        })

        this.mqttClient.on('connect', () => {
          this.mqttClient.subscribe(config.currentTemperature.topic)
        })

        this.mqttClient.on('message', (topic, message) => {
          const mqttData = JSON.parse(message)
          if (mqttData === null) { return null }
          this.currentTemperature = parseFloat(mqttData)
          this.thermostatService
            .setCharacteristic(Characteristic.CurrentTemperature, this.currentTemperature)
          return this.currentTemperature
        })
      }

      this.boostService
        .setCharacteristic(Characteristic.Name, 'Boost Mode')
        .getCharacteristic(Characteristic.On)
        .on('get', this.execAfterConnect.bind(this, this.getBoost.bind(this)))
        .on('set', this.execAfterConnect.bind(this, this.setBoost.bind(this)))

      this.informationService
        .setCharacteristic(Characteristic.Manufacturer, 'eq-3')
        .setCharacteristic(Characteristic.Model, 'CC-RT-BLE')

      this.thermostatService
        .getCharacteristic(Characteristic.CurrentHeatingCoolingState)
        .on('get', this.execAfterConnect.bind(this, this.getCurrentHeatingCoolingState.bind(this)))

      this.thermostatService
        .getCharacteristic(Characteristic.TargetHeatingCoolingState)
        .on('get', this.execAfterConnect.bind(this, this.getTargetHeatingCoolingState.bind(this)))
        .on('set', this.execAfterConnect.bind(this, this.setTargetHeatingCoolingState.bind(this)))

      if (this.mqttClient) {
        this.thermostatService
          .getCharacteristic(Characteristic.CurrentTemperature)
          .on('get', this.getCurrentTemperature.bind(this))
      } else {
        this.thermostatService
          .getCharacteristic(Characteristic.CurrentTemperature)
          .on('get', this.execAfterConnect.bind(this, this.getTargetTemperature.bind(this)))
      }

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


      this.discoverPromise = this.discover().catch((err) => {
        this.log(err)
      })
    }
    discover() {
      return new Promise((resolve, reject) => {
        this.log(`discovering thermostat (${this.address})`)
        const discoverTimeout = setTimeout(() => {
          this.discoverPromise = null
          this.log(`cannot discover thermostat (${this.address})`)
          reject(new Error(`discovering thermostat timed out (${this.address})`))
        }, this.discoverTimeout)
        EQ3BLE.discoverByAddress(this.address, (device) => {
          clearTimeout(discoverTimeout)
          this.device = device
          this.log(`discovered thermostat (${this.address})`)
          resolve()
        }, (err) => {
          this.discoverPromise = null
          this.log(`cannot discover thermostat (${this.address}): ${err}`)
          reject(new Error(`discovering thermostat (${this.address}) resulted in error ${err}`))
        })
      })
    }
    connect() {
      this.discoverPromise = this.discoverPromise || this.discover()
      return this.discoverPromise.then(() => {
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
            this.discoverPromise = null
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
            this.discoverPromise = null
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

    getBoost(callback, ...args) {
      const lastArg = args && args[args.length - 1]
      if (lastArg.isError) return callback(lastArg)
      return this.getCachedInfo().then(({ boost }) => {
        callback(null, boost)
      }, deviceErr => callback(deviceErr))
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
        } else if (targetTemperature >= 30 || status.boost) {
          callback(null, Characteristic.TargetHeatingCoolingState.HEAT)
        } else if (status.manual) {
          callback(null, Characteristic.TargetHeatingCoolingState.COOL)
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
    getCurrentTemperature(callback) {
      this.log(this.name, ' - MQTT : ', this.currentTemperature)
      callback(null, this.currentTemperature)
    }
    getTemperatureDisplayUnits(callback, ...args) {
      const lastArg = args && args[args.length - 1]
      if (lastArg.isError) return callback(lastArg)
      return callback(null, this.temperatureDisplayUnits)
    }
    setBoost(value, callback, ...args) {
      const lastArg = args && args[args.length - 1]
      if (lastArg.isError) return callback(lastArg)
      return this.device.setBoost(value).then(() => callback(),
        deviceErr => callback(deviceErr))
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
        case Characteristic.TargetHeatingCoolingState.COOL:
          return this.device.manualMode().then(() => callback(),
            deviceErr => callback(deviceErr))
        default: return callback('Unsupported mode')
      }
    }

    getServices() {
      return [
        this.informationService,
        this.thermostatService,
        !this.disableBoostSwitch && this.boostService,
      ]
    }
  }
}
