"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var net = require("net");
// Helper to encode a varint
function writeVarInt(value) {
    var bytes = [];
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
    var str_buf = Buffer.from(str, 'utf8');
    var length = writeVarInt(str_buf.length);
    return Buffer.concat([length, str_buf]);
}
// Create the handshake packet
function createHandshakePacket(host, port) {
    var protocol_version = writeVarInt(754); // Minecraft 1.16.5+
    var server_addr = writeString(host);
    var server_port = Buffer.alloc(2);
    server_port.writeUInt16BE(port, 0);
    var next_state = writeVarInt(1); // status
    var packetID = writeVarInt(0x00);
    var data = Buffer.concat([
        packetID,
        protocol_version,
        server_addr,
        server_port,
        next_state
    ]);
    var length = writeVarInt(data.length);
    return Buffer.concat([length, data]);
}
// Create status request packet
function createStatusRequestPacket() {
    var packetID = writeVarInt(0x00);
    var length = writeVarInt(packetID.length);
    return Buffer.concat([length, packetID]);
}
// Main handshake function
function handshake(addr, port) {
    var client = new net.Socket();
    //const address = "192.168.1.79";
    //const port = 25565;
    client.connect(port, addr, function () {
        console.log("Connected to server");
        var handshake_packet = createHandshakePacket(addr, port);
        var status_request = createStatusRequestPacket();
        client.write(handshake_packet);
        client.write(status_request);
    });
    var received_data = Buffer.alloc(0);
    client.on("data", function (data) {
        received_data = Buffer.concat([received_data, data]);
        try {
            var offset = 0;
            // Read packet length
            var length_1 = readVarInt(received_data, offset);
            offset += length_1.size;
            // Wait until we have the full packet
            if (received_data.length < offset + length_1.value) {
                return; // wait for more data
            }
            // Read packet ID
            var packetId = readVarInt(received_data, offset);
            offset += packetId.size;
            // Read JSON string length
            var strLen = readVarInt(received_data, offset);
            offset += strLen.size;
            // Wait until we have the full JSON string
            if (received_data.length < offset + strLen.value) {
                return; // wait for more data
            }
            // Extract and parse the json response so we can log it
            var json_str = received_data.slice(offset, offset + strLen.value).toString("utf8");
            var json = JSON.parse(json_str);
            console.log("Server Response:", json);
            client.end();
        }
        catch (e) {
            console.error("Error parsing server response:", e);
            client.end();
        }
    });
    client.on("close", function () {
        console.log("Connection closed");
    });
}
// Read varint from buffer
function readVarInt(buffer, offset) {
    var value = 0;
    var size = 0;
    var byte = 0;
    do {
        byte = buffer[offset + size];
        value |= (byte & 0x7F) << (7 * size);
        size++;
        if (size > 5)
            throw new Error("VarInt too big");
    } while ((byte & 0x80) === 0x80);
    return { value: value, size: size };
}
// Entry point
function main() {
    console.log(process.argv.length);
    if (process.argv.length <= 2)
        handshake("mc.hypixel.net", 25565);
    else if (process.argv.length == 4)
        handshake(process.argv[2], Number(process.argv[3]));
}
main();
