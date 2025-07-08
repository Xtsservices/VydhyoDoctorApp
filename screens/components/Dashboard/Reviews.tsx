import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const reviews = [
  {
    id: 1,
    user: 'Adrian',
    avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
    date: '15 Mar 2024',
    rating: 5,
    review:
      'Excellent consultation! Dr. Hendry was very thorough and explained everything clearly. The appointment was on time and the staff was professional. Highly recommend for anyone looking for quality healthcare.',
    reply: {
      by: 'Dr. Edalin Hendry',
      timeAgo: '2 days ago',
      message:
        'Thank you Adrian for your kind words! It was my pleasure to help you with your health concerns. Wishing you continued good health.',
    },
  },
  {
    id: 2,
    user: 'Sarah',
    avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
    date: '12 Mar 2024',
    rating: 4,
    review:
      'Good experience overall. The doctor was knowledgeable and answered all my questions. The only minor issue was the wait time, but the quality of care made up for it.',
    reply: null,
  },
];

const ReviewsScreen = () => {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Icon name="arrow-left" size={24} color="#000" />
        <Text style={styles.headerTitle}>Reviews</Text>
        <Image
          source={{ uri: 'https://randomuser.me/api/portraits/men/10.jpg' }}
          style={styles.profileImage}
        />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* Overall Rating */}
        <View style={styles.ratingCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={styles.cardTitle}>Overall Rating</Text>
            <Text style={styles.cardDate}>06/25/2025 – 07/01/2025</Text>
          </View>
          <View style={styles.overallRatingRow}>
            <Text style={styles.ratingNumber}>4.0</Text>
            <View style={{ flexDirection: 'row', marginLeft: 8 }}>
              {[...Array(4)].map((_, i) => (
                <Icon key={i} name="star" size={20} color="#FBBF24" />
              ))}
              <Icon name="star-outline" size={20} color="#FBBF24" />
            </View>
          </View>
        </View>

        {/* Reviews */}
        {reviews.map((review) => (
          <View key={review.id} style={styles.reviewCard}>
            <View style={styles.reviewHeader}>
              <Image source={{ uri: review.avatar }} style={styles.avatar} />
              <View style={{ flex: 1 }}>
                <Text style={styles.userName}>{review.user}</Text>
                <Text style={styles.reviewDate}>{review.date}</Text>
              </View>
              <View style={{ flexDirection: 'row' }}>
                {[...Array(review.rating)].map((_, i) => (
                  <Icon key={i} name="star" size={16} color="#FBBF24" />
                ))}
                {[...Array(5 - review.rating)].map((_, i) => (
                  <Icon key={i} name="star-outline" size={16} color="#FBBF24" />
                ))}
              </View>
            </View>

            <Text style={styles.reviewText}>{review.review}</Text>

            {review.reply && (
              <View style={styles.replyBox}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Image
                    source={{ uri: 'https://randomuser.me/api/portraits/women/55.jpg' }}
                    style={styles.replyAvatar}
                  />
                  <Text style={styles.replyAuthor}>{review.reply.by}</Text>
                  <Text style={styles.replyTime}> · {review.reply.timeAgo}</Text>
                </View>
                <Text style={styles.replyMessage}>{review.reply.message}</Text>
              </View>
            )}

            {!review.reply && (
              <TouchableOpacity style={{ marginTop: 8 }}>
                <Text style={styles.doctorReply}>Doctor's Reply</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </ScrollView>

      {/* Bottom Nav */}
      <View style={styles.bottomNav}>
        <Icon name="home" size={24} color="#4B5563" />
        <Icon name="calendar-month-outline" size={24} color="#4B5563" />
        <Icon name="account-group-outline" size={24} color="#4B5563" />
        <Icon name="dots-horizontal" size={24} color="#4B5563" />
      </View>
    </View>
  );
};

export default ReviewsScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ECFDF5' },
  header: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 40,
    backgroundColor: '#fff',
  },
  headerTitle: { fontSize: 18, fontWeight: '600' },
  profileImage: { width: 32, height: 32, borderRadius: 16 },
  ratingCard: {
    backgroundColor: '#ECFDF5',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  cardTitle: { fontWeight: '500', color: '#111827' },
  cardDate: { fontSize: 12, color: '#6B7280' },
  overallRatingRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingNumber: { fontSize: 28, fontWeight: '700', color: '#111827' },
  reviewCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#ccc',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  userName: { fontWeight: '600', color: '#111827' },
  reviewDate: { fontSize: 12, color: '#6B7280' },
  reviewText: { fontSize: 14, color: '#374151', marginVertical: 8 },
  replyBox: {
    backgroundColor: '#F3F4F6',
    padding: 10,
    borderRadius: 8,
    marginTop: 6,
  },
  replyAvatar: { width: 24, height: 24, borderRadius: 12, marginRight: 8 },
  replyAuthor: { fontWeight: '600', fontSize: 13, color: '#111827' },
  replyTime: { fontSize: 12, color: '#6B7280', marginLeft: 6 },
  replyMessage: { marginTop: 4, fontSize: 13, color: '#374151' },
  doctorReply: {
    color: '#2563EB',
    fontWeight: '500',
    fontSize: 13,
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderColor: '#E5E7EB',
  },
});
