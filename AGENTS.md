<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# ZityTraining · web

Gestión de un gimnasio: clientes, planes, reservas y contabilidad. Habla
con `zitytraining-api`, que está en un repositorio aparte (carpeta
hermana `zitytraining-api`). La usan sobre todo desde el iPhone.

## Cosas que no se deducen leyendo el código

- **Los clientes no tienen color ni bolita de avatar.** Los entrenadores
  sí (campo `color`). No inventes un avatar de color para un cliente.

## Convenciones

- Comentarios en español, y explicando el **porqué**, no el qué. Si el
  comentario repite lo que ya dice el código, sobra.
- `npx tsc --noEmit -p tsconfig.json` después de cada cambio.
- Comprobar los cambios de interfaz a lo ancho de un móvil (~390 px), no
  solo en escritorio.

## Git

- **No hacer `commit` ni `push` sin permiso explícito**, aunque se haya
  dado antes en esa misma conversación. Enseña lo que has hecho y
  pregunta.
