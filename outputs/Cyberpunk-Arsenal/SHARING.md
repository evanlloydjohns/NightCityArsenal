# Sharing with friends

Send one of these from the sibling `Share-with-friends` folder:

- **`Night-City-Arsenal.html`** — the complete app in one file. Recipients download it and double-click it to open in their browser.
- **`Night-City-Arsenal.zip`** — a smaller ZIP for attachment sharing. Recipients extract it and double-click `Night-City-Arsenal.html` inside. The ZIP also includes brief instructions and the source/validation reports; no development files are needed.

Both contain the same offline application, all 190 images, weapon data, comparisons, filters, favorites and visual slot indicators. They do not include the sender's browser preferences or require a server. The ZIP is useful if a chat client previews or declines the direct HTML attachment.

Use **Download/Save**, rather than a chat client's preview. If a recipient's HTML association opens an editor, they can use **Open with** and choose their browser. A current desktop browser is the intended environment.

For a new version, send the new file under the same name. Recipients can replace the previous copy in the same folder. Preferences are browser-local; **Data notes → Export preferences** and **Import preferences** provide a backup if moving the file or switching browsers changes its storage. There is no automatic update service.

## Future updates

`python source/build.py` now generates the working `index.html`, both friend-facing files, a release fingerprint/checksum manifest, and the complete source ZIP automatically. Normal users never run this command; it is part of the maintenance workflow. Project instructions in `AGENTS.md` require maintaining this delivery format for future changes.

Run tests, finalize the reports, and run the build again to refresh the archives. The application fingerprint is derived from the exact HTML content, so it changes when the runnable application changes. A newer package timestamp alone does not imply different weapon data or a newly supported game patch.

The complete `Cyberpunk-Arsenal.zip` is the maintenance/source package. Send the smaller friend-facing ZIP for ordinary use.

## Hosting later

The same static HTML could be hosted later, letting friends use a URL and receive the latest version whenever they reload. Hosting would add server availability and setup requirements. This release stays an offline browser app, as requested; no hosting or server settings have been changed.

The share ZIP also includes `PERFORMANCE-REPORT.md` with measured software-rendering results and their limitations. All screenshots, raw profiling data and development tests remain in the complete source archive.


## Mods and personal builds

The same stable single HTML now includes the equipment reference and saved-build planner. The friend ZIP also includes MODIFICATIONS-DATA.md. Personal builds are stored only in the recipient's browser and are never baked into the shared HTML or ZIP. To share or back up actual configurations, use Builds > Export JSON separately; friends can import that file without silently overwriting matching IDs. Keep a weapon-preferences export as well before moving the app, because the two exports cover separate stores. No server or account is required.
