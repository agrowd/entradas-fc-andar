## ERR-01: Desbordamiento de input en configuración (2026-04-18)
**Síntoma:** El campo "Hasta N°" se salía de la tarjeta de configuración en pantallas angostas.
**Root Cause:** Los elementos input tienen un min-width por defecto en algunos navegadores que ignoraba el grid-template-columns: 1fr 1fr.
**Solución:** Se agregó width: 100% al selector global de input.
**Estado:** ? FIXED
