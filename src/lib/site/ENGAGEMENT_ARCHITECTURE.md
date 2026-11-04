# Engagement Metrics, View Deduplication & Comment Architecture

This document describes the architectural implementation of article views, comment moderation, engagement scoring, and abuse controls in the Ethiopia Travel Journal project.

---

## 1. Signed Anonymous Visitor Identification

### Overview
To track article views accurately without compromising reader privacy or storing sensitive Personally Identifiable Information (PII) like raw IP addresses, the system issues a signed pseudonymous visitor token:

- **Cookie Name**: `etj_vid`
- **Cookie Attributes**: `HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000 (30 days); Secure (in production)`
- **Format**: `<UUIDv4>.<HMAC-SHA256-Signature>`
- **Signing Algorithm**: HMAC-SHA-256 using server secret (`PAYLOAD_SECRET`).
- **Timing-Safe Verification**: Cryptographic timing-safe comparison (`crypto.timingSafeEqual`) verifies signatures to prevent timing attacks.

### Visitor Hash
For database storage, the visitor identifier is hashed with a one-way SHA-256 digest:
$$\text{visitorHash} = \text{SHA-256}(\text{visitorId} \parallel \text{secret})$$
Neither raw visitor UUIDs nor client IP addresses are ever stored in database view records.

---

## 2. Race-Safe 24-Hour View Deduplication

### Uniqueness Guarantee
A simple TTL index only deletes aged records; it does not protect against concurrent duplicate insertions. To provide atomic race-safety under high traffic and multi-instance deployments:

1. **Epoch Window Bucket**:
   The current time is divided into 24-hour UTC day epochs:
   $$\text{dayBucket} = \left\lfloor \frac{\text{Date.now()}}{86,400,000} \right\rfloor$$
2. **Compound Unique Key**:
   A deterministic unique key is generated:
   $$\text{viewKey} = \text{articleId} + \text{"\_"} + \text{visitorHash} + \text{"\_"} + \text{dayBucket}$$
3. **Database Unique Index**:
   The `article-views` collection enforces a strict MongoDB `unique: true` constraint on `viewKey`.
4. **Atomic Ingestion**:
   When a view request arrives:
   - The server attempts to insert the document into `article-views`.
   - If two identical requests hit the server concurrently, MongoDB allows exactly one insertion and rejects the other with code `11000 (duplicate key error)`.
   - The article's `viewCount` is incremented and `engagementScore` recalculated **if and only if** the unique insert succeeds.

### Retention Policy
Old `article-views` documents automatically age out via standard TTL indexing or maintenance tasks after 30 days. The aggregated `viewCount` on the article remains permanent.

---

## 3. Engagement Score Algorithm

### Formula
The engagement score is computed algorithmically from verified views and approved comments:
$$\text{engagementScore} = \ln(1 + \text{viewCount}) + w_{\text{comment}} \times \ln(1 + \text{commentCount})$$

- **Default Comment Weight ($w_{\text{comment}}$)**: `3` (configurable via `ENGAGEMENT_COMMENT_WEIGHT`).
- **Zero Invariant**: When $\text{views} = 0$ and $\text{comments} = 0$, $\text{engagementScore} = 0$.
- **Precision**: Preserved to 4 decimal places in database storage for deterministic sorting.
- **Popularity Sorting**: Stories listing page (`/stories?sort=popular`) orders deterministically by `['-engagementScore', '-publishedDate', '-id']` directly in MongoDB prior to pagination.

---

## 4. Abuse Controls & Multi-Instance Rate Limiting

1. **Bot & Crawler Exclusions**:
   Requests from automated crawlers (Googlebot, Bingbot, headless browsers, automated tools) are excluded from view tracking.
2. **Prefetch Exclusions**:
   Browsers sending `Purpose: prefetch` or `Sec-Purpose: prefetch` headers are ignored to avoid inflating view counts during background link prefetching.
3. **Draft & Preview Isolation**:
   Draft previews (`preview=true` or staff draft sessions) are strictly barred from view tracking or accepting public comments.
4. **Honeypot Bot Trap**:
   Comment submission forms include a hidden honeypot field. Submissions filling this trap are silently accepted without database persistence.
5. **Rate Limiting**:
   - Comment submissions are rate-limited to 5 requests per minute per IP / visitor session.
   - High-throughput multi-instance deployments leverage database uniqueness constraints as an unbreakable cluster-wide concurrency barrier.

---

## 5. Comment Moderation & Security

1. **Server-Side Security**:
   - `admin.readOnly` is supplemented by server-side field-level `access` rules and `beforeChange` lifecycle hooks.
   - Anonymous submissions are unconditionally forced to `status: 'pending'`.
   - Only authenticated staff (`admin` and `editor`) can approve, reject, edit, or delete comments.
2. **Privacy Assurance**:
   - The commenter's `email` and `phone` fields are protected by field-level read access rules (`read: ({ req }) => staffOnly`).
   - Public GraphQL, REST, and frontend queries can never read private commenter emails.
3. **Legacy Comment Compatibility**:
   - Legacy comments without an associated `article` remain editable in the Payload admin panel without validation failures.
   - New public submissions strictly require an associated published article.
4. **Concurrency & Reassignment Resilience**:
   - Counter synchronization recalculates approved comment counts directly from the database using indexed queries (`{ article: articleId, status: 'approved' }`).
   - Reassigning an approved comment from article $A$ to article $B$ automatically reconciles both articles.
   - Editing an already-approved comment's text does not trigger double-incrementing.
   - Reconciliation routines preserve existing nonzero view counts.
