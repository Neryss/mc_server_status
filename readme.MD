# Minecraft Server Status

This is a script I wrote to get the informations from a running minecraft server.

## Run

You can use `npm i` to install the dependencies (typescript types).

`tsc index.ts` and `node index.js <addr> <port>` to run the script!

# Sources

- [Minecraft server list protocol]("https://minecraft.wiki/w/Java_Edition_protocol/Server_List_Ping")
- [VarInt pseudo code]("https://minecraft.wiki/w/Java_Edition_protocol/Packets#VarInt_and_VarLong")
- [Handshake format]("https://minecraft.wiki/w/Java_Edition_protocol/Packets#Handshake")
- [Protocol ids]("https://minecraft.fandom.com/wiki/Protocol_version")

# Packets

When sending a TCP request to the server, it expects a specific packet to arrive:

```
|     name    |  type  |            notes                 |
|-------------|--------|----------------------------------|
| Length      | VarInt | Leng of packet ID + data         |
| Packet ID   | VarInt | Protocol id (protocol packet id) |
| Data        | Byte[] | Depends on the case, check below |
```

## Handshake protocol

In our case, the handshake protocol comes first, it uses the protocol `0x00` and its data is formed as follows:

```
|     name         |  type  |            notes                                               |
|------------------|--------|----------------------------------------------------------------|
| Protocol version | VarInt | The protocol version (minecraft version, check "protocol ids") |
| Server addr      | String | hostname/ip of the server                                      |
| Server port      | u_short| Defaults to 25565                                              |
| Intent           | VarInt Enum | 1 for status, 2 for login, 3 for transfer                 |
```

## Status Request

The status packet is only composed of the packet ID and its length. It must be sent right after the handshake and before anythhing else (ping etc.), it won't work otherwise.

# Response

The server response format can be found [here]("https://minecraft.wiki/w/Java_Edition_protocol/Server_List_Ping#Status_Response").
It is composed of a single String field, as with every other String response, it is prefixed by its length as a VarInt, which can be used to
wait and read for several chunks as done in the script.
