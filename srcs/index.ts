import { getStatus } from './mc_status';

async function main() {
  var json = await getStatus("neryss.pw", 25565).catch((error) => {
    console.log(error);
  })
}

main();
