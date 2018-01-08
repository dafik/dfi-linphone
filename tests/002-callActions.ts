import {readFileSync} from "fs";
import ChildrenManager from "../src/childrenManager";
import {ILinphoneConfig} from "../src/interfaces";
import Linphone from "../src/linphone";

let sipConfig: { [key: string]: ILinphoneConfig };
let endpoint1: Linphone;
let endpoint2: Linphone;

describe("linphone", () => {
    function onBefore(done) {
        this.timeout(0);

        sipConfig = JSON.parse(readFileSync("tests/config.json", "utf8"));

        endpoint1 = new Linphone(sipConfig.conf159);
        endpoint2 = new Linphone(sipConfig.conf158);

        endpoint1.once(Linphone.events.REGISTERED, () => {
            if (endpoint2.registered) {
                done();
            }
        });
        endpoint2.once(Linphone.events.REGISTERED, () => {
            if (endpoint1.registered) {
                done();
            }
        });
    }

    function call(done) {
        this.timeout(0);

        let waitEndCall = 0;

        endpoint1.on(Linphone.events.ANSWERED, () => {
            waitEndCall = waitEndCall + 2;
            setTimeout(() => {
                endCall(endpoint1);
                endCall(endpoint2);
            }, 200);
        });

        endpoint2.on(Linphone.events.INCOMING, (line, id) => {
            endpoint2.answer(id);
        });

        makeCall(endpoint1, endpoint2);

        function makeCall(linphone, target) {
            linphone.makeCall(target.configuration.sip);
        }

        function endCall(linphone) {
            linphone.endCall();
            linphone.on(Linphone.events.END_CALL, checkEnd);
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

        ChildrenManager.terminate(done);
    }

    before(onBefore);

    it("call ", call);
    after(onAfter);
});
