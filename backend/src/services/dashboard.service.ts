import { prisma } from '../config/prisma';

export type AlertPriority = 'urgente' | 'importante' | 'informativa';

export interface OperationalAlert {
  id: string;
  title: string;
  description: string;
  scope: string;
  count: number;
  priority: AlertPriority;
  recommendedAction: string;
  route: string;
  category: string;
}

export interface OperationalTask {
  id: string;
  title: string;
  description: string;
  priority: AlertPriority;
  route: string;
  kind: 'renewal' | 'review_payment' | 'review_membership';
}

export interface OperationalSummary {
  totals: {
    activeMembers: number;
    activeMemberships: number;
    totalRevenue: number;
  };
  alerts: OperationalAlert[];
  tasks: OperationalTask[];
}

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function diffInDays(a: Date, b: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.ceil((startOfDay(a).getTime() - startOfDay(b).getTime()) / msPerDay);
}

/**
 * Reglas de prioridad deterministas aplicadas al dashboard operativo:
 * - URGENTE: vencidos o vencen hoy/mañana o con riesgo crítico de baja.
 * - IMPORTANTE: vencen en los próximos 3-7 días o faltan pagos en membresías activas.
 * - INFORMATIVA: pagos de hoy y actividad reciente que necesita revisión pero no bloqueo operativo.
 *
 * Estas reglas están basadas en los campos reales del modelo: end_date, status, payment_date,
 * member_id y plan_id. No se usan heurísticas de IA ni datos externos.
 */
export async function getOperationalSummary(): Promise<OperationalSummary> {
  const [members, memberships, payments] = await Promise.all([
    prisma.member.findMany({
      where: { deleted_at: null },
      select: { id: true, status: true },
    }),
    prisma.membership.findMany({
      where: { deleted_at: null },
      select: {
        id: true,
        member_id: true,
        status: true,
        end_date: true,
        start_date: true,
        price: true,
      },
      orderBy: { end_date: 'asc' },
    }),
    prisma.payment.findMany({
      where: { deleted_at: null },
      select: {
        id: true,
        membership_id: true,
        amount: true,
        payment_date: true,
        status: true,
      },
      orderBy: { payment_date: 'desc' },
    }),
  ]);

  const today = new Date();
  const activeMembers = members.filter((member) => member.status === 'ACTIVE').length;
  const activeMemberships = memberships.filter((membership) => membership.status === 'ACTIVE').length;
  const totalRevenue = payments
    .filter((payment) => payment.status === 'PAID')
    .reduce((total, payment) => total + payment.amount, 0);

  const now = new Date();
  const expiredMemberships = memberships.filter((membership) => membership.status === 'EXPIRED' || diffInDays(membership.end_date, now) <= 0);
  const dueTomorrow = memberships.filter((membership) => membership.status === 'ACTIVE' && diffInDays(membership.end_date, now) === 1);
  const dueInThreeDays = memberships.filter((membership) => membership.status === 'ACTIVE' && diffInDays(membership.end_date, now) >= 2 && diffInDays(membership.end_date, now) <= 3);
  const dueThisWeek = memberships.filter((membership) => membership.status === 'ACTIVE' && diffInDays(membership.end_date, now) > 3 && diffInDays(membership.end_date, now) <= 7);

  const paidPaymentCountsByMembership = new Map<string, number>();
  for (const payment of payments) {
    if (payment.status !== 'PAID') {
      continue;
    }

    paidPaymentCountsByMembership.set(
      payment.membership_id,
      (paidPaymentCountsByMembership.get(payment.membership_id) ?? 0) + 1
    );
  }

  const membershipsWithoutPayment = memberships.filter((membership) => {
    if (membership.status !== 'ACTIVE') {
      return false;
    }

    return (paidPaymentCountsByMembership.get(membership.id) ?? 0) === 0;
  });

  const todayPayments = payments.filter(
    (payment) => payment.status === 'PAID' && startOfDay(payment.payment_date).getTime() === startOfDay(today).getTime()
  ).length;

  const alerts: OperationalAlert[] = [];

  if (expiredMemberships.length > 0) {
    alerts.push({
      id: 'expired-memberships',
      title: 'Membresías vencidas',
      description: `${expiredMemberships.length} socios requieren revisión de baja o renovación.`,
      scope: 'Socios con membresía vencida',
      count: expiredMemberships.length,
      priority: 'urgente',
      recommendedAction: 'Revisar renovación o baja del socio.',
      route: '/memberships',
      category: 'membership_expired',
    });
  }

  if (dueTomorrow.length > 0) {
    alerts.push({
      id: 'membership-expires-tomorrow',
      title: 'Vence mañana',
      description: `${dueTomorrow.length} membresía(s) requieren atención antes de mañana.`,
      scope: 'Cobro y continuidad del servicio',
      count: dueTomorrow.length,
      priority: 'urgente',
      recommendedAction: 'Contactar con el socio y confirmar renovación.',
      route: '/memberships',
      category: 'membership_expiring_soon',
    });
  }

  if (dueInThreeDays.length > 0) {
    alerts.push({
      id: 'membership-expires-3-days',
      title: 'Vence en los próximos 3 días',
      description: `${dueInThreeDays.length} membresía(s) necesitan seguimiento.`,
      scope: 'Seguimiento comercial del socio',
      count: dueInThreeDays.length,
      priority: 'urgente',
      recommendedAction: 'Preparar recordatorio y revisión de renovación.',
      route: '/memberships',
      category: 'membership_expiring_soon',
    });
  }

  if (dueThisWeek.length > 0) {
    alerts.push({
      id: 'membership-expires-this-week',
      title: 'Vence esta semana',
      description: `${dueThisWeek.length} membresía(s) están próximas a caducar.`,
      scope: 'Vencimientos programados',
      count: dueThisWeek.length,
      priority: 'importante',
      recommendedAction: 'Programar seguimiento antes de la fecha de corte.',
      route: '/memberships',
      category: 'membership_expiring_week',
    });
  }

  if (todayPayments > 0) {
    alerts.push({
      id: 'payments-today',
      title: 'Pagos registrados hoy',
      description: `${todayPayments} cobro(s) se han registrado en el día de hoy.`,
      scope: 'Movimiento financiero del día',
      count: todayPayments,
      priority: 'informativa',
      recommendedAction: 'Revisar que el cobro coincida con la membresía activa.',
      route: '/memberships',
      category: 'payments_recent',
    });
  }

  if (membershipsWithoutPayment.length > 0) {
    alerts.push({
      id: 'active-memberships-without-payment',
      title: 'Membresías activas sin pago asociado',
      description: `${membershipsWithoutPayment.length} membresía(s) activas no tienen ningún cobro registrado.`,
      scope: 'Estado operativo del socio',
      count: membershipsWithoutPayment.length,
      priority: 'importante',
      recommendedAction: 'Verificar si falta alta o registro de cobro.',
      route: '/memberships',
      category: 'membership_missing_payment',
    });
  }

  const tasks: OperationalTask[] = [];

  if (expiredMemberships.length > 0) {
    tasks.push({
      id: 'task-expired-memberships',
      title: `Revisar ${expiredMemberships.length} membresía(s) vencida(s)`,
      description: 'Contactar con el socio y decidir renovación o baja.',
      priority: 'urgente',
      route: '/memberships',
      kind: 'renewal',
    });
  }

  if (dueTomorrow.length > 0) {
    tasks.push({
      id: 'task-due-tomorrow',
      title: 'Membresía(s) vencen mañana',
      description: 'Confirmar renovación antes del cierre del día.',
      priority: 'urgente',
      route: '/memberships',
      kind: 'renewal',
    });
  }

  if (dueInThreeDays.length > 0) {
    tasks.push({
      id: 'task-due-3-days',
      title: 'Seguimiento de vencimiento en 3 días',
      description: 'Preparar recordatorio para el socio y revisión de pago.',
      priority: 'importante',
      route: '/memberships',
      kind: 'review_membership',
    });
  }

  if (todayPayments > 0) {
    tasks.push({
      id: 'task-payments-today',
      title: 'Revisar pagos registrados hoy',
      description: 'Comprobar que el cobro y el estado del socio coinciden.',
      priority: 'informativa',
      route: '/memberships',
      kind: 'review_payment',
    });
  }

  if (membershipsWithoutPayment.length > 0) {
    tasks.push({
      id: 'task-membership-no-payment',
      title: 'Revisar memberships sin pago asociado',
      description: 'Comprobar si falta cobro o si hay que registrar el alta correctamente.',
      priority: 'importante',
      route: '/memberships',
      kind: 'review_payment',
    });
  }

  return {
    totals: {
      activeMembers,
      activeMemberships,
      totalRevenue,
    },
    alerts,
    tasks,
  };
}
