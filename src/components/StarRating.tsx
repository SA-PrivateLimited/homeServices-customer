import React from 'react';
import {View, StyleSheet} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

interface StarRatingProps {
  rating: number; // 0-5
  size?: number;
  color?: string;
}

const StarRating: React.FC<StarRatingProps> = ({
  rating,
  size = 16,
  color = '#FFB800',
}) => {
  const renderStars = () => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    // Full stars
    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Icon
          key={`full-${i}`}
          name="star"
          size={size}
          color={color}
          style={styles.star}
        />,
      );
    }

    // Half star
    if (hasHalfStar && fullStars < 5) {
      stars.push(
        <Icon
          key="half"
          name="star-half"
          size={size}
          color={color}
          style={styles.star}
        />,
      );
    }

    // Empty stars
    const remainingStars = 5 - Math.ceil(rating);
    for (let i = 0; i < remainingStars; i++) {
      stars.push(
        <Icon
          key={`empty-${i}`}
          name="star-outline"
          size={size}
          color={color}
          style={styles.star}
        />,
      );
    }

    return stars;
  };

  return <View style={styles.container}>{renderStars()}</View>;
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  star: {
    marginRight: 2,
  },
});

export default StarRating;
