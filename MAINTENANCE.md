# Maintenance Guide

## Daily Tasks

### Monitor Dashboard

Check admin dashboard daily:
- **Stats**: Verify posts are being collected
- **Charts**: Look for unusual patterns
- **Review Queue**: Process pending posts

**Red Flags**:
- No posts collected in last hour
- Sudden spike in filtered posts
- Review queue growing rapidly

---

### Review Queue

Process posts needing manual review:

1. Log in to admin dashboard
2. Go to "Review" tab
3. For each post:
   - Read post content
   - Check AI analysis
   - Approve or reject
   - Add notes if needed

**Target**: Keep queue under 50 posts

---

## Weekly Tasks

### Database Cleanup

Clean up old data to control storage:

1. Go to "Database" tab in admin dashboard
2. Check storage metrics
3. Delete old posts (default: 30 days)
4. Delete old historical stats (default: 7 days)
5. Click "Optimize Database"

**Recommended Retention**:
- Posts: 30-90 days
- Historical stats: 7-30 days

---

### Quality Audit

Review a sample of posts:

\`\`\`sql
-- Random sample of auto-approved posts
SELECT * FROM posts
WHERE status = 'approved'
  AND reviewed_by IS NULL
ORDER BY RANDOM()
LIMIT 20;

-- Random sample of auto-rejected posts
SELECT * FROM posts
WHERE status = 'rejected'
  AND reviewed_by IS NULL
ORDER BY RANDOM()
LIMIT 20;
\`\`\`

**Check for**:
- False positives (good posts rejected)
- False negatives (bad posts approved)
- Consistent quality standards

---

### Cost Review

Check Vercel dashboard for:
- AI analysis costs
- Database storage costs
- Bandwidth usage

**Optimization if costs are high**:
- Adjust quality thresholds (reduce manual review)
- Increase retention period cleanup
- Implement more aggressive pre-filtering

---

## Monthly Tasks

### Performance Review

Analyze feed performance:

\`\`\`sql
-- Posts by topic
SELECT topic, COUNT(*) as count
FROM posts
WHERE status = 'approved'
  AND indexed_at > NOW() - INTERVAL '30 days'
GROUP BY topic
ORDER BY count DESC;

-- Sentiment distribution
SELECT sentiment_label, COUNT(*) as count
FROM posts
WHERE status = 'approved'
  AND indexed_at > NOW() - INTERVAL '30 days'
GROUP BY sentiment_label;

-- Quality score distribution
SELECT 
  CASE 
    WHEN quality_score < 0.3 THEN 'Low'
    WHEN quality_score < 0.6 THEN 'Medium'
    ELSE 'High'
  END as quality_tier,
  COUNT(*) as count
FROM posts
WHERE indexed_at > NOW() - INTERVAL '30 days'
GROUP BY quality_tier;
\`\`\`

---

### Threshold Adjustment

Based on quality audit and performance review:

1. Calculate approval rates:
   \`\`\`sql
   SELECT 
     COUNT(*) FILTER (WHERE status = 'approved') * 100.0 / COUNT(*) as approval_rate,
     COUNT(*) FILTER (WHERE status = 'rejected') * 100.0 / COUNT(*) as rejection_rate,
     COUNT(*) FILTER (WHERE status = 'needs_review') * 100.0 / COUNT(*) as review_rate
   FROM posts
   WHERE analyzed_at > NOW() - INTERVAL '30 days';
   \`\`\`

2. Adjust thresholds in `lib/ai-analyzer.ts` if needed

3. Deploy changes

---

### Backup Verification

Verify Neon automatic backups:

1. Log in to Neon dashboard
2. Check "Backups" tab
3. Verify point-in-time recovery is available
4. Test restore if needed (use staging environment)

---

## Quarterly Tasks

### Feed Configuration Review

Review and update feed settings:

1. **Hashtags** (`lib/feed-config.ts`):
   - Are current hashtags still relevant?
   - Any new hashtags to add?
   - Remove unused hashtags

2. **Keywords** (`lib/feed-config.ts`):
   - Update keyword list
   - Add trending terms
   - Remove outdated terms

3. **Topics** (`lib/ai-analyzer.ts`):
   - Are topic categories still appropriate?
   - Need new categories?
   - Merge similar categories?

---

### Security Audit

Review security settings:

- [ ] Rotate `ADMIN_PASSWORD`
- [ ] Check Vercel access logs for suspicious activity
- [ ] Review database access logs
- [ ] Verify environment variables are secure
- [ ] Check for any exposed secrets in git history

---

### Documentation Update

Update documentation to reflect changes:

- [ ] README.md (new features, changes)
- [ ] FEED_CONFIGURATION.md (hashtags, keywords)
- [ ] AI_ANALYSIS.md (prompt changes, thresholds)
- [ ] This file (new maintenance tasks)

---

## Troubleshooting

### Cron Job Not Running

**Symptoms**: No new posts, stats not updating

**Diagnosis**:
1. Check Vercel deployment logs
2. Look for errors in `/api/cron/collect-posts`
3. Verify `CRON_SECRET` is set

**Solutions**:
- Redeploy to Vercel
- Check `vercel.json` cron configuration
- Verify database connection

---

### AI Analysis Failing

**Symptoms**: Posts stuck in `pending_analysis`

**Diagnosis**:
1. Check Vercel logs for `/api/posts/analyze`
2. Look for AI Gateway errors
3. Check API quotas

**Solutions**:
- Verify Vercel AI Gateway is configured
- Check API rate limits
- Reduce batch size in analysis requests

---

### Database Full

**Symptoms**: Insert errors, slow queries

**Diagnosis**:
\`\`\`sql
SELECT 
  pg_size_pretty(pg_database_size('neondb')) as db_size,
  COUNT(*) as total_posts
FROM posts;
\`\`\`

**Solutions**:
- Run database cleanup (delete old posts)
- Reduce retention period
- Optimize database (VACUUM)
- Upgrade Neon plan if needed

---

### Review Queue Overflowing

**Symptoms**: Hundreds of posts needing review

**Diagnosis**:
\`\`\`sql
SELECT COUNT(*) FROM posts WHERE status = 'needs_review';
\`\`\`

**Solutions**:
- Adjust quality thresholds (lower auto-approve to 0.5)
- Batch review similar posts
- Temporarily increase auto-reject threshold
- Add more reviewers

---

### Feed Not Serving Posts

**Symptoms**: Bluesky users see empty feed

**Diagnosis**:
1. Check `/xrpc/app.bsky.feed.getFeedSkeleton` logs
2. Query approved posts:
   \`\`\`sql
   SELECT COUNT(*) FROM posts WHERE status = 'approved';
   \`\`\`

**Solutions**:
- Verify posts are being approved
- Check feed endpoint is accessible
- Verify `FEEDGEN_SERVICE_DID` is correct
- Check Bluesky feed registration

---

## Emergency Procedures

### Database Corruption

1. Stop cron job (disable in Vercel)
2. Contact Neon support
3. Restore from backup (point-in-time recovery)
4. Verify data integrity
5. Re-enable cron job

---

### Spam Attack

**Symptoms**: Sudden flood of spam posts

**Immediate Actions**:
1. Increase auto-reject threshold to 0.5
2. Add spam keywords to filter
3. Manually reject spam in review queue

**Long-term Solutions**:
1. Improve AI prompt to detect spam
2. Add rate limiting per author
3. Implement author reputation system

---

### Cost Spike

**Symptoms**: Unexpected high bill

**Immediate Actions**:
1. Check Vercel usage dashboard
2. Identify source (AI, database, bandwidth)
3. Temporarily disable AI analysis if needed

**Long-term Solutions**:
1. Implement cost controls
2. Optimize AI usage (batch processing)
3. Add usage alerts

---

## Monitoring Checklist

### Daily
- [ ] Check dashboard stats
- [ ] Process review queue
- [ ] Verify cron is running

### Weekly
- [ ] Database cleanup
- [ ] Quality audit (sample posts)
- [ ] Cost review

### Monthly
- [ ] Performance analysis
- [ ] Threshold adjustment
- [ ] Backup verification

### Quarterly
- [ ] Feed configuration review
- [ ] Security audit
- [ ] Documentation update

---

## Support

### Internal Resources
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System design
- [DATABASE.md](./DATABASE.md) - Database schema
- [API.md](./API.md) - API reference
- [AI_ANALYSIS.md](./AI_ANALYSIS.md) - AI system details

### External Resources
- [Vercel Documentation](https://vercel.com/docs)
- [Neon Documentation](https://neon.tech/docs)
- [AT Protocol Docs](https://atproto.com)
- [Bluesky Feed Generator Guide](https://github.com/bluesky-social/feed-generator)

### Getting Help
- Vercel Support: vercel.com/help
- Neon Support: neon.tech/docs/introduction/support
- Bluesky Discord: discord.gg/bluesky
