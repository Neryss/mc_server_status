import { getStatus } from './mc_status';

async function main() {
  var json;
  if (process.argv.length <= 2)
    json = await getStatus("neryss.pw", 25565);
  else
    json = await getStatus(process.argv[2], Number(process.argv[3]));
  console.log("Ret: ", json);
}

main();
