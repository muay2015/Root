const stimulusText = '다음 글의 내용을 한 문장으로 요약할 때, 빈칸 (A)_______, (B)_______에 들어갈 말로 가장 적절한 것은? A technology company noticed that its most successful teams were not always the ones with the strongest individual experts. Instead, the best results came from groups that shared information early and revised their plans frequently. In these teams, members felt safe admitting uncertainty, which prevented small problems from becoming major crises. Their approach proved that workplace innovation depends less on isolated brilliance and more on open coordination. Effective problem solving must combine (A)_______ with (B)_______.';
let cleanedStimulus = stimulusText.replace(/다음 글의 내용을 한 문장으로 요약할 때,[^?]*\?/g, '').trim();
console.log('cleanedStimulus:\n', cleanedStimulus.substring(0,60));
const summaryRegex = /([A-Z"'][^.?!]*\(\s*A\s*\)[^.?!]*\(\s*B\s*\)[^.?!]*[.!?])/i;
const summaryMatch = cleanedStimulus.match(summaryRegex);
console.log('\nsummaryMatch:\n', summaryMatch ? summaryMatch[1] : 'FAIL');
