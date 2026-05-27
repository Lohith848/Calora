import { useMemo, useState } from 'react'
import { View, ScrollView, StyleSheet, Pressable, RefreshControl } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { Text } from '@/components/ui/Text'
import { Card } from '@/components/ui/Card'
import {
    SURFACE_ELEVATED,
    SURFACE_CONTAINER_LOW,
    ON_SURFACE,
    ON_SURFACE_VARIANT,
    OUTLINE,
    PRIMARY,
    ACCENT_DIM,
    ACCENT_BORDER,
    SHADOW_SM,
    TEXT_PRIMARY,
    TEXT_SECONDARY,
    TEXT_TERTIARY,
    BG,
    BORDER,
    SUCCESS,
} from '@/lib/theme'
import { TAB_BAR_CLEARANCE } from '@/components/TabBar'
import { useNotifications, useMarkAllNotificationsRead, useMarkNotificationRead, type AppNotification } from '@/hooks/useNotifications'
import { useStreak } from '@/hooks/useStreaks'
import { useWeeklyMeals } from '@/hooks/useMeals'
import { useGoals } from '@/hooks/useGoals'

type TabType = 'all' | 'unread'

export default function ActivityScreen() {
    const insets = useSafeAreaInsets()
    const queryClient = useQueryClient()
    const [activeTab, setActiveTab] = useState<TabType>('all')
    const [refreshing, setRefreshing] = useState(false)

    const { data: notifications = [] } = useNotifications()
    const { data: streak = 0 } = useStreak()
    const { data: weeklyDays = [] } = useWeeklyMeals()
    const { data: goals } = useGoals()
    const markRead = useMarkNotificationRead()
    const markAllRead = useMarkAllNotificationsRead()

    const calorieGoal = goals?.calories ?? 2000

    const stats = useMemo(() => {
        const activeDays = weeklyDays.filter((d) => d.calories > 0).length
        const highest = weeklyDays.reduce((max, d) => Math.max(max, d.calories), 0)
        const goalDays = weeklyDays.filter((d) => d.calories > 0 && d.calories <= calorieGoal).length
        return { activeDays, highest, goalDays }
    }, [weeklyDays, calorieGoal])

    const visibleItems = useMemo(() => {
        if (activeTab === 'all') return notifications
        return notifications.filter((item) => !item.read)
    }, [activeTab, notifications])

    const unreadCount = useMemo(() => notifications.filter((item) => !item.read).length, [notifications])

    const handleMarkAllRead = async () => {
        await markAllRead.mutateAsync()
    }

    const handleToggleRead = async (id: string) => {
        await markRead.mutateAsync(id)
    }

    const onRefresh = async () => {
        setRefreshing(true)
        await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['notifications'] }),
            queryClient.invalidateQueries({ queryKey: ['streak'] }),
            queryClient.invalidateQueries({ queryKey: ['meals-weekly'] }),
        ])
        setRefreshing(false)
    }

    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: BG }}
            contentContainerStyle={[s.container, { paddingTop: insets.top + 16, paddingBottom: TAB_BAR_CLEARANCE + 16 }]}
            showsVerticalScrollIndicator={false}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />
            }
        >
            <View style={s.header}>
                <View style={{ flex: 1 }}>
                    <Text style={s.title}>Activity</Text>
                    <Text style={s.subtitle}>Your streak progress, goal achievements, and system alerts.</Text>
                </View>
                {unreadCount > 0 && (
                    <Pressable onPress={handleMarkAllRead} style={({ pressed }) => [s.markAllBtn, pressed && { opacity: 0.75 }]}>
                        <Text style={s.markAllText}>Mark all read</Text>
                    </Pressable>
                )}
            </View>

            {/* Weekly Stats Summary */}
            <Card style={s.statsCard}>
                <View style={s.statsRow}>
                    <View style={s.stat}>
                        <Text style={s.statValue}>{streak}</Text>
                        <Text style={s.statLabel}>Day Streak</Text>
                    </View>
                    <View style={s.statDivider} />
                    <View style={s.stat}>
                        <Text style={s.statValue}>{stats.activeDays}/7</Text>
                        <Text style={s.statLabel}>Days Logged</Text>
                    </View>
                    <View style={s.statDivider} />
                    <View style={s.stat}>
                        <Text style={s.statValue}>
                            {stats.activeDays > 0 ? Math.round((stats.goalDays / stats.activeDays) * 100) : 0}%
                        </Text>
                        <Text style={s.statLabel}>Goal Accuracy</Text>
                    </View>
                </View>
            </Card>

            {/* Segment Tabs */}
            <View style={s.segmentRow}>
                <Pressable
                    onPress={() => setActiveTab('all')}
                    style={[s.segmentItem, activeTab === 'all' && s.segmentItemActive]}
                >
                    <Text style={[s.segmentText, activeTab === 'all' && s.segmentTextActive]}>All ({notifications.length})</Text>
                </Pressable>
                <Pressable
                    onPress={() => setActiveTab('unread')}
                    style={[s.segmentItem, activeTab === 'unread' && s.segmentItemActive]}
                >
                    <Text style={[s.segmentText, activeTab === 'unread' && s.segmentTextActive]}>Unread ({unreadCount})</Text>
                </Pressable>
            </View>

            {visibleItems.length === 0 ? (
                <Card style={s.emptyCard}>
                    <Text style={s.emptyTitle}>You are all caught up</Text>
                    <Text style={s.emptySub}>Start logging meals to get streak updates and goal notifications.</Text>
                </Card>
            ) : (
                <Card style={s.listCard}>
                    {visibleItems.map((item, index) => (
                        <Pressable
                            key={item.id}
                            onPress={() => handleToggleRead(item.id)}
                            style={[s.row, index < visibleItems.length - 1 && s.rowDivider]}
                        >
                            <View style={[s.iconWrap, item.read && s.iconWrapMuted]}>
                                <Ionicons
                                    name={categoryIcon(item.category)}
                                    size={14}
                                    color={item.read ? TEXT_SECONDARY : PRIMARY}
                                />
                            </View>

                            <View style={{ flex: 1 }}>
                                <Text style={[s.rowTitle, item.read && s.rowTitleMuted]}>{item.title}</Text>
                                <Text style={s.rowBody}>{item.body}</Text>
                                <Text style={s.rowTime}>{item.timeAgo}</Text>
                            </View>

                            {!item.read && <View style={s.unreadDot} />}
                        </Pressable>
                    ))}
                </Card>
            )}
        </ScrollView>
    )
}

function categoryIcon(category: AppNotification['category']) {
    switch (category) {
        case 'streak':
            return 'flame-outline'
        case 'daily':
            return 'sunny-outline'
        case 'goal':
            return 'trophy-outline'
        case 'system':
        default:
            return 'server-outline'
    }
}

const s = StyleSheet.create({
    container: { paddingHorizontal: 20, gap: 12 },
    header: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexShrink: 0 },
    title: { fontSize: 28, fontWeight: '800', color: ON_SURFACE, letterSpacing: -0.5 },
    subtitle: { marginTop: 4, fontSize: 13, color: ON_SURFACE_VARIANT, lineHeight: 18 },

    statsCard: { padding: 16 },
    statsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
    stat: { alignItems: 'center', gap: 4 },
    statValue: { fontSize: 22, fontWeight: '800', color: TEXT_PRIMARY },
    statLabel: { fontSize: 11, color: TEXT_TERTIARY, fontWeight: '600' },
    statDivider: { width: 1, height: 36, backgroundColor: BORDER },

    markAllBtn: {
        borderWidth: 1,
        borderColor: ACCENT_BORDER,
        backgroundColor: SURFACE_ELEVATED,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        ...SHADOW_SM,
    },
    markAllText: { fontSize: 12, color: PRIMARY, fontWeight: '600' },
    segmentRow: {
        flexDirection: 'row',
        backgroundColor: SURFACE_CONTAINER_LOW,
        borderRadius: 10,
        padding: 3,
    },
    segmentItem: {
        flex: 1,
        borderRadius: 8,
        alignItems: 'center',
        paddingVertical: 8,
    },
    segmentItemActive: {
        backgroundColor: SURFACE_ELEVATED,
        ...SHADOW_SM,
    },
    segmentText: { fontSize: 12, color: ON_SURFACE_VARIANT, fontWeight: '600' },
    segmentTextActive: { color: ON_SURFACE },
    emptyCard: { alignItems: 'center', gap: 6, paddingVertical: 32 },
    emptyTitle: { fontSize: 15, color: ON_SURFACE, fontWeight: '700' },
    emptySub: { fontSize: 13, color: ON_SURFACE_VARIANT },
    listCard: { paddingVertical: 4, paddingHorizontal: 0 },
    row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
    rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER },
    iconWrap: {
        width: 32,
        height: 32,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 1,
        backgroundColor: ACCENT_DIM,
    },
    iconWrapMuted: { backgroundColor: SURFACE_CONTAINER_LOW },
    rowTitle: { fontSize: 14, color: ON_SURFACE, fontWeight: '700' },
    rowTitleMuted: { color: ON_SURFACE_VARIANT },
    rowBody: { marginTop: 2, fontSize: 13, lineHeight: 18, color: ON_SURFACE_VARIANT },
    rowTime: { marginTop: 6, fontSize: 11, color: OUTLINE },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 999,
        marginTop: 7,
        backgroundColor: PRIMARY,
    },
})
