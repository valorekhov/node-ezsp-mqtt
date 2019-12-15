# Migrated to GitLab: https://gitlab.com/valorekhov/node-ezsp-mqtt

# node-ezsp-mqtt

MQTT Gateway for Ember EZSP protocol devides based on xbmq-js.
Provides for two-way communication with ZigBee networks through MQTT messages.

Quick Start
------------
Install node-ezsp-mqtt via `npm install node-ezsp-mqtt`. 
Installation on RaspberryPI requires additional `--unsafe-perm --build-from-source` args
due to the SerialPort dependency

Configure the local Ember device:

Configure node-ezsp-mqtt with your mqtt and serial port settings using command-line
arguments.  The arguments and their default values are:

* --rootTopic zbgw
* --broker mqtt://test.mosquitto.org
* --username (none)
* --password (none)
* --port /dev/ttyUSB0
* --baud 9600
* --log ./ezgw.log
* --loglevel info

Alternatively, use a config file instead.  Copy or rename `config.json.sample` to 
`config.json`.  Note: Command-line arguments override config.json.


Operation
---------
All MQTT messages (to and from the ZigBee network) are published to subtopics of
`rootTopic/gatewayIdentifier`, where `rootTopic` is configured as above
and `gatewayIdentifier` is the NI value of the local ZigBee.  If NI is not set, the
radio's 64-bit address will be used instead.

### Topic: rootTopic/gatewayIdentifier/online
* _Message Type:_ String
* _Message Value:_ "1" for online, "0" for offline
* _Description:_ Messages are published to this topic by the gateway to 
  indicate the gateway's online status.  

### Topic: rootTopic/gatewayIdentifier/response
* _Message Type:_ JSON
* _Message Value:_ An [EZSP](https://github.com/valorekhov/node-EZSP) frame
* _Description:_ Messages from the ZigBee network are published to this topic. 

### Topic: rootTopic/gatewayIdentifier/nodeIdentifier/response
* _Message Type:_ JSON
* _Message Value:_ An [EZSP](https://github.com/valorekhov/node-EZSP) frame
* _Description:_ Messages from a specific node are published to this topic. 

### Topic: rootTopic/gatewayIdentifier/request
* _Message Type:_ JSON
* _Message Value:_ An [EZSP](https://github.com/valorekhov/node-EZSP) frame
* _Description:_ Mqtt clients can publish to this topic to issue commands to the 
  ZigBee network.  

### Topic: rootTopic/gatewayIdentifier/log
* _Message Type:_ JSON
* _Message Value:_ Log messages.  Verbosity is controlled by `--loglevel`.
* _Description:_ Similar to what appears in the local log file.

Tips for Using with MQTT Clients
--------------------------------
### MQTT module for NodeJS 
* Call JSON.parse(message) on messages received from the `request` topic.
* Call JSON.stringify(message) on ZigBee frame objects before publishing.

### Node-Red
* Connect a JSON node to the output of the MQTT node that is subscribed to the
`request` topic.

Interop With XBee Devices
--------------------------------
1. Suggested configuration
```text
ZS 2 Stack profile #2
EE 1 #Enable Device Security
EO 1
KY 5A6967426565416C6C69616E63653039 #Trust Center Key for HA
SE E8
DE E8
CI 11
DH 0  #All Packets will be sent to the EZSP gateway, also the coordinator on the network
DL 0 
ID <Hex value of the extended pan ID as obtained from the logs>
```

2. Send a message to the rootTopic/gatewayId/permit-joining topic with values 0..255
Where 0 disables any future joins, 255 enables permanently and any value in between enables for the given number of seconds.

3. Monitor logs and the devices.json file for the new device entry upon a successful join.

About
-----
* based on xbmq-js, copyright 2015-2016 Andrew Bythell, [abythell@ieee.org](mailto:abythell@ieee.org), http://github.com/angryelectron/xbmq-js
* port by Val Orekhov

node-ezsp-mqtt is free software: you can redistribute it and/or modify it under the terms
of the GNU General Public License as published by the Free Software Foundation,
either version 3 of the License, or (at your option) any later version.

node-ezsp-mqtt is distributed in the hope that it will be useful, but WITHOUT ANY
WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A
PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with
node-ezsp-mqtt. If not, see http://www.gnu.org/licenses/.
