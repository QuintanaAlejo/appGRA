# PRD-002: GRA Caja Diaria — Aplicación web interna para el registro tipificado de movimientos de caja y visualización de indicadores mensuales en tiempo real

## Contexto y Problema

El equipo administrativo y los socios de GRA Capacitaciones llevan el control diario de ingresos, egresos y saldos de 7 cajas (`GASTOS GRA`, `INGRESOS GRA`, `MERCADO PAGO`, `CORREO ARGENTINO`, `YOLANDA`, `ADRIAN` y `GABRIEL`) en una planilla de Google Sheets con una pestaña por mes (`CONTROL DE CAJA`).

Hoy el flujo presenta cuatro dolores concretos:
1. **Falta de tipificación:** En la columna `CONCEPTO` se escribe texto libre donde se mezclan el rubro del gasto, el detalle particular (nombre de empleada, alumno, localidad o cuota) y el medio de pago o banco (`pcia`, `credicoop`, `mp`, `efectivo`), con errores de tipeo y abreviaturas distintas cada mes (`credicop`, `credcioop`, `paradigam`, fechas como `04/058/2026` o `04/06/0206`). Esto impide agrupar gastos por categoría o por medio de pago de forma automática.
2. **Ausencia de indicadores de fin de mes:** La planilla solo suma totales brutos por caja (`SUMIF`), sin desglose por categoría, sin separar gastos operativos de GRA de los gastos/retiros de los socios, y sin comparativa mensual.
3. **Fricción operativa y errores manuales:** Los pases de dinero entre cajas (por ejemplo, recargas de `MERCADO PAGO` a `CORREO ARGENTINO` o retiros hacia la caja `YOLANDA`) obligan a cargar dos filas manuales, y el armado de cada nueva pestaña mensual requiere copiar fórmulas y arrastrar saldos iniciales a mano.
4. **Incomodidad en celular y falta de control de acceso por rol:** La planilla de 13 columnas es incómoda de consultar desde el celular cuando los socios quieren revisar indicadores o saldos, y quien entra a cargar datos tiene a la vista toda la información global del negocio sin distinción de permisos.

**Personas:**
- **Administrativa de GRA (Rol `Carga`):** Opera todos los días desde una PC de escritorio. Necesita cargar ingresos, egresos, comisiones y transferencias entre cajas en pocos segundos, filtrar movimientos del mes y ver en tiempo real el saldo disponible de cada caja para operar, sin acceder al dashboard gerencial de indicadores.
- **Socio / Dirección de GRA (Rol `Carga + Indicadores`):** Consulta el estado del negocio principalmente desde el celular (y ocasionalmente desde PC). Necesita ver en tiempo real cuánto se lleva gastado en el mes por categoría y medio de pago, cómo evolucionan los saldos de cada caja (incluyendo su propia cuenta corriente de socio), comparar contra el mes anterior, configurar los saldos iniciales de cada mes y registrar los saldos bancarios (`BANCO PROVINCIA`, `BANCO CREDICOOP`) y la `DEUDA SAN PABLO`.

## Objetivos

- Reemplazar la planilla `CONTROL DE CAJA` por una aplicación web simple y rápida para carga en PC y lectura de indicadores en celular, manteniendo la identidad visual de GRA Capacitaciones (`docs/design/DESIGN.md`).
- Estandarizar el 100% de los movimientos diarios separando **Caja**, **Categoría tipificada**, **Medio de pago** y **Detalle libre**, sin perder velocidad de carga.
- Proveer indicadores en tiempo real y de cierre mensual (apertura por categoría, por medio de pago, gastos operativos vs. socios, comparativa mensual y evolución de saldos bancarios/deuda).
- Restringir el acceso mediante autenticación con dos roles diferenciados (`Carga` vs. `Carga + Indicadores`).
- Iniciar el sistema con el histórico de **Marzo 2026 a Noviembre 2026** (~950 movimientos) migrado y tipificado desde la planilla actual.

## Requerimientos Funcionales

**Autenticación y Control de Acceso**
- RF-01: El sistema debe exigir inicio de sesión con email y contraseña antes de mostrar cualquier pantalla o dato de la aplicación.
- RF-02: El sistema debe asignar a cada usuario autenticado uno de dos roles: `carga` (solo operación diaria) o `admin` (operación diaria más visión de indicadores y configuración).
- RF-03: El sistema debe impedir que un usuario con rol `carga` acceda a la pantalla de Dashboard de Indicadores.
- RF-04: El sistema debe impedir que un usuario con rol `carga` consulte o modifique los registros de saldos bancarios y deuda mensual.
- RF-05: El sistema debe impedir que un usuario con rol `carga` modifique la configuración de saldos iniciales de las cajas.

**Gestión de Cajas y Configuración de Inicio de Mes**
- RF-06: El sistema debe mantener las 7 cajas operativas de GRA: `GASTOS GRA`, `INGRESOS GRA`, `MERCADO PAGO`, `CORREO ARGENTINO`, `YOLANDA`, `ADRIAN` y `GABRIEL`.
- RF-07: El sistema debe mostrar en tiempo real para el mes activo el `Saldo Inicial`, el total de `Ingresos`, el total de `Egresos` y el `Saldo Actual` (`Saldo Inicial + Ingresos - Egresos`) de cada una de las 7 cajas.
- RF-08: El sistema debe proveer una pantalla de configuración de saldos iniciales por mes (`MM/AAAA`) donde un usuario con rol `admin` defina cómo arranca cada caja eligiendo entre: iniciar en `$0`, arrastrar el saldo final del mes anterior, arrastrar el saldo final del mes anterior más un monto fijo adicional (ej. `$2.000.000` para `ADRIAN` y `GABRIEL`), o ingresar un monto manual.

**Tipificación (Categorías y Medios de Pago)**
- RF-09: El sistema debe incluir precargadas las 22 categorías extraídas de la planilla histórica (Sueldos y Adelantos, Cargas Sociales y Sindicatos, Impuestos y Tasas, Comisiones Mercado Pago, Alquiler y Servicios Oficina, Sistemas y Plataformas, Honorarios Profesionales, Convenios y Certificaciones, Acuerdos y Cuotas, Gastos Bancarios y Préstamos, Logística y Envíos, Oficina Almacén y Librería, Devoluciones, Retiros y Adelantos de Socio, Servicios e Impuestos Personales de Socio, Tarjetas Personales de Socio, Liquidaciones Bancarias, Cobranzas Convenios, Ventas de Capacitaciones, Cobro de Envíos, Ingresos Extraordinarios y Transferencia entre Cajas).
- RF-10: El sistema debe permitir crear una nueva categoría de movimientos indicando su nombre y si aplica a ingresos, egresos o ambos.
- RF-11: El sistema debe permitir editar el nombre de una categoría existente.
- RF-12: El sistema debe permitir desactivar una categoría existente para que no se ofrezca en nuevas cargas, conservando sin cambios los movimientos históricos que la utilicen.
- RF-13: El sistema debe incluir precargados los 6 medios de pago extraídos de la planilla histórica (`Banco Provincia`, `Banco Credicoop`, `Mercado Pago`, `Efectivo`, `Tarjeta Visa / Mastercard`, `Saldo Correo Argentino`).
- RF-14: El sistema debe permitir crear un nuevo medio de pago indicando su nombre.
- RF-15: El sistema debe permitir editar el nombre de un medio de pago existente.
- RF-16: El sistema debe permitir desactivar un medio de pago existente para que no se ofrezca en nuevas cargas, conservando sin cambios los movimientos históricos que lo utilicen.

**Registro Diario de Movimientos**
- RF-17: El sistema debe permitir registrar un movimiento diario indicando `Fecha`, `Tipo` (Ingreso o Egreso), `Caja`, `Categoría`, `Medio de pago`, `Monto` y un campo de texto libre `Detalle`.
- RF-18: El sistema debe permitir, al registrar un ingreso, informar opcionalmente en el mismo formulario un monto de comisión/impuesto descontado (ej. comisión de Mercado Pago), impactando tanto el ingreso bruto como el egreso de comisión en el saldo de esa caja.
- RF-19: El sistema debe proveer una acción de "Transferir entre cajas" que, a partir de `Fecha`, `Caja origen`, `Caja destino`, `Monto`, `Comisión/Impuesto opcional` y `Detalle`, genere automáticamente el egreso en la caja de origen y el ingreso en la caja de destino vinculados entre sí.
- RF-20: El sistema debe permitir editar un movimiento registrado en el mes, recalculando de inmediato el saldo corrido y el saldo actual de la caja afectada.
- RF-21: El sistema debe permitir eliminar un movimiento registrado en el mes, recalculando de inmediato el saldo corrido y el saldo actual de la caja afectada.
- RF-22: El sistema debe listar los movimientos del mes seleccionado mostrando en cada fila la `Fecha`, `Categoría`, `Detalle`, `Medio de pago`, `Caja`, `Ingreso`, `Egreso` y el `Saldo corrido` de esa caja hasta esa fila.
- RF-23: El sistema debe permitir filtrar el listado de movimientos del mes por `Caja`, `Categoría`, `Medio de pago` y búsqueda por texto libre sobre el campo `Detalle`.

**Saldos Bancarios y Deuda Mensual**
- RF-24: El sistema debe permitir a un usuario con rol `admin` registrar para cada mes el `Saldo Inicio de Mes` y el `Saldo Fin de Mes` de `BANCO PROVINCIA`, `BANCO CREDICOOP` y `DEUDA SAN PABLO`.
- RF-25: El sistema debe calcular y mostrar automáticamente el `TOTAL MENSUAL` de inicio y de fin de mes como la suma algebraica de `BANCO PROVINCIA`, `BANCO CREDICOOP` y `DEUDA SAN PABLO`.

**Dashboard de Indicadores y Exportación**
- RF-26: El sistema debe mostrar a los usuarios con rol `admin` en el Dashboard del mes seleccionado el resumen de ingresos operativos, gastos operativos de GRA, retiros/gastos de socios (`ADRIAN` y `GABRIEL`), resultado neto del mes y saldos actuales de las 7 cajas, excluyendo de los totales de ingresos y gastos las transferencias internas entre cajas.
- RF-27: El sistema debe mostrar en el Dashboard el desglose de gastos del mes por `Categoría` y por `Medio de pago`, expresado en monto (`$`) y porcentaje (`%`) sobre el total gastado.
- RF-28: El sistema debe mostrar en el Dashboard la variación en monto (`$`) y porcentaje (`%`) de los gastos totales y por categoría del mes seleccionado respecto al mes inmediato anterior.
- RF-29: El sistema debe mostrar en el Dashboard la evolución histórica mensual de ingresos, gastos operativos, retiros de socios y saldos bancarios/deuda (`BANCO PROVINCIA`, `BANCO CREDICOOP`, `DEUDA SAN PABLO`).
- RF-30: El sistema debe permitir exportar a archivo CSV/Excel el listado de movimientos del mes seleccionado con todas sus columnas tipificadas.

**Migración Histórica Inicial**
- RF-31: El sistema debe incluir un proceso de importación inicial que migre a la base de datos los movimientos y saldos de las pestañas `Marzo 2026` a `Noviembre 2026` de la planilla actual, mapeando cada fila a su `Fecha` normalizada, `Caja`, `Categoría`, `Medio de pago`, `Detalle`, `Ingreso` y `Egreso`.

## Requerimientos No Funcionales

- RNF-01: El tiempo de respuesta al registrar, editar o eliminar un movimiento y actualizar los saldos en pantalla debe ser menor a 1.5 segundos en el percentil 95.
- RNF-02: La carga inicial del Dashboard de Indicadores para un mes de hasta 500 movimientos debe completarse en menos de 2.0 segundos en el percentil 95 en una conexión 4G mobile.
- RNF-03: La interfaz debe ser 100% funcional sin scroll horizontal accidental en viewports desde 360px de ancho (celular para consulta de indicadores y saldos) hasta 1920px de ancho (PC de escritorio para carga administrativa).
- RNF-04: Todo texto sobre fondos de la paleta de marca (`#ffeba6`, `#fed5ee`, `#c7e8ff`, `#ddd9f5`) debe mantener una relación de contraste ≥ 4.5:1 (WCAG 2.1 AA), utilizando negro estructural (`#1b1b1b`) conforme a `docs/design/DESIGN.md`.
- RNF-05: La base de datos y la autenticación deben operar dentro de los límites del plan gratuito de Supabase (`≤ 500 MB` de almacenamiento en base de datos Postgres), soportando al menos 5 años de operación a razón de 1.000 movimientos mensuales.
- RNF-06: Todas las consultas a la base de datos deben aplicar políticas de seguridad a nivel de fila (Row Level Security - RLS en Supabase) verificando el rol del usuario autenticado en el servidor, logrando un 0% de exposición de endpoints o tablas a usuarios no autorizados.

## Criterios de Aceptación

- AC-01 (RF-01, RNF-06): Dado un visitante no autenticado, cuando intenta acceder a cualquier ruta de la aplicación o consultar tablas de Supabase directamente, entonces es redirigido a `/login` y la consulta a la base de datos devuelve código `401`/`403` con `0` registros expuestos.
- AC-02 (RF-02, RF-03): Dado un usuario autenticado con rol `carga`, cuando navega por la aplicación o ingresa por URL a `/indicadores`, entonces el enlace al Dashboard no se renderiza en el menú y la ruta lo redirige a la pantalla de carga diaria sin mostrar ningún indicador global.
- AC-03 (RF-04, RNF-06): Dado un usuario autenticado con rol `carga`, cuando intenta leer o escribir registros de saldos bancarios y deuda mensual (por interfaz o mediante consulta directa al cliente de Supabase), entonces la base de datos rechaza la operación por política RLS devolviendo código `403` y `0` filas.
- AC-04 (RF-05, RNF-06): Dado un usuario autenticado con rol `carga`, cuando intenta ingresar a `/configuracion-mes` o ejecutar un `INSERT`/`UPDATE` sobre la configuración de saldos iniciales en Supabase, entonces es redirigido en la interfaz y la base de datos rechaza la escritura con código `403`.
- AC-05 (RF-06, RF-07): Dado un usuario autenticado en el mes activo, cuando visualiza el panel de cajas, entonces se muestran las 7 cajas (`GASTOS GRA`, `INGRESOS GRA`, `MERCADO PAGO`, `CORREO ARGENTINO`, `YOLANDA`, `ADRIAN`, `GABRIEL`) con su `Saldo Inicial`, `Ingresos`, `Egresos` y `Saldo Actual` exacto al centavo (`Saldo Inicial + Ingresos - Egresos`).
- AC-06 (RF-08): Dado un usuario con rol `admin` que abre la configuración de saldos iniciales de un nuevo mes, cuando selecciona para `ADRIAN` la opción "Saldo final del mes anterior + monto fijo" con `$2.000.000` y guarda, entonces el `Saldo Inicial` de `ADRIAN` en el nuevo mes queda fijado exactamente en la suma del `Saldo Actual` de cierre del mes anterior más `$2.000.000`.
- AC-07 (RF-09): Dado el sistema inicializado, cuando un usuario autenticado despliega el selector de `Categoría`, entonces se listan las 22 categorías iniciales definidas en `RF-09`, sin omisiones.
- AC-08 (RF-10): Dado un usuario autenticado en la gestión de categorías, cuando crea una categoría con nombre `"Publicidad Meta"` y tipo `"Egreso"`, entonces la categoría se persiste en la base de datos y aparece en el selector al cargar un nuevo egreso.
- AC-09 (RF-11): Dado un usuario autenticado en la gestión de categorías, cuando modifica el nombre de una categoría existente y guarda, entonces el nuevo nombre se refleja tanto en el selector de carga como en las filas históricas asociadas a esa categoría.
- AC-10 (RF-12): Dado un usuario autenticado en la gestión de categorías, cuando desactiva una categoría que tiene movimientos históricos asociados, entonces la categoría deja de aparecer en el selector para cargas nuevas y los movimientos históricos que la tenían asignada conservan su categoría e importe sin cambios.
- AC-11 (RF-13): Dado el sistema inicializado, cuando un usuario autenticado despliega el selector de `Medio de pago`, entonces se listan los 6 medios de pago iniciales definidos en `RF-13` (`Banco Provincia`, `Banco Credicoop`, `Mercado Pago`, `Efectivo`, `Tarjeta Visa / Mastercard`, `Saldo Correo Argentino`).
- AC-12 (RF-14): Dado un usuario autenticado en la gestión de medios de pago, cuando crea un medio de pago con nombre `"Cheque"`, entonces se persiste en la base de datos y aparece en el selector de carga de movimientos.
- AC-13 (RF-15): Dado un usuario autenticado en la gestión de medios de pago, cuando edita el nombre de un medio de pago existente y guarda, entonces el nuevo nombre se refleja en el selector de carga y en los movimientos históricos asociados.
- AC-14 (RF-16): Dado un usuario autenticado en la gestión de medios de pago, cuando desactiva un medio de pago con movimientos históricos asociados, entonces deja de ofrecerse en el selector para cargas nuevas y los movimientos históricos conservan su medio de pago sin cambios.
- AC-15 (RF-17, RF-22): Dado un usuario autenticado en la pantalla de carga diaria, cuando registra un egreso con `Fecha`, `Caja = GASTOS GRA`, `Categoría = Alquiler y Servicios Oficina`, `Medio de pago = Banco Provincia`, `Monto = $144.232` y `Detalle = "Movistar"`, entonces el movimiento aparece en el listado del mes con esas 7 columnas y el `Saldo corrido` de esa fila y el `Saldo Actual` de `GASTOS GRA` disminuyen en `$144.232`.
- AC-16 (RF-18): Dado un usuario que registra un ingreso en la caja `MERCADO PAGO` por `$195.000` e ingresa en el campo opcional de comisión/impuesto `$16.745,90`, cuando guarda el formulario, entonces el sistema registra el ingreso de `$195.000` y el egreso por comisión de `$16.745,90`, incrementando el `Saldo Actual` de `MERCADO PAGO` en el neto exacto de `$178.254,10`.
- AC-17 (RF-19): Dado un usuario que ejecuta "Transferir entre cajas" desde `MERCADO PAGO` hacia `CORREO ARGENTINO` por `$22.000` con comisión de transferencia de `$132`, cuando confirma la operación, entonces se crean el egreso en `MERCADO PAGO` y el ingreso en `CORREO ARGENTINO` vinculados entre sí, disminuyendo el saldo de `MERCADO PAGO` en `$22.132` y aumentando el saldo de `CORREO ARGENTINO` en `$22.000`.
- AC-18 (RF-20): Dado un movimiento existente en el mes por `$10.000`, cuando el usuario edita su monto a `$15.000` y guarda, entonces el `Saldo corrido` desde esa fila y el `Saldo Actual` de la caja se recalculan mostrando la diferencia de `$5.000`.
- AC-19 (RF-21): Dado un movimiento existente en el mes, cuando el usuario confirma su eliminación, entonces la fila desaparece del listado y el `Saldo corrido` y el `Saldo Actual` de la caja se recalculan sin ese movimiento.
- AC-20 (RF-23): Dado un listado mensual con múltiples movimientos, cuando el usuario selecciona `Caja = ADRIAN`, `Categoría = Servicios e Impuestos Personales de Socio`, `Medio de pago = Banco Provincia` y escribe `"gas"` en el buscador, entonces la tabla muestra únicamente las filas que cumplen los cuatro filtros simultáneamente.
- AC-21 (RF-24): Dado un usuario con rol `admin`, cuando ingresa y guarda los valores de `Saldo Inicio de Mes` y `Saldo Fin de Mes` para `BANCO PROVINCIA`, `BANCO CREDICOOP` y `DEUDA SAN PABLO`, entonces los 6 valores quedan persistidos para ese período mensual.
- AC-22 (RF-25): Dado un mes con valores cargados en `BANCO PROVINCIA`, `BANCO CREDICOOP` y `DEUDA SAN PABLO`, cuando se visualiza el cuadro bancario/deuda, entonces la fila `TOTAL MENSUAL` muestra en inicio y en fin de mes la suma algebraica exacta de los tres conceptos.
- AC-23 (RF-26): Dado un usuario con rol `admin` en el Dashboard del mes seleccionado donde existe una transferencia entre cajas de `$22.000`, cuando consulta las tarjetas de resumen, entonces ve el total de ingresos operativos, gastos operativos de GRA, retiros/gastos de socios (`ADRIAN` y `GABRIEL`), resultado neto y saldos de las 7 cajas, sin que los `$22.000` transferidos entre cajas estén sumados en ingresos operativos ni en gastos operativos.
- AC-24 (RF-27): Dado un usuario con rol `admin` en el Dashboard de un mes con gastos registrados, cuando consulta los desgloses por `Categoría` y por `Medio de pago`, entonces cada ítem muestra su monto en `$` y su porcentaje `%`, y la suma de los porcentajes de cada desglose es igual a `100%`.
- AC-25 (RF-28): Dado un usuario con rol `admin` en el Dashboard de un mes cuyo mes inmediato anterior tiene movimientos, cuando visualiza la comparativa mensual, entonces se muestra para el gasto total y para cada categoría la diferencia en `$` y la variación porcentual `%` respecto al mes anterior.
- AC-26 (RF-29): Dado un usuario con rol `admin` en el Dashboard, cuando visualiza la sección de evolución histórica, entonces se muestra mes a mes la serie de ingresos operativos, gastos operativos, retiros de socios y el cuadro histórico de `BANCO PROVINCIA`, `BANCO CREDICOOP` y `DEUDA SAN PABLO`.
- AC-27 (RF-30): Dado un usuario en el listado mensual, cuando hace clic en "Exportar CSV/Excel", entonces se descarga un archivo que contiene todas las filas del mes con las columnas `Fecha`, `Caja`, `Categoría`, `Medio de Pago`, `Detalle`, `Ingreso`, `Egreso` y `Saldo`.
- AC-28 (RF-31): Dado el sistema inicializado tras ejecutar la migración histórica, cuando un usuario con rol `admin` selecciona cualquiera de los meses entre `Marzo 2026` y `Noviembre 2026`, entonces el `Saldo Actual` de cada una de las 7 cajas coincide con el `SALDO ACTUAL` de la tabla resumen lateral de la planilla original de ese mes.
- AC-29 (RNF-01): Dado un usuario autenticado operando en producción, cuando registra, edita o elimina un movimiento, entonces la mutación y la actualización del saldo en pantalla se completan en `< 1.5 segundos` en el percentil 95.
- AC-30 (RNF-02): Dado un mes con 500 movimientos cargados, cuando un usuario con rol `admin` abre el Dashboard simulando una red 4G mobile, entonces la carga completa de los indicadores finaliza en `< 2.0 segundos` en el percentil 95.
- AC-31 (RNF-03): Dado cualquier pantalla de la aplicación abierta en un viewport de `360px` y en uno de `1920px`, cuando se mide el ancho del documento, entonces `document.documentElement.scrollWidth` es menor o igual a `window.innerWidth` (sin scroll horizontal accidental).
- AC-32 (RNF-04): Dado cualquier texto renderizado sobre los fondos de marca `#ffeba6`, `#fed5ee`, `#c7e8ff` y `#ddd9f5`, cuando se audita la página con Lighthouse Accessibility, entonces el contraste medido es `≥ 4.5:1` sin errores de contraste reportados.
- AC-33 (RNF-05): Dado un entorno de prueba en Supabase Free con `60.000` movimientos insertados (equivalentes a 5 años a razón de 1.000 movimientos por mes), cuando se consulta el tamaño ocupado por la base de datos Postgres, entonces el almacenamiento total utilizado es `≤ 500 MB`.

## Fuera de Alcance

- Integración con el sitio web público comercial de GRA Capacitaciones (`www.gracapacitaciones.com`): no comparten base de datos ni rutas; de la web solo se toman los tokens de diseño y estética (`docs/design/DESIGN.md`).
- Sincronización bidireccional en vivo con Google Sheets (la planilla actual se migra una única vez para poblar el histórico y deja de usarse).
- Facturación electrónica, emisión de recibos o integración con ARCA/AFIP.
- Conexión automática por API con bancos (Banco Provincia, Credicoop), Mercado Pago o Correo Argentino (toda la carga sigue siendo manual por las administrativas).
- Gestión de legajos de empleados, liquidación automática de sueldos o recibos de sueldo.
- Adjunto de fotos/PDFs de comprobantes o tickets (para conservar el uso de almacenamiento muy por debajo del límite de Supabase Free).
- Soporte multi-moneda (todos los montos son en Pesos Argentinos `ARS`).
- Aplicación nativa iOS/Android en tiendas (se resuelve como aplicación web responsive accesible desde el navegador del celular y de la PC).

## Riesgos y Dependencias

- **Riesgo:** el plan gratuito de Supabase pausa automáticamente los proyectos que no registran actividad durante 7 días consecutivos. *Mitigación:* dado que es una caja diaria, habrá actividad todos los días hábiles; adicionalmente, configurar un cron liviano (ej. GitHub Actions o Vercel Cron cada 3 días) que haga un ping de lectura a Supabase para evitar cualquier pausa en vacaciones o recesos.
- **Riesgo:** en la planilla histórica (`Marzo 2026` a `Noviembre 2026`) existen fechas mal tipeadas (ej. `04/058/2026`, `04/06/0206`, `11/11/0226`, `6709427`), conceptos con múltiples variantes ortográficas y un par de filas donde el saldo inicial fue ajustado a mano en la fórmula. *Mitigación:* el script de migración inicial normalizará las fechas inválidas interpolando la fecha de la fila adyacente del mismo mes, aplicará un diccionario de reglas para mapear cada concepto a su `Categoría` y `Medio de pago`, y conservará el texto original íntegro en el campo `Detalle` para no perder ninguna referencia.
- **Riesgo:** que las administrativas carguen una transferencia entre cajas como un gasto normal en vez de usar el botón "Transferir entre cajas", inflando los gastos del mes en el Dashboard. *Mitigación:* destacar el botón "Transferir entre cajas" junto al de "Nuevo movimiento" y excluir automáticamente de los totales de gastos/ingresos del Dashboard cualquier movimiento cuya categoría sea `Transferencia entre Cajas`.
- **Dependencia:** creación del proyecto en Supabase Free y definición de los emails de las cuentas iniciales para los roles `carga` (administrativas) y `admin` (socios).
