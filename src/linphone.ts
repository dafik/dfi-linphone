import {spawn} from "child_process";
import {createHash} from "crypto";
import {EventEmitter} from "events";
import {readFile, writeFile} from "fs";
import {ILinphoneConfig} from "./interfaces";

import DebugLogger from "local-dfi-debug-logger";
import ChildrenManager from "./childrenManager";
import ini = require("ini");

class Linphone extends EventEmitter {

    public static get events() {
        return EVENTS;
    }

    private static newLineStream(callback, context) {
        let buffer = "";
        return ( (chunk) => {
            let i;
            let piece = "";
            let offset = 0;
            buffer += chunk;
            while (buffer.indexOf("\n", offset) !== -1) {
                i = buffer.indexOf("\n", offset);
                piece = buffer.substr(offset, i - offset);
                offset = i + 1;
                callback.call(context, piece);
            }
            buffer = buffer.substr(offset);
        });
    }

    private static _eventName(event: symbol) {
        const symbolName = Symbol.prototype.toString.call(event);
        const x = symbolName.match(/Symbol\((.*)\)/);
        return x[1];
    }

    public registered;

    private _calls;
    private _configuration: ILinphoneConfig;
    private _incoming;
    private _linphoneProcess;
    private _logger;
    private _output;

    public get configuration(): ILinphoneConfig {
        return {...this._configuration};
    }

    constructor(configuration: ILinphoneConfig) {
        super();
        this._logger = new DebugLogger("dfi:linphone");

        const config: ILinphoneConfig = {
            host: "localhost",
            password: "not set",
            port: 5060,
            rtpPort: 7078,
            sip: null,
            technology: "SIP"
        };

        this._configuration = configuration || config;

        this._incoming = {};
        this._calls = {};
        this._output = [];
        this.registered = false;

        this.on(Linphone.events.ERROR, (err) => {
            this._logger.error(err);
        });

        /*        if (false) {
         this._bindProcessSignals();
         }*/

        this.on(Linphone.events.READY, () => {
            const target = this._configuration.file.replace("conf", "wav");
            this._write("soundcard use files");
            this.on(Linphone.events.SOUNDCARD_CHANGED, () => {
                this._write("record " + target);
            });
        });

        const date = new Date();
        const randomInt = Math.floor(Math.random() * (100000 - 10000 + 1) + 1000);
        const fileName = createHash("sha1")
            .update(date.toUTCString() + date.getMilliseconds() + randomInt)
            .digest("hex");

        const filePath = "/tmp/" + fileName + ".linphone.conf";
        this._onConfigName(filePath);
    }

    public makeCall(target: string): void {
        this._logger.info(this._configuration.sip + ": making call to : " + target);
        this._write("call " + target);
    }

    public answer(callNumber: number): void {
        this._logger.info(this._configuration.sip + " :answering");
        let msg = "answer";
        if (typeof callNumber !== "undefined") {
            msg = msg + " " + callNumber.toString();
        }
        this._write(msg);
    }

    public endCall(callNumber: number): void {
        this._logger.info(this._configuration.sip + ": ending call");
        let msg = "terminate";
        if (typeof callNumber !== "undefined") {
            msg = msg + " " + callNumber.toString();
        }
        this._write(msg);
    }

    public unregister(): void {
        this._logger.info(this._configuration.sip + ": unregister");
        this._write("unregister");
    }

    public register(): void {
        this._logger.info(this._configuration.sip + ":register");
        this._write("register");
    }

    public clearBindings(): void {
        this.removeAllListeners(Linphone.events.ANSWERED);
        this.removeAllListeners(Linphone.events.END);
        this.removeAllListeners(Linphone.events.END_CALL);
        this.removeAllListeners(Linphone.events.INCOMING);
        this.removeAllListeners(Linphone.events.UNREGISTERED);
    }

    public exit(): void {
        this._logger.info("exiting");
        this._write("quit");

        // this._linphoneProcess.stdout.removeAllListeners("data");
        // this._linphoneProcess.stderr.removeAllListeners("data");
    }

    public kill(): void {
        this._logger.info("kill");
        this._linphoneProcess.kill();

        // this._linphoneProcess.stdout.removeAllListeners("data");
        // this._linphoneProcess.stderr.removeAllListeners("data");
    }

    public getInterface(): string {
        return this._configuration.technology + "/" + this._configuration.sip;
    }

    public getSipNumber(): number {
        return this._configuration.sip;
    }

    public getListenersCount(eventName): number {
        return this.listenerCount(eventName);
    }

    private _write(data: string): void {
        this._logger.debug("writing-" + this._configuration.sip + ": " + data);
        this._linphoneProcess.stdin.write(data + "\n");
    }

    private _processIncomingLine(line: string): void {
        line = line.trim();
        if (!line) {
            return;
        }
        if (line === "Ready") {
            this._logger.info("emitting-" + this._configuration.sip + ": " + Linphone._eventName(Linphone.events.READY)
                + " c:" + this.getListenersCount(Linphone.events.READY));
            this.emit(Linphone.events.READY, this);

        } else if (line.match(/Could not start/)) {
            this._logger.info("emitting-" + this._configuration.sip + ": " + Linphone._eventName(Linphone.events.ERROR)
                + " c:" + this.getListenersCount(Linphone.events.ERROR));
            this.emit(Linphone.events.ERROR, new Error(line), this);

        } else if (line.match(/Registration.+failed/)) {
            this._logger.info("emitting-" + this._configuration.sip + ": " + Linphone._eventName(Linphone.events.ERROR)
                + " c:" + this.getListenersCount(Linphone.events.ERROR));
            this.emit(Linphone.events.ERROR, new Error(line), this);

        } else if (line.match(/Registration.+successful/)) {
            this._logger.info("emitting-" + this._configuration.sip + ": " + Linphone._eventName(Linphone.events.REGISTERED)
                + " c:" + this.getListenersCount(Linphone.events.REGISTERED));
            this.registered = true;
            this.emit(Linphone.events.REGISTERED, line, this);

        } else if (line === "Using wav files instead of soundcard.") {
            this._logger.info("emitting-" + this._configuration.sip + ": " + Linphone._eventName(Linphone.events.SOUNDCARD_CHANGED)
                + " c:" + this.getListenersCount(Linphone.events.SOUNDCARD_CHANGED));
            this.emit(Linphone.events.SOUNDCARD_CHANGED, this);

        } else if (line.match(/Receiving new incoming call/)) {
            // Receiving new incoming call from <sip:e1307a08-b16d-4202-a1b5-fec8e1e84613@10.0.11.10>, assigned id 1
            const parts = /.*<(.*)>.*(\d+)/.exec(line);
            let id = 1;
            if (parts) {
                this._incoming[parts[2]] = parts[1];
                id = parseInt(parts[2], 10);
            }
            this._logger.info("emitting-" + this._configuration.sip + ": " + Linphone._eventName(Linphone.events.INCOMING) + " c:" + this.getListenersCount(Linphone.events.INCOMING) + "");
            this.emit(Linphone.events.INCOMING, line, id, this);
            // } else if (line.match(/Call answered/) || line == "Connected.") {

        } else if (line.match(/Call.+connected/)) {
            this._logger.info("emitting-" + this._configuration.sip + ": " + Linphone._eventName(Linphone.events.ANSWERED) + " c:" + this.getListenersCount(Linphone.events.ANSWERED) + "");
            const id = /Call (\d+).+connected/.exec(line)[1];
            this.emit(Linphone.events.ANSWERED, line, id, this);

        } else if (line.match(/Call.+with.+ended/)) {
            this._logger.info("emitting-" + this._configuration.sip + ": " + Linphone._eventName(Linphone.events.END_CALL) + " c:" + this.getListenersCount(Linphone.events.END_CALL) + "");
            this.emit(Linphone.events.END_CALL, line, this);

        } else if (line.match(/Unregistration on.+done/)) {
            this._logger.info("emitting-" + this._configuration.sip + ": " + Linphone._eventName(Linphone.events.UNREGISTERED) + " c:" + this.getListenersCount(Linphone.events.UNREGISTERED) + "");
            this.registered = false;
            this.emit(Linphone.events.UNREGISTERED, line, this);
        } else {
            this._logger.info("unknown line %s", line);
        }
    }

    private _bindLinphoneStdio() {

        const stdOutListener = Linphone.newLineStream((message) => {
            message = message.replace("linphonec>", "").trim();
            this._logger.debug("stdout-" + this._configuration.sip.toString(10) + ": " + message);
            this._output.push(message);
            this._processIncomingLine(message);
        }, this);

        this._linphoneProcess.stdout.on("data", stdOutListener.bind(this));
        this._linphoneProcess.stderr.on("data", (data) => {
            const lines = data.toString().split("\n");
            lines.forEach((line) => {
                if (line && !line.match(/ALSA lib/)) {
                    this._logger.warn("stderr-" + this._configuration.sip.toString(10) + ": " + data);
                }
            });
        });
        this._linphoneProcess.on("close", (code) => {
            this._logger.info("child process exited with code " + code);
        });

    }

    private _onConfigWritten(conf: string) {

        const onError = (err) => {
            if (err.code === "ENOENT") {
                throw new Error("linphone not found");
            }
            this._logger.error(err.message + err.stack);
        };

        const configuration2 = this._configuration;
        this._logger.info("create instance port:%s rtp:%s sip:%s host:%s", configuration2.port, configuration2.rtpPort, configuration2.sip, configuration2.host, configuration2.file);
        this._linphoneProcess = spawn("linphonec", ["-c", conf]);

        ChildrenManager.addChild(this._linphoneProcess);

        this._linphoneProcess.on("error", onError);

        this._linphoneProcess.stderr.on("error", onError);
        this._linphoneProcess.stdin.on("error", onError);
        this._linphoneProcess.stdout.on("error", onError);

        this._linphoneProcess.on("exit", () => {
            this._logger.info("emitting-" + this._configuration.sip.toString(10) + ": " + Linphone._eventName(Linphone.events.END));
            this.emit(Linphone.events.END, this);

        });
        this._linphoneProcess.on("close", () => {
            this._logger.info("emitting-" + this._configuration.sip.toString(10) + ": " + Linphone._eventName(Linphone.events.CLOSE));
            this.emit(Linphone.events.CLOSE, this);
            this.removeAllListeners();
            this._linphoneProcess.on("error", onError);
        });
        this._linphoneProcess.on("disconnect", () => {
            this._logger.info("break");
        });
        this._linphoneProcess.on("message", () => {
            this._logger.info("break");
        });

        this._bindLinphoneStdio();
    }

    private _onConfigName(filePath: string) {
        this._configuration.file = filePath;
        readFile(__dirname + "/linphone.conf", {encoding: "utf8"}, (err, data) => {
            if (err) {
                this.emit(Linphone.events.ERROR, err);
                return;
            }
            /**
             * @type {{rtp,auth_info_0,proxy_0}}
             */
            const newData = ini.parse(data);
            const linConfig = this._configuration;

            newData.sip.sip_port = linConfig.port;
            newData.rtp.audio_rtp_port = linConfig.rtpPort;
            newData.auth_info_0.passwd = linConfig.password;
            newData.auth_info_0.username = linConfig.sip.toString(10);
            newData.proxy_0.reg_identity = "sip:" + linConfig.sip.toString(10) + "@" + linConfig.host;
            newData.proxy_0.reg_proxy = "<sip:" + linConfig.host + ">";

            // newData.sound.capture_dev_id = "ALSA: default device";
            // newData.sound.playback_dev_id = "ALSA: default device";
            // newData.sound.ringer_dev_id = "ALSA: default device";
            writeFile(filePath, ini.stringify(newData), (writeErr) => {
                if (writeErr) {
                    this.emit(Linphone.events.ERROR, writeErr);
                    return;
                }
                this._onConfigWritten(filePath);
            });
        });
    }

    /*
     private _bindProcessSignals() {
     let logger = new DebugLogger("dfi:linphone");
     // let signals = ["SIGUSR1", "SIGTERM", "SIGPIPE", "SIGHUP", "SIGTERM", "SIGINT", "exit", "uncaughtException"];
     process.on("SIGUSR1", () => {
     logger.info("Got SIGUSR1.  Press Control-D to exit.");
     });
     process.on("SIGTERM", () => {
     logger.info("Got SIGTERM.  Press Control-D to exit.");
     });
     process.on("SIGPIPE", () => {
     logger.info("Got Got.  Press Control-D to exit.");
     });
     process.on("SIGHUP", () => {
     logger.info("Got SIGHUP.  Press Control-D to exit.");
     });
     process.on("SIGTERM", () => {
     logger.info("Got SIGTERM.  Press Control-D to exit.");
     });
     process.on("SIGINT", () => {
     logger.info("Got SIGINT.  Press Control-D to exit.");
     });
     process.on("exit", () => {
     this._linphoneProcess.kill();
     // logger.info("About to exit with code:", code);
     });
     process.on("uncaughtException", (err) => {
     logger.info("Caught exception: " + err);
     throw err;
     });
     }*/
}

const EVENTS = {
    ANSWERED: Symbol("answered"),
    CLOSE: Symbol("close"),
    CONFIG_WRITTEN: Symbol("configWritten"),
    END: Symbol("end"),
    END_CALL: Symbol("endCall"),
    ERROR: Symbol("error"),
    INCOMING: Symbol("incoming"),
    READY: Symbol("ready"),
    RECORD_SET: Symbol("recordFileSet"),
    REGISTERED: Symbol("registered"),
    SOUNDCARD_CHANGED: Symbol("soundcardChanged"),
    STARTED: Symbol("processStarted"),

    UNREGISTERED: Symbol("unregistered")
};

export default Linphone;
