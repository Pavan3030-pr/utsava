# PromptWars submission kit

## LinkedIn post (edit the bracketed parts)

🎉 Built **Utsava (उत्सव)** for PromptWars Virtual — an AI planner for weddings, birthdays & community events.

Type one sentence → Gemini streams a full budget, timeline, vendor playbook & themes live, in 9 Indian languages. Then ask the Copilot "cut 15%" and the whole plan rewrites itself while keeping your ticked tasks.

🧠 Engineering choices that mattered
• Schema-first (Zod) → structured Gemini output → streamed to the UI
• LLMs can't add, so a deterministic verifier reconciles every rupee
• Prompt-injection-safe prompts, rate limiting, CSP, input validation
• Stateless, containerised, deployable on Cloud Run
• 40+ unit tests + accessible UI (ARIA tabs, live regions, reduced motion)

📉 Before → after: removed a hard-coded demo fallback and dead login forms; added real streaming, verification and a revising copilot.

🔗 Live: [DEPLOY URL]   💻 Code: [GITHUB URL]
#PromptWars #BuildWithAI #Gemini #GoogleForDevelopers #Hack2skill

## Demo script (60 seconds)
1. Landing → paste "200-guest Telugu wedding in Hyderabad, 25 lakhs" → plan streams in.
2. Budget tab → show the ✓ Verified badge and per-guest cost.
3. Checklist → tick a few tasks.
4. Copilot → "Cut the total budget by 15%" → show budget before → after, ticks preserved.
5. Ideas → switch language to Hindi/Telugu on a new plan; share invite on WhatsApp.
6. Save as PDF + Add to calendar.
