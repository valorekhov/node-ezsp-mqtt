#!/usr/bin/env node

import * as ezsp from './ezsp';
import * as mqtt from './mqtt';
import log from './logger';
import nconf from './nconf';

const rootTopic = nconf.get('rootTopic');
const broker = nconf.get('broker');
const credentials = {
    username: nconf.get('username'),
    password: nconf.get('password')
};
const port = nconf.get('port');
const baud = nconf.get('baud');

/*
 * Global variables
 */
var gatewayTopic;

/*
 * Fire up the ezsp and invoke the callback once the
 * ezsp is ready to receive commands.
 * 
 * Local and remote ezsps must have the same ID and use
 * API mode 2.
 */
ezsp.begin(port, baud, beginMqtt, whenezspMessageReceived);

/*
 * Start the MQTT client.  Use the local ezsp's 64-bit
 * address as part of the topic.
 */
function beginMqtt() {
    ezsp.getLocalNI().then(function (name: string) {
        name = name.trim();
        if (!name || name.length === 0) {
            log('error', 'Local ezsp NI not set.');
            name = 'UNKNOWN';
        }
        gatewayTopic = rootTopic + '/' + name;
        log('info', 'Gateway Topic: ' + gatewayTopic);
        mqtt.begin(broker, credentials, gatewayTopic, whenMqttMessageReceived);
    });
}

export function whenMqttMessageReceived(error: Error, topic: string, message: any) {

    if (error) {
        log(error);
        /*
         * Logging MQTT errors back to MQTT may create a infinite loop.
         */
        //mqtt.publishLog(error);
        return;
    }

    try {
        ezsp.transmitMqttMessage(message);
    } catch (error) {
        log(error);
        mqtt.publishLog(error);
    }
}

export function whenezspMessageReceived(error: Error, frame: any) {
    try {
        if (error) {
            log('error', error);
            if (mqtt.isConnected()) {
                mqtt.publishLog(error);
            }
        } else {
            if (mqtt.isConnected()) {
                mqtt.publishezspFrame(frame);
            }
        }
    } catch (error) {
        log('error', error);
        if (mqtt.isConnected()) {
            mqtt.publishLog(error);
        }
    }
}