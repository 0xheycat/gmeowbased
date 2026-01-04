/**
 * Decode all quest metadata from on-chain
 */
import { decodeAbiParameters, parseAbiParameters, hexToString } from 'viem';

// Raw hex data from Quest 11
const questData = '0x00000000000000000000000000000000000000000000000000000000000001c0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000064000000000000000000000000087c155666809609176260f2b65a626c000d77300000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000006955b900000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000011466f6c6c6f7720676d656f7762617365640000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000' as const;

// Quest struct layout
const decoded = decodeAbiParameters(
  parseAbiParameters('string,uint8,uint256,uint256,address,uint256,uint256,string,bool,uint256,uint256,address,uint256,uint256'),
  questData
);

console.log('Quest 11 On-Chain Data:');
console.log('======================\n');
console.log('Name:', decoded[0]);
console.log('Quest Type:', decoded[1]);
console.log('Target:', decoded[2].toString());
console.log('Reward Points:', decoded[3].toString());
console.log('Creator:', decoded[4]);
console.log('Max Completions:', decoded[5].toString());
console.log('Expires At:', new Date(Number(decoded[6]) * 1000).toISOString());
console.log('Metadata:', decoded[7]);
console.log('Is Active:', decoded[8]);
console.log('Escrowed Points:', decoded[9].toString());
console.log('Claimed Count:', decoded[10].toString());
console.log('Reward Token:', decoded[11]);
console.log('Reward Token Per User:', decoded[12].toString());
console.log('Token Escrow Remaining:', decoded[13].toString());

console.log('\n📊 Summary:');
console.log('- Quest ID 11: "Follow gmeowbased"');
console.log('- Reward:', decoded[3].toString(), 'points per completion');
console.log('- Available:', Number(decoded[5]) - Number(decoded[10]), '/', decoded[5].toString(), 'slots');
console.log('- Status:', decoded[8] ? '✅ Active' : '❌ Inactive');
console.log('- Escrowed:', decoded[9].toString(), 'points');
