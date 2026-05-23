import { useState } from 'react'
import { View, ScrollView, StyleSheet, Pressable } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Text } from '@/components/ui/Text'
import { Card } from '@/components/ui/Card'
import {
    BG,
    SURFACE,
    SURFACE2,
    BORDER,
    TEXT_PRIMARY,
    TEXT_SECONDARY,
    TEXT_TERTIARY,
    SUCCESS,
    ENERGY_ORANGE,
} from '@/lib/theme'
import { TAB_BAR_CLEARANCE } from '@/components/TabBar'

export default function GroupsScreen() {
    const insets = useSafeAreaInsets()

    const mockGroups = [
        {
            id: '1',
            name: 'Office Wellness Challenge',
            members: 12,
            icon: 'people',
            streak: 15,
            description: 'Stay healthy with your team!',
        },
        {
            id: '2',
            name: 'Family Nutrition',
            members: 5,
            icon: 'home',
            streak: 8,
            description: 'Track meals together as a family.',
        },
        {
            id: '3',
            name: 'Gym Buddies',
            members: 8,
            icon: 'barbell',
            streak: 22,
            description: 'Protein goals and workout fuel.',
        },
    ]

    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: BG }}
            contentContainerStyle={[
                s.container,
                { paddingTop: insets.top + 16, paddingBottom: TAB_BAR_CLEARANCE + 16 },
            ]}
            showsVerticalScrollIndicator={false}
        >
            <View style={s.header}>
                <Text style={s.title}>Groups</Text>
                <Text style={s.subtitle}>Track progress together with friends and family.</Text>
            </View>

            {/* Groups List */}
            {mockGroups.map((group) => (
                <Card key={group.id} style={s.groupCard}>
                    <View style={s.groupRow}>
                        <View style={s.groupIconWrap}>
                            <Ionicons
                                name={group.icon as keyof typeof Ionicons.glyphMap}
                                size={22}
                                color={TEXT_PRIMARY}
                            />
                        </View>
                        <View style={s.groupContent}>
                            <Text style={s.groupName}>{group.name}</Text>
                            <Text style={s.groupDesc}>{group.description}</Text>
                            <View style={s.groupMeta}>
                                <View style={s.groupMetaItem}>
                                    <Ionicons name="people-outline" size={14} color={TEXT_SECONDARY} />
                                    <Text style={s.groupMetaText}>{group.members} members</Text>
                                </View>
                                <View style={s.groupMetaItem}>
                                    <Ionicons name="flame" size={14} color={ENERGY_ORANGE} />
                                    <Text style={s.groupMetaText}>{group.streak} day streak</Text>
                                </View>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={TEXT_TERTIARY} />
                    </View>
                </Card>
            ))}

            {/* Create Group Button */}
            <Pressable
                style={({ pressed }) => [s.createBtn, pressed && { opacity: 0.85 }]}
            >
                <Ionicons name="add-circle-outline" size={20} color="#fff" />
                <Text style={s.createBtnText}>Create New Group</Text>
            </Pressable>

            {/* Empty state info */}
            <Card style={s.infoCard}>
                <Ionicons name="information-circle-outline" size={20} color={SUCCESS} />
                <Text style={s.infoText}>
                    Invite friends to a group to compare daily calorie goals, share meals, and stay motivated together.
                </Text>
            </Card>
        </ScrollView>
    )
}

const s = StyleSheet.create({
    container: { paddingHorizontal: 20, gap: 16 },
    header: { gap: 4, marginBottom: 4 },
    title: {
        fontSize: 24,
        fontWeight: '800',
        color: TEXT_PRIMARY,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 13,
        color: TEXT_SECONDARY,
    },
    groupCard: {
        padding: 16,
    },
    groupRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    groupIconWrap: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: SURFACE2,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: BORDER,
    },
    groupContent: {
        flex: 1,
        gap: 4,
    },
    groupName: {
        fontSize: 15,
        fontWeight: '700',
        color: TEXT_PRIMARY,
    },
    groupDesc: {
        fontSize: 12,
        color: TEXT_SECONDARY,
    },
    groupMeta: {
        flexDirection: 'row',
        gap: 16,
        marginTop: 4,
    },
    groupMetaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    groupMetaText: {
        fontSize: 11,
        fontWeight: '600',
        color: TEXT_SECONDARY,
    },
    createBtn: {
        backgroundColor: TEXT_PRIMARY,
        paddingVertical: 14,
        borderRadius: 999,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 4,
    },
    createBtnText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#fff',
    },
    infoCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        padding: 16,
        backgroundColor: 'rgba(52, 199, 89, 0.06)',
        borderWidth: 1,
        borderColor: 'rgba(52, 199, 89, 0.15)',
    },
    infoText: {
        flex: 1,
        fontSize: 12.5,
        color: SUCCESS,
        lineHeight: 18,
    },
})
