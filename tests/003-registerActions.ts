import * as  assert from "assert";
import {readFileSync} from "fs";
import ChildrenManager from "../src/childrenManager";
import {ILinphoneConfig} from "../src/interfaces";
import Linphone from "../src/linphone";

let sipConfig: { [key: string]: ILinphoneConfig };
let endpoint1: Linphone;

describe("register", () => {
    function onBefore(done) {
        this.timeout(0);

        sipConfig = JSON.parse(readFileSync("tests/config.json", "utf8"));
        endpoint1 = new Linphone(sipConfig.conf159);
        endpoint1.once(Linphone.events.REGISTERED, () => {
            done();
        });

    }

    function testRegister(done) {
        this.timeout(0);

        assert.equal(endpoint1.getSipNumber(), sipConfig.conf159.sip);
        assert.equal(endpoint1.getInterface(), sipConfig.conf159.technology + "/" + sipConfig.conf159.sip);

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
