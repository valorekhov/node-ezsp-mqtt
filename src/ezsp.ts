import {ControllerApplication} from 'node-ezsp'
import { EmberApsOption, EmberApsFrame } from "node-ezsp/lib/types";
var log = require('./logger');

var C = xbee_api.constants;

export class EzspGateway {

    application = new ControllerApplication()

    /**
     * Start a connection with the local XBee.
     * @param {string} port - XBee serial port
     * @param {int} baud - XBee baud rate
     * @param {int} apiMode - 1 or 2
     * @param {function ()} readyCallback - called when XBee connection is ready.
     * @param {function(error, frame)} messageCallback - called when an XBee frame
     * is received or there is an error. 
     */
    begin(port: string, baud: number, readyCallback: Function, messageCallback: Function) {

        const application = this.application;

        application.on('incomingMessage', ({ apsFrame, sender, message }: { apsFrame: EmberApsFrame, sender: number, message: Buffer }) => {
            console.log('incomingMessage', sender, apsFrame, message);
        });

        application.startup(port, {
            baudRate: baud || 57600,
            parity: 'none',
            stopBits: 1,
            xon: true,
            xoff: true
        }).then(async () => {
            var res = await application.request(0xA329, {
                clusterId: 0x11, profileId: 0xC105,
                sequence: 1,
                sourceEndpoint: 0xE8, destinationEndpoint: 0xE8,
                options: EmberApsOption.APS_OPTION_FORCE_ROUTE_DISCOVERY | EmberApsOption.APS_OPTION_RETRY
            }, Buffer.from('\nTESTING!\n'), 0);

            console.log('Sent=', res);
        });


        if (!readyCallback || readyCallback.length !== 0) {
            throw new TypeError("Invalid readyCallback - function has 1 argument.");
        }

        if (!messageCallback || messageCallback.length !== 2) {
            throw new TypeError("Invalid messageCallback - function has 2 arguments.");
        }

        xbeeAPI = new xbee_api.XBeeAPI({ api_mode: apiMode });

        serialport = new SerialPort(port, {
            baudrate: baud,
            parser: xbeeAPI.rawParser()
        });

        serialport.on('open', function () {
            log('debug', 'Serial Port Open');
            readyCallback();
        });

        serialport.on('error', function (error) {
            log('error', error);
            messageCallback(error, null);
        });

        xbeeAPI.on('frame_object', function (frame) {
            messageCallback(null, frame);
        });

        xbeeAPI.on('error', function (error) {
            log('error', error);
            messageCallback(error, null);
        });
    }

    end(callback) {
        serialport.close(callback);
    }

    transmitMqttMessage(message) {

        var frame;

        try {
            frame = JSON.parse(message);
        } catch (error) {
            throw error;
        }

        /*
         * JSON doesn't support hex numbers.  If a hex string was sent,
         * convert it to an integer.
         */
        if (typeof frame.type === 'string') {
            frame.type = parseInt(frame.type);
        }
        if (typeof frame.id === 'string') {
            frame.id = parseInt(frame.id);
        }

        /*
         * If the sender doesn't include a commandParameter array, add it for
         * them.  This is for convenience, as many commands don't take parameters.
         */
        if (!frame.commandParameter) {
            frame.commandParameter = [];
        }

        serialport.write(xbeeAPI.buildFrame(frame));
    }


    /*
     * Send an XBee request and return a promise fulfilled with the response.
     */
    xbeeCommand(frame) {
        var timeout = 5000;
        frame.id = xbeeAPI.nextFrameId();
        var deferred = q.defer();

        var callback = function (receivedFrame) {
            if (receivedFrame.id === frame.id) {
                // This is our frame's response. Resolve the promise.
                deferred.resolve(receivedFrame);
            }
        };

        setTimeout(function () {
            xbeeAPI.removeListener('frame_object', callback);
        }, timeout + 1000);

        xbeeAPI.on('frame_object', callback);
        serialport.write(xbeeAPI.buildFrame(frame));
        return deferred.promise.timeout(timeout, "XBee not responding.").then(
            function (response) {
                return response;
            }, function (timeout) {
                log('error', timeout.message);
            });
    }

    /**
     * Return a promise that resolves with the 64-bit address of the local XBee.
     */
    getLocalAddress() {
        var gw = null;
        var frame = {
            type: C.FRAME_TYPE.AT_COMMAND,
            commandParameter: []
        };
        frame.command = 'SH';
        return xbeeCommand(frame)
            .then(function (sh) {
                gw = sh.commandData.toString('hex');
                frame.command = 'SL';
                return xbeeCommand(frame);
            }).then(function (sl) {
                gw += sl.commandData.toString('hex');
                return gw;
            });
    }

    getLocalNI() {
        var frame = {
            type: C.FRAME_TYPE.AT_COMMAND,
            command: 'NI',
            commandParameter: []
        };
        return xbeeCommand(frame)
            .then(function (ni) {
                return ni.commandData.toString();
            });
    }
}