"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStatus = getStatus;
const net = __importStar(require("net"));
// More informations about the VarInt format in the readme,
// the function encodes a value (int) to a VarInt
function writeVarInt(value) {
    const bytes = [];
    while (true) {
        if ((value & 0xffffff80) === 0) {
            bytes.push(value);
            break;
        }
        bytes.push((value & 0x7f) | 0x80);
        value >>>= 7;
    }
    return Buffer.from(bytes);
}
// Helper to encode a string
function writeString(str) {
    const str_buf = Buffer.from(str, 'utf8');
    const length = writeVarInt(str_buf.length);
    return Buffer.concat([length, str_buf]);
}
// Create the handshake packet
function createHandshakePacket(host, port) {
    const protocol_version = writeVarInt(754); // Minecraft 1.16.5+
    const server_addr = writeString(host);
    const server_port = Buffer.alloc(2);
    server_port.writeUInt16BE(port, 0);
    const next_state = writeVarInt(1); // status
    const packetID = writeVarInt(0x00);
    const data = Buffer.concat([
        packetID,
        protocol_version,
        server_addr,
        server_port,
        next_state
    ]);
    const length = writeVarInt(data.length);
    return Buffer.concat([length, data]);
}
// Create status request packet
function createStatusRequestPacket() {
    const packetID = writeVarInt(0x00);
    const length = writeVarInt(packetID.length);
    return Buffer.concat([length, packetID]);
}
// Communicate using mc server protocol to get informations about a desired server
function getStatus(addr, port) {
    return new Promise((resolve, reject) => {
        const client = new net.Socket();
        client.connect(port, addr, () => {
            const handshake_packet = createHandshakePacket(addr, port);
            const status_request = createStatusRequestPacket();
            client.write(handshake_packet);
            client.write(status_request);
        });
        let received_data = Buffer.alloc(0);
        client.on("data", (data) => {
            received_data = Buffer.concat([received_data, data]);
            try {
                let offset = 0;
                // Read packet length
                const length = readVarInt(received_data, offset);
                offset += length.size;
                // Wait until we have the full packet
                if (received_data.length < offset + length.value) {
                    return; // wait for more data
                }
                // Read packet ID
                const packetId = readVarInt(received_data, offset);
                offset += packetId.size;
                // Read JSON string length
                const strLen = readVarInt(received_data, offset);
                offset += strLen.size;
                // Wait until we have the full JSON string
                if (received_data.length < offset + strLen.value) {
                    return;
                }
                // Extract and parse the json response so we can log it
                const json_str = received_data.slice(offset, offset + strLen.value).toString("utf8");
                const json = JSON.parse(json_str);
                client.end();
                resolve(json);
            }
            catch (e) {
                reject(e);
                client.end();
            }
        });
        client.on("close", () => {
            //console.log("Connection closed");
        });
        client.on("error", (err) => {
            reject("Error while getting the status: " + err);
        });
    });
}
// Read varint from buffer
function readVarInt(buffer, offset) {
    let value = 0;
    let size = 0;
    let byte = 0;
    do {
        byte = buffer[offset + size];
        value |= (byte & 0x7F) << (7 * size);
        size++;
        if (size > 5)
            throw new Error("VarInt too big");
    } while ((byte & 0x80) === 0x80);
    return { value, size };
}
