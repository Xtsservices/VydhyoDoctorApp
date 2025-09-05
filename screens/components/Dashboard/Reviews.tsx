import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSelector } from 'react-redux';
import { AuthFetch, AuthPost } from '../../auth/auth'; // Import API functions from your auth file

const ReviewsScreen = () => {
  const currentuserDetails = useSelector((state) => state.currentUser);
  const doctorId = currentuserDetails.role === 'doctor' ? currentuserDetails.userId : currentuserDetails.createdBy;
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState({});
  const [token, setToken] = useState(null);
  const [overallRating, setOverallRating] = useState(0); // To store the doctor's overall rating

  // Fetch the authentication token from AsyncStorage
  useEffect(() => {
    const fetchToken = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('authToken');
        setToken(storedToken);
      } catch (error) {
        console.error('Error fetching token:', error);
        Alert.alert('Error', 'Failed to retrieve authentication token');
      }
    };
    fetchToken();
  }, []);

  // Fetch reviews from the API
  useEffect(() => {
    const fetchReviews = async () => {
      if (!token || !doctorId) return;

      setLoading(true);
      const response = await AuthFetch(`users/getFeedbackByDoctorId/${doctorId}`, token);
      console.log('API Response:', response.data);

      if (response.status === 'success' && response.data && response.data.doctor) {
        const doctorData = response.data.doctor;
        console.log("ggggggggggg",doctorData)
        setOverallRating(doctorData.overallRating || 0); // Set the overall rating from the response

        // Map the feedback array to reviews
        const formattedReviews = (doctorData.feedback || []).map((feedback) => ({
          id: feedback.feedbackId || feedback.id, // Use feedbackId if id is not provided
          user: feedback.user || 'Unknown User',
          avatar: feedback.avatar || 'https://randomuser.me/api/portraits/men/32.jpg',
          date: feedback.date || 'N/A',
          rating: feedback.rating || 0,
          review: feedback.review || 'No review provided',
          reply: feedback.reply
            ? {
                by: feedback.reply.by || 'Unknown Doctor',
                timeAgo: feedback.reply.timeAgo || 'N/A',
                message: feedback.reply.message || 'No reply',
              }
            : null,
        }));
        setReviews(formattedReviews);
      } else {
        Alert.alert('Error', response.message || 'Failed to fetch reviews or invalid response');
      }
      setLoading(false);
    };

    fetchReviews();
  }, [token, doctorId]);

  // Handle submitting a doctor's reply
  const handleSubmitReply = async (feedbackId) => {
    if (!replyText[feedbackId] || replyText[feedbackId].trim() === '') {
      Alert.alert('Error', 'Please enter a reply before submitting');
      return;
    }

    const payload = {
      feedbackId,
      message: replyText[feedbackId],
    };

    const response = await AuthPost('users/submitDoctorReply', payload, token, {
      headers: { 'Content-Type': 'application/json' },
    });

    if (response.status === 'success') {
      setReviews((prevReviews) =>
        prevReviews.map((review) =>
          review.id === feedbackId
            ? {
                ...review,
                reply: {
                  by: currentuserDetails.name || '',
                  timeAgo: 'Just now',
                  message: replyText[feedbackId],
                },
              }
            : review
        )
      );
      setReplyText((prev) => ({ ...prev, [feedbackId]: '' }));
      Alert.alert('Success', 'Reply submitted successfully');
    } else {
      Alert.alert('Error', response.message || 'Failed to submit reply');
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Icon name="arrow-left" size={24} color="#000" />
        <Text style={styles.headerTitle}>Reviews</Text>
        <Image
          source={{ uri: currentuserDetails.avatar || 'https://randomuser.me/api/portraits/men/10.jpg' }}
          style={styles.profileImage}
        />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* Overall Rating */}
        <View style={styles.ratingCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={styles.cardTitle}>Overall Rating</Text>
          </View>
          <View style={styles.overallRatingRow}>
            <Text style={styles.ratingNumber}>
              {loading ? 'Loading...' : overallRating.toFixed(1)}
            </Text>
            <View style={{ flexDirection: 'row', marginLeft: 8 }}>
              {[...Array(Math.round(overallRating))].map((_, i) => (
                <Icon key={i} name="star" size={20} color="#FBBF24" />
              ))}
              {[...Array(5 - Math.round(overallRating))].map((_, i) => (
                <Icon key={i} name="star-outline" size={20} color="#FBBF24" />
              ))}
            </View>
          </View>
        </View>

        {/* Reviews */}
        {loading ? (
          <Text>Loading reviews...</Text>
        ) : reviews.length === 0 ? (
          <Text>No reviews available</Text>
        ) : (
          reviews.map((review) => (
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

              {review.reply ? (
                <View style={styles.replyBox}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Image
                      source={{ uri: currentuserDetails.avatar || 'https://randomuser.me/api/portraits/women/55.jpg' }}
                      style={styles.replyAvatar}
                    />
                    <Text style={styles.replyAuthor}>{review.reply.by}</Text>
                    <Text style={styles.replyTime}> · {review.reply.timeAgo}</Text>
                  </View>
                  <Text style={styles.replyMessage}>{review.reply.message}</Text>
                </View>
              ) : (
                <View style={{ marginTop: 8 }}>
                  <TextInput
                    style={styles.replyInput}
                    placeholder="Enter your reply..."
                    value={replyText[review.id] || ''}
                    onChangeText={(text) =>
                      setReplyText((prev) => ({ ...prev, [review.id]: text }))
                    }
                    multiline
                    placeholderTextColor={'gray'}
                  />
                  <TouchableOpacity
                    style={styles.submitButton}
                    onPress={() => handleSubmitReply(review.id)}
                  >
                    <Text style={styles.submitButtonText}>Submit Reply</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))
        )}
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
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#18191bff' },
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
  replyInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
    fontSize: 14,
    minHeight: 60,
    color: '#18191bff',
  },
  submitButton: {
    backgroundColor: '#2563EB',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderColor: '#E5E7EB',
  },
});