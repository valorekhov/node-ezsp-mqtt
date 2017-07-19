import { ControllerApplication } from 'node-ezsp'
import { EmberApsFrame, EmberEUI64, EmberApsOption } from 'node-ezsp/lib/types';
import nconf from './nconf';
import {existsSync, writeFileSync} from 'fs'

const deviceDbPath = nconf.get('deviceDb');

export class EzspGateway {

    private application: ControllerApplication;
    private messageCallback: (payload: {}) => void;
    private sequence = 0;

    constructor(){
        this.application = new ControllerApplication(this.getDevices());
        this.application.on('deviceJoined', this.handleDeviceJoin.bind(this));
        this.application.on('deviceLeft', this.handleDeviceLeft.bind(this));
    }

    handleDeviceJoin(arr:any[]){
        let [nwk, ieee] = arr;
        let devices = this.getDevices();

        if (!devices.some(d=>d.nodeId === nwk || d.eui64 === ieee.toString())){
            devices.push({nodeId: nwk, eui64: ieee.toString()});
            writeFileSync(deviceDbPath, JSON.stringify(devices), 'utf8');
        }
    }

    handleDeviceLeft(arr:any[]){
        let [nwk, ieee] = arr;
        let devices = this.getDevices();

        let idx = devices.findIndex(d=>d.nodeId === nwk && d.eui64 === ieee.toString());
        if (idx >= 0){
            devices = devices.splice(idx, 1);
            writeFileSync(deviceDbPath, JSON.stringify(devices), 'utf8');
        }
    }

    getDevices() : Array<{nodeId:number, eui64: string}>{
        let devices = [];
        if (existsSync(deviceDbPath)){
            devices = require(deviceDbPath)
        }
        return devices;
    }

    async processMessage(frame: any) {
        if (!frame.senderEui64) {
            frame.senderEui64 = await this.application.networkIdToEUI64(frame.sender)
        }
        this.messageCallback(frame);
    }

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
        this.messageCallback = messageCallback;

        const application = this.application;

        application.on('incomingMessage', this.processMessage.bind(this));

        return application.startup(port, {
            baudRate: baud || 57600,
            parity: 'none',
            stopBits: 1,
            xon: true,
            xoff: true
        })
    }

    end() {
        return this.application.stop();
    }

    transmitMqttMessage(nwk: number | string, apsFrame: EmberApsFrame, message: string) {
        if (!apsFrame) {
            throw new Error('APS Frame information is missing')
        }

        if (typeof (nwk) === 'string') {
            nwk = new EmberEUI64(nwk) as any;
        }

        apsFrame.options = apsFrame.options || (EmberApsOption.APS_OPTION_FORCE_ROUTE_DISCOVERY | EmberApsOption.APS_OPTION_RETRY)
        if (apsFrame.sequence === undefined){
            this.sequence = (this.sequence + 1) % 0xff;
            apsFrame.sequence = this.sequence;
        }

        return this.application.request(nwk as any, apsFrame, Buffer.from(message), 0);
    }

    /**
     * Return a promise that resolves with the 64-bit address of the local XBee.
     */
    getLocalAddress() {
        return this.application.getLocalEUI64();
    }
}