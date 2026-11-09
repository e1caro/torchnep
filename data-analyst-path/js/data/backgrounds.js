/* Background profiles.
 *
 * Everything the site personalises comes from here: the "your edge" and "gaps"
 * cards, the analogies shown inside lessons, the portfolio project ideas, the
 * resume translations and the sentence that is injected into every AI prompt.
 * To add a background, add one object to the list below; nothing else needs to change.
 *
 * analogies keys (all optional, used by lessons through their `concept` field):
 *   aggregate, join, spread, causation, outlier, sample
 */
(function () {
  'use strict';
  var DA = (window.DA = window.DA || {});

  DA.backgrounds = [
    {
      id: 'science',
      icon: '🔬',
      name: 'Science & research',
      blurb: 'Physics, chemistry, biology, materials, academia, PhD / postdoc.',
      persona: 'a scientist / researcher (experiments, simulations, papers)',
      dataset: 'lab',
      strengths: [
        'You already think in hypotheses, controls and uncertainty, which is what most beginners lack.',
        'Comfortable with maths, units and plots; you spot results that are too good to be true.',
        'You have probably used Python, MATLAB, R or Origin, so code is not a wall for you.',
      ],
      gaps: [
        'SQL and relational databases (research data usually lives in files, not tables).',
        'Business framing: stakeholders want a decision in one slide, not a full derivation.',
        'Speed: analysts ship a good-enough answer today, not a perfect one in a month.',
      ],
      projects: [
        'Take a public dataset in your field and answer one question a manager could act on, in a 1-page brief.',
        'Re-analyse the data of one of your own papers with SQL + pandas and publish the cleaned data and notebook.',
        'Build a dashboard comparing experiments / simulation runs (parameters vs. outcome), with a recommendation.',
      ],
      resume: [
        'Designed experiments and analysed 10k+ measurements; cut noise by 30% through better calibration → "Designed and analysed controlled tests; reduced measurement error by 30%".',
        'Wrote Python pipelines to process simulation output → "Built automated data pipelines that turned raw output into reports".',
        'Presented results at conferences → "Communicated technical findings to expert and non-expert audiences".',
      ],
      analogies: {
        aggregate: 'GROUP BY is averaging replicate measurements per condition: one row per condition instead of one row per run.',
        join: 'A JOIN is attaching the sample metadata (batch, operator, temperature) to every measurement using the sample ID.',
        spread: 'Standard deviation is your error bar. Always look at it before you trust a mean.',
        causation: 'An experiment with a control group gives causation. A dashboard of past data is an observational study: be careful with "because".',
        outlier: 'An outlier is a point you must explain (detector glitch? real physics?) before you delete it. Document it like a lab notebook entry.',
        sample: 'Sampling is the same as choosing n for an experiment: more samples shrink the confidence interval roughly with 1/√n.',
      },
    },
    {
      id: 'engineering',
      icon: '⚙️',
      name: 'Engineering & manufacturing',
      blurb: 'Mechanical, electrical, civil, industrial, quality, process engineering.',
      persona: 'an engineer (design, process, quality, sensors and tolerances)',
      dataset: 'lab',
      strengths: [
        'Process thinking: inputs, outputs, bottlenecks, tolerances and failure modes.',
        'Used to sensors, logs, units and "garbage in, garbage out".',
        'You know how to document and standardise a procedure, which makes analyses reproducible.',
      ],
      gaps: [
        'SQL for pulling data without waiting for IT.',
        'Statistics beyond control charts: hypothesis tests, regression, A/B comparisons.',
        'Telling the story to non-engineers (cost, risk, time) instead of specs.',
      ],
      projects: [
        'Analyse machine / sensor data to find what predicts defects and recommend a process change.',
        'Build a quality dashboard: yield, defect rate by line and shift, with control limits.',
        'Cost-vs-reliability analysis of a public dataset (e.g. failure times) with a recommendation.',
      ],
      resume: [
        'Reduced scrap by tracking defects per line → "Analysed production data to cut scrap by X%, saving €Y per year".',
        'Maintained Excel/VBA tools → "Automated recurring reports, saving N hours per week".',
        'Root-cause investigations → "Led root-cause analysis using data from sensors and inspection logs".',
      ],
      analogies: {
        aggregate: 'GROUP BY is a pivot of defects by line and shift: one number per cell instead of thousands of inspection rows.',
        join: 'A JOIN links the sensor log to the work order through the batch ID so you can ask "which supplier lot was running?"',
        spread: 'Spread is process variation. Two lines with the same average yield can have very different capability.',
        causation: 'Defects rose after the new supplier started, but so did production volume: you need a comparison, not just a timeline.',
        outlier: 'An outlier is either a sensor fault or the one failure you care about. Check the equipment log before deleting it.',
        sample: 'Sampling is your inspection plan: you check n parts to say something about the whole lot.',
      },
    },
    {
      id: 'finance',
      icon: '💼',
      name: 'Business, finance & accounting',
      blurb: 'Accounting, audit, FP&A, banking, consulting, general business.',
      persona: 'a finance / business professional (accounting, budgets, forecasts, spreadsheets)',
      dataset: 'retail',
      strengths: [
        'Excel is already your second language, and pivots and lookups are your daily tools.',
        'You understand revenue, margin, cost and what a KPI is, so you know why the numbers matter.',
        'Used to reconciling numbers, which is exactly the habit that stops bad analyses.',
      ],
      gaps: [
        'SQL and Python for data that does not fit in a spreadsheet.',
        'Statistics for uncertainty (forecast intervals, tests) rather than point estimates.',
        'Data visualisation beyond default Excel charts.',
      ],
      projects: [
        'Profitability analysis of a public retail or SaaS dataset: which segments make money, with a recommendation.',
        'Budget vs. actual variance dashboard in Power BI or Tableau with drill-downs.',
        'Customer churn / cohort analysis in SQL + Python with a clear "what should we do?" slide.',
      ],
      resume: [
        'Built monthly financial models → "Built and maintained models forecasting revenue within 3% accuracy".',
        'Reconciled accounts → "Validated 100k+ transactions; found and fixed discrepancies worth €X".',
        'Presented to management → "Translated financial data into recommendations for senior leadership".',
      ],
      analogies: {
        aggregate: 'GROUP BY is a pivot table or SUMIFS, written as code: totals per month, per product, per region.',
        join: 'A JOIN is XLOOKUP or VLOOKUP, but for whole tables and without dragging formulas down 100k rows.',
        spread: 'Spread is volatility. Two products with the same average monthly sales can carry very different risk.',
        causation: 'Revenue rose after the discount, but it was also December. Seasonality is the classic confounder in finance data.',
        outlier: 'An outlier is the one-off invoice or the data-entry error with an extra zero. Reconcile it before it distorts your average.',
        sample: 'Sampling is audit sampling: you test n transactions to conclude about the whole ledger, with a stated confidence.',
      },
    },
    {
      id: 'marketing',
      icon: '📣',
      name: 'Marketing, sales & customer success',
      blurb: 'Marketing, growth, e-commerce, sales, account management, support.',
      persona: 'a marketing / sales professional (campaigns, funnels, customers)',
      dataset: 'retail',
      strengths: [
        'You know the business questions: who buys, why they leave, which campaign worked.',
        'Familiar with funnels, conversion, CAC, retention, and tools like GA4, HubSpot, Meta Ads.',
        'You are used to presenting results and persuading stakeholders.',
      ],
      gaps: [
        'Rigour: significance, sample size and not over-reading small differences.',
        'SQL to query the warehouse yourself.',
        'Cleaning messy exports from multiple platforms.',
      ],
      projects: [
        'Campaign performance analysis (public marketing dataset): which channel gives the best return, with a budget recommendation.',
        'Funnel and cohort retention analysis in SQL, ending in a "where do we lose customers?" story.',
        'A/B test analysis with effect size, confidence interval and a clear ship / don\'t-ship call.',
      ],
      resume: [
        'Ran email campaigns → "Analysed campaign data of 200k sends; lifted click rate by 18% through segmentation".',
        'Reported weekly KPIs → "Built a weekly KPI dashboard used by the leadership team".',
        'Tested subject lines → "Designed and analysed A/B tests that increased conversion by X%".',
      ],
      analogies: {
        aggregate: 'GROUP BY is a campaign report: conversions and spend per channel instead of one row per click.',
        join: 'A JOIN connects the CRM contact with their orders so you can see lifetime value per acquisition channel.',
        spread: 'Spread tells you whether the "average customer" really exists, or whether a few big spenders carry the result.',
        causation: 'Customers who got the email bought more, but they were also your most engaged customers. Only a randomised test shows the email caused it.',
        outlier: 'An outlier is the one whale customer or the bot traffic spike. Decide whether to keep it before reporting averages.',
        sample: 'Sampling is how big your A/B test has to be before a 2% lift is real and not noise.',
      },
    },
    {
      id: 'health',
      icon: '🩺',
      name: 'Healthcare & life sciences',
      blurb: 'Nursing, medicine, pharmacy, public health, biotech, clinical research.',
      persona: 'a healthcare / life-sciences professional (patients, outcomes, clinical data)',
      dataset: 'lab',
      strengths: [
        'You understand clinical context, which makes your questions better than a generic analyst\'s.',
        'Familiar with evidence, bias, confounders and why correlation is not treatment effect.',
        'Trained in privacy and ethics, which is a real advantage in analytics.',
      ],
      gaps: [
        'SQL and Python for working with large health records.',
        'Modern visualisation / BI tools.',
        'Moving from "clinical report" to concise, decision-focused communication.',
      ],
      projects: [
        'Analyse a public health dataset (e.g. hospital readmissions or WHO indicators) and recommend where to intervene.',
        'Patient-flow dashboard: waiting times and bed occupancy by department and weekday.',
        'Outcome comparison between two treatment groups with confidence intervals and an honest limitations section.',
      ],
      resume: [
        'Tracked patient outcomes → "Analysed outcome data for 1,000+ patients to inform care protocols".',
        'Audit and quality improvement → "Led a quality-improvement audit; reduced X by Y%".',
        'Handled sensitive data → "Managed confidential patient data in line with GDPR / HIPAA".',
      ],
      analogies: {
        aggregate: 'GROUP BY is turning individual patient rows into one row per ward, per month or per treatment group.',
        join: 'A JOIN links a patient to their visits and lab results through the patient ID, as in any EHR.',
        spread: 'Spread is patient variability. The mean response to a drug hides the patients who do not respond.',
        causation: 'Observational data is full of confounding (sicker patients get the stronger drug). Randomised trials exist because of it.',
        outlier: 'An outlier may be a data-entry error (heart rate 250) or the patient you most need to understand. Check the record.',
        sample: 'Sampling is trial size: how many patients you need to detect a real effect, and how wide the interval is when you have fewer.',
      },
    },
    {
      id: 'sport',
      icon: '🏋️',
      name: 'Sports, fitness & coaching',
      blurb: 'Coaching, personal training, sport science, performance, physiotherapy.',
      persona: 'a sports / fitness professional (training load, performance, athletes)',
      dataset: 'lab',
      strengths: [
        'You know what matters for performance and recovery, so you ask better questions.',
        'Used to tracking metrics (load, heart rate, power, weight) over time.',
        'You explain data to non-experts (athletes, clients) every day.',
      ],
      gaps: [
        'Formal statistics: separating real progress from normal day-to-day variation.',
        'SQL and Python to handle data from many athletes and devices.',
        'Dashboards that are readable by coaches in 30 seconds.',
      ],
      projects: [
        'Training-load vs. performance analysis from wearable or public sport data, with a coaching recommendation.',
        'Athlete monitoring dashboard: weekly load, readiness and injury flags.',
        'Compare two training programmes (like the SQL Lab study dataset) with effect sizes and caveats.',
      ],
      resume: [
        'Programmed training for 50+ athletes → "Used performance data to personalise programmes; improved target metrics by X%".',
        'Tracked progress in spreadsheets → "Built tracking tools that monitored 50+ clients across 10 metrics".',
        'Communicated with clients → "Explained data-driven plans to non-technical audiences".',
      ],
      analogies: {
        aggregate: 'GROUP BY is the weekly total training load per athlete instead of one row per session.',
        join: 'A JOIN attaches the athlete profile (age, position, injury history) to every training session.',
        spread: 'Spread is day-to-day variation. A 1 kg change in the scale may be noise, a 5 kg change is not.',
        causation: 'The athletes who trained more improved more, but they were also the most motivated. Compare like with like.',
        outlier: 'An outlier is the heart-rate strap that dropped out mid-run. Check the device before blaming the athlete.',
        sample: 'Sampling is judging an athlete on 3 tests vs. 30: more tests give a tighter estimate of their true level.',
      },
    },
    {
      id: 'education',
      icon: '🎓',
      name: 'Teaching & education',
      blurb: 'Teachers, trainers, educational researchers, school administration.',
      persona: 'a teacher / education professional (students, grades, surveys, outcomes)',
      dataset: 'lab',
      strengths: [
        'You explain complex ideas simply, which is the most underrated analyst skill.',
        'You have real data experience: grades, attendance, surveys, progress over time.',
        'Used to differentiating between groups, which is segmentation.',
      ],
      gaps: [
        'Technical tools: SQL, Python and BI software.',
        'Statistics vocabulary (you already use the ideas intuitively).',
        'Business context and the language of ROI.',
      ],
      projects: [
        'Analyse a public education dataset (e.g. PISA or school performance) and recommend where funding helps most.',
        'Student-retention dashboard: attendance, grades and early-warning flags.',
        'Survey analysis combining numbers and open-text answers (use AI to categorise the text).',
      ],
      resume: [
        'Tracked class performance → "Analysed assessment data of 150+ students and adapted teaching, raising pass rates by X%".',
        'Ran surveys → "Designed and analysed surveys with N responses; presented to school leadership".',
        'Trained colleagues → "Trained a team of 20 on new tools and processes".',
      ],
      analogies: {
        aggregate: 'GROUP BY is class averages: one row per class or term instead of one row per student per test.',
        join: 'A JOIN connects the student list with the grade book through the student ID.',
        spread: 'Two classes with the same average can be very different: one uniform, one split into strugglers and stars.',
        causation: 'Students in the tutoring programme improved more, but they volunteered. Motivation may explain it, not the tutoring.',
        outlier: 'An outlier is the student with a 0 because of an absence, not ability. Know why before you drop or keep it.',
        sample: 'Sampling is judging a school on a 30-student class: small groups bounce around a lot from year to year.',
      },
    },
    {
      id: 'software',
      icon: '💻',
      name: 'Software & IT',
      blurb: 'Developers, QA, DevOps, IT support, sysadmins.',
      persona: 'a software developer / IT professional (code, logs, systems)',
      dataset: 'retail',
      strengths: [
        'You can already code, use Git, read documentation and debug, so you will learn tools faster than most.',
        'Used to logs, APIs and structured data.',
        'You can automate your analyses and make them reproducible.',
      ],
      gaps: [
        'Statistics and experimental thinking (code is deterministic, data is not).',
        'Business questions: analysts answer "should we?", engineers answer "how?".',
        'Communicating findings without jargon.',
      ],
      projects: [
        'Product-analytics project: event logs → funnel → retention, ending in a product recommendation.',
        'Analyse an open-source repo\'s issues and commits (GitHub API) and report what slows contributors down.',
        'A/B test pipeline with a reusable notebook and a clear statistical write-up.',
      ],
      resume: [
        'Built backend features → "Used event data to prioritise features; increased adoption by X%".',
        'Monitored systems → "Built dashboards tracking latency and errors for N services".',
        'Wrote automation scripts → "Automated reporting pipelines saving N hours per week".',
      ],
      analogies: {
        aggregate: 'GROUP BY is a reduce / group-by over a list of events: one summary row per key.',
        join: 'A JOIN is a foreign-key lookup between tables: the same as joining users and events on user_id.',
        spread: 'Spread is p50 vs p99 latency. The average hides the tail your users actually feel.',
        causation: 'Errors rose after the deploy, and so did traffic. Without a comparison group, you cannot blame the deploy.',
        outlier: 'An outlier is the bot or the retry storm in your logs. Filter it with a rule you can explain.',
        sample: 'Sampling is a canary release: you test on a small slice of users to infer what happens to everyone.',
      },
    },
    {
      id: 'operations',
      icon: '📦',
      name: 'Operations, logistics & retail',
      blurb: 'Supply chain, warehouse, retail, hospitality, project management, admin.',
      persona: 'an operations / retail professional (stock, orders, schedules, customers)',
      dataset: 'retail',
      strengths: [
        'You know where the real-world problems are: stock-outs, delays, queues, costs.',
        'Used to KPIs, targets and weekly reporting in Excel.',
        'You understand how data is created (a scan, a ticket, a delivery note), so you can sense when it is wrong.',
      ],
      gaps: [
        'SQL and Python to move beyond manual spreadsheet reports.',
        'Statistics for forecasting and demand variability.',
        'Presenting insight, not just numbers.',
      ],
      projects: [
        'Demand and stock-out analysis of a public retail dataset with a re-order recommendation.',
        'Delivery performance dashboard: on-time rate by carrier, region and weekday.',
        'Staffing analysis: orders per hour vs. staff, with a recommended schedule.',
      ],
      resume: [
        'Managed inventory → "Used sales data to optimise stock levels; reduced stock-outs by X%".',
        'Produced weekly reports → "Automated weekly KPI reports for 5 sites".',
        'Improved a process → "Analysed delivery times and cut average lead time by N days".',
      ],
      analogies: {
        aggregate: 'GROUP BY is the weekly report: orders, units or delays per store, per product, per carrier.',
        join: 'A JOIN is matching the order list to the product list and the supplier list through shared IDs.',
        spread: 'Spread is demand variability. It decides how much safety stock you need, more than the average does.',
        causation: 'Sales jumped the week you moved the product to the front, but it was also payday week. Compare similar stores or periods.',
        outlier: 'An outlier is the Black Friday spike or the scanner error. Treat promotions and errors differently.',
        sample: 'Sampling is a stock count: you check n bins and infer the accuracy of the entire warehouse.',
      },
    },
    {
      id: 'humanities',
      icon: '📚',
      name: 'Humanities, law & social science',
      blurb: 'Social sciences, psychology, journalism, law, policy, languages, arts.',
      persona: 'a humanities / social-science professional (text, interviews, surveys, argument)',
      dataset: 'retail',
      strengths: [
        'Strong with text, context and argument, so you will shine with survey comments, reviews and reports.',
        'You are used to bias and framing, and ask who collected the data and why.',
        'You write clearly, which many technical analysts do not.',
      ],
      gaps: [
        'Quantitative tools: SQL, Python and statistics.',
        'Comfort with large tabular data.',
        'Proof of skills: a portfolio of numeric projects.',
      ],
      projects: [
        'Analyse a public survey (e.g. European Social Survey) and write a short evidence-based policy brief.',
        'Text-analysis project: classify thousands of reviews with an AI model and quantify the themes.',
        'A data-journalism style piece with 3 charts and a methods note.',
      ],
      resume: [
        'Conducted research → "Designed surveys and analysed N responses to inform policy recommendations".',
        'Wrote reports → "Synthesised complex evidence into briefs for decision-makers".',
        'Managed sources → "Verified and cross-checked data sources for accuracy".',
      ],
      analogies: {
        aggregate: 'GROUP BY is coding interviews into themes and counting them: one row per theme instead of one per quote.',
        join: 'A JOIN is linking a respondent\'s survey answers to their demographic record through the respondent ID.',
        spread: 'Spread is disagreement. A mean opinion of 3/5 can be everyone neutral or half loving and half hating it.',
        causation: 'This is your home turf: confounders, selection bias and "who answered?" are the core of social science.',
        outlier: 'An outlier is the respondent who clicked the first option on every question. Decide on a quality rule and document it.',
        sample: 'Sampling is who is in your survey. A big but biased sample is worse than a small, representative one.',
      },
    },
    {
      id: 'custom',
      icon: '✏️',
      name: 'Something else',
      blurb: 'Describe your background in your own words. The AI prompts will use it.',
      persona: '',
      dataset: 'retail',
      custom: true,
      strengths: [
        'Domain knowledge is your biggest asset: you know which questions matter in your field.',
        'Any job that involved reports, numbers, deadlines or customers has given you transferable skills.',
        'You are a career changer, and hiring managers value people who bring a different perspective.',
      ],
      gaps: [
        'Technical tools: spreadsheets → SQL → Python.',
        'Statistics vocabulary and judgement.',
        'A portfolio that proves the skills.',
      ],
      projects: [
        'Choose a public dataset from your own field and answer one question a decision-maker would care about.',
        'Rebuild a report you used to make by hand, now with SQL / Python and a dashboard.',
        'Write a 1-page case study with: question, data, method, findings, recommendation, limits.',
      ],
      resume: [
        'Describe results with numbers: "reduced X by Y%", "handled N cases per week".',
        'Describe tools: spreadsheets, systems, reports you used.',
        'Describe communication: who you presented to and what changed afterwards.',
      ],
      analogies: {},
    },
  ];

  DA.conceptLabels = {
    aggregate: 'Aggregation (GROUP BY)',
    join: 'Joining tables',
    spread: 'Spread and variation',
    causation: 'Correlation vs. causation',
    outlier: 'Outliers',
    sample: 'Sampling',
  };
})();
