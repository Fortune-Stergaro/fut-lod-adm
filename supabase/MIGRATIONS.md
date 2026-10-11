# Migration guide

Run once each, in this order, in the Supabase SQL Editor: `schema.sql` > `v2` > `v3` > `v4` > `v5` (edit your admin email first) > `v6` > `v7`.
Deploy the matching site code before v6 and v7.

| File | What it does | Safe to re-run? |
|---|---|---|
| schema.sql | first tables, sample lodge | No (creates tables) |
| v2 | apartments per lodge, agents, bookings, functions, video storage | Yes. It never overwrites an existing `admin_check()` |
| v3 | stats (replaces features), stat categories | Mostly. Re-running it rebuilds the public view with ALL columns, so re-run v6 and v7 after |
| v4 | agent portal, review workflow | Same warning as v3 |
| v5 | real admin check, locks down requests / base prices / admin functions, analytics, visit tracking | Yes |
| v6 | hides the lodge name from the public data; admin bookings/interests functions | Yes |
| v7 | areas list + dropdown rules, area filter data; re-applies the final public view and privileges | Yes, any time |

**If you re-run an older file by accident, re-run v7 (and v5 if you ever see admin pages open to everyone).** v7 re-applies the final public view and privileges.
