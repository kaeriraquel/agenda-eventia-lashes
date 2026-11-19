// app/(tabs)/precios.tsx
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { usePrices } from '../context/PricesContext';
import { SelectField } from '../components/SelectField';
import { useBrand } from '../context/BrandContext';
import { Colors } from '../constants/theme';

const CATEGORY_OPTIONS = ['servicio', 'producto'] as const;
const MODULE_OPTIONS = ['lashes', 'nails'] as const;

export default function PreciosScreen() {
  const { items, addItem, updateItem, deleteItem } = usePrices();
  const { enabledServices } = useBrand();

  const hasLashes = enabledServices.includes('lashes');
  const hasNails = enabledServices.includes('nails');
  const hasBoth = hasLashes && hasNails;

  // separar items
  const { lashServices, nailServices, productItems } = useMemo(() => {
    const services = items.filter(i => i.category === 'servicio');
    const products = items.filter(i => i.category === 'producto');

    return {
      lashServices: hasLashes ? services.filter(i => i.module === 'lashes') : [],
      nailServices: hasNails ? services.filter(i => i.module === 'nails') : [],
      productItems: products,
    };
  }, [items, hasLashes, hasNails]);

  // form
  const [name, setName] = useState('');
  const [category, setCategory] = useState<'servicio' | 'producto' | ''>('');
  const [module, setModule] = useState<'lashes' | 'nails' | ''>('');
  const [priceStr, setPriceStr] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const resetForm = () => {
    setName('');
    setCategory('');
    setModule('');
    setPriceStr('');
    setEditingId(null);
  };

  const resolveFinalModule = () => {
    // producto -> null
    if (category === 'producto') return null;

    // servicio -> módulo requerido
    if (category === 'servicio') {
      if (hasBoth) {
        if (!module) return null;
        return module;
      }
      return hasLashes ? 'lashes' : 'nails';
    }

    return null;
  };

  const handleSave = async () => {
    try {
      if (!name.trim() || !category || !priceStr.trim()) {
        Alert.alert('Campos incompletos', 'Llena nombre, categoría y precio.');
        return;
      }

      const price = Number(priceStr.replace(',', '.'));
      if (isNaN(price)) {
        Alert.alert('Precio inválido', 'Escribe un número válido como precio.');
        return;
      }

      const finalModule = resolveFinalModule();

      if (category === 'servicio' && !finalModule) {
        Alert.alert('Falta módulo', 'Selecciona si el servicio es de pestañas o uñas.');
        return;
      }

      if (editingId) {
        await updateItem(editingId, {
          name: name.trim(),
          category,
          module: finalModule,
          price,
        });
      } else {
        await addItem({
          name: name.trim(),
          category,
          module: finalModule,
          price,
        });
      }

      resetForm();
      Alert.alert('Listo', editingId ? 'Elemento actualizado.' : 'Elemento agregado.');
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Error guardando.');
    }
  };

  const handleEdit = (id: string) => {
    const item = items.find(i => i.id === id);
    if (!item) return;

    setEditingId(id);
    setName(item.name);
    setCategory(item.category);
    setPriceStr(item.price.toString());
    setModule((item.module as any) ?? '');
  };

  const handleCancelEdit = () => resetForm();

  const renderItem = ({ item }: any) => (
    <View style={styles.itemRow}>
      <View style={{ flex: 1, paddingRight: 10 }}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemPrice}>
          {item.category === 'servicio' ? 'Servicio' : 'Producto'}
          {item.category === 'servicio' && item.module
            ? ` · ${item.module === 'lashes' ? 'Pestañas' : 'Uñas'}`
            : ''}
          {' · '}$
          {Number(item.price).toFixed(2)} MXN
        </Text>
      </View>

      <View style={styles.itemButtons}>
        <TouchableOpacity style={styles.editButton} onPress={() => handleEdit(item.id)}>
          <Text style={styles.editButtonText}>Editar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={async () => {
            try {
              await deleteItem(item.id);
            } catch (e: any) {
              Alert.alert('Error', e?.message ?? 'Error borrando');
            }
          }}
        >
          <Text style={styles.deleteButtonText}>Borrar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const moduleLabelSingle = hasLashes ? 'Pestañas (lashes)' : 'Uñas (nails)';

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Lista de precios</Text>
      <Text style={styles.subtitle}>Controla los precios de tus servicios y productos.</Text>

      {/* FORM */}
      <View style={styles.formCard}>
        <Text style={styles.formTitle}>{editingId ? 'Editar elemento' : 'Agregar nuevo'}</Text>

        <Text style={styles.label}>Nombre *</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Ej. Extensiones clásicas 1x1"
        />

        <SelectField
          label="Categoría *"
          value={category}
          onChange={v => {
            const next = v as 'servicio' | 'producto';
            setCategory(next);

            // si cambias a producto, forzamos module vacío
            if (next === 'producto') setModule('');
          }}
          options={CATEGORY_OPTIONS as unknown as string[]}
          placeholder="servicio o producto"
        />

        {/* MÓDULO solo si es servicio */}
        {category === 'servicio' ? (
          hasBoth ? (
            <SelectField
              label="Módulo *"
              value={module}
              onChange={v => setModule(v as 'lashes' | 'nails')}
              options={MODULE_OPTIONS as unknown as string[]}
              placeholder="lashes o nails"
            />
          ) : (
            <View style={{ marginTop: 8 }}>
              <Text style={styles.label}>Módulo</Text>
              <Text style={{ marginTop: 4, color: Colors.textMuted }}>{moduleLabelSingle}</Text>
            </View>
          )
        ) : null}

        <Text style={styles.label}>Precio (MXN) *</Text>
        <TextInput
          style={styles.input}
          value={priceStr}
          onChangeText={setPriceStr}
          placeholder="Ej. 450"
          keyboardType="numeric"
        />

        <TouchableOpacity style={styles.addButton} onPress={handleSave}>
          <Text style={styles.addButtonText}>
            {editingId ? 'Guardar cambios' : 'Agregar a la lista'}
          </Text>
        </TouchableOpacity>

        {editingId ? (
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancelEdit}>
            <Text style={styles.cancelButtonText}>Cancelar edición</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* SERVICIOS */}
      <Text style={styles.sectionTitle}>Servicios</Text>

      {hasLashes ? (
        <>
          <Text style={[styles.sectionTitle, { fontSize: 16 }]}>Pestañas</Text>
          {lashServices.length === 0 ? (
            <Text style={styles.emptyText}>No hay servicios de pestañas aún.</Text>
          ) : (
            <FlatList
              data={lashServices}
              keyExtractor={item => item.id}
              renderItem={renderItem}
              scrollEnabled={false}
            />
          )}
        </>
      ) : null}

      {hasNails ? (
        <>
          <Text style={[styles.sectionTitle, { fontSize: 16, marginTop: 12 }]}>Uñas</Text>
          {nailServices.length === 0 ? (
            <Text style={styles.emptyText}>No hay servicios de uñas aún.</Text>
          ) : (
            <FlatList
              data={nailServices}
              keyExtractor={item => item.id}
              renderItem={renderItem}
              scrollEnabled={false}
            />
          )}
        </>
      ) : null}

      {/* PRODUCTOS */}
      <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Productos</Text>
      {productItems.length === 0 ? (
        <Text style={styles.emptyText}>No hay productos aún.</Text>
      ) : (
        <FlatList
          data={productItems}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          scrollEnabled={false}
        />
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingTop: 4, backgroundColor: Colors.screenBackground, flexGrow: 1 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 4, color: Colors.text, letterSpacing: -0.5},
  subtitle: { fontSize: 13, color: Colors.textMuted, marginBottom: 16 },

  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  formTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },

  label: { fontSize: 13, fontWeight: '600', marginTop: 8, color: Colors.textSecondary },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 4,
    backgroundColor: '#FFFFFF',
  },

  addButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: 'center',
    marginTop: 14,
  },
  addButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },

  cancelButton: {
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
  },
  cancelButtonText: { color: Colors.primary, fontSize: 13, fontWeight: '500' },

  sectionTitle: { fontSize: 18, fontWeight: '600', marginTop: 8, marginBottom: 4 },
  emptyText: { color: Colors.textMuted, marginBottom: 12 },

  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  itemName: { fontSize: 14, fontWeight: '500' },
  itemPrice: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },

  itemButtons: { flexDirection: 'row', gap: 8 },

  editButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
  },
  editButtonText: { fontSize: 12, color: Colors.primary },

  deleteButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.dangerSoft,
  },
  deleteButtonText: { fontSize: 12, color: Colors.danger },
});