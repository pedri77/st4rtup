import api from './api'

/**
 * Servicio para gestionar notificaciones
 * Provee funciones helper para crear notificaciones desde diferentes módulos
 */

export const notificationsService = {
  /**
   * Crea una notificación genérica
   */
  async create(notification) {
    return api.post('/notifications', notification)
  },

  /**
   * Notificaciones de sistema
   */
  system: {
    async welcome(userId) {
      return api.post('/notifications', {
        user_id: userId,
        type: 'system',
        priority: 'medium',
        title: 'Bienvenido a St4rtup CRM',
        message: 'El sistema de notificaciones está activo. Recibirás alertas sobre leads, acciones y oportunidades.',
        action_url: '/dashboard',
      })
    },

    async maintenance(userId, message, startTime) {
      return api.post('/notifications', {
        user_id: userId,
        type: 'system',
        priority: 'high',
        title: 'Mantenimiento programado',
        message: message || `Habrá un mantenimiento programado el ${startTime}`,
        metadata: JSON.stringify({ start_time: startTime }),
        action_url: null,
      })
    },
  },

  /**
   * Notificaciones de leads
   */
  leads: {
    async newLead(userId, leadId, leadName) {
      return api.post('/notifications', {
        user_id: userId,
        type: 'lead',
        priority: 'medium',
        title: 'Nuevo lead capturado',
        message: `Se ha creado un nuevo lead: ${leadName}`,
        metadata: JSON.stringify({ lead_id: leadId, lead_name: leadName }),
        action_url: `/leads/${leadId}`,
      })
    },

    async statusChanged(userId, leadId, leadName, oldStatus, newStatus) {
      return api.post('/notifications', {
        user_id: userId,
        type: 'lead',
        priority: 'medium',
        title: `Lead actualizado: ${leadName}`,
        message: `El estado cambió de "${oldStatus}" a "${newStatus}"`,
        metadata: JSON.stringify({ lead_id: leadId, old_status: oldStatus, new_status: newStatus }),
        action_url: `/leads/${leadId}`,
      })
    },

    async highScore(userId, leadId, leadName, score) {
      return api.post('/notifications', {
        user_id: userId,
        type: 'lead',
        priority: 'high',
        title: `🔥 Lead de alta calidad`,
        message: `${leadName} tiene un score de ${score}. ¡Requiere atención prioritaria!`,
        metadata: JSON.stringify({ lead_id: leadId, score }),
        action_url: `/leads/${leadId}`,
      })
    },
  },

  /**
   * Notificaciones de acciones
   */
  actions: {
    async created(userId, actionId, actionTitle) {
      return api.post('/notifications', {
        user_id: userId,
        type: 'action',
        priority: 'medium',
        title: 'Nueva acción asignada',
        message: actionTitle,
        metadata: JSON.stringify({ action_id: actionId }),
        action_url: `/actions`,
      })
    },

    async dueSoon(userId, actionId, actionTitle, dueDate) {
      return api.post('/notifications', {
        user_id: userId,
        type: 'action',
        priority: 'high',
        title: '⏰ Acción próxima a vencer',
        message: `"${actionTitle}" vence pronto (${dueDate})`,
        metadata: JSON.stringify({ action_id: actionId, due_date: dueDate }),
        action_url: `/actions`,
      })
    },

    async overdue(userId, actionId, actionTitle, daysOverdue) {
      return api.post('/notifications', {
        user_id: userId,
        type: 'action',
        priority: 'urgent',
        title: '🚨 Acción vencida',
        message: `"${actionTitle}" está vencida desde hace ${daysOverdue} días`,
        metadata: JSON.stringify({ action_id: actionId, days_overdue: daysOverdue }),
        action_url: `/actions`,
      })
    },
  },

  /**
   * Notificaciones de oportunidades
   */
  opportunities: {
    async created(userId, opportunityId, opportunityName, amount) {
      return api.post('/notifications', {
        user_id: userId,
        type: 'opportunity',
        priority: 'high',
        title: '💰 Nueva oportunidad',
        message: `Se ha creado "${opportunityName}" por ${amount}€`,
        metadata: JSON.stringify({ opportunity_id: opportunityId, amount }),
        action_url: `/pipeline`,
      })
    },

    async stageChanged(userId, opportunityId, opportunityName, newStage) {
      return api.post('/notifications', {
        user_id: userId,
        type: 'opportunity',
        priority: 'medium',
        title: 'Oportunidad actualizada',
        message: `"${opportunityName}" pasó a: ${newStage}`,
        metadata: JSON.stringify({ opportunity_id: opportunityId, stage: newStage }),
        action_url: `/pipeline`,
      })
    },

    async won(userId, opportunityId, opportunityName, amount) {
      return api.post('/notifications', {
        user_id: userId,
        type: 'opportunity',
        priority: 'high',
        title: '🎉 ¡Oportunidad ganada!',
        message: `"${opportunityName}" se cerró con éxito por ${amount}€`,
        metadata: JSON.stringify({ opportunity_id: opportunityId, amount }),
        action_url: `/pipeline`,
      })
    },

    async stale(userId, opportunityId, opportunityName, daysStale) {
      return api.post('/notifications', {
        user_id: userId,
        type: 'opportunity',
        priority: 'high',
        title: '⚠️ Oportunidad estancada',
        message: `"${opportunityName}" no ha tenido actividad en ${daysStale} días`,
        metadata: JSON.stringify({ opportunity_id: opportunityId, days_stale: daysStale }),
        action_url: `/pipeline`,
      })
    },
  },

  /**
   * Notificaciones de visitas
   */
  visits: {
    async scheduled(userId, visitId, companyName, visitDate) {
      return api.post('/notifications', {
        user_id: userId,
        type: 'visit',
        priority: 'medium',
        title: 'Visita programada',
        message: `Tienes una visita con ${companyName} el ${visitDate}`,
        metadata: JSON.stringify({ visit_id: visitId }),
        action_url: `/visits`,
      })
    },

    async reminder(userId, visitId, companyName, hoursUntil) {
      return api.post('/notifications', {
        user_id: userId,
        type: 'visit',
        priority: 'high',
        title: `⏰ Visita en ${hoursUntil}h`,
        message: `Recuerda tu visita con ${companyName}`,
        metadata: JSON.stringify({ visit_id: visitId }),
        action_url: `/visits`,
      })
    },
  },

  /**
   * Notificaciones de emails
   */
  emails: {
    async sent(userId, emailId, recipient) {
      return api.post('/notifications', {
        user_id: userId,
        type: 'email',
        priority: 'low',
        title: 'Email enviado',
        message: `Email enviado correctamente a ${recipient}`,
        metadata: JSON.stringify({ email_id: emailId }),
        action_url: `/emails`,
      })
    },

    async bounced(userId, emailId, recipient) {
      return api.post('/notifications', {
        user_id: userId,
        type: 'email',
        priority: 'high',
        title: '❌ Email rebotado',
        message: `El email a ${recipient} no pudo ser entregado`,
        metadata: JSON.stringify({ email_id: emailId }),
        action_url: `/emails`,
      })
    },

    async opened(userId, emailId, recipient) {
      return api.post('/notifications', {
        user_id: userId,
        type: 'email',
        priority: 'low',
        title: '👀 Email abierto',
        message: `${recipient} abrió tu email`,
        metadata: JSON.stringify({ email_id: emailId }),
        action_url: `/emails`,
      })
    },
  },

  /**
   * Notificaciones de seguimiento mensual
   */
  reviews: {
    async generated(userId, reviewId, month, year) {
      return api.post('/notifications', {
        user_id: userId,
        type: 'review',
        priority: 'medium',
        title: 'Informe mensual disponible',
        message: `El seguimiento de ${month}/${year} está listo`,
        metadata: JSON.stringify({ review_id: reviewId, month, year }),
        action_url: `/reviews`,
      })
    },
  },

  /**
   * Notificaciones de automatizaciones
   */
  automations: {
    async executed(userId, automationId, automationName, status) {
      return api.post('/notifications', {
        user_id: userId,
        type: 'automation',
        priority: 'low',
        title: `Automatización: ${automationName}`,
        message: `Se ejecutó ${status === 'success' ? 'exitosamente' : 'con errores'}`,
        metadata: JSON.stringify({ automation_id: automationId, status }),
        action_url: `/automations`,
      })
    },

    async failed(userId, automationId, automationName, error) {
      return api.post('/notifications', {
        user_id: userId,
        type: 'automation',
        priority: 'high',
        title: '⚠️ Error en automatización',
        message: `"${automationName}" falló: ${error}`,
        metadata: JSON.stringify({ automation_id: automationId, error }),
        action_url: `/automations`,
      })
    },
  },
}

export default notificationsService
