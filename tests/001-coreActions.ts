import * as assert from "assert";
import {readFileSync} from "fs";
import ChildrenManager from "../src/childrenManager";
import {ILinphoneConfig} from "../src/interfaces";
import Linphone from "../src/linphone";

let sipConfig: { [key: string]: ILinphoneConfig };

describe("core", () => {
    function onBefore(done) {
        this.timeout(0);
        sipConfig = JSON.parse(readFileSync("tests/config.json", "utf8"));
        done();
    }

    function onCreate(done) {
        this.timeout(0);
        const linphone = new Linphone(sipConfig.conf154);

        linphone.once(Linphone.events.REGISTERED, () => {
            linphone.once(Linphone.events.CLOSE, () => {
                done();
            });
            ChildrenManager.terminate();
        });
        linphone.on(Linphone.events.ERROR, (err) => {
            throw err;
        });
    }

    before(onBefore);

    it("create 1", onCreate);
    it("create 2", onCreate);

    it("manager", (done) => {
        assert.equal(ChildrenManager.size, 0);
        assert.equal(ChildrenManager.children.size, 0);

        done();
    });

});
