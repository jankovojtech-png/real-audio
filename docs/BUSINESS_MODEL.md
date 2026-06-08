# Real Audio — Business Model Analysis

> Role: SaaS Founder + Product Strategist

---

## Unit Economics (current state)

### Revenue per user

| Metric | Value | Notes |
|--------|-------|-------|
| Monthly price (premium) | $4.99 | Target |
| Annual price | $39/year | 35% discount |
| Blended ARPU (70% monthly / 30% annual) | ~$4.20/month | Assumes 30% take annual |
| Free-to-paid conversion (target) | 5–7% | Industry: 2–8% for audio apps |
| LTV (at 5% monthly churn) | $84 | $4.20 ÷ 0.05 |

### Cost per user

| Cost item | Monthly per MAU | Notes |
|-----------|----------------|-------|
| Server compute (Render) | $0.02–0.05 | 1 core per ~50 concurrent users |
| Upstream bandwidth to Locus Sonus | $0.00 | Free (Locus Sonus pays this) |
| Downstream bandwidth (128 kbps per listener) | ~$0.01/hour | At 1h/day avg session: $0.30/user/month |
| Database (Neon free tier) | $0.00 | Free up to 10GB |
| Auth (Clerk free tier) | $0.00 | Free up to 10K MAU |
| Email (Resend free tier) | $0.00 | Free up to 3K emails/month |
| Error tracking (Sentry) | $0.02 | $26/month / 1,000 users |
| Analytics (Plausible) | $0.01 | $9/month flat |
| **Total COGS per MAU** | **~$0.40/month** | At 5,000 MAU |

### Gross margin

| Users | Revenue | COGS | Gross Margin |
|-------|---------|------|-------------|
| 500 paying / 8K MAU | $2,100/mo | $100/mo | **95%** |
| 1,200 paying / 20K MAU | $5,040/mo | $300/mo | **94%** |
| 5,000 paying / 80K MAU | $21,000/mo | $1,500/mo | **93%** |

Software margins. Real Audio has near-identical economics to any SaaS business, assuming the content (Locus Sonus) remains free. If the company ever needs to pay for content (proprietary mics, artist licensing), margins compress to 60–75%.

---

## Business Model Options (evaluated)

### Option A: Freemium SaaS (recommended)
**Description:** Free tier with core streaming. Premium at $4.99/month / $39/year unlocks advanced features.

**Pros:** Low friction entry, organic word-of-mouth, industry-standard model, predictable MRR
**Cons:** Need ~2,000 MAU before meaningful revenue; requires retention features first
**LTV:CAC target:** >5:1 (achievable at <$15 CAC via organic)
**Verdict:** ✅ Primary model

---

### Option B: One-time purchase (wrong model)
**Description:** $14.99 permanent unlock. No subscriptions.

**Pros:** Zero subscription fatigue, better AppStore conversion in some segments
**Cons:** No recurring revenue, no LTV compounding, forces constant acquisition to grow; doesn't fit live streaming (the content is ongoing)
**Verdict:** ❌ Wrong for this product

---

### Option C: Patronage / tip-based (good supplement)
**Description:** "Buy me a coffee" style optional support. Pay what you feel.

**Pros:** Aligns with indie/art community values; zero friction; signals authenticity
**Cons:** Unpredictable, low ceiling (~$200–500/month max)
**Verdict:** ✅ Launch immediately as supplementary revenue, not primary

---

### Option D: B2B API / white-label (strong medium-term play)
**Description:** Charge companies ($299–999/month) to embed Real Audio streams in their products — wellness apps, hotel experiences, co-working spaces.

**Pros:** High ARPU per customer, low churn, no consumer growth needed
**Cons:** Requires sales, documentation, SLA, and legal clarity on Locus Sonus commercial use
**LTV:** $299/month × 24 months = $7,176 per customer. 10 customers = $35K ARR.
**Verdict:** ✅ Build this after 5–10 inbound enquiries (don't build before demand signals)

---

### Option E: Advertising (never)
**Description:** Display or audio ads within the ambient experience.

**Verdict:** ❌ Structurally incompatible. Ambient audio is about uninterrupted presence. A single ad would destroy the product's core promise and generate user revolt. The economics don't justify the damage ($0.50–2.00 CPM, needing millions of impressions to matter).

---

### Option F: Data / insights licensing (long-term, ethical concern)
**Description:** Aggregate anonymised listening data (which locations, what times, correlations with productivity) and sell insights to researchers, wellness brands, or employers.

**Pros:** High-margin, B2B, recurring
**Cons:** Requires explicit user consent, GDPR compliance, and volume of data that doesn't exist for 2+ years. Users would find this creepy if not handled transparently.
**Verdict:** ⚠️ Possible in Year 3+ with full consent architecture. Not now.

---

## Revenue Model Recommendation (phased)

### Now (Week 1–4): Zero revenue, build trust
- Deploy and fix the product
- Add tip jar ($0.00 engineering cost)
- Measure retention before charging

### Month 1–2: Validate the product
- Add PWA, sleep timer, volume, share
- Measure: Does D7 retention exceed 20%? If yes, proceed. If no, fix the product.

### Month 2–3: First revenue
- AppSumo lifetime deal ($49 one-time, 2-week campaign)
- Expected: 300–800 sales = $14,700–$39,200 one-time cash
- Use this to fund 4–6 months of development

### Month 3–5: Subscription launch
- Build auth (Clerk) + Stripe + favourites + listening history
- Launch premium tier at $4.99/month
- Target: 100 paying users in first 30 days post-launch

### Month 6–12: B2B exploration
- If 3+ companies contact you asking to embed the streams: build the B2B API
- If not: focus entirely on consumer growth

---

## The Fundamental Business Question

**Is Real Audio a media company or a software company?**

This question determines everything:

| | Media company | Software company |
|-|--------------|-----------------|
| Moat | Exclusive content | Network effects / data / tech |
| Value driver | Content library | Product + user base |
| Margin | 40–60% | 80–95% |
| Acquirer | Spotify, Apple, Calm | Any wellness/tech company |
| Funding path | Content deals first | Growth metrics first |
| Risk | Content availability | Competition |

**Current state:** Real Audio is a software company with a media company's content dependency. The strategic imperative is to either (a) accept this and build a moat in the software layer (AI, blend, social features) or (b) embrace the media company identity and start building exclusive content relationships.

The worst outcome: staying in the middle — not owning content, not building defensible software features — and being cloneable by anyone with a week of engineering time.
