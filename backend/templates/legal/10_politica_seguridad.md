# POLITICA DE SEGURIDAD — Resumen Ejecutivo

**St4rtup**
**Documento**: RS-SEC-POL-001
**Version**: 1.0 | **Fecha**: Marzo 2026

---

## 1. Compromiso de la Direccion
St4rtup se compromete a proteger la confidencialidad, integridad y disponibilidad de la informacion de sus clientes y de la propia organizacion, conforme a los requisitos del Esquema Nacional de Seguridad (ENS) nivel Alto y la norma ISO 27001.

## 2. Alcance
Esta politica aplica a toda la infraestructura, sistemas, aplicaciones, datos y personal de St4rtup, incluyendo la plataforma GRC SaaS y todos los servicios asociados.

## 3. Marco normativo
- Esquema Nacional de Seguridad (RD 311/2022) — Nivel Alto
- Reglamento (UE) 2016/679 (RGPD)
- Ley Organica 3/2018 (LOPDGDD)
- Directiva (UE) 2022/2555 (NIS2)
- ISO/IEC 27001:2022
- ISO/IEC 27002:2022

## 4. Principios de seguridad

### 4.1 Defensa en profundidad
Multiples capas de proteccion en todos los niveles (red, aplicacion, datos, acceso).

### 4.2 Minimo privilegio
Acceso restringido al minimo necesario para cada funcion.

### 4.3 Seguridad por defecto
Configuraciones seguras por defecto en todos los sistemas.

### 4.4 Soberania de datos
Todos los datos de clientes se almacenan y procesan exclusivamente en la Union Europea.

## 5. Medidas tecnicas implementadas

| Control | Implementacion |
|---------|---------------|
| Cifrado en transito | TLS 1.3 en todas las comunicaciones |
| Cifrado en reposo | AES-256 (PostgreSQL) + Fernet AES-128-CBC (credentials) |
| Autenticacion | JWT + Supabase Auth (bcrypt + MFA opcional) |
| Autorizacion | RBAC (Role-Based Access Control) |
| Audit trail | Registro completo de acciones con PII redaction |
| Backups | Diarios, cifrados, retencion 30 dias |
| Monitorizacion | Health checks continuos, alertas automaticas |
| Gestion de vulnerabilidades | Dependabot + actualizaciones mensuales |
| Control de acceso | SSH con claves, sin acceso root directo |
| Gestion de secretos | Fly.io Secrets (cifrados en reposo) + Credential Store interno |

## 6. Medidas organizativas

| Control | Implementacion |
|---------|---------------|
| Responsable de seguridad | David Moya Garcia (CTO) |
| Formacion | Concienciacion anual en seguridad |
| Gestion de incidentes | Procedimiento documentado, notificacion 48h |
| Continuidad de negocio | Plan de recuperacion con RPO < 24h, RTO < 4h |
| Gestion de proveedores | Evaluacion de seguridad de subencargados |
| Control de cambios | CI/CD con tests automaticos, code review |

## 7. Infraestructura

| Componente | Proveedor | Ubicacion | Certificaciones |
|-----------|----------|-----------|----------------|
| Backend (FastAPI) | Fly.io | Paris, Francia | SOC 2 Type II |
| Base de datos (PostgreSQL) | Fly.io | Paris, Francia | SOC 2 Type II |
| Frontend (React) | Cloudflare Pages | EU distribuido | SOC 2, ISO 27001 |
| Modelos IA (vLLM) | Hetzner | Alemania | ISO 27001 |
| Autenticacion | Supabase | EU | SOC 2 Type II |

## 8. Gestion de incidentes
1. **Deteccion**: Monitorizacion automatica + alertas
2. **Clasificacion**: Severidad S1-S4
3. **Respuesta**: Segun SLA (2h-24h primera respuesta)
4. **Notificacion**: Cliente en 48h, AEPD en 72h si procede
5. **Post-mortem**: Analisis de causa raiz y acciones correctivas

## 9. Contacto de seguridad
Para reportar vulnerabilidades o incidentes:
- Email: security@st4rtup.app
- Responsable: David Moya Garcia, CTO

---

St4rtup | www.st4rtup.app
