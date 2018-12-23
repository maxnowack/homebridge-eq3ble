import { discoverAll } from 'eq3ble';
import EQ3BLEAccessory from './Accessory';

export { setup } from './Accessory';

export default class EQ3BLEPlatform {
  constructor(log, config, api) {
    this.log = log;
    this.config = config;
    this.disableBoostSwitch = config.disableBoostSwitch;
    this.api = api;

    // if (!this.config) {
    //   this.log.warn('Ignoring EQ3BLE Platform setup because it is not configured');
    //   this.disabled = true;
    // }
  }

  accessories(callback) {
    const devices = [];

    if (this.disabled) {
      callback(devices);
      return;
    }

    this.log('discovery started');
    const helper = discoverAll((device) => {
      devices.push(device);
      this.log(`discovered eq3ble device with address ${device.address}`);
    }, 30 * 1000);
    helper.on('stopScanning', () => {
      this.log(`found ${devices.length} devices`);
      callback(devices.map(device => this.createAccessory(device)));
    });
  }

  createAccessory(device) {
    return new EQ3BLEAccessory(this.log, device, this.disableBoostSwitch);
  }
}
