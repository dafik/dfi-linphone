"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _children = new Map();
class ChildrenManager {
    static terminate(callback, context) {
        if (_children.size === 0) {
            if (typeof callback === "function") {
                callback.call(context);
            }
        }
        _children.forEach((child) => {
            child.on("exit", () => {
                if (_children.size === 0) {
                    if (typeof callback === "function") {
                        callback.call(context);
                    }
                }
            });
            child.kill("SIGTERM");
        });
    }
    static addChild(child) {
        if (child.constructor.name !== "ChildProcess") {
            throw new TypeError("child must be ChildProcess prototype found: " + child.constructor.name);
        }
        _children.set(child.pid, child);
        function onChildExit() {
            if (_children.has(this.pid)) {
                _children.delete(this.pid);
            }
        }
        child.on("exit", onChildExit);
    }
    static get children() {
        return _children;
    }
    static get size() {
        return _children.size;
    }
}
process.on("exit", ChildrenManager.terminate);
process.on("uncaughtException", ChildrenManager.terminate);
exports.default = ChildrenManager;
//# sourceMappingURL=childrenManager.js.map