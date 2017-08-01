#!/usr/bin/env node

import { EzspGateway } from './ezsp';
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

const ezsp = new EzspGateway();

/*
 * Global variables
 */
let gatewayTopic: string;

function whenMqttMessageReceived(error: Error, topic: string, message: any) {
    if (error) {
        log.error(error);
        /*
         * Logging MQTT errors back to MQTT may create a infinite loop.
         */
        //mqtt.publishLog(error);
        return;
    }

    if (topic.endsWith('/permit-joining')) {
        return ezsp.permitJoining(parseInt(message, 10));
    }

    let arr = topic.split('/');
    let idx = arr.indexOf('request');
    if (idx < 1) {
        throw new Error('Invalid topic format' + topic);
    }
    let address = arr[idx - 1];

    let obj = JSON.parse(message);

    try {
        ezsp.transmitMqttMessage(address, obj.apsFrame, obj.message.data || obj.message);
    } catch (error) {
        log.error(error);
        mqtt.publishLog(error);
    }
}

function whenEzspMessageReceived(frame: any) {
    try {
        if (mqtt.isConnected()) {
            mqtt.publishEzspFrame(frame);
        }
    } catch (error) {
        log.error(error);
        if (mqtt.isConnected()) {
            mqtt.publishLog(error);
        }
    }
}

async function run() {
    /*
     * Fire up the ezsp and invoke the callback once the
     * ezsp is ready to receive commands.
     */
    let networkParams = await ezsp.begin(port, baud, whenEzspMessageReceived);
    log.info('Ember Node Type: %s, EPAN ID: 0x%s, PAN ID: 0x%s',
        networkParams.nodeType, 
        Buffer.from((networkParams.networkParams as any)['extendedPanId'].reverse()).toString('hex'), 
        (networkParams.networkParams as any)['panId'].toString(16)
    );
    const localAddress = await ezsp.getLocalAddress();

    gatewayTopic = rootTopic + '/' + localAddress;
    log.info('Gateway Topic: ' + gatewayTopic);
    mqtt.begin(broker, credentials, gatewayTopic, whenMqttMessageReceived);
    log.info('Started!');
}

run();