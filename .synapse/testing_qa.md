# Issue Tracker & Test Cases

## Test Case: Range Initialization
- **Input:** Federico, 500-510, $3000
- **Result:** Success. Correct entry displayed, seller name verified.

## Test Case: Payment & Confirmation
- **Action:** Click Cash -> Cancel.
- **Result:** Success. No record created.
- **Action:** Click Cash -> Confirm.
- **Result:** Success. Entry 500 recorded, counter moved to 501.

## Test Case: Undo Functionality
- **Action:** Record sale -> Click Undo -> Confirm.
- **Result:** Success. Entry removed, stats and counter reverted correctly.

## Test Case: History Modification
- **Action:** Toggle method.
- **Result:** Success. Total revenue breakdown updated correctly.
- **Action:** Delete sale.
- **Result:** Success. Revenue and progress updated correctly.

## Test Case: Export
- **Action:** PDF Export.
- **Result:** Success. Metadata (Seller, Date, Range) included.
- **Action:** Excel Export.
- **Result:** Success. Summary rows verified.

## Tracker
- No open bugs.
