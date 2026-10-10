# Stories — parede de fotos (Remotion)

Vídeo vertical 1080 × 1920, 30 fps, 481 frames (16,03 s, igual à referência).
Parede masonry de cards arredondados, inclinada em 3D, que entra girando do preto,
rola com zoom lento e dois "saltos" rápidos de câmera e termina com fade para o preto.
Textos em Roboto Mono nos quatro cantos, fora da safe area de 240 px.

- Ajustes (textos, ângulos, velocidade, colunas, zoom, cor de fundo, tempos): `src/config.ts`
- Fotos: `public/fotos/` (lista e destaques também em `src/config.ts`)
- Vídeo final: `out/stories.mp4`

```bash
npm install
npm run studio          # pré-visualização
npm run render          # gera out/stories.mp4 (H.264)
# comparar frames com a referência:
scripts/compare.sh referencia.mp4 comparacao.png 30 150 400
```

Sem acesso para baixar o Chromium do Remotion? Aponte para um já instalado:
`REMOTION_BROWSER=/caminho/do/headless_shell npm run render`.
