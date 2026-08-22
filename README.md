# Civil Engineering Quiz Hub

A multi-app, interactive practice-quiz hub. The home screen has a **switcher** to move between three separate question-bank apps:

- **Civil Engineering 1** — Construction Planning & Management, Estimating/Costing & Valuation (PWD), Surveying (252 questions)
- **Civil Engineering 2** — Building Materials & Construction Technology (12 questions — starter set, add more subjects here)
- **Non-Technical / General Studies** — General English, Quantitative Aptitude, Reasoning Ability (30 questions)

Your last-selected app is remembered across visits.

## Folder structure

```
quiz-app/
├── index.html                      Entry point — open this file in a browser
├── css/
│   └── styles.css                  All styling (cyanotype/diazo themes, layout, animations)
├── js/
│   └── app.js                      App logic: app groups, state, rendering, quiz engine, persistence
├── data/
│   ├── civil-engineering-1/
│   │   ├── construction-planning-management.js
│   │   ├── estimation-and-costing.js
│   │   └── surveying.js
│   ├── civil-engineering-2/
│   │   └── building-materials-construction.js
│   └── non-technical/
│       ├── general-english.js
│       ├── quantitative-aptitude.js
│       └── reasoning-ability.js
└── README.md
```

Just double-click `index.html` — no build step, no dependencies.

## Adding more questions or subjects

**1. Add questions to an existing subject** — open the relevant file under `data/civil-engineering-1/`, `data/civil-engineering-2/` or `data/non-technical/`, find the subtopic by `name` inside `subcats`, and push new question objects into its `questions` array.

**2. Add a new subtopic to an existing subject** — add a new object to that file's `subcats` array: `{ "name": "New Topic", "questions": [...] }`.

**3. Add a whole new subject to an existing app** (e.g. a 2nd subject under Civil Engineering 2) — three steps:
   - Create `data/civil-engineering-2/your-subject.js` exporting `window.QUIZ_CATEGORY_XYZ` in the schema below
   - Add `<script src="data/civil-engineering-2/your-subject.js"></script>` in `index.html`, before `js/app.js`
   - Add it to the `CATEGORIES` array at the top of `js/app.js`: `Object.assign({icon:'🧱', group:'civil2'}, window.QUIZ_CATEGORY_XYZ)`

**4. Add a brand new app** (a 4th switcher tab) — two steps:
   - Add its metadata to the `APP_GROUPS` array in `js/app.js`: `{ id:'yourid', label:'Your App Name', icon:'📝', blurb:'...' }`
   - Tag any category you want in that app with `group:'yourid'` when registering it in `CATEGORIES`

The switcher on the home page is generated automatically from `APP_GROUPS` — no other UI changes needed. Group ids currently in use: `civil1`, `civil2`, `nontechnical`.

## Data format

Every subject (category) uses the same schema, regardless of which app it belongs to:

```js
{
  id: "cpm",
  title: "...",
  description: "...",
  subcats: [
    {
      name: "...",
      questions: [
        { num: 1, text: "...", options: ["...", "...", "...", "..."], correct: 0, expl: "..." },
        ...
      ]
    }
  ]
}
```

## What's included

- Test Mode (linear run, scored, review of missed questions at the end) and Practice Mode (missed questions resurface until mastered)
- Full subject run, random 30-question draw, per-subtopic quizzes, bookmarking, and Smart Review (auto-rebuilds a quiz from your past mistakes)
- Search and status filters (All / Not Started / In Progress / Attempted All) on the home screen — scoped to whichever app is active
- Progress, best scores, bookmarks and mistake history saved automatically via `localStorage`, per subject
- Cyanotype/diazo (blueprint/whiteprint) theme toggle, live title block, keyboard shortcuts, confetti, export-to-text
- **In-app question manager** — add, edit, and delete questions directly from the browser (see below)

## Managing questions in the app (no code editing required)

Open any subject and click **"✎ Manage Questions"** at the top of its page. From there you can:

- **Add a question** — pick a subtopic, type the question, fill in all 4 options, tap the letter next to the correct one, and write an explanation
- **Edit a question** — same form, pre-filled with the existing question. The subtopic can't be changed when editing (delete and re-add under a different subtopic instead, to avoid breaking your saved progress on the old one)
- **Change the correct answer** — just tap a different letter in the edit form and save
- **Delete a question** — one click, with a confirmation prompt
- **Reset a subject** — "Reset This Subject To Original" discards all your adds/edits/deletes for that subject and restores the shipped question set
- **Remove a subject entirely** — "Remove This Subject" at the bottom of Manage Questions hides that subject from the app (it's not deleted — restore it anytime from the home page's "Hidden Subjects" panel)

**Important — these changes live in your browser's local storage, not in the actual files.** That means:
- They'll still be there next time you open the app *in the same browser on the same device*
- They will **not** appear if you open the app in a different browser, a different device, or after clearing browser data
- They are **not included** if you re-download/re-share this project folder

**To make changes permanent** (so they survive across devices and are baked into the project itself), click **"⇩ Export Data File"** on the Manage Questions screen. This downloads a ready-to-use `.js` file — open it, then replace the matching file under `data/.../` in your project with it. The download tells you exactly which file it replaces (shown in the app and in a comment at the top of the file).

## Importing a whole new subject from a file

On the home page, click **"⇧ Import Subject From File"**. This lets you upload a file and add it as a brand-new subject — no code editing required.

**Accepted file formats:**
- The same format as this project's own `data/*.js` files: `window.QUIZ_CATEGORY_SOMETHING = { id, title, description, subcats: [...] };`
- Plain JSON or a JS object literal with the same shape, without the `window.` wrapper: `{ "title": "...", "description": "...", "subcats": [...] }`

Pick which section to add it to (Civil Engineering 1, Civil Engineering 2, or Non-Technical), choose the file, and the app shows a preview (title, subtopic count, question count) before you confirm. If the file is missing required fields (a title, subtopics, 4 options per question, a valid correct-answer index), the app tells you exactly what's wrong instead of importing broken data.

Once imported, the new subject behaves exactly like a built-in one — you can quiz on it, bookmark questions, and use Manage Questions to add/edit/delete individual questions within it. The only difference: since it wasn't part of the original project, it can also be **permanently deleted** (not just hidden) from the "Hidden Subjects" panel on the home page, if you want to fully remove it and free up storage.

Like everything else in Manage Questions, imported subjects live in your browser's local storage — use **Export Data File** from that subject's Manage Questions screen if you want to turn it into a permanent project file too.

## Removing subjects you don't want

Every subject — built-in or imported — can be removed from **Manage Questions → "Remove This Subject"**. This hides it rather than deleting it, so nothing is ever lost by accident:

- A small **"📁 Hidden Subjects (N)"** button appears on the home page whenever you have any hidden subjects
- Click it to see the list, with a **Restore** button for each
- Subjects you imported yourself also get a **Delete Permanently** option there, for when you actually want the data gone for good
- Built-in subjects (the ones this project ships with) can only be hidden, never permanently deleted — restoring is always possible

## Note on the starter content

The Surveying, Building Materials & Construction Technology, and all three Non-Technical question sets included here are small starter sets (10–12 questions each) meant to demonstrate the structure with real, correct content. Replace or expand them the same way as any other subject — see "Adding more questions" above, or use an AI PDF-extraction prompt to pull more questions from your own source material into this exact schema.


