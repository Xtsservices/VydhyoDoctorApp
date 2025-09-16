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
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { AuthFetch, AuthPost } from '../../auth/auth';
const ReviewsScreen = () => {
  const navigation = useNavigation();
  const currentuserDetails = useSelector((state) => state.currentUser);
  const doctorId = currentuserDetails.role === 'doctor' ? currentuserDetails.userId : currentuserDetails.createdBy;
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState({});
  const [token, setToken] = useState(null);
  const [overallRating, setOverallRating] = useState(0);
  const [submitting, setSubmitting] = useState({});
  const [expandedReview, setExpandedReview] = useState(null);

  // Fetch the authentication token from AsyncStorage
  useEffect(() => {
    const fetchToken = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('authToken');
        setToken(storedToken);
      } catch (error) {
        Alert.alert('Error', error?.message || 'Failed to retrieve authentication token');
      }
    };
    fetchToken();
  }, []);

  // Fetch reviews and conversations from the API
  useEffect(() => {
    const fetchReviews = async () => {
      if (!token || !doctorId) return;

      setLoading(true);
      try {
        const response = await AuthFetch(`users/getFeedbackByDoctorId/${doctorId}`, token);
        console.log('API Response:', response);

        if (response.status === 'success' && response.data && response.data.doctor) {
          const doctorData = response.data.doctor;
          console.log("Doctor Data:", doctorData);
          setOverallRating(doctorData.overallRating || 0);

          // Map the feedback array to reviews and fetch conversations for each
          const feedbackArray = doctorData.feedback || [];
          const formattedReviews = await Promise.all(
            feedbackArray.map(async (feedback) => {
              // Fetch conversation for this feedback
              let conversation = [];
              try {
                const convResponse = await AuthFetch(`users/getFeedbackById/${feedback.feedbackId || feedback.id}`, token);
                console.log('Conversation API Response:', convResponse);
                
                if (convResponse.status === 'success' && convResponse.feedback) {
                  conversation = convResponse.feedback.conversation || [];
                } else if (convResponse.status === 'success' && convResponse.data?.feedback) {
                  conversation = convResponse.data.feedback.conversation || [];
                }
              } catch (error) {
                Alert.alert('Error', error?.message || 'Failed to fetch conversation');
              }

              return {
                id: feedback.feedbackId || feedback.id,
                user: feedback.patientName || 'Anonymous Patient',
                date: feedback.createdAt || 'N/A',
                rating: feedback.rating || 0,
                review: feedback.comment || 'No review provided',
                conversation: conversation,
              };
            })
          );
          
          setReviews(formattedReviews);
        } else {
          console.log('Unexpected API response structure:', response);
          Alert.alert('Error', JSON.stringify(response.message) || 'Failed to fetch reviews or invalid response');
        }
      } catch (error) {
        Alert.alert('Error', error?.message || 'Failed to fetch reviews');
      }
      setLoading(false);
    };

    if (token && doctorId) {
      fetchReviews();
    }
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

    console.log('Submitting payload:', payload);

    setSubmitting(prev => ({ ...prev, [feedbackId]: true }));

    try {
      const response = await AuthPost('users/submitDoctorReply', payload, token, {
        headers: { 'Content-Type': 'application/json' },
      });
      console.log('Reply submission response:', response.message.message);

      if (response.status === 'success') {
        // Refresh the conversation for this specific review
        try {
          const convResponse = await AuthFetch(`users/getFeedbackById/${feedbackId}`, token);
          console.log('Updated conversation:', convResponse);
          
          if (convResponse.status === 'success' && convResponse.feedback) {
            setReviews(prevReviews => 
              prevReviews.map(review => 
                review.id === feedbackId 
                  ? { ...review, conversation: convResponse.feedback.conversation || [] }
                  : review
              )
            );
          } else if (convResponse.status === 'success' && convResponse.data?.feedback) {
            setReviews(prevReviews => 
              prevReviews.map(review => 
                review.id === feedbackId 
                  ? { ...review, conversation: convResponse.data.feedback.conversation || [] }
                  : review
              )
            );
          }
        } catch (error) {
          Alert.alert('Error', error?.message || 'Failed to fetch updated conversation');
        }
        
        setReplyText((prev) => ({ ...prev, [feedbackId]: '' }));
        Alert.alert('Success', 'Reply submitted successfully');
      } else {
        Alert.alert('Alert!', response.message.message || 'Failed to fetch updated conversation');
      }
    } catch (error) {
      if (error?.response) {
        Alert.alert('Error', error?.response?.message || 'Failed to fetch updated conversation');
      } else {
        Alert.alert('Error', error?.message || 'Failed to fetch updated conversation');
      }
    } finally {
      setSubmitting(prev => ({ ...prev, [feedbackId]: false }));
    }
  };

  // Format date to a more readable format
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Toggle expanded view for reviews
  const toggleExpandedReview = (reviewId) => {
    setExpandedReview(expandedReview === reviewId ? null : reviewId);
  };

  // Sort conversation chronologically
  const getSortedConversation = (conversation) => {
    return [...conversation].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
       <TouchableOpacity 
  style={styles.backButton}
  onPress={() => navigation.goBack()}
>
  <Icon name="arrow-left" size={24} color="#1F2937" />
</TouchableOpacity>
        <Text style={styles.headerTitle}>Patient Reviews</Text>
        <Image
          // source={{ uri: currentuserDetails.avatar || 'https://randomuser.me/api/portraits/men/10.jpg' }}
          // style={styles.profileImage}
        />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Overall Rating Card */}
        <View style={styles.overallRatingCard}>
          <View style={styles.ratingHeader}>
            <View>
              <Text style={styles.overallRatingTitle}>Overall Rating</Text>
              <Text style={styles.totalReviews}>{reviews.length} reviews</Text>
            </View>
            <View style={styles.ratingDisplay}>
              <Text style={styles.ratingNumber}>
                {loading ? '0.0' : overallRating.toFixed(1)}
              </Text>
              <View style={styles.starsContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Icon
                    key={star}
                    name={star <= Math.round(overallRating) ? "star" : "star-outline"}
                    size={18}
                    color="#FBBF24"
                    style={styles.starIcon}
                  />
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* Reviews List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={styles.loadingText}>Loading reviews...</Text>
          </View>
        ) : reviews.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="comment-text-outline" size={60} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>No Reviews Yet</Text>
            <Text style={styles.emptyText}>Patient reviews will appear here once they start leaving feedback.</Text>
          </View>
        ) : (
          <View style={styles.reviewsList}>
            {reviews.map((review) => {
              const sortedConversation = getSortedConversation(review.conversation || []);
              const isExpanded = expandedReview === review.id;
              
              return (
                <View key={review.id} style={styles.reviewCard}>
                  {/* Review Header */}
                  <View style={styles.reviewHeader}>
                    <View style={styles.patientInfo}>
                      <View style={styles.avatarContainer}>
                        <Icon name="account-circle" size={40} color="#6B7280" />
                      </View>
                      <View style={styles.patientDetails}>
                        <Text style={styles.patientName}>{review.user}</Text>
                        <Text style={styles.reviewDate}>{formatDate(review.date)}</Text>
                      </View>
                    </View>
                    <View style={styles.ratingContainer}>
                      <View style={styles.reviewStars}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Icon
                            key={star}
                            name={star <= review.rating ? "star" : "star-outline"}
                            size={14}
                            color="#FBBF24"
                          />
                        ))}
                      </View>
                      <Text style={styles.ratingText}>{review.rating}.0</Text>
                    </View>
                  </View>

                  {/* Initial Patient Review */}
                  <View style={styles.initialReviewContainer}>
                    <View style={styles.messageHeader}>
                      <Icon name="message-text" size={16} color="#6B7280" />
                      <Text style={styles.messageLabel}>Patient Review</Text>
                    </View>
                    <Text style={styles.reviewText}>{review.review}</Text>
                  </View>

                  {/* Conversation Timeline */}
                  {sortedConversation.length > 0 && (
                    <View style={styles.conversationContainer}>
                      <View style={styles.conversationHeader}>
                        <View style={styles.timelineIndicator} />
                        <Text style={styles.conversationTitle}>Conversation</Text>
                      </View>
                      {sortedConversation.map((message, index) => (
                        <View key={message._id || index} style={styles.messageContainer}>
                          <View style={styles.messageHeader}>
                            <Icon 
                              name={message.sender === 'doctor' ? "doctor" : "account"} 
                              size={16} 
                              color={message.sender === 'doctor' ? "#3B82F6" : "#10B981"} 
                            />
                            <Text style={[
                              styles.messageLabel,
                              { color: message.sender === 'doctor' ? "#3B82F6" : "#10B981" }
                            ]}>
                              {message.sender === 'doctor' ? 'Dr. Response' : 'Patient'}
                            </Text>
                            <Text style={styles.messageTime}>
                              {formatDate(message.createdAt)}
                            </Text>
                          </View>
                          <Text style={styles.messageText}>{message.message}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Reply Section */}
                  <View style={styles.replySection}>
                    <TouchableOpacity
                      style={styles.replyToggle}
                      onPress={() => toggleExpandedReview(review.id)}
                    >
                      <Icon 
                        name="reply" 
                        size={16} 
                        color="#3B82F6" 
                        style={styles.replyIcon}
                      />
                      <Text style={styles.replyToggleText}>
                        {isExpanded ? 'Cancel Reply' : 'Add Reply'}
                      </Text>
                      <Icon
                        name={isExpanded ? "chevron-up" : "chevron-down"}
                        size={16}
                        color="#3B82F6"
                      />
                    </TouchableOpacity>

                    {isExpanded && (
                      <View style={styles.replyForm}>
                        <TextInput
                          style={styles.replyInput}
                          placeholder="Write your professional response..."
                          placeholderTextColor="#9CA3AF"
                          value={replyText[review.id] || ''}
                          onChangeText={(text) =>
                            setReplyText((prev) => ({ ...prev, [review.id]: text }))
                          }
                          multiline
                          numberOfLines={4}
                        />
                        <TouchableOpacity
                          style={[
                            styles.submitReplyButton,
                            submitting[review.id] && styles.submitReplyButtonDisabled
                          ]}
                          onPress={() => handleSubmitReply(review.id)}
                          disabled={submitting[review.id]}
                        >
                          {submitting[review.id] ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <>
                              <Icon name="send" size={16} color="#FFFFFF" />
                              <Text style={styles.submitReplyText}>Send Reply</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default ReviewsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 15,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 20,
  },
  profileImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  scrollView: {
    flex: 1,
  },
  overallRatingCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  ratingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  overallRatingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  totalReviews: {
    fontSize: 14,
    color: '#6B7280',
  },
  ratingDisplay: {
    alignItems: 'center',
  },
  ratingNumber: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  starsContainer: {
    flexDirection: 'row',
  },
  starIcon: {
    marginHorizontal: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#000000',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#4B5563',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  reviewsList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  reviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    paddingBottom: 16,
  },
  patientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    marginRight: 12,
  },
  patientDetails: {
    flex: 1,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  reviewDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  ratingContainer: {
    alignItems: 'flex-end',
  },
  reviewStars: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#4B5563',
  },
  initialReviewContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  messageLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginLeft: 6,
    flex: 1,
  },
  messageTime: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  reviewText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#374151',
  },
  conversationContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FAFBFC',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  conversationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  timelineIndicator: {
    width: 3,
    height: 16,
    backgroundColor: '#3B82F6',
    borderRadius: 2,
    marginRight: 8,
  },
  conversationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  messageContainer: {
    marginBottom: 16,
    paddingLeft: 16,
    borderLeftWidth: 2,
    borderLeftColor: '#E5E7EB',
    paddingBottom: 16,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#374151',
  },
  replySection: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  replyToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  replyIcon: {
    marginRight: 8,
  },
  replyToggleText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3B82F6',
    flex: 1,
  },
  replyForm: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  replyInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    color: '#1F2937',
    textAlignVertical: 'top',
    minHeight: 100,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  submitReplyButton: {
    backgroundColor: '#3B82F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  submitReplyButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  submitReplyText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
});