var spawn = require('child_process').spawn;
var events = require('events');
var fs = require('fs');
var crypto = require('crypto');
var log4js = require('log4js');
var util = require('util');
var ini = require('ini');
var ChildrenManager = require('./childrenManager');

/**
 * @class
 * @extends EventEmitter
 * @param {{port,sip,password,host}} configuration
 * @constructor
 *
 * @property {ChildProcess} _linphoneProcess
 * @property {Logger} logger
 * @property {{port,sip,password,host}} configuration
 *
 * @fires Linphone#INCOMING
 * @fires Linphone#ANSWERED
 * @fires Linphone#END_CALL
 * @fires Linphone#END
 * @fires Linphone#CLOSE
 * @fires Linphone#UNREGISTERED
 */
function Linphone(configuration) {

    var config = {
        port: 5060,
        rtpPort: 7078,
        sip: 'notset',
        password: 'notset',
        host: 'localhost'
    };

    configuration = configuration || config;

    this.logger = log4js.getLogger('Linphone');

    this._incoming = {};
    this._calls = {};
    this._output = [];
    this.registered = false;

    //bindProcessSignals.call(this);
    bindEvents.call(this);

    this.configuration = configuration;
    createRandomFileName.call(this);

    /**
     * @fires Linphone#CONFIG_NAME
     */
    function createRandomFileName() {
        var date = new Date();
        var randomInt = Math.floor(Math.random() * (100000 - 10000 + 1) + 1000);
        var fileName = crypto.createHash('sha1')
            .update(date.toUTCString() + date.getMilliseconds() + randomInt)
            .digest('hex');

        var filePath = '/tmp/' + fileName + '.linphone.conf';
        /**
         * CONFIG_NAME
         * @event Linphone#CONFIG_NAME
         * @type {string}
         */
        this.emit(Linphone.Events.CONFIG_NAME, filePath);
    }

    function startLinphoneProcess(config) {
        this._linphoneProcess = spawn('linphonec', ['-c', config]);

        ChildrenManager.length = 5;
        ChildrenManager.addChild(this._linphoneProcess);

        bindLinphoneEvents.call(this);
        bindLinphoneStdio.call(this);
    }

    /**
     * @fires Linphone#END
     *  @fires Linphone#CLOSE
     */
    function bindLinphoneEvents() {

        this._linphoneProcess.on('error', onError);

        this._linphoneProcess.stderr.on('error', onError);
        this._linphoneProcess.stdin.on('error', onError);
        this._linphoneProcess.stdout.on('error', onError);

        this._linphoneProcess.on('exit', function (arg) {
            var tmp = 1;
            this.logger.info('emitting-' + this.configuration.sip + ': "' + Linphone.Events.END + '"');
            /**
             * END
             * @event Linphone#END
             * @type {Linphone}
             */
            this.emit(Linphone.Events.END, this);

        }.bind(this));
        this._linphoneProcess.on('close', function (arg) {
            this.logger.info('emitting-' + this.configuration.sip + ': "' + Linphone.Events.CLOSE + '"');
            /**
             * CLOSE
             * @event Linphone#CLOSE
             * @type {Linphone}
             */
            this.emit(Linphone.Events.CLOSE, this);
            this.removeAllListeners();
            this._linphoneProcess.on('error', onError);
        }.bind(this));
        this._linphoneProcess.on('disconnect', function () {
            var tmp = 1;
        });
        this._linphoneProcess.on('message', function () {
            var tmp = 1;
        });

        function onError(err) {
            log4js.getLogger('Linphone').error(err.message + err.stack);
        }
    }

    function bindProcessSignals() {
        //var signals = ['SIGUSR1', 'SIGTERM', 'SIGPIPE', 'SIGHUP', 'SIGTERM', 'SIGINT', 'exit', 'uncaughtException'];
        process.on('SIGUSR1', function () {
            console.log('Got SIGUSR1.  Press Control-D to exit.');
        });
        process.on('SIGTERM', function () {
            console.log('Got SIGTERM.  Press Control-D to exit.');
        });
        process.on('SIGPIPE', function () {
            console.log('Got Got.  Press Control-D to exit.');
        });
        process.on('SIGHUP', function () {
            console.log('Got SIGHUP.  Press Control-D to exit.');
        });
        process.on('SIGTERM', function () {
            console.log('Got SIGTERM.  Press Control-D to exit.');
        });
        process.on('SIGINT', function () {
            console.log('Got SIGINT.  Press Control-D to exit.');
        });
        process.on('exit', function () {
            this._linphoneProcess.kill();
            //console.log('About to exit with code:', code);
        }.bind(this));
        process.on('uncaughtException', function (err) {
            console.log('Caught exception: ' + err);
            throw err
        });
    }

    function bindEvents() {
        this.on(Linphone.Events.ERROR, function (err) {
            this.logger.error(err);
        }.bind(this));
        this.on(Linphone.Events.CONFIG_NAME, writeConfig.bind(this));
        this.on(Linphone.Events.CONFIG_WRITTEN, startLinphoneProcess.bind(this));
        this.on(Linphone.Events.READY, function () {
            var target = this.configuration.file.replace('conf', 'wav');
            this._write("soundcard use files");
            this.on(Linphone.Events.SOUNDCARD_CHANGED, function () {
                this._write("record " + target);
            }.bind(this));

            //this.emit()
        }.bind(this))
    }

    /**
     * @fires  Linphone#ERROR
     * @fires  Linphone#CONFIG_WRITTEN
     * @param filePath
     */
    function writeConfig(filePath) {
        //noinspection JSPotentiallyInvalidUsageOfThis
        this.configuration.file = filePath;
        fs.readFile(__dirname + '/linphone.conf', {encoding: 'utf8'}, onFileData.bind(this));

        /**
         * @param {Error} err
         * @param {string} data
         * @fires Linphone#ERROR
         */
        function onFileData(err, data) {
            if (err) {
                /**
                 * error
                 * @event Linphone#ERROR
                 * @type {Error}
                 */
                this.emit(Linphone.Events.ERROR, err);
                return
            }
            /**
             * @type {{rtp,auth_info_0,proxy_0}}
             */
            var newData = ini.parse(data);

            //noinspection JSPotentiallyInvalidUsageOfThis
            var configuration = this.configuration;

            newData.sip.sip_port = configuration.port;

            newData.rtp.audio_rtp_port = configuration.rtpPort;

            newData.auth_info_0.passwd = configuration.password;
            newData.auth_info_0.username = configuration.sip;

            newData.proxy_0.reg_identity = 'sip:' + configuration.sip + '@' + configuration.host;
            newData.proxy_0.reg_proxy = '<sip:' + configuration.host + '>';

            //newData.sound.capture_dev_id = 'ALSA: default device';
            //newData.sound.playback_dev_id = 'ALSA: default device';
            //newData.sound.ringer_dev_id = 'ALSA: default device';

            //'linphonecsh generic 'soundcard use files'
            //$ linphonecsh generic 'play /tmp/sent.wav'
            //$ linphonecsh generic 'record /tmp/received.wav''

            fs.writeFile(filePath, ini.stringify(newData), onFileWritten.bind(this));
        }

        /**
         * @fires  Linphone#ERROR
         * @fires  Linphone#CONFIG_WRITTEN
         * @param err
         */
        function onFileWritten(err) {
            if (err) {
                /**
                 * error
                 * @event Linphone#ERROR
                 * @type {Error}
                 */
                this.emit(Linphone.Events.ERROR, err);
                return
            }
            /**
             * error
             * @event Linphone#CONFIG_WRITTEN
             * @type {string}
             */
            this.emit(Linphone.Events.CONFIG_WRITTEN, filePath);
        }

    }

    function bindLinphoneStdio() {

        var stdOutListener = newLineStream.call(this, function (message) {
            message = message.replace('linphonec>', '').trim();
            this.logger.debug('stdout-' + this.configuration.sip + ': ' + message);
            this._output.push(message);
            processIncomingLine.call(this, message);

        });

        this._linphoneProcess.stdout.on('data', stdOutListener.bind(this));
        this._linphoneProcess.stderr.on('data', function (data) {
            var lines = data.toString().split("\n");
            lines.forEach(onEachLine, this);
            /**
             * @param {String} line
             */
            function onEachLine(line) {
                if (line && !line.match(/ALSA lib/)) {
                    this.logger.warn('stderr-' + this.configuration.sip + ': ' + data);
                }
            }
        }.bind(this));
        this._linphoneProcess.on('close', function (code) {
            this.logger.info('child process exited with code ' + code);
        }.bind(this));

        function newLineStream(callback) {
            var buffer = '';
            return (function (chunk) {
                var i, piece = '', offset = 0;
                buffer += chunk;
                while ((i = buffer.indexOf('\n', offset)) !== -1) {
                    piece = buffer.substr(offset, i - offset);
                    offset = i + 1;
                    callback.call(this, piece);
                }
                buffer = buffer.substr(offset);
            });
        }

        /**
         * @fires Linphone#READY
         * @fires Linphone#ERROR
         * @fires Linphone#REGISTERED
         * @fires Linphone#SOUNDCARD_CHANGED
         * @fires Linphone#INCOMING
         * @fires Linphone#ANSWERED
         * @fires Linphone#END_CALL
         * @fires Linphone#UNREGISTERED
         * @param {string} line
         */
        function processIncomingLine(line) {
            line = line.trim();
            if (!line) {
                return;
            }
            if (line == 'Ready') {
                this.logger.info('emitting-' + this.configuration.sip + ': "' + Linphone.Events.READY + '" c:"' + this.getListenersCount(Linphone.Events.READY) + '"');
                /**
                 * ready
                 * @event Linphone#READY
                 */
                this.emit(Linphone.Events.READY, this);
            } else if (line.match(/Could not start/)) {
                this.logger.info('emitting-' + this.configuration.sip + ': "' + Linphone.Events.ERROR + '" c:"' + this.getListenersCount(Linphone.Events.ERROR) + '"');
                /**
                 * error
                 * @event Linphone#ERROR
                 * @type {Error}
                 */
                this.emit(Linphone.Events.ERROR, new Error(line), this);
            } else if (line.match(/Registration.+successful/)) {
                this.logger.info('emitting-' + this.configuration.sip + ': "' + Linphone.Events.REGISTERED + '" c:"' + this.getListenersCount(Linphone.Events.REGISTERED) + '"');
                this.registered = true;
                /**
                 * registered
                 * @event Linphone#REGISTERED
                 * @type {string}
                 */
                this.emit(Linphone.Events.REGISTERED, line, this);
            } else if (line == 'Using wav files instead of soundcard.') {
                this.logger.info('emitting-' + this.configuration.sip + ': "' + Linphone.Events.SOUNDCARD_CHANGED + '" c:"' + this.getListenersCount(Linphone.Events.SOUNDCARD_CHANGED) + '"');
                /**
                 * SOUNDCARD_CHANGED
                 * @event Linphone#SOUNDCARD_CHANGED
                 */
                this.emit(Linphone.Events.SOUNDCARD_CHANGED, this);
            } else if (line.match(/Receiving new incoming call/)) {
                //Receiving new incoming call from <sip:e1307a08-b16d-4202-a1b5-fec8e1e84613@10.0.11.10>, assigned id 1
                var parts = /.*<(.*)>.*(\d+)/.exec(line);
                var id = 1;
                if (parts) {
                    this._incoming[parts[2]] = parts[1];
                    id = parts[2];
                }
                this.logger.info('emitting-' + this.configuration.sip + ': "' + Linphone.Events.INCOMING + '" c:"' + this.getListenersCount(Linphone.Events.INCOMING) + '"');
                /**
                 * INCOMING
                 * @event Linphone#INCOMING
                 * @type {string}
                 * @type {string}
                 */
                this.emit(Linphone.Events.INCOMING, line, id, this);
                //} else if (line.match(/Call answered/) || line == 'Connected.') {
            } else if (line.match(/Call.+connected/)) {
                this.logger.info('emitting-' + this.configuration.sip + ': "' + Linphone.Events.ANSWERED + '" c:"' + this.getListenersCount(Linphone.Events.ANSWERED) + '"');
                var id = /Call (\d+).+connected/.exec(line)[1];
                /**
                 * ANSWERED
                 * @event Linphone#ANSWERED
                 * @type {string}
                 */
                this.emit(Linphone.Events.ANSWERED, line, id, this);
            } else if (line.match(/Call.+with.+ended/)) {
                this.logger.info('emitting-' + this.configuration.sip + ': "' + Linphone.Events.END_CALL + '" c:"' + this.getListenersCount(Linphone.Events.END_CALL) + '"');
                /**
                 * END_CALL
                 * @event Linphone#END_CALL
                 * @type {string}
                 */
                this.emit(Linphone.Events.END_CALL, line, this);
            } else if (line.match(/Unregistration on.+done/)) {
                this.logger.info('emitting-' + this.configuration.sip + ': "' + Linphone.Events.UNREGISTERED + '" c:"' + this.getListenersCount(Linphone.Events.UNREGISTERED) + '"');
                this.registered = false;
                /**
                 * UNREGISTERED
                 * @event Linphone#UNREGISTERED
                 * @type {string}
                 */
                this.emit(Linphone.Events.UNREGISTERED, line, this);
            }

        }
    }
}
util.inherits(Linphone, events.EventEmitter);

Linphone.prototype.makeCall = function (target) {
    this.logger.info(this.configuration.sip + ': making call to : ' + target);
    this._write("call " + target);
};
Linphone.prototype.answer = function (callNumber) {
    this.logger.info(this.configuration.sip + ' :answering');
    var msg = "answer";
    if (typeof callNumber != "undefined") {
        msg = msg + ' ' + callNumber;
    }
    this._write(msg);
};
Linphone.prototype.endCall = function (callNumber) {
    this.logger.info(this.configuration.sip + ': ending call');
    var msg = "terminate";
    if (typeof callNumber != "undefined") {
        msg = msg + ' ' + callNumber;
    }
    this._write(msg);
};

Linphone.prototype.unregister = function () {
    this.logger.info(this.configuration.sip + ': unregister');
    this._write("unregister");
};
Linphone.prototype.register = function () {
    this.logger.info(this.configuration.sip + ':register');
    this._write("register");
};

Linphone.prototype._write = function (data) {
    this.logger.debug('writing-' + this.configuration.sip + ': ' + data);
    this._linphoneProcess.stdin.write(data + "\n");
};

Linphone.prototype.clearBindings = function () {
    var toClear = Linphone.EventsExternal;
    toClear.forEach(function (event) {
        this.removeAllListeners(event);
    }, this)
};

Linphone.prototype.exit = function () {
    this.logger.info('exiting');
    this._write("quit");

    //this._linphoneProcess.stdout.removeAllListeners('data');
    //this._linphoneProcess.stderr.removeAllListeners('data');
};

Linphone.prototype.kill = function () {
    this.logger.info('kill');
    this._linphoneProcess.kill();

    //this._linphoneProcess.stdout.removeAllListeners('data');
    //this._linphoneProcess.stderr.removeAllListeners('data');
};

Linphone.prototype.getInterface = function () {
    return this.configuration.technology + '/' + this.configuration.sip;
};
Linphone.prototype.getSipNumber = function () {
    return this.configuration.sip;
};

Linphone.prototype.getListenersCount = function (eventName) {
    if (this._events.hasOwnProperty(eventName)) {
        if (typeof this._events[eventName] == "function") {
            return 1
        } else {
            return this._events[eventName].length;
        }
    }
    return 0;
};

Linphone.Events = {
    ERROR: 'error',
    CONFIG_NAME: 'configName',
    CONFIG_WRITTEN: 'configWritten',
    STARTED: 'processStarted',
    READY: 'ready',
    REGISTERED: 'registered',
    RECORD_SET: 'recordFileSet',
    SOUNDCARD_CHANGED: 'soundcardChanged',
    CLOSE: 'close',

    //external
    INCOMING: 'incoming',
    ANSWERED: 'answered',
    END_CALL: 'endCall',
    END: 'end',
    UNREGISTERED: 'unregistered'
};

Linphone.EventsExternal = [
    Linphone.Events.INCOMING,
    Linphone.Events.ANSWERED,
    Linphone.Events.END_CALL,
    Linphone.Events.END,
    Linphone.Events.UNREGISTERED
];
module.exports = Linphone;