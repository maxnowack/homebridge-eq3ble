import EQ3BLEPlatform, { setup } from './Platform';

module.exports = function setupEQ3BLEPlatform(homebridge) {
  setup(homebridge);
  homebridge.registerPlatform('homebridge-platform-eq3ble', 'EQ3BLE', EQ3BLEPlatform);
};
