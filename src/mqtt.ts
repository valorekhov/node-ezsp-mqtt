import * as Mqtt from 'mqtt';
import log from './logger';
import nconf from './nconf';

let mqtt: Mqtt.Client | undefined;
let rootTopic: string | undefined;
let connected = false;

const expandResponseTopics : boolean = nconf.get('expandResponseTopics');

export function isConnected() {
    return connected && mqtt && rootTopic;
}

/*
 * Start the MQTT client, establish LWT, subscribe to the request topic,
 * and listen for incoming messages.
 */
export function begin(broker: string, credentials: { username: string, password: string }, topic: string, messageCallback: Function, connectedCallback?: Function) {
    if (!topic)
        throw new ReferenceError("Invalid root topic.");
    if (!broker)
        throw new ReferenceError("Invalid broker.");

    rootTopic = topic;

    var mqttOptions = <Mqtt.IClientOptions>{
        clientId: 'zbmq-' + Math.random().toString(16).substr(2, 8),
        clean: false,
        keepalive: 60,
        reconnectPeriod: 15000,
        will: {
            topic: rootTopic + '/online',
            payload: '0',
            qos: 0,
            retain: true
        }
    };

    if (credentials && credentials.username && credentials.password) {
        mqttOptions.username = credentials.username;
        mqttOptions.password = credentials.password;
    };

    mqtt = Mqtt.connect(broker, mqttOptions);

    mqtt.on('reconnect', function () {
        /*
         * Emitted when a reconnection starts.
         */
        log.debug('Reconnecting');
    });

    mqtt.on('close', function () {
        /*
         * Emitted after the client has disconnected from the broker.
         */
        log.debug( 'Closing');
        connected = false;
    });

    mqtt.on('offline', function () {
        /*
         * Emitted when the client goes offline. 
         */
        log.debug('Offline');
    });

    mqtt.on('connect', function (connack: any) {
        log.debug('Connected to ' + broker);
        connected = true;
        publishOnlineStatus(true);
        if (connack.sessionPresent) {
            /* This is a reconnect.  No need to re-subscribe or
             * call the callback.
             */
            return;
        }
        mqtt && mqtt.subscribe(rootTopic + '/+/request', {}, function (error: any) {
            if (error) {
                return messageCallback(error);
            }
        });

        if (connectedCallback) {
            connectedCallback();
        }
    });

    mqtt.on('error', function (error) {
        log.error(error);
        return messageCallback(error, null, null);
    });

    mqtt.on('message', function (topic, message) {
        log.error('Received: ' + topic + ': ' + message);
        return messageCallback(null, topic, message.toString());
    });

}

/**
 * Close the MQTT client.  Does nothing if the client is not open.
 * @param {function} callback - Function called once the MQTT client has closed.
 */
export function end(callback: Function) {
    if (mqtt) {
        publishOnlineStatus(false);
        mqtt.end(false, function () {
            mqtt = undefined;
            rootTopic = undefined;
            if (callback) {
                callback();
            }
        });

    }
}

/**
 * Publish ZBMQ Gateway's online status to the `online` topic.  Will publish
 * "1" when online or "0" when offline.
 * @param {Boolean} isOnline - true for online, false for offline
 *
 */
export function publishOnlineStatus(isOnline: boolean) {
    var message = isOnline ? '1' : '0';
    var topic = rootTopic + '/online';
    mqtt && mqtt.publish(topic, message, { retain: true });
    connected = isOnline;
}

/**
 * Publish an XBee API frame to the `response` topic.
 * @param {type} frame - XBee API Frame object.
 * @throws {ReferenceError} - If begin() not called or rootTopic is false.
 * @throws {ReferenceError} - If frame is invalid or has no remote64 address.
 */
export function publishEzspFrame(frame:any) {
    if (!mqtt || !isConnected()) throw new ReferenceError("MQTT not conencted.");
    if (!frame) return; /* don't publish empty frames */
    var topic = rootTopic + '/response';
    var message = JSON.stringify(frame);
    log.debug('Sending: ' + topic + ': ' + message);
    mqtt.publish(topic, message);

    if (expandResponseTopics){
        let topic = `${rootTopic}/${frame.senderEui64 || ('nwk:0x' + frame.sender.toString(16))}/response`;
        delete frame.senderEui64;
        message = JSON.stringify(frame);
        log.debug('Sending: ' + topic + ': ' + message);
        mqtt.publish(topic, message);
    }
}

/**
 * Publish a message to the `log` topic.
 * @param {type} message - The string or Error to be published.
 * @throws {ReferenceError}  - If begin() not called or rootTopic is false.
 * @throws {TypeError} - If message is not an Error or a string.
 */
export function publishLog(message: string | Error) {
    if (!mqtt || !isConnected()) {
        throw new ReferenceError("MQTT not conencted.");
    }
    if (!message || !(message instanceof Error) || !(typeof message === 'string')) {
        throw new TypeError("Mesage must be an Error or a String.");
    }
    var topic = rootTopic + '/log';
    mqtt.publish(topic, (message as Error).message || (message as string), { retain: true });
}