import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  PermissionsAndroid,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  normalizeIndianMobile,
  type NativeContactRecord,
} from 'sapvt-ltd-app-packages';

type Props = {
  visible: boolean;
  onClose: () => void;
  onPick: (name: string, phone: string) => void;
  title: string;
  emptyLabel: string;
  cancelLabel: string;
  backgroundColor: string;
  textColor: string;
  mutedColor: string;
};

export function ContactPickModal({
  visible,
  onClose,
  onPick,
  title,
  emptyLabel,
  cancelLabel,
  backgroundColor,
  textColor,
  mutedColor,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Array<{name: string; phone: string}>>([]);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        if (Platform.OS === 'android') {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
          );
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            if (!cancelled) setRows([]);
            return;
          }
        }
        let Contacts: {getAll: () => Promise<NativeContactRecord[]>} | null =
          null;
        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          Contacts = require('react-native-contacts').default;
        } catch {
          Contacts = null;
        }
        if (!Contacts) {
          if (!cancelled) setRows([]);
          return;
        }
        const all = await Contacts.getAll();
        const mapped = (all || [])
          .map(row => {
            const name = [row.givenName, row.familyName]
              .filter(Boolean)
              .join(' ')
              .trim() || (row.displayName || '').trim();
            const phone = normalizeIndianMobile(
              (row.phoneNumbers || []).map(p => p.number || '').find(Boolean) ||
                '',
            );
            return {name, phone};
          })
          .filter(row => row.phone);
        if (!cancelled) setRows(mapped);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.root, {backgroundColor}]}>
        <View style={styles.head}>
          <Text style={[styles.title, {color: textColor}]}>{title}</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={{color: mutedColor}}>{cancelLabel}</Text>
          </TouchableOpacity>
        </View>
        {loading ? (
          <ActivityIndicator style={{marginTop: 24}} />
        ) : rows.length === 0 ? (
          <Text style={[styles.empty, {color: mutedColor}]}>{emptyLabel}</Text>
        ) : (
          <FlatList
            data={rows}
            keyExtractor={(item, i) => `${item.phone}-${i}`}
            renderItem={({item}) => (
              <TouchableOpacity
                style={styles.row}
                onPress={() => {
                  onPick(item.name, item.phone);
                  onClose();
                }}>
                <Text style={[styles.name, {color: textColor}]}>
                  {item.name || item.phone}
                </Text>
                <Text style={{color: mutedColor}}>{item.phone}</Text>
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, paddingTop: 48},
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  title: {fontSize: 18, fontWeight: '700'},
  empty: {padding: 24, textAlign: 'center'},
  row: {paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e2e8f0'},
  name: {fontSize: 16, fontWeight: '600', marginBottom: 2},
});
