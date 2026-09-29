const { createPublicClient, http, encodeFunctionData, parseAbi } = require('viem');
const { sepolia } = require('viem/chains');

const client = createPublicClient({
  chain: sepolia,
  transport: http('https://ethereum-sepolia-rpc.publicnode.com')
});

async function inspectRaw() {
  const address = '0xe026F21BC7800E497fdb117aeBECcf60c69d7b42';
  const data = await client.call({
    to: address,
    data: '0x99539304' // let's compute hash of getAllGoals()
  });
  console.log(data);
}

inspectRaw();
