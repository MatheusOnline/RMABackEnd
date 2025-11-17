"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function Timestamp() {
    const ts = Math.floor(Date.now() / 1000);
    return ts;
}
exports.default = Timestamp;
