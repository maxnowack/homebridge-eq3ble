## Homebridge EQ3BLE
Homebridge plugin to control EQ3 bluetooth thermostats

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



## License
Licensed under GPLv3 license. Copyright (c) 2015 Max Nowack

## Contributions
Contributions are welcome. Please open issues and/or file Pull Requests.

## Maintainers
- Max Nowack ([maxnowack](https://github.com/maxnowack))
