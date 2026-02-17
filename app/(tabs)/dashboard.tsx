// import React, { useMemo, useState } from 'react';
// import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
// import { useAppointments } from '../../context/AppointmentsContext';
// import { Colors } from '../../constants/theme';

// type RangeFilter = 'hoy' | 'manana' | '7dias' | 'mes' | 'todas';

// const toDateKey = (d: Date) => d.toISOString().slice(0, 10);

// function isInRange(dateStr: string, range: RangeFilter) {
//   if (!dateStr) return false;

//   const start = new Date();
//   start.setHours(0, 0, 0, 0);

//   const d = new Date(dateStr);
//   if (isNaN(d.getTime())) return false;

//   const dayKey = toDateKey(d);
//   const todayKey = toDateKey(start);

//   const tomorrow = new Date(start);
//   tomorrow.setDate(start.getDate() + 1);
//   const tomorrowKey = toDateKey(tomorrow);

//   if (range === 'todas') return true;
//   if (range === 'hoy') return dayKey === todayKey;
//   if (range === 'manana') return dayKey === tomorrowKey;

//   if (range === '7dias') {
//     const end = new Date(start);
//     end.setDate(start.getDate() + 7);
//     return d >= start && d < end;
//   }

//   if (range === 'mes') {
//     const end = new Date(start);
//     end.setMonth(start.getMonth() + 1);
//     return d >= start && d < end;
//   }

//   return true;
// }

// function money(n: number) {
//   return `$${n.toFixed(2)} MXN`;
// }

// export default function DashboardScreen() {
//   const { appointments } = useAppointments();
//   const [range, setRange] = useState<RangeFilter>('mes');

//   const filtered = useMemo(() => {
//     return appointments.filter(a => isInRange(a.date, range));
//   }, [appointments, range]);

//   const stats = useMemo(() => {
//     const totalCitas = filtered.length;
//     const realizadas = filtered.filter(a => a.status === 'realizada');
//     const pendientes = filtered.filter(a => a.status === 'pendiente');
//     const canceladas = filtered.filter(a => a.status === 'cancelada');
//     const noShow = filtered.filter(a => a.status === 'no_asistio');

//     // Recaudado: solo "realizada" y solo si price es número
//     const recaudado = realizadas.reduce((sum, a) => sum + (typeof a.price === 'number' ? a.price : 0), 0);

//     // Top servicios (por count) + revenue (solo realizadas)
//     const map = new Map<string, { count: number; revenue: number }>();
//     for (const a of filtered) {
//       const key = (a.service || 'Sin servicio').trim() || 'Sin servicio';
//       const prev = map.get(key) ?? { count: 0, revenue: 0 };
//       const addRevenue =
//         a.status === 'realizada' && typeof a.price === 'number' ? a.price : 0;

//       map.set(key, { count: prev.count + 1, revenue: prev.revenue + addRevenue });
//     }

//     const services = Array.from(map.entries())
//       .map(([name, v]) => ({ name, ...v }))
//       .sort((a, b) => b.count - a.count);

//     const topServices = services.slice(0, 6);

//     // Para “barras” (normalizamos)
//     const maxCount = Math.max(1, ...topServices.map(s => s.count));

//     return {
//       totalCitas,
//       realizadas: realizadas.length,
//       pendientes: pendientes.length,
//       canceladas: canceladas.length,
//       noShow: noShow.length,
//       recaudado,
//       topServices,
//       maxCount,
//     };
//   }, [filtered]);

//   return (
//     <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 90 }}>
//       <Text style={styles.title}>Dashboard</Text>
//       <Text style={styles.subtitle}>Resumen de tu negocio por rango de fechas.</Text>

//       {/* Filtros */}
//       <View style={styles.filterRow}>
//         {[
//           ['Hoy', 'hoy'],
//           ['Mañana', 'manana'],
//           ['7 días', '7dias'],
//           ['Mes', 'mes'],
//           ['Todas', 'todas'],
//         ].map(([label, key]) => {
//           const active = range === (key as RangeFilter);
//           return (
//             <TouchableOpacity
//               key={key as string}
//               style={[styles.filterChip, active && styles.filterChipActive]}
//               onPress={() => setRange(key as RangeFilter)}
//             >
//               <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
//                 {label}
//               </Text>
//             </TouchableOpacity>
//           );
//         })}
//       </View>

//       {/* Cards principales */}
//       <View style={styles.grid}>
//         <View style={styles.card}>
//           <Text style={styles.cardLabel}>Recaudado</Text>
//           <Text style={styles.cardValue}>{money(stats.recaudado)}</Text>
//           <Text style={styles.cardHint}>Solo citas “Realizadas”.</Text>
//         </View>

//         <View style={styles.card}>
//           <Text style={styles.cardLabel}>Citas</Text>
//           <Text style={styles.cardValue}>{stats.totalCitas}</Text>
//           <Text style={styles.cardHint}>Total en el rango.</Text>
//         </View>
//       </View>

//       {/* Estados */}
//       <View style={styles.cardBig}>
//         <Text style={styles.sectionTitle}>Estados</Text>

//         <View style={styles.statusRow}>
//           <View style={[styles.pill, { backgroundColor: '#E7F9E7' }]}>
//             <Text style={[styles.pillText, { color: Colors.success }]}>
//               Realizadas: {stats.realizadas}
//             </Text>
//           </View>

//           <View style={[styles.pill, { backgroundColor: '#FFF5D9' }]}>
//             <Text style={[styles.pillText, { color: Colors.warning }]}>
//               Pendientes: {stats.pendientes}
//             </Text>
//           </View>
//         </View>

//         <View style={styles.statusRow}>
//           <View style={[styles.pill, { backgroundColor: '#FFE5E5' }]}>
//             <Text style={[styles.pillText, { color: Colors.danger }]}>
//               Canceladas: {stats.canceladas}
//             </Text>
//           </View>

//           <View style={[styles.pill, { backgroundColor: '#F2E9FF' }]}>
//             <Text style={[styles.pillText, { color: Colors.info }]}>
//               No asistió: {stats.noShow}
//             </Text>
//           </View>
//         </View>
//       </View>

//       {/* Top servicios */}
//       <View style={styles.cardBig}>
//         <Text style={styles.sectionTitle}>Servicios más agendados</Text>
//         <Text style={styles.sectionSubtitle}>
//           (Top 6 por cantidad de citas). Barra = cantidad.
//         </Text>

//         {stats.topServices.length === 0 ? (
//           <Text style={styles.empty}>No hay citas en este rango.</Text>
//         ) : (
//           stats.topServices.map(s => {
//             const pct = (s.count / stats.maxCount) * 100;
//             return (
//               <View key={s.name} style={styles.serviceRow}>
//                 <View style={{ flex: 1 }}>
//                   <Text style={styles.serviceName} numberOfLines={1}>
//                     {s.name}
//                   </Text>
//                   <Text style={styles.serviceMeta}>
//                     {s.count} cita(s) · {money(s.revenue)}
//                   </Text>

//                   <View style={styles.barTrack}>
//                     <View style={[styles.barFill, { width: `${pct}%` }]} />
//                   </View>
//                 </View>
//               </View>
//             );
//           })
//         )}
//       </View>
//     </ScrollView>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: Colors.screenBackground, padding: 16 },
//   title: { fontSize: 22, fontWeight: '700', color: Colors.text },
//   subtitle: { fontSize: 13, color: Colors.textMuted, marginTop: 4, marginBottom: 12 },

//   filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
//   filterChip: {
//     paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999,
//     borderWidth: 1, borderColor: Colors.borderSoft, backgroundColor: Colors.cardBackground,
//   },
//   filterChipActive: { backgroundColor: Colors.primarySoft, borderColor: Colors.primary },
//   filterChipText: { fontSize: 12, color: Colors.textMuted, fontWeight: '600' },
//   filterChipTextActive: { color: Colors.primary },

//   grid: { flexDirection: 'row', gap: 10 },
//   card: {
//     flex: 1, backgroundColor: Colors.cardBackground, borderRadius: 16, padding: 14,
//     borderWidth: 1, borderColor: Colors.borderSoft,
//   },
//   cardLabel: { fontSize: 12, color: Colors.textMuted, fontWeight: '600' },
//   cardValue: { fontSize: 22, fontWeight: '800', color: Colors.text, marginTop: 6 },
//   cardHint: { fontSize: 12, color: Colors.textSubtle, marginTop: 6 },

//   cardBig: {
//     backgroundColor: Colors.cardBackground, borderRadius: 16, padding: 14,
//     borderWidth: 1, borderColor: Colors.borderSoft, marginTop: 12,
//   },
//   sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
//   sectionSubtitle: { fontSize: 12, color: Colors.textMuted, marginTop: 4, marginBottom: 10 },

//   statusRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
//   pill: { flex: 1, borderRadius: 999, paddingVertical: 10, alignItems: 'center' },
//   pillText: { fontSize: 12, fontWeight: '700' },

//   empty: { fontSize: 13, color: Colors.textMuted, marginTop: 10, fontStyle: 'italic' },

//   serviceRow: { marginTop: 10 },
//   serviceName: { fontSize: 13, fontWeight: '700', color: Colors.text },
//   serviceMeta: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },

//   barTrack: {
//     height: 10, borderRadius: 999, backgroundColor: Colors.primarySoft,
//     overflow: 'hidden', marginTop: 8,
//   },
//   barFill: { height: '100%', backgroundColor: Colors.primary },
// });
