var _children = {};
var _length = 0;

var ChildrenManager = {};

module.exports = ChildrenManager;


Object.defineProperties(ChildrenManager, {
    children: {
        get: function () {
            return _children;
        },
        set: function (child) {
            if (child instanceof Array) {
                child.forEach(function (child) {
                    ChildrenManager.addChild(child);
                })
            } else {
                ChildrenManager.addChild(child);
            }
        }
    },
    length: {
        get: function () {
            return _length;
        }
    }
});

ChildrenManager.addChild = function (child) {
    if (child.__proto__.constructor.name != 'ChildProcess') {
        throw new TypeError('child must be ChildProcess prototype found: ' + child.__proto__.constructor.name)
    }
    _children[child.pid] = child;
    _length++;

    child.on('exit', function () {
        if (_children.hasOwnProperty(this.pid)) {
            delete _children[this.pid];
            _length--;
        }
    })
};

ChildrenManager.terminate = function (err) {
    var child;
    for (var childKey in _children) {
        if (_children.hasOwnProperty(childKey)) {
            child = _children[childKey];
            child.kill('SIGTERM');
        }
    }
};

process.on('exit', ChildrenManager.terminate);
process.on('uncaughtException', ChildrenManager.terminate);

