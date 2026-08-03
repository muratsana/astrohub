# AstroHub GUI/Admin Before Audit

Date: 2026-08-03

## Source Documents

- `/Users/muratsana/Downloads/ASTROHUB_GUI_ADMIN_UYGULAMA_PROMPTU.md`
- `/Users/muratsana/Downloads/ASTROHUB_GUI_ADMIN_YENIDEN_TASARIM_RAPORU.md`

## Scope Read Before Editing

- Public module toolbar and filtering requirements.
- Forum list/detail/new-topic redesign requirements.
- Admin shell, sidebar navigation, CRUD surface and safety requirements.
- Document import, Saha map/Bortle, Radio and TV integration requirements.

## Existing State Found

| Area | State |
|---|---|
| Public module filters | Shared `FilterBar` already exists and is used by gallery, events, news, articles, marketplace and forum. |
| Active filter display | Latest product decision is active/passive button color instead of a separate active chip row on public pages. |
| Forum | Real forum list exists and uses shared explorer/query state. It is not a visual card grid. |
| Admin | Real admin page exists, but it used a horizontal section/tab strip and one `/admin` route. |
| Admin authorization | Client role checks exist; code comments and UI state describe Supabase/RLS as the real enforcement boundary. |
| Admin content surfaces | Existing controls cover moderation, content, records, users, forum categories, featured, site, broadcast, radio, TV, reminders and catalog/spec import. |
| External integrations | Live YouTube OAuth, AzuraCast, Apryse, CKEditor Import from Word and licensed Bortle tile services are not verifiable without external credentials/licenses. |

## Risks

- Do not fake external integrations.
- Do not redesign the approved homepage.
- Keep public toolbar behavior aligned with the latest browser feedback, even where older documents mention a separate active chip row.
- Avoid data migrations until Supabase credentials and a live schema plan are explicitly available.

