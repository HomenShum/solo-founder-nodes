# Build To Delete

AI coding makes it cheap to create plausible scaffolding. The skill should normalize deletion as
progress and preserve the learning that forced the deletion.

Every phase can create disposable code, but every significant replacement needs a rework ledger entry:

```bash
npm run sfn -- rework verify --ledger rework-ledger.json
```

## Rework Ledger Contract

Each entry records:

- old approach
- why it seemed right
- what failed
- trace/proof that showed the failure
- new approach
- why it survived
- tests/receipts proving it
- deleted or deprecated artifacts
- surviving artifacts
- durable lesson

Good entries are specific. "Refactored UI" is not enough. "Removed hidden direct-DB export path after
live-browser export proof failed because the scorer never touched user-visible bytes" is useful.

## What To Preserve

Code can be deleted. The lesson should survive in memory, docs, and proof artifacts.

Good candidates:

- empty provider tool schemas
- old benchmark caps that hid long-horizon task completion
- tool-call argument loss
- hot HTML mirrors used as collaboration state
- raw passive intelligence triggered from untrusted document snapshots
- agent direct edits where proposal-first was required
- media judge results treated as product correctness
