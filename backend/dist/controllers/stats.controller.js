"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStats = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const getStats = async (req, res) => {
    try {
        const { range = '30d', groupBy = 'day' } = req.query;
        let startDate;
        const now = new Date();
        if (range === '7d') {
            startDate = new Date();
            startDate.setDate(now.getDate() - 7);
        }
        else if (range === '30d') {
            startDate = new Date();
            startDate.setDate(now.getDate() - 30);
        }
        else if (range === '12m') {
            startDate = new Date();
            startDate.setMonth(now.getMonth() - 12);
        }
        const dateFilterUser = startDate ? { createdAt: { gte: startDate } } : {};
        const dateFilterRes = startDate ? { startTime: { gte: startDate } } : {};
        const [totalUsers, totalReservations, activeCourts, recentReservations, allUsers, allReservations] = await Promise.all([
            prisma_1.default.user.count({ where: dateFilterUser }),
            prisma_1.default.reservation.count({ where: dateFilterRes }),
            prisma_1.default.court.count({ where: { isActive: true } }),
            prisma_1.default.reservation.findMany({
                take: 5,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: { select: { name: true, email: true } },
                    court: { select: { name: true } }
                }
            }),
            prisma_1.default.user.findMany({ where: dateFilterUser, select: { role: true, isBlocked: true, createdAt: true } }),
            prisma_1.default.reservation.findMany({
                where: dateFilterRes,
                include: { court: true }
            })
        ]);
        // Root Metrics
        let totalRevenue = 0;
        const confirmedReservations = allReservations.filter(r => r.status === 'CONFIRMED');
        const cancelledReservations = allReservations.filter(r => r.status === 'CANCELLED');
        confirmedReservations.forEach(r => totalRevenue += Number(r.totalPrice || 0));
        // To prevent breaking old UI, we still send monthlyRevenue (revenue of current month purely)
        const currentMonth = new Date();
        currentMonth.setDate(1);
        currentMonth.setHours(0, 0, 0, 0);
        const monthlyRevenueResult = await prisma_1.default.reservation.aggregate({
            _sum: { totalPrice: true },
            where: { status: 'CONFIRMED', createdAt: { gte: currentMonth } }
        });
        const monthlyRevenue = monthlyRevenueResult._sum.totalPrice || 0;
        // Advanced Stats & Drill-downs
        // 1. Users Detail
        const rolesCount = { ADMIN: 0, STAFF: 0, MEMBER: 0 };
        let blockedUsersCount = 0;
        allUsers.forEach(u => {
            if (rolesCount[u.role] !== undefined) {
                rolesCount[u.role]++;
            }
            if (u.isBlocked)
                blockedUsersCount++;
        });
        // 2. Reservations Detail
        const statusCount = { CONFIRMED: confirmedReservations.length, CANCELLED: cancelledReservations.length };
        // 3. Court and Sport counts
        const courtData = {};
        const sportData = {};
        const hourData = {};
        const evolutionRaw = {};
        confirmedReservations.forEach(res => {
            // Court
            if (!courtData[res.courtId]) {
                courtData[res.courtId] = { id: res.courtId, name: res.court.name, count: 0, revenue: 0 };
            }
            courtData[res.courtId].count++;
            courtData[res.courtId].revenue += Number(res.totalPrice || 0);
            // Sport
            const sport = res.court.sport || 'Padel';
            if (!sportData[sport])
                sportData[sport] = { name: sport, count: 0 };
            sportData[sport].count++;
            // Hour Top
            const hour = res.startTime.getHours().toString().padStart(2, '0') + ':00';
            hourData[hour] = (hourData[hour] || 0) + 1;
            // Evolution Grouping
            let groupKey = '';
            const d = res.startTime;
            if (groupBy === 'month') {
                groupKey = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
            }
            else if (groupBy === 'week') {
                const firstDayOfYear = new Date(d.getFullYear(), 0, 1);
                const pastDaysOfYear = (d.getTime() - firstDayOfYear.getTime()) / 86400000;
                const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
                groupKey = `${d.getFullYear()}-W${weekNum.toString().padStart(2, '0')}`;
            }
            else {
                // default day
                groupKey = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
            }
            if (!evolutionRaw[groupKey])
                evolutionRaw[groupKey] = { revenue: 0, count: 0 };
            evolutionRaw[groupKey].count++;
            evolutionRaw[groupKey].revenue += Number(res.totalPrice || 0);
        });
        const courtRanking = Object.values(courtData).sort((a, b) => b.count - a.count);
        const mostBookedCourt = courtRanking.length > 0 ? courtRanking[0] : { name: 'Ninguna', count: 0 };
        const sportRanking = Object.values(sportData).sort((a, b) => b.count - a.count);
        const mostBookedSport = sportRanking.length > 0 ? sportRanking[0] : { name: 'Ninguno', count: 0 };
        const hourlyDistribution = Object.entries(hourData).map(([hour, count]) => ({ hour, count })).sort((a, b) => a.hour.localeCompare(b.hour));
        let peakHour = { hour: '--:--', count: 0 };
        hourlyDistribution.forEach(h => {
            if (h.count > peakHour.count)
                peakHour = h;
        });
        const evolutionArray = Object.keys(evolutionRaw).sort().map(key => ({
            date: key,
            month: key, // Keep month for backwards compat in old UI
            reservations: evolutionRaw[key].count,
            revenue: evolutionRaw[key].revenue
        }));
        res.json({
            totalUsers,
            totalReservations,
            totalRevenue,
            monthlyRevenue,
            activeCourts,
            recentReservations,
            extendedStats: {
                mostBookedCourt,
                mostBookedSport,
                peakHour,
                cancelledCount: cancelledReservations.length,
                monthlyEvolution: evolutionArray,
                // New Drill-down Details
                usersDetail: {
                    roles: rolesCount,
                    blocked: blockedUsersCount,
                    newUsers: allUsers.length
                },
                reservationsDetail: {
                    status: statusCount,
                    bySport: sportRanking,
                    cancellationRate: allReservations.length > 0 ? ((cancelledReservations.length / allReservations.length) * 100).toFixed(1) : '0'
                },
                courtsDetail: courtRanking,
                hourlyDistribution
            }
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};
exports.getStats = getStats;
