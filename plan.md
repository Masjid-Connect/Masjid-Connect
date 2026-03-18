# Donation Dashboard & Tiered Access — Implementation Plan

## Context
The user guide and receipts are already built (previous commit). Now we need:
1. **Tiered access control** — Super Admins see full donation details, Regular Admins see aggregated totals only
2. **Admin homepage dashboard** — summary widgets for authorized users
3. **Dedicated donation dashboard page** — deep-dive with charts, Gift Aid tracker, donor insights

---

## Architecture

### Tiered Access Model

| User Type | Homepage | Dedicated Dashboard | Donation List | Individual Donations | Receipts |
|-----------|----------|-------------------|---------------|---------------------|----------|
| **Super Admin / Staff** | Full stats + charts | Full access | Full list with amounts & donor names | Full details | Generate & view |
| **Regular Admin** | Aggregated totals only (no names/amounts) | Summary view — totals, counts, trends (no PII) | Hidden | Hidden | Hidden |
| **Non-admin staff** | Standard app list | No access | No access | No access | No access |

### Implementation Approach

1. **Custom Django permission**: `core.view_donation_details` — granted to Super Admins/staff
2. **`DASHBOARD_CALLBACK`** in Unfold settings — injects dashboard data into the admin homepage context
3. **Custom admin index template** — extends Unfold's `admin/index.html` to show dashboard widgets
4. **Dedicated dashboard view** at `/admin/donations/dashboard/` — full charts page
5. **DonationAdmin visibility** — conditionally hide from sidebar and restrict access for Regular Admins
6. **Chart.js** via CDN for visual charts (no npm dependency in Django)

---

## Part 1: Tiered Access Control

### New Permission
Add to `Donation` model Meta:
```python
permissions = [
    ("view_donation_details", "Can view individual donation details and donor information"),
]
```

### Access Logic (used everywhere)
```python
def can_view_donation_details(user):
    """Super Admin, staff with explicit permission, or superuser."""
    if user.is_superuser:
        return True
    if user.has_perm("core.view_donation_details"):
        return True
    # Check MosqueAdmin role
    from core.models import MosqueAdmin
    return MosqueAdmin.objects.filter(user=user, role="super_admin").exists()

def can_view_donation_summary(user):
    """Any mosque admin (regular or super) can see aggregated totals."""
    if can_view_donation_details(user):
        return True
    from core.models import MosqueAdmin
    return MosqueAdmin.objects.filter(user=user).exists()
```

### DonationAdmin Restrictions
- Override `has_view_permission`, `has_module_permission` on DonationAdmin, GiftAidDeclarationAdmin, GiftAidClaimAdmin
- Only users with `view_donation_details` can access these model pages
- Hide from sidebar for users without permission (dynamic sidebar filtering)

---

## Part 2: Admin Homepage Dashboard Widgets

### For Super Admins (full details)

**Row 1 — Key Metrics (4 stat cards)**
| Card | Value | Subtitle |
|------|-------|----------|
| Today's Donations | £X,XXX | X donations |
| This Month | £XX,XXX | X donations |
| This Year | £XXX,XXX | X donations |
| Gift Aid Reclaimable | £XX,XXX | Unclaimed amount |

**Row 2 — Quick Insights (2 cards)**
- **Recent Donations** — last 5 donations (name, amount, date, Gift Aid badge)
- **Gift Aid Status** — active declarations count, pending claims, last submission date

### For Regular Admins (aggregated only)

**Row 1 — Summary (2 stat cards)**
| Card | Value | Subtitle |
|------|-------|----------|
| Monthly Donations | XX donations this month | No amounts shown |
| Community Growth | XX subscribers this month | Across all mosques |

No donor names, no individual amounts, no Gift Aid details.

### Implementation
- `DASHBOARD_CALLBACK` function in `core/dashboard.py`
- Injects stats into context based on user's access level
- Custom `admin/index.html` template renders stat cards + recent activity

---

## Part 3: Dedicated Donation Dashboard (`/admin/donations/dashboard/`)

### Layout (Super Admin view)

**Section 1: Summary Bar**
- 4 stat cards (same as homepage but with period selector: 7d / 30d / 90d / 1y / all)

**Section 2: Donation Trends Chart**
- Line chart showing daily/weekly/monthly donation totals over time
- Toggle between amount and count
- Overlay line for Gift Aid reclaimable

**Section 3: Breakdown Cards (2-column)**
- **By Frequency**: Pie chart — one-time vs monthly recurring
- **By Source**: Pie chart — Stripe vs bank transfer vs cash vs other

**Section 4: Gift Aid Tracker**
- Progress bar: claimed vs unclaimed Gift Aid
- Active declarations count
- Last HMRC submission date and status
- "Next claim due" estimate
- Quick links: Create new claim, View declarations, Export

**Section 5: Donor Insights (Super Admin only)**
- Top 10 donors by total amount (table)
- Recent donations feed (last 20, with donor name, amount, date, source, Gift Aid badge)
- Recurring donor count vs one-time

### Regular Admin View
- Shows only Section 1 (aggregated totals, no amounts) and Section 2 (chart with counts only, no £ values)
- Sections 4-5 hidden entirely

### Chart.js Integration
- Load Chart.js via CDN `<script>` tag
- Dashboard data passed as JSON in template context
- Charts rendered client-side with branded colors (Sapphire, Gold, Sage)

---

## Part 4: Dynamic Sidebar Filtering

Hide donation-related sidebar items for users without access:

```python
# In DASHBOARD_CALLBACK or middleware
def filter_sidebar_for_user(request, context):
    if not can_view_donation_details(request.user):
        # Remove "Donations & Gift Aid" section from sidebar nav
        ...
```

Alternative: Use Unfold's sidebar `permission` callback if supported, otherwise filter in the dashboard callback.

---

## Files to Create

| File | Purpose |
|------|---------|
| `core/dashboard.py` | Dashboard callback + data aggregation queries + access helpers |
| `core/templates/admin/index.html` | Custom homepage extending Unfold with dashboard widgets |
| `core/templates/admin/dashboard/donations.html` | Dedicated donation dashboard page |
| `core/static/admin/dashboard/dashboard.css` | Dashboard-specific styles (stat cards, charts) |
| `core/static/admin/dashboard/dashboard.js` | Chart.js initialization and data rendering |
| `core/migrations/XXXX_add_donation_permissions.py` | Auto-generated migration for new permission |

## Files to Modify

| File | Change |
|------|--------|
| `core/models.py` | Add `view_donation_details` permission to Donation Meta |
| `core/admin.py` | Add permission checks to DonationAdmin, GiftAidDeclarationAdmin, GiftAidClaimAdmin; add dashboard URL |
| `config/settings.py` | Add `DASHBOARD_CALLBACK`, add `STYLES`/`SCRIPTS` for dashboard assets |

---

## Implementation Order

1. **Access control** — add permission to model, create access helper functions, migration
2. **Dashboard data layer** (`core/dashboard.py`) — aggregation queries with tiered filtering
3. **Homepage override** — custom `admin/index.html` with stat cards, `DASHBOARD_CALLBACK` wiring
4. **Dashboard CSS** — branded stat cards, layout grid
5. **Dedicated dashboard page** — full template with chart containers
6. **Chart.js integration** — `dashboard.js` with branded charts
7. **Permission enforcement** — lock down DonationAdmin, GiftAidAdmin, sidebar filtering
8. **Test** — verify tiered access, check all queries, confirm charts render
9. **Commit & push**

---

## Design Tokens (consistent with existing guide)

- Stat card backgrounds: White with Sapphire left border
- Stat values: Sapphire-700 (#0F2D52), 36px, tabular-nums
- Stat labels: Onyx-600 (#6B6B70), 13px uppercase
- Chart palette: Sapphire (#0F2D52), Gold (#D4AF37), Sage (#2D6A4F), Crimson (#B91C1C)
- Gift Aid progress bar: Gold fill on Stone-300 track
- Restricted content placeholder: Stone-200 card with lock icon and "Contact a Super Admin for access"
