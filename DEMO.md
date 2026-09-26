# LearnBeacon: 2-minute demo script

Target length: 2:00, about 225 words of voiceover (about 1½ minutes of speaking, leaving time for clicks). Each **Say** block is about as long as its time slot. The two AI answers take 30–60 seconds each to stream, so cut the waiting in editing (see the tips at the end).

## Before you record

- [ ] Set `SERPAPI_KEY` and `GEMINI_API_KEY` in `backend/.env`, then start the server: `uvicorn main:app --reload`
- [ ] Rehearse the whole flow once, with the same clicks and questions. This fills the 30-minute SerpApi cache, so the recorded run loads fast and uses no extra credits. Record within 30 minutes of the rehearsal.
- [ ] Wait about a minute after the rehearsal before recording, so the Gemini free-tier per-minute limit resets.
- [ ] Check that every section shows the **SerpApi Live** badge, not **Mock Data**.
- [ ] Set the Dashboard **Mode** switch to **Auto**.
- [ ] Set the browser zoom to 110–125% so text is readable in the video, and close other tabs.

---

## 0:00–0:10 · The problem

**Show:** The Dashboard at http://127.0.0.1:8000.

**Say:**
> Lakhs of students in Maharashtra choose a college or a career every year, using information scattered across dozens of sites. LearnBeacon brings it together with live data from eight SerpApi engines.

## 0:10–0:40 · The AI Research Agent

**Do:** Click the first **Try asking** pill: _"I got 97 percentile in MHT-CET. Which Computer Engineering colleges in Pune can I target with fees under 2 lakh per year, and which scholarships can I apply for?"_

**Show:** The route label (AI agent), the live step list, then the answer table. Click one **View on map** chip at the end.

**Say:**
> A real student question: a percentile, a budget and scholarships. Our router spots the personal details and sends it to a Gemini agent. It picks its own tools, and its web, maps and news searches run through SerpApi's search-tools library. Every fact in the answer has a source link, and it ends with next steps.

## 0:40–0:48 · Quick search routing

**Do:** Go back to the Dashboard, type `COEP Pune` and press Enter.

**Say:**
> Short lookups skip the AI: one fast search, no LLM cost.

## 0:48–1:22 · Careers (career guidance by education)

**Do:**
1. Open **Careers**. Keep **12th Science (PCM)**, type `85%` in Score, and tap **Coding** and **Design**. The matching cards turn green.
2. Click **See jobs & videos** on **B.E./B.Tech Engineering** and show the live jobs with salaries and the videos.
3. Scroll up and click **Get my personalised guidance (AI)**. Show the **Checking live jobs** steps, then the answer table.

**Say:**
> Many students don't know what comes next after 10th, 12th or a diploma. On Careers, a student picks what they've completed and what they enjoy, and sees their options, with courses, entrance exams and careers. Each path shows live fresher jobs in Pune from Google Jobs, with salaries and apply links. One click gets personal AI guidance based on live job demand.

## 1:22–1:45 · Learn Hub

**Do:** Open **Learn Hub**. Click the **MHT-CET** news chip, play a video for a second, then scroll through **Study Books**, **Research Papers** and the trends chart.

**Say:**
> Learn Hub combines Google News, YouTube, Google Play Books, Google Scholar and Google Trends: exam news, prep videos, study books with prices, research papers with free PDFs, and exam interest over the year.

## 1:45–2:00 · Colleges, scholarships and close

**Do:** Open **Explore Colleges** for a second (the map), then **Scholarships** and click **MahaDBT**.

**Say:**
> Colleges on a map, and scholarships with official links. With no API key, every page falls back to built-in data, so it never breaks. LearnBeacon: admissions and career research that students can trust.

---

## If something goes wrong while recording

| Problem | What to do |
|---|---|
| "Gemini quota reached: …" | Wait a minute, then record that AI part again and cut it together in editing. |
| An AI answer is slow | Keep talking over the step list; the steps are part of the story. Trim the wait in editing. |
| A search takes 20+ seconds | SerpApi is sometimes slow on fresh searches. Rehearse first so the recorded run comes from the cache. |
| A section shows **Mock Data** | Check `SERPAPI_KEY` in `backend/.env` and restart the server. |
| A step shows a tool error | Leave it in: the agent recovering from a failed tool is a good thing to show. |
| The Careers AI answer doesn't start | Check `GEMINI_API_KEY`; without it the page shows a notice, and the options, jobs and videos still work. |
