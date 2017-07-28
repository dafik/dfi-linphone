"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const childrenManager_1 = require("../src/childrenManager");
const linphone_1 = require("../src/linphone");
let endpoint1;
let endpoint2;
const conf1 = {
    host: "pbx",
    password: "theinue",
    port: 5061,
    rtpPort: 7078,
    sip: 159,
    technology: "SIP"
};
const conf2 = {
    host: "pbx",
    password: "aedahmu",
    port: 5062,
    rtpPort: 7079,
    sip: 158,
    technology: "SIP"
};
describe("linphone", () => {
    function onBefore(done) {
        this.timeout(0);
        endpoint1 = new linphone_1.default(conf1);
        endpoint2 = new linphone_1.default(conf2);
        endpoint1.once(linphone_1.default.events.REGISTERED, () => {
            if (endpoint2.registered) {
                done();
            }
        });
        endpoint2.once(linphone_1.default.events.REGISTERED, () => {
            if (endpoint1.registered) {
                done();
            }
        });
    }
    function call(done) {
        this.timeout(0);
        let waitEndCall = 0;
        endpoint1.on(linphone_1.default.events.ANSWERED, () => {
            waitEndCall = waitEndCall + 2;
            setTimeout(() => {
                endCall(endpoint1);
                endCall(endpoint2);
            }, 200);
        });
        endpoint2.on(linphone_1.default.events.INCOMING, (line, id) => {
            endpoint2.answer(id);
        });
        makeCall(endpoint1, endpoint2);
        function makeCall(linphone, target) {
            linphone.makeCall(target.configuration.sip);
        }
        function endCall(linphone) {
            linphone.endCall();
            linphone.on(linphone_1.default.events.END_CALL, checkEnd);
        }
        function checkEnd() {
            waitEndCall--;
            this.clearBindings();
            if (waitEndCall === 0) {
                done();
            }
        }
    }
    function onAfter(done) {
        this.timeout(0);
        childrenManager_1.default.terminate(done);
    }
    before(onBefore);
    it("call ", call);
    after(onAfter);
});
//# sourceMappingURL=002-callActions.js.map