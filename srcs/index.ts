import { handshake } from './mc_status';

function main() {
  if (process.argv.length <= 2)
    handshake("neryss.pw", 25565);
  else
    handshake(process.argv[2], Number(process.argv[3]));
}

main();
