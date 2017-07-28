"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const childrenManager_1 = require("../src/childrenManager");
const linphone_1 = require("../src/linphone");
let endpoint1;
const conf1 = {
    host: "pbx",
    password: "theinue",
    port: 5061,
    rtpPort: 7078,
    sip: 159,
    technology: "SIP"
};
describe("linphone", () => {
    function onBefore(done) {
        this.timeout(0);
        endpoint1 = new linphone_1.default(conf1);
        endpoint1.once(linphone_1.default.events.REGISTERED, () => {
            done();
        });
    }
    function testRegister(done) {
        this.timeout(0);
        assert.equal(endpoint1.getSipNumber(), conf1.sip);
        assert.equal(endpoint1.getInterface(), conf1.technology + "/" + conf1.sip);
        endpoint1.on(linphone_1.default.events.UNREGISTERED, () => {
            endpoint1.on(linphone_1.default.events.REGISTERED, () => {
                done();
            });
            endpoint1.register();
        });
        endpoint1.unregister();
    }
    function onAfter(done) {
        this.timeout(0);
        childrenManager_1.default.terminate(done);
    }
    before(onBefore);
    it("call ", testRegister);
    after(onAfter);
});
//# sourceMappingURL=003-registerActions.js.map