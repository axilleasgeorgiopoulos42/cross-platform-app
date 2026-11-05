import { type ReactNode } from 'react';
import {
  Modal as RNModal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Typography } from './Typography';
import { useTheme } from '../hooks/useTheme';
import { radius, spacing } from '../constants/theme';

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function Modal({ visible, onClose, title, children }: ModalProps) {
  const { colors } = useTheme();

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.content,
            {
              backgroundColor: colors.background,
              borderTopColor: colors.border,
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.handle} />
          <Typography variant="h3" style={styles.title}>
            {title}
          </Typography>
          {children}
        </Pressable>
      </Pressable>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  content: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderTopWidth: 1,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    maxHeight: '80%',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(128,128,128,0.3)',
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  title: {
    marginBottom: spacing.md,
  },
});
