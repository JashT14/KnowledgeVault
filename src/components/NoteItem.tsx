import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Note } from '../utils/types';

interface Props {
  note: Note;
  onPress: () => void;
  similarity?: number;
}

/**
 * UI card for note preview
 * Displays text preview, timestamp, and handles navigation
 */
export default function NoteItem({ note, onPress, similarity }: Props) {
  // Format timestamp to readable date
  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      });
    }
  };

  // Truncate text for preview
  const getPreview = (text: string, maxLength: number = 120): string => {
    if (text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength).trim() + '...';
  };

  // Format similarity score as percentage
  const formatSimilarity = (sim: number): string => {
    return `${Math.round(sim * 100)}%`;
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        {/* Text preview */}
        <Text style={styles.textPreview} numberOfLines={3}>
          {getPreview(note.text)}
        </Text>

        {/* Footer with timestamp and optional similarity */}
        <View style={styles.footer}>
          <Text style={styles.timestamp}>
            {formatDate(note.timestamp)}
          </Text>
          
          {similarity !== undefined && (
            <View style={styles.similarityBadge}>
              <Text style={styles.similarityText}>
                {formatSimilarity(similarity)} match
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Arrow indicator */}
      <View style={styles.arrowContainer}>
        <Text style={styles.arrow}>›</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  textPreview: {
    fontSize: 15,
    lineHeight: 22,
    color: '#333',
    marginBottom: 10,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
  },
  similarityBadge: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  similarityText: {
    fontSize: 12,
    color: '#1976d2',
    fontWeight: '600',
  },
  arrowContainer: {
    paddingRight: 16,
  },
  arrow: {
    fontSize: 24,
    color: '#ccc',
  },
});
