## Homebridge EQ3BLE
Homebridge plugin to control EQ3 bluetooth thermostats.

It's possible to report MQTT topic's messages as current temperature of this thermostat.

### Usage
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

## Options

You can configure the homebridge integration for the thermostat with the following options

| Option | Default value | Description |
| --- | --- | --- |
| `address` *(required)* |  | Address of the thermostat |
| `discoverTimeout` | `60000` | time in milliseconds before a timeout error will be triggered |
| `connectionTimeout` | `10000` | time in milliseconds before homebridge will disconnect from the device after last action |
| `disableBoostSwitch` | `false` | if set to true, the boost switch won't be published from homebridge |
| `currentTemperature` |  | MQTT configuration for current temperature |

### External current temperature configuration options

| Option | Description |
| --- |  --- |
| `url` *(required)* | MQTT URL |
| `topic` *(required)* | MQTT Topic name |
| `username` | Username for accessing MQTT server |
| `password` | Password for accessing MQTT server |

## Usage with external current temperature sensor
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
    "name": "Bedroom Thermostat",
    "address": "00:1a:22:07:48:77",
    "currentTemperature": {
      "url": "mqtt://localhost",
      "topic": "/home/sensors/bedroom/temperature",
      "username": "sensors",
      "password": "Sensors!"
    }
  }]
}
````


## License
Licensed under GPLv3 license. Copyright (c) 2015 Max Nowack

## Contributions
Contributions are welcome. Please open issues and/or file Pull Requests.

## Maintainers
- Max Nowack ([maxnowack](https://github.com/maxnowack))
