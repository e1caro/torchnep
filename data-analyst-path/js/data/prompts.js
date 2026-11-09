/* General prompt library (the prompts attached to lessons are added automatically by the app).
 *
 * Placeholders: {{bg}} = the learner's background, {{lang}} = "answer in <language>" line (empty for English).
 * [[LIKE THIS]] marks a blank the learner must fill in before sending.
 */
(function () {
  'use strict';
  var DA = (window.DA = window.DA || {});

  DA.promptCategories = ['Learning', 'Spreadsheets', 'SQL', 'Python', 'Statistics', 'Visualization', 'AI workflow', 'Portfolio', 'Career'];

  DA.prompts = [
    // Learning
    {
      cat: 'Learning', title: 'Explain it in my world',
      text: "Explain [[CONCEPT]] to me. My background: {{bg}}.\nUse an analogy from my background, then one concrete example with numbers, then the most common mistake beginners make. Keep it under 200 words.\n{{lang}}",
    },
    {
      cat: 'Learning', title: 'Quiz me (one question at a time)',
      text: "Quiz me on [[TOPIC, e.g. SQL joins]]. Ask one question at a time, starting easy and getting harder. After each answer tell me if it is right, explain the reason briefly and then ask the next one. After 8 questions, summarise what I know and what to revise.\n{{lang}}",
    },
    {
      cat: 'Learning', title: 'Teach-back: find the holes in my understanding',
      text: "I'll explain [[TOPIC]] in my own words. Listen like a curious student and a strict teacher: tell me what I got right, what is vague or wrong, and what question a hiring manager might ask that I could not answer yet.\n\nMy explanation:\n[[WRITE IT HERE]]\n{{lang}}",
    },
    {
      cat: 'Learning', title: '8-week study plan',
      text: "Make me an 8-week study plan to become job-ready as a junior data analyst. My background: {{bg}}. I can study [[HOURS]] hours per week. Include for each week: the topic, the practice task, one mini-project and a self-test. Put the highest-value skills first (SQL, spreadsheets, one BI tool, basic Python and statistics). Keep it realistic.\n{{lang}}",
    },
    {
      cat: 'Learning', title: 'Review my error log',
      text: "Here is my error log from the last weeks (what went wrong and the cause):\n\n[[PASTE YOUR LOG]]\n\nFind patterns: what are my 3 most frequent kinds of mistakes? For each, give me a short drill (3 exercises) and a habit that would prevent it.\n{{lang}}",
    },
    {
      cat: 'Learning', title: 'Summarise a long article or documentation',
      text: "Summarise the text below for someone learning data analysis. Give: (1) the 5 key ideas, (2) 3 terms I should look up with a one-line definition each, (3) one thing I could try in practice today.\n\n[[PASTE TEXT]]\n{{lang}}",
    },

    // Spreadsheets
    {
      cat: 'Spreadsheets', title: 'Write a formula and explain it',
      text: "I use [[Excel / Google Sheets]]. My columns: [[COLUMN NAMES AND WHAT THEY CONTAIN]]. I want a formula that: [[WHAT YOU WANT]].\nGive the formula, explain each part, show how it behaves on 2 example rows, and mention one case where it would break.\n{{lang}}",
    },
    {
      cat: 'Spreadsheets', title: 'Debug my formula',
      text: "My [[Excel / Google Sheets]] formula is not working.\nFormula: [[FORMULA]]\nWhat I expected: [[EXPECTED]]\nWhat I get: [[ACTUAL / ERROR]]\n\nFind the cause, explain it in simple words, give the fixed formula and tell me how to avoid this error in the future.\n{{lang}}",
    },

    // SQL
    {
      cat: 'SQL', title: 'English to SQL (with schema)',
      text: "Write a [[SQLite / PostgreSQL / MySQL]] query for this question: [[QUESTION]]\n\nSchema (no real data):\n[[SCHEMA]]\n\nFirst list your assumptions, then give the query formatted over several lines, then explain it step by step, then give me one way to check the result is right.\n{{lang}}",
    },
    {
      cat: 'SQL', title: 'Explain this query',
      text: "Explain this SQL query line by line in plain language, in the order the database executes it (FROM, WHERE, GROUP BY, ...). Tell me what each part contributes and what the output looks like.\n\n[[QUERY]]\n{{lang}}",
    },
    {
      cat: 'SQL', title: 'SQL interview drill',
      text: "Give me 5 SQL interview questions of increasing difficulty on this schema, covering joins, GROUP BY / HAVING, a window function and NULL handling:\n[[SCHEMA]]\nAsk one at a time and wait for my answer. After each answer, say what a strong answer looks like.\n{{lang}}",
    },

    // Python
    {
      cat: 'Python', title: 'Explain this error',
      text: "I get this error in pandas / Python:\n[[PASTE FULL TRACEBACK]]\n\nMy code:\n[[PASTE CODE]]\n\nExplain what the error means in plain language, point to the exact line and cause, give me a hint first and then the fix. Tell me how to recognise this kind of error next time.\n{{lang}}",
    },
    {
      cat: 'Python', title: 'Spreadsheet logic to pandas',
      text: "In Excel I do this: [[DESCRIBE STEPS OR FORMULAS]]. Show me the equivalent in pandas, step by step, with a short comment for each line. My DataFrame has these columns: [[COLUMNS]].\n{{lang}}",
    },
    {
      cat: 'Python', title: 'Turn my messy notebook into clean steps',
      text: "Here is my notebook code. Without changing results, propose a cleaner structure: functions for loading, cleaning and analysis, clear names and short comments. Explain every change so I learn the pattern.\n\n[[PASTE CODE]]\n{{lang}}",
    },

    // Statistics
    {
      cat: 'Statistics', title: 'Which statistical test should I use?',
      text: "I want to answer: [[QUESTION]]. Data: [[DESCRIBE VARIABLES, GROUP SIZES, TYPES]]. Which statistical approach fits and why? List its assumptions and how I check them, the alternative if they fail, and how to report the result (effect size, interval, p-value) in one sentence for a manager.\n{{lang}}",
    },
    {
      cat: 'Statistics', title: 'Interpret this output',
      text: "Interpret this statistical output for me in plain language, like to a manager. Say what is solid, what is uncertain, and what I should not conclude.\n\n[[PASTE OUTPUT]]\n{{lang}}",
    },

    // Visualization
    {
      cat: 'Visualization', title: 'Make my chart insight-first',
      text: "Here is my chart description and data: [[DESCRIBE]]. Suggest: a title that states the insight, what to highlight in colour, what to remove, how to label directly, and one annotation. Then give the code in [[matplotlib / seaborn / Plotly]] for the improved version.\n{{lang}}",
    },

    // AI workflow
    {
      cat: 'AI workflow', title: 'Anonymise my data before I paste it',
      text: "I want to ask you about a dataset with personal or sensitive information. Without me pasting the real data, tell me: (1) which columns I should remove, mask or generalise, (2) how to make 10 fake but realistic example rows, (3) what structure/schema to share instead. My columns: [[COLUMN NAMES]].\n{{lang}}",
    },
    {
      cat: 'AI workflow', title: 'EDA plan for a new dataset',
      text: "I have a new dataset about [[TOPIC]] with columns [[COLUMNS]] and about [[N]] rows. Create an exploratory-analysis plan: 10 checks to run first (types, missing, duplicates, ranges, distributions...), 5 questions the data could answer, and the pandas or SQL for the first 3 checks. Explain what 'suspicious' would look like for each check.\n{{lang}}",
    },

    // Portfolio
    {
      cat: 'Portfolio', title: 'Find a dataset for my question',
      text: "I want to analyse: [[QUESTION]]. My background: {{bg}}. Suggest 5 public datasets or sources (government portals, Kaggle, UCI, Our World in Data, APIs) that could help: for each give what it contains, the size, licence considerations and the biggest data-quality risk. Only suggest sources you are confident exist, and tell me to verify the links.\n{{lang}}",
    },

    // Career
    {
      cat: 'Career', title: 'Explain my career change in 30 seconds',
      text: "Help me write a 30-second answer to \"Why are you moving into data analytics?\". My background: {{bg}}. It should: show a real reason, connect my past experience to analyst skills, mention one project I have done ([[PROJECT]]) and end with what I want to do next. Give me 2 versions: a formal one and a conversational one.\n{{lang}}",
    },
  ];

  DA.tools = [
    {
      name: 'AI chat assistants', examples: 'Claude, ChatGPT, Gemini',
      use: 'Your tutor and pair-programmer: explain concepts, write and review SQL / Python, quiz you, critique your writing and charts.',
      watch: 'Can be confidently wrong. Never paste confidential or personal data. Check what your plan allows (file upload, running code).',
    },
    {
      name: 'AI inside your spreadsheet', examples: 'Copilot in Excel, Gemini in Google Sheets',
      use: 'Generate formulas, suggest pivots and clean columns without leaving the sheet.',
      watch: 'Availability depends on your licence. Always check the formula it writes before trusting the numbers.',
    },
    {
      name: 'Notebooks with AI help', examples: 'Google Colab, Jupyter + an AI assistant',
      use: 'Run Python in the browser, and ask for code, explanations and fixes next to your data.',
      watch: 'Do not upload sensitive data to a cloud notebook. Rerun the notebook from top to bottom before sharing it.',
    },
    {
      name: 'AI coding assistants', examples: 'GitHub Copilot, Cursor, Claude Code',
      use: 'Autocomplete and refactor code in your editor; good for repetitive pandas and plotting code.',
      watch: 'They can hide gaps in your understanding. Make sure you can explain each line before you commit it.',
    },
    {
      name: 'Document and research assistants', examples: 'NotebookLM, Perplexity',
      use: 'Ask questions about job ads, papers or documentation you upload, or research a topic with sources.',
      watch: 'Open the sources and verify. Summaries can miss caveats.',
    },
    {
      name: 'BI tools with AI features', examples: 'Power BI, Tableau, Looker Studio',
      use: 'Build dashboards; new AI features can suggest visuals, write measures and summarise insights.',
      watch: 'Features and plans change quickly. Learn the fundamentals (data model, measures) first.',
    },
  ];

  DA.aiRules = [
    ['Try first, then ask', 'Spend 10 minutes on it alone. Share your attempt and the error, not just the task.'],
    ['Ask for hints, not only answers', 'Say "don\'t give me the solution yet". You keep the learning and still get unstuck.'],
    ['Share structure, not data', 'Give table and column names and a few anonymised rows. Never customer, patient, student or company-confidential data.'],
    ['Verify everything that matters', 'Run the code. Compare row counts. Reconcile totals with an independent calculation.'],
    ['Ask for assumptions and risks', '"What are you assuming? What could be wrong with this?" is the cheapest quality check there is.'],
    ['Teach it back', 'Explain the lesson in your own words and let the AI find the gaps. If you cannot explain it, you cannot use it in an interview.'],
    ['Keep a log', 'Write down your prompts that worked and your mistakes. It becomes your personal playbook and your interview revision.'],
  ];
})();
