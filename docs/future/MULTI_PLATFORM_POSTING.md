# Multi-Platform Posting System — Future Integration Plan

> **Target**: Post-stabilisation phase (3+ months after app & web launch)
> **Status**: Planning — do not implement until app and web admin are battle-tested
> **Author**: Auto-generated spec
> **Last updated**: 2026-03-18

---

## 1. Problem Statement

Mosque admins currently create announcements and events in the Masjid Connect app. They then **manually re-post** the same content to their Telegram channel, Twitter/X account, WhatsApp group, and Facebook page. This is tedious, error-prone, and leads to inconsistent messaging across platforms.

## 2. Goal

**One post, everywhere.** When an admin creates an Announcement or Event in Masjid Connect, it is automatically distributed to all connected social platforms — formatted correctly for each.

## 3. Supported Platforms (Phase 1)

| Platform    | API               | Message Limit | Cost        | Complexity |
|-------------|-------------------|---------------|-------------|------------|
| **Telegram**| Bot API           | 4,096 chars   | Free        | Low        |
| **Twitter/X** | v2 API         | 280 chars     | Free tier (1,500/mo) | Medium |

### Phase 2 (future consideration)
- **WhatsApp** — Business API (requires Meta approval, monthly fee)
- **Facebook Pages** — Graph API (requires app review)
- **Instagram** — Content Publishing API (requires business account)

---

## 4. Architecture Overview

```
Admin creates Announcement/Event
        │
        ▼
  Django post_save signal
        │
        ▼
  Query active SocialAccounts for that mosque
        │
        ▼
  For each account → create PostDistribution (status=pending)
        │
        ▼
  Dispatch background task (django-q2)
        │
        ▼
  Platform adapter formats + sends
        │
        ▼
  Update PostDistribution (status=sent/failed, platform_post_id)
```

### Why django-q2 (not Celery)?
- Works with existing SQLite (dev) and PostgreSQL (prod) as the broker
- No Redis or RabbitMQ infrastructure needed
- Lightweight — one extra process (`python manage.py qcluster`)
- Sufficient for mosque posting volumes (a few posts per week)
- Can migrate to Celery later if needed

---

## 5. New Django App: `social/`

### 5.1 File Structure

```
/backend/social/
  __init__.py
  apps.py               # AppConfig with signal registration
  models.py             # SocialAccount, PostDistribution
  admin.py              # Django Admin UI for managing accounts
  signals.py            # post_save hooks on Announcement/Event
  tasks.py              # Background distribution logic
  formatters.py         # Content formatting per platform
  platforms/
    __init__.py
    base.py             # Abstract platform adapter
    telegram.py         # Telegram Bot API adapter
    twitter.py          # Twitter/X API v2 adapter
  migrations/
```

### 5.2 Models

#### SocialAccount

Links a mosque to a platform account. One mosque can have multiple accounts (e.g. one Telegram channel + one Twitter account).

```python
class SocialAccount(models.Model):
    class Platform(models.TextChoices):
        TELEGRAM = "telegram", "Telegram"
        TWITTER = "twitter", "Twitter / X"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    mosque = models.ForeignKey("core.Mosque", on_delete=models.CASCADE, related_name="social_accounts")
    platform = models.CharField(max_length=20, choices=Platform.choices)
    is_active = models.BooleanField(default=True)
    display_name = models.CharField(max_length=100, help_text="e.g. @SalafiMasjidUpdates")
    credentials = models.JSONField(help_text="Encrypted platform credentials")
    distribute_announcements = models.BooleanField(default=True)
    distribute_events = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("mosque", "platform", "display_name")
```

**Credential shapes per platform:**

```python
# Telegram
{
    "bot_token": "123456:ABC-DEF1234...",
    "channel_id": "@SalafiMasjidUpdates"  # or numeric ID for private channels
}

# Twitter/X
{
    "api_key": "...",
    "api_secret": "...",
    "access_token": "...",
    "access_token_secret": "..."
}
```

> **Security note**: Credentials are stored as JSON in the database. Before launch, implement field-level encryption using `django-fernet-fields` or similar. Never expose credentials in API responses or logs.

#### PostDistribution

Tracks every distribution attempt for audit and retry.

```python
class PostDistribution(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        SENT = "sent", "Sent"
        FAILED = "failed", "Failed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    # Generic FK to Announcement or Event
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.UUIDField()
    content_object = GenericForeignKey("content_type", "object_id")

    social_account = models.ForeignKey(SocialAccount, on_delete=models.CASCADE, related_name="distributions")
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    platform_post_id = models.CharField(max_length=255, blank=True)  # tweet ID, message_id, etc.
    error_message = models.TextField(blank=True)
    retry_count = models.PositiveSmallIntegerField(default=0)
    sent_at = models.DateTimeField(null=True, blank=True)
    created = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["content_type", "object_id"]),
            models.Index(fields=["status"]),
        ]
```

### 5.3 Platform Adapters

```python
# platforms/base.py
class BasePlatformAdapter(ABC):
    @abstractmethod
    def send(self, formatted_content: str, credentials: dict) -> str:
        """Send content. Returns platform_post_id."""
        ...

    @abstractmethod
    def format_announcement(self, announcement) -> str:
        """Format an Announcement for this platform."""
        ...

    @abstractmethod
    def format_event(self, event) -> str:
        """Format an Event for this platform."""
        ...
```

#### Telegram Adapter

```python
# platforms/telegram.py
# Uses: POST https://api.telegram.org/bot{token}/sendMessage
# Body: { "chat_id": channel_id, "text": content, "parse_mode": "Markdown" }
# Returns: message_id from response
# Supports: Bold, italic, links, up to 4096 chars
```

**Example Telegram output (Announcement):**

```
🕌 *The Salafi Masjid*

📢 *Jumu'ah Khutbah Topic Change*

This week's Jumu'ah khutbah will be delivered by Shaykh Abu Abdillah
at 1:15 PM. Topic: "The Rights of the Neighbours in Islam."

Please arrive early to secure your place.

— Posted via Masjid Connect
```

**Example Telegram output (Event):**

```
🕌 *The Salafi Masjid*

📅 *Weekly Tafsir Class*
🗓 Friday, 21 March 2026
🕐 After Isha (8:30 PM – 9:30 PM)
👤 Speaker: Ustadh Abu Muadh
📍 Main Hall

Continuing the tafsir of Surah Al-Kahf, covering verses 60-82.

— Posted via Masjid Connect
```

#### Twitter/X Adapter

```python
# platforms/twitter.py
# Uses: POST https://api.twitter.com/2/tweets (OAuth 1.0a)
# Body: { "text": content }
# Returns: tweet id from response
# Limit: 280 characters — must truncate intelligently
```

**Example Twitter output (Announcement):**

```
📢 Jumu'ah Khutbah Topic Change

This week's khutbah by Shaykh Abu Abdillah at 1:15 PM. Topic: "The Rights of the Neighbours in Islam."

Arrive early.
```

**Example Twitter output (Event):**

```
📅 Weekly Tafsir Class
🗓 Fri 21 Mar · After Isha
👤 Ustadh Abu Muadh

Continuing tafsir of Surah Al-Kahf (verses 60-82). Main Hall.
```

### 5.4 Signal Flow

```python
# signals.py
@receiver(post_save, sender=Announcement)
def distribute_announcement(sender, instance, created, **kwargs):
    if not created:
        return  # Only distribute on creation, not edits
    accounts = SocialAccount.objects.filter(
        mosque=instance.mosque,
        is_active=True,
        distribute_announcements=True,
    )
    for account in accounts:
        dist = PostDistribution.objects.create(
            content_type=ContentType.objects.get_for_model(instance),
            object_id=instance.id,
            social_account=account,
        )
        # Dispatch background task
        async_task("social.tasks.send_distribution", dist.id)
```

### 5.5 Background Task

```python
# tasks.py
def send_distribution(distribution_id):
    dist = PostDistribution.objects.select_related("social_account").get(id=distribution_id)
    adapter = get_adapter(dist.social_account.platform)
    content_obj = dist.content_object

    try:
        if isinstance(content_obj, Announcement):
            formatted = adapter.format_announcement(content_obj)
        else:
            formatted = adapter.format_event(content_obj)

        post_id = adapter.send(formatted, dist.social_account.credentials)
        dist.status = "sent"
        dist.platform_post_id = post_id
        dist.sent_at = timezone.now()
    except Exception as e:
        dist.status = "failed"
        dist.error_message = str(e)
        dist.retry_count += 1
        # Auto-retry up to 3 times with backoff
        if dist.retry_count < 3:
            dist.status = "pending"
            async_task("social.tasks.send_distribution", dist.id, task_name=f"retry-{dist.id}")
    dist.save()
```

---

## 6. Django Admin Integration

### Social Accounts Management

Add to the existing Unfold admin sidebar under a new **"Social Channels"** section:

```
Sidebar:
  ...
  Social Channels
    ├── Connected Accounts     (SocialAccount)
    └── Distribution Log       (PostDistribution, read-only)
```

**SocialAccount Admin:**
- List view: mosque name, platform icon, display_name, is_active toggle, last post date
- Form: mosque dropdown, platform selector, display_name, credentials (JSON widget), toggles for announcements/events
- Inline help text on every field (non-technical admin principle)
- "Test Connection" admin action — sends a test message to verify credentials work

**PostDistribution Admin:**
- Read-only list: date, content preview, platform, status badge (green/red/yellow), error message
- Filters: by status, by platform, by mosque
- No create/edit — these are system-generated audit records

### Announcement/Event Admin Enhancement

Add a read-only inline or section showing distribution status:

```
Announcement: "Jumu'ah Topic Change"
  ├── Telegram @SalafiMasjidUpdates  ✅ Sent (msg_id: 1234)
  └── Twitter @SalafiMasjid          ❌ Failed: Rate limit exceeded (retry in 15m)
```

---

## 7. New Dependencies

```
# Add to requirements.txt
django-q2>=1.6            # Background task queue (ORM broker, no Redis needed)
tweepy>=4.14              # Twitter/X API v2 client (OAuth 1.0a handled)
django-fernet-fields>=0.6 # Field-level encryption for credentials
```

No new infrastructure — django-q2 uses the existing database as its broker.

---

## 8. Configuration (settings.py additions)

```python
INSTALLED_APPS += [
    "social",
    "django_q",
]

# django-q2 configuration (ORM broker)
Q_CLUSTER = {
    "name": "masjid-connect",
    "workers": 2,
    "timeout": 60,          # seconds per task
    "retry": 120,           # retry failed tasks after 2 minutes
    "queue_limit": 50,
    "orm": "default",       # use the default database as broker
    "catch_up": False,      # don't run missed scheduled tasks
}
```

---

## 9. Deployment Changes

### Production (Docker / systemd)

Add a second process alongside the Django web server:

```yaml
# docker-compose.prod.yml addition
  qcluster:
    build: ./backend
    command: python manage.py qcluster
    depends_on:
      - web
      - db
    environment:
      - DATABASE_URL=${DATABASE_URL}
    restart: always
```

Or if using systemd:

```ini
# /etc/systemd/system/masjid-qcluster.service
[Unit]
Description=Masjid Connect Task Queue
After=network.target

[Service]
User=www-data
WorkingDirectory=/opt/masjid-connect/backend
ExecStart=/opt/masjid-connect/venv/bin/python manage.py qcluster
Restart=always

[Install]
WantedBy=multi-user.target
```

---

## 10. Steps For You (Admin / Setup)

### Before Development Starts

- [ ] Confirm the app and web admin have been stable for 3 months
- [ ] Decide which mosques get social posting first (pilot group)

### Telegram Setup (per mosque)

1. Open Telegram → search **@BotFather** → send `/newbot`
2. Choose a name: e.g. "Salafi Masjid Updates Bot"
3. Choose a username: e.g. `SalafiMasjidUpdatesBot`
4. **Save the bot token** BotFather gives you (looks like `123456:ABC-DEF...`)
5. Create a **Telegram Channel** (public recommended, e.g. `@SalafiMasjidUpdates`)
6. Go to Channel Settings → Administrators → **Add the bot** → grant "Post Messages"
7. In Django Admin → Social Accounts → Add:
   - Mosque: select the mosque
   - Platform: Telegram
   - Display name: `@SalafiMasjidUpdates`
   - Credentials: `{"bot_token": "YOUR_TOKEN", "channel_id": "@SalafiMasjidUpdates"}`
   - Active: Yes
8. Click **"Test Connection"** to verify

### Twitter/X Setup (per mosque)

1. Go to [developer.x.com](https://developer.x.com) and sign up (Free tier)
2. Create a **Project** → create an **App** inside it
3. Under App Settings → **User authentication settings**:
   - App permissions: **Read and Write**
4. Under **Keys and Tokens**, generate:
   - API Key + API Secret
   - Access Token + Access Token Secret
5. **Save all 4 values**
6. In Django Admin → Social Accounts → Add:
   - Mosque: select the mosque
   - Platform: Twitter
   - Display name: `@SalafiMasjid`
   - Credentials:
     ```json
     {
       "api_key": "...",
       "api_secret": "...",
       "access_token": "...",
       "access_token_secret": "..."
     }
     ```
   - Active: Yes
7. Click **"Test Connection"** to verify

### Server Deployment

1. Deploy the updated code
2. Run `python manage.py migrate` (creates social_account + post_distribution tables)
3. Start the task worker: `python manage.py qcluster`
   - In Docker: add qcluster service to docker-compose.prod.yml
   - On bare metal: add systemd service (see Section 9)
4. Monitor the Distribution Log in Django Admin for the first week

---

## 11. Monitoring & Failure Handling

- **Distribution Log** in Django Admin shows all attempts with status
- Failed posts auto-retry up to 3 times with exponential backoff
- After 3 failures, status stays `failed` — admin can see the error and re-trigger manually
- Consider adding email alerts to `info@salafimasjid.app` when a distribution fails 3 times

---

## 12. Future Enhancements (Phase 2+)

- **WhatsApp Business API** — auto-post to mosque WhatsApp broadcast list
- **Facebook Pages** — post to mosque Facebook page
- **Edit propagation** — when an announcement is edited, update the Telegram/Twitter post
- **Delete propagation** — when an announcement expires or is deleted, remove the social post
- **Scheduled posting** — allow admins to schedule posts for a future time
- **Analytics** — track engagement (Telegram views, tweet impressions) in the admin dashboard
- **In-app admin UI** — manage social accounts from the mobile app, not just Django Admin
- **Content preview** — show admin a preview of how the post will look on each platform before publishing

---

## 13. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Twitter API rate limits | Low (mosque posts infrequently) | Low | Retry with backoff, alert on failure |
| Twitter API policy changes | Medium | Medium | Adapter pattern makes swapping easy |
| Credential leak | Low | High | Field-level encryption, never log credentials |
| Bot token revoked | Low | Medium | Test Connection action, monitoring alerts |
| django-q2 worker crashes | Low | Low | systemd restart=always, supervisor |
| Telegram channel deleted | Low | Low | Graceful error handling, admin notification |

---

## 14. Estimated Development Effort

| Component | Effort |
|-----------|--------|
| Models + migrations | 1 hour |
| Platform adapters (Telegram + Twitter) | 3 hours |
| Formatters (announcement + event × 2 platforms) | 2 hours |
| Signals + tasks | 1 hour |
| Admin UI (SocialAccount + PostDistribution) | 2 hours |
| Credential encryption | 1 hour |
| Tests | 3 hours |
| Documentation + deployment guide | 1 hour |
| **Total** | **~14 hours** |

---

*This plan should be revisited after the 3-month stabilisation period to confirm platform API availability, pricing, and mosque admin feedback on priorities.*
