import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: ViewStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  icon,
  style,
}) => {
  const getContainerStyle = (): ViewStyle[] => {
    const base: ViewStyle[] = [styles.container];
    if (size === 'small') base.push(styles.smallContainer);
    else if (size === 'large') base.push(styles.largeContainer);
    else base.push(styles.mediumContainer);
    
    switch (variant) {
      case 'secondary':
        base.push(styles.secondaryContainer);
        break;
      case 'outline':
        base.push(styles.outlineContainer);
        break;
      case 'danger':
        base.push(styles.dangerContainer);
        break;
      default:
        base.push(styles.primaryContainer);
    }
    return base;
  };

  const getTextStyle = (): TextStyle[] => {
    const base: TextStyle[] = [styles.text];
    if (size === 'small') base.push(styles.smallText);
    else if (size === 'large') base.push(styles.largeText);
    else base.push(styles.mediumText);
    
    if (variant === 'outline') {
      base.push(styles.outlineText);
    } else {
      base.push(styles.defaultText);
    }
    return base;
  };

  return (
    <TouchableOpacity
      style={[...getContainerStyle(), disabled && styles.disabled, style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <>
          {icon && (
            <Ionicons
              name={icon}
              size={size === 'small' ? 16 : 20}
              color={variant === 'outline' ? '#6366f1' : '#fff'}
              style={styles.icon}
            />
          )}
          <Text style={getTextStyle()}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  smallContainer: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  mediumContainer: {
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  largeContainer: {
    paddingVertical: 18,
    paddingHorizontal: 32,
  },
  primaryContainer: {
    backgroundColor: '#6366f1',
  },
  secondaryContainer: {
    backgroundColor: '#374151',
  },
  outlineContainer: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#6366f1',
  },
  dangerContainer: {
    backgroundColor: '#ef4444',
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontWeight: '600',
  },
  smallText: {
    fontSize: 14,
  },
  mediumText: {
    fontSize: 16,
  },
  largeText: {
    fontSize: 18,
  },
  defaultText: {
    color: '#fff',
  },
  outlineText: {
    color: '#6366f1',
  },
  icon: {
    marginRight: 8,
  },
});
