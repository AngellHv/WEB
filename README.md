# GALATECH

Sistema de seguimiento y gestión de reparaciones con Angular 21, Spring Boot 3.5 y Supabase PostgreSQL. Angular solo consume la API REST; las credenciales de PostgreSQL y la lógica de acceso viven en Spring Boot.

## Estructura

- `src/`: sitio público, seguimiento, inicio de sesión y paneles Angular.
- `backend/`: API REST, JPA, JWT, BCrypt y control de acceso por rol.
- `database/galatech_schema.sql`: esquema idempotente documentado y ampliaciones aplicadas.

## Requisitos

- Node.js compatible con Angular CLI 21 y npm.
- JDK 21 y Maven 3.9 o superior.
- Proyecto Supabase activo con acceso PostgreSQL. Las tablas se migraron sin eliminar filas ni relaciones a `usuarios`, `clientes`, `equipos`, `reparaciones` e `historial_reparaciones`.

## Configurar PostgreSQL y administrador

1. Copia `backend/.env.example` a `backend/.env`.
2. En Supabase abre **Database > Connect** y copia host, puerto, usuario y contraseña. Usa SSL (`sslmode=require`) en `DB_URL`.
3. Reemplaza `DB_PASSWORD` con la contraseña de base de datos. No es la contraseña de Supabase Auth.
4. Define `JWT_SECRET` como una cadena aleatoria de 32 bytes o más.
5. Define `ADMIN_EMAIL` y `ADMIN_PASSWORD` (mínimo 12 caracteres). Spring crea ese administrador solo si el correo aún no existe. Las credenciales no se incluyen en el repositorio.
6. `backend/.env` está ignorado por Git.

La instancia Supabase MCP inspeccionada fue `pquntjfnuatlltrwukzx` (PostgreSQL 17.12). Las columnas agregadas se aplicaron en remoto mediante MCP. El script SQL permite reproducir/verificar la estructura, y usa `IF NOT EXISTS` para conservar filas existentes.

El entorno remoto contiene registros de demostración: cinco reparaciones cubren los estados desde recepción hasta entrega, con clientes, equipos, técnicos y quince eventos de historial. Códigos públicos de prueba: `GT-DEMO-0001` a `GT-DEMO-0005`. Las cuentas de demostración se entregaron fuera del repositorio.

## Ejecutar

Terminal 1, API:

```powershell
cd backend
Copy-Item .env.example .env  # solo la primera vez
mvn spring-boot:run
```

Terminal 2, Angular:

```powershell
npm install
npm start
```

Abre `http://localhost:4200`. La API queda en `http://localhost:8080/api`. La URL se configura en `src/app/core.ts` (`API_URL`) para despliegues.

## API principal

- `POST /api/auth/login`: autentica correo/contraseña y entrega JWT.
- `/api/usuarios`: gestión de técnicos (solo ADMIN).
- `/api/clientes`, `/api/equipos`: el administrador registra y edita clientes y registra equipos.
- `/api/reparaciones`: administrador lista y registra órdenes con técnico asignado; el técnico solo lista y consulta sus órdenes asignadas.
- `PATCH /api/reparaciones/{id}/asignacion`: asigna o reasigna una orden (ADMIN).
- `PATCH /api/reparaciones/{id}/estado`: avance de reparación (TECHNICIAN).
- `GET /api/seguimiento/{codigo}`: consulta pública con campos autorizados únicamente.
- `GET /api/dashboard`: estadísticas según el rol.

Roles persistidos: `ADMIN` y `TECHNICIAN`. El cliente no inicia sesión; consulta su código. Estados disponibles: recibido, en diagnóstico, en reparación, reparación terminada y entregado.

## Seguridad y datos

- BCrypt para contraseñas; JWT firmado en el backend.
- Guards e interceptor Angular complementan la autorización obligatoria del backend.
- El DTO público no contiene correo/teléfono del cliente, observaciones internas ni campos de seguridad.
- RLS se mantiene activa y sin políticas de acceso directo para el Data API; Spring se conecta a PostgreSQL por JDBC. No se usa Supabase Auth ni Edge Functions.
- `spring.jpa.hibernate.ddl-auto=validate`: Hibernate no altera el esquema remoto.

## Verificación realizada

- `npm run build`: correcto.
- `mvn -DskipTests package`: correcto.
- La conexión runtime a Supabase y el flujo de login requieren los valores privados de `backend/.env`; no hay credenciales configuradas en el workspace y por eso no se declaran como comprobados.
