# Colosseum Eligibility Criteria — "New Project" Rule

> Fuente: screenshot oficial del sitio de Colosseum (no está en el PDF de rules, pero es vinculante).
> **Esto es el filtro adicional que aplica Colosseum además de las rules formales.**

## La regla central

> *"Colosseum hackathons are for new projects that haven't raised outside capital. They're not intended for established projects who have been building the same product for years and have already raised venture funding."*

Traducido: el hackathon es para proyectos **nuevos sin funding externo**. Si ya levantaste VC para el mismo producto, no podés competir con él.

## Eligibility Criteria (literal)

1. **Pre-hackathon work está permitido** — los teams pueden empezar a desarrollar antes del start date. **Pero solo se juzga el trabajo hecho entre el start y el end del hackathon** (6 abril – 11 mayo 2026).

2. **Founders/devs construyendo nuevos productos sin funding** son elegibles para competir y ganar.

3. **Pre-existing code se puede usar** en la submission, **pero hay que disclosure full** del trabajo previo en el submission form.

## Si Colosseum descubre misrepresentación

Colosseum se reserva el derecho de:
- **Descalificar** el proyecto del contest
- **Banear** al team de hackathons futuros de Colosseum
- **Revocar premios** ya entregados

## Nota crítica sobre "pre-existing code"

> *"'Pre-existing code' does not refer to open-source code developed previously by others. In fact, we encourage project founders to compose with existing Solana protocols."*

Traducido:
- Componer con protocolos Solana existentes (Metaplex, Jupiter, Swig, etc.) **NO cuenta como pre-existing code**. Está **incentivado**.
- "Pre-existing code" se refiere a código tuyo previo al hackathon que estás reciclando.

---

## Implicaciones específicas para BuildersClaw

### ⚠ Riesgos a clarificar antes de submitir

1. **¿BuildersClaw levantó capital?** Si sí, no podés competir con BuildersClaw como proyecto. Tenés que:
   - Crear un proyecto nuevo (nuevo nombre, nueva entidad/repo) que use ideas de BuildersClaw, **o**
   - Confirmar con Colosseum (hackathon@colosseum.com) si la versión Solana cuenta como producto separado.

2. **El repo `buildersclaw/buildersclaw` ya existe pre-hackathon.** Esto es pre-existing code:
   - **Hay que disclosure-arlo** en el submission form (todo el código de la app/contracts/agent/design-system).
   - **Solo el trabajo nuevo del 6 abr – 11 may cuenta para judging.** El judge va a ver qué se construyó en esa ventana.
   - Estrategia: hacer el trabajo Solana en un repo nuevo (o branch claramente separado con commits dentro de la ventana) para que sea trivial demostrar qué es trabajo del hackathon.

3. **El folder `agents-tokenization/` con notas existe pre-2026-04-06? Probablemente sí.** Notas de research no son "código de producto", pero también disclosure-arlas para no caer en misrepresentation → ban.

### ✓ Lo que SÍ podemos hacer

- **Componer con Metaplex, Swig, LI.FI, Genesis, Jupiter, etc.** sin descontar de la submission. Esto suma en el criterio "Open-source / composición" del judging.
- **Reusar código BuildersClaw existente** (frontend Next.js, schema Supabase, pipeline de judging) **siempre que se disclose.** Solo se juzga lo nuevo.
- **Empezar a desarrollar antes del hackathon** está permitido — pero los commits del trabajo Solana deberían quedar dentro de la ventana del 6 abr – 11 may para que el delta sea inequívoco.

### Decisión que necesitamos tomar antes de seguir

**¿BuildersClaw existing levantó capital o no?**
- **No** → podemos posicionar la versión Solana como "BuildersClaw Solana Edition / Frontier" siempre con disclosure del código previo.
- **Sí** → el proyecto del hackathon tiene que ser conceptualmente nuevo (ej. una arena Solana-nativa con otro nombre) que opcionalmente reuse partes open-source de BuildersClaw.

### Estrategia de disclosure recomendada

En el submission form, declarar:
- Repo `buildersclaw/buildersclaw` existe desde antes (link + última fecha pre-hackathon)
- Notas en `agents-tokenization/` son research previo
- El nuevo trabajo del hackathon vive en `<nuevo-repo-o-branch>` con commits del 6 abr en adelante
- Componentes reutilizados: lista explícita (ej. "schema Supabase", "design system X componentes", "pipeline judging Y")

Esto cubre el requisito "disclose all relevant information related to past development work" y nos blinda contra revocación post-hoc.

## Próxima acción

Necesito confirmación tuya:
1. ¿BuildersClaw levantó capital externo (VC, ángeles, granted equity)?
2. ¿El equipo que va a competir es el mismo que el de BuildersClaw original o sos vos solo?
3. ¿Querés que el proyecto del hackathon sea "BuildersClaw Solana Edition" (mismo nombre, mismo team, disclosure honesto) o un fork/spin-off con identidad nueva?

Las respuestas a esto cambian el approach de la sección "Question 1 of ~4" del brainstorming.
