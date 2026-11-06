// Fills every <pre class="code" data-src="..." data-lang="..."> with the file's text, highlighted.
for (const pre of document.querySelectorAll('pre.code[data-src]')) {
  const code = document.createElement('code');
  code.className = `language-${pre.dataset.lang}`;
  pre.replaceChildren(code);
  fetch(pre.dataset.src)
    .then((r) => (r.ok ? r.text() : Promise.reject(new Error(`HTTP ${r.status}`))))
    .then((text) => {
      code.textContent = text;
      if (window.hljs) window.hljs.highlightElement(code);
    })
    .catch((err) => { code.textContent = `Couldn't load ${pre.dataset.src} (${err.message})`; });
}
