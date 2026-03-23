# ACUERDO DE TRATAMIENTO DE DATOS (DPA)

**Anexo I al Contrato RS-CONTRACT-[NUMERO]**
**Conforme al art. 28 del Reglamento (UE) 2016/679 (RGPD)**

---

## 1. PARTES
- **Responsable del Tratamiento**: [NOMBRE_EMPRESA] ("el Cliente")
- **Encargado del Tratamiento**: St4rtup ("St4rtup")

## 2. OBJETO Y DURACION
St4rtup tratara datos personales por cuenta del Cliente durante la vigencia del contrato de licencia SaaS, con la unica finalidad de prestar el servicio de plataforma GRC contratado.

## 3. DATOS TRATADOS

| Categoria | Datos | Finalidad |
|-----------|-------|-----------|
| Usuarios de la plataforma | Nombre, email, cargo, telefono | Acceso y gestion de la plataforma |
| Contactos GRC | Nombre, email, cargo de responsables de seguridad | Gestion de controles y auditorias |
| Logs de actividad | IP, timestamps, acciones realizadas | Auditoria y seguridad |

**Datos sensibles**: St4rtup NO trata datos de categorias especiales (salud, biometricos, etc.) salvo que el Cliente los introduzca voluntariamente en campos de texto libre.

## 4. OBLIGACIONES DE ST4RTUP

a) Tratar los datos unicamente segun las instrucciones documentadas del Cliente
b) No transferir datos fuera del Espacio Economico Europeo
c) Garantizar que el personal autorizado se ha comprometido a la confidencialidad
d) Implementar medidas tecnicas y organizativas apropiadas:
   - Cifrado en reposo (AES-256) y en transito (TLS 1.3)
   - Credential store cifrado (Fernet AES-128-CBC)
   - Control de acceso basado en roles
   - Audit trail completo
   - Backups diarios cifrados
   - Infraestructura 100% EU (Fly.io Paris, Hetzner Alemania)
e) No subcontratar sin autorizacion previa del Cliente
f) Asistir al Cliente en el cumplimiento de derechos de los interesados
g) Suprimir o devolver los datos al finalizar el contrato, segun eleccion del Cliente

## 5. SUBENCARGADOS AUTORIZADOS

| Subencargado | Servicio | Ubicacion | Datos |
|-------------|----------|-----------|-------|
| Fly.io | Hosting backend + DB | Paris, Francia (EU) | Todos los datos de la plataforma |
| Cloudflare | CDN + hosting frontend | EU (distribuido) | Solo assets estaticos |
| Hetzner | GPU para modelos IA | Alemania (EU) | Datos procesados por IA (anonimizados) |
| Supabase | Autenticacion | EU | Email y hash de password |

## 6. NOTIFICACION DE BRECHAS
St4rtup notificara al Cliente cualquier brecha de seguridad que afecte a datos personales en un plazo maximo de **48 horas** desde su deteccion, incluyendo:
- Naturaleza de la brecha
- Datos afectados (categorias y volumen aproximado)
- Medidas adoptadas y propuestas

## 7. DERECHOS DE AUDITORIA
El Cliente podra auditar el cumplimiento de este DPA:
- Mediante cuestionarios de seguridad (anuales)
- Mediante auditoria presencial o remota (con 30 dias de preaviso)
- Mediante revision de certificaciones (ENS, ISO 27001 cuando esten disponibles)

## 8. DEVOLUCION Y SUPRESION
A la finalizacion del contrato:
- El Cliente dispondra de 30 dias para exportar sus datos
- Transcurrido dicho plazo, St4rtup suprimira los datos de forma segura
- St4rtup emitira certificado de destruccion a solicitud del Cliente

---

**Fecha**: [FECHA]

Por ST4RTUP S.L.U. | Por [NOMBRE_EMPRESA]
Firma: _________________ | Firma: _________________
