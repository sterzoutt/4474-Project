/**
 * Evaluate: start op[0] vals[0] op[1] vals[1] ...
 * Null slots are skipped in the running total but are NOT considered "filled".
 */
export function evaluate(start, slots, operators) {
  let result = start
  for (let i = 0; i < slots.length; i++) {
    if (slots[i] !== null) {
      result += operators[i] === '+' ? slots[i] : -slots[i]
    }
  }
  return result
}

/** True when every slot has a placed pipe value. */
export function isComplete(slots) {
  return slots.length > 0 && slots.every((s) => s !== null)
}

/** Full answer check — requires all slots filled and result === target. */
export function checkAnswer(start, slots, operators, target) {
  return isComplete(slots) && evaluate(start, slots, operators) === target
}

/**
 * Lightweight self-test — call in a browser console to verify.
 * Returns { passed, failed }.
 */
export function runTests() {
  const cases = [
    // [start, slots, ops, target, expectedBool]
    [3, [5, 4], ['+', '+'], 12, true],
    [10, [3, 2], ['+', '-'], 11, true],
    [10, [3, 2], ['+', '-'], 10, false],
    [5,  [null, 4], ['+', '+'], 9, false],   // incomplete — must fail
    [5,  [4, null], ['+', '+'], 9, false],   // incomplete
    [20, [5, 3, 2], ['-', '-', '-'], 10, true],
  ]
  let passed = 0; let failed = 0
  cases.forEach(([start, slots, ops, target, expected], i) => {
    const result = checkAnswer(start, slots, ops, target)
    if (result === expected) {
      passed++
    } else {
      failed++
      console.warn(`Test ${i + 1} FAILED — expected ${expected}, got ${result}`)
    }
  })
  console.log(`evaluator tests: ${passed} passed, ${failed} failed`)
  return { passed, failed }
}
