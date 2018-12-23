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

  "platforms": [{
    "platform": "EQ3BLE",
    "disableBoostSwitch": false
  }]
}
````

## License
Licensed under GPLv3 license. Copyright (c) 2015 Max Nowack

## Contributions
Contributions are welcome. Please open issues and/or file Pull Requests.

## Maintainers
- Max Nowack ([maxnowack](https://github.com/maxnowack))
