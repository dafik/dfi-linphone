"use strict";
const Linphone = require("../src/linphone");
const ChildrenManager = require("../src/childrenManager");
describe("linphone", () => {
    function onBefore(done) {
        this.timeout(0);
        done();
    }
    before(onBefore);
    it("create ", function (done) {
        this.timeout(0);
        let linphone = new Linphone({
            host: "pbx",
            password: "seivieb",
            port: 5061,
            rtpPort: 7078,
            sip: 154,
            technology: "SIP"
        });
        linphone.once(Linphone.events.REGISTERED, () => {
            linphone.once(Linphone.events.CLOSE, () => {
                done();
            });
            linphone.exit();
        });
        linphone.on(Linphone.events.ERROR, (err) => {
            throw err;
        });
    });
    it("create ", function (done) {
        this.timeout(0);
        let linphone = new Linphone({
            host: "pbx",
            password: "seivieb",
            port: 5061,
            rtpPort: 7078,
            sip: 154,
            technology: "SIP"
        });
        linphone.once(Linphone.events.REGISTERED, () => {
            linphone.once(Linphone.events.CLOSE, () => {
                done();
            });
            ChildrenManager.terminate();
        });
        linphone.on(Linphone.events.ERROR, (err) => {
            throw err;
        });
    });
});
//# sourceMappingURL=001-coreActions.js.map