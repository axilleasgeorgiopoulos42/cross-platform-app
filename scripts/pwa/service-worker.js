'use strict';

/**
 * Returns the full source text of sw.js for the given build version and
 * precache URL list. The generated worker only uses the `self`, `caches` and
 * `fetch` globals.
 */
function buildServiceWorker(version, urls) {
  return `'use strict';
var PREFIX = 'planner-';
var CACHE_NAME = ${JSON.stringify('planner-' + version)};
var URLS = ${JSON.stringify(urls)};

function openCurrent() {
  return caches.open(CACHE_NAME);
}

self.addEventListener('install', function (event) {
  event.waitUntil(
    openCurrent()
      .then(function (cache) {
        return Promise.all(
          URLS.map(function (url) {
            return fetch(url, { cache: 'reload' }).then(function (response) {
              if (!response || !response.ok) {
                throw new Error('Precache failed for ' + url);
              }
              return cache.put(url, response);
            });
          })
        );
      })
      .then(function () {
        self.skipWaiting();
      })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches
      .keys()
      .then(function (names) {
        var others = names.filter(function (n) {
          return n.indexOf(PREFIX) === 0 && n !== CACHE_NAME;
        });
        var previous = others.length ? others[others.length - 1] : null;
        return Promise.all(
          names
            .filter(function (n) {
              if (n.indexOf(PREFIX) !== 0) return false;
              return n !== CACHE_NAME && n !== previous;
            })
            .map(function (n) {
              return caches.delete(n);
            })
        );
      })
      .then(function () {
        return self.clients.claim();
      })
  );
});

self.addEventListener('fetch', function (event) {
  var request = event.request;
  if (request.method !== 'GET') return;
  if (new URL(request.url).origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      openCurrent()
        .then(function (cache) {
          return cache.match('/index.html');
        })
        .then(function (cached) {
          return cached || fetch(request);
        })
    );
    return;
  }

  event.respondWith(
    openCurrent()
      .then(function (cache) {
        return cache.match(request).then(function (hit) {
          if (hit) return hit;
          return caches.match(request).then(function (any) {
            if (any) return any;
            return fetch(request).then(function (response) {
              if (response && response.status === 200 && response.type === 'basic') {
                var copy = response.clone();
                cache.put(request, copy);
              }
              return response;
            });
          });
        });
      })
  );
});
`;
}

module.exports = { buildServiceWorker };
