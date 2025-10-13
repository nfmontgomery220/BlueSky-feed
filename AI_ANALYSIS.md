# AI Analysis System

## Overview

The AI analysis system uses GPT-4o-mini via Vercel AI Gateway to automatically categorize, score, and filter posts for quality and relevance.

## Analysis Pipeline

\`\`\`
Post → AI Analysis → Structured Output → Filtering Rules → Status Update
\`\`\`

### 1. AI Analysis

**Model**: GPT-4o-mini (via Vercel AI Gateway)

**Input**: Post text, author, metadata

**Output**: Structured JSON with:
- Topic classification
- Sentiment analysis
- Quality score
- Themes
- Actionability
- Time sensitivity

### 2. Filtering Rules

Based on quality score:
- **> 0.6**: Auto-approve
- **< 0.3**: Auto-reject
- **0.3-0.6**: Manual review

## Analysis Fields

### Topic Classification

**Field**: `topic` (string)

**Values**:
- `voter_registration` - How to register, deadlines, requirements
- `election_integrity` - Security, fraud prevention, audits
- `voting_rights` - Access, discrimination, legal issues
- `civic_education` - How government works, civic duty
- `campaign_info` - Candidates, platforms, debates
- `ballot_measures` - Propositions, referendums, initiatives
- `other` - Related but doesn't fit above categories

**Example**:
\`\`\`
Post: "Register to vote by October 15th!"
Topic: "voter_registration"
\`\`\`

---

### Sentiment Analysis

**Field**: `sentiment_score` (decimal -1.00 to 1.00)

**Scale**:
- `-1.00 to -0.50`: Very negative
- `-0.49 to -0.01`: Somewhat negative
- `0.00`: Neutral
- `0.01 to 0.49`: Somewhat positive
- `0.50 to 1.00`: Very positive

**Field**: `sentiment_label` (string)

**Values**:
- `encouraging` - Positive, motivating
- `concerned` - Worried, cautious
- `neutral` - Factual, balanced
- `critical` - Negative, critical

**Example**:
\`\`\`
Post: "Don't forget to vote! Your voice matters!"
Sentiment Score: 0.85
Sentiment Label: "encouraging"
\`\`\`

---

### Quality Score

**Field**: `quality_score` (decimal 0.00 to 1.00)

**Factors**:
- **Coherence** (0-0.3): Is the text well-written and clear?
- **Relevance** (0-0.3): Is it truly about civics/voting?
- **Credibility** (0-0.2): Does it cite sources? Avoid misinformation?
- **Actionability** (0-0.2): Does it provide useful information?

**Thresholds**:
- `0.00-0.29`: Low quality (spam, off-topic, incoherent)
- `0.30-0.59`: Medium quality (borderline, needs review)
- `0.60-1.00`: High quality (clear, relevant, credible)

**Example**:
\`\`\`
Post: "VOTE NOW!!! 🗳️🗳️🗳️ #vote #election"
Quality Score: 0.25 (low - lacks substance)

Post: "Early voting starts Monday at City Hall, 8am-5pm. Bring ID."
Quality Score: 0.85 (high - clear, actionable, credible)
\`\`\`

---

### Themes

**Field**: `themes` (array of strings)

**Common Themes**:
- `accessibility` - Disability access, language barriers
- `youth_engagement` - Young voters, student issues
- `misinformation` - False claims, fact-checking
- `deadlines` - Time-sensitive dates
- `mail_voting` - Absentee, postal voting
- `early_voting` - Early voting information
- `polling_places` - Where to vote
- `id_requirements` - Voter ID laws
- `registration` - How to register

**Example**:
\`\`\`
Post: "Accessible voting machines available at all polling locations"
Themes: ["accessibility", "polling_places"]
\`\`\`

---

### Actionability

**Field**: `is_actionable` (boolean)

**True if**:
- Contains call-to-action (register, vote, volunteer)
- Provides specific instructions
- Includes deadlines or locations

**False if**:
- Purely informational
- Opinion/commentary only
- No clear action for reader

**Example**:
\`\`\`
Post: "Register to vote at vote.gov before the deadline"
Actionable: true

Post: "I think everyone should vote"
Actionable: false
\`\`\`

---

### Time Sensitivity

**Field**: `time_sensitivity` (string)

**Values**:
- `urgent` - Today or tomorrow (election day, same-day deadline)
- `time_bound` - Specific date in near future (registration deadline)
- `evergreen` - No time constraint (general information)

**Example**:
\`\`\`
Post: "Election day is TODAY! Polls close at 8pm"
Time Sensitivity: "urgent"

Post: "Here's how the electoral college works"
Time Sensitivity: "evergreen"
\`\`\`

## AI Prompt

The system uses this prompt structure:

\`\`\`
You are analyzing a social media post about voting and civic engagement.

Post Text: "{text}"
Author: {author_did}
Created: {created_at}
Has Images: {has_images}
Has Video: {has_video}

Analyze this post and provide:

1. Topic: What is the primary topic?
   - voter_registration, election_integrity, voting_rights, 
     civic_education, campaign_info, ballot_measures, other

2. Sentiment: What is the emotional tone?
   - Score: -1.00 (very negative) to 1.00 (very positive)
   - Label: encouraging, concerned, neutral, critical

3. Quality: How high-quality is this post?
   - Score: 0.00 (spam/low) to 1.00 (excellent)
   - Consider: coherence, relevance, credibility, usefulness

4. Themes: What specific themes does it address? (array)
   - accessibility, youth_engagement, misinformation, deadlines,
     mail_voting, early_voting, polling_places, id_requirements, etc.

5. Actionability: Does it tell people what to do? (boolean)

6. Time Sensitivity: How time-sensitive is this?
   - urgent, time_bound, evergreen

Return as JSON.
\`\`\`

## Cost Analysis

### Per-Post Cost

**Model**: GPT-4o-mini
- Input: ~200 tokens (post + prompt)
- Output: ~100 tokens (structured response)
- Cost: ~$0.001-0.003 per post

### Volume Estimates

**100 posts/minute**:
- 6,000 posts/hour
- 144,000 posts/day
- Cost: $144-432/day

**Optimization Strategies**:
1. Batch processing (analyze multiple posts per request)
2. Cache common patterns
3. Skip analysis for obvious spam (pre-filter)
4. Use cheaper model for initial screening

## Filtering Logic

### Auto-Approve (quality_score > 0.6)

\`\`\`typescript
if (quality_score > 0.6) {
  status = 'approved'
  // Post immediately appears in feed
}
\`\`\`

**Rationale**: High-quality posts are safe to auto-approve

---

### Auto-Reject (quality_score < 0.3)

\`\`\`typescript
if (quality_score < 0.3) {
  status = 'rejected'
  // Post never appears in feed
}
\`\`\`

**Rationale**: Low-quality posts (spam, off-topic) are filtered out

---

### Manual Review (0.3 ≤ quality_score ≤ 0.6)

\`\`\`typescript
if (quality_score >= 0.3 && quality_score <= 0.6) {
  status = 'needs_review'
  // Admin reviews before appearing in feed
}
\`\`\`

**Rationale**: Borderline posts need human judgment

## Manual Review Process

### Review Queue

Admin sees posts with `status = 'needs_review'`:

**Display**:
- Post text
- Author
- AI analysis (topic, sentiment, quality, themes)
- Confidence scores

**Actions**:
- **Approve**: Post appears in feed
- **Reject**: Post is filtered out
- **Add notes**: Document reasoning

### Learning from Reviews

Track admin corrections to improve AI:

\`\`\`sql
SELECT 
  topic,
  AVG(quality_score) as avg_ai_score,
  COUNT(*) FILTER (WHERE reviewed_by IS NOT NULL) as reviewed,
  COUNT(*) FILTER (WHERE status = 'approved') as approved_rate
FROM posts
WHERE reviewed_by IS NOT NULL
GROUP BY topic;
\`\`\`

Use this data to:
- Adjust quality thresholds
- Improve prompts
- Identify problem areas

## Monitoring

### Analysis Metrics

Track in dashboard:
- Posts analyzed per hour
- Auto-approve rate
- Auto-reject rate
- Manual review queue size
- Average quality score by topic
- Sentiment distribution

### Quality Assurance

Periodically review:
- Random sample of auto-approved posts
- Random sample of auto-rejected posts
- All manually reviewed posts

Adjust thresholds if:
- Too many false positives (good posts rejected)
- Too many false negatives (bad posts approved)
- Review queue too large

## Configuration

### Adjusting Thresholds

Edit `lib/ai-analyzer.ts`:

\`\`\`typescript
// Current thresholds
const AUTO_APPROVE_THRESHOLD = 0.6
const AUTO_REJECT_THRESHOLD = 0.3

// Adjust as needed based on review data
\`\`\`

### Customizing Prompts

Edit `lib/ai-analyzer.ts` to:
- Add new topics
- Change sentiment labels
- Adjust quality criteria
- Add new themes

## Troubleshooting

**AI returning low-quality scores for good posts?**
- Review prompt for clarity
- Check if topic definitions are too narrow
- Adjust quality thresholds

**Too many posts in review queue?**
- Lower auto-approve threshold (e.g., 0.5)
- Raise auto-reject threshold (e.g., 0.4)
- Batch review similar posts

**High AI costs?**
- Implement pre-filtering (skip obvious spam)
- Batch process posts
- Use caching for similar posts
- Consider cheaper model for initial screening
