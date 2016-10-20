import {ChildProcess} from "child_process";
let _children: Map<number, ChildProcess> = new Map();

class ChildrenManager {

    public static terminate(callback?, context?) {
        if (_children.size === 0) {
            if (typeof  callback === "function") {
                callback.call(context);
            }
        }
        _children.forEach((child) => {
            child.on("exit", () => {
                if (_children.size === 0) {
                    if (typeof  callback === "function") {
                        callback.call(context);
                    }
                }
            });
            child.kill("SIGTERM");
        });
    }

    public static addChild(child: ChildProcess) {
        if (child.constructor.name !== "ChildProcess") {
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

    public static get length(): number {
        return _children.size;
    }
}

process.on("exit", ChildrenManager.terminate);
process.on("uncaughtException", ChildrenManager.terminate);

export = ChildrenManager;
