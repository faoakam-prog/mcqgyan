const CACHE = 'gyanangon-v10';
const ASSETS = [
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

self.addEventListener('install', e => {
  self.skipWaiting(); // সাথে সাথে নতুন SW চালু হবে
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim()) // সব ট্যাব নতুন SW-এর আন্ডারে
  );
});

self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Supabase API — সবসময় নেটওয়ার্ক
  if (url.includes('supabase.co')) return;

  // index.html ও admin.html — সবসময় নেটওয়ার্ক থেকে নেবে
  // deploy হলে সাথে সাথে নতুন ফাইল পাবে
  if (url.includes('index.html') || url.includes('admin.html') || url.endsWith('/')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          // সফল হলে cache-ও আপডেট করো
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match('/index.html')) // অফলাইনে cache থেকে
    );
    return;
  }

  // বাকি সব (icon, manifest) — cache first
  e.respondWith(
    caches.match(e.request).then(cached => {
      return cached || fetch(e.request).then(res => {
        if (e.request.method === 'GET' && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => caches.match('/index.html'));
    })
  );
});
