# Logistics Pipes

Mod **oficial** do [MineClaude](https://mineclaude.com). Id `logisticspipes`, versão `0.12.0`. Repositório público.

Este mod **vem junto** com o servidor oficial: quem joga em https://mineclaude.com já tem ele. Este
repositório é para quem hospeda o próprio servidor, ou quer ler como ele é feito.

> Num servidor que já traz este mod como **pasta** na `MODS_DIR` (`mods/logisticspipes/`), não ponha o
> `.mcmod` do lado: seriam dois mods com o id `logisticspipes`. Use um ou o outro.

## O que ele faz

Uma rede de canos que pede, acha e entrega item sozinha: cano pedido, fornecedor, satélite e de montagem, módulos e chips para programar cada um, melhorias de velocidade e de extração, estação de solda, tela de pedido e um pedido remoto para usar longe da rede. Comandos /lp e /lpkit.

## Instalar

Baixe o `.mcmod` da [última Release](../../releases/latest) e escolha um caminho:

- **Pasta de mods:** ponha o arquivo **`logisticspipes.mcmod`** (o nome importa: o servidor exige que seja o id do mod) na `MODS_DIR` do servidor e reinicie. A Release traz esse nome pronto, ao lado da cópia com a versão no nome.
- **No jogo:** `/mod previa <link do .mcmod>`, ou a tela **Mods**.

Lado: servidor + navegador.

## Configuração

Chaves do bloco `mineclaude.config` do `package.json`, ajustáveis pelo servidor:

| chave | padrão |
| --- | --- |
| `power_required` | `false` |
| `pipe_speed` | `1` |
| `tick_interval` | `10` |
| `max_hops` | `64` |

## Montar e empacotar aqui

Só precisa do [Bun](https://bun.sh) — nada do repositório do jogo:

```
bun tools/pack.mjs
```

Sai um `logisticspipes-0.12.0.mcmod` determinístico (mesma entrada, mesmos bytes).

## Publicar uma versão

Suba a `version` no `package.json`, comite, e marque:

```
git tag v0.12.0 && git push origin v0.12.0
```

O workflow `.github/workflows/release.yml` monta, empacota e cria a Release com o `.mcmod` anexado.

## Arte

Arte 100% original, pintada por código.

Os arquivos de `textures/` são o **resultado** dessa pintura, comitados como PNG/JSON/WAV.
Os geradores que os desenham ficam no repositório do jogo (eles leem o escritor de PNG de lá), então não
vêm neste repositório — o que vem é a arte pronta, e montar aqui não precisa deles.
