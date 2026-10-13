// Only load AdSense on the published blog, when the owner has enabled it.
(() => {
  const configUrl = new URL("../../site.config.json", document.currentScript.src);
  fetch(configUrl, { cache: "no-store" })
    .then(response => response.ok ? response.json() : null)
    .then(config => {
      if (!config?.ads?.enabled || !/^ca-pub-\d{16}$/.test(config.ads.publisherId)) return;
      const site = new URL(config.url);
      if (location.origin !== site.origin || !location.pathname.startsWith(site.pathname)) return;
      const width = Math.max(1280, Number(config.ads.minViewportWidth) || 1280);
      const desktop = matchMedia(`(min-width: ${width}px)`);
      function load() {
        if (!desktop.matches || document.querySelector('script[data-blog-adsense]')) return;
        const script = document.createElement("script");
        script.async = true;
        script.crossOrigin = "anonymous";
        script.dataset.blogAdsense = "true";
        script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${config.ads.publisherId}`;
        document.head.append(script);
        desktop.removeEventListener("change", load);
      }
      desktop.addEventListener("change", load);
      load();
    })
    .catch(() => {}); // A config/network failure leaves the reading experience ad-free.
})();
