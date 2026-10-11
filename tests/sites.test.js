// 사이트 판정 테스트: node tests/sites.test.js
const assert = require('node:assert');
const { matchSite, normalizeSite } = require('../sites.js');

const sites = ['youtube.com', 'comic.naver.com'];
assert.strictEqual(matchSite('https://youtube.com/watch?v=1', sites), 'youtube.com');
assert.strictEqual(matchSite('https://m.youtube.com/', sites), 'youtube.com');
assert.strictEqual(matchSite('https://notyoutube.com/', sites), null);
assert.strictEqual(matchSite('https://naver.com/', sites), null);
assert.strictEqual(matchSite('https://comic.naver.com/webtoon', sites), 'comic.naver.com');
assert.strictEqual(matchSite('chrome://newtab/', sites), null);

assert.strictEqual(normalizeSite(' https://www.Twitch.tv/abc '), 'twitch.tv');
assert.strictEqual(normalizeSite('abc'), '');

console.log('사이트 판정 테스트 통과');
