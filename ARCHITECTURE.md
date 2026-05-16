# Centro Comunícame — Arquitectura del Sistema

## Stack
- **Frontend**: Next.js 16.2.4 (Turbopack) + React 19 + Tailwind CSS v4
- **BD**: Supabase (PostgreSQL) — autenticación, base de datos, RLS, triggers
- **Deploy**: Vercel (conectado a GitHub, rama `main`, deploy automático)
- **Librerías**: date-fns, lucide-react, react-big-calendar, jspdf, jspdf-autotable, xlsx, @supabase/ssr

---

## Rutas / Páginas

| Ruta | Archivo | Tipo | Descripción |
|------|---------|------|-------------|
| `/` | `src/app/page.tsx` | Server (ƒ) | Dashboard ejecutivo: métricas del día, carga por profesional, alertas de tokens |
| `/login` | `src/app/login/page.tsx` | Client (○) | Login con email/contraseña. Sin registro público |
| `/asistencia` | `src/app/asistencia/page.tsx` | Server (ƒ) | Control operativo diario: grilla de asistencias por profesional/hora |
| `/planificacion` | `src/app/planificacion/page.tsx` | Client (○) | Agenda oficial semanal: grilla de citas por profesional/día/hora |
| `/pacientes` | `src/app/pacientes/page.tsx` | Client (○) | CRUD de pacientes + historial clínico + billetera de tokens |
| `/informes` | `src/app/informes/page.tsx` | Client (○) | CRUD de informes solicitados |
| `/ados2` | `src/app/ados2/page.tsx` | Client (○) | Citaciones ADOS-2: entrevista → evaluación → informe |
| `/inventario` | `src/app/inventario/page.tsx` | Client (○) | CRUD de inventario: materiales terapéuticos, insumos, aseo |
| `/config` | `src/app/config/page.tsx` | Client (○) | Panel de maestros: terapeutas, pacientes, cuentas de usuario |

---

## Componentes

| Componente | Archivo | Usado por | Descripción |
|------------|---------|-----------|-------------|
| `Sidebar` | `src/components/Sidebar.tsx` | `layout.tsx` | Menú lateral con módulos según rol (admin/profesional). Cerrar sesión |
| `VistaDiaria` | `src/components/VistaDiaria.tsx` | `/asistencia` | Grilla de asistencia diaria, selector de fecha DD/MM/YYYY, export PDF/Excel |
| `ModalGestionarBloque` | `src/components/ModalGestionarBloque.tsx` | `VistaDiaria` | Modal para crear/editar asistencias, buscar paciente, referenciar cita oficial |
| `ModalAgendar` | `src/components/ModalAgendar.tsx` | `/planificacion` | Crear nueva cita en agenda oficial, replicar hasta fin de mes, marcar recuperación |
| `ModalDetalleCita` | `src/components/ModalDetalleCita.tsx` | `/planificacion` | Editar/eliminar cita existente: paciente, profesional, fecha, estado, observación |
| `ModalPlanificacion` | `src/components/ModalPlanificacion.tsx` | `VistaDiariaOficial` | **Huérfano** — no usado actualmente |
| `CalendarioAgendamiento` | `src/components/CalendarioAgendamiento.tsx` | — | **Huérfano** — tema claro, no integrado |
| `VistaDiariaOficial` | `src/components/VistaDiariaOficial.tsx` | — | **Huérfano** — no usado actualmente |
| `ThemeSelector` | `src/components/ThemeSelector.tsx` | `Sidebar` | Toggle entre tema oscuro y tema pastel |
| `AuthProvider` | `src/lib/auth.tsx` | `layout.tsx` | Contexto de autenticación: sesión, rol, login/logout |

---

## Base de Datos (Supabase)

### Tablas principales

| Tabla | Columnas clave | Descripción |
|-------|---------------|-------------|
| `paciente` | id, nombre_completo, fecha_ingreso, fecha_nacimiento, nombre_apoderado, telefono_contacto, rut, diagnostico, tokens_disponibles, activo | Pacientes del centro |
| `profesional` | id, nombre, especialidad | Terapeutas (TO, FONO, PSICOPEDAGOGO) |
| `cita` | id, paciente_id, profesional_id, fecha_hora_inicio, fecha_hora_fin, estado, es_recuperacion, observacion, planificacion_id | Agenda oficial |
| `asistencia` | id, cita_oficial_id, profesional_id, fecha_hora_ejecucion, estado, observacion | Ejecución real de citas |
| `paciente_token_ledger` | id, paciente_id, tipo_operacion, cantidad, referencia_asistencia_id, observacion | Libro mayor de tokens |
| `user_roles` | user_id, rol, profesional_id | Roles de usuario (admin/profesional) |
| `planificacion_semanal` | id, paciente_id, profesional_id, dia_semana, hora_inicio, duracion_minutos, activo | Planificación semanal recurrente |
| `inventario` | id, categoria, articulo, cantidad, estado | Inventario del centro |
| `informe_solicitado` | id, paciente_id, profesional_id, fecha_solicitud, fecha_entrega_esperada, estado, nota_observacion | Informes clínicos |
| `citacion_ados2` | id, examinador_id, nombre_tutor, nombre_usuario, edad, telefono, fecha_hora_entrevista, entrevista_realizada, fecha_hora_evaluacion, evaluacion_realizada, fecha_entrega_informe, informe_entregado | Evaluaciones ADOS-2 |
| `bloqueos` | id, profesional_id, dia_semana, hora_inicio, hora_fin, motivo, es_recurrente | Bloqueos de horario |
| `lista_espera_cupo` | id, paciente_id, profesional_id, dia_semana, hora_inicio_preferida, hora_fin_preferida, estado | Lista de espera |
| `paciente_cuota_mensual` | paciente_id, especialidad, cuota_mensual | Cuota mensual por especialidad |

### Vistas

| Vista | Descripción |
|-------|-------------|
| `vw_control_panel_agendamiento` | Panel de control: paciente_id, nombre_completo, saldo_tokens, estado_operativo, proxima_fecha_corte |

### Triggers

| Trigger | Tabla | Función |
|---------|-------|---------|
| `trg_procesar_token_asistencia` | `asistencia` | Al INSERT/UPDATE/DELETE de asistencia: si estado=ASISTE inserta CONSUMO_ASISTENCIA (-1). Si cambia de ASISTE a otro, inserta REEMBOLSO_ASISTENCIA (+1) |
| `trg_actualizar_balance_tokens` | `paciente_token_ledger` | Recalcula paciente.tokens_disponibles = SUM(cantidad) del ledger |

### Constraints importantes

```
paciente_token_ledger_tipo_operacion_check:
  CHECK (tipo_operacion IN (
    'PAGO_CICLO', 'AJUSTE_MANUAL_AGREGAR', 'AJUSTE_MANUAL_ELIMINAR',
    'CONSUMO_ASISTENCIA', 'REEMBOLSO_ASISTENCIA'
  ))
```

### RLS (Row Level Security)

| Tabla | Admin | Profesional |
|-------|-------|-------------|
| `cita` | Full access | SELECT solo de sus citas |
| `asistencia` | Full access | SELECT/INSERT/UPDATE/DELETE solo de sus asistencias |
| `paciente` | Full access | SELECT (read-only) |
| `paciente_token_ledger` | Full access | — |
| `inventario` | Full access | SELECT |
| `informe_solicitado` | Full access | — |
| `citacion_ados2` | Full access | — |
| `planificacion_semanal` | Full access | — |
| `profesional` | Full access | SELECT |
| `user_roles` | Full access | SELECT |

---

## Reglas de Negocio

### Sistema de Tokens
- Cada paciente tiene `tokens_disponibles` (suma del ledger vía trigger)
- **Pago de ciclo**: +4 tokens (botón "Registrar Pago" en ficha del paciente)
- **Consumo por sesión**: -1 token automático al marcar ASISTE (trigger)
- **Reembolso**: +1 token si se cambia de ASISTE a otro estado (trigger)
- **Ajuste manual**: agregar/quitar tokens con observación obligatoria
- El saldo se ve en el Dashboard y en la ficha del paciente

### Estados de Cita / Asistencia
| Estado | Significado | Dónde se usa |
|--------|-------------|--------------|
| AGENDADA | Cita creada, sin confirmar | Agenda Oficial y Asistencia Diaria |
| CONFIRMADA | Tutor confirmó asistencia | Ambas |
| ASISTE | Paciente asistió | Asistencia Diaria (se sincroniza a Agenda) |
| NO_ASISTE | Paciente no asistió | Asistencia Diaria (se sincroniza a Agenda) |
| CANCELADA | Cita cancelada | Agenda Oficial |

- Al guardar en Asistencia Diaria, el estado se sincroniza automáticamente a la cita en Agenda Oficial
- Al marcar "recuperación" en Asistencia Diaria, se crea una réplica de la cita en Agenda Oficial y se marca `es_recuperacion = true`

### Replicación de Citas
- Al crear una cita en Agenda Oficial: se replica automáticamente para todos los días del mismo nombre (ej: todos los martes) hasta fin de mes
- No aplica para sesiones de recuperación

### Profesionales
- Orden fijo en VistaDiaria: Rosa → Valentina → Karina → resto alfabético
- Especialidades: TO (Terapeuta Ocupacional), FONO (Fonoaudiólogo/a), PSICOPEDAGOGO

---

## Autenticación

### Flujo de Login
1. Admin crea cuenta de profesional desde `/config → Cuentas`
2. Supabase envía email de confirmación
3. Usuario inicia sesión en `/login` con email + contraseña
4. `AuthProvider` consulta `user_roles` y redirige según rol:
   - Admin → `/` (Dashboard)
   - Profesional → `/asistencia` (solo ve su columna)
5. Sin sesión → redirige a `/login`
6. Protección de rutas: client-side via `AuthProvider`

### Roles
- **Admin**: acceso total a todos los módulos
- **Profesional**: solo ve `/asistencia` con su columna filtrada

### Creación de cuentas
- El primer admin se crea desde Supabase Dashboard → Authentication → Users → Add User
- Luego se inserta manualmente en `user_roles`: `INSERT INTO user_roles (user_id, rol) VALUES ('uuid', 'admin')`
- Los profesionales se crean desde `/config → Cuentas` (solo visible para admin)

---

## Formato de Fechas
- **Selector**: texto DD/MM/YYYY con flechas `< >` para navegar días
- **Display**: `jueves 15/05/2026`
- **Badges**: `dd/MM/yyyy HH:mm`
- **Persistencia**: la fecha se guarda en la URL (`?fecha=2026-05-15`, `?semana=2026-05-12`)

---

## Exportación
- **PDF**: `jspdf` + `jspdf-autotable`. Landscae, 5 secciones: grilla plana del día, resumen general del mes, por profesional, por paciente, alertas tokens
- **Excel**: `xlsx`. Tabla plana con todas las columnas

---

## Convenciones de Código
- Tema oscuro (slate-900/950) con opción pastel (data-theme="pastel")
- Modales: `bg-slate-900 rounded-2xl border border-slate-700`
- Labels: `text-[10px] font-black uppercase tracking-widest`
- Botones primarios: `bg-blue-600 hover:bg-blue-500`
- Estados: verde (ASISTE/éxito), rojo (NO_ASISTE/error), ámbar (AGENDADA/pendiente), púrpura (recuperación)
- Sin comentarios en código (solo donde sea estrictamente necesario)
