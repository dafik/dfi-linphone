"use strict";
const child_process = require("child_process");
let _children = new Map();
class ChildrenManager {
    static terminate() {
        _children.forEach((child) => {
            child.kill("SIGTERM");
        });
    }
    static addChild(child) {
        if (!child instanceof child_process.ChildProcess) {
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
    addChildren(child) {
        if (child instanceof Array) {
            child.forEach((child1) => {
                ChildrenManager.addChild(child1);
            });
        }
        else {
            ChildrenManager.addChild(child);
        }
    }
    static get length() {
        return _children.size;
    }
}
process.on("exit", ChildrenManager.terminate);
process.on("uncaughtException", ChildrenManager.terminate);
module.exports = ChildrenManager;
//# sourceMappingURL=childrenManager.js.map