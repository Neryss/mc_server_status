import * as net from "net";

// Helper to encode a varint
function writeVarInt(value: number): Buffer {
  const bytes: number[] = [];
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
function writeString(str: string): Buffer {
  const str_buf = Buffer.from(str, 'utf8');
  const length = writeVarInt(str_buf.length);
  return Buffer.concat([length, str_buf]);
}

// Create the handshake packet
function createHandshakePacket(host: string, port: number): Buffer {
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
function createStatusRequestPacket(): Buffer {
  const packetID = writeVarInt(0x00);
  const length = writeVarInt(packetID.length);
  return Buffer.concat([length, packetID]);
}

// Main handshake function
function handshake(addr: string, port: number): void {
  const client = new net.Socket();

  client.connect(port, addr, () => {
    console.log("Connected to server");

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
      console.log("Server Response:", json);

      client.end();
    } catch (e) {
      console.error("Error parsing server response:", e);
      client.end();
    }
  });

  client.on("close", () => {
    console.log("Connection closed");
  });
}

// Read varint from buffer
function readVarInt(buffer: Buffer, offset: number) {
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

// Entry point
function main(): void {
  console.log(process.argv.length);
  if (process.argv.length <= 2)
    handshake("mc.hypixel.net", 25565);
  else if (process.argv.length == 4)
    handshake(process.argv[2], Number(process.argv[3]));
}

export { handshake };
