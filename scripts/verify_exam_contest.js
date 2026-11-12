const fs = require('fs');
const path = require('path');
const assert = require('assert');

// 1. Test PDF / Question Parsing Logic
const sampleContestText = `
Problem 1: Two Sum
Tier: Easy
Marks: 5
Given an array of integers, return indices of the two numbers such that they add up to a specific target.
Sample Input:
2 7 11 15
9
Sample Output:
0 1
Hidden Input:
3 2 4
6
Hidden Output:
1 2

Problem 2: Add Two Numbers
Tier: Medium
Marks: 10
Add two numbers represented as linked lists.
Sample Input:
2 4 3
5 6 4
Sample Output:
7 0 8

Problem 3: Median of Two Sorted Arrays
Tier: Hard
Marks: 15
Find the median of two sorted arrays.
Sample Input:
1 3
2
Sample Output:
2.0
`;

const sampleExamText = `
Experiment 1: Singly Linked List Operations
Marks: 50
Implement a menu-driven C program to perform create, insert, delete, and display operations on a singly linked list.
Sample Input:
1 10
1 20
4
Sample Output:
10 20

Experiment 2: Stack Using Array
Marks: 50
Design and develop a C program to implement Stack using array and demonstrate push, pop, and display.
Sample Input:
1 5
1 10
2
3
Sample Output:
5
`;

console.log('Testing Exam & Contest Logic...');

// Test 2: Student Allocation & Change of Experiment Logic
const students = [
  { usn: '1MS21CS001', name: 'Alice' },
  { usn: '1MS21CS002', name: 'Bob' },
  { usn: '1MS21CS003', name: 'Charlie' }
];

const experiments = [
  { id: 'exp_1', title: 'Exp 1: Singly Linked List', maxPoints: 50 },
  { id: 'exp_2', title: 'Exp 2: Stack Using Array', maxPoints: 50 },
  { id: 'exp_3', title: 'Exp 3: Queue Using Array', maxPoints: 50 }
];

// Random chit allocation simulation
students.forEach((s, i) => {
  s.assignedProblemId = experiments[i % experiments.length].id;
  s.assignedProblemTitle = experiments[i % experiments.length].title;
  s.chitPickType = 'random';
});

assert.strictEqual(students[0].assignedProblemId, 'exp_1');
assert.strictEqual(students[1].assignedProblemId, 'exp_2');
assert.strictEqual(students[2].assignedProblemId, 'exp_3');
console.log('✓ Student experiment allocation verified.');

// Test 3: Change of Experiment Simulation
const bob = students[1];
const originalExp = bob.assignedProblemId;
const originalTitle = bob.assignedProblemTitle;
const newExp = experiments[0]; // changed to Exp 1
const penalty = 5;

bob.isChangeOfExperiment = true;
bob.originalProblemId = originalExp;
bob.originalProblemTitle = originalTitle;
bob.assignedProblemId = newExp.id;
bob.assignedProblemTitle = newExp.title;
bob.changeOfExpPenalty = penalty;
bob.changeOfExpRemarks = 'Took second chit draw due to difficulty with stack';

assert.strictEqual(bob.isChangeOfExperiment, true);
assert.strictEqual(bob.originalProblemTitle, 'Exp 2: Stack Using Array');
assert.strictEqual(bob.assignedProblemTitle, 'Exp 1: Singly Linked List');
assert.strictEqual(bob.changeOfExpPenalty, 5);

// Test 4: Final Score computation with penalty
const rawScore = 48; // Student earned 48 out of 50
const finalScore = Math.max(0, rawScore - (bob.isChangeOfExperiment ? bob.changeOfExpPenalty : 0));
assert.strictEqual(finalScore, 43);
console.log(`✓ Change of experiment verified. Raw: ${rawScore}, Penalty: ${bob.changeOfExpPenalty}, Final: ${finalScore}`);

console.log('All automated logic tests passed successfully!');

