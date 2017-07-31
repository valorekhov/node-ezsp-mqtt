import * as bunyan from 'bunyan';
import nconf from './nconf';

/*bunyan.add(winston.transports.File, {
    filename: nconf.get('log'),
    maxsize: 10000000,
    maxFiles: 2
});
bunyan.level = nconf.get('loglevel');*/
export default bunyan.createLogger({ name: 'ezsp-mqtt', level: nconf.get('loglevel') || 'debug' });