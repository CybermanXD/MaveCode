# Enphase Email Development Rules

The client is Enphase, and the work is email marketing development.

Use [`references/Enphase_Main_Reference.html`](../references/Enphase_Main_Reference.html), [`references/css1.txt`](../references/css1.txt), and [`references/css2.txt`](../references/css2.txt) as the only approved sources of HTML structure, typography, and CSS behavior. Reuse only CSS classes and behavior already present in those references. Do not create, invent, or extend CSS behavior or helpers. If the approved references do not cover a requirement, report the gap to the user for human review rather than adding CSS.

All email tables must use valid `table > tr > td` nesting. Never place a `td` directly under a `table` or place a `tr` under a `td` without an intervening table.

## Primary Operating Rule

Before coding, read [`rules/main_config.md`](main_config.md) and the approved references. When only blocks are requested, return complete table-based block markup inside the appropriate paired comments, without adding an unnecessary full document shell.

Use `px` on every nonzero CSS length in a padding declaration. Write zero as `0px`.
Use `target="_blank"` for links intended to open a new window.
Give every CTA anchor meaningful `alias` and `title` values matching its visible label.
Do not use `letter-spacing` in Enphase reference-derived markup.
Construct each static tracked URL with one query string and no duplicate `utm_campaign` parameter.
