// app/(tabs)/precios.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { usePrices } from '../../context/PricesContext';
import { SelectField } from '../../components/SelectField';

const CATEGORY_OPTIONS = ['servicio', 'producto'] as const;

export default function PreciosScreen() {
  const { items, addItem, updateItem, deleteItem } = usePrices();

  const serviceItems = items.filter(i => i.category === 'servicio');
  const productItems = items.filter(i => i.category === 'producto');

  const [name, setName] = useState('');
  const [category, setCategory] = useState<'servicio' | 'producto' | ''>('');
  const [priceStr, setPriceStr] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleSave = () => {
    if (!name.trim() || !category || !priceStr.trim()) {
      alert('Llena nombre, categoría y precio.');
      return;
    }
    const price = Number(priceStr.replace(',', '.'));
    if (isNaN(price)) {
      alert('Escribe un número válido como precio.');
      return;
    }

    if (editingId) {
      // MODO EDITAR
      updateItem(editingId, {
        name: name.trim(),
        category,
        price,
      });
      setEditingId(null);
    } else {
      // MODO AGREGAR
      addItem({ name: name.trim(), category, price });
    }

    setName('');
    setCategory('');
    setPriceStr('');
  };

  const handleEdit = (id: string) => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    setEditingId(id);
    setName(item.name);
    setCategory(item.category);
    setPriceStr(item.price.toString());
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setName('');
    setCategory('');
    setPriceStr('');
  };

  const renderItem = ({ item }: any) => (
    <View style={styles.itemRow}>
      <View>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemPrice}>
          {item.category === 'servicio' ? 'Servicio' : 'Producto'} · $
          {item.price.toFixed(2)} MXN
        </Text>
      </View>
      <View style={styles.itemButtons}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => handleEdit(item.id)}
        >
          <Text style={styles.editButtonText}>Editar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => deleteItem(item.id)}
        >
          <Text style={styles.deleteButtonText}>Borrar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Lista de precios</Text>
      <Text style={styles.subtitle}>
        Controla los precios de tus servicios y productos.
      </Text>

      {/* FORMULARIO NUEVO / EDITAR ITEM */}
      <View style={styles.formCard}>
        <Text style={styles.formTitle}>
          {editingId ? 'Editar elemento' : 'Agregar nuevo'}
        </Text>

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
          onChange={v => setCategory(v as 'servicio' | 'producto')}
          options={CATEGORY_OPTIONS as unknown as string[]}
          placeholder="servicio o producto"
        />

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

        {editingId && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancelEdit}
          >
            <Text style={styles.cancelButtonText}>Cancelar edición</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* LISTA DE SERVICIOS */}
      <Text style={styles.sectionTitle}>Servicios</Text>
      {serviceItems.length === 0 ? (
        <Text style={styles.emptyText}>No hay servicios aún.</Text>
      ) : (
        <FlatList
          data={serviceItems}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          scrollEnabled={false}
        />
      )}

      {/* LISTA DE PRODUCTOS */}
      <Text style={styles.sectionTitle}>Productos</Text>
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
  container: {
    padding: 16,
    backgroundColor: '#FFF7FC',
    flexGrow: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#777',
    marginBottom: 16,
  },
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
  formTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
    color: '#444',
  },
  input: {
    borderWidth: 1,
    borderColor: '#FFD1E8',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 4,
    backgroundColor: '#FFFFFF',
  },
  addButton: {
    backgroundColor: '#FF6FB5',
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: 'center',
    marginTop: 14,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#FFB3CF',
  },
  cancelButtonText: {
    color: '#FF6FB5',
    fontSize: 13,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4,
  },
  emptyText: {
    color: '#777',
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#FFD1E8',
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
  },
  itemPrice: {
    fontSize: 13,
    color: '#555',
  },
  itemButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#FFB3CF',
  },
  editButtonText: {
    fontSize: 12,
    color: '#FF6FB5',
  },
  deleteButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#FF9BAE',
  },
  deleteButtonText: {
    fontSize: 12,
    color: '#FF3B6B',
  },
});
