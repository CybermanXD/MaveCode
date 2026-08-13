<p align="center">
          <a href="https://marketplace.visualstudio.com/items?itemName=MaveCode.mave-code"><img src="https://img.shields.io/badge/VS_Code_Marketplace-007ACC?style=flat&logo=visualstudiocode&logoColor=white" alt="VS Code Marketplace"></a>
          <a href="https://x.com/MaveCodeDev"><img src="https://img.shields.io/badge/MaveCode-000000?style=flat&logo=x&logoColor=white" alt="X"></a>
          <a href="https://discord.gg/VxfP4Vx3gX"><img src="https://img.shields.io/badge/Join%20Discord-5865F2?style=flat&logo=discord&logoColor=white" alt="Join Discord"></a>
          <a href="https://www.reddit.com/r/MaveCode/"><img src="https://img.shields.io/badge/Join%20r%2FMaveCode-FF4500?style=flat&logo=reddit&logoColor=white" alt="Join r/MaveCode"></a>
          <a href="https://github.com/MaveCode-Org/MaveCode/issues"><img src="https://img.shields.io/badge/GitHub-Issues-181717?style=flat&logo=github&logoColor=white" alt="GitHub Issues"></a>
        </p>
        <p align="center">
          <em>Obtén ayuda rápido → <a href="https://discord.gg/VxfP4Vx3gX">Únete a Discord</a> • ¿Prefieres algo asíncrono? → <a href="https://www.reddit.com/r/MaveCode/">Únete a r/MaveCode</a></em>
        </p>

        # MaveCode

        > Tu equipo de desarrollo con IA, directamente en tu editor

        ## Somos MaveCode

> MaveCode continúa el desarrollo de este proyecto después de que el equipo
> de Roo detuviera el desarrollo activo de Roo Code para centrarse en
> [Roomote](https://roomote.dev/). Gracias al equipo de Roo por todo lo que
> construyeron.
>
> El equipo principal está formado por desarrolladores que ya habían
> contribuido a Roo y se preocupan profundamente por este plugin. Seguiremos
> actualizando modelos, corrigiendo errores y lanzando funciones, y tenemos
> previsto escuchar de cerca a la comunidad que hizo este plugin tan
> especial. Únete a nosotros en
> [Discord](https://discord.gg/VxfP4Vx3gX),
> [Reddit](https://www.reddit.com/r/MaveCode), o
> [abre un PR o issue](https://github.com/MaveCode-Org/MaveCode).
>
> _-MaveCode Team_

## Migración de Roo Code a MaveCode


## Lo que MaveCode ha añadido desde Roo Code

MaveCode parte de los cimientos creados por Roo Code y continúa ampliándolos con:

- **Inteligencia de código base con Semble** — búsqueda semántica de código rápida y bajo demanda, con configuración automática y sin un flujo de indexación independiente.
- **Flujos de Orchestrator más sólidos** — delegación más segura, coordinación de tareas en paralelo, recuperación fiable de tareas principales y secundarias, y mejor aislamiento entre subtareas y perfiles de proveedor.
- **Ejecuciones autónomas más largas con Destructive Command Guard (DCG)** — bloquea automáticamente los comandos peligrosos mientras el trabajo de confianza continúa sin solicitudes de aprobación repetidas.
- **Los modelos más recientes** — compatibilidad continua con nuevas familias de modelos Claude, GPT, Gemini, Kimi, GLM, Grok, MiniMax y muchas más.
- **Más formas de conectarse** — proveedores nuevos y ampliados, como MaveCode, Moonshot, Kimi Code, Kenari, Friendli, OpenCode Go y muchos más.
- **Flujos de terminal y edición más fiables** — correcciones para la finalización prematura del terminal, las condiciones de carrera del estado de las tareas, la gestión del contexto, la edición de diff y el uso de herramientas específicas de cada proveedor.
- **Más control sobre tu espacio de trabajo** — gestión de reglas, restricciones de MCP por modo, controles de rutas multirraíz, opciones de razonamiento de modelos y acciones para revisar los cambios al completar una tarea.

## Novedades de la v3.76.0

- **Ejecuta tareas más largas y sin interrupciones con Destructive Command Guard (DCG)** — DCG bloquea los comandos peligrosos mientras permite que Zoo siga trabajando sin que tengas que pulsar continuamente botones de aprobación, con descargas e instalación reforzadas del binario administrado.
- **Mejores controles y fiabilidad de los proveedores** — elige la velocidad de respuesta de OpenAI Codex, utiliza configuraciones actualizadas de DeepSeek y benefíciate de un aislamiento más sólido entre los cambios de perfiles de proveedor y las tareas en ejecución.
- **Corrección crítica de la ejecución en el terminal** — Zoo ahora espera a que los comandos del terminal terminen antes de iniciar el siguiente paso, lo que evita el trabajo superpuesto y que el modelo continúe antes de tiempo.
- La agrupación más inteligente reúne las aprobaciones de herramientas relacionadas y mantiene separadas las solicitudes que no tienen relación.
- La entrega de telemetría y la obtención de la caché de modelos son más resistentes ante fallos y solicitudes simultáneas.

## ¿Qué puede hacer MaveCode por TI?

- Generar código a partir de descripciones en lenguaje natural
- Adaptarse con Modos: Código, Arquitecto, Pregunta, Depuración y Modos Personalizados
- Refactorizar y depurar código existente
- Escribir y actualizar documentación
- Responder preguntas sobre tu base de código
- Automatizar tareas repetitivas
- Utilizar servidores MCP

## Modos

MaveCode se adapta a tu forma de trabajar, no al revés:

- Modo Código: codificación diaria, ediciones y operaciones de archivos
- Modo Arquitecto: planificar sistemas, especificaciones y migraciones
- Modo Pregunta: respuestas rápidas, explicaciones y documentos
- Modo Depuración: rastrear problemas, agregar registros, aislar causas raíz
- Modos Personalizados: crea modos especializados para tu equipo o flujo de trabajo


## Recursos

- **[Servidor de Discord](https://discord.gg/VxfP4Vx3gX):** Únete a la comunidad para obtener ayuda y discutir en tiempo real.
- **[Comunidad de Reddit](https://www.reddit.com/r/MaveCode):** Comparte tus experiencias y ve lo que otros están construyendo.
- **[Incidencias de GitHub](https://github.com/MaveCode-Org/MaveCode/issues):** Reporta errores y sigue el desarrollo.
- **[Solicitudes de funcionalidades](https://github.com/MaveCode-Org/MaveCode/discussions/categories/feature-requests?discussions_q=is%3Aopen+category%3A%22Feature+Requests%22+sort%3Atop):** ¿Tienes una idea? Compártela con los desarrolladores.

---

## Configuración y desarrollo local

1. **Clona** el repositorio:

```sh
git clone https://github.com/MaveCode-Org/MaveCode.git
```

2. **Instala las dependencias**:

```sh
pnpm install
```

3. **Ejecuta la extensión**:

Hay varias formas de ejecutar la extensión MaveCode:

### Modo de desarrollo (F5)

Para el desarrollo activo, utiliza la depuración integrada de VSCode:

Presiona `F5` (o ve a **Ejecutar** → **Iniciar depuración**) en VSCode. Esto abrirá una nueva ventana de VSCode con la extensión MaveCode en ejecución.

- Los cambios en la vista web aparecerán inmediatamente.
- Los cambios en la extensión principal también se recargarán automáticamente.

### Instalación automatizada de VSIX

Para construir e instalar la extensión como un paquete VSIX directamente en VSCode:

```sh
pnpm install:vsix [-y] [--editor=<command>]
```

Este comando hará lo siguiente:

- Preguntará qué comando de editor usar (code/cursor/code-insiders) - por defecto es 'code'
- Desinstalará cualquier versión existente de la extensión.
- Construirá el último paquete VSIX.
- Instalará el VSIX recién construido.
- Te pedirá que reinicies VS Code para que los cambios surtan efecto.

Opciones:

- `-y`: Omitir todas las confirmaciones y usar los valores predeterminados
- `--editor=<command>`: Especifica el comando del editor (p. ej., `--editor=cursor` o `--editor=code-insiders`)

### Instalación manual de VSIX

Si prefieres instalar el paquete VSIX manualmente:

1.  Primero, construye el paquete VSIX:
    ```sh
    pnpm vsix
    ```
2.  Se generará un archivo `.vsix` en el directorio `bin/` (p. ej., `bin/mave-code-<version>.vsix`).
3.  Instálalo manualmente usando la CLI de VSCode:
    ```sh
    code --install-extension bin/mave-code-<version>.vsix
    ```

---

Usamos [changesets](https://github.com/changesets/changesets) para el versionado y la publicación. Consulta nuestro `CHANGELOG.md` para ver las notas de la versión.

---

## Aviso legal

**Ten en cuenta** que MaveCode, Inc **no** hace ninguna representación o garantía con respecto a cualquier código, modelo u otras herramientas proporcionadas o puestas a disposición en relación con MaveCode, cualquier herramienta de terceros asociada, o cualquier resultado. Asumes **todos los riesgos** asociados con el uso de dichas herramientas o resultados; tales herramientas se proporcionan "**TAL CUAL**" y "**SEGÚN DISPONIBILIDAD**". Dichos riesgos pueden incluir, sin limitación, infracciones de propiedad intelectual, vulnerabilidades o ataques cibernéticos, sesgo, imprecisiones, errores, defectos, virus, tiempo de inactividad, pérdida o daño de propiedad y/o lesiones personales. Eres el único responsable de tu uso de dichas herramientas o resultados (incluidas, entre otras, la legalidad, idoneidad y resultados de los mismos).

---

## Contribuciones

¡Amamos las contribuciones de la comunidad! Comienza leyendo nuestro [CONTRIBUTING.md](CONTRIBUTING.md).

---

## Licencia

[Apache 2.0 © 2025 MaveCode Org](../../LICENSE)

---

**¡Disfruta MaveCode!** Tanto si lo llevas con la correa corta como si lo dejas deambular de forma autónoma, estamos deseando ver lo que construyes. Si tienes preguntas o ideas de funciones, abre una [issue](https://github.com/MaveCode-Org/MaveCode/issues) o inicia una [discussion](https://github.com/MaveCode-Org/MaveCode/discussions). ¡Feliz código!
