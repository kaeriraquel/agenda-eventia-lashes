// components/MappingCanvas.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Image,
  StyleSheet,
  PanResponder,
  GestureResponderEvent,
  LayoutChangeEvent,
  TouchableOpacity,
  Text,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Colors } from '../constants/theme';

type Point = { x: number; y: number };
type Stroke = Point[];

interface MappingCanvasProps {
  baseImage: any; // require('...png')
  initialData?: string | null; // JSON de strokes guardados
  onChange?: (data: string) => void;
  strokeColor?: string;
  strokeWidth?: number;
  /** Solo mostrar el dibujo, sin poder dibujar ni borrar */
  readOnly?: boolean;
}

export const MappingCanvas: React.FC<MappingCanvasProps> = ({
  baseImage,
  initialData,
  onChange,
  strokeColor = '#333333',
  strokeWidth = 2,
  readOnly = false,
}) => {
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Stroke>([]);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);

  // Guardamos onChange en un ref para poder llamarlo de forma segura
  const onChangeRef = useRef<typeof onChange | null>(null);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Cargar strokes iniciales desde initialData
  useEffect(() => {
    if (initialData) {
      try {
        const parsed = JSON.parse(initialData) as Stroke[];
        setStrokes(parsed);
      } catch (e) {
        console.warn('No se pudo parsear initialData de MappingCanvas');
      }
    } else {
      setStrokes([]);
    }
  }, [initialData]);

  const emitChange = (next: Stroke[]) => {
    if (!onChangeRef.current) return;
    const json = JSON.stringify(next);
    // Lo disparamos asíncrono para NO hacerlo en medio del render
    setTimeout(() => {
      if (onChangeRef.current) {
        onChangeRef.current(json);
      }
    }, 0);
  };

  const pointsToPath = (points: Point[]): string => {
    if (points.length === 0) return '';
    return points
      .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
      .join(' ');
  };

  const handleLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setWidth(width);
    setHeight(height);
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt: GestureResponderEvent) => {
          const { locationX, locationY } = evt.nativeEvent;
          setCurrentStroke([{ x: locationX, y: locationY }]);
        },
        onPanResponderMove: (evt: GestureResponderEvent) => {
          const { locationX, locationY } = evt.nativeEvent;
          setCurrentStroke(prev => [...prev, { x: locationX, y: locationY }]);
        },
        onPanResponderRelease: () => {
          setCurrentStroke(prevStroke => {
            if (prevStroke.length === 0) return [];
            // añadimos este stroke a la lista y notificamos
            setStrokes(old => {
              const next = [...old, prevStroke];
              emitChange(next);
              return next;
            });
            return [];
          });
        },
        onPanResponderTerminate: () => {
          setCurrentStroke([]);
        },
      }),
    [] // no dependemos de strokes aquí, usamos setStrokes(old => ...)
  );

  const handleUndo = () => {
    setStrokes(prev => {
      if (prev.length === 0) return prev;
      const next = prev.slice(0, -1);
      emitChange(next);
      return next;
    });
  };

  const handleClear = () => {
    setStrokes([]);
    emitChange([]);
  };

  return (
    <View>
      <View style={styles.canvasContainer} onLayout={handleLayout}>
        <Image
          source={baseImage}
          style={styles.baseImage}
          resizeMode="contain"
        />
        {width > 0 && height > 0 && (
          <View
            style={StyleSheet.absoluteFill}
            {...(readOnly ? {} : panResponder.panHandlers)}
          >
            <Svg width={width} height={height}>
              {strokes.map((stroke, idx) => (
                <Path
                  key={idx}
                  d={pointsToPath(stroke)}
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}
              {currentStroke.length > 0 && (
                <Path
                  d={pointsToPath(currentStroke)}
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
            </Svg>
          </View>
        )}
      </View>

      {!readOnly && (
        <View style={styles.toolsRow}>
          <TouchableOpacity style={styles.toolButton} onPress={handleUndo}>
            <Text style={styles.toolButtonText}>Deshacer</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolButton} onPress={handleClear}>
            <Text style={styles.toolButtonText}>Limpiar</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  canvasContainer: {
    width: '100%',
    aspectRatio: 2,
    backgroundColor: 'transparent',
    overflow: 'hidden',
    borderRadius: 16,
  },
  baseImage: {
    width: '100%',
    height: '100%',
  },
  toolsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 6,
  },
  toolButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.borderSoft,
    backgroundColor: '#FFFFFF',
  },
  toolButtonText: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '500',
  },
});
