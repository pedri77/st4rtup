# Plan de Securizacion — Hetzner VPS (prod-01)

**Servidor:** 188.245.166.253 (CPX22, Ubuntu 24.04)
**Servicios:** St4rtup Backend (8001) + Synthcast API (5679)
**Estado:** PENDIENTE de implementar

---

## 1. ACCESO SSH

### 1.1 Deshabilitar login root con password
- Cambiar PermitRootLogin a prohibit-password
- Deshabilitar PasswordAuthentication
- Reiniciar sshd

### 1.2 Crear usuario no-root (deploy)
- adduser deploy + sudo
- Copiar authorized_keys
- Permisos 700/600

### 1.3 Fail2Ban (anti brute-force)
- Instalar fail2ban
- Config: maxretry=3, bantime=3600, findtime=600
- Proteger SSH

---

## 2. FIREWALL (UFW)

- deny incoming por defecto
- allow 22 (SSH), 80 (HTTP), 443 (HTTPS)
- NO abrir 8001 ni 5679 (solo via Nginx)

---

## 3. ACTUALIZACIONES AUTOMATICAS

- Instalar unattended-upgrades
- Solo parches de seguridad
- Auto-reboot a las 04:00 si necesario
- Email notificacion a david@riskitera.com

---

## 4. HEALTH CHECKS (cada 5 min)

Script /opt/scripts/health_check.sh:
- Verificar St4rtup backend (HTTP 200 en :8001/health)
- Verificar Synthcast API (HTTP 200 en :5679/health)
- Si caido: restart automatico + email alerta via Resend
- Verificar disco (alerta si >85%)
- Verificar memoria (alerta si >90%)

Cron: */5 * * * *

---

## 5. BACKUPS

### 5.1 Config backup (diario 03:00)
- .env files
- Nginx config
- Systemd services
- Retener 30 dias

### 5.2 Database backup (domingo 02:00)
- pg_dump de Supabase PostgreSQL
- Comprimir con gzip
- Retener 7 dias

---

## 6. SSL / TLS

### 6.1 Let's Encrypt (reemplazar autofirmados)
- certbot --nginx para api.st4rtup.com y api.symthcast.com
- Renovacion automatica

### 6.2 Security Headers en Nginx
- X-Frame-Options: SAMEORIGIN
- X-Content-Type-Options: nosniff
- X-XSS-Protection: 1; mode=block
- Strict-Transport-Security: max-age=63072000
- Referrer-Policy: strict-origin-when-cross-origin

---

## 7. LOG ROTATION

- /var/log/health_check.log: diario, 14 dias
- /var/log/backup.log: diario, 14 dias
- Comprimir logs antiguos

---

## 8. KERNEL HARDENING

- Deshabilitar IP forwarding
- Activar SYN cookies (anti-flood)
- Ignorar ICMP redirects
- Logear paquetes sospechosos

---

## 9. AUDITORIA DE SEGURIDAD

### Lynis (mensual)
- Instalar lynis
- Ejecutar audit mensual el dia 1 a las 05:00
- Guardar resultado en /var/log/lynis-audit.log

### Script de auditoria rapida
/opt/scripts/security_audit.sh:
- Puertos abiertos
- Intentos SSH fallidos
- Estado fail2ban
- Estado UFW
- Disco y memoria
- Estado servicios
- Certificados SSL

---

## 10. RESUMEN DE CRONS

| Cron | Script | Frecuencia |
|------|--------|-----------|
| Health check | health_check.sh | Cada 5 min |
| Backup config | backup.sh | Diario 03:00 |
| Backup DB | backup_db.sh | Domingo 02:00 |
| Security audit | security_audit.sh | 1ro mes 05:00 |
| Lynis | lynis audit system | 1ro mes 05:00 |
| Updates | unattended-upgrades | Automatico |
| Auto-reboot | Si hay kernel update | 04:00 |
| Log rotation | logrotate | Diario |
| SSL renewal | certbot renew | Automatico |

---

## 11. ORDEN DE IMPLEMENTACION

### Sesion 1 (30 min) — Critico
1. UFW firewall
2. Fail2Ban
3. Deshabilitar password auth SSH
4. Crear usuario deploy

### Sesion 2 (20 min) — Monitoreo
5. Health check script + cron
6. Backup scripts + cron
7. Unattended upgrades

### Sesion 3 (15 min) — Hardening
8. Security headers Nginx
9. Kernel hardening
10. Lynis + audit script

---

## 12. COSTE TOTAL: 0 EUR

Todo software libre y gratuito.
