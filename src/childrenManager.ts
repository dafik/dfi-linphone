// let ChildProcess = require("child_process").ChildProcess;
import {ChildProcess} from "child_process";
import child_process = require("child_process");
let _children: Map<number, ChildProcess> = new Map();

class ChildrenManager {

    public static terminate() {
        _children.forEach((child) => {
            child.kill("SIGTERM");
        });
    }

    public static addChild(child: ChildProcess) {
        if (!child instanceof child_process.ChildProcess) {
            throw new TypeError("child must be ChildProcess prototype found: " + child.constructor.name);
        }
        _children.set(child.pid, child);

        function onChildExit(this: ChildProcess) {
            if (_children.has(this.pid)) {
                _children.delete(this.pid);
            }
        }

        child.on("exit", onChildExit);
    }

    public static get children() {
        return _children;
    }

    public addChildren(child: ChildProcess | ChildProcess[]) {
        if (child instanceof Array) {
            child.forEach((child1) => {
                ChildrenManager.addChild(child1);
            });
        } else {
            ChildrenManager.addChild(child);
        }
    }

    public static get length(): number {
        return _children.size;
    }
}

process.on("exit", ChildrenManager.terminate);
process.on("uncaughtException", ChildrenManager.terminate);

export = ChildrenManager;
