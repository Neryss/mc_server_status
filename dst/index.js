"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mc_status_1 = require("./mc_status");
function main() {
    if (process.argv.length <= 2)
        (0, mc_status_1.handshake)("neryss.pw", 25565);
    else
        (0, mc_status_1.handshake)(process.argv[2], Number(process.argv[3]));
}
main();
