# Brainiac — Phase 2 Explained in Plain English

This document explains every feature being built in Phase 2, 
what it does, and why it matters for the user.

---

## F-017 — Onboarding Baseline Assessment

This is the first thing a brand new user sees when they sign 
up. Before they can use Brainiac at all they get locked into 
a 5 minute test that measures 4 things:

- **Reading speed** — a passage appears, they click "done 
reading" and the app records how fast they read it in words 
per minute
- **Comprehension** — multiple choice questions about what 
they just read
- **Vocabulary** — do you know what these words mean?
- **Inference** — questions where the answer is not directly 
in the text, you have to think

All 4 scores get saved to the Supabase database permanently 
as their starting point. Every time they improve, Brainiac 
can show them "you started at 42, you are now at 78." That 
is the growth engine.

---

## F-001 — Core Reader UI

This is the main layout of the app. Think of it like building 
the shell of a house before putting furniture in. It includes:

- A navigation header with the Brainiac logo and the user 
profile icon
- A sidebar on the left showing their document library
- A main reading area in the center where content loads
- Clean, readable typography optimized for long reading sessions

No content loads yet — it is just the layout and structure.

---

## F-002 — Chunk Reader

This is the heart of Brainiac. Instead of showing the user a 
full article or document all at once, the text gets broken into 
chunks of 3-4 paragraphs. Here is exactly how it works:

- User opens a document
- Only the first chunk is visible
- A progress bar at the top shows "Chunk 1 of 8"
- A reading timer starts counting how long they spend on it
- When they click "Mark as read" it records the time and 
unlocks the next chunk
- The next chunk slides in and the timer resets

This forces slow, intentional reading instead of skimming.

---

## F-003 — Micro-Summarization

This is what happens after the user clicks "Mark as read" 
on each chunk:

- The text they just read dims out
- An input box appears that says "Summarize what you just 
read in one sentence"
- The next chunk stays locked until they write something
- Their summary gets saved to the database with a timestamp 
and which chunk it was for
- Later in Phase 3 Claude will score that summary but for 
now it just saves it

This is the active learning mechanic that actually builds 
comprehension. Passive reading does not stick. Being forced 
to summarize what you just read forces your brain to process 
it deeply.

---

## F-004 — Vocabulary Mapper

While reading any chunk, the user can click any word they 
do not know. A panel slides in from the right showing:

- Plain English definition
- Word root and origin (etymology)
- 3 synonyms
- An example sentence using the word

The word gets saved to their personal vocabulary bank. They 
can review all their saved words from a vocabulary tab. Later 
in Phase 3 Claude will generate the definitions dynamically.

---

## F-005 — Progress Dashboard

This is the page that shows the user how much they have 
improved since they started. It pulls data from everything 
above and displays:

- Their baseline scores from F-017 vs their current scores
- A chart showing reading speed over time
- Total sessions completed
- Total vocabulary words learned
- Current reading streak (days in a row)
- Comprehension score trend

This is the page that makes people feel proud of their 
progress and keeps them coming back.

---

## The Big Picture

When Phase 2 is complete Brainiac becomes a real product 
with a real user experience. Someone can:

1. Sign up
2. Take their baseline assessment
3. Upload a document
4. Read it in chunks
5. Write summaries after each chunk
6. Save vocabulary words
7. See their progress on the dashboard

That is a fully usable product without any AI yet. That is 
what gets the first real users.

Phase 3 is when Claude comes in and makes everything 
intelligent. Phase 2 is what makes it real.

---

## Why This Order Matters

Each feature builds on the one before it:

- No chunk reader without a reader UI
- No micro-summarization without chunk reader
- No vocabulary mapper without something to read
- No progress dashboard without data from all the above

This is why we build in sequence and never skip steps.
