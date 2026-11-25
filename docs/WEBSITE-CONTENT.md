# Public website editor

Administrators can manage the public site from the team workspace:

1. Sign in at `/staff` (or `/account`).
2. Choose **Website content** from the left navigation.
3. Select a section, edit the fields, and use **Preview draft** to review unpublished changes.
4. Choose **Publish website** when the draft is ready. Use **Discard changes** to return to the last published version.

The editor covers business name and contact details, the logo and browser icon, navigation, every public page, all five service descriptions, FAQs, policies, shared labels, footer text, search descriptions, and the public photo credits. The current phone and email are entered as `0785706884` and `u.mary@ddin.rw`; an administrator can update both. Calling links use the international form `+250785706884`.

Each page image has an accessible description field. Administrators can replace photos with JPEG, PNG, or WebP files up to 8 MB. The home story and service pages also accept MP4 video up to 20 MB, with an editable cover image. Gallery and FAQ lists can be extended or shortened. Service identity, icon and route are fixed so requests continue to match the operational system; titles, descriptions, photographs, boundaries and preparation notes can be edited.

Draft preview is available only in the signed-in administrator session. It uses a same-origin preview frame and does not publish the draft. The public site continues to show the last published version until **Publish website** succeeds.

## Where content and media are stored

- Published website text is stored in the `WebsiteContent` database record. Built-in starter content is in `frontend/src/site-defaults.json` and `backend/src/site-defaults.json`; keep these files identical when changing the content schema.
- Uploaded public images and video are written to `PUBLIC_MEDIA_STORAGE_PATH`, which Docker maps to the persistent `wellness-public-media` volume at `/app/public-media`.
- Uploaded public media is served from `/api/public-media/<generated-file-name>`. Only administrators can upload files. Accepted types and sizes are checked on the server.
- The volume contains material intended for the public website. Do not upload identity documents, private household records, medical records or other confidential files here. The separate private documents volume is for restricted records.
- Database backups do not contain the media volume. Include `wellness-public-media` in the deployment's off-host backup and restore procedure, together with the database, so published image and video links remain available after a host or volume loss.

The seeded content starts with local photographs of Black families and workers and one accurately credited photo of homes in Kora village, Nyabihu District, Rwanda. Stock photography is illustrative and does not identify the people pictured as Wellness staff or customers. Review the source and license before uploading replacements; record their credit, source, license and description in **Photography**.

## Before opening the editor to non-administrators

The editor and upload route are administrator-only. Keep the production administrator account private, use HTTPS, and set a strong `AUTH_SECRET`. Do not add uploaded media to the private household document workflow or put third-party secrets in website content.
