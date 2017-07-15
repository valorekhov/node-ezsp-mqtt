import { ControllerApplication } from 'node-ezsp'
import { EmberApsFrame, EmberEUI64 } from 'node-ezsp/lib/types';

export class EzspGateway {

    application = new ControllerApplication();

    /**
     * Start a connection with the local XBee.
     * @param {string} port - XBee serial port
     * @param {int} baud - XBee baud rate
     * @param {int} apiMode - 1 or 2
     * @param {function ()} readyCallback - called when XBee connection is ready.
     * @param {function(error, frame)} messageCallback - called when an XBee frame
     * is received or there is an error. 
     */
    begin(port: string, baud: number, messageCallback: (payload: {}) => void) {
        if (!messageCallback) {
            throw new TypeError("Invalid messageCallback");
        }

        const application = this.application;

        application.on('incomingMessage', messageCallback);

        return application.startup(port, {
            baudRate: baud || 57600,
            parity: 'none',
            stopBits: 1,
            xon: true,
            xoff: true
        })

        /*.then(async () => {
            var res = await application.request(0xA329, {
                clusterId: 0x11, profileId: 0xC105,
                sequence: 1,
                sourceEndpoint: 0xE8, destinationEndpoint: 0xE8,
                options: EmberApsOption.APS_OPTION_FORCE_ROUTE_DISCOVERY | EmberApsOption.APS_OPTION_RETRY
            }, Buffer.from('\nTESTING!\n'), 0);

            console.log('Sent=', res);
        });*/
    }

    end() {
        return this.application.stop();
    }

    transmitMqttMessage(nwk: number | string, apsFrame: EmberApsFrame, message: string) {
        if (typeof(nwk)==='string'){
            nwk = new EmberEUI64(nwk) as any;
        }
        return this.application.request(nwk as any, apsFrame, Buffer.from(message))
    }
    
    /**
     * Return a promise that resolves with the 64-bit address of the local XBee.
     */
    getLocalAddress() {
        return this.application.getLocalEUI64();
    }
}