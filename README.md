## homebridge-eq3ble-sensor
Homebridge plugin to control EQ3 bluetooth thermostats

### usage
````json
{
  "bridge": {
    "name": "Homebridge",
    "username": "CC:22:3D:E3:CE:30",
    "port": 51826,
    "pin": "031-45-154"
  },

  "accessories": [{
    "accessory": "EQ3-Thermostat",
    "name": "Thermostat",
    "address": "00:1a:22:07:48:77"
  }]
}
````
