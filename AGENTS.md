

## Application architecture
- Keep the Bolada Pix reproduction in the index route, with visual tokens in the global stylesheet and original media referenced through asset pointers, so the homepage remains cohesive and assets stay portable.
- Keep transactions on the original website rather than simulating payments or issuing tickets, because this project reproduces the public presentation only.
- Prebundle homepage UI dependencies alongside React in Vite so first-use dependency optimization cannot mix React module generations in an already-open preview.
