// Test bot targeting logic

const config = {
  mentionMatchers: ['@gmeowbased', '#gmeowbased'],
  signalKeywords: ['stats', 'stat', 'rank', 'level', 'xp', 'points', 'progress', 'insights'],
  questionStarters: ['what', 'how', 'show', 'share', 'can', 'may'],
  requireQuestionMark: false
};

function isCastTargetedToBot(text, botFid, config) {
  const lowerText = text.toLowerCase();
  
  // Check mention matchers
  if (config.mentionMatchers.some(matcher => lowerText.includes(matcher.toLowerCase()))) {
    console.log('✅ Matched mention matcher');
    return true;
  }
  
  // Check signal keywords
  const hasSignalKeyword = config.signalKeywords.some(keyword => 
    lowerText.includes(keyword.toLowerCase())
  );
  
  if (hasSignalKeyword) {
    console.log('✅ Has signal keyword');
    
    // Check question pattern
    const hasQuestionStarter = config.questionStarters.some(starter => {
      const lowerStarter = starter.toLowerCase();
      return lowerText.startsWith(lowerStarter) || 
             lowerText.includes(` ${lowerStarter} `) ||
             lowerText.includes(`\n${lowerStarter} `);
    });
    
    const hasQuestionMark = lowerText.includes('?');
    
    console.log(`  Question starter: ${hasQuestionStarter}`);
    console.log(`  Question mark: ${hasQuestionMark}`);
    console.log(`  Require both: ${config.requireQuestionMark}`);
    
    if (config.requireQuestionMark) {
      return hasQuestionStarter && hasQuestionMark;
    } else {
      return hasQuestionStarter || hasQuestionMark;
    }
  }
  
  return false;
}

// Test cases
console.log('\n🔍 Testing: "hey show me my stats"');
console.log('Result:', isCastTargetedToBot('hey show me my stats', 18139, config));

console.log('\n🔍 Testing: "@gmeowbased show me my stats"');
console.log('Result:', isCastTargetedToBot('@gmeowbased show me my stats', 18139, config));

console.log('\n🔍 Testing: "what are my stats"');
console.log('Result:', isCastTargetedToBot('what are my stats', 18139, config));

console.log('\n🔍 Testing: "stats?"');
console.log('Result:', isCastTargetedToBot('stats?', 18139, config));
