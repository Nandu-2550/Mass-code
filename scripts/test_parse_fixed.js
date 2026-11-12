function parseQuestionsFromTextFixed(rawText, mode = 'auto') {
  if (!rawText || !rawText.trim()) return [];

  let effectiveMode = mode;
  if (!effectiveMode || effectiveMode === 'auto') {
    const isExamSignal = /(?:Experiment|Exp\s*\d+|Lab\s*Exam|Laboratory|VTU|Program\s*\d+|Lab\s*Manual)/i.test(rawText);
    const isContestSignal = /(?:Easy\s*Tier|Medium\s*Tier|Hard\s*Tier|Round\s*1|Round\s*2|Round\s*3)/i.test(rawText);
    effectiveMode = (isExamSignal && !isContestSignal) ? 'exam' : 'contest';
  }

  const text = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = text.split('\n');
  let currentTier = effectiveMode === 'exam' ? 'lab' : 'easy';

  let questionRegex;
  if (effectiveMode === 'exam') {
    questionRegex = /^(?:(?:Experiment|Exp\.?|Program|Prog\.?|Lab\s*Experiment|Lab|Exercise|Part\s*[A-B]\s*[-–—:]?\s*(?:Q|Prog|Exp)?)\s*(\d+)[\s:.)\-—]+|(?:\[\s*(?:Experiment|Exp|Program|Lab|Part\s*[A-B])\s*(\d+)\s*\])|(?:\b(\d+)[\.)]\s+([A-Z0-9].*))|(?:(?:Question|Problem|Q\.?)\s*(\d+)[\s:.)\-—]+))/i;
  } else {
    questionRegex = /^(?:(?:Question|Problem|Q\.?)\s*(\d+)[\s:.)\-—]+|(?:\[\s*(?:Question|Problem|Q)\s*(\d+)\s*\])|(?:\b(\d+)[\.)]\s+([A-Z0-9].*)))/i;
  }
  const sectionRegex = /(?:Section|Round|Part|Tier)\s*([A-Za-z0-9]+)?[\s:.\-—]*(Easy|Medium|Hard)/i;

  const chunks = [];
  let currentChunk = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    const secMatch = trimmed.match(sectionRegex);
    if (secMatch) {
      currentTier = secMatch[2].toLowerCase();
      continue;
    }

    const qMatch = trimmed.match(questionRegex);
    if (qMatch) {
      if (currentChunk) chunks.push(currentChunk);
      currentChunk = {
        headerLine: trimmed,
        defaultTier: currentTier,
        lines: [trimmed],
        qNumber: qMatch[1] || qMatch[2] || qMatch[3] || qMatch[4] || (chunks.length + 1)
      };
    } else {
      if (currentChunk) {
        currentChunk.lines.push(line);
      } else {
        const preMatch = trimmed.match(/\b(Easy|Medium|Hard)\b/i);
        if (preMatch) {
          const t = preMatch[1].toLowerCase();
          if (['easy', 'medium', 'hard'].includes(t)) {
            currentTier = t;
          }
        }
      }
    }
  }

  if (currentChunk) chunks.push(currentChunk);

  if (chunks.length === 0) {
    chunks.push({
      headerLine: effectiveMode === 'exam' ? 'Experiment 1' : 'Problem 1',
      defaultTier: effectiveMode === 'exam' ? 'lab' : 'easy',
      lines: lines,
      qNumber: 1
    });
  }

  const parsedProblems = [];

  chunks.forEach((chunk, idx) => {
    const chunkText = chunk.lines.join('\n');
    const qNum = chunk.qNumber || (idx + 1);

    let tier = effectiveMode === 'exam' ? 'lab' : (chunk.defaultTier || 'easy');
    let difficulty = effectiveMode === 'exam' ? 'Lab' : 'Easy';

    if (effectiveMode === 'contest') {
      // Check for tier in headerLine first or anywhere in chunk
      const headerTierMatch = chunk.headerLine.match(/\b(easy|medium|hard)\b/i);
      const tierMatch = headerTierMatch ||
        chunkText.match(/\b(?:tier|difficulty|level)[\s:.\-—]+(easy|medium|hard)\b/i) ||
        chunkText.match(/\[\s*(easy|medium|hard)\s*\]/i) ||
        chunkText.match(/\b(easy|medium|hard)\s+(?:tier|level)\b/i) ||
        chunkText.match(/\b(easy|medium|hard)\b/i);

      if (tierMatch) {
        const found = (tierMatch[1] || tierMatch[2] || tierMatch[0]).toLowerCase();
        if (['easy', 'medium', 'hard'].includes(found)) {
          tier = found;
        }
      }
      difficulty = tier.charAt(0).toUpperCase() + tier.slice(1);
    }

    // 2. Max Points: check "10 Marks", "Marks: 10", "[10 Marks]", etc.
    let maxPoints = effectiveMode === 'exam' ? 50 : (tier === 'hard' ? 15 : (tier === 'medium' ? 10 : 5));
    const ptsMatch = chunkText.match(/(\d+)\s*(?:marks?|points?|pts)\b/i) ||
      chunkText.match(/(?:max\s*points?|points?|marks?)\s*[:=\-—]?\s*(\d+)/i) ||
      chunkText.match(/\[\s*(\d+)\s*(?:marks?|points?|pts)\s*\]/i) ||
      chunkText.match(/\(\s*(\d+)\s*(?:marks?|points?|pts)\s*\)/i);
    if (ptsMatch) {
      const parsedPts = parseInt(ptsMatch[1] || ptsMatch[2], 10);
      if (parsedPts > 0 && parsedPts <= 100) {
        maxPoints = parsedPts;
      }
    }

    // 3. Title Extraction
    let rawTitle = '';
    const titleMatch = chunkText.match(/Title\s*[:=\-—]\s*([^\n]+)/i);
    if (titleMatch) {
      rawTitle = titleMatch[1].trim();
    } else {
      let h = chunk.headerLine
        // Remove Question X: or Problem X: prefix
        .replace(/^(?:Experiment|Exp\.?|Program|Prog\.?|Lab|Exercise|Question|Problem|Q\.?)\s*\d+[\s:.)\-—]*/i, '')
        .replace(/^\d+[\.)]\s*/, '')
        // Remove [Easy] or (Medium) or standalone Easy/Medium/Hard
        .replace(/\[\s*(?:Easy|Medium|Hard|Lab|\d+\s*Marks?|\d+\s*Pts)\s*\]/gi, '')
        .replace(/\(\s*(?:Easy|Medium|Hard|Lab|\d+\s*Marks?|\d+\s*Pts)\s*\)/gi, '')
        .replace(/\b(?:Easy|Medium|Hard)\b/gi, '')
        // Remove "— 10 Marks", "- 10 Marks", etc.
        .replace(/[-–—:]\s*\d+\s*(?:marks?|points?|pts)\b/gi, '')
        .replace(/\b\d+\s*(?:marks?|points?|pts)\b/gi, '')
        .trim();

      if (h.length > 2) {
        rawTitle = h;
      } else {
        const secondLine = (chunk.lines[1] || '').trim();
        if (secondLine && !secondLine.match(/^(?:Points|Marks|Tier|Difficulty|Description|Problem Description|Aim)/i)) {
          rawTitle = secondLine;
        } else {
          rawTitle = effectiveMode === 'exam' ? `Lab Program ${qNum}` : `Problem ${qNum}`;
        }
      }
    }

    rawTitle = rawTitle.replace(/^[:\-—\s]+/, '').replace(/[:\-—\s]+$/, '').trim();

    // Standardized Clean Title
    let cleanTitle;
    if (effectiveMode === 'exam') {
      cleanTitle = rawTitle.toLowerCase().startsWith('exp') || rawTitle.toLowerCase().startsWith('prog')
        ? rawTitle
        : `Experiment ${qNum}: ${rawTitle}`;
    } else {
      cleanTitle = rawTitle.toLowerCase().startsWith('question') || rawTitle.toLowerCase().startsWith('problem')
        ? rawTitle
        : `Question ${qNum}: ${rawTitle}`;
    }

    // 4. Starter Code
    let starterCode = '';
    const codeBlockMatch = chunkText.match(/(?:Starter\s*Code|Buggy\s*Code|Faulty\s*Code|Code(?:\s*Template)?)\s*[:=\-—]?\s*(?:```[a-z]*\s*)?\n([\s\S]*?)(?:```|\n\s*(?:Sample\s+Input|Test\s*Case|Input\s*:|Expected\s+Output)|$)/i);
    if (codeBlockMatch) {
      starterCode = codeBlockMatch[1].trim();
    } else {
      const fencedMatch = chunkText.match(/```(?:c|cpp|python)?\n([\s\S]*?)```/i);
      if (fencedMatch) {
        starterCode = fencedMatch[1].trim();
      } else {
        const includeMatch = chunkText.match(/(#include\s*<[\s\S]*?int\s+main[\s\S]*?\n\})/i);
        if (includeMatch) starterCode = includeMatch[1].trim();
      }
    }

    if (!starterCode) {
      starterCode = '#include <stdio.h>\n#include <stdlib.h>\n\nint main(void) {\n    // Write solution here\n    return 0;\n}\n';
    } else {
      if (!starterCode.endsWith('\n')) starterCode += '\n';
    }

    // 5. Test Cases
    const testCases = [];
    const tcRegex = /(?:Sample\s+Input(?:\s*\d+)?|Test\s*Case\s*\d*\s*Input|Input\s*\d*)\s*[:=\-—]?\s*\n?([\s\S]*?)(?:(?:Sample\s+Output(?:\s*\d+)?|Expected\s*Output(?:\s*\d+)?|Output\s*\d*)\s*[:=\-—]?\s*\n?([\s\S]*?))(?=(?:\b(?:Sample\s+Input|Test\s*Case|Input\s*\d*|Question|Problem|Experiment|Exp)\b|\n\n\n|$))/gi;
    let tcMatch;
    let tcCount = 1;

    while ((tcMatch = tcRegex.exec(chunkText)) !== null) {
      let rawIn = tcMatch[1].trim();
      let rawOut = tcMatch[2].trim();

      rawIn = rawIn.replace(/^```[a-z]*\n?/i, '').replace(/```$/i, '').trim();
      rawOut = rawOut.replace(/^```[a-z]*\n?/i, '').replace(/```$/i, '').trim();

      if (rawIn.length > 0 && !rawIn.endsWith('\n')) rawIn += '\n';
      if (rawOut.length > 0 && !rawOut.endsWith('\n')) rawOut += '\n';

      testCases.push({
        id: `tc_p${qNum}_${tcCount}`,
        isSample: tcCount === 1,
        input: rawIn,
        expectedOutput: rawOut
      });
      tcCount++;
    }

    if (testCases.length === 0) {
      testCases.push({
        id: `tc_p${qNum}_1`,
        isSample: true,
        input: '',
        expectedOutput: ''
      });
    }

    // 6. Description Extraction
    // Remove header line, starter code, and test cases cleanly
    let desc = chunkText;
    desc = desc.replace(chunk.headerLine, '');
    if (codeBlockMatch) {
      desc = desc.replace(codeBlockMatch[0], '');
    } else if (starterCode) {
      desc = desc.replace(/(?:Starter\s*Code|Code)[\s\S]*?(?:return\s*0\s*;?\s*\}|\})/i, '');
    }
    // Remove test cases section
    desc = desc.replace(/(?:\bSample\s+Input|\bExpected\s+Output|\bSample\s+Output|\bTest\s*Case)[\s\S]*/gi, '');
    // Clean section tags
    desc = desc.replace(/^(?:Problem\s*Description|Description|Problem\s*Statement|Experiment\s*Aim|Aim)\s*[:=\-—]?\s*/gim, '');
    desc = desc.replace(/(?:tier|difficulty|level|points?|marks?)\s*[:=\-—][^\n]+/gi, '');
    desc = desc.replace(/[-–—:]\s*\d+\s*(?:marks?|points?|pts)\b/gi, '');
    desc = desc.replace(/\[\s*(?:easy|medium|hard|lab|\d+\s*marks?|\d+\s*pts)\s*\]/gi, '');

    desc = desc.trim();
    if (!desc) {
      desc = effectiveMode === 'exam'
        ? 'Implement the lab experiment as per specification, handle all edge cases, and pass the test cases.'
        : 'Implement the solution according to specifications and pass all test cases.';
    }

    parsedProblems.push({
      id: `p_pdf_${qNum}_${Date.now() % 10000}`,
      tier: tier,
      difficulty: difficulty,
      title: cleanTitle,
      category: effectiveMode === 'exam' ? 'Lab Experiment' : 'Algorithmic Challenge',
      maxPoints: maxPoints,
      timeLimitMs: 2000,
      description: desc,
      starterCode: starterCode,
      testCases: testCases
    });
  });

  return parsedProblems;
}

const sample = `Question 4: Prime Number Range Count MEDIUM — 10 Marks
Problem Description:
Given two positive integers L and R (1 <= L <= R <= 1000), count how many prime numbers exist between L and R inclusive.

Starter Code:
#include <stdio.h>
int main(void) {
    // Write your code here
    return 0;
}

Sample Input:
10 20
Expected Output:
4`;

const res = parseQuestionsFromTextFixed(sample, 'contest');
console.log("FIXED RESULT:\n", JSON.stringify(res, null, 2));

let testDesc = `Problem Description:
Given two positive integers L and R (1 <= L <= R <= 1000), count how many prime numbers exist between L and R inclusive.

Starter Code:
#include <stdio.h>
int main(void) {
    // Write your code here
    return 0;
}

Sample Input:
10 20
Expected Output:
4`;

const codeBlockMatch = testDesc.match(/(?:Starter\s*Code|Buggy\s*Code|Faulty\s*Code|Code(?:\s*Template)?)\s*[:=\-—]?\s*(?:```[a-z]*\s*)?\n([\s\S]*?)(?:```|\n\s*(?:Sample\s+Input|Test\s*Case|Input\s*:|Expected\s+Output)|$)/i);
console.log("codeBlockMatch[0]:\n" + (codeBlockMatch ? codeBlockMatch[0] : 'null'));

let replaced = testDesc.replace(codeBlockMatch[0], '');
console.log("After code replace:\n" + replaced);

let cleanDesc = replaced.replace(/(?:\bSample\s+Input|\bExpected\s+Output|\bSample\s+Output|\bTest\s*Case)[\s\S]*/gi, '');
console.log("After test cases remove:\n" + cleanDesc);

console.log("=== WITH LOOKAHEAD ===");
const codeLookaheadMatch = testDesc.match(/(?:Starter\s*Code|Buggy\s*Code|Faulty\s*Code|Code(?:\s*Template)?)\s*[:=\-—]?\s*(?:```[a-z]*\s*)?\n([\s\S]*?)(?:```|(?=\n\s*(?:Sample\s+Input|Test\s*Case|Input\s*:|Expected\s+Output))|$)/i);
console.log("codeLookaheadMatch[0]:\n" + (codeLookaheadMatch ? codeLookaheadMatch[0] : 'null'));

let replaced2 = testDesc.replace(codeLookaheadMatch[0], '');
let cleanDesc2 = replaced2.replace(/(?:\bSample\s+Input|\bExpected\s+Output|\bSample\s+Output|\bTest\s*Case)[\s\S]*/gi, '');
cleanDesc2 = cleanDesc2.replace(/^(?:Problem\s*Description|Description|Problem\s*Statement|Experiment\s*Aim|Aim)\s*[:=\-—]?\s*/gim, '').trim();
console.log("FINAL CLEAN DESC:\n" + cleanDesc2);
