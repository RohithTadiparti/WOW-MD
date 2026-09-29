# Self-hosted OCR runtime

These files let biodata import run without fetching Tesseract worker, core, or
English language data from a third-party CDN.

They are copied from the versions pinned in `frontend/package-lock.json`:

- `tesseract.js/dist/worker.min.js`
- `tesseract.js-core/tesseract-core.wasm.js`
- `tesseract.js-core/tesseract-core.wasm`
- `@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz`

When upgrading either Tesseract package, copy the matching files here and test
an image import in a production build.
