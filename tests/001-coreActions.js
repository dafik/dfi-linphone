"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const childrenManager_1 = require("../src/childrenManager");
const linphone_1 = require("../src/linphone");
describe("linphone", () => {
    function onBefore(done) {
        this.timeout(0);
        done();
    }
    function onCreate(done) {
        this.timeout(0);
        const linphone = new linphone_1.default({
            host: "pbx",
            password: "seivieb",
            port: 5061,
            rtpPort: 7078,
            sip: 154,
            technology: "SIP"
        });
        linphone.once(linphone_1.default.events.REGISTERED, () => {
            linphone.once(linphone_1.default.events.CLOSE, () => {
                done();
            });
            childrenManager_1.default.terminate();
        });
        linphone.on(linphone_1.default.events.ERROR, (err) => {
            throw err;
        });
    }
    before(onBefore);
    it("create 1", onCreate);
    it("create 2", onCreate);
    it("manager", (done) => {
        assert.equal(childrenManager_1.default.size, 0);
        assert.equal(childrenManager_1.default.children.size, 0);
        done();
    });
});
//# sourceMappingURL=001-coreActions.js.map