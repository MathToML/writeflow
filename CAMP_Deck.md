---
marp: true
theme: default
paginate: true
backgroundColor: #fafafa
style: |
  section {
    font-family: 'Inter', 'Pretendard', sans-serif;
  }
  h1 { color: #1e293b; }
  h2 { color: #334155; }
  blockquote { border-left: 4px solid #3b82f6; padding-left: 1em; color: #64748b; }
---

<!-- Slide 1: Title -->

# CAMP

## Calm Productivity

*Don't manage your tasks. Let your tasks manage themselves.*

---

<!-- Slide 2: The Problem -->

# The Problem

We're drowning in productivity tools.

- 20 tasks on the to-do list. Which one do I do **now**?
- Calendar, reminders, notes — scattered everywhere
- More tools = more overhead = **more stress**

> "I downloaded 3 apps to be productive.
> Now I spend 30 minutes a day just organizing them."

The irony: **productivity tools are making us less productive.**

---

<!-- Slide 3: Our Answer -->

# Our Answer: Just Dump It

CAMP has one input: **say whatever's on your mind.**

```
"Meeting with Sarah Friday 2pm,
 need to buy groceries,
 oh and I finished the report"
```

That's it. No categorizing. No picking dates from a calendar.
No switching between apps.

**AI does the rest.**

---

<!-- Slide 4: One Thing To Do -->

# OTTD — One Thing To Do

Instead of showing you 20 tasks, CAMP recommends **just one.**

The recommendation considers:

| Signal | Example |
|--------|---------|
| **Time** | It's 9am on Monday — focus work time |
| **Location** | You're near the grocery store |
| **Calendar** | Meeting in 30 min — pick something quick |
| **Energy** | You've been working 4 hours straight |
| **Mood** | You seem stressed today |

**You never feel overwhelmed. You always know what to do next.**

---

<!-- Slide 5: Wellness-First -->

# Not Just Productive. **Healthy.**

CAMP doesn't just optimize output. It protects you.

Sometimes the best recommendation is:

> *"You've been going hard all morning.*
> *Take a break. Maybe grab a juice — got any at home?"*

> *"It's 11pm. That task can wait.*
> *How about winding down with something light?"*

**The AI has intent: your wellness comes first.**

Tasks, events, expenses — and also rest, hydration, breaks.

---

<!-- Slide 6: Scenarios -->

# Scenarios

**Morning rush**
You dump: *"dentist at 3, pick up package, finish slides, call mom"*
CAMP: Creates 2 tasks + 1 event. Recommends *"Finish slides first — you have a clear block until noon."*

**After-hours grind**
It's 9pm, you've completed 6 tasks today.
CAMP: *"Great day! You've done enough. Rest — tomorrow's a light day."*

**Walking outside**
GPS detects you're near downtown.
CAMP: *"You're near the post office — want to pick up that package now?"*

---

<!-- Slide 7: Vision — Wearables -->

# Vision: Context-Aware AI

**Phase 1 (Now):** Time, calendar, location, task history
**Phase 2:** Wearable integration (Apple Watch, Fitbit, etc.)

With wearable data:
- **Heart rate** — detect stress, suggest breaks
- **Sleep quality** — adjust morning task difficulty
- **Activity level** — low energy? lighter tasks first

The more context AI has, the more **personalized and humane**
the recommendations become.

> CAMP becomes a personal chief of staff
> who actually cares about you.

---

<!-- Slide 8: How It Works -->

# Architecture

```
User Input (text / voice / image)
        │
        ▼
   ┌─────────┐     ┌──────────────────┐
   │  Dump    │────▶│  Gemini 2.0 AI   │
   │  Store   │     │  (Function Call)  │
   └─────────┘     └──────┬───────────┘
                          │
              ┌───────────┼───────────┐
              ▼           ▼           ▼
          Create       Create      Create
          Task         Event       Record
              │           │           │
              ▼           ▼           ▼
         ┌────────────────────────────────┐
         │      Supabase (PostgreSQL)     │
         └────────────────────────────────┘
                          │
                          ▼
                  OTTD Recommendation
            (context-aware, wellness-first)
```

---

<!-- Slide 9: Tech Stack -->

# Under the Hood

| Layer | Tech |
|-------|------|
| **Frontend** | Next.js (App Router) on Vercel |
| **AI Engine** | Gemini 2.0 Flash — multimodal, function calling |
| **Database** | Supabase (PostgreSQL + Realtime + Auth + RLS) |
| **Background Jobs** | Inngest (delayed jobs, cron, heartbeat) |
| **Recommendation** | Context scoring: time + location + energy + calendar |

**Key AI Behaviors:**
- **Classify** — one dump becomes multiple structured items
- **Respond** — conversational, 1-2 sentences, never overwhelming
- **Nudge** — auto-proceed after 2min silence (server-side)
- **Heartbeat** — daily summary, proactive habit suggestions

---

<!-- Slide 10: Closing -->

# CAMP

**Calm Productivity.**

Stop managing tasks.
Start living.

*— Demo —*

