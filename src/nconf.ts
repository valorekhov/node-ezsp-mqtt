import * as nconf from 'nconf';

nconf.argv();
nconf.file({
    file: __dirname + '/config.json'
});
nconf.defaults({
    rootTopic: 'xbmq',
    broker: 'mqtt://test.mosquitto.org',
    username: null,
    password: null,
    port: '/dev/ttyUSB1',
    baud: 57600,
    log: __dirname + '/xbmq.log',
    loglevel: 'info',
    apiMode: 2
});

export default nconf;