import EQ3BLE from 'eq3ble'
import pTimeout from 'p-timeout'
import EventEmitter from 'events'
import validateAddress from 'is-mac'
import { TargetHeatingCoolingState } from './constants'
import parseInfo from './parseInfo'

export default class Thermostat extends EventEmitter {
  constructor({ address, manual, discoverTimeout, connectionTimeout }) {
    super()
    this.address = address.toLowerCase()
    this.discoverTimeout = discoverTimeout
    this.connectionTimeout = connectionTimeout
    this.manual = manual

    if (!validateAddress(this.address)) {
      throw new Error(`invalid address "${this.address}"`)
    }
  }

  discover() {
    return pTimeout(new Promise((resolve, reject) => {
      this.emit('discovering')
      EQ3BLE.discoverByAddress(this.address, (device) => {
        this.device = device
        this.emit('discovered', device)
        resolve()
      }, (err) => {
        this.discoverPromise = null
        this.emit('undiscoverable', err)
        reject(err)
      })
    }), this.discoverTimeout)
  }

  connect() {
    this.discoverPromise = this.discoverPromise || this.discover()
    return this.discoverPromise.then(() => {
      this.connectionPromise = this.connectionPromise || pTimeout(new Promise((resolve, reject) => {
        clearTimeout(this.timeout)
        if (this.isConnected) {
          this.connectionPromise = null
          resolve()
          return
        }
        this.emit('connecting')
        this.device.connectAndSetup().then(() => {
          this.emit('connected', this.device)
          this.connectionPromise = null
          this.isConnected = true
          this.startDisconnectTimeout()
          resolve()
        }, (err) => {
          this.emit('connectionError', err)
          this.connectionPromise = null
          this.isConnected = false
          this.discoverPromise = null
          reject(err)
        })
      }), this.connectionTimeout)
      return this.connectionPromise
    })
  }

  disconnect() {
    if (this.device) this.device.disconnect()
    this.isConnected = false
    this.connectionPromise = null
    this.emit('disconnected')
  }
  startDisconnectTimeout() {
    clearTimeout(this.timeout)
    this.timeout = setTimeout(this.disconnect.bind(this), this.connectionTimeout)
  }
  getInfo() {
    this.emit('gettingInfo')
    return this.connect()
      .then(() => this.device.getInfo())
      .then((raw) => {
        const info = parseInfo(raw)
        this.emit('info', info)
        return info
      })
  }
  getCachedInfo() {
    return new Promise((resolve, reject) => {
      if (this.info) {
        resolve(this.info)
        return
      }
      this.infoPromise = this.infoPromise || this.getInfo()
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
  setBoost(boost) {
    return this.connect().then(() => this.device.setBoost(boost))
  }
  setTargetTemperature(temperature) {
    return this.connect().then(() => this.device.setTemperature(temperature))
  }
  setTargetHeatingCoolingState(state) {
    return this.connect().then(() => {
			if (this.manual) {
				switch (state) {
					case TargetHeatingCoolingState.OFF: return this.device.turnOff()
					case TargetHeatingCoolingState.HEAT: return this.device.manualMode()
					case TargetHeatingCoolingState.AUTO: return this.device.manualMode()
					case TargetHeatingCoolingState.COOL: return this.device.manualMode()
					default: throw new Error('Unsupported mode')
				}
			}else{
				switch (state) {
					case TargetHeatingCoolingState.OFF: return this.device.turnOff()
					case TargetHeatingCoolingState.HEAT: return this.device.turnOn()
					case TargetHeatingCoolingState.AUTO: return this.device.automaticMode()
					case TargetHeatingCoolingState.COOL: return this.device.manualMode()
					default: throw new Error('Unsupported mode')
				}
			}
    })
  }
}
