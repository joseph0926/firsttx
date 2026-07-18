const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  createGithubReleases,
  createReleasePlan,
  extractReleaseNotes,
  parsePackageManifests,
  parsePublishedPackages,
  publishedPackagesFromManifests,
} = require('./create-github-releases');

const RELEASE_SHA = '0123456789abcdef0123456789abcdef01234567';

function createFixture() {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'firsttx-release-'));
  const packageDir = path.join(rootDir, 'packages', 'prepaint');

  fs.mkdirSync(packageDir, { recursive: true });
  fs.writeFileSync(
    path.join(packageDir, 'package.json'),
    JSON.stringify({ name: '@firsttx/prepaint', version: '1.2.3' }),
  );
  fs.writeFileSync(
    path.join(packageDir, 'CHANGELOG.md'),
    '# @firsttx/prepaint\n\n## 1.2.3\n\n- Safe release\n\n## 1.2.2\n\n- Previous\n',
  );

  return rootDir;
}

function createApi({ publishedVersion = '1.2.3', target = null, release = null } = {}) {
  let currentTarget = target;
  let currentRelease = release;
  const created = [];

  return {
    created,
    getPublishedVersion() {
      return publishedVersion;
    },
    getRelease() {
      return currentRelease;
    },
    getTagTarget() {
      return currentTarget;
    },
    createRelease(planned, releaseSha) {
      created.push({ planned, releaseSha });
      currentTarget = releaseSha;
      currentRelease = {
        tag_name: planned.tag,
        draft: false,
        prerelease: planned.prerelease,
      };
    },
  };
}

test('parses and validates published packages', () => {
  assert.deepEqual(parsePublishedPackages('[{"name":"@firsttx/prepaint","version":"1.2.3"}]'), [
    { name: '@firsttx/prepaint', version: '1.2.3' },
  ]);
  assert.throws(
    () => parsePublishedPackages('[{"name":"other","version":"1.2.3"}]'),
    /invalid package/,
  );
  assert.throws(
    () =>
      parsePublishedPackages(
        '[{"name":"@firsttx/prepaint","version":"1.2.3"},{"name":"@firsttx/prepaint","version":"1.2.4"}]',
      ),
    /duplicate package/,
  );
});

test('parses and validates package manifest paths', () => {
  assert.deepEqual(parsePackageManifests('["packages/prepaint/package.json"]'), [
    'packages/prepaint/package.json',
  ]);
  assert.throws(() => parsePackageManifests('["apps/docs/package.json"]'), /invalid path/);
  assert.throws(
    () =>
      parsePackageManifests('["packages/prepaint/package.json","packages/prepaint/package.json"]'),
    /duplicate path/,
  );
});

test('extracts only the requested changelog section', () => {
  const notes = extractReleaseNotes(
    '# Package\n\n## 1.2.3\n\n- Current\n\n## Unreleased\n\n- Future\n',
    '1.2.3',
  );

  assert.equal(notes, '- Current\n');
});

test('builds a release plan from the verified package manifests', (context) => {
  const rootDir = createFixture();
  context.after(() => fs.rmSync(rootDir, { recursive: true, force: true }));

  const publishedPackages = publishedPackagesFromManifests(rootDir, [
    'packages/prepaint/package.json',
  ]);

  assert.deepEqual(createReleasePlan(rootDir, publishedPackages), [
    {
      name: '@firsttx/prepaint',
      version: '1.2.3',
      tag: '@firsttx/prepaint@1.2.3',
      prerelease: false,
      notes: '- Safe release\n',
    },
  ]);
  assert.throws(
    () => createReleasePlan(rootDir, [{ name: '@firsttx/prepaint', version: '1.2.4' }]),
    /does not match the verified revision/,
  );
});

test('creates and verifies a missing release', () => {
  const api = createApi();
  const plan = [
    {
      name: '@firsttx/prepaint',
      version: '1.2.3',
      tag: '@firsttx/prepaint@1.2.3',
      prerelease: false,
      notes: '- Safe release\n',
    },
  ];

  createGithubReleases({ plan, releaseSha: RELEASE_SHA, api, log() {} });

  assert.equal(api.created.length, 1);
  assert.equal(api.created[0].releaseSha, RELEASE_SHA);
});

test('dry-run validates a missing release without creating it', () => {
  const api = createApi();
  const messages = [];
  const plan = [
    {
      name: '@firsttx/prepaint',
      version: '1.2.3',
      tag: '@firsttx/prepaint@1.2.3',
      prerelease: false,
      notes: '- Safe release\n',
    },
  ];

  createGithubReleases({
    plan,
    releaseSha: RELEASE_SHA,
    api,
    dryRun: true,
    log(message) {
      messages.push(message);
    },
  });

  assert.equal(api.created.length, 0);
  assert.deepEqual(messages, [`Would create release @firsttx/prepaint@1.2.3 at ${RELEASE_SHA}`]);
});

test('skips an existing release at the verified revision', () => {
  const api = createApi({
    target: RELEASE_SHA,
    release: {
      tag_name: '@firsttx/prepaint@1.2.3',
      draft: false,
      prerelease: false,
    },
  });
  const plan = [
    {
      name: '@firsttx/prepaint',
      version: '1.2.3',
      tag: '@firsttx/prepaint@1.2.3',
      prerelease: false,
      notes: '- Safe release\n',
    },
  ];

  createGithubReleases({ plan, releaseSha: RELEASE_SHA, api, log() {} });

  assert.equal(api.created.length, 0);
});

test('rejects npm mismatches and conflicting tags', () => {
  const plan = [
    {
      name: '@firsttx/prepaint',
      version: '1.2.3',
      tag: '@firsttx/prepaint@1.2.3',
      prerelease: false,
      notes: '- Safe release\n',
    },
  ];

  assert.throws(
    () =>
      createGithubReleases({
        plan,
        releaseSha: RELEASE_SHA,
        api: createApi({ publishedVersion: '1.2.2' }),
        log() {},
      }),
    /npm does not contain/,
  );
  assert.throws(
    () =>
      createGithubReleases({
        plan,
        releaseSha: RELEASE_SHA,
        api: createApi({ target: 'abcdef0123456789abcdef0123456789abcdef01' }),
        log() {},
      }),
    /points to/,
  );
});
