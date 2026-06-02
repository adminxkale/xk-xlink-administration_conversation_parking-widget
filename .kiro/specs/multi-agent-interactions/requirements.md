# Requirements Document

## Introduction

El Conversation Parking Widget actualmente muestra interacciones únicamente para el agente autenticado. Esta feature extiende el widget para que un agente principal (administrador/supervisor) pueda visualizar y gestionar las interacciones de todos los agentes bajo su administración. Se introduce una nueva API que, dado el ID del agente principal, retorna los IDs y nombres de los agentes administrados. Las interacciones de todos esos agentes se consultan, combinan y presentan con filtros avanzados para facilitar la búsqueda y gestión.

## Glossary

- **Widget**: La aplicación web embebida Conversation Parking Hub
- **Principal_Agent**: El agente autenticado que tiene rol de administrador o supervisor sobre otros agentes
- **Managed_Agent**: Un agente cuyo ID y nombre son retornados por la Managed_Agents_API para un Principal_Agent dado. Estructura: `{ id: string, name: string }`
- **Managed_Agents_API**: Endpoint externo que, dado el ID de un Principal_Agent, retorna la lista de agentes bajo su administración con sus IDs y nombres
- **Interaction_Service**: Servicio que obtiene las interacciones de un agente dado su ID
- **Interaction**: Conversación de mensajería entre un agente y un cliente, con campos id, originLine, destinationLine, startTimestamp, isParked, clientName, agentId, agentName, queueId
- **Filter_Panel**: Componente de UI que permite al Principal_Agent filtrar las interacciones combinadas por múltiples criterios
- **Proxy_Route**: Ruta de Next.js que reenvía peticiones a APIs externas manteniendo secretos en el servidor

## Requirements

### Requirement 1: Obtener agentes administrados

**User Story:** Como agente principal, quiero que el sistema obtenga automáticamente la lista de agentes bajo mi administración, para que pueda ver sus interacciones sin configuración manual.

#### Acceptance Criteria

1. WHEN el Principal_Agent se autentica exitosamente, THE Widget SHALL invocar la Managed_Agents_API con el ID del Principal_Agent para obtener la lista de Managed_Agents (ID y nombre de cada uno)
2. IF la Managed_Agents_API retorna un error HTTP o no está disponible, THEN THE Widget SHALL mostrar un mensaje de error descriptivo y ofrecer un botón de reintento
3. IF la Managed_Agents_API retorna una lista vacía, THEN THE Widget SHALL mostrar un estado vacío indicando que no hay agentes administrados
4. THE Proxy_Route para la Managed_Agents_API SHALL reenviar la petición al endpoint externo utilizando autenticación Basic Auth server-side
5. THE Widget SHALL almacenar la lista de Managed_Agents (ID y nombre) en memoria para uso en filtros y consultas de interacciones

### Requirement 2: Consultar interacciones de múltiples agentes

**User Story:** Como agente principal, quiero ver las interacciones de todos mis agentes administrados en una sola vista, para poder supervisar la actividad de mi equipo de forma centralizada.

#### Acceptance Criteria

1. WHEN la lista de Managed_Agents está disponible, THE Widget SHALL consultar las interacciones de cada Managed_Agent en paralelo utilizando el Interaction_Service
2. THE Widget SHALL combinar todas las interacciones obtenidas en una única lista ordenada por startTimestamp descendente (más recientes primero)
3. IF la consulta de interacciones falla para uno o más Managed_Agents, THEN THE Widget SHALL mostrar las interacciones obtenidas exitosamente y notificar al Principal_Agent mediante un toast de advertencia indicando cuántos agentes fallaron
4. WHILE las interacciones se están cargando, THE Widget SHALL mostrar un indicador de carga (skeleton loader)
5. WHEN el Principal_Agent presiona el botón de refrescar, THE Widget SHALL volver a consultar las interacciones de todos los Managed_Agents

### Requirement 3: Mostrar información del agente en cada interacción

**User Story:** Como agente principal, quiero identificar a qué agente pertenece cada interacción, para poder hacer seguimiento individual.

#### Acceptance Criteria

1. THE Widget SHALL mostrar el nombre del Managed_Agent de forma visible en cada tarjeta de interacción
2. IF una interacción no tiene agentName definido, THEN THE Widget SHALL mostrar el texto "Agente desconocido" en su lugar
3. THE Widget SHALL utilizar el nombre obtenido de la Managed_Agents_API como fuente primaria para identificar al agente propietario de cada interacción

### Requirement 4: Filtro por nombre de agente

**User Story:** Como agente principal, quiero filtrar las interacciones por agente específico, para poder enfocarme en la actividad de un miembro particular de mi equipo.

#### Acceptance Criteria

1. THE Filter_Panel SHALL incluir un selector desplegable con la lista de Managed_Agents (mostrando el nombre de cada agente) más una opción "Todos los agentes"
2. WHEN el Principal_Agent selecciona un agente del filtro, THE Widget SHALL mostrar únicamente las interacciones cuyo agentId coincida con el ID del agente seleccionado
3. WHEN el Principal_Agent selecciona "Todos los agentes", THE Widget SHALL mostrar todas las interacciones combinadas

### Requirement 5: Filtro por estado de parqueo

**User Story:** Como agente principal, quiero filtrar las interacciones por su estado (parqueada o activa), para poder identificar rápidamente las conversaciones que requieren atención.

#### Acceptance Criteria

1. THE Filter_Panel SHALL incluir un selector con las opciones: "Todas", "Parqueadas", "Activas"
2. WHEN el Principal_Agent selecciona "Parqueadas", THE Widget SHALL mostrar únicamente las interacciones con isParked igual a true
3. WHEN el Principal_Agent selecciona "Activas", THE Widget SHALL mostrar únicamente las interacciones con isParked igual a false
4. THE Widget SHALL mostrar el conteo de interacciones visibles después de aplicar los filtros

### Requirement 6: Filtro por línea de origen

**User Story:** Como agente principal, quiero filtrar las interacciones por línea de origen (número de negocio), para poder analizar la actividad por canal.

#### Acceptance Criteria

1. THE Filter_Panel SHALL incluir un selector desplegable con las líneas de origen únicas extraídas de las interacciones cargadas, más una opción "Todas las líneas"
2. WHEN el Principal_Agent selecciona una línea, THE Widget SHALL mostrar únicamente las interacciones cuyo originLine coincida con la línea seleccionada

### Requirement 7: Filtro por texto libre (búsqueda)

**User Story:** Como agente principal, quiero buscar interacciones por nombre de cliente o número de destino, para poder localizar rápidamente una conversación específica.

#### Acceptance Criteria

1. THE Filter_Panel SHALL incluir un campo de texto con placeholder "Buscar por cliente o número..."
2. WHEN el Principal_Agent escribe en el campo de búsqueda, THE Widget SHALL filtrar las interacciones mostrando solo aquellas cuyo clientName o destinationLine contengan el texto ingresado (búsqueda case-insensitive)
3. WHEN el campo de búsqueda está vacío, THE Widget SHALL mostrar todas las interacciones (respetando los demás filtros activos)

### Requirement 8: Combinación de filtros

**User Story:** Como agente principal, quiero aplicar múltiples filtros simultáneamente, para poder hacer búsquedas precisas en un volumen grande de interacciones.

#### Acceptance Criteria

1. THE Widget SHALL aplicar todos los filtros activos de forma conjuntiva (AND lógico): agente, estado de parqueo, línea de origen y texto de búsqueda
2. WHEN ninguna interacción cumple con los filtros aplicados, THE Widget SHALL mostrar un estado vacío con el mensaje "No se encontraron interacciones con los filtros aplicados"
3. THE Filter_Panel SHALL incluir un botón "Limpiar filtros" que restablezca todos los filtros a su valor por defecto

### Requirement 9: Ruta proxy para la API de agentes administrados

**User Story:** Como desarrollador, quiero que la llamada a la Managed_Agents_API pase por una ruta proxy de Next.js, para mantener los secretos de autenticación en el servidor.

#### Acceptance Criteria

1. THE Proxy_Route SHALL estar disponible en la ruta `/api/proxy-managed-agents`
2. THE Proxy_Route SHALL aceptar un query parameter `principal_agent_id` de tipo string
3. IF el query parameter `principal_agent_id` no está presente, THEN THE Proxy_Route SHALL retornar un error HTTP 400 con un mensaje descriptivo
4. THE Proxy_Route SHALL reenviar la petición al endpoint externo de la Managed_Agents_API con autenticación Basic Auth server-side
5. THE Proxy_Route SHALL retornar la respuesta en formato JSON como un array de objetos con estructura `{ id: string, name: string }`
