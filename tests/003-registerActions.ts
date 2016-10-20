import assert = require("assert");
import Linphone = require("../src/linphone");
import ChildrenManager = require("../src/childrenManager");
import {ILinphoneConfig} from "../src/interfaces";

let endpoint1: Linphone;

let conf1: ILinphoneConfig = {
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

        endpoint1 = new Linphone(conf1);

        endpoint1.once(Linphone.events.REGISTERED, () => {
            done();
        });

    }

    function testRegister(done) {
        this.timeout(0);

        assert.equal(endpoint1.getSipNumber(), conf1.sip);
        assert.equal(endpoint1.getInterface(), conf1.technology + "/" + conf1.sip);

        endpoint1.on(Linphone.events.UNREGISTERED, () => {
            endpoint1.on(Linphone.events.REGISTERED, () => {
                done();
            });
            endpoint1.register();
        });

        endpoint1.unregister();
    }

    function onAfter(done) {
        this.timeout(0);

        ChildrenManager.terminate(done);
    }

    before(onBefore);

    it("call ", testRegister);
    after(onAfter);
});
