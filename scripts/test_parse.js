const fs = require('fs');
const path = require('path');

// Load main.js by reading it or isolating parseQuestionsFromText
const mainContent = fs.readFileSync(path.join(__dirname, '..', 'main.js'), 'utf-8');

// Extract parseQuestionsFromText implementation
const fnMatch = mainContent.match(/function parseQuestionsFromText[\s\S]*?\n\}/);
if (!fnMatch) {
  console.error("Could not find parseQuestionsFromText");
  process.exit(1);
}

eval(fnMatch[0]);

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

const parsed = parseQuestionsFromText(sample, 'contest');
console.log("Parsed result:", JSON.stringify(parsed, null, 2));
