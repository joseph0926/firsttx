# FirstTx DevTools - Privacy Policy

**Last updated: 2025-10-28**

## Overview

FirstTx DevTools is a Chrome extension designed solely for debugging
and monitoring FirstTx library events during development.

## Data Collection

**We do NOT collect, store, or transmit any personal data.**

### What We Do

- Monitor FirstTx events in your local development environment
- Store event history in browser's local storage (your device only)
- Use BroadcastChannel API for same-tab communication
- Save user preferences in Chrome storage API

### What We DON'T Do

- ❌ Track your browsing activity
- ❌ Send data to external servers
- ❌ Share data with third parties
- ❌ Use analytics or telemetry
- ❌ Access sensitive page content

## Data Storage

All data remains on your device:

- **Event History**: Chrome local storage
- **User Settings**: Chrome storage API (panel layout, filters)
- **No Remote Servers**: Everything is local

## Permissions Explained

### storage

Used to save your preferences (panel size, filter settings)
across browser sessions.

### <all_urls>

Required to inject content script that monitors FirstTx events
on any website during development. We only collect FirstTx-specific
events and do not access other page content.

## Third-Party Services

None. This extension does not use any third-party services or APIs.

## Children's Privacy

This extension is intended for developers and does not target
children under 13.

## Open Source

Full source code: https://github.com/joseph0926/firsttx
Licensed under MIT

## Changes to This Policy

We may update this policy. Changes will be posted on this page
with an updated "Last updated" date.

## Contact

Questions about privacy?

- GitHub: https://github.com/joseph0926/firsttx/issues
- Email: joseph0926.dev@gmail.com
