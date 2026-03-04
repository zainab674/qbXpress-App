const { evaluate } = require('mathjs');

const testScope = {
    value: 100,
    extraValue: 10,
    extraValue2: 2,
    ppValue: 90,
    pyValue: 80
};

const tests = [
    { name: 'Simple addition', formula: 'value + extraValue', expected: 110 },
    { name: 'Subtraction and division', formula: '(value - ppValue) / ppValue', expected: (100 - 90) / 90 },
    { name: 'Multiplication', formula: 'extraValue * extraValue2', expected: 20 },
    { name: 'Complex expression', formula: '(value + extraValue) * extraValue2 / 10', expected: (100 + 10) * 2 / 10 },
    { name: 'Invalid formula syntax', formula: 'value ++ extraValue', expected: 'Error' },
];

console.log('--- Formula Evaluation Tests ---');
tests.forEach(t => {
    try {
        const result = evaluate(t.formula, testScope);
        const matches = typeof result === 'number' ? Math.abs(result - t.expected) < 0.0001 : result === t.expected;
        console.log(`[${matches ? 'PASS' : 'FAIL'}] ${t.name}: "${t.formula}" -> Result: ${result}, Expected: ${t.expected}`);
    } catch (err) {
        const matches = t.expected === 'Error';
        console.log(`[${matches ? 'PASS' : 'FAIL'}] ${t.name}: "${t.formula}" -> Threw Error (Expected: ${t.expected})`);
    }
});

console.log('\n--- Security Check (Limited) ---');
try {
    // mathjs doesn't expose process/require by default in evaluate()
    evaluate('process.exit()', testScope);
    console.log('[FAIL] process.exit() was executed/resolved');
} catch (err) {
    console.log('[PASS] process.exit() failed as expected');
}
