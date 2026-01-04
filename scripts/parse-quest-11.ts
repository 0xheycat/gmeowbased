/**
 * Manually parse Quest 11 data from raw hex
 */

// From the raw call output for Quest 11
const rawHex = '0x00000000000000000000000000000000000000000000000000000000000001c0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000064000000000000000000000000008870c155666809609176260f2b65a626c000d773000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000006955b900000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000011466f6c6c6f7720676d656f7762617365640000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';

// Parse as 32-byte chunks
const chunks = rawHex.slice(2).match(/.{64}/g) || [];

console.log('Quest 11 Raw Storage Analysis:');
console.log('==============================\n');

// Based on the pattern observed:
// Chunk 0: String offset for name (0x1c0 = 448)
// Chunk 1: questType (0x00 = 0)
// Chunk 2: target (0x00 = 0)
// Chunk 3: rewardPoints (0x64 = 100)
// Chunk 4: creator address
// Chunk 5: maxCompletions (0x02 = 2)
// Chunk 6: expiresAt (unix timestamp)
// Chunk 7: String offset for meta
// Chunk 8: isActive (0x01 = true)
// Chunk 9: escrowedPoints (0x00 = 0)
// Chunk 10: claimedCount (0x01 = 1)

console.log('Chunk 3 - Reward Points:', parseInt(chunks[3], 16));
console.log('Chunk 4 - Creator:', '0x' + chunks[4].slice(24));
console.log('Chunk 5 - Max Completions:', parseInt(chunks[5], 16));
console.log('Chunk 6 - Expires At:', new Date(parseInt(chunks[6], 16) * 1000).toISOString());
console.log('Chunk 8 - Is Active:', parseInt(chunks[8], 16) === 1 ? 'YES' : 'NO');
console.log('Chunk 9 - Escrowed Points:', parseInt(chunks[9], 16));
console.log('Chunk 10 - Claimed Count:', parseInt(chunks[10], 16));

const nameHex = rawHex.slice(-130); // Last part contains the name
const nameLength = parseInt(nameHex.slice(2, 66), 16);
const nameBytes = nameHex.slice(66, 66 + nameLength * 2);
const name = Buffer.from(nameBytes, 'hex').toString();

console.log('\nName:', name);
console.log('\n📊 Summary:');
console.log('✅ Reward Points: 100');
console.log('✅ Max Completions: 2');
console.log('⚠️  Already Claimed: 1');
console.log('📌 Available Slots: 1 remaining');
console.log('💰 Escrowed Points: 0 (❌ NOT FUNDED!)');
console.log('\n🚨 PROBLEM: Quest has 0 escrowed points but promises 100 points reward!');
console.log('   The contract will revert with "InsufficientEscrow" error.');
