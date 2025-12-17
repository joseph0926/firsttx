# Security Policy

## Supported Versions

| Version  | Supported |
| -------- | --------- |
| latest   | Yes       |
| < latest | No        |

We only provide security updates for the latest version of each package. Please ensure you are using the latest version before reporting a vulnerability.

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

### How to Report

1. **Email**: Send a detailed report to [joseph0926.dev@gmail.com](mailto:joseph0926.dev@gmail.com)
2. **GitHub Security Advisories**: Use [GitHub's private vulnerability reporting](https://github.com/joseph0926/firsttx/security/advisories/new)

### What to Include

- Description of the vulnerability
- Steps to reproduce
- Affected package(s) and version(s)
- Potential impact
- Any suggested fixes (optional)

### Response Timeline

| Stage                    | Expected Time                      |
| ------------------------ | ---------------------------------- |
| Initial response         | 48 hours                           |
| Vulnerability assessment | 7 days                             |
| Fix development          | 14-30 days (depending on severity) |
| Public disclosure        | After fix is released              |

### What to Expect

1. **Acknowledgment**: We will acknowledge receipt of your report within 48 hours
2. **Assessment**: We will investigate and determine the severity
3. **Updates**: We will keep you informed of our progress
4. **Credit**: We will credit you in the security advisory (unless you prefer to remain anonymous)

## Security Best Practices for Users

### Dependencies

- Keep FirstTx packages updated to the latest version
- Regularly run `pnpm audit` to check for known vulnerabilities
- Review dependency updates before merging

### Data Handling

- FirstTx stores data in IndexedDB; ensure sensitive data is encrypted if needed
- Be aware that Prepaint captures DOM snapshots; avoid storing sensitive data in the DOM
- Use HTTPS for all server communications

### Content Security

- FirstTx uses DOMPurify for HTML sanitization
- Configure appropriate Content Security Policy (CSP) headers
- Validate and sanitize all user inputs

## Security Features

### Built-in Protections

- **DOMPurify integration**: HTML content is sanitized before restoration
- **Schema validation**: Zod schemas validate data before storage
- **No eval()**: No dynamic code execution

### Recommendations

```typescript
// Example: Marking sensitive elements
<div data-firsttx-volatile>
  {/* This content will not be captured by Prepaint */}
  <SensitiveData />
</div>
```

## Known Limitations

- IndexedDB data is not encrypted by default
- Cross-tab sync uses BroadcastChannel (same-origin only)
- Prepaint snapshots may contain visible DOM content

## Disclosure Policy

We follow coordinated disclosure:

1. Reporter submits vulnerability privately
2. We assess and develop a fix
3. Fix is released with a security advisory
4. Details are publicly disclosed after users have time to update

We request that you:

- Give us reasonable time to address the issue before public disclosure
- Make a good faith effort to avoid privacy violations and data destruction
- Do not exploit the vulnerability beyond what is necessary to demonstrate it

---

Thank you for helping keep FirstTx secure.
