import ChildrenManager from "../src/childrenManager";
import {ILinphoneConfig} from "../src/interfaces";
import Linphone from "../src/linphone";

let endpoint1: Linphone;
let endpoint2: Linphone;

const conf1: ILinphoneConfig = {
    host: "pbx",
    password: "theinue",
    port: 5061,
    rtpPort: 7078,
    sip: 159,
    technology: "SIP"
};
const conf2: ILinphoneConfig = {
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

        endpoint1 = new Linphone(conf1);
        endpoint2 = new Linphone(conf2);

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
