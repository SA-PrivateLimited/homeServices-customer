import React from 'react';
import {View, Text, Image, StyleSheet, ScrollView} from 'react-native';
import {photoUrlsFromRequest, type RequestPhotoInput} from '../utils/requestPhotos';

type ThemeColors = {
  text: string;
  textSecondary: string;
  border: string;
  card: string;
};

type Props = {
  photos?: RequestPhotoInput[] | null;
  theme: ThemeColors;
  title: string;
};

export default function RequestPhotoGallery({photos, theme, title}: Props) {
  const urls = photoUrlsFromRequest(photos);
  if (urls.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, {color: theme.text}]}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {urls.map(url => (
          <Image
            key={url}
            source={{uri: url}}
            style={[
              styles.image,
              {borderColor: theme.border, backgroundColor: theme.card},
            ]}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {marginTop: 12},
  title: {fontSize: 14, fontWeight: '600', marginBottom: 8},
  image: {
    width: 96,
    height: 96,
    borderRadius: 10,
    marginRight: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
