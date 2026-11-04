// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolWeight, SymbolViewProps } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

type IconMapping = Record<SymbolViewProps['name'], ComponentProps<typeof MaterialIcons>['name']>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'fish.fill': 'set-meal',
  'leaf.fill': 'eco',
  'drop.fill': 'water',
  sparkles: 'auto-awesome',
  'rectangle.portrait.and.arrow.right': 'logout',
  pencil: 'edit',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  'chevron.down': 'expand-more',
  plus: 'add',
  trash: 'delete-outline',
  xmark: 'close',
  'arrow.up': 'arrow-upward',
  'arrow.clockwise': 'refresh',
  clock: 'history',
  checkmark: 'check',
  'exclamationmark.triangle': 'warning-amber',
  lock: 'lock-outline',
  envelope: 'mail-outline',
  camera: 'photo-camera',
  photo: 'image',
  thermometer: 'device-thermostat',
  'line.3.horizontal': 'menu',
  'square.and.pencil': 'edit-note',
  'hand.tap': 'touch-app',
  person: 'person-outline',
  ruler: 'straighten',
  globe: 'public',
  heart: 'favorite-border',
  calendar: 'event',
  'sun.max': 'wb-sunny',
  'arrow.up.and.down': 'height',
  'fork.knife': 'restaurant',
  'person.3': 'groups',
  'water.waves': 'waves',
  'arrow.triangle.2.circlepath': 'autorenew',
  hourglass: 'hourglass-empty',
  mappin: 'place',
  'checkmark.circle.fill': 'check-circle',
  'xmark.circle.fill': 'cancel',
  'info.circle': 'info-outline',
  'face.smiling': 'mood',
  'chart.bar': 'bar-chart',
  'chevron.left': 'chevron-left',
  'leaf': 'spa',
  'testtube.2': 'science',
  'cross.case': 'medical-services',
  stethoscope: 'healing',
  fish: 'set-meal',
  'list.bullet': 'format-list-bulleted',
  'cube.box': 'inventory-2',
  'square.grid.2x2': 'grid-view',
  eye: 'visibility',
  'eye.slash': 'visibility-off',
} as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
